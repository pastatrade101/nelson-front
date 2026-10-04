import { SITE_URL } from '$lib/config/env';
import { SITEMAP_KEYS, renderIndex } from '$lib/sitemap';
import { safeSiteOrigin } from '$lib/seo-policy';
import type { RequestHandler } from './$types';

// Sitemap INDEX — points at the per-type sub-sitemaps under /sitemaps/*.xml.
export const GET: RequestHandler = async ({ url, fetch }) => {
  let canonicalBase = '';
  let indexingEnabled = true;
  try {
    const response = await fetch('/api/public/settings');
    if (response.ok) {
      const body = (await response.json()) as { data?: Record<string, unknown> };
      canonicalBase = typeof body.data?.canonical_base_url === 'string' ? body.data.canonical_base_url : '';
      indexingEnabled = typeof body.data?.robots_indexing_enabled === 'boolean' ? body.data.robots_indexing_enabled : true;
    }
  } catch {
    // The canonical env/default host remains a safe fallback while the API is down.
  }
  const origin = safeSiteOrigin(canonicalBase || SITE_URL, url.origin);
  return new Response(renderIndex(origin, indexingEnabled ? SITEMAP_KEYS : []), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600'
    }
  });
};
