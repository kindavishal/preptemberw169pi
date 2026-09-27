'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePresence } from '../lib/usePresence';
import { GithubMark, SiteFooter, ThemeToggle } from './_components/chrome';

const OWNER = process.env.NEXT_PUBLIC_GITHUB_OWNER || '169Pi';
const REPO = process.env.NEXT_PUBLIC_GITHUB_REPO || 'Alpie-Core';
const PROFILE_OWNER = process.env.NEXT_PUBLIC_GITHUB_PROFILE_OWNER || '169Pi';
const PROFILE_REPO = process.env.NEXT_PUBLIC_GITHUB_PROFILE_REPO || '.github';
const DISCORD_URL = process.env.NEXT_PUBLIC_DISCORD_URL || 'https://discord.gg/GwJP7MsZp7';
const NEXT_MERGE_DATE = 'October 6, 2026';
const STORAGE_KEY = 'preptember.progress.v3';

const STEPS = [
  { id: 'github', tag: '00', title: 'Create your free GitHub account', desc: 'brand new? start here', help: true, ctaText: 'Sign up free ↗', ctaHref: 'https://github.com/signup',
    guide: 'GitHub is the platform where developers host and share project files — think of it as Google Drive for code and content. It is free, and you need an account before anything else here. Signing up takes about a minute: enter an email, pick a password and a username, confirm the email, and you are in. Once you sign in above, this step checks itself off.',
    mock: 'signup' },
  { id: 'star', tag: '01', title: `Star ${REPO}`, desc: 'takes 2 seconds', ctaText: 'Star it ↗', ctaHref: `https://github.com/${OWNER}/${REPO}` },
  { id: 'discord', tag: '02', title: 'Join the Discord', desc: 'where you get help', ctaText: 'Join ↗', ctaHref: DISCORD_URL },
  { id: 'fork', tag: '03', title: `Fork ${PROFILE_OWNER}/${PROFILE_REPO}`, desc: 'make your own copy', help: true, ctaText: 'Open repo ↗', ctaHref: `https://github.com/${PROFILE_OWNER}/${PROFILE_REPO}`,
    guide: `A <term:fork>fork</term:fork> is your personal copy of the <term:repository>repo</term:repository>. You are forking ${PROFILE_OWNER}/${PROFILE_REPO} — the 169pi org profile — because that is where your entry gets published. On the repo page, click the Fork button (top-right), then Create fork. You will make your change in your copy, then offer it back — all in your browser.`,
    mock: 'fork' },
  { id: 'add', tag: '04', title: 'Add your entry to the profile README', desc: 'your creative bit', help: true,
    guide: 'In your fork, open profile/README.md — the one inside the profile/ folder, not the repo\'s top-level README.md — click the pencil (Edit) icon, scroll to the "Make this README yours" section, and paste your entry as its own block. Keep the surrounding structure intact. Not sure what to make? Tap Ask Alpie in the bottom-right corner for ideas.',
    cmd: 'profile/README.md  →  ## 🎨 Make this README yours',
    webSteps: [
      'Click the pencil (Edit) icon on profile/README.md.',
      'Scroll to the "Make this README yours" heading.',
      'Paste your entry as a new block under it.',
      'Scroll down and click Commit changes.',
    ],
    mock: 'commit' },
  { id: 'pr', tag: '05', title: 'Open your pull request', desc: 'offer your change back', help: true, ctaText: 'Open a PR ↗', ctaHref: `https://github.com/${PROFILE_OWNER}/${PROFILE_REPO}/compare`,
    guide: 'A <term:pull request>pull request</term:pull request> asks 169pi to add your change to their repo. From your fork, click Contribute then Open pull request, and name it exactly like this:',
    cmd: '@your-github-handle: <what you’re calling it>',
    mock: 'pr',
    rules: [
      'One open PR per person at a time — put your best foot forward.',
      'Your entry must be original (your own work, or clearly attributed).',
      'It has to reflect something real about 169pi — a model, capability, or benchmark.',
      'Entries stay in the repo permanently; older ones may rotate out of the visible section but nothing gets deleted.',
    ] },
  { id: 'review', tag: '06', title: 'Wait for the review', desc: 'bi-weekly merges', help: true, ctaText: 'Discuss in Discord ↗', ctaHref: DISCORD_URL,
    guide: 'The team merges every two weeks — next merge is October 6, 2026. If they suggest a tweak, just commit again to the same branch and your PR updates itself.' },
  { id: 'merged', tag: '07', title: 'Merged → you did it', desc: 'first contribution done', help: true,
    guide: 'When it is merged, your entry is live on the 169pi org profile and 169pi ships you swag. You just made your first open-source contribution.' },
];

// Default, ready-to-paste image prompt for a contributor's README "brick".
// Keeps [bracketed placeholders] so each person can make the tile their own
// before generating it on an external tool and pasting it into their entry.
function defaultEntryPrompt() {
  return `A small square "brick" tile for the 169Pi open-source contributor wall, representing [your name or GitHub handle]. Build it around a personal motif — [a symbol that represents you, e.g. a rocket, a chai cup, a terminal cursor] — that nods to something real about 169Pi (local & offline-first AI models built in India). Use 169Pi's teal and emerald palette (#134E4A, #10B981, #0284C7) with [your accent colour] as a single highlight. Add a tiny "#GoodFirstAlpie" tag and a small label reading "[your name]". Minimal and crisp, generous negative space, no photorealism, no clutter, no misspelled text. Flat vector illustration style, square 1:1 aspect ratio, sized for a README contributor wall.`;
}

// Renders guide text that contains <term:key>label</term:key> markers as inline
// tooltip terms, leaving the rest as plain text.
function renderGuide(text) {
  const parts = String(text).split(/(<term:[^>]+>.*?<\/term:[^>]+>)/g);
  return parts.map((part, i) => {
    const m = part.match(/^<term:([^>]+)>(.*?)<\/term:[^>]+>$/);
    if (m) return <Term key={i} k={m[1]}>{m[2]}</Term>;
    return part ? <span key={i}>{part}</span> : null;
  });
}

function pad(n) { return (n < 10 ? '0' : '') + n; }

function useCountdown(target) {
  const [now, setNow] = useState(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (now === null) return { days: '—', clock: '--:--:--' };
  const ms = Math.max(0, new Date(target).getTime() - now);
  const day = 86400000;
  const days = Math.floor(ms / day);
  const hrs = Math.floor((ms % day) / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return { days, clock: `${pad(hrs)}:${pad(mins)}:${pad(secs)}` };
}

function initialsColor(login) {
  const palette = ['#1B7A6E', '#C64B8C', '#E8A317', '#37555d', '#8b5cf6', '#0ea5e9'];
  let h = 0;
  for (let i = 0; i < login.length; i++) h = (h * 31 + login.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

function relTime(iso) {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 7 * 86400000) return `${Math.floor(diff / 86400000)}d ago`;
  return new Date(iso).toLocaleDateString();
}

// Plain-language definitions for the jargon-buster tooltips and the glossary.
const GLOSSARY = [
  { term: 'Repository', short: 'Repo', def: 'A digital project folder that holds all of a project’s code and content. 169Pi/.github is one.' },
  { term: 'Fork', def: 'Your own personal copy of 169Pi’s folder, so you can make changes without touching the original.' },
  { term: 'Pull Request', short: 'PR', def: 'A polite request to add your changes back to 169Pi so they show up on their main page. Nothing happens until they approve it.' },
  { term: 'Commit', def: 'Saving a change. Each commit is a snapshot of what you edited, with a short note describing it.' },
  { term: 'Branch', def: 'A separate line of work. Your edits live on their own branch until the PR is merged.' },
  { term: 'Merge', def: 'When 169Pi accepts your PR and your entry becomes part of their real page.' },
  { term: 'README', def: 'The welcome page of a repo (README.md). Yours goes in profile/README.md.' },
  { term: 'SVG', def: 'A lightweight image made of text/shapes instead of pixels — it stays crisp at any size and you can make one right here, no drawing app needed.' },
  { term: 'Markdown', def: 'A simple way to format text with plain symbols (# for a heading, ** for bold). GitHub turns it into a nice-looking page.' },
];
const GLOSSARY_MAP = Object.fromEntries(
  GLOSSARY.flatMap((g) => {
    const entries = [[g.term.toLowerCase(), g]];
    if (g.short) entries.push([g.short.toLowerCase(), g]);
    return entries;
  })
);

// Inline jargon term: dotted underline + accessible tooltip on hover/focus.
function Term({ children, k }) {
  const key = (k || (typeof children === 'string' ? children : '')).toLowerCase();
  const g = GLOSSARY_MAP[key];
  if (!g) return <>{children}</>;
  return (
    <span className="term" tabIndex={0} role="note" aria-label={`${g.term}: ${g.def}`}>
      {children}
      <span className="term-tip" role="tooltip">
        <strong>{g.term}{g.short ? ` (${g.short})` : ''}</strong>
        {g.def}
      </span>
    </span>
  );
}

// Stylized "screenshot" of the relevant GitHub screen, with the exact button a
// beginner needs to click highlighted by a pulsing ring. Pure inline SVG so it
// stays crisp and needs no image assets.
function GhMock({ kind }) {
  const frame = (addr, children) => (
    <svg className="ghmock" viewBox="0 0 320 172" role="img" xmlns="http://www.w3.org/2000/svg">
      <rect x="0.5" y="0.5" width="319" height="171" rx="10" fill="#fff" stroke="#e4e0d6" />
      <rect x="0.5" y="0.5" width="319" height="30" rx="10" fill="#f3f1ea" />
      <rect x="0.5" y="20" width="319" height="11" fill="#f3f1ea" />
      <circle cx="16" cy="15" r="4" fill="#e06c5b" />
      <circle cx="30" cy="15" r="4" fill="#e8b84b" />
      <circle cx="44" cy="15" r="4" fill="#57b877" />
      <rect x="60" y="8" width="248" height="15" rx="7.5" fill="#fff" stroke="#e4e0d6" />
      <text x="70" y="19" fontSize="9" fill="#8a8578" fontFamily="ui-monospace, monospace">{addr}</text>
      {children}
    </svg>
  );
  const target = (x, y, w, h) => (
    <g>
      <rect className="mock-pulse" x={x - 3} y={y - 3} width={w + 6} height={h + 6} rx={(h + 6) / 2} fill="none" stroke="#1B7A6E" strokeWidth="2" />
    </g>
  );
  if (kind === 'signup') {
    return frame('github.com/signup', (
      <g>
        <text x="20" y="52" fontSize="11" fontWeight="700" fill="#171717">Create your account</text>
        <rect x="20" y="60" width="280" height="20" rx="5" fill="#fff" stroke="#d9d5cb" />
        <text x="27" y="73" fontSize="8" fill="#a8a396">Email</text>
        <rect x="20" y="86" width="280" height="20" rx="5" fill="#fff" stroke="#d9d5cb" />
        <text x="27" y="99" fontSize="8" fill="#a8a396">Password</text>
        <rect x="20" y="112" width="280" height="20" rx="5" fill="#fff" stroke="#d9d5cb" />
        <text x="27" y="125" fontSize="8" fill="#a8a396">Username</text>
        <rect x="20" y="142" width="280" height="22" rx="6" fill="#1f883d" />
        <text x="160" y="156" fontSize="9" fontWeight="700" fill="#fff" textAnchor="middle">Create account</text>
        {target(20, 142, 280, 22)}
      </g>
    ));
  }
  if (kind === 'fork') {
    return frame('github.com/169Pi/.github', (
      <g>
        <text x="20" y="56" fontSize="11" fontWeight="700" fill="#1B7A6E">169Pi / .github</text>
        <rect x="150" y="66" width="46" height="22" rx="6" fill="#f3f1ea" stroke="#d9d5cb" />
        <text x="173" y="80" fontSize="8" fill="#5c5850" textAnchor="middle">Watch</text>
        <rect x="202" y="66" width="46" height="22" rx="6" fill="#f3f1ea" stroke="#d9d5cb" />
        <text x="225" y="80" fontSize="8" fill="#5c5850" textAnchor="middle">★ Star</text>
        <rect x="254" y="66" width="46" height="22" rx="6" fill="#f3f1ea" stroke="#d9d5cb" />
        <text x="277" y="80" fontSize="8" fontWeight="700" fill="#171717" textAnchor="middle">⑂ Fork</text>
        {target(254, 66, 46, 22)}
        <rect x="20" y="104" width="280" height="52" rx="6" fill="#faf9f5" stroke="#eae7dd" />
        <text x="30" y="124" fontSize="8" fill="#a8a396">profile/README.md</text>
        <rect x="30" y="132" width="180" height="6" rx="3" fill="#e4e0d6" />
        <rect x="30" y="143" width="130" height="6" rx="3" fill="#e4e0d6" />
      </g>
    ));
  }
  if (kind === 'edit') {
    return frame('github.com/YOU/.github/profile/README.md', (
      <g>
        <rect x="20" y="46" width="280" height="24" rx="6" fill="#faf9f5" stroke="#eae7dd" />
        <text x="30" y="61" fontSize="8" fill="#5c5850" fontFamily="ui-monospace, monospace">profile/README.md</text>
        <rect x="268" y="50" width="24" height="16" rx="4" fill="#fff" stroke="#d9d5cb" />
        <path d="M274 62 l10 -10 3 3 -10 10 -4 1 1 -4z" fill="#5c5850" />
        {target(266, 48, 28, 20)}
        <text x="278" y="82" fontSize="7.5" fill="#1B7A6E" textAnchor="middle">Pencil = Edit</text>
        <rect x="20" y="92" width="280" height="66" rx="6" fill="#faf9f5" stroke="#eae7dd" />
        <rect x="30" y="104" width="200" height="6" rx="3" fill="#e4e0d6" />
        <rect x="30" y="118" width="240" height="6" rx="3" fill="#e4e0d6" />
        <rect x="30" y="132" width="160" height="6" rx="3" fill="#e4e0d6" />
      </g>
    ));
  }
  if (kind === 'commit') {
    return frame('github.com/YOU/.github  ·  editing', (
      <g>
        <rect x="20" y="44" width="280" height="60" rx="6" fill="#faf9f5" stroke="#eae7dd" />
        <text x="30" y="58" fontSize="8" fill="#a8a396" fontFamily="ui-monospace, monospace">## 🎨 Make this README yours</text>
        <rect x="30" y="66" width="150" height="6" rx="3" fill="#cfe6df" />
        <rect x="30" y="78" width="220" height="6" rx="3" fill="#cfe6df" />
        <rect x="30" y="90" width="120" height="6" rx="3" fill="#cfe6df" />
        <text x="20" y="122" fontSize="8" fill="#5c5850">Commit message</text>
        <rect x="20" y="128" width="180" height="20" rx="5" fill="#fff" stroke="#d9d5cb" />
        <rect x="210" y="128" width="90" height="22" rx="6" fill="#1f883d" />
        <text x="255" y="142" fontSize="8" fontWeight="700" fill="#fff" textAnchor="middle">Commit changes</text>
        {target(210, 128, 90, 22)}
      </g>
    ));
  }
  if (kind === 'pr') {
    return frame('github.com/169Pi/.github/compare', (
      <g>
        <text x="20" y="54" fontSize="10" fontWeight="700" fill="#171717">Comparing changes</text>
        <text x="20" y="70" fontSize="8" fill="#5c5850">base: 169Pi/.github  ←  compare: YOU/.github</text>
        <rect x="20" y="82" width="280" height="34" rx="6" fill="#eafaf0" stroke="#bfe6cf" />
        <text x="30" y="102" fontSize="8" fill="#1f883d">✓ Able to merge. These branches can be combined.</text>
        <rect x="20" y="128" width="130" height="24" rx="6" fill="#1f883d" />
        <text x="85" y="143" fontSize="8.5" fontWeight="700" fill="#fff" textAnchor="middle">Create pull request</text>
        {target(20, 128, 130, 24)}
      </g>
    ));
  }
  return null;
}

export default function Home() {
  const [done, setDone] = useState({});
  const [openId, setOpenId] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const [stars, setStars] = useState(null);
  const [contributorsCount, setContributorsCount] = useState(null);
  const [prsCount, setPrsCount] = useState(null);
  const [contributors, setContributors] = useState(null);
  const [statsRepo, setStatsRepo] = useState({ owner: '169Pi', repo: '.github' });
  const [starsRepoInfo, setStarsRepoInfo] = useState({ owner: '169Pi', repo: 'Alpie-Core' });

  const [user, setUser] = useState(null);
  const [ghStatus, setGhStatus] = useState(null);

  const [chat, setChat] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const chatRef = useRef(null);

  const [glossaryOpen, setGlossaryOpen] = useState(false);

  // Step 04 entry-image prompt generator (personal README "brick")
  const [entry, setEntry] = useState('');
  const [entryTouched, setEntryTouched] = useState(false);
  const [entryBusy, setEntryBusy] = useState(false);
  const [entryError, setEntryError] = useState('');
  const [copiedEntry, setCopiedEntry] = useState(false);

  const cd = useCountdown(NEXT_MERGE_DATE);
  const hereNow = usePresence();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.done === 'object') setDone(parsed.done);
        if (parsed && typeof parsed.openId !== 'undefined') setOpenId(parsed.openId);
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ done, openId })); } catch {}
  }, [done, openId, hydrated]);

  useEffect(() => {
    let cancelled = false;
    async function loadStats() {
      try {
        const r = await fetch('/api/github/stats', { cache: 'no-store' });
        if (!r.ok) { if (!cancelled) setContributors([]); return; }
        const j = await r.json();
        if (cancelled) return;
        if (j.stars !== null && j.stars !== undefined) setStars(j.stars);
        if (j.prsCount !== null && j.prsCount !== undefined) setPrsCount(j.prsCount);
        if (j.contributorsCount !== null && j.contributorsCount !== undefined) setContributorsCount(j.contributorsCount);
        setContributors(Array.isArray(j.contributors) ? j.contributors : []);
        if (j.owner && j.repo) setStatsRepo({ owner: j.owner, repo: j.repo });
        if (j.starsOwner && j.starsRepo) setStarsRepoInfo({ owner: j.starsOwner, repo: j.starsRepo });
      } catch {
        if (!cancelled) setContributors([]);
      }
    }
    loadStats();
    const t = setInterval(loadStats, 60000);
    return () => { cancelled = true; clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch('/api/auth/me', { cache: 'no-store' });
        const j = await r.json();
        if (!cancelled) setUser(j.user || null);
      } catch {
        if (!cancelled) setUser(null);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const refreshGhStatus = useCallback(async () => {
    try {
      const r = await fetch('/api/github/user-status', { cache: 'no-store' });
      const j = await r.json();
      setGhStatus(j);
      if (j && j.authenticated) {
        setDone((prev) => {
          const next = { ...prev };
          // Auto-check every step GitHub can verify for us, so the checklist
          // reflects real progress instead of relying on manual ticking.
          // Being signed in proves they have an account, so Step 0 is done.
          next.github = true;
          if (j.starred) next.star = true;
          if (j.forked) next.fork = true;
          if (j.openPr || j.mergedPr) next.pr = true;
          if (j.mergedPr) next.merged = true;
          return next;
        });
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!user) return;
    refreshGhStatus();
    const t = setInterval(refreshGhStatus, 45000);
    return () => clearInterval(t);
  }, [user, refreshGhStatus]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [chat]);

  const toggleDone = (id) => setDone((prev) => ({ ...prev, [id]: !prev[id] }));
  const toggleOpen = (id) => setOpenId((prev) => (prev === id ? null : id));

  async function sendChat(text) {
    const trimmed = (text ?? chatInput).trim();
    if (!trimmed || chatBusy) return;
    const nextMessages = [...chat, { role: 'user', content: trimmed }];
    setChat(nextMessages);
    setChatInput('');
    setChatBusy(true);
    try {
      const res = await fetch('/api/alpie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'chat', messages: nextMessages }),
      });
      const j = await res.json();
      if (!res.ok) {
        setChat((c) => [...c, { role: 'assistant', content: `Sorry — ${j.error || 'Alpie is unavailable right now.'}`, error: true }]);
      } else {
        setChat((c) => [...c, { role: 'assistant', content: j.content || '(no reply)' }]);
      }
    } catch (e) {
      setChat((c) => [...c, { role: 'assistant', content: 'Sorry — could not reach Alpie.', error: true }]);
    } finally {
      setChatBusy(false);
    }
  }

  async function logout() {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    setUser(null);
    setGhStatus(null);
  }

  async function copyText(text, setFlag) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      } catch {}
    }
    setFlag(true);
    setTimeout(() => setFlag(false), 1800);
  }

  async function generateEntryPrompt() {
    setEntryBusy(true);
    setEntryError('');
    const ask = `Write a single, ready-to-paste image-generation prompt (for tools like Midjourney, DALL·E or Ideogram) for a small square "brick" tile that I'll generate and add to the 169Pi open-source README contributor wall as my first open-source contribution during Preptember. Keep bracketed placeholders such as [your name], [your motif] and [your accent colour] so I can make it my own before generating. Reflect 169Pi's identity (an open-source AI lab building the best local & offline-first models out of India for the world). Keep it to one vivid but concrete paragraph and end with style and aspect-ratio tags. Return only the prompt text — keep the bracketed placeholders, no preamble.`;
    try {
      const res = await fetch('/api/alpie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'chat', messages: [{ role: 'user', content: ask }] }),
      });
      const j = await res.json();
      if (!res.ok) {
        setEntryError(j.error || 'Alpie is unavailable right now — the template below still works.');
      } else if (j.content) {
        setEntry(j.content.trim());
        setEntryTouched(true);
      }
    } catch {
      setEntryError('Could not reach Alpie — the template below still works.');
    } finally {
      setEntryBusy(false);
    }
  }

  const entryPrompt = entryTouched ? entry : defaultEntryPrompt();

  const total = STEPS.length;
  const count = STEPS.filter((s) => done[s.id]).length;
  const pct = Math.round((count / total) * 100);
  const complete = count === total;
  const statusLabel = complete ? 'first PR ready!' : `${total - count} to go`;

  const suggestedQs = [
    'What should I make?',
    'Explain forking',
    'Fix my PR title',
  ];

  return (
    <div className="page">
      {/* Sticky nav */}
      <header className="site-nav">
        <div className="nav-inner">
          <a href="#overview" className="nav-brand-link" aria-label="169Pi Preptember home">
            <span className="nav-logo">
              <img src="/alpie-logo.webp" alt="169Pi logo" style={{ width: 30, height: 30, objectFit: 'contain' }} />
            </span>
            <span className="nav-title">169Pi</span>
            <span className="nav-tag">Preptember · Road to Hacktoberfest</span>
          </a>

          <div className="nav-actions" style={{ marginLeft: 'auto' }}>
            <a href="/organizers" className="nav-link-organizers">For Organizers</a>
            <ThemeToggle />
            {hereNow !== null && (
              <span className="presence" aria-live="polite" title={`${hereNow} ${hereNow === 1 ? 'person' : 'people'} here right now`}>
                <span className="presence-dot" />
                <span className="presence-num">{hereNow}</span>
                <span className="presence-label" style={{ marginLeft: 2 }}>here now</span>
              </span>
            )}
            {user ? (
              <span className="auth-pill">
                {user.avatar ? <img src={user.avatar} alt={user.login} /> : null}
                <span>@{user.login}</span>
                <button className="logout" onClick={logout}>sign out</button>
              </span>
            ) : (
              <a href="/api/auth/github" className="auth-pill auth-pill-signin">
                <GithubMark />
                <span>Sign in<span className="hide-sm"> with GitHub</span></span>
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="wrap" id="overview">
        {/* Announcement strip */}
        <div className="ctxbar">
          <div className="ctxbar-main">
            <span className="ctxbar-tag"><span className="dot" />FIRST TIME? PERFECT</span>
            <span className="ctxbar-text">
              It&apos;s <strong>Preptember</strong> — the warm-up to Hacktoberfest. Beginner-friendly first open-source contribution with 169Pi. No experience needed — every step has a short guide, and you can ask Alpie if you get stuck.
            </span>
          </div>
          <span className="ctxbar-note">
            <span className="material-symbols-outlined">verified</span>
            Every step has a short guide
          </span>
        </div>

        {/* Hero */}
        <section className="hero section">
          <div className="hero-left">
            <div className="pill-pixel">
              <span className="sq" />PREPTEMBER 2026 · WARM-UP TO HACKTOBERFEST
            </div>
            <h1 className="hero-h">
              Get ready for Hacktoberfest<br />with <span className="accent">169Pi.</span>
            </h1>
            <p>
              Make your first open-source contribution before October — the easy way. <strong>Alpie-Core</strong> is 169pi&apos;s open-source AI reasoning model (32B params, 4-bit, built in India). Plant a flag on the <strong>169pi org profile</strong> — custom SVG art, an explanatory diagram, a benchmark visualization, or a runnable micro-demo — anything that showcases <em>you</em> reflecting something real about the model. Open a PR against <code>169Pi/.github</code> and we&apos;ll walk you through each step.
            </p>
            <div className="chips">
              <span className="chip"><span className="material-symbols-outlined i-emerald">check_circle</span>No experience needed</span>
              <span className="chip"><span className="material-symbols-outlined i-teal">schedule</span>~20 min flow</span>
              <span className="chip"><span className="material-symbols-outlined i-cyan">inventory_2</span>Real swag shipped</span>
              <span className="chip"><span className="material-symbols-outlined i-amber">bolt</span>100% in-browser</span>
            </div>
            <div className="hero-cta">
              <a href="#workflow" className="hbtn hbtn-primary">
                Start Your First PR<span className="material-symbols-outlined">arrow_forward</span>
              </a>
              <a href="#benchmarks" className="hbtn hbtn-ghost">
                <span className="material-symbols-outlined i-teal">analytics</span>Explore Alpie-Core
              </a>
              <a href={DISCORD_URL} target="_blank" rel="noreferrer" className="hbtn hbtn-discord">
                <span className="material-symbols-outlined">group</span>Join Discord
              </a>
            </div>
          </div>

          {/* Right rail: live stats + countdown */}
          <div className="hero-rail">
            <div className="stats">
              <div className="stats-header">
                <div className="stats-header-l">
                  <span className="live-dot" />
                  <span className="small-label">LIVE FROM {statsRepo.owner.toUpperCase()}/{statsRepo.repo.toUpperCase()}</span>
                </div>
                <span className="material-symbols-outlined">terminal</span>
              </div>
              <div className="stats-grid">
                <div className="stat-tile">
                  <span className="stat-num gold"><span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>{stars ?? '—'}</span>
                  <span className="stat-cap">Stars</span>
                </div>
                <div className="stat-tile">
                  <span className="stat-num cyan">{prsCount ?? '—'}</span>
                  <span className="stat-cap">PRs</span>
                </div>
                <div className="stat-tile">
                  <span className="stat-num emerald">{contributorsCount ?? '—'}</span>
                  <span className="stat-cap">Contributors</span>
                </div>
              </div>
              <p className="stats-note">
                Every star, PR and name here is someone who took part. <strong>Add yours</strong> and watch it climb.
              </p>
              <div className="stats-cta">
                <a href={`https://github.com/${OWNER}/${REPO}`} target="_blank" rel="noreferrer" className="btn btn-teal">
                  <span className="material-symbols-outlined">grade</span>Star Repo
                </a>
                <a href={DISCORD_URL} target="_blank" rel="noreferrer" className="btn btn-dark">
                  <span className="material-symbols-outlined">forum</span>Discord
                </a>
              </div>
            </div>

            <div className="countdown-card">
              <div className="countdown-top">
                <span className="countdown-label">
                  <span className="material-symbols-outlined">timer</span>Next Merge Batch
                </span>
                <span className="countdown-badge">ACTIVE CYCLE</span>
              </div>
              <div className="countdown-clockwrap">
                <div className="countdown-unit">
                  <span className="countdown-days">{cd.days === '—' ? '—' : pad(cd.days)}</span>
                  <span className="countdown-unit-cap">DAYS</span>
                </div>
                <span className="countdown-colon">:</span>
                <div className="countdown-unit">
                  <span className="countdown-clock">{cd.clock}</span>
                  <span className="countdown-unit-cap">HRS : MIN : SEC</span>
                </div>
              </div>
              <div className="countdown-merge">
                <span>Next review ceremony:</span>
                <strong>{NEXT_MERGE_DATE}</strong>
              </div>
            </div>
          </div>
        </section>

        {/* Benchmarks + Try Alpie */}
        <section className="card bench-section section" id="benchmarks">
          <div className="bench-head">
            <div>
              <span className="eyebrow"><span className="material-symbols-outlined">memory</span>Alpie-Core, in numbers</span>
              <h2>The technical bits, if you&apos;re curious</h2>
            </div>
            <div className="bench-head-meta">32B params · 4-bit quantized · Built in India for edge &amp; desktop</div>
          </div>

          <details className="benchmarks" aria-label="Alpie-Core benchmarks">
            <summary className="benchmarks-summary">
              <span className="benchmarks-summary-l">
                <span className="emoji" aria-hidden="true">🤓</span>
                <span className="benchmarks-label">[λ] Stats for Nerds</span>
                <span className="benchmarks-hint">GSM8K, MMLU, SWE-Bench, VRAM</span>
              </span>
              <span className="benchmarks-summary-r">
                <span className="benchmarks-optional">Optional deep-dive</span>
                <span className="benchmarks-chevron" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                </span>
              </span>
            </summary>
            <div className="benchmarks-grid">
              <div className="bench"><span className="bench-top">GSM8K Reasoning</span><span className="bench-num c-teal">92.75%</span><span className="bench-cap">Math &amp; Logic Chain</span></div>
              <div className="bench"><span className="bench-top">MMLU Multi-Task</span><span className="bench-num c-cyan">81.28%</span><span className="bench-cap">General Knowledge</span></div>
              <div className="bench"><span className="bench-top">SWE-Bench</span><span className="bench-num c-emerald">57.8%</span><span className="bench-cap">Code &amp; Debug Verified</span></div>
              <div className="bench"><span className="bench-top">Context Window</span><span className="bench-num c-primary">65K</span><span className="bench-cap">Tokens Attention</span></div>
              <div className="bench"><span className="bench-top">VRAM Requirement</span><span className="bench-num c-slate">~16 GB</span><span className="bench-cap">Consumer RTX ready</span></div>
            </div>
          </details>

          {/* Try Alpie-Core */}
          <div className="try-card" id="run-alpie">
            <div className="try-head">
              <div>
                <span className="eyebrow" style={{ color: 'var(--teal-deep)' }}>Try Alpie-Core</span>
                <h3 className="try-title">Run the model before you draw on it.</h3>
                <p className="try-sub">Easiest way in — just open it in your browser, no setup. Developers can grab the weights below.</p>
              </div>
              <a href="https://playground.169pi.ai/dashboard/documents" target="_blank" rel="noreferrer" className="try-docs">Read the docs ↗</a>
            </div>

            <div className="try-primary">
              <a href="https://alpie.ai" target="_blank" rel="noreferrer" className="try-btn try-btn-primary try-btn-alpie">
                <span className="try-btn-l">
                  <span className="try-btn-icon" aria-hidden="true">
                    <img src="/alpie-logo.webp" alt="" style={{ width: 24, height: 24, objectFit: 'contain' }} />
                  </span>
                  <span className="try-btn-body">
                    <span className="try-btn-name">Chat with Alpie</span>
                    <span className="try-btn-sub">alpie.ai · no setup, just try it</span>
                  </span>
                </span>
                <span className="try-btn-arrow" aria-hidden="true"><span className="material-symbols-outlined">arrow_forward</span></span>
              </a>
              <a href="https://playground.169pi.ai/dashboard" target="_blank" rel="noreferrer" className="try-btn try-btn-primary try-btn-playground">
                <span className="try-btn-l">
                  <span className="try-btn-icon" aria-hidden="true">
                    <span className="material-symbols-outlined i-cyanfix">play_circle</span>
                  </span>
                  <span className="try-btn-body">
                    <span className="try-btn-name">Open the Playground</span>
                    <span className="try-btn-sub">playground.169pi.ai</span>
                  </span>
                </span>
                <span className="try-btn-arrow" aria-hidden="true"><span className="material-symbols-outlined">arrow_forward</span></span>
              </a>
            </div>

            <details className="try-more">
              <summary className="try-more-summary">
                <span>More ways to run it — for developers</span>
                <span className="try-more-chevron" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                </span>
              </summary>
              <div className="try-buttons">
                <a href="https://huggingface.co/169Pi/Alpie-Core" target="_blank" rel="noreferrer" className="try-dev">
                  <span className="try-dev-l">
                    <span className="try-dev-emoji" aria-hidden="true">🤗</span>
                    <span className="try-dev-body">
                      <span className="try-dev-name">Hugging Face</span>
                      <span className="try-dev-sub">169Pi/Alpie-Core</span>
                    </span>
                  </span>
                  <span className="try-dev-ext"><span className="material-symbols-outlined">open_in_new</span></span>
                </a>
                <a href="https://ollama.com/169pi" target="_blank" rel="noreferrer" className="try-dev">
                  <span className="try-dev-l">
                    <span className="try-dev-emoji" aria-hidden="true">🦙</span>
                    <span className="try-dev-body">
                      <span className="try-dev-name">Ollama CLI</span>
                      <span className="try-dev-sub">ollama run 169pi</span>
                    </span>
                  </span>
                  <span className="try-dev-ext"><span className="material-symbols-outlined">terminal</span></span>
                </a>
                <a href="https://www.kaggle.com/169pi" target="_blank" rel="noreferrer" className="try-dev">
                  <span className="try-dev-l">
                    <span className="try-dev-icon" aria-hidden="true"><span className="material-symbols-outlined">analytics</span></span>
                    <span className="try-dev-body">
                      <span className="try-dev-name">Kaggle Notebooks</span>
                      <span className="try-dev-sub">notebooks &amp; data</span>
                    </span>
                  </span>
                  <span className="try-dev-ext"><span className="material-symbols-outlined">open_in_new</span></span>
                </a>
              </div>
            </details>
          </div>
        </section>

        {/* Host a session */}
        <section className="section" id="organizers">
          <div className="organize-card">
            <div className="organize-left">
              <span className="organize-eyebrow">RUNNING A SESSION?</span>
              <h3 className="organize-title">Host Preptember for your community.</h3>
              <p className="organize-sub">
                Meetup, campus club or Discord — bring people through their first contribution together.
                The <strong>For Organizers</strong> page has a ready-to-run instructor-led agenda, a Community Canvas
                for co-branded social posts, and prompt templates for featuring your community.
              </p>
            </div>
            <div className="organize-actions">
              <a href="/organizers" className="organize-btn">
                Open the organizer kit<span className="material-symbols-outlined">arrow_forward</span>
              </a>
              <a href={DISCORD_URL} target="_blank" rel="noreferrer" className="organize-link">
                Coordinate in Discord ↗
              </a>
            </div>
          </div>
        </section>

        {/* Workflow: steps + leaderboard */}
        <section className="workflow section" id="workflow">
          {/* Steps */}
          <div className="steps-col">
            <div className="card steps-card">
              <div className="steps-head">
                <div>
                  <h2>Your first contribution, step by step</h2>
                  <p>
                    Hit <strong>Help</strong> on any step for a short how-to. Check it off once you&apos;ve done it on GitHub
                    {user ? ' — starring, forking and opening your PR are auto-checked from GitHub.' : ' — sign in with GitHub and the star, fork and PR steps get auto-checked for you.'}
                  </p>
                </div>
                <div className="steps-progress">
                  <span className="progress-cap">{count}/{total} completed</span>
                  <span className="progress-sub">{statusLabel}</span>
                </div>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${pct}%`, background: complete ? 'var(--amber)' : 'var(--emerald)' }} />
              </div>

              <div className="noterminal">
                <span className="noterminal-icon" aria-hidden="true">🖱️</span>
                <span className="noterminal-text">
                  <strong>No coding, no terminal, no installs.</strong> You do every step right here in your web browser —
                  click <Term k="fork">Fork</Term>, edit a file, and open a <Term k="pull request">pull request</Term> on GitHub&apos;s website. That&apos;s the whole workflow.
                </span>
              </div>

              <div className="glossary">
                <button type="button" className="glossary-toggle" onClick={() => setGlossaryOpen((v) => !v)} aria-expanded={glossaryOpen}>
                  <span className="glossary-toggle-label">📖 New words? Open the jargon-buster</span>
                  <span className={`glossary-chevron ${glossaryOpen ? 'open' : ''}`} aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                  </span>
                </button>
                {glossaryOpen && (
                  <dl className="glossary-list">
                    {GLOSSARY.map((g) => (
                      <div key={g.term} className="glossary-item">
                        <dt>{g.term}{g.short ? <span className="glossary-alias"> ({g.short})</span> : null}</dt>
                        <dd>{g.def}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>

              <div className="steps-list">
                {STEPS.map((s) => {
                  const isDone = !!done[s.id];
                  const isOpen = !!s.help && openId === s.id;
                  const cardClass = ['step', isDone ? 'step-done' : '', isOpen ? 'step-open' : ''].filter(Boolean).join(' ');
                  return (
                    <div key={s.id} className={cardClass}>
                      <div className="step-row">
                        <button
                          type="button"
                          onClick={() => toggleDone(s.id)}
                          aria-label={`Mark step ${s.tag} ${isDone ? 'not done' : 'done'}`}
                          className={`checkbox ${isDone ? 'checkbox-done' : ''}`}
                        >
                          {isDone && (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                        <span className="step-tag">{s.tag}</span>
                        {s.help ? (
                          <button type="button" onClick={() => toggleOpen(s.id)} className="step-body-btn">
                            <span style={{ flexGrow: 1 }}>
                              <span className={`step-title ${isDone ? 'step-title-done' : ''}`}>{s.title}</span>
                              <span className="step-desc">{s.desc}</span>
                            </span>
                          </button>
                        ) : (
                          <span className="step-body-static">
                            <span className={`step-title ${isDone ? 'step-title-done' : ''}`}>{s.title}</span>
                            <span className="step-desc">{s.desc}</span>
                          </span>
                        )}
                        {s.id === 'add' && (
                          <span className="cta-pill-static stage"><span className="material-symbols-outlined">palette</span>Creative stage</span>
                        )}
                        {s.id === 'merged' && (
                          <span className="cta-pill-static swag"><span className="material-symbols-outlined">celebration</span>Swag Unlocked</span>
                        )}
                        {s.ctaText && (
                          <a
                            href={s.ctaHref}
                            target="_blank"
                            rel="noreferrer"
                            className={`cta-pill ${s.id === 'star' || s.id === 'review' ? 'cta-pill-slate' : ''} ${s.id === 'discord' ? 'cta-pill-discord' : ''}`}
                          >
                            {s.ctaText}
                          </a>
                        )}
                        {s.help && (
                          <button
                            type="button"
                            onClick={() => toggleOpen(s.id)}
                            className={`help-btn ${isOpen ? 'open' : ''}`}
                            aria-label={`${isOpen ? 'Hide' : 'Show'} help for step ${s.tag}`}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{isOpen ? 'close' : 'help'}</span>
                          </button>
                        )}
                      </div>
                      {isOpen && (
                        <div className="step-guide">
                          <div>{renderGuide(s.guide)}</div>
                          {s.id === 'add' && (
                            <div className="prompt-box">
                              <div className="prompt-box-head">
                                <span className="prompt-box-title"><span className="material-symbols-outlined">palette</span>Make your entry image</span>
                                <div className="prompt-box-actions">
                                  <button type="button" className="btn-ghost btn-sm" onClick={generateEntryPrompt} disabled={entryBusy}>
                                    <span className="material-symbols-outlined">{entryBusy ? 'hourglass_top' : 'auto_awesome'}</span>
                                    {entryBusy ? 'Asking Alpie…' : 'Tailor with Alpie'}
                                  </button>
                                  <button type="button" className="btn-solid btn-sm" onClick={() => copyText(entryPrompt, setCopiedEntry)}>
                                    <span className="material-symbols-outlined">content_copy</span>{copiedEntry ? 'Copied!' : 'Copy prompt'}
                                  </button>
                                </div>
                              </div>
                              <textarea
                                className="prompt-text"
                                value={entryPrompt}
                                onChange={(e) => { setEntry(e.target.value); setEntryTouched(true); }}
                                rows={7}
                                aria-label="Entry image generation prompt"
                              />
                              {entryError && <span className="canvas-error">{entryError}</span>}
                              <span className="canvas-help">
                                Fill in the [bracketed placeholders] to make it yours, tailor it with Alpie, then generate the image on a tool like Midjourney, DALL·E or Ideogram — and paste the result into your entry below.
                              </span>
                            </div>
                          )}
                          {s.cmd && <div className="cmd">{s.cmd}</div>}
                          {s.mock && (
                            <div className="step-mock">
                              <GhMock kind={s.mock} />
                              <span className="step-mock-cap">what you&apos;ll see on GitHub — the highlighted button is the one to click</span>
                            </div>
                          )}
                          {s.webSteps && (
                            <div className="webflow">
                              <div className="webflow-label">Do it in your browser</div>
                              <ol>
                                {s.webSteps.map((w) => <li key={w}>{w}</li>)}
                              </ol>
                            </div>
                          )}
                          {s.rules && (
                            <div className="rules">
                              <div className="rules-label">Before you PR</div>
                              <ul>
                                {s.rules.map((r) => <li key={r}>{r}</li>)}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right rail: leaderboard + support */}
          <div className="right-col">
            <div className="card leaderboard-card">
              <div className="leaderboard-head">
                <div>
                  <span className="eyebrow"><span className="material-symbols-outlined">military_tech</span>Hall of Fame</span>
                  <div className="leaderboard-title">Contributor leaderboard</div>
                  <div className="leaderboard-sub">
                    {contributorsCount ?? '—'} people opened PRs to {statsRepo.owner}/{statsRepo.repo}
                  </div>
                </div>
                <a
                  href={`https://github.com/${statsRepo.owner}/${statsRepo.repo}/pulls?q=is%3Apr`}
                  target="_blank"
                  rel="noreferrer"
                  className="leaderboard-all"
                >
                  See all →
                </a>
              </div>
              <ol className="leaderboard-list">
                {contributors === null && (
                  <li className="leaderboard-empty">Loading contributors…</li>
                )}
                {contributors && contributors.length === 0 && (
                  <li className="leaderboard-empty">
                    No contributors yet — <strong>be the first</strong>.
                  </li>
                )}
                {(contributors || []).slice(0, 10).map((c, i) => {
                  const rank = i + 1;
                  const rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : '';
                  return (
                    <li key={c.login} className={`leaderboard-row ${rank <= 3 ? 'top3' : ''}`}>
                      <a
                        href={c.href}
                        target="_blank"
                        rel="noreferrer"
                        className="leaderboard-user"
                      >
                        <span className={`leaderboard-rank ${rankClass}`}>{rank}</span>
                        {c.avatar ? (
                          <img src={c.avatar} alt="" className="leaderboard-avatar" />
                        ) : (
                          <span
                            className="leaderboard-avatar"
                            style={{ background: initialsColor(c.login), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}
                          >
                            {c.login.slice(0, 1).toUpperCase()}
                          </span>
                        )}
                        <span className="leaderboard-login">@{c.login}</span>
                      </a>
                    </li>
                  );
                })}
              </ol>
              <a
                href={`https://github.com/${PROFILE_OWNER}/${PROFILE_REPO}/compare`}
                target="_blank"
                rel="noreferrer"
                className="leaderboard-submit"
              >
                <span className="material-symbols-outlined">add_circle</span>
                Submit PR &amp; claim your spot
              </a>
            </div>

            <div className="card support-card">
              <span className="support-icon"><span className="material-symbols-outlined">support_agent</span></span>
              <div className="support-body">
                <span className="support-title">Need a quick review?</span>
                <span className="support-sub">Ping maintainers anytime on Discord with your PR link — friendly feedback, no gatekeeping.</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Floating Alpie chat */}
      <div className={`alpie-float ${chatOpen ? 'open' : ''}`}>
        {chatOpen && (
          <div className="alpie-panel">
            <div className="alpie-head">
              <div className="alpie-avatar">
                <img src="/alpie-logo.webp" alt="Alpie" style={{ width: 22, height: 22, objectFit: 'contain' }} />
              </div>
              <div style={{ flexGrow: 1 }}>
                <div className="alpie-title">Ask Alpie</div>
                <div className="alpie-sub">stuck? the model itself can help</div>
              </div>
              <button
                type="button"
                aria-label="Close Alpie chat"
                className="alpie-close"
                onClick={() => setChatOpen(false)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            {chat.length > 0 && (
              <div className="alpie-thread" ref={chatRef}>
                {chat.map((m, i) => (
                  <div key={i} className={`alpie-msg ${m.role} ${m.error ? 'error' : ''}`}>
                    {m.content}
                  </div>
                ))}
                {chatBusy && <div className="alpie-msg assistant" style={{ opacity: 0.7 }}>Alpie is thinking…</div>}
              </div>
            )}

            <div className="alpie-input-row">
              <input
                type="text"
                aria-label="Ask Alpie a question"
                placeholder="What's a fork? How do I open a PR?"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') sendChat(); }}
                className="alpie-input"
                disabled={chatBusy}
              />
              <button
                type="button"
                aria-label="Send question to Alpie"
                className="alpie-send"
                onClick={() => sendChat()}
                disabled={chatBusy}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
            </div>

            <div className="alpie-suggestions">
              {suggestedQs.map((q) => (
                <button key={q} type="button" className="alpie-suggestion" onClick={() => sendChat(q)} disabled={chatBusy}>
                  {q}
                </button>
              ))}
            </div>
            <div className="alpie-foot">
              Answers come from Alpie-Core, right here — deeper docs at{' '}
              <a href="https://playground.169pi.ai/dashboard/documents" target="_blank" rel="noreferrer">playground.169pi.ai</a>{' '}
              or try the model at{' '}
              <a href="https://alpie.ai" target="_blank" rel="noreferrer">alpie.ai</a>.
            </div>
          </div>
        )}
        {!chatOpen && (
          <button
            type="button"
            aria-label="Open Alpie chat"
            className="alpie-fab"
            onClick={() => setChatOpen(true)}
          >
            <span className="fab-dot" aria-hidden="true" />
            <img src="/alpie-logo.webp" alt="" style={{ width: 22, height: 22, objectFit: 'contain' }} />
            <span>Ask Alpie</span>
          </button>
        )}
      </div>

      {/* Footer */}
      <SiteFooter />
    </div>
  );
}
