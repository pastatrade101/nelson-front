import type { PageLoad } from './$types';
import { error, isHttpError } from '@sveltejs/kit';
import type { Destination, FAQ, Lodge, Tour } from '$lib/types';

// SSR-load the destination so the page arrives with content already rendered,
// instead of shipping a blank shell that then fetches the ~70KB guide over a
// client round-trip. Runs on the server for direct hits and on the client for
// in-app navigations (which SvelteKit can also preload on link hover).
export const load: PageLoad = async ({ params, fetch }) => {
  try {
    const res = await fetch(`/api/destinations/${params.slug}`);
    if (res.status === 404) error(404, 'This destination could not be found.');
    if (res.ok) {
      const body = await res.json();
      if (body?.data) {
        const destination = body.data as Destination;
        // In the first response so crawlers get every question AND answer; they
        // used to arrive in the browser after the page, invisible to AI crawlers.
        // The stays here, in the first response too: published only, the same
        // records the accommodation index shows. One more than the page lays out,
        // so it knows whether to offer "see all".
        const list = async <T>(url: string): Promise<T[]> => {
          try {
            const r = await fetch(url);
            return r.ok ? (((await r.json())?.data?.items ?? []) as T[]) : [];
          } catch {
            return [];
          }
        };
        // Onward links in the first response too, so travellers and crawlers both
        // see them: tours connected to this destination (its own, or with a night
        // at one of its lodges), the stays here, and other destinations. Featured
        // safaris top the tour list up when few are connected yet.
        const [faqs, lodges, tours, featured, others] = await Promise.all([
          list<FAQ>(`/api/faqs?destination_id=${destination.id}&status=published&limit=60`),
          list<Lodge>(`/api/lodges?destination_id=${destination.id}&status=published&limit=13`),
          list<Tour & { match?: string }>(`/api/destinations/${destination.id}/tours?limit=9`),
          list<Tour>(`/api/tours?status=published&is_featured=true&limit=9`),
          list<Destination>(`/api/destinations?status=published&limit=12`)
        ]);
        const tourIds = new Set(tours.map((t) => t.id));
        const popularTours = tours.length >= 3 ? [] : featured.filter((t) => !tourIds.has(t.id)).slice(0, 6 - Math.min(tours.length, 3));
        const otherDestinations = others.filter((d) => d.id !== destination.id && d.slug !== destination.slug).slice(0, 6);
        // Records the guide's Tours / Accommodation blocks point at, so their cards
        // are in the server HTML too. Published only — a draft is never shown.
        const guideIds = (key: 'tour_ids' | 'lodge_ids') =>
          (destination.guide ?? []).flatMap((b) => ((b as Record<string, unknown>)[key] as string[] | undefined) ?? []);
        const wantTours = guideIds('tour_ids');
        const wantLodges = guideIds('lodge_ids');
        const [allTours, allLodges] = await Promise.all([
          wantTours.length ? list<Tour>('/api/tours?status=published&limit=200') : Promise.resolve([] as Tour[]),
          wantLodges.length ? list<Lodge>('/api/lodges?status=published&limit=200') : Promise.resolve([] as Lodge[])
        ]);
        const guideTours = allTours.filter((t) => wantTours.includes(t.id));
        const guideLodges = allLodges.filter((l) => wantLodges.includes(l.id));
        return { destination, faqs, lodges, tours, popularTours, otherDestinations, guideTours, guideLodges };
      }
    }
  } catch (cause) {
    if (isHttpError(cause)) throw cause;
  }
  error(503, 'This destination is temporarily unavailable. Please try again shortly.');
};
