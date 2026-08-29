import { cookies } from 'next/headers';

const ACCESS_TOKEN_COOKIE = 'access_token';
const REFRESH_TOKEN_COOKIE = 'refresh_token';

// Matches fluenza's SERVER_REFRESH_TOKEN_TTL (.envrc) - the cookie shouldn't outlive the token
// it holds, but there's no harm in it being a little shorter either.
const REFRESH_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

// Only callable from Route Handlers / Server Actions - `cookies()` can't set/delete during
// Server Component rendering.
export async function setSession(accessToken: string, refreshToken: string, accessExpiresInSeconds: number) {
  const store = await cookies();
  store.set(ACCESS_TOKEN_COOKIE, accessToken, { ...cookieOptions, maxAge: accessExpiresInSeconds });
  store.set(REFRESH_TOKEN_COOKIE, refreshToken, { ...cookieOptions, maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS });
}

export async function setAccessToken(accessToken: string, accessExpiresInSeconds: number) {
  const store = await cookies();
  store.set(ACCESS_TOKEN_COOKIE, accessToken, { ...cookieOptions, maxAge: accessExpiresInSeconds });
}

export async function getAccessToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(ACCESS_TOKEN_COOKIE)?.value;
}

export async function getRefreshToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(REFRESH_TOKEN_COOKIE)?.value;
}

export async function clearSession() {
  const store = await cookies();
  store.delete(ACCESS_TOKEN_COOKIE);
  store.delete(REFRESH_TOKEN_COOKIE);
}
