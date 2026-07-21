import type { PageLoad } from './$types';
import type { Destination } from '$lib/types';

// SSR-load the destination so the page arrives with content already rendered,
// instead of shipping a blank shell that then fetches the ~70KB guide over a
// client round-trip. Runs on the server for direct hits and on the client for
// in-app navigations (which SvelteKit can also preload on link hover).
export const load: PageLoad = async ({ params, fetch }) => {
  try {
    const res = await fetch(`/api/destinations/${params.slug}`);
    if (res.ok) {
      const body = await res.json();
      if (body?.data) return { destination: body.data as Destination };
    }
  } catch {
    // Fall through — the page component falls back to a bundled placeholder.
  }
  return { destination: null };
};
