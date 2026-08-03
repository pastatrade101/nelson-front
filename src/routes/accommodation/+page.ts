import type { PageLoad } from './$types';
import type { Lodge } from '$lib/types';
import { cachedJson } from '$lib/cache';

// SSR-load the lodges so the accommodation grid is in the initial HTML rather
// than a client-side fetch after hydration. Filtering/sorting stays client-side.
export const load: PageLoad = async ({ fetch }) => {
  try {
    const body = await cachedJson<{ data?: { items?: Lodge[] } }>('/api/lodges?status=published&limit=200', fetch);
    return { lodges: body?.data?.items ?? [], loadFailed: false };
  } catch {
    // fall through to the error state
  }
  return { lodges: [] as Lodge[], loadFailed: true };
};
