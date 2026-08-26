import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import type { Tour, TravelStyle } from '$lib/types';
import { cachedJson } from '$lib/cache';

/**
 * A travel style, server-rendered.
 *
 * Previously this page fetched everything in onMount, so the HTML a crawler saw
 * carried no heading, no promise and the site-wide <title> — the style pages
 * were effectively invisible to search despite being in the sitemap. Loading
 * here puts the content in the first response.
 *
 * The API's single-record endpoint fetches by slug without a status filter, so
 * the draft check happens here; otherwise an unpublished style would be readable
 * at its URL.
 */
export const load: PageLoad = async ({ fetch, params }) => {
  let style: TravelStyle | null = null;

  try {
    const body = await cachedJson<{ data?: TravelStyle }>(
      `/api/travel-styles/${encodeURIComponent(params.slug)}`,
      fetch
    );
    style = body?.data ?? null;
  } catch {
    style = null;
  }

  if (!style || (style.status && style.status !== 'published')) {
    throw error(404, 'That travel style is not available.');
  }

  // Siblings and the tour pool are secondary: a failure hides a section rather
  // than losing the page.
  const [others, tours] = await Promise.all([
    cachedJson<{ data?: { items?: TravelStyle[] } }>('/api/travel-styles?status=published&limit=100', fetch)
      .then((b) => (b?.data?.items ?? []).filter((s) => s.slug !== params.slug))
      .catch(() => [] as TravelStyle[]),
    cachedJson<{ data?: { items?: Tour[] } }>('/api/tours?status=published&limit=100', fetch)
      .then((b) => b?.data?.items ?? [])
      .catch(() => [] as Tour[])
  ]);

  return { style, others, tours };
};
