/**
 * What a gallery photograph is OF.
 *
 * Distinct from the links a photograph already carries. `destination_id` and
 * `tour_id` say where it was taken and which trip it belongs to; the category
 * says what is in the frame. A lion on the Serengeti and a tent on the
 * Serengeti share a destination and belong in different sections, which is
 * exactly the grouping the destination link cannot express.
 *
 * Stored lowercase snake_case, like every other enum-ish column here. The
 * database column is plain text with no CHECK constraint — the vocabulary is
 * editorial and will grow — so this list and the matching zod enum in
 * gallery.schema.ts are what actually enforce it. Add to both.
 */
export const GALLERY_CATEGORIES = [
  'wildlife',
  'landscape',
  'safari_experience',
  'accommodation',
  'culture',
  'family',
  'food_and_dining',
  'beach',
  'guide_and_team',
  'vehicle',
  'destination',
  'aerial',
  'guest_experience'
] as const;

export type GalleryCategory = (typeof GALLERY_CATEGORIES)[number];

const LABELS: Record<string, string> = {
  wildlife: 'Wildlife',
  landscape: 'Landscape',
  safari_experience: 'Safari experience',
  accommodation: 'Accommodation',
  culture: 'Culture',
  family: 'Family',
  food_and_dining: 'Food & dining',
  beach: 'Beach',
  guide_and_team: 'Guide & team',
  vehicle: 'Vehicle',
  destination: 'Destination',
  aerial: 'Aerial',
  guest_experience: 'Guest experience'
};

/**
 * A miss returns '' rather than the raw value: on a public page an unmapped
 * "safari_experience" reads as a database leak, and the caller's truthiness
 * check then drops the chip or badge entirely.
 */
export const galleryCategoryLabel = (value?: string | null): string =>
  (value ? LABELS[value] : '') ?? '';

/** Options for a <select>, with a leading blank for "not categorised". */
export const GALLERY_CATEGORY_OPTIONS = [
  { value: '', label: 'Uncategorised' },
  ...GALLERY_CATEGORIES.map((value) => ({ value, label: LABELS[value] }))
];
