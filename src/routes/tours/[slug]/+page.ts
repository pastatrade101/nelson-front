import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import type { Tour } from '$lib/types';
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
  const faqs = await loadFaqsFor(fetch, { type: 'tours', id: tour?.id }, {
    borrow: [{ type: 'tour_categories', id: tour?.category_id }],
    limit: 10
  });

  return { tour, faqs };
};
