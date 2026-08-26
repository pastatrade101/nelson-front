import { COMPARISONS } from '$lib/data/comparisons';
import { TRAVEL_STYLES } from '$lib/data/travel-styles';

// ---------------------------------------------------------------------------
// Sitemap config + builders. Google's current guidance: <lastmod> is the only
// tag it uses; <priority>/<changefreq> are ignored, so we omit them. lastmod is
// emitted ONLY when a record carries a real date — never a synthetic "today".
//
// Everything is generated server-side from the DB, so newly published content
// appears automatically. Adding a new content type = ONE entry in DB_COLLECTIONS.
// ---------------------------------------------------------------------------

// Canonical, indexable static/marketing pages — one per real 200 page. Admin,
// /api, transactional forms (booking/enquiry), user-state (shortlist) and
// private token routes (/trip) are deliberately excluded.
export const STATIC_PAGES: string[] = [
  '/',
  '/tours',
  '/destinations',
  '/experiences',
  '/accommodation',
  '/plan-my-trip',
  '/departures',
  '/travel-styles',
  '/trip-finder',
  '/kilimanjaro',
  '/blog',
  '/expert-advice',
  '/gallery',
  '/compare',
  '/about',
  '/contact',
  '/destination-scores',
  '/safety',
  '/privacy',
  '/terms',
  '/cancellation-policy',
  '/data-retention'
];

// DB-backed collections, one sub-sitemap each. Adding a new content type is a
// single entry here — its sub-sitemap and its slot in the index follow.
// `hubPath` is the collection's own landing page. It is emitted ONLY when the
// collection has published items, so an empty hub is never advertised to Google
// as a real page — the thin-page trap the site map's principle 9 warns about.
export const DB_COLLECTIONS: { key: string; prefix: string; endpoint: string; hubPath?: string }[] = [
  { key: 'tours', prefix: '/tours', endpoint: '/tours?status=published&limit=50000' },
  { key: 'destinations', prefix: '/destinations', endpoint: '/destinations?limit=50000' },
  { key: 'experiences', prefix: '/experiences', endpoint: '/categories?limit=50000' },
  { key: 'accommodation', prefix: '/accommodation', endpoint: '/lodges?limit=50000' },
  { key: 'blog', prefix: '/blog', endpoint: '/blog?status=published&limit=50000' },
  {
    key: 'safari-essentials',
    prefix: '/safari-essentials',
    endpoint: '/safari-essentials?status=published&limit=50000',
    hubPath: '/safari-essentials'
  },
  {
    // Ads landing pages. Only those an admin opted into search appear here —
    // collectDb drops every noindex row — so the hub is advertised precisely
    // when it has something Google is allowed to crawl.
    key: 'market-pages',
    prefix: '/safaris',
    endpoint: '/market-pages?status=published&limit=50000',
    hubPath: '/safaris'
  }
];

// Static-data collections (bundled at build; always available, no API needed).
export const LOCAL_COLLECTIONS: { key: string; prefix: string; items: ReadonlyArray<{ slug: string }> }[] = [
  { key: 'travel-styles', prefix: '/travel-styles', items: TRAVEL_STYLES },
  { key: 'compare', prefix: '/compare', items: COMPARISONS }
];

// Country hubs (/tanzania-safaris, later /kenya-safaris). Not a DB_COLLECTION
// because the source returns country names rather than slugged records, and a
// hub only exists for a country we actually sell — see the handler.
export const COUNTRY_HUB_KEY = 'country-hubs';

/** `Tanzania` -> `/tanzania-safaris`; `South Africa` -> `/south-africa-safaris`. */
export const countryHubPath = (country: string): string =>
  `/${country.trim().toLowerCase().replace(/\s+/g, '-')}-safaris`;

// Every sub-sitemap the index advertises (order = index order).
export const SITEMAP_KEYS: string[] = [
  'pages',
  COUNTRY_HUB_KEY,
  ...DB_COLLECTIONS.map((c) => c.key),
  ...LOCAL_COLLECTIONS.map((c) => c.key)
];

export type SitemapEntry = { path: string; lastmod?: string };

export const xmlEscape = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/** A valid YYYY-MM-DD from a record's date field, or undefined (never fabricated). */
export const toLastmod = (record: Record<string, unknown>): string | undefined => {
  const raw = record.updated_at ?? record.published_at ?? record.created_at;
  if (typeof raw !== 'string' || !raw) return undefined;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
};

/**
 * Fetch a DB collection over the internal backend origin and map published,
 * slugged records to entries with a real lastmod. Isolated: any failure yields
 * [] so a single broken collection can never break its sub-sitemap.
 */
export const collectDb = async (
  fetchFn: typeof fetch,
  backendOrigin: string,
  endpoint: string,
  prefix: string
): Promise<SitemapEntry[]> => {
  try {
    const res = await fetchFn(`${backendOrigin}/api${endpoint}`);
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: unknown };
    const raw = json?.data;
    const items = (Array.isArray(raw) ? raw : (raw as { items?: unknown[] })?.items) ?? [];
    const seen = new Set<string>();
    const entries: SitemapEntry[] = [];
    for (const it of items as Record<string, unknown>[]) {
      const slug = it?.slug;
      const status = it?.status;
      // Only published/active records with a real slug (excludes drafts).
      if (typeof slug !== 'string' || !slug) continue;
      if (status != null && status !== 'published' && status !== 'active') continue;
      // A record the editor marked noindex must not be advertised here — the
      // sitemap would be asking Google to crawl a page whose own meta tag tells
      // it not to. No-op for collections without the column.
      if (it?.noindex === true) continue;
      const path = `${prefix}/${slug}`;
      if (seen.has(path)) continue; // no duplicate URLs
      seen.add(path);
      entries.push({ path, lastmod: toLastmod(it) });
    }
    return entries;
  } catch {
    return [];
  }
};

/** A <urlset> — lastmod only, deduped, XML-escaped, UTF-8. */
export const renderUrlset = (origin: string, entries: SitemapEntry[]): string => {
  const seen = new Set<string>();
  const urls = entries
    .filter((e) => {
      if (!e.path || seen.has(e.path)) return false;
      seen.add(e.path);
      return true;
    })
    .map((e) => `<url><loc>${xmlEscape(origin + e.path)}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ''}</url>`)
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
};

/** The <sitemapindex> pointing at each per-type sub-sitemap. */
export const renderIndex = (origin: string, keys: string[]): string => {
  const sitemaps = keys
    .map((key) => `<sitemap><loc>${xmlEscape(`${origin}/sitemaps/${key}.xml`)}</loc></sitemap>`)
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemaps}</sitemapindex>`;
};
