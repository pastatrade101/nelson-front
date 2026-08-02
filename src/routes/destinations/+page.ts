import type { PageLoad } from './$types';
import type { Destination } from '$lib/types';

// SSR-load the destinations list so the circuit cards are in the initial HTML
// (no "Loading destinations…" flash after hydration). Supporting content for the
// lower sections (journal, reviews, FAQs, tour stats) stays in the component's
// onMount — it isn't above-the-fold.
export const load: PageLoad = async ({ fetch }) => {
  try {
    const res = await fetch('/api/destinations?status=published&limit=100');
    if (res.ok) {
      const body = await res.json();
      return { destinations: (body?.data?.items ?? []) as Destination[], loadFailed: false };
    }
  } catch {
    // fall through to the error state
  }
  return { destinations: [] as Destination[], loadFailed: true };
};
