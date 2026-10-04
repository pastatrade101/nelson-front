import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';
export const load: PageLoad = ({ params, url }) => {
  const query = new URLSearchParams(url.searchParams);
  query.set('tour', params.slug);
  if (!query.has('from')) query.set('from', url.pathname);
  throw redirect(307, `/plan-my-trip?${query}`);
};
