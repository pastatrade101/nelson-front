import type { LayoutLoad } from './$types';
import { defaultBranding, mergeBranding } from '$lib/branding';
import { isPrivateOrUtilityPath, type SeoOverride } from '$lib/seo-policy';

// Fetch branding on the server so the very first paint — and crawlers — get the
// correct site name, favicon and colors. Without this, branding only applied
// after hydration (a visible flash + wrong favicon/title for bots). Falls back
// to Emnel defaults if the API is unreachable, so a page never fails to render.
//
// Uses the relative `/api` path (not the public API_URL): server-side SvelteKit
// routes it through the /api proxy → BACKEND_ORIGIN (the public API_URL falls
// back to localhost inside the container); client-side it's same-origin.
/**
 * Whether any Safari Essentials guide is published.
 *
 * The nav link is gated on this. All nine topics ship as drafts, so an
 * unconditional link would send visitors to an empty hub; the entry appears on
 * its own the moment the first guide goes live. Failure is treated as "no
 * guides" — a missing nav item is a far smaller fault than a dead one.
 */
const hasPublishedEssentials = async (fetch: typeof globalThis.fetch): Promise<boolean> => {
  try {
    const res = await fetch('/api/safari-essentials?status=published&limit=1');
    if (!res.ok) return false;
    const json = (await res.json()) as { data?: { items?: unknown[] } };
    return (json?.data?.items?.length ?? 0) > 0;
  } catch {
    return false;
  }
};

/**
 * Countries we actually run trips in, used to link the country hubs
 * (`/tanzania-safaris`, later `/kenya-safaris`).
 *
 * Deliberately derived rather than hardcoded: adding Kenya then means publishing
 * a Kenya destination, not editing the navigation. Returns [] on failure, which
 * simply hides the hub links rather than breaking the page.
 */
const liveCountries = async (fetch: typeof globalThis.fetch): Promise<string[]> => {
  try {
    const res = await fetch('/api/destinations/countries');
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: { countries?: string[] } };
    return json?.data?.countries ?? [];
  } catch {
    return [];
  }
};

/**
 * Whether any market page is published, so the footer links the /safaris hub
 * only when that hub is a real page. The hub itself 404s when empty, so an
 * ungated link would eventually point at nothing.
 */
const hasMarketPages = async (fetch: typeof globalThis.fetch): Promise<boolean> => {
  try {
    const res = await fetch('/api/market-pages?status=published&limit=1');
    if (!res.ok) return false;
    const json = (await res.json()) as { data?: { items?: unknown[] } };
    return (json?.data?.items?.length ?? 0) > 0;
  } catch {
    return false;
  }
};

/**
 * Photography for the site's call-to-action bands: the banner and main images
 * of the featured tours. Loaded once here so every CTA can show a real trip photo
 * without its page fetching anything. Returns [] on failure; the band then
 * falls back to the brand gradient.
 */
const ctaImages = async (fetch: typeof globalThis.fetch): Promise<string[]> => {
  try {
    const res = await fetch('/api/tours?status=published&is_featured=true&limit=12');
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: { items?: Array<{ banner_image_url?: string | null; main_image_url?: string | null }> } };
    // Wide banners first, then each tour's main photo, so pages rarely share one.
    const items = json?.data?.items ?? [];
    const urls = [...items.map((t) => t.banner_image_url), ...items.map((t) => t.main_image_url)].filter(
      (u): u is string => Boolean(u)
    );
    return [...new Set(urls)];
  } catch {
    return [];
  }
};

export const load: LayoutLoad = async ({ fetch, url }) => {
  const [brandingResult, essentialsLive, countries, marketsLive, ctaPhotos, seoOverride, publicSettings] = await Promise.all([
    (async () => {
      try {
        const res = await fetch('/api/branding');
        if (!res.ok) return defaultBranding;
        const json = (await res.json()) as { data?: unknown };
        return mergeBranding(json?.data as Parameters<typeof mergeBranding>[0]);
      } catch {
        return defaultBranding;
      }
    })(),
    hasPublishedEssentials(fetch),
    liveCountries(fetch),
    hasMarketPages(fetch),
    ctaImages(fetch),
    (async (): Promise<SeoOverride | null> => {
      if (isPrivateOrUtilityPath(url.pathname)) return null;
      try {
        const response = await fetch(`/api/page-seo/resolve?path=${encodeURIComponent(url.pathname)}`);
        if (!response.ok) return null;
        const body = (await response.json()) as { data?: { match?: boolean; seo?: SeoOverride } };
        return body.data?.match ? body.data.seo ?? null : null;
      } catch {
        return null;
      }
    })(),
    (async (): Promise<Record<string, unknown>> => {
      try {
        const response = await fetch('/api/public/settings');
        if (!response.ok) return {};
        const body = (await response.json()) as { data?: Record<string, unknown> };
        return body.data ?? {};
      } catch {
        return {};
      }
    })()
  ]);

  return { branding: brandingResult, essentialsLive, countries, marketsLive, ctaImages: ctaPhotos, seoOverride, publicSettings };
};
