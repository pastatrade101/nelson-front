import type { PageLoad } from './$types';
import type { Tour } from '$lib/types';

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
  try {
    const res = await fetch(`/api/tours/${params.slug}`);
    if (res.ok) {
      const body = await res.json();
      if (body?.data) return { tour: body.data as Tour };
    }
  } catch {
    // Fall through — the component's own fetch still populates the page.
  }
  return { tour: null };
};
