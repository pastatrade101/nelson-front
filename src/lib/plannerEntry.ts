import type { Tour } from './types';
import type { Entry, PlannerCatalog } from './tripPlanner';

type Fetch = typeof globalThis.fetch;
type Named = { id?: string; slug?: string; title?: string; name?: string; status?: string } | null | undefined;

/** A form with no trip ideas yet: every step still works without them. */
export const EMPTY_CATALOG: PlannerCatalog = { tours: [], destinations: [], available: false };

const getData = async (fetch: Fetch, path: string) => {
  const response = await fetch(`/api/${path}`);
  if (!response.ok) throw new Error('Catalogue unavailable');
  const body = await response.json();
  if (!body?.data || body.success === false) throw new Error('Catalogue unavailable');
  return body.data;
};

/** The published tours and destinations, for trip ideas and prefill. An outage gives an empty catalogue. */
export const loadCatalog = async (fetch: Fetch): Promise<PlannerCatalog> => {
  const [tours, destinations] = await Promise.allSettled([
    getData(fetch, 'tours?status=published&limit=200'),
    getData(fetch, 'destinations?status=published&limit=100')
  ]);
  return {
    tours: tours.status === 'fulfilled' ? (tours.value.items || []).filter((t: Tour) => t.status === 'published') : [],
    destinations: destinations.status === 'fulfilled' ? destinations.value.items || [] : [],
    available: tours.status === 'fulfilled'
  };
};

const entryFor = (url: URL): Entry => {
  const params: Record<string, string[]> = {};
  for (const [key, value] of url.searchParams) (params[key] ||= []).push(value);
  return { url: `${url.pathname}${url.search}`, params };
};
const asTour = (t: Named) => (t?.status === 'published' && t.id && t.slug ? { id: t.id, slug: t.slug, title: t.title ?? '' } : undefined);
const asLodge = (l: Named) => (l?.status === 'published' && l.slug ? { slug: l.slug, name: l.name ?? '' } : undefined);

/**
 * The form's starting point without a network round trip, from what is already
 * in hand: the catalogue (if loaded) and the tour or lodge on the current page.
 * Null when the address names a tour or lodge that is only on the server.
 */
export const quickPlanner = (url: URL, catalog: PlannerCatalog, here: { tour?: Named; lodge?: Named } = {}): { catalog: PlannerCatalog; entry: Entry } | null => {
  const entry = entryFor(url);
  const tourSlug = url.searchParams.get('tour');
  const lodgeSlug = url.searchParams.get('lodge');
  let tours = catalog.tours;
  if (tourSlug) {
    const known = tours.find((t) => t.slug === tourSlug) ?? (here.tour?.slug === tourSlug ? (here.tour as Tour) : undefined);
    if (!known) return null;
    entry.tour = asTour(known);
    if (entry.tour && !tours.some((t) => t.id === known.id)) tours = [...tours, known];
  }
  if (lodgeSlug) {
    if (here.lodge?.slug !== lodgeSlug) return null;
    entry.lodge = asLodge(here.lodge);
  }
  return { catalog: { ...catalog, tours }, entry };
};

/**
 * The quote form's starting point: the published catalogue (for trip ideas and
 * prefill) and the address it was opened with (`?tour=…&lodge=…&month=…`).
 * Shared by the /plan-my-trip page and the popup, so both behave the same.
 * A catalogue outage still returns a usable form.
 */
export const loadPlanner = async (fetch: Fetch, url: URL, preloaded?: PlannerCatalog): Promise<{ catalog: PlannerCatalog; entry: Entry }> => {
  let catalog = preloaded ?? (await loadCatalog(fetch));
  const entry = entryFor(url);
  const tourSlug = url.searchParams.get('tour');
  const lodgeSlug = url.searchParams.get('lodge');
  await Promise.all([
    tourSlug ? (async () => {
      const tour: Tour | null = catalog.tours.find((t) => t.slug === tourSlug) || await getData(fetch, `tours/${encodeURIComponent(tourSlug)}`).catch(() => null);
      entry.tour = asTour(tour);
      // Prefill reads the tour from the catalogue, so a tour fetched on its own joins it.
      if (tour && entry.tour && !catalog.tours.some((t) => t.id === tour.id)) catalog = { ...catalog, tours: [...catalog.tours, tour] };
    })() : null,
    lodgeSlug ? (async () => { entry.lodge = asLodge(await getData(fetch, `lodges/${encodeURIComponent(lodgeSlug)}`).catch(() => null)); })() : null
  ]);
  return { catalog, entry };
};
