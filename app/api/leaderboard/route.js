import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const revalidate = 45;

// The club leaderboard is derived entirely from public GitHub data — no
// database. A contributor declares their club two ways, both parsed here:
//   1. A `Club: <name>` line in their PR description (works instantly, even
//      while the PR is still open), or
//   2. A `Club: <name>` line inside the entry they add to the profile wall
//      (picked up once the PR is merged).
// We bucket every human PR author into a club and rank clubs by contributions.

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

async function gh(path, token, accept = 'application/vnd.github+json') {
  const headers = {
    Accept: accept,
    'User-Agent': 'preptember-app',
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
  return !BOT_LOGINS.has(login);
}

// Pull a `Club: <name>` declaration out of free text (a PR body or a wall
// entry). Tolerant of leading markdown (>, *, _, #, whitespace) and a few
// separators, and strips trailing markdown/emphasis from the captured name.
function parseClub(text) {
  if (!text) return null;
  const m = text.match(/(?:^|\n)[>#\s*_`-]*club\s*[:：\-–—]\s*([^\n]+)/i);
  if (!m) return null;
  let name = m[1]
    .replace(/[*_`]+/g, '')       // drop markdown emphasis
    .replace(/<[^>]*>/g, '')      // drop stray HTML tags
    .replace(/\s+/g, ' ')
    .trim();
  // Cut at obvious sentence/line continuations people sometimes add.
  name = name.split(/\s[|·—]\s/)[0].trim();
  if (!name || name.length < 2) return null;
  return name.slice(0, 48);
}

function clubKey(name) {
  return name.toLowerCase().replace(/\s+/g, ' ').trim();
}

// Map GitHub handle -> club, read from the merged entries on the profile wall.
function wallHandleToClub(markdown) {
  const map = new Map();
  if (!markdown) return map;
  const start = markdown.indexOf('ENTRIES:START');
  const end = markdown.indexOf('ENTRIES:END');
  const region = start !== -1 && end !== -1 ? markdown.slice(start, end) : markdown;
  // Split into blocks on the `### ` entry headings so each block is one entry.
  const blocks = region.split(/\n(?=###\s)/);
  for (const block of blocks) {
    const club = parseClub(block);
    if (!club) continue;
    // Every handle referenced by a github.com profile link in the block.
    const re = /github\.com\/([A-Za-z0-9-]+)/g;
    let mm;
    while ((mm = re.exec(block))) {
      const handle = mm[1].toLowerCase();
      if (!map.has(handle)) map.set(handle, club);
    }
  }
  return map;
}

export async function GET() {
  const token = process.env.GITHUB_TOKEN || null;

  if (cache.data && Date.now() - cache.at < CACHE_TTL_MS) {
    return NextResponse.json({ ...cache.data, cached: true });
  }

  const owner = process.env.GITHUB_PROFILE_OWNER || process.env.GITHUB_STATS_OWNER || '169Pi';
  const repo = process.env.GITHUB_PROFILE_REPO || process.env.GITHUB_STATS_REPO || '.github';
  const wallPath = process.env.GITHUB_WALL_PATH || 'profile/README.md';

  const [prsRes, wallRes] = await Promise.all([
    gh(`/repos/${owner}/${repo}/pulls?state=all&per_page=100&sort=created&direction=desc`, token),
    gh(`/repos/${owner}/${repo}/contents/${wallPath}`, token, 'application/vnd.github.raw'),
  ]);

  const errors = [];
  let pulls = [];
  if (prsRes.ok) {
    const j = await prsRes.json();
    pulls = Array.isArray(j) ? j : [];
  } else {
    errors.push({ endpoint: 'pulls', status: prsRes.status });
  }

  let wallMd = '';
  if (wallRes.ok) {
    wallMd = await wallRes.text();
  } else {
    errors.push({ endpoint: 'wall', status: wallRes.status });
  }
  const wallMap = wallHandleToClub(wallMd);

  const clubs = new Map();   // key -> club aggregate
  const activity = [];
  let taggedPRs = 0;
  let untaggedPRs = 0;

  for (const p of pulls) {
    const u = p.user;
    if (!isHuman(u)) continue;
    const login = u.login;
    const name = parseClub(p.body) || wallMap.get(login.toLowerCase()) || null;
    if (!name) { untaggedPRs += 1; continue; }
    taggedPRs += 1;

    const key = clubKey(name);
    const state = p.merged_at ? 'merged' : p.state === 'open' ? 'open' : 'closed';

    let club = clubs.get(key);
    if (!club) {
      club = { key, name, members: new Map(), merged: 0, open: 0, closed: 0, latestAt: null };
      clubs.set(key, club);
    }
    club[state] += 1;
    if (!club.latestAt || p.created_at > club.latestAt) club.latestAt = p.created_at;

    let mem = club.members.get(login);
    if (!mem) {
      mem = {
        login,
        avatar: u.avatar_url || null,
        prs: 0,
        merged: 0,
        href: `https://github.com/${owner}/${repo}/pulls?q=${encodeURIComponent(`is:pr author:${login}`)}`,
      };
      club.members.set(login, mem);
    }
    mem.prs += 1;
    if (state === 'merged') mem.merged += 1;

    if (activity.length < 30) {
      activity.push({
        user: login,
        avatar: u.avatar_url || null,
        club: name,
        clubKey: key,
        state,
        when: relTime(p.created_at),
        at: p.created_at,
        title: p.title || '',
        href: p.html_url,
      });
    }
  }

  // Serialize clubs, ranked by MERGED PRs — the number that decides the prize.
  // Closed-unmerged PRs are tracked but deliberately excluded from `total` and
  // from ranking, so a club can't climb by opening and closing junk PRs. Open
  // PRs break ties (a signal of live momentum) but never outweigh a merge.
  const ranked = Array.from(clubs.values())
    .map((c) => ({
      key: c.key,
      name: c.name,
      merged: c.merged,
      open: c.open,
      closed: c.closed,
      total: c.merged + c.open, // counts toward the standing; excludes closed
      memberCount: c.members.size,
      latestAt: c.latestAt,
      members: Array.from(c.members.values())
        .sort((a, b) => b.merged - a.merged || b.prs - a.prs)
        .slice(0, 50),
    }))
    .sort(
      (a, b) =>
        b.merged - a.merged ||
        b.open - a.open ||
        b.memberCount - a.memberCount ||
        (b.latestAt || '').localeCompare(a.latestAt || ''),
    );

  const data = {
    wall: { owner, repo, path: wallPath },
    clubs: ranked,
    activity,
    totals: { clubs: ranked.length, taggedPRs, untaggedPRs },
    fetchedAt: new Date().toISOString(),
    errors: errors.length ? errors : undefined,
  };

  if (pulls.length || wallMd) {
    cache = { at: Date.now(), data };
  }

  return NextResponse.json({ ...data, cached: false });
}
