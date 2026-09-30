// ── Club registry (optional, no backend) ─────────────────────────────
// The Clubs Leaderboard works fully self-serve: anyone can tag `Club: X` on a
// PR and a bucket appears. That's great for reach but has two soft spots for a
// prize contest:
//   • fragmentation — "IIT Delhi", "IIT-Delhi OSS", "IITD Coders" split a real
//     club's score across buckets, and
//   • spoofing — nothing stops someone tagging a club they aren't part of.
//
// This registry is the lightweight, commit-and-deploy answer to both. It is
// EMPTY by default, so nothing changes until an organizer (or the 169Pi team)
// adds their club here via a PR. For each registered club:
//   • `aliases` fold every listed spelling into the one canonical `name`, so
//     the score can never fragment, and
//   • `members`, when present, lock the club to a ROSTER — only those GitHub
//     handles count toward it, which stops impersonation and score-stuffing.
//     Omit `members` (or leave it empty) to keep the club open/self-serve but
//     still benefit from alias folding.
//
// Example:
//   {
//     name: 'IIT Delhi OSS Club',
//     aliases: ['IIT Delhi', 'IITD Coders', 'IIT-Delhi OSS'],
//     members: ['asha-dev', 'rohan', 'meera'], // omit for an open club
//   }
export const CLUB_REGISTRY = [
  // Add clubs here.
];

// Fold a club name to a canonical key so trivial variations — casing, spacing,
// hyphens/punctuation, accents — all match. Shared with the leaderboard API so
// registered and self-serve clubs bucket identically.
export function clubKey(name) {
  return String(name)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Build a lookup from every canonical key AND alias key -> the registered club,
// once at module load.
const REGISTRY_INDEX = (() => {
  const idx = new Map();
  for (const c of CLUB_REGISTRY) {
    if (!c || !c.name) continue;
    const roster = Array.isArray(c.members) && c.members.length
      ? new Set(c.members.map((m) => String(m).toLowerCase()))
      : null;
    const entry = { name: c.name, key: clubKey(c.name), roster };
    const keys = [c.name, ...(c.aliases || [])].map(clubKey).filter(Boolean);
    for (const k of keys) if (!idx.has(k)) idx.set(k, entry);
  }
  return idx;
})();

// Resolve a raw club name to its canonical identity. A registered club (matched
// by name or alias) returns the official name/key and its roster; anything else
// passes through as a self-serve club with no roster.
export function resolveClub(rawName) {
  const key = clubKey(rawName);
  const reg = REGISTRY_INDEX.get(key);
  if (reg) return { name: reg.name, key: reg.key, roster: reg.roster, registered: true };
  return { name: String(rawName).slice(0, 48).trim(), key, roster: null, registered: false };
}

// Whether a handle is allowed to score for a club. Open clubs (no roster) allow
// anyone; rostered clubs allow only listed members.
export function clubAllowsMember(roster, login) {
  if (!roster) return true;
  return roster.has(String(login).toLowerCase());
}
