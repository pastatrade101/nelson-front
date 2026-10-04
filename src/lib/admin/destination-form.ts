/** Send only intentionally changed fields, preserving omitted and legacy data. */
export function destinationChanges<T extends Record<string, unknown>>(initial: T, current: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(current).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(initial[key]))
  ) as Partial<T>;
}

export type DestinationIssue = { field: string; section: string; message: string };

export function validateDestination(values: Record<string, unknown>): DestinationIssue[] {
  const issues: DestinationIssue[] = [];
  const text = (key: string) => String(values[key] ?? '').trim();
  for (const [field, label] of [['name', 'Destination name'], ['country', 'Country'], ['slug', 'Page address']]) {
    if (text(field).length < 2) issues.push({ field, section: 'overview', message: `${label} needs at least 2 characters.` });
  }
  if (text('description') && text('description').length < 5) {
    issues.push({ field: 'description', section: 'overview', message: 'Add a little more detail to the overview (at least 5 characters).' });
  }
  const ranges: [string, string, number, number][] = [
    ['latitude', 'Latitude', -90, 90], ['longitude', 'Longitude', -180, 180],
    ['score_wildlife', 'Wildlife score', 0, 10], ['score_luxury', 'Luxury score', 0, 10],
    ['score_family', 'Family score', 0, 10], ['score_photography', 'Photography score', 0, 10],
    ['score_adventure', 'Adventure score', 0, 10], ['score_budget_from', 'Starting budget', 0, Infinity]
  ];
  for (const [field, label, min, max] of ranges) {
    if (!text(field)) continue;
    const value = Number(values[field]);
    if (!Number.isFinite(value) || value < min || value > max) {
      issues.push({ field, section: 'planning', message: max === Infinity ? `${label} must be zero or more.` : `${label} must be between ${min} and ${max}.` });
    }
  }
  for (const field of ['main_image_url', 'banner_image_url', 'og_image_url']) {
    if (!text(field)) continue;
    try { new URL(text(field)); } catch {
      issues.push({ field, section: 'images', message: `${field === 'main_image_url' ? 'Card' : field === 'banner_image_url' ? 'Banner' : 'Social sharing'} image needs a complete URL.` });
    }
  }
  return issues;
}
