import type { PageLoad } from './$types';
import { cachedJson } from '$lib/cache';

// SSR-load the published gallery so the grid is in the initial HTML (no flash),
// cached client-side for instant revisits.
export const load: PageLoad = async ({ fetch }) => {
  try {
    const body = await cachedJson<{ data?: { items?: Array<Record<string, unknown>> } }>(
      '/api/gallery?status=published&limit=200',
      fetch
    );
    return { images: body?.data?.items ?? [] };
  } catch {
    return { images: [] as Array<Record<string, unknown>> };
  }
};
