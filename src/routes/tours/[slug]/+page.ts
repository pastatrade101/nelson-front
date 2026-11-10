import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import type { Specialist, Testimonial, Tour } from '$lib/types';
import { loadFaqsFor } from '$lib/faqEntities';

/**
 * SSR-load the tour so the page's <title> and description are in the HTML that
 * crawlers and social scrapers receive.
 *
 * The component fetches the tour itself in onMount and keeps doing so — this
 * load exists alongside that, deliberately scoped to metadata rather than
 * replacing the component's own data flow, which drives pricing, availability
 * and currency and is more involved than a title fix should touch.
 *
 * Without this the head fell back to the bare brand name on every safari page,
 * because `tour` is null until the client fetch resolves.
 *
 * The relative `/api/...` path matters: it routes through the app's own proxy,
 * which is what makes this work server-side (see src/routes/api/[...path]).
 */
export const load: PageLoad = async ({ params, fetch }) => {
  let tour: Tour | null = null;
  let missing = false;
  try {
    const res = await fetch(`/api/tours/${params.slug}`);
    missing = res.status === 404;
    if (res.ok) {
      const body = await res.json();
      if (body?.data) tour = body.data as Tour;
    }
  } catch {
    // Fall through — the component's own fetch still populates the page.
  }
  // A tour that doesn't exist (or no longer does) is a real 404, not a 200 page
  // saying so: search engines drop it instead of indexing an empty shell.
  if (missing) error(404, 'This safari could not be found.');

  // The page's FAQs load here too, so every question and answer is in the
  // first response instead of arriving after hydration, where crawlers that do
  // not run JavaScript never saw them. Narrowest first: this tour's own
  // questions, then its category's, then the general library to fill.
  // Reviews left for this safari and the specialist who plans it (task list
  // 2.6): server-rendered with the page, so the reviews and their schema are in
  // the first response. Either list may be empty; the page shows what exists.
  const listOf = async <T>(url: string): Promise<T[]> => {
    try {
      const res = await fetch(url);
      if (!res.ok) return [];
      const body = (await res.json()) as { data?: { items?: T[] } };
      return body?.data?.items ?? [];
    } catch {
      return [];
    }
  };
  const [faqs, reviews, specialists] = await Promise.all([
    loadFaqsFor(fetch, { type: 'tours', id: tour?.id }, {
      borrow: [{ type: 'tour_categories', id: tour?.category_id }],
      limit: 10
    }),
    tour?.id ? listOf<Testimonial>(`/api/testimonials?tour_id=${encodeURIComponent(tour.id)}&status=published&limit=12`) : Promise.resolve([] as Testimonial[]),
    listOf<Specialist>('/api/specialists?status=published&limit=12')
  ]);
  const specialist = [...specialists].sort((a, b) => Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured)))[0] ?? null;

  return { tour, faqs, reviews: reviews.filter((r) => r.tour_id === tour?.id && r.message), specialist };
};
