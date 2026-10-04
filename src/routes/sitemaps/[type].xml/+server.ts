import { error } from '@sveltejs/kit';
import { SITE_URL } from '$lib/config/env';
import {
  applyPageSeoIndexingRules,
  COUNTRY_HUB_KEY,
  DB_COLLECTIONS,
  LOCAL_COLLECTIONS,
  STATIC_PAGES,
  collectDb,
  countryHubPath,
  renderUrlset,
  type SitemapEntry
} from '$lib/sitemap';
import { safeSiteOrigin } from '$lib/seo-policy';
import type { RequestHandler } from './$types';

// Collections are fetched through the app's own /api proxy rather than straight
// at BACKEND_ORIGIN. Going direct made SvelteKit forward the visitor's Origin
// header to the API, where the CORS allowlist rejected any host it did not know
// and returned a 500 — which collectDb swallows, silently emptying the sitemap.
// The proxy strips origin/referer, so the sitemap no longer depends on the
// browsing hostname being in FRONTEND_URL. It forwards to BACKEND_ORIGIN itself.
const API_BASE = '';

// Per-type sub-sitemap: /sitemaps/<type>.xml (pages, tours, destinations, …).
const seoConfig = async (fetch: typeof globalThis.fetch) => {
  try {
    const response = await fetch('/api/public/settings');
    if (!response.ok) return { canonicalBase: '', indexingEnabled: true };
    const body = (await response.json()) as { data?: Record<string, unknown> };
    const data = body.data ?? {};
    return {
      canonicalBase: typeof data.canonical_base_url === 'string' ? data.canonical_base_url : '',
      indexingEnabled: typeof data.robots_indexing_enabled === 'boolean' ? data.robots_indexing_enabled : true
    };
  } catch {
    return { canonicalBase: '', indexingEnabled: true };
  }
};

const indexingRules = async (fetch: typeof globalThis.fetch) => {
  try {
    const response = await fetch('/api/page-seo/indexing-rules');
    if (!response.ok) return [];
    const body = (await response.json()) as { data?: Array<{ path?: string; canonical_url?: string | null; robots?: string | null }> };
    return body.data ?? [];
  } catch {
    return [];
  }
};

export const GET: RequestHandler = async ({ params, url, fetch }) => {
  const [config, rules] = await Promise.all([seoConfig(fetch), indexingRules(fetch)]);
  const origin = safeSiteOrigin(config.canonicalBase || SITE_URL, url.origin);
  const type = params.type;

  let entries: SitemapEntry[];
  if (!config.indexingEnabled) {
    entries = [];
  } else if (type === 'pages') {
    entries = STATIC_PAGES.map((path) => ({ path }));
  } else if (type === COUNTRY_HUB_KEY) {
    // One hub per country we actually sell. A country with no published
    // destination has no hub page (its route 404s), so it must not be listed.
    try {
      const res = await fetch(`${API_BASE}/api/destinations/countries`);
      const json = res.ok ? ((await res.json()) as { data?: { countries?: string[] } }) : undefined;
      entries = (json?.data?.countries ?? []).map((country) => ({ path: countryHubPath(country) }));
    } catch {
      entries = [];
    }
  } else {
    const db = DB_COLLECTIONS.find((c) => c.key === type);
    if (db) {
      entries = await collectDb(fetch, API_BASE, db.endpoint, db.prefix);
      // A hub with nothing published is a thin page; list it only once it has
      // something to show.
      if (db.hubPath && entries.length) entries = [{ path: db.hubPath }, ...entries];
    } else {
      const local = LOCAL_COLLECTIONS.find((c) => c.key === type);
      if (!local) throw error(404, 'Unknown sitemap');
      entries = local.items.map((i) => ({ path: `${local.prefix}/${i.slug}` }));
    }
  }

  return new Response(renderUrlset(origin, applyPageSeoIndexingRules(origin, entries, rules)), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600'
    }
  });
};
