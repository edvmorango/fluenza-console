import { fluenzaUrl } from '@/lib/fluenza';
import { getAccessToken, getRefreshToken, setSession, clearSession } from '@/lib/session';
import { NextResponse, type NextRequest } from 'next/server';

// Both of these carry tokens in their response body. Login is handled by the dedicated
// /api/auth/login route; refresh is handled internally by this proxy's own silent-refresh logic
// below. Neither should ever be reachable through the generic pass-through, or the raw tokens
// would flow back into the browser's JSON response instead of staying in httpOnly cookies -
// this is what stops an accidental `usePostV1AccountRefresh()` call from a page component (the
// hook exists because it's in the OpenAPI spec) from leaking a token.
const BLOCKED_PATHS = new Set(['v1/account/authenticate', 'v1/account/refresh']);

async function refreshSession(): Promise<string | undefined> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return undefined;

  const res = await fetch(fluenzaUrl('/v1/account/refresh'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    // The refresh token itself is invalid/expired/revoked - nothing left to try.
    await clearSession();
    return undefined;
  }

  const tokens: { access_token: string; refresh_token: string; expires_in: number } = await res.json();
  await setSession(tokens.access_token, tokens.refresh_token, tokens.expires_in);
  return tokens.access_token;
}

async function proxy(request: NextRequest, path: string[]): Promise<NextResponse> {
  const joined = path.join('/');
  if (BLOCKED_PATHS.has(joined)) {
    return NextResponse.json({ msg: 'Not found' }, { status: 404 });
  }

  const target = fluenzaUrl(`/${joined}${request.nextUrl.search}`);
  const contentType = request.headers.get('content-type');
  // Read once upfront - Request bodies are single-use streams, and a refresh-then-retry needs
  // to send the same body twice.
  const body = request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text();

  const attempt = (accessToken: string | undefined) =>
    fetch(target, {
      method: request.method,
      headers: {
        ...(contentType ? { 'Content-Type': contentType } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body,
    });

  let res = await attempt(await getAccessToken());

  if (res.status === 401) {
    const refreshedAccessToken = await refreshSession();
    if (refreshedAccessToken) {
      res = await attempt(refreshedAccessToken);
    }
  }

  // The Fetch spec forbids a non-null body on 204/205/304 responses - the Response constructor
  // throws if given even an empty string for one of these, not just a genuinely non-empty body.
  const isEmptyStatus = res.status === 204 || res.status === 205 || res.status === 304;
  const responseBody = isEmptyStatus ? null : await res.text();
  const responseContentType = res.headers.get('content-type');
  return new NextResponse(responseBody, {
    status: res.status,
    headers: responseContentType ? { 'Content-Type': responseContentType } : undefined,
  });
}

type RouteParams = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  return proxy(request, (await params).path);
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  return proxy(request, (await params).path);
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  return proxy(request, (await params).path);
}
