import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import type { Comparison } from '$lib/types';

/**
 * The comparison, server-rendered. It was fetched only in the browser, so the
 * HTML that search engines and AI assistants received was a loading spinner:
 * no verdict, no dimensions and none of the FAQ answers the page exists to give.
 *
 * Only a definite "no such record" is a 404, and a draft is treated as one (the
 * single-record endpoint does not filter by status). If the API is unreachable
 * the page still renders and its own fetch retries in the browser.
 */
export const load: PageLoad = async ({ fetch, params }) => {
  let res: Response | null = null;
  try {
    res = await fetch(`/api/comparisons/${encodeURIComponent(params.slug)}`);
  } catch {
    res = null;
  }
  if (res?.status === 404) throw error(404, 'That comparison is not available.');

  let comparison: Comparison | null = null;
  if (res?.ok) {
    try {
      comparison = ((await res.json()) as { data?: Comparison })?.data ?? null;
    } catch {
      comparison = null;
    }
  }

  if (comparison?.status && comparison.status !== 'published') {
    throw error(404, 'That comparison is not available.');
  }

  return { comparison };
};
