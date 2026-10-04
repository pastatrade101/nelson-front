export type AccommodationIssue = { field: string; section: string; message: string };
/** Input bindings may materialise absent fields as empty strings; that is not an edit. */
export const accommodationSnapshot = (value: unknown): string => JSON.stringify(value, (_key, item) =>
  item === null || item === undefined || item === '' ? undefined : typeof item === 'number' ? String(item) : item);
export const changedAccommodationFields = (initial: Record<string, unknown>, current: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(current).filter(([key, value]) => JSON.stringify(initial[key]) !== JSON.stringify(value)));

/** Blank numeric fields remain null, never a fabricated zero. */
export function accommodationDetailsPayload(details: Record<string, any[]>) {
  const numeric = ['max_adults', 'max_children', 'max_guests', 'unit_count', 'rack_rate', 'net_rate', 'single_rate', 'double_rate', 'triple_rate', 'child_rate', 'single_supplement'];
  const clean = (row: Record<string, any>) => Object.fromEntries(Object.entries(row).map(([key, value]) =>
    [key, numeric.includes(key) && (value === '' || value === undefined) ? null : value]));
  return {
    highlights: details.highlights.map(row => ({ ...row })),
    rooms: details.rooms.map(row => ({ ...clean(row), images: (row.lodge_room_images ?? []).map((image: Record<string, unknown>) => ({ ...image })) })),
    rates: details.rates.map(clean),
    inclusions: details.inclusions.map(row => ({ ...row }))
  };
}

export function validateAccommodation(form: Record<string, unknown>, details?: Record<string, any[]>): AccommodationIssue[] {
  const issues: AccommodationIssue[] = [];
  const add = (field: string, section: string, message: string) => issues.push({ field, section, message });
  const text = (key: string) => String(form[key] ?? '').trim();
  if (text('name').length < 2) add('name', 'overview', 'Property name needs at least 2 characters.');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(text('slug')) || text('slug').length < 2) add('slug', 'overview', 'Use a page address with at least 2 lowercase letters or numbers, separated by hyphens.');
  if (text('short_description').length > 500) add('short_description', 'overview', 'Keep the summary within 500 characters.');
  const ranges: [string, string, number, number, boolean?][] = [
    ['recommended_nights', 'location', 1, 30, true], ['latitude', 'location', -90, 90], ['longitude', 'location', -180, 180],
    ['minimum_child_age', 'guests', 0, 18, true], ['romantic_rating', 'guests', 0, 10], ['family_rating', 'guests', 0, 10], ['price_per_night_from', 'publishing', 0, Infinity]
  ];
  for (const [field, section, min, max, integer] of ranges) {
    if (!text(field)) continue;
    const n = Number(form[field]);
    if (!Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n))) add(field, section, `${field.replaceAll('_', ' ')} must be ${integer ? 'a whole number ' : ''}${max === Infinity ? 'zero or more' : `between ${min} and ${max}`}.`);
  }
  if (!/^[a-z]{3}$/i.test(text('currency'))) add('currency', 'publishing', 'Enter a three-letter currency code, such as USD.');
  for (const [field, section] of [['hero_image_url','images'], ['image_url','images'], ['mobile_hero_image_url','images'], ['social_image_url','images'], ['google_maps_url','location'], ['website_url','publishing']]) {
    if (!text(field)) continue;
    try { if (!['https:', 'http:'].includes(new URL(text(field)).protocol)) throw new Error(); }
    catch { add(field, section, `${field.replaceAll('_', ' ')} needs a complete https:// or http:// address.`); }
  }
  if (details) {
    for (const [key, field, label] of [['highlights', 'title', 'highlight'], ['rooms', 'name', 'room'], ['inclusions', 'title', 'inclusion']]) {
      details[key].forEach((row, i) => { if (!String(row[field] ?? '').trim()) add(`${label === 'room' ? 'room_name' : label}_${i}`, 'details', `Add a ${field} for ${label} ${i + 1}, or remove that empty row.`); });
    }
    details.rates.forEach((row, i) => {
      if (!String(row.season_name ?? '').trim() && ![row.rack_rate, row.net_rate, row.single_rate, row.double_rate].some(value => Number(value) > 0)) add(`rate_name_${i}`, 'details', `Give season ${i + 1} a name so it can be saved, including a free or child-only rate.`);
      if (row.valid_from && row.valid_until && row.valid_from > row.valid_until) add(`rate_until_${i}`, 'details', `Season ${i + 1}: the end date must follow the start date.`);
      if (!/^[a-z]{3}$/i.test(String(row.currency ?? ''))) add(`rate_currency_${i}`, 'details', `Season ${i + 1} needs a three-letter currency.`);
      for (const key of ['rack_rate', 'net_rate', 'single_rate', 'double_rate', 'triple_rate', 'child_rate', 'single_supplement']) {
        if (row[key] != null && row[key] !== '' && (!Number.isFinite(Number(row[key])) || Number(row[key]) < 0)) add(`rate_${key.replace('_rate', '').replace('single_supplement', 'supp')}_${i}`, 'details', `Season ${i + 1}: rates cannot be negative or invalid.`);
      }
    });
    details.rooms.forEach((room, i) => {
      for (const [key, field, min, max] of [['max_adults', 'adults', 0, 30], ['max_children', 'children', 0, 30], ['max_guests', 'guests', 1, 50], ['unit_count', 'units', 1, 1000]] as const) {
        const value = room[key];
        if (value != null && value !== '' && (!Number.isInteger(Number(value)) || Number(value) < min || Number(value) > max)) add(`room_${field}_${i}`, 'details', `Room ${i + 1}: ${key.replaceAll('_', ' ')} must be a whole number between ${min} and ${max}.`);
      }
      for (const image of room.lodge_room_images ?? []) {
        if (!String(image.image_url ?? '').trim()) add(`room_name_${i}`, 'details', `Room ${i + 1} has an empty photo. Choose an image or remove the unused photo slot.`);
      }
    });
  }
  return issues;
}

/** Each completed write is acknowledged separately; failed writes leave edits available for retry. */
export async function saveAccommodationSections(operations: { property?: () => Promise<void>; gallery?: () => Promise<void>; details?: () => Promise<void> }) {
  const completed: string[] = [];
  for (const section of ['property', 'gallery', 'details'] as const) {
    const operation = operations[section];
    if (!operation) continue;
    try { await operation(); completed.push(section); }
    catch (error) { return { completed, failed: section, error }; }
  }
  return { completed, failed: null, error: null };
}
