import type { Lodge, TravelStyle } from '$lib/types';
import { tierRank } from '$lib/tiers';
import { styleTours } from '$lib/styleLinks';

/**
 * Where a lodge page sends people next (founder's task list 2.7): similar
 * lodges matched by area and tier, and the travel styles the lodge belongs to.
 * Read from data an editor set (tier picks, itineraries, the park area), plus
 * the founder's own rule for the migration's seasonal areas.
 */

/**
 * The area within a destination, from the free-text park area:
 * "Northern Serengeti (Kogatende, Mara River)" → "northern serengeti",
 * "Seasonal: Ndutu (calving season)" → "ndutu", "Jambiani, south-east coast" → "jambiani".
 */
export const areaKey = (parkArea?: string | null): string =>
  String(parkArea ?? '')
    .toLowerCase()
    .replace(/^\s*seasonal\s*:\s*/, '')
    .split(/[(,;]/)[0]
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Other lodges in the same destination, closest first: same area and tier,
 * then same area, then same tier, then the next tier up or down. Ties keep the
 * name order, so the list is stable but differs from lodge to lodge.
 */
export const similarLodges = (lodge: Lodge, candidates: Lodge[], count = 3): Lodge[] => {
  const area = areaKey(lodge.park_area);
  const rank = tierRank(lodge.accommodation_level);
  const score = (other: Lodge) => {
    const sameArea = Boolean(area) && areaKey(other.park_area) === area;
    const otherRank = tierRank(other.accommodation_level);
    const tierGap = rank >= 0 && otherRank >= 0 ? Math.abs(rank - otherRank) : 9;
    return (sameArea ? 4 : 0) + (tierGap === 0 ? 3 : tierGap === 1 ? 1 : 0);
  };
  return candidates
    .filter((other) => other.id !== lodge.id && other.slug && (!other.status || other.status === 'published'))
    .map((other) => ({ other, s: score(other) }))
    .sort((a, b) => b.s - a.s || String(a.other.name).localeCompare(String(b.other.name)))
    .slice(0, count)
    .map(({ other }) => other);
};

// The founder's example: camps in the migration's seasonal areas belong with
// the Great Migration style (Ndutu for the calving, Kogatende and the Mara
// River for the crossings).
const MIGRATION_AREAS = /\b(ndutu|kogatende|mara river|northern serengeti)\b/i;

/**
 * Travel styles a lodge belongs to, in the styles' own order: a style whose
 * price tiers pick this lodge, a style whose itineraries stay here, and the
 * Great Migration style for lodges in the migration's seasonal areas.
 */
export const stylesForLodge = <T extends { id?: unknown; category_id?: string | null }>(
  lodge: Lodge,
  styles: TravelStyle[],
  staysHere: T[]
): TravelStyle[] => {
  const picksLodge = (style: TravelStyle) =>
    (Array.isArray(style.sections) ? style.sections : []).some(
      (block) =>
        block?.type === 'tiers' &&
        Array.isArray(block.tiers) &&
        (block.tiers as Record<string, unknown>[]).some((tier) => Array.isArray(tier?.lodge_ids) && (tier.lodge_ids as unknown[]).map(String).includes(String(lodge.id)))
    );
  const migration = MIGRATION_AREAS.test(`${lodge.park_area ?? ''} ${lodge.name ?? ''}`);
  return styles
    .filter((style) => style?.slug && (!style.status || style.status === 'published'))
    .filter((style) => picksLodge(style) || styleTours(style, staysHere).length > 0 || (migration && /migration/i.test(style.slug)))
    .sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0));
};
