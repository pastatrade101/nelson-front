import type { PageLoad } from './$types';
import type { Tour } from '$lib/types';

// SSR-load the itineraries so the grid is in the initial HTML instead of a
// client-side fetch after hydration (which showed "Loading itineraries…" first).
// Filtering/sorting stays client-side and reactive over this list.
export const load: PageLoad = async ({ fetch }) => {
  try {
    const res = await fetch('/api/tours?status=published&limit=100');
    if (res.ok) {
      const body = await res.json();
      return { tours: (body?.data?.items ?? []) as Tour[], loadError: false };
    }
  } catch {
    // fall through to the error state below
  }
  return { tours: [] as Tour[], loadError: true };
};
