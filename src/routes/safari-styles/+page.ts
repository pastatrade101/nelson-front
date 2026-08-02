import type { PageLoad } from './$types';

// SSR-load the categories (styles), tours (for per-style stats) and destinations
// (for the hero image) so the whole page is in the initial HTML rather than
// assembling after a client-side fetch.
export const load: PageLoad = async ({ fetch }) => {
  const settled = await Promise.allSettled([
    fetch('/api/categories?status=published&limit=100'),
    fetch('/api/tours?status=published&limit=100'),
    fetch('/api/destinations?status=published&limit=100')
  ]);
  const items = async (r: PromiseSettledResult<Response>): Promise<Array<Record<string, unknown>>> => {
    if (r.status === 'fulfilled' && r.value.ok) {
      const body = await r.value.json();
      return (body?.data?.items ?? []) as Array<Record<string, unknown>>;
    }
    return [];
  };
  const [cat, tour, dest] = settled;
  const catOk = cat.status === 'fulfilled' && cat.value.ok;
  return {
    categories: await items(cat),
    tours: await items(tour),
    destinations: await items(dest),
    failed: !catOk
  };
};
