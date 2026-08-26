/**
 * Market landing page differentiation assessment.
 *
 * A market page earns the right to be indexed by answering questions that are
 * FALSE for other markets. Flight time from Dubai is not flight time from
 * London; Eid is not half-term. If you can find-and-replace the market name and
 * the page is still true, Google is right to treat it as a doorway page.
 *
 * This module encodes that as deterministic checks. It deliberately does NOT
 * count how often the market is named — a mention count is trivially satisfied
 * by sprinkling "Dubai" through generic copy, which is precisely the failure it
 * is supposed to catch. Instead it looks for the *kinds of fact* that can only
 * be written by someone who thought about that market, and it measures how
 * widely those facts are spread across the page rather than how densely they
 * cluster in one block.
 *
 * It is a warning system, not a ranking model. There is no attempt to predict
 * Google; the output is editorial evidence for a human decision.
 */

/**
 * Structural input rather than MarketPage: the admin assesses an unsaved draft
 * whose blocks are still loose records, and every check here walks values
 * generically. Coupling to the block union would buy nothing and force a cast.
 */
export type AssessablePage = {
  slug?: string | null;
  name?: string | null;
  market_code?: string | null;
  hero_eyebrow?: string | null;
  hero_title?: string | null;
  hero_subtitle?: string | null;
  hero_cta_label?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  /** unknown, not string[]: the admin's own row type declares it loosely. */
  featured_tour_ids?: unknown;
  /** unknown, not unknown[]: the admin's own row type declares it loosely. */
  sections?: unknown;
  noindex?: boolean | null;
  status?: string | null;
  id?: string | null;
};

export type SignalKey =
  | 'market_faq'
  | 'flight_routing'
  | 'travel_time'
  | 'trip_duration'
  | 'seasonality'
  | 'local_calendar'
  | 'visa_entry'
  | 'beach_extension'
  | 'package_positioning'
  | 'market_cta'
  | 'content_spread';

export type Signal = {
  key: SignalKey;
  label: string;
  /** Core signals are the ones that are hardest to fake and matter most. */
  core: boolean;
  present: boolean;
  /** What was actually found (or what is missing), in the editor's language. */
  detail: string;
};

export type SimilarPage = {
  slug: string;
  name: string;
  /** 0–1 Jaccard overlap AFTER market names are masked out of both pages. */
  overlap: number;
};

export type Verdict = 'strong' | 'moderate' | 'weak';

export type Assessment = {
  verdict: Verdict;
  signals: Signal[];
  /** Signals that were found — the "why" bullets for a positive result. */
  strengths: string[];
  /** What is missing or wrong — the "why" bullets for a warning. */
  gaps: string[];
  /** Indexable pages this one substantially duplicates. */
  similar: SimilarPage[];
  /** True when the editor must explicitly acknowledge before going indexable. */
  requiresAcknowledgement: boolean;
};

// ---------------------------------------------------------------------------
// Market vocabulary. `market_code` is what makes this work: it tells the guard
// which market it is judging, so it can look for THAT market's airports,
// holidays and place names rather than generic travel words.
// ---------------------------------------------------------------------------

type MarketVocab = {
  /** Place/demonym words that identify the market. */
  names: string[];
  /** Departure airports and carriers that would appear in real routing copy. */
  hubs: string[];
  /** Holiday and school-break vocabulary specific to this market. */
  calendar: string[];
};

const MARKETS: Record<string, MarketVocab> = {
  AE: {
    names: ['dubai', 'uae', 'united arab emirates', 'emirati', 'abu dhabi', 'sharjah', 'gulf'],
    hubs: ['dxb', 'auh', 'shj', 'flydubai', 'emirates', 'etihad', 'air arabia'],
    calendar: ['eid', 'ramadan', 'national day', 'winter break', 'spring break', 'school holiday']
  },
  GB: {
    names: ['uk', 'united kingdom', 'britain', 'british', 'london', 'manchester', 'england', 'scotland'],
    hubs: ['lhr', 'lgw', 'man', 'heathrow', 'gatwick', 'british airways', 'klm', 'kenya airways'],
    calendar: ['half term', 'half-term', 'bank holiday', 'easter holidays', 'summer holidays', 'christmas holidays']
  },
  US: {
    names: ['usa', 'united states', 'america', 'american', 'new york', 'los angeles', 'chicago'],
    hubs: ['jfk', 'ewr', 'iad', 'atl', 'ord', 'lax', 'delta', 'united airlines', 'qatar airways'],
    calendar: ['thanksgiving', 'spring break', 'labor day', 'memorial day', 'fourth of july', 'winter break']
  },
  DE: {
    names: ['germany', 'german', 'berlin', 'munich', 'frankfurt'],
    hubs: ['fra', 'muc', 'ber', 'lufthansa', 'condor'],
    calendar: ['sommerferien', 'herbstferien', 'summer holidays', 'autumn break', 'easter break']
  },
  IN: {
    names: ['india', 'indian', 'mumbai', 'delhi', 'bengaluru', 'bangalore'],
    hubs: ['bom', 'del', 'blr', 'indigo', 'air india', 'kenya airways'],
    calendar: ['diwali', 'holi', 'dussehra', 'summer vacation', 'school vacation']
  }
};

/** Words that identify a market even when no market_code is set. */
const vocabFor = (page: { market_code?: string | null; name?: string | null }): MarketVocab => {
  const code = page.market_code?.trim().toUpperCase();
  if (code && MARKETS[code]) return MARKETS[code];

  // No usable code — fall back to the admin label, which is usually the city or
  // country ("Dubai", "UK"). Weaker, and the guard says so.
  const name = (page.name ?? '').trim().toLowerCase();
  const known = Object.values(MARKETS).find((v) => v.names.some((n) => n === name || name.includes(n)));
  if (known) return known;
  return { names: name ? [name] : [], hubs: [], calendar: [] };
};

// ---------------------------------------------------------------------------
// Text extraction
// ---------------------------------------------------------------------------

/** Sections as an array, whatever the caller's type says it is. */
const sectionsOf = (page: AssessablePage): unknown[] => (Array.isArray(page.sections) ? page.sections : []);

/** Every string inside a block, flattened — block shapes vary too much to map. */
const blockText = (block: unknown): string => {
  const out: string[] = [];
  const walk = (value: unknown) => {
    if (typeof value === 'string') out.push(value);
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === 'object') Object.values(value).forEach(walk);
  };
  walk(block);
  return out.join(' ');
};

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, ' ');

const normalise = (value: string) => stripHtml(value).toLowerCase().replace(/\s+/g, ' ').trim();

type PageText = {
  /** Whole page, normalised. */
  all: string;
  /** Per-block text, normalised, keyed by block type (blocks may repeat). */
  blocks: { type: string; text: string }[];
};

const readPage = (page: AssessablePage): PageText => {
  const blocks = sectionsOf(page).map((b) => ({
    type: String((b as { type?: unknown })?.type ?? ''),
    text: normalise(blockText(b))
  }));
  const chrome = [page.hero_eyebrow, page.hero_title, page.hero_subtitle, page.hero_cta_label, page.meta_title, page.meta_description]
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map(normalise);
  return { all: [...chrome, ...blocks.map((b) => b.text)].join(' '), blocks };
};

const escapeRe = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Whole-word matching, not substring.
 *
 * Three-letter airport codes are the reason: `ber` matches inside "Berlin",
 * `man` inside "Lake Manyara", `lax` inside "relax". Substring matching reported
 * departure airports on pages that named none, which is exactly the kind of
 * false positive that would let a thin page look differentiated.
 */
const mentions = (haystack: string, needles: string[]): boolean =>
  needles.some((n) => {
    if (!n) return false;
    return new RegExp(`(?:^|[^a-z0-9])${escapeRe(n)}(?:[^a-z0-9]|$)`).test(haystack);
  });

// ---------------------------------------------------------------------------
// Similarity — the doorway detector
// ---------------------------------------------------------------------------

/** Every market word we know, so a comparison can be made market-blind. */
const ALL_MARKET_WORDS = [...new Set(Object.values(MARKETS).flatMap((v) => [...v.names, ...v.hubs, ...v.calendar]))]
  .sort((a, b) => b.length - a.length); // longest first, so "abu dhabi" beats "dubai"

/**
 * Mask out every market-identifying word, then compare. This is the whole trick:
 * two pages that differ ONLY by market name become identical once the names are
 * removed, which is exactly the doorway-page signature. Comparing the raw text
 * would let a find-and-replace clone look different enough to pass.
 */
const maskMarketWords = (text: string, extra: string[] = []): string => {
  let out = text;
  for (const word of [...extra, ...ALL_MARKET_WORDS]) {
    if (!word) continue;
    out = out.split(word).join(' ');
  }
  return out.replace(/\s+/g, ' ').trim();
};

/** Overlapping word-shingles; k=5 is long enough to ignore incidental phrasing. */
const shingles = (text: string, k = 5): Set<string> => {
  const words = text.split(' ').filter(Boolean);
  const set = new Set<string>();
  for (let i = 0; i + k <= words.length; i++) set.add(words.slice(i, i + k).join(' '));
  return set;
};

const jaccard = (a: Set<string>, b: Set<string>): number => {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const s of a) if (b.has(s)) shared++;
  return shared / (a.size + b.size - shared);
};

// ---------------------------------------------------------------------------
// Signal detection
// ---------------------------------------------------------------------------

const FLIGHT_WORDS = ['flight', 'flights', 'fly', 'flying', 'direct', 'nonstop', 'non-stop', 'connection', 'layover', 'via'];
const DURATION_RE = /\b\d+(?:[.,]\d+)?\s*(?:h\b|hr|hrs|hour|hours)\b/;
const TRIP_LENGTH_RE = /\b\d+\s*(?:[-–—]|\s*to\s*)\s*\d+\s*(?:day|days|night|nights)\b|\b\d+\s*(?:day|night)s?\b/;
const VISA_WORDS = ['visa', 'evisa', 'e-visa', 'entry requirement', 'passport', 'immigration', 'yellow fever'];
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

const detectSignals = (text: PageText, vocab: MarketVocab, page: AssessablePage): Signal[] => {
  const marketWords = [...vocab.names, ...vocab.hubs];
  const faqBlocks = text.blocks.filter((b) => b.type === 'faq');
  const routeish = text.blocks.filter((b) => ['route', 'relevance', 'faq', 'steps', 'prose'].includes(b.type));

  // FAQ answers that actually engage the market, counted per Q/A pair.
  const faqHits = sectionsOf(page)
    .filter((b) => (b as { type?: unknown })?.type === 'faq')
    .flatMap((b) => ((b as { items?: Array<{ question?: string; answer?: string }> }).items ?? []))
    .filter((item) => {
      const t = normalise(`${item?.question ?? ''} ${item?.answer ?? ''}`);
      return mentions(t, marketWords);
    }).length;

  const routeText = routeish.map((b) => b.text).join(' ');
  const hasFlightContext = mentions(routeText, FLIGHT_WORDS) || mentions(text.all, FLIGHT_WORDS);
  const hasHub = mentions(text.all, vocab.hubs);
  const hasTravelTime = DURATION_RE.test(routeText) && hasFlightContext;

  const seasonBlocks = sectionsOf(page).filter((b) => (b as { type?: unknown })?.type === 'season');
  const seasonEntries = seasonBlocks.flatMap((b) => ((b as { seasons?: unknown[] }).seasons ?? []));
  const hasMonths = MONTHS.filter((m) => text.all.includes(m)).length >= 2;

  const packageBlocks = sectionsOf(page).filter((b) => (b as { type?: unknown })?.type === 'packages');
  const packageText = text.blocks.filter((b) => b.type === 'packages').map((b) => b.text).join(' ');
  const packagesReferenceTours = packageBlocks.some(
    (b) => ((b as { tour_ids?: string[] }).tour_ids ?? []).length > 0
  ) || (Array.isArray(page.featured_tour_ids) && page.featured_tour_ids.length > 0);

  const ctaText = text.blocks.filter((b) => b.type === 'cta').map((b) => b.text).join(' ');
  const heroCta = normalise(`${page.hero_eyebrow ?? ''} ${page.hero_title ?? ''} ${page.hero_subtitle ?? ''} ${page.hero_cta_label ?? ''}`);

  // Breadth, not density: how many DISTINCT blocks engage the market at all.
  // This is what stops "say Dubai forty times in one paragraph" from passing.
  const blocksWithMarket = text.blocks.filter((b) => mentions(b.text, marketWords)).length;
  const spread = text.blocks.length ? blocksWithMarket / text.blocks.length : 0;

  return [
    {
      key: 'market_faq',
      label: 'Market-specific FAQ answers',
      core: true,
      present: faqHits >= 3,
      detail: faqBlocks.length
        ? `${faqHits} FAQ answer${faqHits === 1 ? '' : 's'} engage this market${faqHits >= 3 ? '' : ' (3 or more expected)'}`
        : 'No FAQ block on this page'
    },
    {
      key: 'flight_routing',
      label: 'Origin-specific flight routing',
      core: true,
      present: hasFlightContext && hasHub,
      detail: hasHub
        ? 'Departure airports or carriers for this market are named'
        : 'No departure airport or carrier for this market — routing reads generically'
    },
    {
      key: 'travel_time',
      label: 'Approximate travel time',
      core: true,
      present: hasTravelTime,
      detail: hasTravelTime ? 'Flight duration stated in hours' : 'No flight duration stated (e.g. "about 5 hours direct")'
    },
    {
      key: 'trip_duration',
      label: 'Typical trip length for this market',
      core: true,
      present: TRIP_LENGTH_RE.test(text.all),
      detail: TRIP_LENGTH_RE.test(text.all)
        ? 'A recommended trip length is stated'
        : 'No recommended trip length (Gulf travellers book shorter trips than long-haul markets)'
    },
    {
      key: 'local_calendar',
      label: 'Local holidays and school breaks',
      core: true,
      present: mentions(text.all, vocab.calendar),
      detail: mentions(text.all, vocab.calendar)
        ? 'This market’s holiday or school-break periods are referenced'
        : 'No local holiday or school-break timing — peak windows differ sharply by market'
    },
    {
      key: 'seasonality',
      label: 'Seasonal travel guidance',
      core: false,
      present: seasonEntries.length >= 2 || hasMonths,
      detail: seasonEntries.length >= 2 ? `${seasonEntries.length} seasons described` : hasMonths ? 'Months referenced in the copy' : 'No seasonal guidance'
    },
    {
      key: 'visa_entry',
      label: 'Entry / visa information',
      core: false,
      present: mentions(text.all, VISA_WORDS),
      detail: mentions(text.all, VISA_WORDS) ? 'Entry or visa requirements covered' : 'No entry or visa information'
    },
    {
      key: 'beach_extension',
      label: 'Zanzibar / beach-extension relevance',
      core: false,
      present: text.all.includes('zanzibar'),
      detail: text.all.includes('zanzibar') ? 'Beach extension is addressed' : 'Zanzibar not mentioned — its relevance varies a lot by market'
    },
    {
      key: 'package_positioning',
      label: 'Market-specific package positioning',
      core: false,
      present: packagesReferenceTours && mentions(packageText, marketWords),
      detail: !packagesReferenceTours
        ? 'No tours referenced — the page recommends nothing concrete'
        : mentions(packageText, marketWords)
          ? 'Packages are framed for this market'
          : 'Packages reference tours but are described generically'
    },
    {
      key: 'market_cta',
      label: 'Market-specific calls to action',
      core: false,
      present: mentions(ctaText, marketWords) || mentions(heroCta, marketWords),
      detail: mentions(ctaText, marketWords) || mentions(heroCta, marketWords)
        ? 'Hero or CTA copy speaks to this market'
        : 'Hero and CTA copy are market-neutral'
    },
    {
      key: 'content_spread',
      label: 'Market relevance spread across the page',
      core: true,
      present: spread >= 0.4,
      detail: text.blocks.length
        ? `${blocksWithMarket} of ${text.blocks.length} sections engage this market (${Math.round(spread * 100)}%)`
        : 'Page has no content sections'
    }
  ];
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Overlap at or above this, once market words are masked, reads as a clone. */
export const CLONE_THRESHOLD = 0.72;

/**
 * Assess one market page against the pages already indexable.
 *
 * `others` should be the published, currently-indexable market pages — those are
 * the ones this page would compete with in search. Draft or noindex pages are
 * not competitors and are not compared.
 */
export const assessMarketDifferentiation = (
  page: AssessablePage,
  others: AssessablePage[] = []
): Assessment => {
  const vocab = vocabFor({ market_code: page.market_code ?? null, name: page.name ?? '' });
  const text = readPage(page);
  const signals = detectSignals(text, vocab, page);

  const ownMask = maskMarketWords(text.all, vocab.names);
  const ownShingles = shingles(ownMask);

  const similar: SimilarPage[] = others
    .filter((o) => o?.slug && o.slug !== page.slug)
    .map((o) => {
      const otherVocab = vocabFor({ market_code: o.market_code ?? null, name: o.name ?? '' });
      const otherText = readPage(o);
      const overlap = jaccard(ownShingles, shingles(maskMarketWords(otherText.all, otherVocab.names)));
      return { slug: String(o.slug), name: String(o.name ?? o.slug), overlap };
    })
    .filter((s) => s.overlap >= 0.4)
    .sort((a, b) => b.overlap - a.overlap);

  const clones = similar.filter((s) => s.overlap >= CLONE_THRESHOLD);

  const coreHits = signals.filter((s) => s.core && s.present).length;
  const totalHits = signals.filter((s) => s.present).length;

  let verdict: Verdict;
  if (clones.length) {
    // A near-duplicate is disqualifying regardless of how many boxes it ticks —
    // that is the failure mode the whole guard exists for.
    verdict = 'weak';
  } else if (coreHits >= 4 && totalHits >= 7) {
    verdict = 'strong';
  } else if (coreHits >= 2 && totalHits >= 4) {
    verdict = 'moderate';
  } else {
    verdict = 'weak';
  }

  const strengths = signals.filter((s) => s.present).map((s) => s.detail);
  const gaps = signals.filter((s) => !s.present).map((s) => s.detail);

  if (!page.market_code?.trim()) {
    gaps.push('No market code set — the guard is falling back to the page name, so its checks are less reliable');
  }
  for (const clone of clones) {
    gaps.push(`Content is ${Math.round(clone.overlap * 100)}% identical to the indexed “${clone.name}” page once market names are ignored — this reads as a doorway page`);
  }

  return {
    verdict,
    signals,
    strengths,
    gaps,
    similar,
    requiresAcknowledgement: verdict === 'weak'
  };
};
