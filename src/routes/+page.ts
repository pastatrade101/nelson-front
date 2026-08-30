import type { PageLoad } from './$types';
import { cachedJson } from '$lib/cache';
import type { Destination, FAQ, GalleryItem, Paginated, Testimonial, Tour } from '$lib/types';

type ApiEnvelope<T> = { data?: T };
type HomeSection = Record<string, unknown> & { section_key: string };

const safeJson = async <T>(url: string, fetch: typeof globalThis.fetch, fallback: T): Promise<T> => {
  try {
    const body = await cachedJson<ApiEnvelope<T>>(url, fetch);
    return body?.data ?? fallback;
  } catch {
    return fallback;
  }
};

// SSR-load the homepage CMS and its sales-critical collections so the hero and
// real safari routes are present in the initial HTML.
export const load: PageLoad = async ({ fetch }) => {
  // Safari routes are now the first commercial section below the hero, so load
  // them with the CMS content for SSR. This keeps real durations/prices in the
  // initial HTML and avoids a large post-hydration layout shift. The remaining
  // homepage collections are fetched in the same pass so the V2 page arrives
  // complete instead of assembling itself through six client-side requests.
  const [sectionRows, tourPage, destinationPage, faqPage, galleryPage, testimonialPage] = await Promise.all([
    safeJson<HomeSection[]>('/api/homepage', fetch, []),
    safeJson<Paginated<Tour>>('/api/tours?status=published&is_popular=true&limit=6', fetch, {
      items: [],
      pagination: { page: 1, limit: 6, total: 0, totalPages: 0 }
    }),
    safeJson<Paginated<Destination>>('/api/destinations?status=published&limit=12', fetch, {
      items: [],
      pagination: { page: 1, limit: 12, total: 0, totalPages: 0 }
    }),
    safeJson<Paginated<FAQ>>('/api/faqs?category=General&status=published&limit=6', fetch, {
      items: [],
      pagination: { page: 1, limit: 6, total: 0, totalPages: 0 }
    }),
    safeJson<Paginated<GalleryItem>>('/api/gallery?status=published&limit=8', fetch, {
      items: [],
      pagination: { page: 1, limit: 8, total: 0, totalPages: 0 }
    }),
    safeJson<Paginated<Testimonial>>('/api/testimonials?status=published&limit=12', fetch, {
      items: [],
      pagination: { page: 1, limit: 12, total: 0, totalPages: 0 }
    })
  ]);

  const sections = Object.fromEntries(sectionRows.map((section) => [section.section_key, section]));
  const destinations = [...destinationPage.items]
    .sort((a, b) => Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured)))
    .slice(0, 6);
  // The API already supplies editorial sort_order. Featured reviews are lifted
  // ahead of non-featured ones without disturbing the CMS order within either
  // group, then capped so traveller proof does not lengthen the homepage.
  const testimonials = testimonialPage.items
    .map((testimonial, index) => ({ testimonial, index }))
    .sort((a, b) =>
      Number(Boolean(b.testimonial.is_featured)) - Number(Boolean(a.testimonial.is_featured))
      || a.index - b.index
    )
    .slice(0, 3)
    .map(({ testimonial }) => testimonial);

  return {
    sections,
    tours: tourPage.items,
    destinations,
    faqs: faqPage.items,
    gallery: galleryPage.items,
    testimonials
  };
};
