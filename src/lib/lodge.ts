import { thumbUrl } from '$lib/img';
import type { Lodge } from '$lib/types';

// Shared, honest helpers for rendering lodges/accommodations. Everything here is
// derived from the REAL Lodge fields — no invented ratings, prices or amenities.

export const LEVEL_LABELS: Record<string, string> = {
  budget: 'Comfortable',
  mid_range: 'Mid-range',
  luxury: 'Luxury',
  ultra_luxury: 'Ultra-luxury'
};

export const TYPE_LABELS: Record<string, string> = {
  tented_camp: 'Tented camp',
  lodge: 'Lodge',
  hotel: 'Hotel',
  mobile_camp: 'Mobile camp',
  treehouse: 'Treehouse'
};

// A 1–5 "stars" read for the luxury tier — a visual indicator, not a review score.
export const LEVEL_STARS: Record<string, number> = {
  budget: 3,
  mid_range: 4,
  luxury: 5,
  ultra_luxury: 5
};

export const levelLabel = (l: Lodge) => LEVEL_LABELS[l.accommodation_level] ?? l.accommodation_level;
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
  if (l.accommodation_level === 'ultra_luxury') return 'Ultra-luxury escape';
  if (l.accommodation_level === 'luxury') return 'Luxury escape';
  if (l.accommodation_level === 'budget') return 'Great value stay';
  return '';
};
