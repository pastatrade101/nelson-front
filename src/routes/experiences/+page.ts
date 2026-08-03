import type { PageLoad } from './$types';
import { cachedJson } from '$lib/cache';

// SSR-load the experience categories so the grid is in the initial HTML.
export const load: PageLoad = async ({ fetch }) => {
  try {
    const body = await cachedJson<{ data?: { items?: Array<Record<string, unknown>> } }>('/api/categories?status=published&limit=100', fetch);
    return { categories: body?.data?.items ?? [] };
  } catch {
    // fall through — empty grid
  }
  return { categories: [] as Array<Record<string, unknown>> };
};
