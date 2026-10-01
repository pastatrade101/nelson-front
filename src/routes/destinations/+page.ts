import type { PageLoad } from './$types';
import type { Destination, FAQ } from '$lib/types';
import { cachedJson } from '$lib/cache';

// SSR-load the destinations list so the circuit cards are in the initial HTML
// (no "Loading destinations…" flash after hydration). Supporting content for the
// lower sections (journal, reviews, FAQs, tour stats) stays in the component's
// onMount — it isn't above-the-fold.
export const load: PageLoad = async ({ fetch, url }) => {
  // Only the FAQs this view shows go into the page — the spotlighted
  // destination's (?d=slug), else the general ones — so every question and
  // answer is in the server HTML without shipping all of them as page data.
  const faqsFor = (destinations: Destination[]) => {
    const slug = url.searchParams.get('d');
    const spot = slug && slug !== 'all' ? destinations.find((d) => d.slug === slug) : undefined;
    return cachedJson<{ data?: { items?: FAQ[] } }>(
      `/api/faqs?status=published&limit=60&destination_id=${spot ? spot.id : 'null'}`,
      fetch
    )
      .then((b) => b?.data?.items ?? [])
      .catch(() => [] as FAQ[]);
  };
  try {
    const body = await cachedJson<{ data?: { items?: Destination[] } }>('/api/destinations?status=published&limit=100', fetch);
    const destinations = body?.data?.items ?? [];
    return { destinations, loadFailed: false, faqs: await faqsFor(destinations) };
  } catch {
    // fall through to the error state
  }
  return { destinations: [] as Destination[], loadFailed: true, faqs: [] as FAQ[] };
};
