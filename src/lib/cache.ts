import { browser } from '$app/environment';

// Client-only, short-lived cache for public GET JSON used by page `load`
// functions. On the server (SSR) every call fetches fresh — there is never a
// shared cross-request cache — while on the client, revisiting a page returns
// instantly from cache instead of re-fetching, so back / forward and repeat
// navigation feel immediate. Throws on a non-OK response so each caller's
// existing try/catch can fall back to its default/empty state.
type Entry = { data: unknown; at: number };
const store = new Map<string, Entry>();
const TTL = 5 * 60 * 1000; // 5 minutes

export async function cachedJson<T = unknown>(url: string, fetchFn: typeof fetch = fetch): Promise<T> {
  if (browser) {
    const hit = store.get(url);
    if (hit && Date.now() - hit.at < TTL) return hit.data as T;
  }
  const res = await fetchFn(url);
  if (!res.ok) throw new Error(`Request failed (${res.status}) for ${url}`);
  const data = (await res.json()) as T;
  if (browser) store.set(url, { data, at: Date.now() });
  return data;
}
