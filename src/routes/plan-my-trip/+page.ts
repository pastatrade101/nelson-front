import type { PageLoad } from './$types';
import type { Tour } from '$lib/types';
import type { Entry } from '$lib/tripPlanner';
export const load: PageLoad = async ({ fetch, url }) => {
  const get = async (path: string) => { const response = await fetch(`/api/${path}`); if (!response.ok) throw new Error('Catalogue unavailable'); const body = await response.json(); if (!body?.data || body.success === false) throw new Error('Catalogue unavailable'); return body.data; };
  const results = await Promise.allSettled([get('tours?status=published&limit=200'), get('destinations?status=published&limit=100')]);
  const tours: Tour[] = results[0].status === 'fulfilled' ? (results[0].value.items || []).filter((t: Tour) => t.status === 'published') : [];
  const destinations: Array<{ name: string; slug: string }> = results[1].status === 'fulfilled' ? results[1].value.items || [] : [];
  const params: Record<string, string[]> = {}; for (const [key, value] of url.searchParams) (params[key] ||= []).push(value);
  const entry: Entry = { url: `${url.pathname}${url.search}`, params };
  const tourSlug = url.searchParams.get('tour'); const lodgeSlug = url.searchParams.get('lodge');
  await Promise.all([
    tourSlug ? (async () => { const t = tours.find((t) => t.slug === tourSlug) || await get(`tours/${encodeURIComponent(tourSlug)}`).catch(() => null); if (t?.status === 'published') entry.tour = { id: t.id, slug: t.slug, title: t.title }; })() : null,
    lodgeSlug ? (async () => { const lodge = await get(`lodges/${encodeURIComponent(lodgeSlug)}`).catch(() => null); if (lodge?.status === 'published') entry.lodge = { slug: lodge.slug, name: lodge.name }; })() : null
  ]);
  return { catalog: { tours, destinations, available: results[0].status === 'fulfilled' }, entry };
};
