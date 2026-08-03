import type { PageLoad } from './$types';
import { cachedJson } from '$lib/cache';

// SSR-load the homepage CMS sections so the hero (image, title, CTAs) is in the
// initial HTML. This lets the hero image be preloaded and become the LCP element
// as fast as possible, instead of waiting for a client-side fetch after
// hydration. Below-the-fold collections (tours, destinations, journal…) stay in
// the component's onMount — they aren't LCP-critical.
export const load: PageLoad = async ({ fetch }) => {
  try {
    const body = await cachedJson<{ data?: Array<Record<string, unknown> & { section_key: string }> }>('/api/homepage', fetch);
    const list = body?.data ?? [];
    const sections = Object.fromEntries(list.map((s) => [s.section_key, s]));
    return { sections };
  } catch {
    // fall through — the component keeps its built-in default copy/imagery
  }
  return { sections: {} as Record<string, Record<string, unknown>> };
};
