// ----------------------------------------------------------------------------
// Comfort tiers — the single source of truth for tour `budget_tier` AND lodge
// `accommodation_level`. Client vocabulary: Essential · Classic · Luxury ·
// Ultra Luxury. `normalizeTier` maps every historical value (budget, mid_range,
// luxury_plus, comfortable, …) onto the new keys, so existing data keeps
// filtering and displaying correctly before/after the DB is migrated.
// ----------------------------------------------------------------------------

export type TierKey = 'essential' | 'classic' | 'luxury' | 'ultra_luxury';

export const TIER_KEYS: TierKey[] = ['essential', 'classic', 'luxury', 'ultra_luxury'];

export const TIER_LABELS: Record<TierKey, string> = {
  essential: 'Essential',
  classic: 'Classic',
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
  luxury: 'luxury',
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
