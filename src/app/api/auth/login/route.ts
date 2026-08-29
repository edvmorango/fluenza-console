import { fluenzaUrl } from '@/lib/fluenza';
import { setSession } from '@/lib/session';
import type { AuthenticateRequest, AuthenticateResponse } from '@/generated/api/model';
import { NextResponse } from 'next/server';

// The one endpoint (besides refresh, handled internally by the proxy) whose response body
// carries tokens - those never reach the browser. Everything else the login screen needs
// (register/resend/activate) goes straight through the generic /api/fluenza/* proxy via the
// orval-generated hooks, since their responses don't carry anything that needs to become a cookie.
export async function POST(request: Request) {
  const body: AuthenticateRequest = await request.json();

  const res = await fetch(fluenzaUrl('/v1/account/authenticate'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    return new NextResponse(errorBody, { status: res.status, headers: { 'Content-Type': 'application/json' } });
  }

  const tokens: AuthenticateResponse = await res.json();
  await setSession(tokens.access_token, tokens.refresh_token, tokens.expires_in);

  return NextResponse.json({ success: true });
}
