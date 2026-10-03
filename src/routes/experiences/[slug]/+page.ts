import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

/**
 * Check the experience exists before the page renders, so a dead address
 * answers with a real 404 rather than a 200 page that says "not found" — the
 * kind search engines index as a soft 404.
 *
 * The API's single-record endpoint fetches by slug without a status filter, so
 * the draft check happens here. Only a definite "no such record" is a 404: if
 * the API itself is unreachable the page still renders and its own fetch
 * retries in the browser.
 */
export const load: PageLoad = async ({ fetch, params }) => {
  let res: Response | null = null;
  try {
    res = await fetch(`/api/categories/${encodeURIComponent(params.slug)}`);
  } catch {
    res = null;
  }
  if (res?.status === 404) throw error(404, 'That experience is not available.');

  let category: Record<string, unknown> | null = null;
  if (res?.ok) {
    try {
      category = ((await res.json()) as { data?: Record<string, unknown> })?.data ?? null;
    } catch {
      category = null;
    }
  }

  if (category && category.status && category.status !== 'published') {
    throw error(404, 'That experience is not available.');
  }

  return { category };
};
