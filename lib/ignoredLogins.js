// GitHub handles whose PRs never appear in the public stats, contributor list
// or club leaderboard — e.g. the site's maintainer, whose admin/test PRs would
// otherwise top every list, and Dependabot, whose PRs aren't contributions.
// Bot accounts match with or without their `[bot]` suffix. Extend at deploy
// time with a comma-separated `IGNORED_GITHUB_LOGINS` env var.
const DEFAULT_IGNORED = ['kindavishal', 'dependabot'];

const normalize = (l) => String(l).trim().replace(/^@/, '').replace(/\[bot\]$/i, '').toLowerCase();

const IGNORED = new Set(
  [...DEFAULT_IGNORED, ...String(process.env.IGNORED_GITHUB_LOGINS || '').split(',')]
    .map(normalize)
    .filter(Boolean),
);

export function isIgnoredLogin(login) {
  return !!login && IGNORED.has(normalize(login));
}
