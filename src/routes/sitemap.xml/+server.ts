import { SITE_URL } from '$lib/config/env';
import { COMPARISONS } from '$lib/data/comparisons';
import type { RequestHandler } from './$types';

const routes = [
  '/',
  '/tours',
  '/experiences',
  '/trip-finder',
  '/destinations',
  '/gallery',
  '/blog',
  '/expert-advice',
  '/compare',
  ...COMPARISONS.map((c) => `/compare/${c.slug}`),
  '/about',
  '/contact',
  '/plan-my-trip',
  '/departures'
];

export const GET: RequestHandler = ({ url }) => {
  const origin = SITE_URL || url.origin;
  const urls = routes
    .map((route) => `<url><loc>${origin}${route}</loc><changefreq>weekly</changefreq><priority>${route === '/' ? '1.0' : '0.7'}</priority></url>`)
    .join('');

  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, {
    headers: {
      'Content-Type': 'application/xml'
    }
  });
};
