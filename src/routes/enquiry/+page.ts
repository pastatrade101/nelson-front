import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';
export const load: PageLoad = ({ url }) => {
  const query = new URLSearchParams(url.searchParams);
  if (!query.has('from')) query.set('from', '/enquiry');
  throw redirect(307, `/plan-my-trip?${query}`);
};
