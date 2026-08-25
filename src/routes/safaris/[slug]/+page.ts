import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import type { MarketPage, MarketPageBlock, Testimonial, Tour } from '$lib/types';

// ─────────────────────────────────────────────────────────────────────────────
// One route, N market landing pages.
//
// Everything is SSR-loaded so a Google Ads visitor gets the finished page in the
// first HTML response (paid traffic is the least forgiving of a blank shell that
// fetches after hydration) and crawlers see the real copy.
//
// Every fetch uses a RELATIVE '/api/...' URL on purpose: server-side that is
// routed through src/routes/api/[...path]/+server.ts → BACKEND_ORIGIN, while the
// public API_URL used by $lib/api/client falls back to localhost inside the
// container and would break SSR in production. Client-side it is same-origin.
// ─────────────────────────────────────────────────────────────────────────────

// Hard cap so a mis-edited page (or a hostile `tour_ids` array) can never fan out
// into hundreds of backend requests.
const MAX_TOURS = 24;

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

/** Every tour id the page references, in first-seen order, de-duplicated. */
const referencedTourIds = (page: MarketPage): string[] => {
  const ids = [
    ...asArray<MarketPageBlock>(page.sections)
      .filter((block): block is Extract<MarketPageBlock, { type: 'packages' }> => block?.type === 'packages')
      .flatMap((block) => asArray<string>(block.tour_ids)),
    ...asArray<string>(page.featured_tour_ids)
  ].filter((id) => typeof id === 'string' && id.trim());

  return [...new Set(ids)].slice(0, MAX_TOURS);
};

const jsonOrNull = async (res: Response): Promise<Record<string, unknown> | null> => {
  if (!res.ok) return null;
  return (await res.json().catch(() => null)) as Record<string, unknown> | null;
};

export const load: PageLoad = async ({ params, fetch }) => {
  let marketPage: MarketPage | null = null;

  try {
    const res = await fetch(`/api/market-pages/${encodeURIComponent(params.slug)}`);
    const body = await jsonOrNull(res);
    marketPage = (body?.data ?? null) as MarketPage | null;
  } catch {
    // fall through to the 404 below — an unreachable backend must not render a
    // half-empty landing page against a live ad spend.
  }

  // Missing / unpublished → the standard SvelteKit error page (and a real 404
  // status, so Google drops the URL instead of indexing an empty template).
  if (!marketPage?.slug) throw error(404, 'Page not found');

  // Normalise the jsonb columns once so the component can loop without guards.
  const page: MarketPage = {
    ...marketPage,
    sections: asArray<MarketPageBlock>(marketPage.sections),
    featured_tour_ids: asArray<string>(marketPage.featured_tour_ids)
  };

  const tourIds = referencedTourIds(page);
  const wantsReviews = page.sections.some((block) => block?.type === 'reviews');

  // Resolve the referenced tours by id (GET /api/tours/:slug also accepts a uuid)
  // and the real testimonials for a reviews block. Both are best-effort: a block
  // whose data does not resolve simply renders nothing.
  const [tourResults, testimonialsResult] = await Promise.all([
    Promise.allSettled(tourIds.map((id) => fetch(`/api/tours/${encodeURIComponent(id)}`))),
    wantsReviews
      ? fetch('/api/testimonials?status=published&limit=6').catch(() => null)
      : Promise.resolve(null)
  ]);

  const tours: Tour[] = [];
  for (const result of tourResults) {
    if (result.status !== 'fulfilled') continue;
    const body = await jsonOrNull(result.value);
    const tour = (body?.data ?? null) as Tour | null;
    // Only publicly visible tours — a draft must not surface through a landing page.
    if (tour?.slug && (tour.status ?? 'published') === 'published') tours.push(tour);
  }

  let testimonials: Testimonial[] = [];
  if (testimonialsResult) {
    const body = await jsonOrNull(testimonialsResult);
    const data = (body?.data ?? null) as { items?: Testimonial[] } | null;
    testimonials = asArray<Testimonial>(data?.items);
  }

  return { page, tours, testimonials };
};
