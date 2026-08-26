import type { PageLoad } from './$types';
import type { SafariEssential } from '$lib/types';
import { cachedJson } from '$lib/cache';

/**
 * The Safari Essentials hub — the evergreen planning guides.
 *
 * The API returns published articles only (the controller sets
 * defaultStatus: 'published'), so the nine seeded topics stay invisible until
 * someone actually writes them. That is deliberate: a hub listing empty guides
 * would be exactly the thin-page pattern the site map's principle 9 forbids.
 */
export const load: PageLoad = async ({ fetch }) => {
  try {
    const body = await cachedJson<{ data?: { items?: SafariEssential[] } }>(
      '/api/safari-essentials?limit=100',
      fetch
    );
    return { articles: body?.data?.items ?? [], loadFailed: false };
  } catch {
    // fall through to the error state
  }
  return { articles: [] as SafariEssential[], loadFailed: true };
};
