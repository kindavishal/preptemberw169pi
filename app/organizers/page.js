'use client';

import { useMemo, useRef, useState } from 'react';
import { GithubMark, SiteFooter, ThemeToggle } from '../_components/chrome';
import { MARK_169PI } from './logo';

const OWNER = process.env.NEXT_PUBLIC_GITHUB_OWNER || '169Pi';
const REPO = process.env.NEXT_PUBLIC_GITHUB_REPO || 'Alpie-Core';
const PROFILE_OWNER = process.env.NEXT_PUBLIC_GITHUB_PROFILE_OWNER || '169Pi';
const PROFILE_REPO = process.env.NEXT_PUBLIC_GITHUB_PROFILE_REPO || '.github';
const DISCORD_URL = process.env.NEXT_PUBLIC_DISCORD_URL || 'https://discord.gg/QqkrMmvt4';

// ── Instructor-led workshop curriculum ────────────────────────────
// Mirrors the website flow: Context → Setup → Creation → Submission.
const CURRICULUM = [
  {
    phase: 'Context',
    duration: '10 min',
    organizer:
      "Introduce 169Pi's Alpie-Core — a 32B-parameter, 4-bit open reasoning model built in India — and the goal for the session: everyone lands their first open-source contribution.",
    attendee: 'Sign in to GitHub and authenticate on the Preptember website.',
    icon: 'campaign',
  },
  {
    phase: 'Setup',
    duration: '10 min',
    organizer:
      "Walk through the website's 7-step checklist together — starring the 169Pi/Alpie-Core repo and joining the Discord as a group.",
    attendee: 'Complete steps 1–3 on the checklist (account, star, Discord).',
    icon: 'checklist',
  },
  {
    phase: 'Creation',
    duration: '25 min',
    organizer:
      'Guide attendees through generating or drawing their custom entry — SVG art, an explanatory diagram, or a runnable micro-demo.',
    attendee: 'Draw or generate their entry — SVG art, a diagram, or a runnable micro-demo.',
    icon: 'palette',
  },
  {
    phase: 'Submission',
    duration: '15 min',
    organizer:
      'Screen-share the 5-step CONTRIBUTING guide for adding an entry to the profile/README.md wall.',
    attendee: 'Open a Pull Request targeting the @169pi — the first brick 🧱 section.',
    icon: 'merge',
  },
];

// ── Community Canvas: one design, two shareable sizes ─────────────
// Both sizes render from the same fields, so editing once updates both.
const SIZES = [
  { id: 'wide', label: 'LinkedIn & X', hint: '1200 × 630 · landscape', w: 1200, h: 630 },
  { id: 'story', label: 'Instagram Story', hint: '1080 × 1920 · vertical', w: 1080, h: 1920 },
];

function esc(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const SANS = "'Space Grotesk', system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
const MONO = "'Space Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

// One co-branded design, rendered at whichever size is asked for. Both sizes
// share the same message, so editing the fields updates both. Fully
// self-contained (no external assets/scripts) — safe to rasterize to PNG.
function buildSvg(size, { community, logo }) {
  const name = (community || 'Your Community').trim();

  if (size === 'story') {
    // Instagram Story — 1080 × 1920 (9:16)
    const nameSize = name.length > 20 ? 68 : name.length > 13 ? 92 : 116;
    const logoMarkup = logo
      ? `\n  <image href="${logo}" x="852" y="150" width="132" height="104" preserveAspectRatio="xMidYMid meet"/>`
      : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920" width="1080" height="1920" role="img" aria-label="${esc(name)} × 169Pi for Open Source — #GoodFirstAlpie">
  <defs>
    <linearGradient id="ac-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4edea3"/><stop offset="1" stop-color="#4cd7f6"/></linearGradient>
    <pattern id="ac-dots" width="46" height="46" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="2.4" fill="#12351f"/></pattern>
  </defs>
  <rect width="1080" height="1920" fill="#0D1117"/>
  <rect width="1080" height="1920" fill="url(#ac-dots)" opacity="0.45"/>
  <rect x="40" y="40" width="1000" height="1840" rx="34" fill="none" stroke="#1E3835" stroke-width="2"/>
  <image href="${MARK_169PI}" x="96" y="150" width="76" height="76" preserveAspectRatio="xMidYMid meet"/>
  <text x="192" y="186" font-family="${MONO}" font-size="28" font-weight="700" fill="#4edea3" letter-spacing="2">169PI</text>
  <text x="192" y="224" font-family="${MONO}" font-size="20" fill="#7e8ea3">built in India</text>
  <text x="96" y="760" font-family="${MONO}" font-size="30" fill="#4cd7f6" letter-spacing="5">PREPTEMBER · OPEN SOURCE</text>
  <text x="96" y="900" font-family="${SANS}" font-size="${nameSize}" font-weight="700" fill="url(#ac-grad)">${esc(name)}</text>
  <text x="96" y="988" font-family="${SANS}" font-size="52" font-weight="700" fill="#d4e4fa">× 169Pi</text>
  <text x="96" y="1052" font-family="${MONO}" font-size="30" fill="#94a3b8">for Open Source</text>
  <rect x="96" y="1180" width="888" height="286" rx="24" fill="#0c1a29" stroke="#1b3147" stroke-width="2"/>
  <text x="140" y="1272" font-family="${SANS}" font-size="38" fill="#c3d3e8">Make your first contribution</text>
  <text x="140" y="1324" font-family="${SANS}" font-size="38" fill="#c3d3e8">with</text>
  <text x="140" y="1410" font-family="${SANS}" font-size="66" font-weight="700" fill="#10B981">#GoodFirstAlpie</text>
  <line x1="96" y1="1760" x2="984" y2="1760" stroke="#1E3835" stroke-width="2"/>
  <text x="96" y="1826" font-family="${MONO}" font-size="26" fill="#4edea3" letter-spacing="1">Preptember · Road to Hacktoberfest 🧱</text>${logoMarkup}
</svg>`;
  }

  // LinkedIn & X — 1200 × 630 (default)
  const nameSize = name.length > 26 ? 46 : name.length > 17 ? 60 : 76;
  const logoMarkup = logo
    ? `\n  <image href="${logo}" x="1024" y="60" width="112" height="88" preserveAspectRatio="xMidYMid meet"/>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630" role="img" aria-label="${esc(name)} × 169Pi for Open Source — #GoodFirstAlpie">
  <defs>
    <linearGradient id="ac-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4edea3"/><stop offset="1" stop-color="#0284c7"/></linearGradient>
    <pattern id="ac-dots" width="44" height="44" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="2.4" fill="#12351f"/></pattern>
  </defs>
  <rect width="1200" height="630" fill="#0D1117"/>
  <rect width="1200" height="630" fill="url(#ac-dots)" opacity="0.45"/>
  <rect x="28" y="28" width="1144" height="574" rx="28" fill="none" stroke="#1E3835" stroke-width="2"/>
  <image href="${MARK_169PI}" x="72" y="66" width="64" height="64" preserveAspectRatio="xMidYMid meet"/>
  <text x="150" y="98" font-family="${MONO}" font-size="21" font-weight="700" fill="#4edea3" letter-spacing="2">169PI</text>
  <text x="150" y="122" font-family="${MONO}" font-size="15" fill="#7e8ea3">Preptember · Open Source</text>
  <text x="72" y="280" font-family="${SANS}" font-size="${nameSize}" font-weight="700" fill="url(#ac-grad)">${esc(name)}<tspan font-family="${SANS}" fill="#d4e4fa"> × 169Pi</tspan></text>
  <text x="72" y="330" font-family="${MONO}" font-size="24" fill="#4cd7f6" letter-spacing="2">for Open Source</text>
  <text x="72" y="420" font-family="${SANS}" font-size="30" fill="#c3d3e8">Make your first contribution with</text>
  <text x="72" y="478" font-family="${SANS}" font-size="52" font-weight="700" fill="#10B981">#GoodFirstAlpie</text>
  <line x1="72" y1="536" x2="1128" y2="536" stroke="#1E3835" stroke-width="2"/>
  <text x="72" y="586" font-family="${MONO}" font-size="20" fill="#4edea3" letter-spacing="1">Preptember · Road to Hacktoberfest 🧱</text>${logoMarkup}
</svg>`;
}

// Default, ready-to-paste social caption for the post.
function defaultCaption(community) {
  const name = (community || 'Our community').trim() || 'Our community';
  return `🚀 ${name} × 169Pi for Open Source!

📍 [Add your community name, date, venue & sign-up link here]

We're making our first open-source contribution with 169Pi — an open-source AI lab building the best local & offline first models out of India for the world! Come build with us.

🧱 Make your first contribution with #GoodFirstAlpie
⭐ Star the repo · 🔀 open your first PR · 🌱 contribute to open source

#GoodFirstAlpie #Preptember #Hacktoberfest #OpenSource #169Pi`;
}

// Default, ready-to-paste image-generation prompt for external tools.
function defaultFeaturePrompt(community) {
  const name = (community || 'our community').trim() || 'our community';
  const centerName = (community || '').trim() || '[your community]';
  return `A bold, minimal hero banner celebrating ${name}'s first open-source contribution with 169Pi — an open-source AI lab building the best local & offline first models out of India for the world! Center the community name "${centerName}" with subtle circuit-board and terminal motifs, a deep pine-teal and emerald palette (#134E4A, #10B981, #0284C7) on a warm parchment or dark navy background. Clean geometric sans-serif type, generous negative space, flat vector illustration style, crisp edges. Add a small tag reading "Open Source · Preptember 2026". No photorealism, no stock-photo people, no clutter. Aspect ratio 16:9.`;
}

export default function Organizers() {
  // Community Canvas state
  const [community, setCommunity] = useState('');
  const [logo, setLogo] = useState(null);
  const [logoName, setLogoName] = useState('');
  const [logoError, setLogoError] = useState('');
  const [caption, setCaption] = useState('');
  const [captionTouched, setCaptionTouched] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [pngBusy, setPngBusy] = useState(null); // holds the size id being rendered
  const fileRef = useRef(null);

  // Feature-prompt state
  const [prompt, setPrompt] = useState('');
  const [promptTouched, setPromptTouched] = useState(false);
  const [promptBusy, setPromptBusy] = useState(false);
  const [promptError, setPromptError] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // One design, both sizes — kept in a map so editing the fields updates both.
  const svgs = useMemo(
    () => ({
      wide: buildSvg('wide', { community, logo }),
      story: buildSvg('story', { community, logo }),
    }),
    [community, logo]
  );

  const postCaption = captionTouched ? caption : defaultCaption(community);
  const featurePrompt = promptTouched ? prompt : defaultFeaturePrompt(community);
  const fileBase = `preptember-${(community || 'post').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'post'}`;

  function onLogo(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setLogoError('');
    if (!f.type.startsWith('image/')) {
      setLogoError('Please choose an image file.');
      return;
    }
    if (f.size > 400 * 1024) {
      setLogoError('Logo is over 400 KB — pick a smaller file so the SVG stays lightweight.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setLogo(String(reader.result));
      setLogoName(f.name);
    };
    reader.onerror = () => setLogoError('Could not read that file.');
    reader.readAsDataURL(f);
  }

  function clearLogo() {
    setLogo(null);
    setLogoName('');
    setLogoError('');
    if (fileRef.current) fileRef.current.value = '';
  }

  async function copyText(text, setFlag) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for browsers that block the async clipboard API.
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

  function download(filename, blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportSvg(sizeId) {
    try {
      download(`${fileBase}-${sizeId}.svg`, new Blob([svgs[sizeId]], { type: 'image/svg+xml' }));
    } catch {}
  }

  // Rasterizes the chosen size to a high-resolution PNG so it can be posted
  // directly to social platforms (which don't accept SVG uploads).
  function exportPng(sizeId) {
    const dims = SIZES.find((s) => s.id === sizeId) || SIZES[0];
    setPngBusy(sizeId);
    try {
      const scale = 2;
      const blob = new Blob([svgs[sizeId]], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = dims.w * scale;
          canvas.height = dims.h * scale;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((png) => {
            if (png) download(`${fileBase}-${sizeId}.png`, png);
            URL.revokeObjectURL(url);
            setPngBusy(null);
          }, 'image/png');
        } catch {
          URL.revokeObjectURL(url);
          setPngBusy(null);
        }
      };
      img.onerror = () => { URL.revokeObjectURL(url); setPngBusy(null); };
      img.src = url;
    } catch {
      setPngBusy(null);
    }
  }

  async function generatePrompt() {
    setPromptBusy(true);
    setPromptError('');
    const name = (community || 'our community').trim() || 'our community';
    const ask = `Write a single, ready-to-paste image-generation prompt (for tools like Midjourney, DALL·E or Ideogram) for a graphic celebrating my community "${name}" making its first open-source contribution with 169Pi during Preptember. Reflect 169Pi's identity (an open-source AI lab building the best local & offline first models out of India for the world!) and its teal/emerald palette. Keep it to one vivid but concrete paragraph and end with style and aspect-ratio tags. Return only the prompt text — no preamble.`;
    try {
      const res = await fetch('/api/alpie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'chat', messages: [{ role: 'user', content: ask }] }),
      });
      const j = await res.json();
      if (!res.ok) {
        setPromptError(j.error || 'Alpie is unavailable right now — the template below still works.');
      } else if (j.content) {
        setPrompt(j.content.trim());
        setPromptTouched(true);
      }
    } catch {
      setPromptError('Could not reach Alpie — the template below still works.');
    } finally {
      setPromptBusy(false);
    }
  }

  return (
    <div className="page">
      {/* Sticky nav */}
      <header className="site-nav">
        <div className="nav-inner">
          <a href="/" className="nav-brand-link" aria-label="169Pi Preptember home">
            <span className="nav-logo">
              <img src="/alpie-logo.webp" alt="169Pi logo" style={{ width: 30, height: 30, objectFit: 'contain' }} />
            </span>
            <span className="nav-title">169Pi</span>
            <span className="nav-tag">Preptember · For Organizers</span>
          </a>
          <div className="nav-actions" style={{ marginLeft: 'auto' }}>
            <a href="/" className="nav-link-organizers">← Checklist</a>
            <ThemeToggle />
            <a href="/api/auth/github" className="auth-pill auth-pill-signin">
              <GithubMark />
              <span>Sign in<span className="hide-sm"> with GitHub</span></span>
            </a>
          </div>
        </div>
      </header>

      <main className="wrap">
        {/* Intro */}
        <section className="section org-intro">
          <div className="pill-pixel">
            <span className="sq" />FOR ORGANIZERS · RUN IT AS A WORKSHOP
          </div>
          <h1 className="org-h1">
            Run Preptember like an <span className="accent">instructor-led workshop.</span>
          </h1>
          <p className="org-lede">
            Everything below maps to the live Preptember flow, so you don&apos;t build a lesson plan from scratch.
            Follow the standardized agenda, use the <strong>Community Canvas</strong> to make a co-branded social post
            announcing your session, and grab a prompt template for featuring your community. Meetup, campus club or
            Discord — bring a whole group through their first pull request together.
          </p>
          <div className="org-intro-cta">
            <a href="#curriculum" className="hbtn hbtn-primary">
              See the agenda<span className="material-symbols-outlined">arrow_downward</span>
            </a>
            <a href={DISCORD_URL} target="_blank" rel="noreferrer" className="hbtn hbtn-discord">
              <span className="material-symbols-outlined">group</span>Coordinate in Discord
            </a>
          </div>
        </section>

        {/* Clubs leaderboard callout */}
        <section className="section">
          <div className="org-lb-callout">
            <span className="org-lb-callout-icon"><span className="material-symbols-outlined">trophy</span></span>
            <div className="org-lb-callout-body">
              <div className="org-lb-callout-title">New: a live Clubs Leaderboard</div>
              <div className="org-lb-callout-sub">
                Every PR your community opens is counted toward your club in real time. Have attendees add a{' '}
                <code style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 5px', borderRadius: 5 }}>Club: {'{your club}'}</code>{' '}
                line to their PR — the top club wins prizes. Track the whole room on one live board.
              </div>
            </div>
            <a href="/leaderboard" className="org-lb-callout-cta">
              Open the leaderboard<span className="material-symbols-outlined">north_east</span>
            </a>
          </div>
        </section>

        {/* 1 · Curriculum */}
        <section className="section" id="curriculum">
          <div className="card org-card">
            <div className="org-card-head">
              <span className="eyebrow"><span className="material-symbols-outlined">event_note</span>01 · Instructor-led curriculum</span>
              <h2 className="org-card-title">A 60-minute agenda that mirrors the website</h2>
              <p className="org-card-sub">
                Four phases, ~60 minutes end to end. Each phase pairs what <strong>you</strong> demo with what
                <strong> attendees</strong> do on their own machines.
              </p>
            </div>

            <div className="curr-list">
              {CURRICULUM.map((c, i) => (
                <div key={c.phase} className="curr-card">
                  <div className="curr-head">
                    <span className="curr-index">{String(i + 1).padStart(2, '0')}</span>
                    <span className="curr-phase-icon"><span className="material-symbols-outlined">{c.icon}</span></span>
                    <span className="curr-phase">{c.phase}</span>
                    <span className="curr-dur"><span className="material-symbols-outlined">schedule</span>{c.duration}</span>
                  </div>
                  <div className="curr-cols">
                    <div className="curr-col curr-col-org">
                      <span className="curr-col-label">You (organizer)</span>
                      <p>{c.organizer}</p>
                    </div>
                    <div className="curr-col curr-col-att">
                      <span className="curr-col-label">Attendees</span>
                      <p>{c.attendee}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="org-inline-note">
              <span className="material-symbols-outlined">tips_and_updates</span>
              <span>
                Keep the attendee <a href="/">checklist</a> open on the shared screen — starring, forking and PRs
                auto-check once each person signs in with GitHub, so you can see the room progress live.
              </span>
            </div>
          </div>
        </section>

        {/* 2 · Community Canvas */}
        <section className="section" id="canvas">
          <div className="card org-card">
            <div className="org-card-head">
              <span className="eyebrow"><span className="material-symbols-outlined">share</span>02 · The Community Canvas</span>
              <h2 className="org-card-title">One co-branded post, two ready sizes</h2>
              <p className="org-card-sub">
                Announce your session on social — <strong>{'{Community}'} × 169Pi for Open Source</strong>, with the
                <strong> #GoodFirstAlpie</strong> call to action. Add your details once and both sizes update: a
                LinkedIn/X card and an Instagram Story. Download and post — tag <strong>169Pi</strong> and we reshare.
              </p>
            </div>

            <div className="canvas-wrap">
              {/* Controls + caption */}
              <div className="canvas-controls">
                <div className="canvas-field">
                  <label className="canvas-label" htmlFor="cc-community">Community name</label>
                  <input id="cc-community" className="canvas-input" type="text" placeholder="e.g. IIT Delhi OSS Club"
                    value={community} onChange={(e) => setCommunity(e.target.value)} maxLength={40} />
                </div>

                <div className="canvas-field">
                  <label className="canvas-label">Campus / club logo <span className="canvas-opt">(optional)</span></label>
                  <div className="logo-drop">
                    <input ref={fileRef} id="cc-logo" type="file" accept="image/*" onChange={onLogo} className="logo-input" />
                    <label htmlFor="cc-logo" className="logo-btn">
                      <span className="material-symbols-outlined">upload</span>
                      {logoName ? 'Replace logo' : 'Upload a logo'}
                    </label>
                    {logoName && (
                      <span className="logo-file">
                        {logoName}
                        <button type="button" className="logo-clear" onClick={clearLogo} aria-label="Remove logo">✕</button>
                      </span>
                    )}
                  </div>
                  {logoError && <span className="canvas-error">{logoError}</span>}
                  <span className="canvas-help">SVG or PNG under 400 KB. It sits top-right on both sizes, co-branded with Alpie-Core.</span>
                </div>

                <div className="prompt-box canvas-field-full">
                  <div className="prompt-box-head">
                    <span className="prompt-box-title"><span className="material-symbols-outlined">chat</span>Caption</span>
                    <div className="prompt-box-actions">
                      <button type="button" className="btn-solid btn-sm" onClick={() => copyText(postCaption, setCopiedCaption)}>
                        <span className="material-symbols-outlined">content_copy</span>{copiedCaption ? 'Copied!' : 'Copy caption'}
                      </button>
                    </div>
                  </div>
                  <textarea
                    className="prompt-text"
                    value={postCaption}
                    onChange={(e) => { setCaption(e.target.value); setCaptionTouched(true); }}
                    rows={9}
                    aria-label="Social post caption"
                  />
                  <span className="canvas-help">Fills in from the fields above until you start typing. Add your date, venue or link before posting.</span>
                </div>
              </div>

              {/* Both sizes, same design — edit once, both update */}
              <div className="canvas-stage">
                {SIZES.map((s) => (
                  <div key={s.id} className="canvas-shot">
                    <div className="canvas-shot-head">
                      <span className="canvas-shot-label">{s.label}</span>
                      <span className="canvas-shot-dim">{s.hint}</span>
                    </div>
                    <div className={`canvas-preview canvas-preview-${s.id}`} aria-label={`${s.label} preview`} dangerouslySetInnerHTML={{ __html: svgs[s.id] }} />
                    <div className="canvas-actions">
                      <button type="button" className="btn-solid" onClick={() => exportPng(s.id)} disabled={pngBusy === s.id}>
                        <span className="material-symbols-outlined">{pngBusy === s.id ? 'hourglass_top' : 'download'}</span>{pngBusy === s.id ? 'Rendering…' : 'Download PNG'}
                      </button>
                      <button type="button" className="btn-ghost" onClick={() => exportSvg(s.id)}>
                        <span className="material-symbols-outlined">code</span>SVG
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="org-inline-note">
              <span className="material-symbols-outlined">tips_and_updates</span>
              <span>
                Both sizes share one design — edit the fields once and both update. Download the <strong>PNG</strong>,
                paste the caption, and post on LinkedIn, X or Instagram with <strong>#GoodFirstAlpie</strong>, tagging <strong>169Pi</strong>.
              </span>
            </div>
          </div>
        </section>

        {/* 3 · Getting featured */}
        <section className="section" id="featured">
          <div className="card org-card">
            <div className="org-card-head">
              <span className="eyebrow"><span className="material-symbols-outlined">auto_awesome</span>03 · Getting your community featured</span>
              <h2 className="org-card-title">Generate a hero image on an external platform</h2>
              <p className="org-card-sub">
                Want a richer graphic than an SVG? Take this prompt to an image generator (Midjourney, DALL·E, Ideogram —
                or drive one with the Alpie API), then feature the result on your community&apos;s page. Add your community
                name above and let Alpie tailor the prompt, or copy the template and tweak it yourself.
              </p>
            </div>

            <div className="prompt-box">
              <div className="prompt-box-head">
                <span className="prompt-box-title"><span className="material-symbols-outlined">edit_note</span>Template prompt</span>
                <div className="prompt-box-actions">
                  <button type="button" className="btn-ghost btn-sm" onClick={generatePrompt} disabled={promptBusy}>
                    <span className="material-symbols-outlined">{promptBusy ? 'hourglass_top' : 'auto_awesome'}</span>
                    {promptBusy ? 'Asking Alpie…' : 'Tailor with Alpie'}
                  </button>
                  <button type="button" className="btn-solid btn-sm" onClick={() => copyText(featurePrompt, setCopiedPrompt)}>
                    <span className="material-symbols-outlined">content_copy</span>{copiedPrompt ? 'Copied!' : 'Copy prompt'}
                  </button>
                </div>
              </div>
              <textarea
                className="prompt-text"
                value={featurePrompt}
                onChange={(e) => { setPrompt(e.target.value); setPromptTouched(true); }}
                rows={7}
                aria-label="Image generation prompt"
              />
              {promptError && <span className="canvas-error">{promptError}</span>}
              <span className="canvas-help">
                Edits are yours to keep. Placeholders fill in from the community name above until you start typing.
              </span>
            </div>
          </div>
        </section>

      </main>

      <SiteFooter />
    </div>
  );
}
