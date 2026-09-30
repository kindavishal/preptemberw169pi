# Contributing

Thanks for your interest in improving Preptember!

## Two different kinds of "contribution"

**Are you here for the Preptember campaign — adding your entry to the 169pi profile?**
That contribution does **not** go to this repo. It goes to the
[`169Pi/.github`](https://github.com/169Pi/.github) repo, under the
"Make this README yours" section of `profile/README.md`. The live site walks you
through every step: **https://goodfirst.alpie.ai**

**Do you want to improve this landing page itself** (the Next.js app)? Then you're in
the right place — read on.

## Local setup

```bash
cp .env.example .env.local   # fill in the values — see the README
npm install
npm run dev                  # → http://localhost:3001
```

The [README](README.md) documents the stack, environment variables, which repos the
page tracks, and how to register the GitHub OAuth app for local sign-in.

## Making a change

1. Fork the repo and create a branch off `dev` (e.g. `fix-leaderboard-avatars`).
2. Make your change and test it locally with `npm run dev`.
3. Run `npm run lint` and fix anything it reports.
4. Open a pull request against the **`dev`** branch with a short description of what
   changed and why. `dev` is merged into `main` for release.

## Style and conventions

- **Next.js 16 App Router, plain JavaScript** — no TypeScript, and keep the
  dependency list minimal.
- **Colors go through theme tokens.** The site supports light/dark/system themes via
  CSS custom properties in [`app/globals.css`](app/globals.css). Use `var(--…)` tokens
  for anything theme-dependent instead of hardcoding new hex values; add a token (with
  a light and dark value) if you need a new one.
- Keep the page **beginner-friendly**: plain language, expandable help, and no jargon
  without a tooltip or glossary entry.
- Match the existing formatting and naming in the file you're editing.
- Secrets belong in `.env.local` (git-ignored) — never commit keys or tokens.

## Reporting issues

Open a GitHub issue with steps to reproduce, or ask in the
[169pi Discord](https://discord.gg/QqkrMmvt4). Screenshots help.

## License

By contributing, you agree that your contributions are licensed under the
[MIT License](LICENSE).
