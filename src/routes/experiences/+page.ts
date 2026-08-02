import type { PageLoad } from './$types';

// SSR-load the experience categories so the grid is in the initial HTML.
export const load: PageLoad = async ({ fetch }) => {
  try {
    const res = await fetch('/api/categories?status=published&limit=100');
    if (res.ok) {
      const body = await res.json();
      return { categories: (body?.data?.items ?? []) as Array<Record<string, unknown>> };
    }
  } catch {
    // fall through — empty grid
  }
  return { categories: [] as Array<Record<string, unknown>> };
};
