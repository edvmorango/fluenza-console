// orval's fetch-client mutator contract: (url, options) => Promise<T>. No credentials option
// needed - everything goes through /api/fluenza/* (same-origin), so the browser sends cookies
// by default. Error handling is entirely the mutator's job when a custom mutator is configured -
// orval generates no throw-on-error logic of its own in that case.
export class ApiError extends Error {
  status: number;
  info: unknown;

  constructor(message: string, status: number, info: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.info = info;
  }
}

export const apiFetch = async <T>(url: string, options: RequestInit): Promise<T> => {
  const res = await fetch(url, options);

  const text = res.status === 204 ? '' : await res.text();
  const contentType = res.headers.get('content-type') ?? '';
  const body = text && contentType.includes('application/json') ? JSON.parse(text) : text || undefined;

  if (!res.ok) {
    const message =
      body && typeof body === 'object' && 'msg' in body ? String((body as { msg: unknown }).msg) : `Request failed with status ${res.status}`;
    throw new ApiError(message, res.status, body);
  }

  return body as T;
};
