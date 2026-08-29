import { clearSession } from '@/lib/session';
import { NextResponse } from 'next/server';

// fluenza has no "revoke this refresh token" endpoint yet, so the old refresh token stays valid
// server-side until it expires or gets used - clearing the cookies is what actually ends this
// browser's session.
export async function POST() {
  await clearSession();
  return NextResponse.json({ success: true });
}
