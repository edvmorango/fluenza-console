// Server-side only - never exposed to the browser (see .envrc, deliberately not NEXT_PUBLIC_).
const FLUENZA_API_URL = process.env.FLUENZA_API_URL ?? 'http://localhost:8000';

export function fluenzaUrl(path: string): string {
  return `${FLUENZA_API_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
