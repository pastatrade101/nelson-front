import { cachedJson } from '$lib/cache';

/**
 * A light index of the site's published detail pages — travel styles, safaris,
 * destinations, stays and experiences — reduced to a slug, a name and the URL
 * each one lives at.
 *
 * Two places use it: the server hook that sends an outdated or mistyped address
 * (`/tanzania-family-safari`) to the page it meant, and the error page, which
 * offers the closest real pages instead of a dead end.
 */

export type SitePageKind = 'style' | 'tour' | 'destination' | 'lodge' | 'category';

export type SitePage = { kind: SitePageKind; slug: string; title: string; href: string };

/** Each collection and where its pages live, in the order an exact slug match is preferred. */
const SOURCES: Array<{ kind: SitePageKind; url: string; base: string }> = [
  { kind: 'style', url: '/api/travel-styles?status=published&limit=100', base: '/travel-styles' },
  { kind: 'tour', url: '/api/tours?status=published&limit=100', base: '/tours' },
  { kind: 'destination', url: '/api/destinations?status=published&limit=100', base: '/destinations' },
  { kind: 'lodge', url: '/api/lodges?status=published&limit=200', base: '/accommodation' },
  { kind: 'category', url: '/api/categories?status=published&limit=100', base: '/experiences' }
];

/** What to call each kind of page when it is offered to a visitor. */
export const KIND_LABEL: Record<SitePageKind, string> = {
  style: 'Travel style',
  tour: 'Safari',
  destination: 'Destination',
  lodge: 'Accommodation',
  category: 'Experience'
};

/** Path prefixes that hold one kind of page, including singular spellings people guess. */
const PREFIX_KIND: Record<string, SitePageKind> = {
  'travel-styles': 'style',
  'travel-style': 'style',
  tours: 'tour',
  tour: 'tour',
  destinations: 'destination',
  destination: 'destination',
  accommodation: 'lodge',
  lodges: 'lodge',
  lodge: 'lodge',
  experiences: 'category',
  experience: 'category'
};

type ListBody = { data?: { items?: Array<Record<string, unknown>> } };

/**
 * Every published page in the index. `complete` is false when a collection
 * could not be read, so a caller caching the result knows to retry soon.
 */
export const loadSitePages = async (fetchFn: typeof fetch): Promise<{ pages: SitePage[]; complete: boolean }> => {
  let complete = true;
  const lists = await Promise.all(
    SOURCES.map(async (source) => {
      try {
        const body = await cachedJson<ListBody>(source.url, fetchFn);
        return (body?.data?.items ?? [])
          .filter((item) => typeof item.slug === 'string' && item.slug && (!item.status || item.status === 'published'))
          .map((item) => ({
            kind: source.kind,
            slug: String(item.slug),
            title: String(item.name ?? item.title ?? item.slug),
            href: `${source.base}/${item.slug}`
          }));
      } catch {
        complete = false;
        return [] as SitePage[];
      }
    })
  );
  return { pages: lists.flat(), complete };
};

/** `/Tanzania_Family_Safari.html` -> `tanzania-family-safari`. */
const normaliseSlug = (raw: string): string => {
  let value = raw;
  try {
    value = decodeURIComponent(raw);
  } catch {
    // A malformed escape: match on the text as it arrived.
  }
  return value
    .toLowerCase()
    .replace(/\.(?:html?|php|aspx?)$/, '')
    .replace(/[\s_+]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
};

/** The singular/plural twin of a slug: `family-safaris` <-> `family-safari`. */
const pluralTwin = (slug: string): string => (/[^s]s$/.test(slug) ? slug.slice(0, -1) : `${slug}s`);

/**
 * Where a request that 404'd should go instead, or null when there is no
 * confident answer.
 *
 * Handles a bare slug (`/tanzania-family-safari`) and a slug under a section
 * prefix (`/travel-styles/tanzania-family-safaris`, `/lodges/giraffe-manor-tanzania`).
 * In order: the same section by exact slug, then by its plural twin, then any
 * section by exact slug, then any section by plural twin. A twin only counts
 * when exactly one page answers to it; anything vaguer is left to the error
 * page's suggestions rather than guessed.
 */
export const findRedirect = (pathname: string, pages: SitePage[]): string | null => {
  const segments = pathname.split('/').filter(Boolean);
  let kind: SitePageKind | null = null;
  let raw = '';
  if (segments.length === 1) {
    raw = segments[0];
  } else if (segments.length === 2 && PREFIX_KIND[segments[0].toLowerCase()]) {
    kind = PREFIX_KIND[segments[0].toLowerCase()];
    raw = segments[1];
  } else {
    return null;
  }

  const slug = normaliseSlug(raw);
  if (!slug) return null;
  const twin = pluralTwin(slug);
  const current = `/${segments.join('/')}`;

  // The page is listed as published at this very address, so it failed for
  // another reason (the API hiccuped). Sending it elsewhere would be wrong.
  if (pages.some((page) => page.href === current)) return null;

  const only = (matches: SitePage[]): string | null => {
    const hrefs = [...new Set(matches.map((page) => page.href))];
    return hrefs.length === 1 ? hrefs[0] : null;
  };

  if (kind) {
    const own = pages.filter((page) => page.kind === kind);
    const exact = own.find((page) => page.slug === slug);
    if (exact) return exact.href;
    const twinned = only(own.filter((page) => page.slug === twin));
    if (twinned) return twinned;
  }

  // SOURCES order decides between sections that share an exact slug.
  const exact = pages.find((page) => page.slug === slug);
  if (exact) return exact.href;
  return only(pages.filter((page) => page.slug === twin));
};

// Words that say nothing about which page was meant.
const STOP_WORDS = new Set(['a', 'an', 'and', 'the', 'of', 'in', 'to', 'for', 'with', 'from', 'on', 'at', 'by', 'or', 'not', 'page', 'html', 'htm', 'php', 'www', 'com']);

const stem = (word: string): string => (word.length > 3 && /[^s]s$/.test(word) ? word.slice(0, -1) : word);

const wordsOf = (value: string): string[] =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word))
    .map(stem);

/**
 * The real pages that share the most words with a requested path, best first.
 *
 * Rare words count for more than common ones, so `/serengeti-safari-lodge`
 * favours Serengeti pages over the dozens that merely say "safari". A section
 * prefix in the path (`/tours/…`) breaks ties toward that section instead of
 * counting as a word.
 */
export const rankSuggestions = (pathname: string, pages: SitePage[], limit = 4): SitePage[] => {
  let path = pathname;
  try {
    path = decodeURIComponent(pathname);
  } catch {
    // Score the undecoded text.
  }
  const segments = path.split('/').filter(Boolean);
  const kind = segments.length > 1 ? PREFIX_KIND[segments[0].toLowerCase()] ?? null : null;
  const wanted = new Set(wordsOf((kind ? segments.slice(1) : segments).join(' ')));
  if (!wanted.size || !pages.length) return [];

  const pageWords = pages.map((page) => new Set(wordsOf(`${page.slug} ${page.title}`)));
  const weight = new Map<string, number>();
  for (const word of wanted) {
    const count = pageWords.filter((words) => words.has(word)).length;
    if (count) weight.set(word, Math.log(1 + pages.length / count));
  }

  return pages
    .map((page, index) => {
      let score = 0;
      for (const [word, value] of weight) if (pageWords[index].has(word)) score += value;
      return { page, score, index };
    })
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(b.page.kind === kind) - Number(a.page.kind === kind) ||
        a.page.title.length - b.page.title.length ||
        a.index - b.index
    )
    .slice(0, limit)
    .map((entry) => entry.page);
};
