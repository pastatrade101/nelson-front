import { SITE_URL } from '$lib/config/env';
import { readAllPages } from '$lib/faqEntities';
import { toMetaText } from '$lib/richtext';
import { safeSiteOrigin } from '$lib/seo-policy';
import type { RequestHandler } from './$types';

/**
 * /llms.txt — a plain-text map of the site for AI assistants (llmstxt.org).
 *
 * ChatGPT, Claude, Perplexity and the like read this first when they can: one
 * page that says what the site is and lists its pages with a line each, so an
 * answer about a Tanzania safari can cite the right itinerary or destination
 * instead of guessing from the homepage. Every address here is a published
 * record read from the API, so nothing listed can 404.
 *
 * Reads go through the app's own /api proxy (same reason as the sitemap: it
 * strips the Origin header that the API's CORS check would otherwise reject).
 */

type Row = Record<string, unknown>;

const SECTIONS: Array<{ heading: string; endpoint: string; base: string; title: string; blurb?: string }> = [
  { heading: 'Safari itineraries', endpoint: '/api/tours', base: '/tours', title: 'title', blurb: 'short_description' },
  { heading: 'Destinations', endpoint: '/api/destinations', base: '/destinations', title: 'name', blurb: 'short_description' },
  { heading: 'Accommodation', endpoint: '/api/lodges', base: '/accommodation', title: 'name', blurb: 'short_description' },
  { heading: 'Experiences', endpoint: '/api/categories', base: '/experiences', title: 'name', blurb: 'description' },
  { heading: 'Travel styles', endpoint: '/api/travel-styles', base: '/travel-styles', title: 'name', blurb: 'description' },
  { heading: 'Comparisons', endpoint: '/api/comparisons', base: '/compare', title: 'title', blurb: 'intro' },
  { heading: 'Journal', endpoint: '/api/blog', base: '/blog', title: 'title', blurb: 'excerpt' },
  { heading: 'Safari essentials', endpoint: '/api/safari-essentials', base: '/safari-essentials', title: 'title' }
];

// `needs`: a hub listed only once its section has published pages — the same
// rule the sitemap follows, so an empty landing page is never advertised.
const KEY_PAGES: Array<{ title: string; path: string; blurb: string; needs?: string }> = [
  { title: 'Plan my trip', path: '/plan-my-trip', blurb: 'Tell us dates, budget and who is travelling; a local specialist replies with a route.' },
  { title: 'Expert advice and FAQs', path: '/expert-advice', blurb: 'Answers to the questions travellers ask most about a Tanzania safari.' },
  { title: 'Safari essentials', path: '/safari-essentials', blurb: 'Practical guides: visas, health, packing, money, seasons.', needs: '/api/safari-essentials' },
  { title: 'About', path: '/about', blurb: 'Who Emnel Adventures is and how the team works.' },
  { title: 'Contact', path: '/contact', blurb: 'Email, phone and WhatsApp.' }
];

/**
 * Every published, indexable row of a list — all pages of it (the API caps a
 * page at 100). Same filter as the sitemap's collectDb: a record an editor
 * marked noindex (lodges store it as `indexable: false`) is not offered to AI
 * crawlers either.
 */
const list = async (fetch: typeof globalThis.fetch, endpoint: string): Promise<Row[]> => {
  try {
    const rows = await readAllPages<Row>(async (page) => {
      const res = await fetch(`${endpoint}?status=published&limit=100&page=${page}`);
      if (!res.ok) throw new Error(`${endpoint} ${res.status}`);
      return res.json();
    });
    return rows.filter(
      (row) =>
        typeof row.slug === 'string' &&
        row.slug &&
        (!row.status || row.status === 'published') &&
        row.noindex !== true &&
        row.indexable !== false
    );
  } catch {
    return [];
  }
};

const settings = async (fetch: typeof globalThis.fetch) => {
  try {
    const res = await fetch('/api/public/settings');
    const body = res.ok ? ((await res.json()) as { data?: Row }) : { data: {} };
    return body.data ?? {};
  } catch {
    return {} as Row;
  }
};

const line = (title: string, url: string, blurb: string) =>
  blurb ? `- [${title}](${url}): ${blurb}` : `- [${title}](${url})`;

export const GET: RequestHandler = async ({ fetch, url }) => {
  const config = await settings(fetch);
  const canonicalBase = typeof config.canonical_base_url === 'string' ? config.canonical_base_url : '';
  const indexingEnabled = typeof config.robots_indexing_enabled === 'boolean' ? config.robots_indexing_enabled : true;
  const origin = safeSiteOrigin(canonicalBase || SITE_URL, url.origin);
  const headers = { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' };

  if (!indexingEnabled) {
    return new Response('# Emnel Adventures\n\n> This site is not open to indexing at the moment.\n', { headers });
  }

  const sections = await Promise.all(SECTIONS.map(async (section) => ({ section, rows: await list(fetch, section.endpoint) })));

  const out: string[] = [
    '# Emnel Adventures',
    '',
    '> Tanzania safari itineraries, destinations, accommodation and planning guides from Emnel Adventures, a Tanzania-based safari operator. Trips are private and built around each traveller; every page below is published and current.',
    '',
    `Main site: ${origin}/ · Sitemap: ${origin}/sitemap.xml · Prices on itinerary pages are "from" guide prices and are confirmed per enquiry.`,
    ''
  ];

  for (const { section, rows } of sections) {
    if (!rows.length) continue;
    out.push(`## ${section.heading}`, '');
    for (const row of rows) {
      const title = String(row[section.title] ?? row.slug).replace(/\s+/g, ' ').trim();
      const blurb = section.blurb ? toMetaText(row[section.blurb], 160) : '';
      out.push(line(title, `${origin}${section.base}/${String(row.slug)}`, blurb));
    }
    out.push('');
  }

  const live = new Set(sections.filter(({ rows }) => rows.length).map(({ section }) => section.endpoint));
  out.push('## Key pages', '');
  for (const page of KEY_PAGES) {
    if (page.needs && !live.has(page.needs)) continue;
    out.push(line(page.title, `${origin}${page.path}`, page.blurb));
  }
  out.push('');

  return new Response(out.join('\n'), { headers });
};
