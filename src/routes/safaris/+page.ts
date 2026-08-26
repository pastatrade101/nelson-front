import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import type { MarketPage } from '$lib/types';
import { cachedJson } from '$lib/cache';

/**
 * The markets hub — the index for /safaris/[slug].
 *
 * Without this the market pages were orphans: live, indexable, and reachable
 * only by typing the URL or clicking an ad. A hub gives them one honest internal
 * link each, which is what search engines need in order to find them at all.
 *
 * `noindex` is not filtered here. That flag governs whether SEARCH may index a
 * page, not whether a person may see it — a paid-only market page still belongs
 * in the list. The sitemap makes the opposite choice, and both are correct.
 */
export const load: PageLoad = async ({ fetch }) => {
  let markets: MarketPage[] = [];

  try {
    const body = await cachedJson<{ data?: { items?: MarketPage[] } }>(
      '/api/market-pages?status=published&limit=100',
      fetch
    );
    markets = body?.data?.items ?? [];
  } catch {
    markets = [];
  }

  // No published market page means no hub — the same rule the country hubs and
  // the essentials hub follow. An empty index is a thin page.
  if (!markets.length) throw error(404, 'No market pages are published yet.');

  return { markets };
};
