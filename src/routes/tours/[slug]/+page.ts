import type { PageLoad } from './$types';
import type { FAQ, Tour } from '$lib/types';

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
  // The page's FAQs (the general ones) load here too, so every question and
  // answer is in the first response instead of arriving after hydration, where
  // crawlers that do not run JavaScript never saw them.
  const faqs = fetch('/api/faqs?destination_id=null&status=published&limit=10')
    .then((r) => (r.ok ? r.json() : null))
    .then((b) => ((b?.data?.items ?? []) as FAQ[]))
    .catch(() => [] as FAQ[]);
  let tour: Tour | null = null;
  try {
    const res = await fetch(`/api/tours/${params.slug}`);
    if (res.ok) {
      const body = await res.json();
      if (body?.data) tour = body.data as Tour;
    }
  } catch {
    // Fall through — the component's own fetch still populates the page.
  }
  return { tour, faqs: await faqs };
};
