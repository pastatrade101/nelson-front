import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import type { Destination, SafariEssential, Tour } from '$lib/types';
import { cachedJson } from '$lib/cache';

/** `kenya-safaris` -> `Kenya`; `south-africa-safaris` -> `South Africa`. */
const countryFromSlug = (slug: string) =>
  slug
    .replace(/-safaris$/, '')
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const listOf = <T>(body: { data?: { items?: T[] } } | undefined): T[] => body?.data?.items ?? [];

/**
 * A country hub — the commercial gateway for one destination country.
 *
 * The page is entirely data-driven: everything on it comes from records tagged
 * with this country, so `/kenya-safaris` becomes a real page the moment a Kenya
 * destination or trip is published, with no code change.
 *
 * Until then it 404s. That is the point — the master site map's principle 7 is
 * explicit that empty Kenya/Rwanda pages must not exist just for future-proofing,
 * and an unpopulated country hub is a doorway page by another name.
 */
export const load: PageLoad = async ({ fetch, params }) => {
  const country = countryFromSlug(params.hub);
  const q = encodeURIComponent(country);

  // Each is isolated: the tours query depends on the `countries` column added by
  // the 2026-08-26-tour-countries migration, and the hub should still render from
  // destinations alone if that has not been applied yet.
  const [destinations, tours, essentials] = await Promise.all([
    cachedJson<{ data?: { items?: Destination[] } }>(`/api/destinations?country=${q}&limit=100`, fetch)
      .then(listOf<Destination>)
      .catch(() => [] as Destination[]),
    cachedJson<{ data?: { items?: Tour[] } }>(`/api/tours?country=${q}&limit=100`, fetch)
      .then(listOf<Tour>)
      .catch(() => [] as Tour[]),
    cachedJson<{ data?: { items?: SafariEssential[] } }>(`/api/safari-essentials?country=${q}&limit=12`, fetch)
      .then(listOf<SafariEssential>)
      .catch(() => [] as SafariEssential[])
  ]);

  if (!destinations.length && !tours.length) {
    throw error(404, `We do not run safaris in ${country} yet.`);
  }

  return { country, destinations, tours, essentials };
};
