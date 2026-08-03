import type { PageLoad } from './$types';
import { cachedJson } from '$lib/cache';

// SSR-load the categories (styles), tours (for per-style stats) and destinations
// (for the hero image) so the whole page is in the initial HTML rather than
// assembling after a client-side fetch. Cached client-side for instant revisits.
export const load: PageLoad = async ({ fetch }) => {
  const pick = (url: string) =>
    cachedJson<{ data?: { items?: Array<Record<string, unknown>> } }>(url, fetch)
      .then((b) => b?.data?.items ?? [])
      .catch(() => null);
  const [cat, tour, dest] = await Promise.all([
    pick('/api/categories?status=published&limit=100'),
    pick('/api/tours?status=published&limit=100'),
    pick('/api/destinations?status=published&limit=100')
  ]);
  return {
    categories: cat ?? [],
    tours: tour ?? [],
    destinations: dest ?? [],
    failed: cat === null
  };
};
