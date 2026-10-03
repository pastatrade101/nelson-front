import type { Handle } from '@sveltejs/kit';
import { findRedirect, loadSitePages, type SitePage } from '$lib/siteIndex';

/**
 * A safety net for addresses that 404.
 *
 * Old links, mistyped slugs and addresses copied out of chatbot answers
 * (`/tanzania-family-safari?utm_source=chatgpt.com`) all reach the site from
 * outside, where nobody can fix the link. When such a request would 404 and its
 * slug names exactly one published page, it is sent there with a 301, so both
 * the visitor and any search ranking the old address earned land on the real
 * page. Everything else — and every request that did not 404 — is untouched.
 */

// Published pages change rarely; reading five lists on every stray request
// would not be worth it. A failed read is retried after a minute instead.
const TTL = 10 * 60 * 1000;
const RETRY_TTL = 60 * 1000;
let cached: { pages: SitePage[]; until: number } | null = null;
let pending: Promise<SitePage[]> | null = null;

const sitePages = (fetchFn: typeof fetch): Promise<SitePage[]> => {
  if (cached && Date.now() < cached.until) return Promise.resolve(cached.pages);
  pending ??= loadSitePages(fetchFn)
    .then(({ pages, complete }) => {
      cached = { pages, until: Date.now() + (complete ? TTL : RETRY_TTL) };
      return pages;
    })
    .finally(() => {
      pending = null;
    });
  return pending;
};

// Admin screens, the API proxy and build assets are never redirected; nor is
// anything that looks like a file rather than a page (old .html addresses aside).
const isCandidate = (pathname: string): boolean => {
  const segments = pathname.split('/').filter(Boolean);
  if (!segments.length || segments.length > 2) return false;
  if (['admin', 'api', '_app'].includes(segments[0].toLowerCase())) return false;
  const last = segments[segments.length - 1];
  return !last.includes('.') || /\.(?:html?|php|aspx?)$/i.test(last);
};

export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);

  const { method } = event.request;
  if (response.status !== 404 || (method !== 'GET' && method !== 'HEAD')) return response;
  if (event.isDataRequest || event.isSubRequest || !isCandidate(event.url.pathname)) return response;

  let target: string | null = null;
  try {
    target = findRedirect(event.url.pathname, await sitePages(event.fetch));
  } catch {
    // Lookup trouble must never turn a 404 into a 500.
  }
  if (!target) return response;

  // The query string is kept as it arrived: campaign tags on a landing are
  // real analytics, and the destination page should still see them.
  return new Response(null, { status: 301, headers: { location: `${target}${event.url.search}` } });
};
