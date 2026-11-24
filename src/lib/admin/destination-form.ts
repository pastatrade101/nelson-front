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

// ── The destination page's own fields (destinations.page) ──────────────────
// The editor works on a full, flat shape (three highlight cards, every "your
// way" field as a string) so inputs can bind to it; what is saved keeps only
// what was filled in, and nothing at all when the page has no fields yet.

const WAY_KEYS = ['label', 'title', 'body', 'image_url', 'image_alt', 'nights', 'best_area', 'extra_label', 'extra_value', 'link_label', 'link_href'] as const;
export type EditableWay = Record<(typeof WAY_KEYS)[number], string>;
export type EditablePage = {
  short_name: string;
  in_short: string;
  reviewed_by: string;
  highlights: { title: string; text: string }[];
  ways: EditableWay[];
  guide_quote: { quote: string; name: string; role: string; image_url: string };
  pairs_with: string[];
};

const str = (value: unknown) => (typeof value === 'string' ? value : '');
const obj = (value: unknown) => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {});
// Links and photos must be a page on this site or a web address.
const safeHref = (value: string) => (/^(\/(?!\/)|https?:\/\/)/i.test(value) ? value : '');

export const emptyWay = (): EditableWay => Object.fromEntries(WAY_KEYS.map((key) => [key, ''])) as EditableWay;

export function editablePage(page: unknown): EditablePage {
  const p = obj(page);
  const highlights = Array.isArray(p.highlights) ? p.highlights.map(obj) : [];
  const quote = obj(p.guide_quote);
  return {
    short_name: str(p.short_name),
    in_short: str(p.in_short),
    reviewed_by: str(p.reviewed_by),
    highlights: [0, 1, 2].map((i) => ({ title: str(highlights[i]?.title), text: str(highlights[i]?.text) })),
    ways: (Array.isArray(p.ways) ? p.ways : []).map((way) => {
      const w = obj(way);
      return Object.fromEntries(WAY_KEYS.map((key) => [key, str(w[key])])) as EditableWay;
    }),
    guide_quote: { quote: str(quote.quote), name: str(quote.name), role: str(quote.role), image_url: str(quote.image_url) },
    pairs_with: Array.isArray(p.pairs_with) ? p.pairs_with.filter((slug): slug is string => typeof slug === 'string' && Boolean(slug)) : []
  };
}

/** What is saved: the filled-in fields only; null when nothing is filled in. */
export function cleanPage(page: EditablePage): Record<string, unknown> | null {
  const filled = (entries: [string, string][]) => Object.fromEntries(entries.map(([k, v]) => [k, v.trim()]).filter(([, v]) => v));
  const out: Record<string, unknown> = filled([
    ['short_name', page.short_name],
    ['in_short', page.in_short],
    ['reviewed_by', page.reviewed_by]
  ]);
  const highlights = page.highlights.map((h) => filled([['title', h.title], ['text', h.text]])).filter((h) => h.title);
  if (highlights.length) out.highlights = highlights;
  const ways = page.ways
    .map((way) => {
      const w = filled(Object.entries(way) as [string, string][]);
      for (const key of ['image_url', 'link_href'] as const) if (w[key] && !safeHref(w[key])) delete w[key];
      return w;
    })
    .filter((w) => w.title || w.body);
  if (ways.length) out.ways = ways;
  const quote = filled(Object.entries(page.guide_quote) as [string, string][]);
  if (quote.image_url && !safeHref(quote.image_url)) delete quote.image_url;
  if (quote.quote) out.guide_quote = quote;
  if (page.pairs_with.length) out.pairs_with = [...new Set(page.pairs_with)];
  return Object.keys(out).length ? out : null;
}
