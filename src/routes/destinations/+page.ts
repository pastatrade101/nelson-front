import type { PageLoad } from './$types';
import type { Destination } from '$lib/types';
import { cachedJson } from '$lib/cache';

// SSR-load the destinations list so the circuit cards are in the initial HTML
// (no "Loading destinations…" flash after hydration). Supporting content for the
// lower sections (journal, reviews, FAQs, tour stats) stays in the component's
// onMount — it isn't above-the-fold.
export const load: PageLoad = async ({ fetch }) => {
  try {
    const body = await cachedJson<{ data?: { items?: Destination[] } }>('/api/destinations?status=published&limit=100', fetch);
    return { destinations: body?.data?.items ?? [], loadFailed: false };
  } catch {
    // fall through to the error state
  }
  return { destinations: [] as Destination[], loadFailed: true };
};
