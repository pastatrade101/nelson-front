import type { LayoutLoad } from './$types';
import { defaultBranding, mergeBranding } from '$lib/branding';

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

export const load: LayoutLoad = async ({ fetch }) => {
  const [brandingResult, essentialsLive, countries] = await Promise.all([
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
    liveCountries(fetch)
  ]);

  return { branding: brandingResult, essentialsLive, countries };
};
