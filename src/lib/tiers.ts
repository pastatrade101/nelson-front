// ----------------------------------------------------------------------------
// Comfort tiers — the single source of truth for tour `budget_tier` AND lodge
// `accommodation_level`. Stored keys essential · classic · luxury ·
// ultra_luxury are SHOWN as Classic · Mid-Luxury · Luxury · Ultra Luxury
// (founder's task list 2.1, Nov 2026); the keys themselves never change.
// `normalizeTier` maps every historical value (budget, mid_range, luxury_plus,
// and the tour importer's Signature / Prestige steps) onto the keys, so
// existing data filters and displays correctly without a migration.
// ----------------------------------------------------------------------------

export type TierKey = 'essential' | 'classic' | 'luxury' | 'ultra_luxury';

export const TIER_KEYS: TierKey[] = ['essential', 'classic', 'luxury', 'ultra_luxury'];

export const TIER_LABELS: Record<TierKey, string> = {
  essential: 'Classic',
  classic: 'Mid-Luxury',
  luxury: 'Luxury',
  ultra_luxury: 'Ultra Luxury'
};

// Sort/ordering rank (low → high).
export const TIER_RANK: Record<TierKey, number> = { essential: 0, classic: 1, luxury: 2, ultra_luxury: 3 };

// A 1–5 "stars" read for lodges — a visual tier indicator, not a review score.
export const TIER_STARS: Record<TierKey, number> = { essential: 3, classic: 4, luxury: 5, ultra_luxury: 5 };

// Every historical / alternate spelling → canonical key.
const ALIAS: Record<string, TierKey> = {
  budget: 'essential', comfortable: 'essential', essential: 'essential',
  mid_range: 'classic', midrange: 'classic', standard: 'classic', classic: 'classic',
  mid_luxury: 'classic', midluxury: 'classic', signature: 'classic',
  luxury: 'luxury', prestige: 'luxury',
  luxury_plus: 'ultra_luxury', luxuryplus: 'ultra_luxury', ultra_luxury: 'ultra_luxury', ultraluxury: 'ultra_luxury'
};

/** Map any stored tier value onto a canonical key (or '' when unknown/empty). */
export const normalizeTier = (v?: string | null): TierKey | '' => {
  if (!v) return '';
  const k = String(v).toLowerCase().trim().replace(/[\s-]+/g, '_');
  return ALIAS[k] ?? (TIER_KEYS.includes(k as TierKey) ? (k as TierKey) : '');
};

/** Human label for any stored tier value ('' → '', unknown → the raw value). */
export const tierLabel = (v?: string | null): string => {
  const k = normalizeTier(v);
  return k ? TIER_LABELS[k] : v ? String(v) : '';
};

/** Sort rank for any stored tier value (unknown → -1). */
export const tierRank = (v?: string | null): number => {
  const k = normalizeTier(v);
  return k ? TIER_RANK[k] : -1;
};

/** Star read (0 when unknown). */
export const tierStars = (v?: string | null): number => {
  const k = normalizeTier(v);
  return k ? TIER_STARS[k] : 0;
};

/** Options for admin/select dropdowns (no "Not set" head — add it in the caller). */
export const TIER_OPTIONS = TIER_KEYS.map((k) => ({ value: k, label: TIER_LABELS[k] }));

/**
 * Every tier a tour can be booked at, lowest first: the "Available comfort
 * tiers" ticked in the tour editor, or, for a tour nobody has ticked yet, its
 * single budget tier. One page per route is sold at several levels, so the
 * comfort filter, cards and AI matching all read this rather than
 * `budget_tier` alone. `budget_tier` stays the level the "From" price is for.
 */
export const tourTierKeys = (tour?: { comfort_tiers?: unknown; budget_tier?: unknown } | null): TierKey[] => {
  if (!tour) return [];
  const ticked = Array.isArray(tour.comfort_tiers)
    ? tour.comfort_tiers.map((value) => normalizeTier(String(value))).filter((key): key is TierKey => Boolean(key))
    : [];
  const keys = ticked.length ? ticked : [normalizeTier(typeof tour.budget_tier === 'string' ? tour.budget_tier : null)].filter((key): key is TierKey => Boolean(key));
  return [...new Set(keys)].sort((a, b) => TIER_RANK[a] - TIER_RANK[b]);
};

/**
 * The tour's comfort levels as one short label for cards and tables:
 * "Luxury", "Classic · Luxury", or "Classic to Luxury" for three or more
 * consecutive levels (a range reads shorter than a list on a card).
 */
export const tourTierLabel = (tour?: { comfort_tiers?: unknown; budget_tier?: unknown } | null): string => {
  const keys = tourTierKeys(tour);
  if (!keys.length) return '';
  const consecutive = keys.every((key, i) => i === 0 || TIER_RANK[key] === TIER_RANK[keys[i - 1]] + 1);
  if (keys.length >= 3 && consecutive) return `${TIER_LABELS[keys[0]]} to ${TIER_LABELS[keys[keys.length - 1]]}`;
  return keys.map((key) => TIER_LABELS[key]).join(' · ');
};
