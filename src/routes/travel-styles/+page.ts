import type { PageLoad } from './$types';
import type { TravelStyle } from '$lib/types';
import { cachedJson } from '$lib/cache';

/**
 * The travel styles index, server-rendered.
 *
 * Was an onMount fetch, so the grid — and every link into the style pages —
 * existed only after hydration. Crawlers saw an empty section, which left the
 * style pages with no internal links despite sitting in the sitemap.
 */
export const load: PageLoad = async ({ fetch }) => {
  try {
    const body = await cachedJson<{ data?: { items?: TravelStyle[] } }>(
      '/api/travel-styles?status=published&limit=100',
      fetch
    );
    return { styles: body?.data?.items ?? [], loadFailed: false };
  } catch {
    // fall through to the error state
  }
  return { styles: [] as TravelStyle[], loadFailed: true };
};
