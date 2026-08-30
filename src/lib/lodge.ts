import { thumbUrl } from '$lib/img';
import type { Lodge } from '$lib/types';
import { normalizeTier, tierLabel, tierStars } from '$lib/tiers';

// Shared, honest helpers for rendering lodges/accommodations. Everything here is
// derived from the REAL Lodge fields — no invented ratings, prices or amenities.
// Comfort tiers use the shared vocabulary (Essential · Classic · Luxury · Ultra Luxury).

export const TYPE_LABELS: Record<string, string> = {
  tented_camp: 'Tented camp',
  lodge: 'Lodge',
  hotel: 'Hotel',
  mobile_camp: 'Mobile camp',
  treehouse: 'Treehouse'
};

// A 1–5 "stars" read for the comfort tier — a visual indicator, not a review score.
export const lodgeStars = (l: Lodge): number => tierStars(l.accommodation_level) || 4;

export const levelLabel = (l: Lodge) => tierLabel(l.accommodation_level);
export const typeLabel = (l: Lodge) => TYPE_LABELS[l.lodge_type] ?? l.lodge_type;

export const lodgeImage = (l: Lodge) => thumbUrl(l, 'hero_image_url', 'image_url');

// The single rating we surface: the higher of the two editorial scores we hold.
export const lodgeRating = (l: Lodge): number | null => {
  const r = Math.max(l.romantic_rating ?? 0, l.family_rating ?? 0);
  return r > 0 ? r : null;
};

export const lodgePriceLabel = (l: Lodge): string =>
  l.price_per_night_from != null
    ? `${l.currency ?? 'USD'} ${Math.round(l.price_per_night_from).toLocaleString()}`
    : '';

// A quick "best for" headline derived from the property's own best_for tags and tier.
export const lodgeBestForLabel = (l: Lodge): string => {
  const hay = `${(l.best_for ?? []).join(' ')} ${l.name}`.toLowerCase();
  if (/honeymoon|romance|romantic|couple/.test(hay)) return 'Perfect for couples';
  if (/family|families|children|kids|multi-?gen/.test(hay)) return 'Family favourite';
  if (/photograph/.test(hay)) return 'Photography paradise';
  if (/migration/.test(hay)) return 'Great Migration access';
  if (/solo/.test(hay)) return 'Solo friendly';
  if (/adventure|walking|active/.test(hay)) return 'Adventure base';
  const t = normalizeTier(l.accommodation_level);
  if (t === 'ultra_luxury') return 'Ultra-luxury escape';
  if (t === 'luxury') return 'Luxury escape';
  if (t === 'essential') return 'Great value stay';
  return '';
};

// ── The ported property model ──────────────────────────────────────────────
// Vocabularies for the columns added in 2026-08-27-lodge-property-detail.sql.
// Values are stored lowercase snake_case; these give them a human label.
// Only the vocabularies with a consumer today live here — the room, season and
// meal-plan maps arrive with the rooms and rates sections that will use them,
// rather than sitting here unused.

/**
 * Look a value up. A MISS RETURNS '' ON PURPOSE, so the caller's truthiness
 * filter drops the cell entirely: on a public page a raw enum de-snaked into
 * "Four by four required" reads as a database leak, and saying nothing is
 * always better than saying it badly. Callers that want the raw value can
 * fall back themselves.
 */
const labelFrom = (map: Record<string, string>, value?: string | null): string =>
  (value ? map[value] : '') ?? '';

/**
 * `settings` is a free-text text[] whose vocabulary is editorial and expected to
 * grow, so this maps the values the migration proposes and drops anything else
 * — better a shorter list than "inside_national_park" printed at a reader.
 */
export const SETTING_LABELS: Record<string, string> = {
  inside_national_park: 'Inside the national park',
  outside_national_park: 'Outside the park',
  conservation_area: 'Conservation area',
  private_reserve: 'Private reserve',
  beachfront: 'Beachfront',
  island: 'Island',
  city: 'City',
  countryside: 'Countryside',
  mountain: 'Mountain',
  remote_wilderness: 'Remote wilderness'
};

export const ROAD_ACCESS_LABELS: Record<string, string> = {
  all_vehicles: 'All vehicles',
  four_by_four_recommended: '4\u00d74 recommended',
  four_by_four_required: '4\u00d74 required',
  seasonal_access: 'Seasonal access',
  fly_in_only: 'Fly-in only'
};

// 'unknown' is deliberately unmapped: it is the absence of a fact, not a fact.
export const ACCESSIBILITY_LABELS: Record<string, string> = {
  fully_accessible: 'Fully accessible',
  partially_accessible: 'Partially accessible',
  not_accessible: 'Not step-free'
};

export const ELECTRICITY_LABELS: Record<string, string> = {
  twenty_four_hours: 'Mains power, 24 hours',
  limited_hours: 'Power at set hours',
  solar_only: 'Solar only',
  generator_backup: 'Generator backup',
  no_reliable_power: 'No reliable power'
};

export const WIFI_LABELS: Record<string, string> = {
  property_wide: 'Across the property',
  common_areas_only: 'Common areas only',
  rooms_only: 'In the rooms only',
  limited: 'Limited',
  // Renders on purpose. No booking site tells you the wifi does not work.
  not_available: 'Not available'
};

/** Mapped setting labels, in the order stored; unrecognised values are dropped. */
export const settingLabels = (l: Lodge): string[] =>
  (l.settings ?? []).map((v) => SETTING_LABELS[v]).filter(Boolean);

export const roadAccessLabel = (l: Lodge) => labelFrom(ROAD_ACCESS_LABELS, l.road_accessibility);
export const accessibilityLabel = (l: Lodge) => labelFrom(ACCESSIBILITY_LABELS, l.accessibility);
export const electricityLabel = (l: Lodge) => labelFrom(ELECTRICITY_LABELS, l.electricity_availability);
export const wifiLabel = (l: Lodge) => labelFrom(WIFI_LABELS, l.wifi_availability);

/** Where the property sits, most specific part first, de-duplicated. */
export const lodgePlaceLine = (l: Lodge): string => {
  const seen = new Set<string>();
  return [l.park_area, l.destinations?.name, l.region, l.country]
    .map((p) => (p ?? '').trim())
    .filter((p) => p && !seen.has(p.toLowerCase()) && seen.add(p.toLowerCase()))
    .join(' · ');
};
