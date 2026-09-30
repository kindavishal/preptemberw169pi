# Preptember — 169Pi × Hacktoberfest

Beginner landing page that walks people through their first open-source contribution: adding an entry to the **"Make this README yours"** section of [`169Pi/.github`](https://github.com/169Pi/.github)'s `profile/README.md`.

Live at **https://goodfirst.alpie.ai**

## Stack

- Next.js 16 (App Router, JavaScript)
- Deployed on Vercel
- Live GitHub stats via the public REST API
- GitHub OAuth for sign-in and checklist auto-detection (star, fork, PR, merge)
- Alpie chat and entry drafter via a server-side proxy (`/api/alpie`)
- Light / dark / system theme, with the choice saved per visitor

## Local dev

```bash
cp .env.example .env.local
# fill in the values (see below)
npm install
npm run dev
# → http://localhost:3001
```

## Environment variables

See `.env.example` for the full list with defaults.

| Var | Required | What it does |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No | Powers the live "N people here right now" presence counter via Supabase Realtime. Leave blank and the counter simply doesn't render. |
| `ALPIE_API_BASE` / `ALPIE_API_KEY` | Yes | Alpie API endpoint and key for chat and the drafter |
| `ALPIE_MODEL` | No | Model name (default `alpie-core`) |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | Yes | From your GitHub OAuth app (see below) |
| `GITHUB_REDIRECT_URI` | Yes | Must exactly match the OAuth app's callback URL |
| `SESSION_SECRET` | Yes | Signs the session cookie. Use a long random string (`openssl rand -base64 32`) |
| `GITHUB_TOKEN` | Recommended | Raises the GitHub rate limit from 60/hr to 5,000/hr for both the live stats and the Clubs Leaderboard. Without it the leaderboard can be blanked by rate limits (it falls back to the last known standings, marked stale). |
| `NEXT_PUBLIC_SITE_URL` | No | Base URL for link previews. Defaults to the Vercel production domain |
| `NEXT_PUBLIC_DISCORD_URL` | No | Discord invite used across the page |
| `GITHUB_STARS_*`, `GITHUB_STATS_*`, `GITHUB_PROFILE_*`, `NEXT_PUBLIC_GITHUB_*` | No | Override which repos the page tracks (see below) |

### Which repo is used for what

| Data | Repo |
|---|---|
| Star count, "Star" step, star auto-check | `169Pi/Alpie-Core` |
| PR count, contributor leaderboard | `169Pi/.github` |
| Fork and PR steps | `169Pi/.github` |

### Registering the GitHub OAuth app

1. Go to https://github.com/settings/developers → **OAuth Apps** → **New OAuth App**
2. **Application name**: `Preptember (169Pi)`
3. **Homepage URL**: `https://goodfirst.alpie.ai`
4. **Authorization callback URL**: `https://goodfirst.alpie.ai/api/auth/callback`
5. Copy the **Client ID**, generate a **Client secret**, and add both to Vercel → Project Settings → Environment Variables

An OAuth app allows only one callback URL, so for local sign-in register a second app with `http://localhost:3001` as the homepage and `http://localhost:3001/api/auth/callback` as the callback, and put its credentials in `.env.local`.

## Deploy to Vercel

1. Import the repo in Vercel (the project root is the repo root)
2. Add the environment variables from `.env.example`
3. Deploy, then confirm the OAuth app callback matches `GITHUB_REDIRECT_URI`

## What the page does

- Live star count (Alpie-Core), PR count and contributor count (`.github`)
- Contributor leaderboard, with bots and AI accounts filtered out
- 8-step first-contribution walkthrough (starting from **Step 0: create a GitHub account**) with expandable help, in-browser sub-steps, GitHub screenshot previews and "before you PR" rules
- Beginner aids: a "no coding, no terminal" banner, inline jargon tooltips and a collapsible glossary
- Progress saved in `localStorage`
- Sign in with GitHub, which auto-ticks the account, Star, Fork, PR and Merged steps from live GitHub state
- Countdown to the next bi-weekly merge date
- "Try Alpie-Core": leads with the no-setup options (alpie.ai and the 169pi Playground) and collapses the developer runtimes (Hugging Face, Ollama, Kaggle) plus a docs link
- Floating "Ask Alpie" chat, proxied server-side
- "Draft it with Alpie": a form that returns a Markdown entry for `profile/README.md`
- Creation Studio: a client-side, no-code SVG generator (copy or download the result)
- "Running a session?" card that drafts an organizer's guide via Alpie
- Light / dark / system theme switch in the nav
- Favicons, web manifest and link-preview image

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Note: if you're here for the Preptember
campaign itself (adding your entry to the 169pi profile), that goes to
[`169Pi/.github`](https://github.com/169Pi/.github), not this repo — the live site
walks you through it.

## License

Released under the [MIT License](LICENSE).
