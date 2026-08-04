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
