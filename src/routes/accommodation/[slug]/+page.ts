import { error, isHttpError } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import type { Lodge, Tour, TravelStyle } from '$lib/types';
import { cachedJson } from '$lib/cache';
import { similarLodges, stylesForLodge } from '$lib/lodgeLinks';
import { loadFaqsFor } from '$lib/faqEntities';

// SSR-load the property (and its destination-mates) so the page arrives rendered
// — better for SEO and first paint than a client round-trip. Runs on the server
// for direct hits and on the client for in-app navigations.
export const load: PageLoad = async ({ params, fetch }) => {
  let lodge: Lodge | null = null;
  try {
    const res = await fetch(`/api/lodges/${params.slug}`);
    if (res.status === 404) throw error(404, 'Property not found');
    if (!res.ok) throw error(503, 'Accommodation is temporarily unavailable. Please try again.');
    if (res.ok) {
      const body = await res.json();
      lodge = (body?.data ?? null) as Lodge | null;
    }
  } catch (cause) {
    if (isHttpError(cause)) throw cause;
    throw error(503, 'Accommodation is temporarily unavailable. Please try again.');
  }
  // The single-record endpoint does not filter by status, so a draft or
  // archived property would otherwise be readable (and indexable) at its URL.
  if (!lodge || (lodge.status && lodge.status !== 'published')) throw error(404, 'Property not found');

  const json = async <T>(url: string): Promise<T | null> => {
    try {
      const res = await fetch(url);
      return res.ok ? ((await res.json()) as T) : null;
    } catch {
      return null;
    }
  };

  // Itineraries follow the data model, nothing fuzzier: trips with a day whose
  // accommodation is THIS property, then trips whose destination is its
  // destination. The destination itself is checked too, so the page only links
  // to a destination page that actually resolves.
  const destinationId = lodge.destination_id;
  const destinationSlug = lodge.destinations?.slug ?? '';
  const [staysBody, lodgesBody, toursBody, destinationBody, faqs, styles] = await Promise.all([
    json<{ data?: { items?: Tour[] } }>(`/api/lodges/${lodge.id}/itineraries`),
    // Every lodge in the destination, so "similar" can match by area and tier
    // rather than taking the same first few for every lodge.
    destinationId ? json<{ data?: { items?: Lodge[] } }>(`/api/lodges?destination_id=${destinationId}&status=published&limit=100`) : null,
    destinationId ? json<{ data?: { items?: Tour[] } }>(`/api/tours?destination_id=${destinationId}&status=published&limit=12`) : null,
    destinationSlug ? json<{ data?: unknown }>(`/api/destinations/${destinationSlug}`) : null,
    // Questions attached to this property first, general ones to round them out
    // — in the first response, so crawlers and AI assistants read the answers.
    loadFaqsFor(fetch, { type: 'lodges', id: lodge.id }, { fill: 6 }),
    cachedJson<{ data?: { items?: TravelStyle[] } }>('/api/travel-styles?status=published&limit=100', fetch)
      .then((b) => b?.data?.items ?? [])
      .catch(() => [] as TravelStyle[])
  ]);

  const staysHere = (staysBody?.data?.items ?? []).slice(0, 6);
  const stayIds = new Set(staysHere.map((t) => t.id));
  const safaris = (toursBody?.data?.items ?? []).filter((t) => !stayIds.has(t.id)).slice(0, 6);
  const relatedLodges = similarLodges(lodge, lodgesBody?.data?.items ?? []);
  const travelStyles = stylesForLodge(lodge, styles, staysHere).slice(0, 4);
  const destinationLive = Boolean(destinationBody?.data);

  return { lodge, relatedLodges, safaris, staysHere, destinationLive, faqs, travelStyles };
};
