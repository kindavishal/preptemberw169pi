import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const revalidate = 60;

const CACHE_TTL_MS = 60 * 1000;
let cache = { at: 0, data: null };

function relTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 7 * 86400000) return `${Math.floor(diff / 86400000)}d ago`;
  return new Date(iso).toLocaleDateString();
}

async function gh(path, token) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'good-first-alpie-app',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`https://api.github.com${path}`, { headers, cache: 'no-store' });
}

export async function GET() {
  // Stats are public data (stars, PRs, contributors) and must not depend on any
  // individual user's OAuth token — that token can expire while their session
  // cookie is still valid, which 401s every call and blanks the whole panel.
  const token = process.env.GITHUB_TOKEN || null;

  if (cache.data && Date.now() - cache.at < CACHE_TTL_MS) {
    return NextResponse.json({ ...cache.data, cached: true });
  }

  const owner = process.env.GITHUB_STATS_OWNER || '169Pi';
  const repo = process.env.GITHUB_STATS_REPO || '.github';
  const starsOwner = process.env.GITHUB_STARS_OWNER || '169Pi';
  const starsRepo = process.env.GITHUB_STARS_REPO || 'Alpie-Core';

  const [starsRes, repoRes, prsRes] = await Promise.all([
    gh(`/repos/${starsOwner}/${starsRepo}`, token),
    gh(`/repos/${owner}/${repo}`, token),
    gh(`/repos/${owner}/${repo}/pulls?state=all&per_page=100&sort=created&direction=desc`, token),
  ]);

  const errors = [];
  let stars = null;
  if (starsRes.ok) {
    const j = await starsRes.json();
    stars = j.stargazers_count ?? 0;
  } else {
    errors.push({ endpoint: 'stars-repo', status: starsRes.status });
  }

  let forks = null;
  if (repoRes.ok) {
    const j = await repoRes.json();
    forks = j.forks_count ?? 0;
  } else {
    errors.push({ endpoint: 'repo', status: repoRes.status });
  }

  let prsCount = null;
  let recentPRs = [];
  let pulls = [];
  if (prsRes.ok) {
    const j = await prsRes.json();
    pulls = Array.isArray(j) ? j : [];
    prsCount = pulls.length;
    recentPRs = pulls.slice(0, 4).map((p) => ({
      user: p.user?.login || 'unknown',
      avatar: p.user?.avatar_url || null,
      when: relTime(p.created_at),
      href: p.html_url,
    }));
  } else {
    errors.push({ endpoint: 'pulls', status: prsRes.status });
  }

  const BOT_LOGINS = new Set([
    'claude',
    'anthropic',
    'anthropic-ai',
    'copilot',
    'github-copilot',
    'chatgpt',
    'openai',
    'gpt-engineer',
    'devin',
    'devin-ai',
    'cursor',
    'codeium',
    'sweep-ai',
    'sourcery-ai',
    'github-actions',
    'dependabot',
    'renovate',
    'renovate-bot',
    'snyk-bot',
    'imgbot',
    'allcontributors',
  ]);
  const isHuman = (c) => {
    if (!c || !c.login) return false;
    if (c.type && c.type !== 'User') return false;
    const login = c.login.toLowerCase();
    if (login.endsWith('[bot]') || login.endsWith('-bot')) return false;
    return !BOT_LOGINS.has(login);
  };

  // Leaderboard: rank people by how many PRs they've opened.
  let contributorsCount = null;
  let contributors = [];
  if (prsRes.ok) {
    const byAuthor = new Map();
    for (const p of pulls) {
      const u = p.user;
      if (!isHuman(u)) continue;
      const existing = byAuthor.get(u.login);
      if (existing) {
        existing.prs += 1;
      } else {
        byAuthor.set(u.login, {
          login: u.login,
          avatar: u.avatar_url || null,
          prs: 1,
          href: `https://github.com/${owner}/${repo}/pulls?q=${encodeURIComponent(`is:pr author:${u.login}`)}`,
        });
      }
    }
    contributors = Array.from(byAuthor.values()).sort((a, b) => b.prs - a.prs);
    contributorsCount = contributors.length;
  }

  const data = {
    owner, repo,
    starsOwner, starsRepo,
    stars, forks, prsCount, contributorsCount, contributors, recentPRs,
    fetchedAt: new Date().toISOString(),
    errors: errors.length ? errors : undefined,
  };

  if (stars !== null || prsCount !== null || contributorsCount !== null) {
    cache = { at: Date.now(), data };
  }

  return NextResponse.json({ ...data, cached: false });
}
