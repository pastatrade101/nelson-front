import type { PageLoad } from './$types';
import type { Destination, FAQ } from '$lib/types';

// SSR-load the destination so the page arrives with content already rendered,
// instead of shipping a blank shell that then fetches the ~70KB guide over a
// client round-trip. Runs on the server for direct hits and on the client for
// in-app navigations (which SvelteKit can also preload on link hover).
export const load: PageLoad = async ({ params, fetch }) => {
  try {
    const res = await fetch(`/api/destinations/${params.slug}`);
    if (res.ok) {
      const body = await res.json();
      if (body?.data) {
        const destination = body.data as Destination;
        // In the first response so crawlers get every question AND answer; they
        // used to arrive in the browser after the page, invisible to AI crawlers.
        let faqs: FAQ[] = [];
        try {
          const f = await fetch(`/api/faqs?destination_id=${destination.id}&status=published&limit=60`);
          if (f.ok) faqs = ((await f.json())?.data?.items ?? []) as FAQ[];
        } catch {
          faqs = [];
        }
        return { destination, faqs };
      }
    }
  } catch {
    // Fall through — the page component falls back to a bundled placeholder.
  }
  return { destination: null, faqs: [] as FAQ[] };
};
