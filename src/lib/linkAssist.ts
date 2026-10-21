// SEO link assistant for the admin rich-text editor: which published pages the
// text already talks about, which words to link, and when a text has enough
// links. Deterministic keyword matching against real published pages — no AI
// call, no invented URLs: every suggestion is a page in the link index.
//
// Kept free of Svelte/TipTap so it can be tested with `node --test`.

/** Content types a link can reference — table names, as the API stores them. */
export type LinkType =
  | 'tours'
  | 'destinations'
  | 'lodges'
  | 'tour_categories'
  | 'travel_styles'
  | 'blog_posts'
  | 'safari_essentials'
  | 'comparisons'
  | 'market_pages';

export type AssistTarget = {
  label: string;
  path: string;
  group: string;
  type?: LinkType;
  id?: string;
};

/** A structured relation worth a link when the text mentions it (the day's lodge, the tour's destination). */
export type LinkHint = { type: LinkType; id: string; reason: string };

/** One run of text the editor can link, with the character ranges already inside links. */
export type TextBlock = { text: string; linked?: Array<[number, number]> };

export type LinkSuggestion = {
  target: AssistTarget;
  /** The words to link, exactly as they appear in the text. */
  anchor: string;
  block: number;
  start: number;
  end: number;
  /** How many times the page is mentioned. */
  mentions: number;
  reason: string;
};

/** Anchor text that says nothing about where a link goes. */
export const GENERIC_ANCHORS = new Set([
  'click here', 'here', 'click', 'read more', 'more', 'this', 'this link', 'link', 'learn more',
  'see more', 'find out more', 'this page', 'go', 'details', 'more info', 'more information', 'view', 'see'
]);

/** Words too broad to be worth a link on their own: they would match nearly every text. */
const TOO_BROAD = new Set(['tanzania', 'africa', 'east africa', 'safari', 'safaris', 'kenya', 'travel']);

const fold = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

const normalSpace = (value: string) => value.replace(/\s+/g, ' ').trim();

/**
 * Advice on the words chosen for a link, or '' when they are fine. Links read
 * best — to visitors, screen readers and search engines — when the anchor names
 * the page it opens.
 */
export const anchorAdvice = (text: string): string => {
  const words = normalSpace(text);
  if (!words) return '';
  const key = fold(words).replace(/[.!?:…]+$/, '');
  if (GENERIC_ANCHORS.has(key)) return `“${words}” doesn’t say where the link goes — link words that name the page instead.`;
  if (/^(https?:\/\/|www\.)/i.test(words)) return 'A bare address reads poorly — link a few words that describe the page instead.';
  if (words.length > 120) return 'Long anchors dilute the link — a few descriptive words work best.';
  return '';
};

// Trailing qualifiers dropped to make a short alias ("Tarangire National Park" → "Tarangire").
const PLACE_SUFFIX = /\s+(national park|game reserve|conservation area|marine park|crater|island|islands|region)$/i;
const LODGE_SUFFIX = /\s+(tented camp|tented lodge|safari lodge|safari camp|luxury camp|camp|lodge|hotel & spa|hotel|resort)$/i;

/** The phrases that, found in a text, mean it is talking about this page. Longest first. */
export const phrasesFor = (target: AssistTarget): string[] => {
  const name = normalSpace(target.label);
  const out = new Set<string>([name]);
  const add = (alias: string) => {
    const value = normalSpace(alias);
    // Short single words collide with ordinary vocabulary ("Dunia" is Swahili
    // for "world"); keep an alias only when it is distinctive enough.
    if (value.length >= 4 && (value.includes(' ') || value.length >= 6)) out.add(value);
  };

  switch (target.type) {
    case 'destinations':
      add(name.replace(PLACE_SUFFIX, ''));
      break;
    case 'lodges': {
      const beforeComma = name.split(',')[0];
      add(beforeComma);
      for (const part of beforeComma.split(/\s+[-–—]\s+/)) add(part);
      const stripped = beforeComma.replace(LODGE_SUFFIX, '');
      if (stripped.includes(' ')) add(stripped);
      break;
    }
    case 'tour_categories':
    case 'travel_styles': {
      // "Luxury Tanzania Safaris" → "Luxury Safaris"; "Classic Northern Circuit" → "Northern Circuit".
      const withoutCountry = name.replace(/\btanzania\b\s*/i, '').replace(/^&\s*/, '');
      if (withoutCountry !== name) add(withoutCountry);
      if (/^classic\s+/i.test(name)) add(name.replace(/^classic\s+/i, ''));
      break;
    }
    default:
      break;
  }
  return [...out].filter((p) => !TOO_BROAD.has(fold(p))).sort((a, b) => b.length - a.length);
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Whole-word, accent- and case-insensitive pattern for a phrase. A trailing "s"
 * is optional both ways, so "Fly-In Safaris" finds "fly-in safari".
 */
const phrasePattern = (phrase: string) => {
  const body = escapeRegex(fold(phrase))
    .replace(/\s+/g, '\\s+')
    .replace(/s$/, 's?');
  return new RegExp(`(?<![\\p{L}\\p{N}])${body}(?:s)?(?![\\p{L}\\p{N}])`, 'giu');
};

/** Which page wins when two share an exact name: the more specific type first. */
const TYPE_RANK: LinkType[] = [
  'lodges', 'destinations', 'tours', 'tour_categories', 'travel_styles',
  'comparisons', 'safari_essentials', 'blog_posts', 'market_pages'
];

/** What a page of each type is called in a sentence. */
const NOUN: Record<LinkType, string> = {
  tours: 'itinerary',
  destinations: 'destination',
  lodges: 'property',
  tour_categories: 'experience',
  travel_styles: 'travel style',
  blog_posts: 'article',
  safari_essentials: 'guide',
  comparisons: 'comparison',
  market_pages: 'page'
};

const overlaps = (ranges: Array<[number, number]>, start: number, end: number) =>
  ranges.some(([a, b]) => start < b && end > a);

/** Words in the text. */
export const wordCount = (blocks: TextBlock[]) =>
  blocks.reduce((sum, block) => sum + (block.text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu)?.length ?? 0), 0);

/**
 * How many internal links a text of this length carries well: about one per
 * 80 words, at least one, at most eight. Past that, links stop helping readers
 * and start reading as a list of keywords.
 */
export const linkBudget = (words: number) => Math.min(8, Math.max(1, Math.round(words / 80)));

/**
 * Pages the text mentions that are not linked yet, best first.
 *
 *   - Only pages in `targets` (the published-page index) are ever suggested.
 *   - A page already linked in this text, and the page being edited
 *     (`selfPath`), are skipped — one link per page per text.
 *   - Text already inside a link is never re-linked.
 *   - Where phrases overlap, the longest wins ("Tarangire National Park" over
 *     "Tarangire").
 *   - `hints` (the day's lodge, the tour's destination) rank first and say why.
 */
export const suggestLinks = ({
  blocks,
  targets,
  linkedPaths = new Set<string>(),
  linkedIds = new Set<string>(),
  selfPath = '',
  hints = [],
  max = 8
}: {
  blocks: TextBlock[];
  targets: AssistTarget[];
  linkedPaths?: Set<string>;
  linkedIds?: Set<string>;
  selfPath?: string;
  hints?: LinkHint[];
  max?: number;
}): LinkSuggestion[] => {
  const hintFor = new Map(hints.map((hint) => [`${hint.type}:${hint.id}`, hint.reason]));

  // Every phrase occurrence across the text.
  type Hit = { target: AssistTarget; block: number; start: number; end: number };
  const hits: Hit[] = [];
  const candidates = targets.filter(
    (t) =>
      t.path !== selfPath &&
      t.path !== '/' &&
      !linkedPaths.has(t.path) &&
      !(t.id && linkedIds.has(t.id)) &&
      // Only real records: fixed pages like "Contact" are not topics a text mentions.
      Boolean(t.type)
  );

  // Matching runs on accent-folded text; offsets must still index the original,
  // so a block whose folding changes its length (a ligature) is matched as is.
  // Who owns each phrase. A page's exact name beats another page's short alias
  // ("Arusha" is the city page, not Arusha National Park); an alias two pages
  // share ("Tukaone Serengeti") is ambiguous and dropped; two pages with the
  // same exact name go to the more specific type.
  const owners = new Map<string, Array<{ target: AssistTarget; phrase: string; exact: boolean }>>();
  for (const target of candidates) {
    for (const phrase of phrasesFor(target)) {
      const key = fold(phrase);
      const list = owners.get(key) ?? [];
      list.push({ target, phrase, exact: fold(normalSpace(target.label)) === key });
      owners.set(key, list);
    }
  }
  const phrases: Array<{ target: AssistTarget; phrase: string }> = [];
  for (const list of owners.values()) {
    const exact = list.filter((owner) => owner.exact);
    if (exact.length) {
      phrases.push(exact.sort((a, b) => TYPE_RANK.indexOf(a.target.type!) - TYPE_RANK.indexOf(b.target.type!))[0]);
    } else if (list.length === 1) {
      phrases.push(list[0]);
    }
  }

  const folded = blocks.map((block) => {
    const value = fold(block.text);
    return value.length === block.text.length ? value : block.text.toLowerCase();
  });
  for (const { target, phrase } of phrases) {
    const pattern = phrasePattern(phrase);
    folded.forEach((text, block) => {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(text)) !== null) {
        hits.push({ target, block, start: match.index, end: match.index + match[0].length });
      }
    });
  }

  // Longest first, then earliest; keep non-overlapping, outside existing links.
  hits.sort((a, b) => b.end - b.start - (a.end - a.start) || a.block - b.block || a.start - b.start);
  const taken: Array<Array<[number, number]>> = blocks.map((block) => [...(block.linked ?? [])]);
  const kept: Hit[] = [];
  for (const hit of hits) {
    if (overlaps(taken[hit.block], hit.start, hit.end)) continue;
    taken[hit.block].push([hit.start, hit.end]);
    kept.push(hit);
  }

  // One suggestion per page: its first mention in reading order.
  const byPage = new Map<string, { first: Hit; mentions: number }>();
  for (const hit of kept.sort((a, b) => a.block - b.block || a.start - b.start)) {
    const key = hit.target.path;
    const entry = byPage.get(key);
    if (entry) entry.mentions += 1;
    else byPage.set(key, { first: hit, mentions: 1 });
  }

  const suggestions: Array<LinkSuggestion & { hinted: boolean }> = [...byPage.values()].map(({ first, mentions }) => {
    const hint = first.target.id && first.target.type ? hintFor.get(`${first.target.type}:${first.target.id}`) : undefined;
    const kind = (first.target.type && NOUN[first.target.type]) || 'page';
    const reason = hint
      ? `${hint} — mentioned ${mentions === 1 ? 'once' : `${mentions}×`}`
      : `Mentions this ${kind} ${mentions === 1 ? 'once' : `${mentions}×`}`;
    return {
      target: first.target,
      anchor: blocks[first.block].text.slice(first.start, first.end),
      block: first.block,
      start: first.start,
      end: first.end,
      mentions,
      reason,
      hinted: Boolean(hint)
    };
  });

  return suggestions
    .sort(
      (a, b) =>
        Number(b.hinted) - Number(a.hinted) ||
        b.mentions - a.mentions ||
        b.anchor.length - a.anchor.length ||
        a.block - b.block ||
        a.start - b.start
    )
    .slice(0, max)
    .map(({ hinted: _hinted, ...rest }) => rest);
};
