/**
 * Permanent (301) redirects for addresses retired in the travel-style clean-up
 * (founder's task list, Oct 2026). Old experience categories and archived
 * styles land on the travel style that replaced them; the thin country hub
 * lands on the full Tanzania guide.
 *
 * Applied by hooks.server.ts before the page renders, so they win even where
 * an old page still exists. Links the site builds itself go through
 * `canonicalHref`, so nothing on the site points at a redirect.
 */
export const REDIRECTS: Record<string, string> = {
  '/travel-styles/luxury-travel': '/travel-styles',
  '/travel-styles/photography': '/travel-styles',
  '/travel-styles/group-travel': '/travel-styles',
  '/travel-styles/solo-travel': '/travel-styles',
  '/experiences': '/travel-styles',
  '/experiences/family-safaris': '/travel-styles/tanzania-family-safari',
  '/experiences/great-migration-safaris': '/travel-styles/great-migration-safari',
  '/experiences/classic-northern-circuit': '/travel-styles/classic-tanzania-safari',
  '/experiences/safari-zanzibar-holidays': '/travel-styles/tanzania-safari-zanzibar',
  '/experiences/honeymoon-safaris': '/travel-styles/honeymoon',
  '/experiences/grand-east-africa-journeys': '/travel-styles/grand-east-africa-journeys',
  '/experiences/day-safaris': '/travel-styles/tanzania-day-safari',
  '/experiences/safari-from-zanzibar': '/travel-styles/tanzania-safari-zanzibar',
  '/experiences/luxury-tanzania-safaris': '/travel-styles/classic-tanzania-safari',
  '/experiences/fly-in-safaris': '/tours/4-day-fly-in-serengeti-safari',
  '/experiences/photography-safaris': '/travel-styles/great-migration-safari',
  '/experiences/first-time-tanzania-safaris': '/travel-styles/classic-tanzania-safari',
  '/experiences/private-tanzania-safaris': '/travel-styles',
  '/experiences/big-five-safaris': '/travel-styles/classic-tanzania-safari',
  '/experiences/short-tanzania-safaris': '/travel-styles/classic-tanzania-safari',
  '/tanzania-safaris': '/destinations/tanzania-safari'
};

/** Where an address now lives, or null. Trailing slashes and letter case don't matter. */
export const redirectFor = (pathname: string): string | null => {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '').toLowerCase() : pathname;
  return REDIRECTS[path] ?? null;
};

/** A path the site links to, resolved past any redirect. */
export const canonicalHref = (path: string): string => redirectFor(path) ?? path;

/** The domain every page is served from; the bare domain redirects to it. */
export const PRIMARY_HOST = 'www.emneladventures.com';
const BARE_HOST = 'emneladventures.com';

/**
 * The www address for a page request that arrived on the bare domain, or null.
 * The API and anything but GET/HEAD are left alone: webhooks and form posts
 * from older pages must not be bounced (a redirected POST loses its body).
 */
export const wwwRedirectFor = (url: URL, method: string): string | null => {
  if (url.hostname !== BARE_HOST || (method !== 'GET' && method !== 'HEAD')) return null;
  if (url.pathname === '/api' || url.pathname.startsWith('/api/')) return null;
  return `https://${PRIMARY_HOST}${url.pathname}${url.search}`;
};
