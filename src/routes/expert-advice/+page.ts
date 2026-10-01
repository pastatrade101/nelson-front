import type { PageLoad } from './$types';
import type { FAQ } from '$lib/types';
import { cachedJson } from '$lib/cache';

/**
 * The page's FAQs, server-rendered. They were fetched in onMount, so the HTML a
 * crawler received had none of the questions or answers on the page whose job
 * is to answer them.
 */
export const load: PageLoad = async ({ fetch }) => {
  try {
    const body = await cachedJson<{ data?: { items?: FAQ[] } }>('/api/faqs?destination_id=null&status=published&limit=8', fetch);
    return { faqs: body?.data?.items ?? [] };
  } catch {
    return { faqs: [] as FAQ[] };
  }
};
