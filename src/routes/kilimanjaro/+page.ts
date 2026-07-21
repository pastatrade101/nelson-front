import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

// Kilimanjaro is now a CMS-managed destination guide. Redirect the old bespoke
// /kilimanjaro URL to the destination so existing links and SEO keep working.
export const load: PageLoad = () => {
  throw redirect(308, '/destinations/kilimanjaro');
};
