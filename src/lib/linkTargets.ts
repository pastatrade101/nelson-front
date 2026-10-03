// Link helpers for the admin rich-text editor: the list of real public pages a
// writer can link to, a cleaner for typed/pasted addresses, and a checker that
// says whether a site path leads anywhere. Kept out of the component so every
// editor on a page shares one fetch of the page list.

import { browser } from '$app/environment';
import { api } from '$lib/api/client';
import { SITE_URL } from '$lib/config/env';

export type LinkTarget = { label: string; path: string; group: string };

/**
 * Pages that exist as folders under src/routes. `listed: false` keeps a real
 * page out of the picker (personal or utility pages nobody links to from an
 * article) while still letting the checker accept it.
 */
const STATIC_PAGES: Array<LinkTarget & { listed?: boolean }> = [
  { label: 'Home', path: '/', group: 'Key pages' },
  { label: 'All safaris', path: '/tours', group: 'Key pages' },
  { label: 'All destinations', path: '/destinations', group: 'Key pages' },
  { label: 'Accommodation', path: '/accommodation', group: 'Key pages' },
  { label: 'Travel styles', path: '/travel-styles', group: 'Key pages' },
  { label: 'Safari styles', path: '/safari-styles', group: 'Key pages' },
  { label: 'Experiences', path: '/experiences', group: 'Key pages' },
  { label: 'Plan My Trip', path: '/plan-my-trip', group: 'Key pages' },
  { label: 'Contact', path: '/contact', group: 'Key pages' },
  { label: 'About', path: '/about', group: 'Key pages' },
  { label: 'Journal', path: '/blog', group: 'Key pages' },
  { label: 'Gallery', path: '/gallery', group: 'Key pages' },
  { label: 'Safety', path: '/safety', group: 'Key pages' },
  { label: 'Expert advice', path: '/expert-advice', group: 'Key pages' },
  { label: 'Safari essentials', path: '/safari-essentials', group: 'Key pages' },
  { label: 'All comparisons', path: '/compare', group: 'Key pages' },
  { label: 'Departure dates', path: '/departures', group: 'Key pages' },
  { label: 'Destination scores', path: '/destination-scores', group: 'Key pages' },
  { label: 'Trip finder', path: '/trip-finder', group: 'Key pages' },
  { label: 'Safaris by departure country', path: '/safaris', group: 'Key pages' },
  { label: 'Enquiry form', path: '/enquiry', group: 'Key pages' },
  { label: 'Privacy policy', path: '/privacy', group: 'Policies' },
  { label: 'Terms of service', path: '/terms', group: 'Policies' },
  { label: 'Cancellation policy', path: '/cancellation-policy', group: 'Policies' },
  { label: 'Data retention', path: '/data-retention', group: 'Policies' },
  { label: 'Shortlist', path: '/shortlist', group: 'Key pages', listed: false },
  { label: 'Trip portal', path: '/trip', group: 'Key pages', listed: false },
  { label: 'Sitemap', path: '/sitemap.xml', group: 'Key pages', listed: false },
  { label: 'Robots file', path: '/robots.txt', group: 'Key pages', listed: false }
];

/** Old addresses that the site forwards elsewhere (see the route's +page.ts). */
const REDIRECTS: Record<string, string> = {
  '/kilimanjaro': '/destinations/kilimanjaro'
};

/** Routes with a slug whose pages we can list, by first path segment. */
const DYNAMIC_GROUPS: Record<string, string> = {
  tours: 'Itineraries',
  destinations: 'Destinations',
  'travel-styles': 'Travel styles',
  experiences: 'Experiences',
  accommodation: 'Accommodation',
  compare: 'Comparisons',
  blog: 'Journal',
  'safari-essentials': 'Safari essentials',
  safaris: 'Market pages'
};

/** Real routes whose pages can't be listed from here (tokens, placeholders). */
const UNCHECKED_PREFIXES = new Set(['guides', 'trip', 'quote', 'booking', 'guest-details']);

/** Same rule as src/params/countryHub.ts. */
const COUNTRY_HUB = /^[a-z]+(?:-[a-z]+)*-safaris$/;

/** Picker group order; anything not named sorts after these. */
export const GROUP_ORDER = [
  'Itineraries', 'Destinations', 'Travel styles', 'Experiences', 'Accommodation',
  'Comparisons', 'Journal', 'Safari essentials', 'Market pages', 'Key pages', 'Policies'
];

export type LinkIndex = {
  /** Everything the picker offers, in group order. */
  targets: LinkTarget[];
  /** Every known page by path, including real pages kept out of the picker. */
  byPath: Map<string, LinkTarget>;
  /** First segments whose list loaded, so a missing slug there is truly missing. */
  verified: Set<string>;
};

// ─── loading ──────────────────────────────────────────────────────────────

const INDEX_TTL = 2 * 60 * 1000; // a page published in another tab shows up soon
let cached: { at: number; promise: Promise<LinkIndex> } | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const rowsOf = (r: PromiseSettledResult<unknown>): Row[] | null => {
  if (r.status !== 'fulfilled') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = (r.value as any)?.data?.items;
  return Array.isArray(items) ? (items as Row[]) : null;
};

const titleOf = (it: Row) =>
  String(it.title ?? it.name ?? it.hero_title ?? it.slug).replace(/\s+/g, ' ').trim();

const hubSlug = (country: string) =>
  `${country.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '')}-safaris`;

const buildIndex = async (): Promise<LinkIndex> => {
  const published = { status: 'published', limit: 200 };
  const sources: Array<[string, Promise<unknown>]> = [
    ['tours', api.tours.list(published)],
    ['destinations', api.destinations.list(published)],
    // The travel-styles list returns drafts too unless asked for published only.
    ['travel-styles', api.travelStyles.list(published)],
    ['experiences', api.categories.list(published)],
    ['accommodation', api.lodges.list(published)],
    ['compare', api.comparisons.list(published)],
    ['blog', api.blog.list(published)],
    ['safari-essentials', api.safariEssentials.list(published)],
    ['safaris', api.marketPages.list(published)]
  ];
  const settled = await Promise.allSettled(sources.map(([, p]) => p));

  const targets: LinkTarget[] = [];
  const verified = new Set<string>();
  const countries = new Set<string>();

  settled.forEach((result, i) => {
    const prefix = sources[i][0];
    const rows = rowsOf(result);
    if (!rows) return;
    verified.add(prefix);
    for (const it of rows) {
      if (!it?.slug || (it.status && it.status !== 'published')) continue;
      targets.push({ label: titleOf(it), path: `/${prefix}/${it.slug}`, group: DYNAMIC_GROUPS[prefix] });
      if (prefix === 'destinations' && it.country) countries.add(String(it.country));
      if (prefix === 'tours' && Array.isArray(it.countries)) it.countries.forEach((c: unknown) => c && countries.add(String(c)));
    }
  });

  // A country hub (/tanzania-safaris) is live once that country has a
  // published destination or trip.
  for (const country of countries) {
    targets.push({ label: `${country} safaris`, path: `/${hubSlug(country)}`, group: 'Key pages' });
  }
  if (verified.has('destinations') && verified.has('tours')) verified.add('hubs');

  targets.push(...STATIC_PAGES.filter((p) => p.listed !== false).map(({ label, path, group }) => ({ label, path, group })));

  const rank = (g: string) => {
    const i = GROUP_ORDER.indexOf(g);
    return i === -1 ? GROUP_ORDER.length : i;
  };
  targets.sort((a, b) => rank(a.group) - rank(b.group));

  const byPath = new Map<string, LinkTarget>();
  for (const t of [...targets, ...STATIC_PAGES]) if (!byPath.has(t.path)) byPath.set(t.path, t);

  return { targets, byPath, verified };
};

/** The shared page index; one fetch serves every editor on the page. */
export const loadLinkIndex = (): Promise<LinkIndex> => {
  if (cached && Date.now() - cached.at < INDEX_TTL) return cached.promise;
  const promise = buildIndex();
  cached = { at: Date.now(), promise };
  // Don't remember a fully failed load (offline, expired session) — retry next time.
  promise.then(
    (idx) => { if (!idx.verified.size && cached?.promise === promise) cached = null; },
    () => { if (cached?.promise === promise) cached = null; }
  );
  return promise;
};

// ─── cleaning ─────────────────────────────────────────────────────────────

const TRACKING_PARAM = /^(utm_[a-z0-9_]*|gclid|gbraid|wbraid|fbclid|msclkid|mc_cid|mc_eid|igshid|ref_src|_ga|_gl|srsltid)$/i;

/** Hosts that mean "this site": the live domain, PUBLIC_SITE_URL and the admin's own origin. */
const siteHosts = (): Set<string> => {
  const hosts = new Set(['emneladventures.com']);
  const add = (host: string) => host && hosts.add(host.toLowerCase().replace(/^www\./, ''));
  try { if (SITE_URL) add(new URL(SITE_URL).host); } catch { /* not a URL */ }
  if (browser) add(window.location.host);
  return hosts;
};

export type CleanResult = {
  url: string;
  changed: boolean;
  /** Tracking pairs that were dropped, e.g. "utm_source=chatgpt.com". */
  removedTracking: string[];
  /** A full address on this site that became a site path. */
  madeRelative: boolean;
  /** One short sentence describing what changed, or ''. */
  notice: string;
};

const decode = (s: string) => {
  try { return decodeURIComponent(s.replace(/\+/g, ' ')); } catch { return s; }
};

/** Split a URL into what comes before the query, the query (with '?') and the hash (with '#'). */
export const splitUrl = (url: string) => {
  const m = /^([^?#]*)(\?[^#]*)?(#.*)?$/.exec(url) ?? [url, url, '', ''];
  return { base: m[1] ?? '', query: m[2] ?? '', hash: m[3] ?? '' };
};

/**
 * Tidy an address a writer typed or pasted: drop tracking parameters, turn a
 * full address on this site into a site path ("/tours/…"), and drop a trailing
 * slash. Everything else is left exactly as written.
 */
export const cleanUrl = (raw: string): CleanResult => {
  const input = raw.trim();
  const notes: string[] = [];
  const removedTracking: string[] = [];
  let madeRelative = false;
  let url = input;

  if (!url || /^(mailto|tel):/i.test(url) || url.startsWith('#')) {
    return { url, changed: url !== raw, removedTracking, madeRelative, notice: '' };
  }

  if (url.startsWith('//')) url = `https:${url}`;
  else if (!/^[a-z][a-z0-9+.-]*:/i.test(url) && !url.startsWith('/') && !url.startsWith('?')) {
    // "www.example.com/x" or "example.com" → https://…; "tours/x" → "/tours/x".
    if (/^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?([/?#]|$)/i.test(url) && !/^[^/]*\.(html?|php)$/i.test(url)) {
      url = `https://${url}`;
      notes.push('Added https://');
    } else {
      url = `/${url}`;
      notes.push('Added a leading /');
    }
  }

  // Full address on this site → site path.
  const abs = /^https?:\/\/([^/?#]*)(.*)$/i.exec(url);
  if (abs) {
    const host = abs[1].replace(/^[^@]*@/, '').toLowerCase().replace(/^www\./, '');
    if (siteHosts().has(host)) {
      const rest = abs[2] || '/';
      url = rest.startsWith('/') ? rest : `/${rest}`;
      madeRelative = true;
    }
  }

  let { base, query, hash } = splitUrl(url);

  if (query) {
    const kept: string[] = [];
    for (const pair of query.slice(1).split('&')) {
      if (!pair) continue;
      const key = decode(pair.split('=')[0]);
      if (TRACKING_PARAM.test(key)) removedTracking.push(decode(pair));
      else kept.push(pair);
    }
    query = kept.length ? `?${kept.join('&')}` : '';
    if (removedTracking.length) notes.unshift(`Removed tracking: ${removedTracking.join(', ')}`);
  }

  // "#:~:text=…" is a highlight copied from a search result, not a real anchor.
  if (hash.startsWith('#:~:')) {
    hash = '';
    notes.push('Removed a text highlight');
  }

  const internal = base.startsWith('/');
  if (internal && base.length > 1 && base.endsWith('/')) {
    base = base.replace(/\/+$/, '') || '/';
    if (!madeRelative) notes.push('Dropped the trailing /');
  }
  if (madeRelative) notes.push('Made it a site link');

  url = `${base}${query}${hash}`;
  return { url, changed: url !== input, removedTracking, madeRelative, notice: notes.join(' · ') };
};

// ─── checking ─────────────────────────────────────────────────────────────

export type LinkCheck =
  | { kind: 'empty' }
  | { kind: 'external'; host: string }
  | { kind: 'mail' }
  | { kind: 'phone' }
  | { kind: 'anchor' }
  | { kind: 'checking' }
  | { kind: 'ok'; target: LinkTarget }
  | { kind: 'redirect'; to: string }
  | { kind: 'unverified' }
  | { kind: 'broken'; reason: string; suggestions: LinkTarget[] };

export const isInternal = (url: string) => url.startsWith('/') && !url.startsWith('//');

const stem = (w: string) => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w);
const slugWords = (path: string) => {
  const last = path.split('/').filter(Boolean).pop() ?? '';
  return new Set(last.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 1).map(stem));
};

/** Up to `max` known pages whose slug shares the most words with `path`. */
export const suggestFor = (path: string, index: LinkIndex, max = 3): LinkTarget[] => {
  const want = slugWords(path);
  if (!want.size) return [];
  const prefix = path.split('/').filter(Boolean)[0] ?? '';
  const scored: Array<{ t: LinkTarget; score: number }> = [];
  for (const t of index.byPath.values()) {
    if (t.path === '/' || t.path.includes('.')) continue;
    const have = slugWords(t.path);
    let shared = 0;
    for (const w of want) if (have.has(w)) shared++;
    if (!shared) continue;
    // Word overlap (Jaccard), nudged towards the section the writer typed.
    const score = shared / (want.size + have.size - shared) + (t.path.split('/')[1] === prefix ? 0.15 : 0);
    if (score >= 0.2) scored.push({ t, score });
  }
  return scored
    .sort((a, b) => b.score - a.score || a.t.path.length - b.t.path.length)
    .slice(0, max)
    .map((s) => s.t);
};

const NO_PAGE = 'No page at this address';

/** Where an (already cleaned) address leads. `index` null means the page list is still loading. */
export const checkLink = (url: string, index: LinkIndex | null): LinkCheck => {
  const value = url.trim();
  if (!value) return { kind: 'empty' };
  if (/^mailto:/i.test(value)) return { kind: 'mail' };
  if (/^tel:/i.test(value)) return { kind: 'phone' };
  if (value.startsWith('#')) return { kind: 'anchor' };
  if (!isInternal(value)) {
    const host = /^[a-z][a-z0-9+.-]*:\/\/([^/?#]*)/i.exec(value)?.[1] ?? value;
    return { kind: 'external', host: host.replace(/^[^@]*@/, '').replace(/^www\./i, '') };
  }
  if (!index) return { kind: 'checking' };

  let path = splitUrl(value).base.replace(/\/{2,}/g, '/');
  if (path.length > 1) path = path.replace(/\/+$/, '');
  path = (() => { try { return decodeURI(path); } catch { return path; } })();

  const known = index.byPath.get(path);
  if (known) return { kind: 'ok', target: known };

  const redirect = REDIRECTS[path];
  if (redirect && index.byPath.has(redirect)) return { kind: 'redirect', to: redirect };

  const segs = path.split('/').filter(Boolean);
  const first = segs[0] ?? '';
  const broken = (reason = NO_PAGE): LinkCheck => ({ kind: 'broken', reason, suggestions: suggestFor(path, index) });

  if (first === 'admin' || first === 'api') return broken('Not a public page');
  if (UNCHECKED_PREFIXES.has(first) && segs.length === 2) return { kind: 'unverified' };
  if (DYNAMIC_GROUPS[first] && segs.length === 2 && !index.verified.has(first)) return { kind: 'unverified' };
  if (segs.length === 1 && COUNTRY_HUB.test(first) && !index.verified.has('hubs')) return { kind: 'unverified' };
  return broken();
};

/** One line for a check result, as shown under the URL field. */
export const describeCheck = (check: LinkCheck): string => {
  switch (check.kind) {
    case 'ok': return `Links to: ${check.target.label}`;
    case 'external': return `External site (${check.host}) — opens in a new tab`;
    case 'mail': return 'Email link — opens the visitor’s mail app';
    case 'phone': return 'Phone link — dials on mobile';
    case 'anchor': return 'Jumps to a section on the same page';
    case 'checking': return 'Checking…';
    case 'redirect': return `Old address — it forwards to ${check.to}`;
    case 'unverified': return 'Site page — this one can’t be checked from here';
    case 'broken': return check.reason;
    default: return '';
  }
};

/** Swap the path of `url` for `path`, keeping its query and hash. */
export const withPath = (url: string, path: string) => {
  const { query, hash } = splitUrl(url);
  return `${path}${query}${hash}`;
};
