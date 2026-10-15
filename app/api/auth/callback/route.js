import { NextResponse } from 'next/server';
import { sign, buildSetCookie } from '../../../../lib/session';

export const runtime = 'nodejs';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const cookieHeader = req.headers.get('cookie') || '';
  const savedState = cookieHeader
    .split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith('preptember_oauth_state='));
  const expected = savedState ? savedState.split('=')[1] : null;

  if (!code || !state || !expected || state !== expected) {
    return NextResponse.redirect(new URL('/?auth=state_error', req.url));
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const redirectUri = process.env.GITHUB_REDIRECT_URI;

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });
  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL('/?auth=token_error', req.url));
  }
  const tokenJson = await tokenRes.json();
  const accessToken = tokenJson.access_token;
  if (!accessToken) {
    return NextResponse.redirect(new URL('/?auth=no_token', req.url));
  }

  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'good-first-alpie-app',
    },
  });
  if (!userRes.ok) {
    return NextResponse.redirect(new URL('/?auth=user_error', req.url));
  }
  const user = await userRes.json();

  const session = {
    t: accessToken,
    login: user.login,
    id: user.id,
    avatar: user.avatar_url,
    name: user.name || user.login,
    iat: Math.floor(Date.now() / 1000),
  };
  const signed = sign(session);

  const res = NextResponse.redirect(new URL('/?auth=ok', req.url));
  res.headers.append('Set-Cookie', buildSetCookie(signed));
  res.headers.append(
    'Set-Cookie',
    `preptember_oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${
      process.env.NODE_ENV === 'production' ? '; Secure' : ''
    }`
  );
  return res;
}
