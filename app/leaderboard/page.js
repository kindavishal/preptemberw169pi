'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SiteFooter, SiteNav } from '../_components/chrome';

const PROFILE_OWNER = process.env.NEXT_PUBLIC_GITHUB_PROFILE_OWNER || '169Pi';
const PROFILE_REPO = process.env.NEXT_PUBLIC_GITHUB_PROFILE_REPO || '.github';
const DISCORD_URL = process.env.NEXT_PUBLIC_DISCORD_URL || 'https://discord.gg/QqkrMmvt4';

const POLL_MS = 45000;

function initialsColor(seed) {
  const palette = ['#1B7A6E', '#C64B8C', '#E8A317', '#37555d', '#8b5cf6', '#0ea5e9'];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

function Avatar({ src, seed, size = 28, className = 'club-mem-avatar' }) {
  if (src) return <img src={src} alt="" className={className} style={{ width: size, height: size }} />;
  return (
    <span
      className={className}
      style={{
        width: size, height: size, background: initialsColor(seed),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: size * 0.42, fontWeight: 700,
      }}
    >
      {seed.slice(0, 1).toUpperCase()}
    </span>
  );
}

export default function LeaderboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(() => new Set());
  const [tick, setTick] = useState(0); // drives the "updated Xs ago" label
  const fetchedAtRef = useRef(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/leaderboard', { cache: 'no-store' });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Failed to load leaderboard');
      setData(j);
      setError('');
      fetchedAtRef.current = Date.now();
    } catch (e) {
      setError(e.message || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll on an interval, pausing while the tab is hidden and refreshing the
  // moment it comes back — so the board is fresh without hammering the API.
  useEffect(() => {
    let timer = null;
    const start = () => {
      stop();
      timer = setInterval(() => { if (!document.hidden) load(); }, POLL_MS);
    };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    const onVis = () => { if (!document.hidden) load(); };

    load();
    start();
    document.addEventListener('visibilitychange', onVis);
    return () => { stop(); document.removeEventListener('visibilitychange', onVis); };
  }, [load]);

  // A gentle 5s heartbeat so "updated Xs ago" stays honest between polls.
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 5000);
    return () => clearInterval(t);
  }, []);

  const clubs = data?.clubs || [];
  const activity = data?.activity || [];
  const totals = data?.totals;

  let agoLabel = '';
  if (fetchedAtRef.current) {
    const s = Math.max(0, Math.round((Date.now() - fetchedAtRef.current) / 1000));
    agoLabel = s < 5 ? 'just now' : s < 60 ? `${s}s ago` : `${Math.floor(s / 60)}m ago`;
  }

  function toggle(key) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  const maxMembers = clubs.reduce((m, c) => Math.max(m, c.memberCount), 0);

  const leader = clubs[0] || null;
  const compareUrl = `https://github.com/${PROFILE_OWNER}/${PROFILE_REPO}/compare`;
  const showPodium = !error && (clubs.length > 0 || !loading);

  function renderPodiumSlot(rank) {
    const club = clubs[rank - 1];
    const pClass = `p${rank}`;
    const avSize = rank === 1 ? 66 : 52;
    if (!club) {
      return (
        <div key={rank} className="podium-slot is-empty">
          {rank === 1 && <div className="podium-crown" aria-hidden>👑</div>}
          <div className="podium-avatar podium-avatar-empty" style={{ width: avSize, height: avSize }}>
            <span className="material-symbols-outlined">add</span>
          </div>
          <div className="podium-empty-name">Open spot</div>
          <div className="podium-stats"><span className="podium-claim-badge">yours to claim</span></div>
          <div className={`podium-pedestal is-empty ${pClass}`}>
            <div className="podium-rank-num">{rank}</div>
          </div>
        </div>
      );
    }
    return (
      <div key={rank} className={`podium-slot ${rank === 1 ? 'is-first' : ''}`}>
        {rank === 1 && <div className="podium-crown" aria-hidden>👑</div>}
        <div className="podium-avatar-wrap">
          <Avatar src={null} seed={club.name} size={avSize} className="podium-avatar" />
          <span className={`podium-medal m${rank}`}>{rank}</span>
        </div>
        <div className="podium-name">
          {club.name}
          {club.roster && (
            <span className="podium-verified" title="Roster-verified club">
              <span className="material-symbols-outlined">verified</span>
            </span>
          )}
        </div>
        <div className="podium-stats">
          <span className="podium-people">{club.memberCount} {club.memberCount === 1 ? 'contributor' : 'contributors'}</span>
          <span className="podium-prs">{club.total} PR{club.total === 1 ? '' : 's'}</span>
        </div>
        <div className={`podium-pedestal ${pClass}`}>
          <div className="podium-rank-num">{rank}</div>
          <div className="podium-total">{club.memberCount} {club.memberCount === 1 ? 'person' : 'people'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <SiteNav />

      <main className="wrap">
        {/* Intro */}
        <section className="section org-intro">
          <div className="pill-pixel">
            <span className="sq" />LIVE · CLUBS COMPETE FOR THE TOP SPOT
          </div>
          <h1 className="org-h1">
            Which club is <span className="accent">leading the wall?</span>
          </h1>
          <p className="org-lede">
            Every PR your community opens to <strong>{PROFILE_OWNER}/{PROFILE_REPO}</strong> is counted toward your
            club here — live. Tag a <code>Club:</code> in your pull request and your contribution lands on the board
            within a minute. The club that gets the <strong>most people opening PRs</strong> wins <strong>prizes</strong> (announced soon 🎁).
          </p>
          <div className="lb-meta">
            <span className={`lb-live ${loading ? 'is-loading' : ''}`}>
              <span className="lb-live-dot" />
              {loading ? 'Loading…' : 'Live'}
            </span>
            {agoLabel && !loading && <span className="lb-updated">updated {agoLabel}</span>}
            <button type="button" className="lb-refresh" onClick={load} aria-label="Refresh now">
              <span className="material-symbols-outlined">refresh</span>Refresh
            </button>
          </div>
        </section>

        {error && (
          <section className="section">
            <div className="lb-error">
              <span className="material-symbols-outlined">error</span>
              {error} — retrying automatically.
            </div>
          </section>
        )}

        {!error && data?.stale && (
          <section className="section">
            <div className="lb-stale">
              <span className="material-symbols-outlined">history</span>
              GitHub is rate-limiting us right now — showing the last known standings. They&apos;ll refresh automatically.
            </div>
          </section>
        )}

        {showPodium && (
          <section className="section">
            <div className="card podium">
              <div className="podium-head">
                <div className="podium-title">
                  <span className="material-symbols-outlined">emoji_events</span>
                  The podium — top 3 clubs right now
                </div>
                <span className="podium-sub">most contributors wins the crown</span>
              </div>

              <div className="podium-stage">
                {renderPodiumSlot(2)}
                {renderPodiumSlot(1)}
                {renderPodiumSlot(3)}
              </div>

              <div className="podium-claim">
                <a className="podium-cta" href={compareUrl} target="_blank" rel="noreferrer">
                  {leader ? 'Claim the top spot' : 'Claim #1'}
                  <span className="material-symbols-outlined">north_east</span>
                </a>
                <div className="podium-claim-text">
                  {leader ? (
                    <>
                      <span className="podium-claim-lead">👑 <strong>{leader.name}</strong> holds #1 with {leader.memberCount} {leader.memberCount === 1 ? 'person' : 'people'} opening PRs.</span>{' '}
                      Think your club can rally more? Here&apos;s how:
                    </>
                  ) : (
                    <>
                      The podium is wide open — <strong>the crown is unclaimed.</strong> Be the first club on the board. Here&apos;s how:
                    </>
                  )}
                </div>
                <ol className="podium-steps">
                  <li>
                    <span className="podium-step-n">1</span>
                    <span>Open a PR to <strong>{PROFILE_OWNER}/{PROFILE_REPO}</strong> and add <code>Club: Your Club</code> to the description.</span>
                  </li>
                  <li>
                    <span className="podium-step-n">2</span>
                    <span>Rally your crew in <a href={DISCORD_URL} target="_blank" rel="noreferrer">Discord</a> — every member&apos;s PR counts toward the club.</span>
                  </li>
                  <li>
                    <span className="podium-step-n">3</span>
                    <span>The more of you who open PRs, the higher you climb. <strong>Most contributors takes #1.</strong> 🏆</span>
                  </li>
                </ol>
              </div>
            </div>
          </section>
        )}

        <section className="section lb-grid">
          {/* Leaderboard */}
          <div className="lb-main">
            <div className="card lb-board">
              <div className="lb-board-head">
                <div>
                  <div className="leaderboard-title">Clubs leaderboard</div>
                  <div className="leaderboard-sub">
                    {totals
                      ? `${totals.clubs} club${totals.clubs === 1 ? '' : 's'} · ${totals.merged} merged · ${totals.openTagged} in flight`
                      : 'Ranked by people opening PRs'}
                  </div>
                </div>
                <span className="lb-rank-legend">most contributors wins</span>
              </div>

              <ol className="lb-list">
                {loading && clubs.length === 0 && (
                  <li className="leaderboard-empty">Counting contributions…</li>
                )}
                {!loading && clubs.length === 0 && (
                  <li className="lb-empty-cta">
                    <strong>No clubs on the board yet.</strong>
                    <span>Be the first — add <code>Club: Your Club</code> to your PR description and open a pull request.</span>
                    <a
                      href={`https://github.com/${PROFILE_OWNER}/${PROFILE_REPO}/compare`}
                      target="_blank" rel="noreferrer" className="hbtn hbtn-primary"
                    >
                      Open a PR<span className="material-symbols-outlined">north_east</span>
                    </a>
                  </li>
                )}
                {clubs.map((c, i) => {
                  const rank = i + 1;
                  const rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : '';
                  const isOpen = expanded.has(c.key);
                  const pct = maxMembers ? Math.max(6, Math.round((c.memberCount / maxMembers) * 100)) : 0;
                  return (
                    <li key={c.key} className={`lb-club ${rank <= 3 ? 'top3' : ''}`}>
                      <button type="button" className="lb-club-row" onClick={() => toggle(c.key)} aria-expanded={isOpen}>
                        <span className={`leaderboard-rank ${rankClass}`}>{rank}</span>
                        <span className="lb-club-body">
                          <span className="lb-club-top">
                            <span className="lb-club-name">
                              {c.name}
                              {c.roster && (
                                <span className="lb-verified" title="Roster-verified club — only registered members count">
                                  <span className="material-symbols-outlined">verified</span>
                                </span>
                              )}
                            </span>
                            <span className="lb-club-counts">
                              <span className="lb-count prs" title="Total PRs opened">
                                {c.total} PR{c.total === 1 ? '' : 's'}
                              </span>
                              <span className="lb-count merged" title="Merged PRs">
                                <span className="material-symbols-outlined">merge</span>{c.merged}
                              </span>
                              <span className="lb-count open" title="Open PRs">
                                <span className="material-symbols-outlined">pending</span>{c.open}
                              </span>
                            </span>
                          </span>
                          <span className="lb-bar"><span className="lb-bar-fill" style={{ width: `${pct}%` }} /></span>
                        </span>
                        <span className="lb-total"><strong>{c.memberCount}</strong><span>{c.memberCount === 1 ? 'person' : 'people'}</span></span>
                        <span className={`material-symbols-outlined lb-chev ${isOpen ? 'open' : ''}`}>expand_more</span>
                      </button>
                      {isOpen && (
                        <div className="lb-members">
                          {c.members.map((m) => (
                            <a key={m.login} href={m.href} target="_blank" rel="noreferrer" className="lb-mem">
                              <Avatar src={m.avatar} seed={m.login} size={24} />
                              <span className="lb-mem-login">@{m.login}</span>
                              <span className="lb-mem-prs">
                                {m.merged > 0 && <span className="lb-mem-merged">{m.merged} merged</span>}
                                {m.prs} PR{m.prs === 1 ? '' : 's'}
                              </span>
                            </a>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>

          {/* Right rail: activity + how-to-join */}
          <aside className="lb-rail">
            <div className="card lb-activity">
              <div className="lb-activity-head">
                <span className="material-symbols-outlined">bolt</span>
                <span>Live activity</span>
              </div>
              <ul className="lb-feed">
                {activity.length === 0 && !loading && (
                  <li className="leaderboard-empty">No tagged PRs yet.</li>
                )}
                {activity.map((a, i) => (
                  <li key={`${a.user}-${a.at}-${i}`} className="lb-feed-item">
                    <Avatar src={a.avatar} seed={a.user} size={26} className="lb-feed-avatar" />
                    <div className="lb-feed-body">
                      <a href={a.href} target="_blank" rel="noreferrer" className="lb-feed-line">
                        <strong>@{a.user}</strong>
                        <span className={`lb-feed-state ${a.state}`}>{a.state}</span>
                      </a>
                      <div className="lb-feed-meta">
                        <span className="lb-feed-club">{a.club}</span>
                        <span className="lb-feed-when">{a.when}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card lb-join">
              <div className="lb-join-head">
                <span className="material-symbols-outlined">flag</span>
                <span>Get your club on the board</span>
              </div>
              <ol className="lb-steps">
                <li>Open a PR adding your entry to the wall (see the <a href="/">checklist</a>).</li>
                <li>Add a line <code>Club: Your Club Name</code> to the PR description.</li>
                <li>That&apos;s it — your PR is counted here within a minute, and again when it merges.</li>
              </ol>
              <a
                href={`https://github.com/${PROFILE_OWNER}/${PROFILE_REPO}/compare`}
                target="_blank" rel="noreferrer" className="leaderboard-submit"
              >
                <span className="material-symbols-outlined">add_circle</span>
                Open a PR &amp; tag your club
              </a>
              <p className="lb-join-note">
                Organizers: rally the crew in <a href={DISCORD_URL} target="_blank" rel="noreferrer">Discord</a> and
                agree on one exact spelling for your club name so every PR lands in the same bucket.
              </p>
            </div>
          </aside>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
