import { NextResponse, type NextRequest } from 'next/server';

// Next.js 16 renamed the middleware.ts convention to proxy.ts (same runtime behavior, this file
// must be named/exported as `proxy`, not `middleware`, or it's silently ignored).
//
// Coarse gate only: presence of either cookie is enough to let the request through - an expired
// access_token with a still-valid refresh_token is exactly what /api/fluenza/[...path]'s silent
// refresh-on-401 is for for. This just stops obviously-logged-out requests from ever reaching a
// dashboard page and flashing content before an API call 401s.
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has('access_token') || request.cookies.has('refresh_token');

  if (!hasSession) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/account/:path*', '/subscription/:path*', '/keys/:path*'],
};
