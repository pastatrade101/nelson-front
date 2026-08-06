import { API_URL, SITE_URL } from '$lib/config/env';
import { COMPARISONS } from '$lib/data/comparisons';
import { TRAVEL_STYLES } from '$lib/data/travel-styles';
import type { RequestHandler } from './$types';

// One indexable URL. `lastmod` is optional (only emitted when the record carries
// a usable date). Admin, /api, transactional forms (booking/enquiry), user-state
// pages (shortlist) and private token routes (/trip) are deliberately excluded.
type Entry = { path: string; changefreq: string; priority: number; lastmod?: string };

// Static, always-present content/marketing pages — never depend on the API, so
// the sitemap stays valid even if the backend is unreachable.
const STATIC_ROUTES: Entry[] = [
  { path: '/', changefreq: 'daily', priority: 1.0 },
  { path: '/tours', changefreq: 'daily', priority: 0.9 },
  { path: '/destinations', changefreq: 'weekly', priority: 0.9 },
  { path: '/experiences', changefreq: 'weekly', priority: 0.8 },
  { path: '/accommodation', changefreq: 'weekly', priority: 0.8 },
  { path: '/plan-my-trip', changefreq: 'monthly', priority: 0.8 },
  { path: '/departures', changefreq: 'weekly', priority: 0.7 },
  { path: '/travel-styles', changefreq: 'monthly', priority: 0.7 },
  { path: '/trip-finder', changefreq: 'monthly', priority: 0.7 },
  { path: '/kilimanjaro', changefreq: 'monthly', priority: 0.7 },
  { path: '/blog', changefreq: 'weekly', priority: 0.7 },
  { path: '/expert-advice', changefreq: 'monthly', priority: 0.6 },
  { path: '/gallery', changefreq: 'monthly', priority: 0.6 },
  { path: '/compare', changefreq: 'monthly', priority: 0.6 },
  { path: '/about', changefreq: 'monthly', priority: 0.6 },
  { path: '/contact', changefreq: 'yearly', priority: 0.6 },
  { path: '/destination-scores', changefreq: 'monthly', priority: 0.5 },
  { path: '/safety', changefreq: 'yearly', priority: 0.4 },
  { path: '/privacy', changefreq: 'yearly', priority: 0.2 },
  { path: '/terms', changefreq: 'yearly', priority: 0.2 },
  { path: '/cancellation-policy', changefreq: 'yearly', priority: 0.2 },
  { path: '/data-retention', changefreq: 'yearly', priority: 0.2 }
];

// Static-data-driven detail pages (bundled at build time, always available).
const LOCAL_ROUTES: Entry[] = [
  ...COMPARISONS.map((c) => ({ path: `/compare/${c.slug}`, changefreq: 'monthly', priority: 0.5 })),
  ...TRAVEL_STYLES.map((s) => ({ path: `/travel-styles/${s.slug}`, changefreq: 'monthly', priority: 0.6 }))
];

const xmlEscape = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/** A valid YYYY-MM-DD from a record's date field, or undefined. */
const toLastmod = (record: Record<string, unknown>): string | undefined => {
  const raw = record.updated_at ?? record.published_at ?? record.created_at;
  if (typeof raw !== 'string' || !raw) return undefined;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
};

/**
 * Fetch a public list endpoint and map published, slugged records to Entries.
 * Isolated: any failure (network, non-200, bad JSON) yields [] so one broken
 * collection never takes down the whole sitemap.
 */
const collect = async (
  fetchFn: typeof fetch,
  endpoint: string,
  prefix: string,
  opts: { changefreq: string; priority: number }
): Promise<Entry[]> => {
  try {
    const res = await fetchFn(`${API_URL}${endpoint}`);
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: unknown };
    const raw = json?.data;
    const items = (Array.isArray(raw) ? raw : (raw as { items?: unknown[] })?.items) ?? [];
    return (items as Record<string, unknown>[])
      .filter((it) => {
        const slug = it?.slug;
        const status = it?.status;
        // Keep only published (or status-less) records with a real slug.
        return typeof slug === 'string' && slug.length > 0 && (status == null || status === 'published' || status === 'active');
      })
      .map((it) => ({
        path: `${prefix}/${it.slug as string}`,
        changefreq: opts.changefreq,
        priority: opts.priority,
        lastmod: toLastmod(it)
      }));
  } catch {
    return [];
  }
};

export const GET: RequestHandler = async ({ url, fetch }) => {
  const origin = SITE_URL || url.origin;

  // Each collection is independent; collect() swallows its own errors, so
  // Promise.all never rejects and the sitemap always renders.
  const [tours, destinations, posts, lodges, experiences] = await Promise.all([
    collect(fetch, '/tours?status=published&limit=1000', '/tours', { changefreq: 'weekly', priority: 0.8 }),
    collect(fetch, '/destinations?limit=1000', '/destinations', { changefreq: 'weekly', priority: 0.7 }),
    collect(fetch, '/blog?status=published&limit=1000', '/blog', { changefreq: 'monthly', priority: 0.6 }),
    collect(fetch, '/lodges?limit=1000', '/accommodation', { changefreq: 'monthly', priority: 0.6 }),
    collect(fetch, '/categories?limit=1000', '/experiences', { changefreq: 'monthly', priority: 0.6 })
  ]);

  // Merge everything, de-duplicating by path (static/local win over dynamic).
  const seen = new Set<string>();
  const entries = [...STATIC_ROUTES, ...LOCAL_ROUTES, ...tours, ...destinations, ...posts, ...lodges, ...experiences].filter(
    (entry) => {
      if (seen.has(entry.path)) return false;
      seen.add(entry.path);
      return true;
    }
  );

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
    entries
      .map(
        (e) =>
          `<url><loc>${xmlEscape(origin + e.path)}</loc>` +
          (e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : '') +
          `<changefreq>${e.changefreq}</changefreq>` +
          `<priority>${e.priority.toFixed(1)}</priority></url>`
      )
      .join('') +
    `</urlset>`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      // Cache at the edge/browser for an hour — crawlers don't need it fresher.
      'Cache-Control': 'public, max-age=3600, s-maxage=3600'
    }
  });
};
