'use client';

// Shared site chrome (nav, theme switcher, GitHub mark, footer) used by every
// page so the header and footer never drift between them.

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { usePresence } from '../../lib/usePresence';

const OWNER = process.env.NEXT_PUBLIC_GITHUB_OWNER || '169Pi';
const REPO = process.env.NEXT_PUBLIC_GITHUB_REPO || 'Alpie-Core';
const DISCORD_URL = process.env.NEXT_PUBLIC_DISCORD_URL || 'https://discord.gg/QqkrMmvt4';

const THEME_KEY = 'preptember.theme';
function applyTheme(pref) {
  try {
    const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const resolved = pref === 'system' ? (sysDark ? 'dark' : 'light') : pref;
    document.documentElement.setAttribute('data-theme', resolved);
  } catch {}
}

const THEME_OPTIONS = [
  {
    id: 'light', label: 'Light',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 2v2.5M12 19.5V22M4.5 4.5l1.8 1.8M17.7 17.7l1.8 1.8M2 12h2.5M19.5 12H22M4.5 19.5l1.8-1.8M17.7 6.3l1.8-1.8" />
      </svg>
    ),
  },
  {
    id: 'system', label: 'System',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8M12 16v4" />
      </svg>
    ),
  },
  {
    id: 'dark', label: 'Dark',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
    ),
  },
];

export function ThemeToggle() {
  const [pref, setPref] = useState('system');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let p = 'system';
    try { p = localStorage.getItem(THEME_KEY) || 'system'; } catch {}
    setPref(p);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    applyTheme(pref);
    try { localStorage.setItem(THEME_KEY, pref); } catch {}
    if (pref !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [pref, mounted]);

  return (
    <div className="theme-toggle" role="radiogroup" aria-label="Color theme">
      {THEME_OPTIONS.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={mounted && pref === o.id}
          aria-label={`${o.label} theme`}
          title={`${o.label} theme`}
          className={mounted && pref === o.id ? 'active' : ''}
          onClick={() => setPref(o.id)}
        >
          {o.icon}
        </button>
      ))}
    </div>
  );
}

// GitHub brand mark, used in the sign-in pill.
export const GithubMark = (props) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.1.78-.25.78-.55v-2.1c-3.2.7-3.87-1.36-3.87-1.36-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.19-3.08-.12-.3-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.06.74.8 1.19 1.83 1.19 3.08 0 4.41-2.7 5.38-5.27 5.67.41.35.77 1.05.77 2.13v3.16c0 .31.21.66.79.55A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
  </svg>
);

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/leaderboard', label: 'Clubs Leaderboard' },
  { href: '/organizers', label: 'For Organizers' },
];

// Sticky site nav. Pages that already track the signed-in user (the landing
// page) pass `user` + `onLogout`; everywhere else the nav loads it itself.
export function SiteNav({ user: userProp, onLogout }) {
  const pathname = usePathname();
  const hereNow = usePresence();
  const controlled = userProp !== undefined;
  const [ownUser, setOwnUser] = useState(null);

  useEffect(() => {
    if (controlled) return;
    let cancelled = false;
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => { if (!cancelled) setOwnUser(j.user || null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [controlled]);

  const user = controlled ? userProp : ownUser;

  async function logout() {
    if (onLogout) return onLogout();
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    setOwnUser(null);
  }

  return (
    <header className="site-nav">
      <div className="nav-inner">
        <a href="/" className="nav-brand-link" aria-label="169Pi Preptember home">
          <span className="nav-logo">
            <img src="/alpie-logo.webp" alt="169Pi logo" style={{ width: 30, height: 30, objectFit: 'contain' }} />
          </span>
          <span className="nav-title">169Pi</span>
          <span className="nav-tag">Preptember 2026</span>
        </a>

        <nav className="nav-links" aria-label="Site">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={`nav-link${pathname === l.href ? ' active' : ''}`}
              aria-current={pathname === l.href ? 'page' : undefined}
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="nav-actions">
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
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="footer-brand-row">
              <img src="/alpie-logo.webp" alt="169Pi logo" style={{ width: 24, height: 24, objectFit: 'contain' }} />
              <span className="footer-brand-name">169Pi Preptember</span>
            </div>
            <p className="footer-blurb">
              Built for Preptember 2026 — an open warm-up and companion to Hacktoberfest. Empowering first-time open-source builders with guided workflows.
            </p>
          </div>
          <div className="footer-col">
            <span className="footer-col-title">Resources</span>
            <div className="footer-links">
              <a href={`https://github.com/${OWNER}/${REPO}`} target="_blank" rel="noreferrer">Alpie-Core GitHub</a>
              <a href="https://huggingface.co/169Pi/Alpie-Core" target="_blank" rel="noreferrer">Hugging Face Weights</a>
              <a href="https://playground.169pi.ai/dashboard" target="_blank" rel="noreferrer">Web Playground</a>
              <a href="https://www.kaggle.com/169pi" target="_blank" rel="noreferrer">Kaggle Notebooks</a>
            </div>
          </div>
          <div className="footer-col">
            <span className="footer-col-title">Community</span>
            <div className="footer-links">
              <a href={DISCORD_URL} target="_blank" rel="noreferrer">Discord Server</a>
              <a href="/leaderboard">Clubs Leaderboard</a>
              <a href="/organizers">For Organizers</a>
              <a href="https://github.com/kindavishal/169pi" target="_blank" rel="noreferrer">Source Repository</a>
            </div>
          </div>
        </div>
        <div className="footer-bar">
          <span>Built by <a className="strong" href="https://github.com/kindavishal/169pi" target="_blank" rel="noreferrer">@kindavishal</a> for Preptember 2026 · unofficial companion to Hacktoberfest</span>
          <a href="https://github.com/kindavishal/169pi" target="_blank" rel="noreferrer">github.com/kindavishal/169pi</a>
        </div>
      </div>
    </footer>
  );
}
