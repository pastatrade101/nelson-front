import { env as publicEnv } from '$env/dynamic/public';

export const API_URL = publicEnv.PUBLIC_API_URL || 'http://localhost:5000/api';

// Public site origin (no trailing slash) for canonical URLs, OG tags, sitemap and
// robots. Set PUBLIC_SITE_URL in .env; when unset, usages fall back to the live
// request origin so it is never stuck on localhost in production.
export const SITE_URL = (publicEnv.PUBLIC_SITE_URL || '').replace(/\/+$/, '');
