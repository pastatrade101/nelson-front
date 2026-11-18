import type { TourPriceOption } from './types';

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

// ----------------------------------------------------------------------------
// A tour's pricing options read as comfort levels (Classic, Mid-Luxury,
// Luxury). One per-person (or per-group) option is one level: its `price` is
// per adult and its description lists the lodges. The child price for a level
// comes from, in order:
//   1. the option's own "Price per child" field (`child_price`), or
//   2. a separate "Per child" option whose title is the level's title or starts
//      with it — "Classic", "Classic: child under 11", "Classic (under 11)".
//      Whatever follows the level's name becomes the note shown with the
//      price ("under 11").
// Anything else (single supplement, upgrade, discount, an unmatched child
// rate) is an extra, listed under the levels. Shared by the tour page's price
// table and the /tours price slider so both read the same levels.
// ----------------------------------------------------------------------------

export type ComfortRow = {
  id: string;
  title: string;
  /** The comfort level the title names, or '' when it names none. */
  tier: TierKey | '';
  adult: number | null;
  child: number | null;
  /** From a paired child option's title, e.g. "under 11". */
  childNote: string;
  perGroup: boolean;
  lodges: string;
};

const clean = (value?: string | null) => (value ?? '').trim();

const positive = (value: unknown): number | null => {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * The comfort level a pricing option's title names. The site's own labels win
 * ("Classic" is the Classic level, even though the stored key `classic` is
 * Mid-Luxury); the importer's old names (Essential, Signature, Prestige) follow.
 */
export const tierForTitle = (title?: string | null): TierKey | '' => {
  const t = clean(title).toLowerCase();
  if (!t) return '';
  return TIER_KEYS.find((key) => TIER_LABELS[key].toLowerCase() === t) ?? normalizeTier(t);
};

const SEPARATOR = /^[\s:–—\-(,|·/]+/;

/**
 * What follows the level's name in a child option's title, or null when the
 * title does not start with it. "Luxury" matches "Luxury: child under 11" but
 * not "Luxuryx"; the caller prefers the longest matching level, so
 * "Mid-Luxury: …" goes to Mid-Luxury, never to a level called "Mid".
 */
const afterLevelName = (childTitle: string, levelTitle: string): string | null => {
  const child = clean(childTitle);
  const level = clean(levelTitle);
  if (!level || !child.toLowerCase().startsWith(level.toLowerCase())) return null;
  const rest = child.slice(level.length);
  if (rest && !SEPARATOR.test(rest)) return null;
  return rest.replace(SEPARATOR, '').replace(/\)\s*$/, '').trim();
};

/** "child under 11" → "under 11"; "children 5–11" → "5–11". */
const childNoteFrom = (suffix: string) => suffix.replace(/^(children|child|kids|kid)\b[\s:,\-–—]*/i, '').trim();

const isLevel = (o: TourPriceOption) =>
  !isGridOption(o) && (!o.price_type || o.price_type === 'per_person' || o.price_type === 'per_group');

export const comfortPricing = (options: TourPriceOption[] = []): { rows: ComfortRow[]; extras: TourPriceOption[] } => {
  const sorted = [...options].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const levels = sorted.filter(isLevel);
  const childOptions = sorted.filter((o) => o.price_type === 'per_child' && !isGridOption(o));
  const paired = new Set<string>();

  const rows = levels.map((level): ComfortRow => {
    const levelLength = clean(level.title).length;
    let match: TourPriceOption | undefined;
    let note = '';
    for (const child of childOptions) {
      if (paired.has(child.id)) continue;
      const suffix = afterLevelName(child.title, level.title);
      if (suffix == null) continue;
      // A longer level title that also matches owns this child option.
      if (levels.some((other) => other !== level && clean(other.title).length > levelLength && afterLevelName(child.title, other.title) != null)) continue;
      match = child;
      note = childNoteFrom(suffix);
      break;
    }
    if (match) paired.add(match.id);
    const own = positive(level.child_price);
    return {
      id: level.id,
      title: clean(level.title),
      tier: tierForTitle(level.title),
      adult: positive(level.price),
      child: own ?? positive(match?.price),
      childNote: own != null ? '' : note,
      perGroup: level.price_type === 'per_group',
      lodges: clean(level.description)
    };
  });

  const levelIds = new Set(levels.map((o) => o.id));
  const extras = sorted.filter((o) => !levelIds.has(o.id) && !paired.has(o.id) && !isGridOption(o));
  return { rows, extras };
};

/** Adult price of each comfort level that has one, with the level it names. */
export const levelPrices = (options: TourPriceOption[] = []): Array<{ tier: TierKey | ''; price: number }> =>
  comfortPricing(options).rows
    .filter((row): row is ComfortRow & { adult: number } => row.adult != null)
    .map((row) => ({ tier: row.tier, price: row.adult }));

// ----------------------------------------------------------------------------
// The price grid (Nelson's brief, 16 Nov 2026): comfort level x group size.
// A grid option carries `comfort_tier` plus `travellers_from`/`travellers_to`;
// its `price` is the adult price per person for that many adults, and every
// option of a level carries the level's `lodges` and `child_price`. A price of
// 0 or blank shows as "On request". Tours whose options have no comfort_tier
// keep the older per-level section above.
// ----------------------------------------------------------------------------

export type GridBand = { from: number; to: number; key: string; label: string; note: string };

/** Fixed for now: 1, 2, 3–4, 5–6 travellers. */
export const GRID_BANDS: GridBand[] = [
  { from: 1, to: 1, key: '1', label: '1 traveller', note: 'private vehicle' },
  { from: 2, to: 2, key: '2', label: '2 travellers', note: '' },
  { from: 3, to: 4, key: '3-4', label: '3–4 travellers', note: '' },
  { from: 5, to: 6, key: '5-6', label: '5–6 travellers', note: '' }
];

export type GridCell = { band: GridBand; price: number | null };
export type GridColumn = { tier: TierKey; label: string; lodges: string; child: number | null; cells: GridCell[] };

export const isGridOption = (o: TourPriceOption): boolean =>
  Boolean(normalizeTier(o.comfort_tier)) && o.travellers_from != null && o.travellers_to != null;

/** The band an adult count falls in (null for 7 or more: price on request). */
export const bandFor = (adults: number): GridBand | null =>
  GRID_BANDS.find((band) => adults >= band.from && adults <= band.to) ?? null;

/**
 * The tour's price grid: one column per comfort level that has grid options,
 * lowest first. When the tour has comfort levels ticked in the editor, only
 * those are shown (a level priced but not ticked is hidden, as the brief asks).
 */
export const priceGrid = (
  tour: { comfort_tiers?: unknown; budget_tier?: unknown } | null | undefined,
  options: TourPriceOption[] = []
): GridColumn[] => {
  const grid = options.filter(isGridOption);
  if (!grid.length) return [];
  const ticked = Array.isArray(tour?.comfort_tiers) && tour.comfort_tiers.length ? new Set(tourTierKeys(tour)) : null;
  const tiers = [...new Set(grid.map((o) => normalizeTier(o.comfort_tier) as TierKey))]
    .filter((tier) => !ticked || ticked.has(tier))
    .sort((a, b) => TIER_RANK[a] - TIER_RANK[b]);

  return tiers.map((tier) => {
    const own = grid.filter((o) => normalizeTier(o.comfort_tier) === tier);
    const pick = (band: GridBand) =>
      own.find((o) => o.travellers_from === band.from && o.travellers_to === band.to) ??
      // An option entered by hand for a narrower size (e.g. exactly 3) still fills its band.
      own.find((o) => (o.travellers_from ?? 0) >= band.from && (o.travellers_to ?? 0) <= band.to);
    // The level's lodges and child price: the 2-traveller row's, else any row's.
    const pair = pick(GRID_BANDS[1]);
    const lodges = clean(pair?.lodges) || clean(own.find((o) => clean(o.lodges))?.lodges);
    const child = positive(pair?.child_price) ?? own.map((o) => positive(o.child_price)).find((n) => n != null) ?? null;
    return {
      tier,
      label: TIER_LABELS[tier],
      lodges,
      child,
      cells: GRID_BANDS.map((band) => ({ band, price: positive(pick(band)?.price) }))
    };
  });
};

/** The adult price per person for a level and adult count (null = on request). */
export const gridAdultPrice = (column: GridColumn | null | undefined, adults: number): number | null => {
  const band = bandFor(adults);
  if (!column || !band) return null;
  return column.cells.find((cell) => cell.band.key === band.key)?.price ?? null;
};

/**
 * The live estimate in the request form: adults x the adult price for that
 * level and adult count + children x the child price. Null ("Price on
 * request") when a price it needs is missing, or for 7 or more adults.
 */
export const gridEstimate = (column: GridColumn | null | undefined, adults: number, children: number): number | null => {
  const adult = gridAdultPrice(column, adults);
  if (adult == null) return null;
  if (children > 0 && column?.child == null) return null;
  return adults * adult + children * (column?.child ?? 0);
};

/** Each level's lowest adult price on the grid, for the /tours price slider. */
export const gridLevelPrices = (options: TourPriceOption[] = []): Array<{ tier: TierKey; price: number }> => {
  const lowest = new Map<TierKey, number>();
  for (const o of options.filter(isGridOption)) {
    const tier = normalizeTier(o.comfort_tier) as TierKey;
    const price = positive(o.price);
    if (price != null && price < (lowest.get(tier) ?? Infinity)) lowest.set(tier, price);
  }
  return [...lowest.entries()].map(([tier, price]) => ({ tier, price }));
};

export type TravelMonth = { value: string; label: string };

/** The next `count` months from `from` (this month first), plus "Not sure yet". */
export const travelMonths = (from: Date = new Date(), count = 18): TravelMonth[] => {
  const months: TravelMonth[] = [];
  for (let i = 0; i < count; i += 1) {
    const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + i, 1));
    const value = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    months.push({ value, label: d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }) });
  }
  months.push({ value: 'not_sure', label: 'Not sure yet' });
  return months;
};
