/**
 * Shared fetch utility for DailyFlow API calls.
 *
 * Automatically injects the `x-user-id` header required by all API routes.
 * In a real app this would read from an auth context; for this workshop it
 * uses a fixed default user so every tab works without a login flow.
 */

const DEFAULT_USER_ID = 'default-user';

/** Standard API envelope returned by every endpoint. */
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

/**
 * Drops in for `fetch`, adding the auth header and Content-Type automatically.
 *
 * @param url     - URL to fetch (string or Request).
 * @param init    - Optional RequestInit overrides.
 */
export async function apiFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('x-user-id', DEFAULT_USER_ID);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(url, { ...init, headers });
}

/**
 * Unwraps an API envelope, throwing an Error if the server returned an error.
 *
 * @param res - The raw fetch Response.
 * @returns The `data` field of the response envelope.
 * @throws Error with the server error message on non-OK status.
 */
export async function unwrap<T>(res: Response): Promise<T> {
  const json = (await res.json()) as ApiResponse<T>;
  if (!res.ok || json.error) {
    throw new Error(json.error ?? `HTTP ${res.status}`);
  }
  return json.data as T;
}
