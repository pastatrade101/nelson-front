import { env as privateEnv } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';
import { SITE_URL } from '$lib/config/env';
import { DB_COLLECTIONS, LOCAL_COLLECTIONS, STATIC_PAGES, collectDb, renderUrlset, type SitemapEntry } from '$lib/sitemap';
import type { RequestHandler } from './$types';

// Server-side calls reach the backend over the internal Docker network — the
// public API_URL resolves to localhost inside the container.
const BACKEND_ORIGIN = (privateEnv.BACKEND_ORIGIN || 'http://127.0.0.1:5000').replace(/\/+$/, '');

// Per-type sub-sitemap: /sitemaps/<type>.xml (pages, tours, destinations, …).
export const GET: RequestHandler = async ({ params, url, fetch }) => {
  const origin = SITE_URL || url.origin;
  const type = params.type;

  let entries: SitemapEntry[];
  if (type === 'pages') {
    entries = STATIC_PAGES.map((path) => ({ path }));
  } else {
    const db = DB_COLLECTIONS.find((c) => c.key === type);
    if (db) {
      entries = await collectDb(fetch, BACKEND_ORIGIN, db.endpoint, db.prefix);
    } else {
      const local = LOCAL_COLLECTIONS.find((c) => c.key === type);
      if (!local) throw error(404, 'Unknown sitemap');
      entries = local.items.map((i) => ({ path: `${local.prefix}/${i.slug}` }));
    }
  }

  return new Response(renderUrlset(origin, entries), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600'
    }
  });
};
