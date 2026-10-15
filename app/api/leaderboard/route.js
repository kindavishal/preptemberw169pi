import { NextResponse } from 'next/server';
import { clubKey, resolveClub, clubAllowsMember } from '../../../lib/clubs';
import { isIgnoredLogin } from '../../../lib/ignoredLogins';

export const runtime = 'nodejs';
export const revalidate = 45;

// The club leaderboard is derived entirely from public GitHub data — no
// database. A contributor declares their club two ways, both parsed here:
//   1. A `Club: <name>` line in their PR description (works instantly, even
//      while the PR is still open), or
//   2. A `Club: <name>` line inside the entry they add to the profile wall
//      (picked up once the PR is merged).
// We bucket every human PR author into a club and rank clubs by contributions.
// Only PRs carrying the review label (default `ready-for-review`) count — the
// wall and PR bodies are used to attribute a PR to a club, never to score it.

const CACHE_TTL_MS = 45 * 1000;
let cache = { at: 0, data: null };

function relTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 7 * 86400000) return `${Math.floor(diff / 86400000)}d ago`;
  return new Date(iso).toLocaleDateString();
}

// The label a PR must carry to count. Compared loosely (case, spaces, hyphens
// ignored) so "Ready for Review" and `ready-for-review` are the same label.
const REVIEW_LABEL = process.env.LEADERBOARD_REVIEW_LABEL || 'ready-for-review';
const labelKey = (name) => String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
function hasReviewLabel(p) {
  const want = labelKey(REVIEW_LABEL);
  return Array.isArray(p.labels) && p.labels.some((l) => labelKey(l && l.name) === want);
}

async function gh(path, token, accept = 'application/vnd.github+json') {
  const headers = {
    Accept: accept,
    'User-Agent': 'good-first-alpie-app',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`https://api.github.com${path}`, { headers, cache: 'no-store' });
}

const BOT_LOGINS = new Set([
  'claude', 'anthropic', 'anthropic-ai', 'copilot', 'github-copilot', 'chatgpt',
  'openai', 'gpt-engineer', 'devin', 'devin-ai', 'cursor', 'codeium', 'sweep-ai',
  'sourcery-ai', 'github-actions', 'dependabot', 'renovate', 'renovate-bot',
  'snyk-bot', 'imgbot', 'allcontributors',
]);
function isHuman(u) {
  if (!u || !u.login) return false;
  if (u.type && u.type !== 'User') return false;
  const login = u.login.toLowerCase();
  if (login.endsWith('[bot]') || login.endsWith('-bot')) return false;
  if (isIgnoredLogin(login)) return false;
  return !BOT_LOGINS.has(login);
}

// Placeholder / junk values people leave in a `Club:` line (empty PR
// templates, "TODO", etc.). Folded through clubKey so casing, spacing and
// punctuation don't matter.
const JUNK_CLUB_KEYS = new Set([
  'none', 'na', 'nil', 'null', 'tbd', 'todo', 'test', 'testing',
  'example', 'sample', 'xxx', 'your club', 'your club name', 'club', 'club name',
  'my club', 'community', 'your community', 'unknown', 'foo', 'bar', 'asdf',
].map(clubKey));

// GitHub reserved paths that look like `github.com/<word>` but are not user
// profiles — must never be mistaken for a contributor handle.
const RESERVED_GH_PATHS = new Set([
  'orgs', 'sponsors', 'apps', 'marketplace', 'settings', 'notifications',
  'features', 'topics', 'collections', 'trending', 'about', 'pricing', 'team',
  'enterprise', 'login', 'join', 'new', 'search', 'explore', 'pulls', 'issues',
  'watching', 'dashboard', 'stars', 'contact', 'security', 'readme',
]);

// Pull a `Club: <name>` declaration out of free text (a PR body or a wall
// entry). Tolerant of leading markdown (>, *, _, #, whitespace) and a few
// separators, strips trailing markdown/emphasis, and rejects junk placeholders.
function parseClub(text) {
  if (!text) return null;
  const m = text.match(/(?:^|\n)[>#\s*_`-]*club\s*[:：\-–—]\s*([^\n]+)/i);
  if (!m) return null;
  let name = m[1]
    .replace(/[*_`]+/g, '')       // drop markdown emphasis
    .replace(/<[^>]*>/g, '')      // drop stray HTML tags/comments
    .replace(/\s+/g, ' ')
    .trim();
  // Cut at obvious sentence/line continuations people sometimes add.
  name = name.split(/\s[|·—]\s/)[0].trim();
  if (!name || name.length < 2) return null;
  name = name.slice(0, 48).trim();
  const key = clubKey(name);
  if (!key || key.length < 2 || JUNK_CLUB_KEYS.has(key)) return null;
  return name;
}

// Valid GitHub handles referenced by a *profile* link in a block — i.e.
// `github.com/<handle>` NOT followed by another path segment (which would make
// it a repo/org link), and not a reserved path. Prevents repo/org links from
// being mistaken for contributor handles.
function handlesInBlock(block) {
  const out = [];
  const re = /github\.com\/([A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38})(?![A-Za-z0-9\/-])/gi;
  let mm;
  while ((mm = re.exec(block))) {
    const handle = mm[1].toLowerCase();
    if (!RESERVED_GH_PATHS.has(handle)) out.push(handle);
  }
  return out;
}

// The contributor a wall entry belongs to: the handle in its "Contributed by"
// attribution line if present, else the last profile handle in the block.
function attributionHandle(block) {
  const attr = block.match(/contributed by[^\n]*?github\.com\/([A-Za-z0-9-]+)/i);
  if (attr) return attr[1].toLowerCase();
  const all = handlesInBlock(block);
  return all.length ? all[all.length - 1] : null;
}

// Parse the profile wall. Wall entries no longer score on their own (only
// labeled PRs do), but they tell us which club a contributor belongs to.
// Returns:
//   entries    — one { handle, club } per tagged entry
//   handleToClub — handle -> club, used to attribute PRs with no Club: line
function parseWall(markdown) {
  const entries = [];
  const handleToClub = new Map();
  if (!markdown) return { entries, handleToClub };
  const start = markdown.indexOf('ENTRIES:START');
  const end = markdown.indexOf('ENTRIES:END');
  const region = start !== -1 && end !== -1 ? markdown.slice(start, end) : markdown;
  // Split into blocks on any markdown heading (#..######) so entry boundaries
  // are respected even when a contributor used the wrong heading level.
  const blocks = region.split(/\n(?=#{1,6}\s)/);
  for (const block of blocks) {
    const club = parseClub(block);
    if (!club) continue;
    for (const handle of handlesInBlock(block)) {
      if (!handleToClub.has(handle)) handleToClub.set(handle, club);
    }
    const author = attributionHandle(block);
    if (author) entries.push({ handle: author, club });
  }
  return { entries, handleToClub };
}

// Fetch a list endpoint across pages (GitHub caps per_page at 100), stopping at
// the first short page or `maxPages`. Removes the old hard 100-item ceiling.
async function ghPaginate(pathBase, token, maxPages = 4) {
  const items = [];
  for (let page = 1; page <= maxPages; page++) {
    const res = await gh(`${pathBase}&page=${page}`, token);
    if (!res.ok) return { ok: false, status: res.status, items };
    const arr = await res.json();
    if (!Array.isArray(arr) || arr.length === 0) break;
    items.push(...arr);
    if (arr.length < 100) break;
  }
  return { ok: true, items };
}

export async function GET() {
  const token = process.env.GITHUB_TOKEN || null;

  if (cache.data && Date.now() - cache.at < CACHE_TTL_MS) {
    return NextResponse.json({ ...cache.data, cached: true, stale: false });
  }

  const owner = process.env.GITHUB_PROFILE_OWNER || process.env.GITHUB_STATS_OWNER || '169Pi';
  const repo = process.env.GITHUB_PROFILE_REPO || process.env.GITHUB_STATS_REPO || '.github';
  const wallPath = process.env.GITHUB_WALL_PATH || 'profile/README.md';

  // Four sources, fetched together:
  //   wall     — handle -> club map, for attributing PRs without a Club: line
  //   labeled  — every PR (any state) carrying the review label; the only PRs
  //              that score. The issues endpoint is used because it can filter
  //              by label; non-PR issues are dropped below.
  //   open     — all open PRs, only to report how many still await the label
  //   recent   — most recently touched PRs, for the activity feed
  const [wallRes, labeledRes, openRes, recentRes] = await Promise.all([
    gh(`/repos/${owner}/${repo}/contents/${wallPath}`, token, 'application/vnd.github.raw'),
    ghPaginate(`/repos/${owner}/${repo}/issues?state=all&labels=${encodeURIComponent(REVIEW_LABEL)}&per_page=100&sort=created&direction=desc`, token, 10),
    ghPaginate(`/repos/${owner}/${repo}/pulls?state=open&per_page=100&sort=created&direction=desc`, token, 4),
    gh(`/repos/${owner}/${repo}/pulls?state=all&per_page=30&sort=updated&direction=desc`, token),
  ]);

  const errors = [];

  let wallMd = '';
  if (wallRes.ok) wallMd = await wallRes.text();
  else errors.push({ endpoint: 'wall', status: wallRes.status });
  const { handleToClub: wallMap } = parseWall(wallMd);

  const labeledPRs = labeledRes.ok
    ? labeledRes.items.filter((i) => i.pull_request && hasReviewLabel(i))
    : [];
  if (!labeledRes.ok) errors.push({ endpoint: 'labeled-prs', status: labeledRes.status });

  const openPRs = openRes.ok ? openRes.items : [];
  if (!openRes.ok) errors.push({ endpoint: 'open-prs', status: openRes.status });

  let recentPulls = [];
  if (recentRes.ok) {
    const j = await recentRes.json();
    recentPulls = Array.isArray(j) ? j : [];
  } else {
    errors.push({ endpoint: 'recent-prs', status: recentRes.status });
  }

  // If GitHub blanked us (rate limit / outage) and we have a previous good
  // result, serve THAT marked stale rather than an empty board. Without a token
  // the unauthenticated limit is only 60/hr, so this is a real path in prod.
  if (!wallRes.ok && !labeledRes.ok && cache.data) {
    return NextResponse.json({ ...cache.data, cached: true, stale: true, staleErrors: errors });
  }

  // Avatars aren't in the wall, so collect them from the PR payloads we do have.
  const avatarByLogin = new Map();
  for (const p of [...labeledPRs, ...openPRs, ...recentPulls]) {
    if (p.user && p.user.login && p.user.avatar_url) {
      avatarByLogin.set(p.user.login.toLowerCase(), p.user.avatar_url);
    }
  }

  const clubs = new Map(); // key -> club aggregate
  function clubFor(resolved) {
    let club = clubs.get(resolved.key);
    if (!club) {
      club = {
        key: resolved.key,
        name: resolved.name,
        registered: resolved.registered,
        roster: !!resolved.roster,
        members: new Map(),
        merged: 0,
        open: 0,
        latestAt: null,
        spellings: new Map(), // raw name -> times seen, to pick a display name
      };
      clubs.set(resolved.key, club);
    }
    club.spellings.set(resolved.name, (club.spellings.get(resolved.name) || 0) + 1);
    return club;
  }
  // Self-serve clubs show their most common spelling; ties go to the one with
  // more spaces ("Coding Club SATI" reads better than "CodingClubSATI").
  // Registered clubs always show their official name.
  function displayName(c) {
    if (c.registered) return c.name;
    const spaces = (n) => (n.match(/ /g) || []).length;
    return Array.from(c.spellings.entries())
      .sort((a, b) => b[1] - a[1] || spaces(b[0]) - spaces(a[0]))[0][0];
  }
  function memberFor(club, login) {
    let mem = club.members.get(login.toLowerCase());
    if (!mem) {
      mem = {
        login,
        avatar: avatarByLogin.get(login.toLowerCase()) || null,
        merged: 0,
        open: 0,
        prs: 0,
        href: `https://github.com/${owner}/${repo}/pulls?q=${encodeURIComponent(`is:pr author:${login}`)}`,
      };
      club.members.set(login.toLowerCase(), mem);
    }
    if (!mem.avatar) mem.avatar = avatarByLogin.get(login.toLowerCase()) || null;
    return mem;
  }

  // A registered club with a roster only credits its listed members — this is
  // what stops impersonation and score-stuffing. Rejected contributions are
  // counted so the effect is observable but never scored.
  let rejected = 0;

  // 1) Score labeled PRs only. Merged ones count as merged, open ones as in
  // flight; closed-unmerged PRs never count.
  let openTagged = 0;
  let openUntagged = 0;
  for (const p of labeledPRs) {
    const u = p.user;
    if (!isHuman(u)) continue;
    const isMerged = !!(p.pull_request && p.pull_request.merged_at);
    const isOpen = p.state === 'open';
    if (!isMerged && !isOpen) continue;
    const login = u.login;
    const name = parseClub(p.body) || wallMap.get(login.toLowerCase()) || null;
    if (!name) { if (isOpen) openUntagged += 1; continue; }
    const club = resolveClub(name);
    if (!clubAllowsMember(club.roster, login)) { rejected += 1; continue; }
    const c = clubFor(club);
    const mem = memberFor(c, login);
    if (isMerged) {
      c.merged += 1;
      mem.merged += 1;
    } else {
      openTagged += 1;
      c.open += 1;
      mem.open += 1;
    }
    mem.prs += 1;
    if (!c.latestAt || p.created_at > c.latestAt) c.latestAt = p.created_at;
  }

  // Open PRs that don't carry the review label yet — reported, never scored.
  const openUnlabeled = openPRs.filter((p) => isHuman(p.user) && !hasReviewLabel(p)).length;

  // 2) Activity feed — recent labeled PRs (any state) we can attribute to a club.
  const activity = [];
  for (const p of recentPulls) {
    const u = p.user;
    if (!isHuman(u) || !hasReviewLabel(p)) continue;
    const name = parseClub(p.body) || wallMap.get(u.login.toLowerCase()) || null;
    if (!name) continue;
    const club = resolveClub(name);
    if (!clubAllowsMember(club.roster, u.login)) continue;
    const state = p.merged_at ? 'merged' : p.state === 'open' ? 'open' : 'closed';
    const at = p.merged_at || p.updated_at || p.created_at;
    activity.push({
      user: u.login,
      avatar: u.avatar_url || null,
      club: club.name,
      clubKey: club.key,
      state,
      when: relTime(at),
      at,
      title: p.title || '',
      href: p.html_url,
    });
    if (activity.length >= 30) break;
  }

  // Serialize clubs, ranked by the number of distinct PEOPLE who opened PRs for
  // the club — the metric that rewards broad participation (mobilizing a crew)
  // over one person spamming PRs. Total PRs opened breaks ties as a momentum
  // signal, then recency. Roster gating still stops score-stuffing upstream.
  const ranked = Array.from(clubs.values())
    .map((c) => ({
      key: c.key,
      name: displayName(c),
      registered: c.registered,
      roster: c.roster,
      merged: c.merged,
      open: c.open,
      total: c.merged + c.open,
      memberCount: c.members.size,
      latestAt: c.latestAt,
      members: Array.from(c.members.values())
        .sort((a, b) => b.merged - a.merged || b.prs - a.prs)
        .slice(0, 50),
    }))
    .sort(
      (a, b) =>
        b.memberCount - a.memberCount ||
        b.total - a.total ||
        (b.latestAt || '').localeCompare(a.latestAt || ''),
    );

  // Keep the feed's club labels in sync with the chosen display names.
  const nameByKey = new Map(ranked.map((c) => [c.key, c.name]));
  for (const a of activity) a.club = nameByKey.get(a.clubKey) || a.club;

  const totalMerged = ranked.reduce((s, c) => s + c.merged, 0);
  const data = {
    wall: { owner, repo, path: wallPath },
    reviewLabel: REVIEW_LABEL,
    clubs: ranked,
    activity,
    totals: {
      clubs: ranked.length,
      merged: totalMerged,
      openTagged,
      openUntagged,
      openUnlabeled,
      rejected,
    },
    fetchedAt: new Date().toISOString(),
    errors: errors.length ? errors : undefined,
  };

  if (wallMd || labeledPRs.length || openPRs.length || recentPulls.length) {
    cache = { at: Date.now(), data };
  }

  return NextResponse.json({ ...data, cached: false, stale: false });
}
