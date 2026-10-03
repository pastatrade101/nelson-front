import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import type { Destination, Lodge, Tour, TravelStyle } from '$lib/types';
import { cachedJson } from '$lib/cache';
import { categoryForStyle } from '$lib/styleLinks';

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
  const [others, tours, categories] = await Promise.all([
    cachedJson<{ data?: { items?: TravelStyle[] } }>('/api/travel-styles?status=published&limit=100', fetch)
      .then((b) => (b?.data?.items ?? []).filter((s) => s.slug !== params.slug))
      .catch(() => [] as TravelStyle[]),
    cachedJson<{ data?: { items?: Tour[] } }>('/api/tours?status=published&limit=100', fetch)
      .then((b) => b?.data?.items ?? [])
      .catch(() => [] as Tour[]),
    cachedJson<{ data?: { items?: Array<{ id: string; name: string; slug: string }> } }>('/api/categories?status=published&limit=100', fetch)
      .then((b) => b?.data?.items ?? [])
      .catch(() => [] as Array<{ id: string; name: string; slug: string }>)
  ]);

  // Lodges picked inside price tiers. Same request as the accommodation index,
  // so it is usually already cached; skipped entirely when no tier picks any.
  const wantsLodges = (Array.isArray(style.sections) ? style.sections : []).some(
    (b) =>
      (b as Record<string, unknown>)?.type === 'tiers' &&
      Array.isArray((b as Record<string, unknown>).tiers) &&
      ((b as Record<string, unknown>).tiers as Record<string, unknown>[]).some((t) => Array.isArray(t?.lodge_ids) && (t.lodge_ids as unknown[]).length)
  );
  const lodges = wantsLodges
    ? await cachedJson<{ data?: { items?: Lodge[] } }>('/api/lodges?status=published&limit=200', fetch)
        .then((b) => b?.data?.items ?? [])
        .catch(() => [] as Lodge[])
    : [];

  // Destinations — for a `destinations` block, and so image panels naming real
  // destinations ("Where to go") render as destination cards. Same request as
  // the destinations index, so usually cached.
  const wantsDestinations = (Array.isArray(style.sections) ? style.sections : []).some((b) =>
    ['destinations', 'panels'].includes(String((b as Record<string, unknown>)?.type))
  );
  const destinations = wantsDestinations
    ? await cachedJson<{ data?: { items?: Destination[] } }>('/api/destinations?status=published&limit=100', fetch)
        .then((b) => b?.data?.items ?? [])
        .catch(() => [] as Destination[])
    : [];

  // The safari-style card this page belongs to, so "Browse itineraries" lists
  // that style's tours rather than a looser persona match.
  const category = categoryForStyle(style, categories);

  return { style, others, tours, lodges, destinations, categorySlug: category?.slug ?? null };
};
