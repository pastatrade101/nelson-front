import type { Branding } from '$lib/branding';

export type SeoOverride = {
  path?: string;
  title?: string | null;
  meta_description?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image_url?: string | null;
  canonical_url?: string | null;
  robots?: string | null;
  structured_data?: Record<string, unknown> | unknown[] | null;
};

export type ResolvedPageSeo = {
  title: string;
  description: string;
  image?: string;
  imageAlt?: string;
  type?: 'article' | 'website';
  noindex?: boolean;
};

type ContentRecord = Record<string, unknown>;

// Admin screens, personal trip links and funnel/form steps should never become
// search results, nor should an editor be able to accidentally opt them in.
export const isPrivateOrUtilityPath = (path: string): boolean =>
  /^\/(admin|api|booking|quote|trip|shortlist|enquiry|guest-details)(\/|$)/i.test(path);

export const disallowsIndexing = (robots?: string | null): boolean =>
  /(?:^|[\s,;])(noindex|none)(?=$|[\s,;])/i.test(robots ?? '');

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const record = (value: unknown): ContentRecord => (value && typeof value === 'object' && !Array.isArray(value) ? value as ContentRecord : {});
const pick = (...values: unknown[]): string => values.map(text).find(Boolean) ?? '';

/** Never let a malformed CMS canonical setting poison every public URL. */
export const safeSiteOrigin = (configured: string, fallback: string): string => {
  const safeFallback = new URL(fallback).origin;
  try {
    const url = new URL(configured.trim() || fallback);
    const isRoot = url.pathname === '/' || url.pathname === '';
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || !isRoot) {
      return safeFallback;
    }
    return url.origin;
  } catch {
    return safeFallback;
  }
};

export const canonicalForPath = (origin: string, path: string, override?: string | null): string => {
  const candidate = text(override);
  if (candidate) {
    try {
      const url = new URL(candidate);
      if (['http:', 'https:'].includes(url.protocol)) return url.toString();
    } catch {
      // The API schema rejects invalid URLs. This fallback also protects old rows.
    }
  }
  return `${origin}${path === '/' ? '/' : path.replace(/\/+$/, '')}`;
};

const staticSeo: Record<string, Pick<ResolvedPageSeo, 'title' | 'description'>> = {
  '/tours': {
    title: 'Safari Itineraries | Emnel Adventures',
    description: 'Browse and filter private Tanzania safari itineraries by destination, experience, length, price and comfort level.'
  },
  '/destinations': {
    title: 'Tanzania Safari Destinations & National Parks | Emnel Adventures',
    description: 'Explore Tanzania’s safari destinations — the Serengeti, Ngorongoro, Tarangire, southern parks and the islands of Zanzibar, Pemba and Mafia.'
  },
  '/experiences': {
    title: 'Safari Experiences in Tanzania | Emnel Adventures',
    description: 'Browse Tanzania safaris by what you want to experience — the Great Migration, big cats, walking safaris, culture and the Zanzibar coast.'
  },
  '/accommodation': {
    title: 'Tanzania Safari Lodges, Camps & Beach Stays | Emnel Adventures',
    description: 'Find your Tanzania stay. Browse hand-picked safari lodges, tented camps and island retreats by destination, comfort and property type.'
  },
  '/plan-my-trip': {
    title: 'Plan Your Tanzania Safari | Emnel Adventures',
    description: 'Plan a private Tanzania safari with a local specialist. Tell us your dates and rough budget and we will come back with an honest plan.'
  },
  '/departures': {
    title: 'Scheduled Departures | Emnel Adventures',
    description: 'Upcoming scheduled departure dates for Tanzania safaris. Every trip can also be run privately on dates that suit you.'
  },
  '/trip-finder': {
    title: 'Find Your Tanzania Safari | Emnel Adventures',
    description: 'Answer a few questions and we will match you to a Tanzania safari that fits — or put you straight through to a specialist.'
  },
  '/kilimanjaro': {
    title: 'Kilimanjaro Climbing Tours | Emnel Adventures',
    description: 'Plan a Kilimanjaro climb with practical route advice, experienced guides and a clear plan for your dates and fitness.'
  },
  '/blog': {
    title: 'Travel Notes | Emnel Adventures',
    description: 'Field notes and planning writing from the Emnel team — what we have learned guiding safaris in Tanzania.'
  },
  '/expert-advice': {
    title: 'Expert Advice | Emnel Adventures',
    description: 'Honest Tanzania safari advice — costs, timing, safety, Kilimanjaro routes and Zanzibar beach escapes from local experts.'
  },
  '/gallery': {
    title: 'Safari Gallery — Real Moments from Tanzania | Emnel Adventures',
    description: 'A gallery of real moments from Emnel Adventures safaris — Serengeti, Ngorongoro, the Great Migration and Zanzibar.'
  },
  '/compare': {
    title: 'Compare Tanzania Safari Options | Emnel Adventures',
    description: 'Honest side-by-side comparisons of Tanzania parks, seasons and safari choices, so you can see the trade-offs rather than guess.'
  },
  '/about': {
    title: 'About Emnel Adventures — Private Tanzania Safaris from Arusha',
    description: 'Emnel Adventures is a family-founded, locally owned Tanzania safari company based in Arusha.'
  },
  '/contact': {
    title: 'Contact Emnel Adventures | Plan Your Tanzania Safari',
    description: 'Get in touch with Emnel Adventures to start planning your private Tanzania safari by WhatsApp, email or enquiry form.'
  },
  '/destination-scores': {
    title: 'How Tanzania’s Destinations Score | Emnel Adventures',
    description: 'Serengeti, Ngorongoro, Tarangire and the rest, scored for wildlife, luxury, families, photography and adventure.'
  },
  '/safety': {
    title: 'Health & Safety Guide | Emnel Adventures',
    description: 'Honest health and safety guidance for safaris in Tanzania, Kenya and Zanzibar — vaccinations, wildlife, insurance and support.'
  },
  '/privacy': {
    title: 'Privacy Policy | Emnel Adventures',
    description: 'How Emnel Adventures collects, uses and protects your information when you browse our site or plan a trip with us.'
  },
  '/terms': {
    title: 'Terms of Service | Emnel Adventures',
    description: 'The terms that govern your use of the Emnel Adventures website, including how booking requests and pricing work.'
  },
  '/cancellation-policy': {
    title: 'Cancellation Policy | Emnel Adventures',
    description: 'How cancellations, changes and refunds work at Emnel Adventures, from a planning request through to a confirmed trip.'
  },
  '/data-retention': {
    title: 'Data Retention | Emnel Adventures',
    description: 'How long Emnel Adventures keeps your information, and how to ask us to delete your data.'
  },
  '/safari-essentials': {
    title: 'Tanzania Safari Essentials | Emnel Adventures',
    description: 'Straight answers to the questions that decide a safari: when to go, what it costs, how the migration times out and what to pack.'
  },
  '/travel-styles': {
    title: 'Travel Styles | Emnel Adventures',
    description: 'Honeymoon, family, luxury, photography, group and solo — we shape a Tanzania safari around how you travel, not only where you go.'
  },
  '/safari-styles': {
    title: 'Safari Styles | Emnel Adventures',
    description: 'Every Emnel safari is private and tailor-made. Find the style that fits your family, honeymoon, wildlife, luxury or photography plans.'
  },
  '/safaris': {
    title: 'Tanzania Safari Packages | Emnel Adventures',
    description: 'Explore carefully designed Tanzania safari options and talk to a local specialist about the version that fits your dates and priorities.'
  }
};

const entitySeo = (path: string, data: ContentRecord, brand: Branding): ResolvedPageSeo | null => {
  const company = brand.company_name;
  const detail = (value: unknown, fallbackSuffix = company): ResolvedPageSeo | null => {
    const item = record(value);
    const name = pick(item.title, item.hero_title, item.name);
    if (!name) return null;
    const description = pick(item.meta_description, item.short_description, item.summary, item.excerpt, item.hero_subtitle, item.description, brand.positioning);
    return {
      title: pick(item.meta_title, item.seo_title, `${name} | ${fallbackSuffix}`),
      description,
      image: pick(item.og_image_url, item.social_image_url, item.featured_image_url, item.hero_image_url, item.main_image_url, item.banner_image_url, item.image_url),
      imageAlt: name,
      type: path.startsWith('/blog/') || path.startsWith('/safari-essentials/') ? 'article' : 'website',
      noindex: item.noindex === true || item.indexable === false
    };
  };

  if (/^\/tours\/[^/]+$/.test(path)) return detail(data.tour);
  if (/^\/destinations\/[^/]+$/.test(path)) return detail(data.destination);
  if (/^\/accommodation\/[^/]+$/.test(path)) return detail(data.lodge);
  if (/^\/experiences\/[^/]+$/.test(path)) return detail(data.category);
  if (/^\/travel-styles\/[^/]+$/.test(path)) return detail(data.style);
  if (/^\/safari-essentials\/[^/]+$/.test(path)) return detail(data.article);
  if (/^\/safaris\/[^/]+$/.test(path)) return detail(data.page);
  if (/^\/blog\/[^/]+$/.test(path)) return detail(data.post);
  if (/^\/compare\/[^/]+$/.test(path)) return detail(data.cmp);

  if (/^\/[a-z-]+-safaris$/.test(path)) {
    const country = text(data.country);
    if (country) {
      return {
        title: `Private ${country} Safaris | ${company}`,
        description: `Private, tailor-made ${country} safaris designed by local experts, with transparent planning and no fixed departures.`
      };
    }
  }
  return null;
};

/**
 * Supplies a meaningful, server-rendered default for every public route. Page
 * SEO overrides are applied separately by the root layout, so content keeps its
 * own CMS title while an editor can safely replace it when needed.
 */
export const resolvePageSeo = (pathname: string, pageData: unknown, brand: Branding): ResolvedPageSeo => {
  const path = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
  const data = record(pageData);
  const entity = entitySeo(path, data, brand);
  if (entity) return entity;

  if (path === '/') {
    const sections = record(data.sections);
    const homepageSeo = record(sections.seo);
    return {
      title: pick(homepageSeo.title, `${brand.tagline.replace(/[.,\s]+$/, '')} | ${brand.company_name}`),
      description: pick(homepageSeo.description, `${brand.tagline.replace(/[.\s]+$/, '')}. ${brand.positioning}`)
    };
  }

  const staticPage = staticSeo[path];
  if (staticPage) return staticPage;
  return { title: brand.site_name, description: `${brand.tagline}. ${brand.positioning}` };
};
