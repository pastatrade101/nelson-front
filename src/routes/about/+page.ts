import type { PageLoad } from './$types';
import { cachedJson } from '$lib/cache';

// SSR-load the About page's CMS sections (the `about_*` keys in the shared
// homepage_sections table) so the hero copy/image is in the initial HTML and the
// page is fully editable from the admin.
//
// `all=true` returns inactive sections too — the page needs to SEE a disabled
// section in order to hide it. A section that is missing entirely (not seeded
// yet) falls back to the built-in copy, so the page looks right before any edit.
export const load: PageLoad = async ({ fetch }) => {
  try {
    const body = await cachedJson<{ data?: Array<Record<string, unknown> & { section_key: string }> }>(
      '/api/homepage?all=true',
      fetch
    );
    const list = body?.data ?? [];
    const sections = Object.fromEntries(
      list.filter((s) => typeof s.section_key === 'string' && s.section_key.startsWith('about_')).map((s) => [s.section_key, s])
    );
    return { sections };
  } catch {
    // fall through — the component keeps its built-in default copy/imagery
  }
  return { sections: {} as Record<string, Record<string, unknown>> };
};
