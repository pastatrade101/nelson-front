import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import type { SafariEssential } from '$lib/types';
import { cachedJson } from '$lib/cache';

/**
 * One Safari Essentials guide.
 *
 * A draft must 404 rather than render. The API's single-record endpoint fetches
 * by slug without a status filter, so the check happens here — otherwise any of
 * the nine seeded topics would be readable at its URL before it was written.
 */
export const load: PageLoad = async ({ fetch, params }) => {
  let article: SafariEssential | null = null;

  try {
    const body = await cachedJson<{ data?: SafariEssential }>(
      `/api/safari-essentials/${encodeURIComponent(params.slug)}`,
      fetch
    );
    article = body?.data ?? null;
  } catch {
    article = null;
  }

  if (!article || article.status !== 'published') {
    throw error(404, 'That guide is not available yet.');
  }

  return { article };
};
