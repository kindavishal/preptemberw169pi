import { NextResponse } from 'next/server';
import { verify, sessionCookieName } from '../../../../lib/session';

export const runtime = 'nodejs';

function readSession(req) {
  const cookieHeader = req.headers.get('cookie') || '';
  const raw = cookieHeader
    .split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${sessionCookieName()}=`));
  if (!raw) return null;
  const token = raw.slice(sessionCookieName().length + 1);
  return verify(token);
}

async function gh(path, token) {
  return fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'good-first-alpie-app',
    },
    cache: 'no-store',
  });
}

export async function GET(req) {
  const session = readSession(req);
  if (!session) return NextResponse.json({ authenticated: false });

  const starOwner = process.env.GITHUB_STARS_OWNER || '169Pi';
  const starRepo = process.env.GITHUB_STARS_REPO || 'Alpie-Core';
  const prOwner = process.env.GITHUB_PROFILE_OWNER || '169Pi';
  const prRepo = process.env.GITHUB_PROFILE_REPO || '.github';
  const login = session.login;
  const token = session.t;

  const [starRes, forksRes, prsRes] = await Promise.all([
    gh(`/user/starred/${starOwner}/${starRepo}`, token),
    gh(`/repos/${prOwner}/${prRepo}/forks?per_page=100&sort=newest`, token),
    gh(`/repos/${prOwner}/${prRepo}/pulls?state=all&per_page=100&sort=created&direction=desc`, token),
  ]);

  const starred = starRes.status === 204;

  let forked = false;
  if (forksRes.ok) {
    const forks = await forksRes.json();
    forked = forks.some((f) => f.owner && f.owner.login === login);
  }

  let openPr = false;
  let mergedPr = false;
  if (prsRes.ok) {
    const prs = await prsRes.json();
    for (const pr of prs) {
      if (pr.user && pr.user.login === login) {
        if (pr.merged_at) mergedPr = true;
        else if (pr.state === 'open') openPr = true;
      }
    }
  }

  return NextResponse.json({
    authenticated: true,
    login,
    starred,
    forked,
    openPr,
    mergedPr,
  });
}
