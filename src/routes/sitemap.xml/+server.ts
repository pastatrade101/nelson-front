import { SITE_URL } from '$lib/config/env';
import { SITEMAP_KEYS, renderIndex } from '$lib/sitemap';
import type { RequestHandler } from './$types';

// Sitemap INDEX — points at the per-type sub-sitemaps under /sitemaps/*.xml.
export const GET: RequestHandler = ({ url }) => {
  const origin = SITE_URL || url.origin;
  return new Response(renderIndex(origin, SITEMAP_KEYS), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600'
    }
  });
};
