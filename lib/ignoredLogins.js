// GitHub handles whose PRs never appear in the public stats, contributor list
// or club leaderboard — e.g. the site's maintainer, whose admin/test PRs would
// otherwise top every list. Extend at deploy time with a comma-separated
// `IGNORED_GITHUB_LOGINS` env var.
const DEFAULT_IGNORED = ['kindavishal'];

const IGNORED = new Set(
  [...DEFAULT_IGNORED, ...String(process.env.IGNORED_GITHUB_LOGINS || '').split(',')]
    .map((l) => l.trim().replace(/^@/, '').toLowerCase())
    .filter(Boolean),
);

export function isIgnoredLogin(login) {
  return !!login && IGNORED.has(String(login).toLowerCase());
}
