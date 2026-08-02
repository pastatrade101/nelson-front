import type { PageLoad } from './$types';
import type { Lodge } from '$lib/types';

// SSR-load the lodges so the accommodation grid is in the initial HTML rather
// than a client-side fetch after hydration. Filtering/sorting stays client-side.
export const load: PageLoad = async ({ fetch }) => {
  try {
    const res = await fetch('/api/lodges?status=published&limit=200');
    if (res.ok) {
      const body = await res.json();
      return { lodges: (body?.data?.items ?? []) as Lodge[], loadFailed: false };
    }
  } catch {
    // fall through to the error state
  }
  return { lodges: [] as Lodge[], loadFailed: true };
};
