import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import type { Lodge, Tour } from '$lib/types';

// SSR-load the property (and its destination-mates) so the page arrives rendered
// — better for SEO and first paint than a client round-trip. Runs on the server
// for direct hits and on the client for in-app navigations.
export const load: PageLoad = async ({ params, fetch }) => {
  let lodge: Lodge | null = null;
  try {
    const res = await fetch(`/api/lodges/${params.slug}`);
    if (res.ok) {
      const body = await res.json();
      lodge = (body?.data ?? null) as Lodge | null;
    }
  } catch {
    // fall through to 404 below
  }
  if (!lodge) throw error(404, 'Property not found');

  let relatedLodges: Lodge[] = [];
  let safaris: Tour[] = [];
  if (lodge.destination_id) {
    const [lRes, tRes] = await Promise.allSettled([
      fetch(`/api/lodges?destination_id=${lodge.destination_id}&status=published&limit=7`),
      fetch(`/api/tours?destination_id=${lodge.destination_id}&status=published&limit=6`)
    ]);
    if (lRes.status === 'fulfilled' && lRes.value.ok) {
      const body = await lRes.value.json();
      relatedLodges = ((body?.data?.items ?? []) as Lodge[]).filter((l) => l.id !== lodge!.id).slice(0, 3);
    }
    if (tRes.status === 'fulfilled' && tRes.value.ok) {
      const body = await tRes.value.json();
      safaris = ((body?.data?.items ?? []) as Tour[]).slice(0, 3);
    }
  }

  return { lodge, relatedLodges, safaris };
};
