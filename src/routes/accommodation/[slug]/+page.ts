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

  // Trips that actually SLEEP here, via the day -> property link. Distinct from
  // the destination-mates below, which merely pass through the same park. Empty
  // until a day is linked (or the migration is applied), which the page handles
  // by falling back rather than showing an empty section.
  let staysHere: Tour[] = [];
  try {
    const res = await fetch(`/api/lodges/${lodge.id}/itineraries`);
    if (res.ok) {
      const body = await res.json();
      staysHere = ((body?.data?.items ?? []) as Tour[]).slice(0, 6);
    }
  } catch {
    staysHere = [];
  }

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

  return { lodge, relatedLodges, safaris, staysHere };
};
