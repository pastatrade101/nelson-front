import { error, redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

// Kilimanjaro is a CMS-managed destination guide. The old bespoke /kilimanjaro
// URL forwards to it once that guide is published; until then it is an honest
// 404 rather than a redirect into one.
export const load: PageLoad = async ({ fetch }) => {
  const res = await fetch('/api/destinations/kilimanjaro').catch(() => null);
  if (res?.ok) redirect(308, '/destinations/kilimanjaro');
  error(404, 'Kilimanjaro trips are not on the site yet.');
};
