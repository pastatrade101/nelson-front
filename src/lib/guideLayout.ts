/**
 * Layout helpers for the destination travel guide.
 *
 * The guide is stored as a flat list of blocks (Part headings, paragraphs,
 * tips, tables…). The page lays it out as chapters: each Part heading starts a
 * chapter; inside it, text runs in a main column with tips and notes beside it,
 * and tables and photos run the full width. Tables are shown in the form that
 * suits their content: a month-by-month table becomes a season strip, a short
 * one becomes side-by-side columns, anything else stays a table.
 *
 * Kept free of `$lib` value imports so node tests can import it directly.
 */
import type { GuideBlock } from './types';

type Block = GuideBlock;
export type PartBlock = Extract<GuideBlock, { type: 'part' }>;
export type FactsBlock = Extract<GuideBlock, { type: 'facts' }>;
export type TableBlock = Extract<GuideBlock, { type: 'table' }>;

/** Blocks that read beside the text rather than in it. */
const NOTE_TYPES = new Set(['callout', 'did_you_know', 'field_notes', 'facts']);
/** Blocks that need the full width of the page. */
const WIDE_TYPES = new Set(['table', 'photo', 'tours', 'lodges']);

export type Segment =
  | { kind: 'run'; main: Block[]; notes: Block[] }
  | { kind: 'wide'; block: Block };

export type Chapter = { id: string; part: PartBlock | null; segments: Segment[] };

/** The guide's "Quick facts" / "At a glance" block, which the page shows in its overview. */
export const findQuickFacts = (blocks: Block[] = []): FactsBlock | undefined =>
  blocks.find(
    (b): b is FactsBlock =>
      b?.type === 'facts' &&
      (/quick facts|at a glance/i.test(b.title ?? '') || (b.items ?? []).some((it) => /best time|ideal visit/i.test(it.label ?? '')))
  );

const slugify = (s: string) =>
  (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** The anchor a Part has always had (`part-<n>` or `part-<title>`), so incoming links keep working. */
const partBase = (b: PartBlock) => `part-${b.part != null ? b.part : slugify(String(b.title ?? 'section'))}`;

/**
 * Splits the blocks into chapters. Blocks before the first Part form an
 * untitled opening chapter. Consecutive text and notes form one run; a wide
 * block ends the run.
 */
export const toChapters = (blocks: Block[] = []): Chapter[] => {
  const chapters: Chapter[] = [];
  const used = new Set<string>();
  let current: Chapter | null = null;
  let run: Extract<Segment, { kind: 'run' }> | null = null;

  const open = (part: PartBlock, base: string): Chapter => {
    let id = base;
    for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
    used.add(id);
    const chapter: Chapter = { id, part, segments: [] };
    chapters.push(chapter);
    return chapter;
  };

  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue;
    if (block.type === 'part') {
      current = open(block, partBase(block));
      run = null;
      continue;
    }
    // A titled FAQ is a chapter of its own, wherever it was placed.
    if (block.type === 'faq' && cleanCell(block.title)) {
      const title = cleanCell(block.title);
      // Some FAQ blocks are titled with just the place ("The Serengeti National Park").
      const heading = /faq|question/i.test(title) ? title : `Questions about ${title.replace(/^The\s/, 'the ')}`;
      current = open({ type: 'part', title: heading }, `faq-${slugify(title)}`);
      run = { kind: 'run', main: [{ ...block, title: '' }], notes: [] };
      current.segments.push(run);
      continue;
    }
    if (!current) {
      current = { id: 'guide-opening', part: null, segments: [] };
      chapters.push(current);
    }
    if (WIDE_TYPES.has(block.type)) {
      current.segments.push({ kind: 'wide', block });
      run = null;
      continue;
    }
    if (!run) {
      run = { kind: 'run', main: [], notes: [] };
      current.segments.push(run);
    }
    (NOTE_TYPES.has(block.type) ? run.notes : run.main).push(block);
  }
  // A Part heading with nothing under it would be an empty band: left out,
  // and so left out of the contents too.
  return chapters.filter((c) => c.segments.length);
};

// ── Tables ────────────────────────────────────────────────────────────────

/** Cell text as written, minus stray tabs and spacing left by pasting. */
export const cleanCell = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim();

export type CleanTable = { title: string; columns: string[]; rows: string[][] };

/**
 * Tidies a stored table. When every header cell is blank and the first row
 * reads like headers, that row becomes the header (some guides were pasted
 * that way).
 */
export const normalizeTable = (block: Pick<TableBlock, 'title' | 'columns' | 'rows'>): CleanTable => {
  let columns = (block.columns ?? []).map(cleanCell);
  let rows = (block.rows ?? []).map((row) => (row ?? []).map(cleanCell)).filter((row) => row.some(Boolean));
  if (columns.every((c) => !c) && rows.length > 1 && rows[0].every(Boolean)) {
    columns = rows[0];
    rows = rows.slice(1);
  }
  const width = Math.max(columns.length, ...rows.map((r) => r.length), 0);
  columns = Array.from({ length: width }, (_, i) => columns[i] ?? '');
  rows = rows.map((row) => Array.from({ length: width }, (_, i) => row[i] ?? ''));
  // "Comparison table" is a placeholder some guides were imported with, not a title.
  const title = cleanCell(block.title);
  return { title: /^comparison table$/i.test(title) ? '' : title, columns, rows };
};

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
/** "March", "Mar" and "Sept" are months; "Marula" and "Ma" are not. */
const monthIndex = (word: string) => {
  const w = word.toLowerCase();
  return w.length >= 3 ? MONTHS.findIndex((m) => m.startsWith(w)) : -1;
};

/**
 * The months a label covers, as month indexes (0 = January), or null when the
 * label isn't a month or month range. "June – October", "January–March",
 * "November", "December – February" (wrapping the year) all parse.
 */
export const monthsOf = (label: string): number[] | null => {
  const text = cleanCell(label);
  if (!text || text.length > 40) return null;
  const words = text.split(/[^A-Za-z]+/).filter(Boolean);
  if (!words.length) return null;
  const found = words.map(monthIndex);
  // Every word must be a month; a range separator is anything between them.
  if (found.some((i) => i < 0) || found.length > 2) return null;
  const [from, to = from] = found;
  const out: number[] = [];
  for (let i = from; ; i = (i + 1) % 12) {
    out.push(i);
    if (i === to || out.length > 12) break;
  }
  return out;
};

export type TableView =
  | { kind: 'season'; table: CleanTable; months: number[][]; seasonCol: number }
  | { kind: 'columns'; table: CleanTable }
  | { kind: 'table'; table: CleanTable };

/** How a guide table is best shown. */
export const tableView = (block: Pick<TableBlock, 'title' | 'columns' | 'rows'>): TableView => {
  const table = normalizeTable(block);
  const { columns, rows } = table;
  const months = rows.map((r) => monthsOf(r[0] ?? ''));
  if (rows.length >= 2 && rows.length <= 6 && months.every((m) => m && m.length)) {
    return { kind: 'season', table, months: months as number[][], seasonCol: columns.findIndex((c, i) => i > 0 && /season/i.test(c)) };
  }
  // A blank first header means a comparison laid out across the columns
  // (e.g. coasts or circuits side by side): keep the grid.
  const crosswise = !columns[0] && columns.slice(1).some(Boolean);
  if (!crosswise && rows.length >= 2 && rows.length <= 6 && columns.length >= 2 && columns.length <= 4) {
    return { kind: 'columns', table };
  }
  return { kind: 'table', table };
};

// ── FAQs ──────────────────────────────────────────────────────────────────

/** The chapter that holds the guide's questions, for the page's "Questions" link. */
export const faqChapterId = (blocks: Block[] = []): string =>
  toChapters(blocks).find((c) => c.segments.some((s) => s.kind === 'run' && s.main.some((b) => b.type === 'faq')))?.id ?? '';

// Words that don't tell two questions apart ("how", "the", "safari"…).
const QUESTION_FILLER = new Set(
  'a an and any are as at be by can could do does each for from get go has have how i if in into is it its me much many my of on or our should so than that the their there this to us was we what when where which who why will with would you your safari safaris trip'.split(' ')
);

/** A question's telling words: lowercase, plural "s" dropped, without filler or the place's own name. */
const questionWords = (question: string, placeWords: Set<string>) =>
  new Set(
    cleanCell(question)
      .toLowerCase()
      .split(/[^a-z]+/)
      .map((w) => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w))
      .filter((w) => w && !QUESTION_FILLER.has(w) && !placeWords.has(w))
  );

/**
 * Whether two questions ask the same thing, worded differently: at least half
 * of their telling words are shared. "Is it better to drive or fly to the
 * Serengeti?" and "Should I fly or drive to Serengeti?" match; "Is the
 * Serengeti crowded?" matches neither.
 */
export const sameQuestion = (a: string, b: string, place = ''): boolean => {
  const placeWords = new Set(place.toLowerCase().split(/[^a-z]+/).filter(Boolean));
  const wa = questionWords(a, placeWords);
  const wb = questionWords(b, placeWords);
  const shared = [...wa].filter((w) => wb.has(w)).length;
  const all = new Set([...wa, ...wb]).size;
  return shared > 0 && shared / all >= 0.5;
};

/**
 * The library questions a guide doesn't already ask. A destination whose guide
 * has its own FAQ shows one list: the guide's, plus these.
 */
export const questionsNotInGuide = <T extends { question: string }>(faqs: T[], blocks: Block[] = [], place = ''): T[] => {
  const asked = blocks.flatMap((b) => (b?.type === 'faq' ? (b.items ?? []).map((it) => it.q ?? '') : []));
  return faqs.filter((faq) => !asked.some((q) => sameQuestion(faq.question, q, place)));
};

// ── Destination page sections ─────────────────────────────────────────────
//
// The destination page (Nelson's redesign, Nov 2026) opens with short,
// structured sections — areas of the park, month by month, how long to stay,
// what it costs, how to get there — and keeps the full guide below them. Each
// section is read from the guide where the guide already holds it (a table or
// paragraph under the matching Part), and the page then leaves that block out
// of the full guide, so nothing is said twice.

type Found<T> = { title: string; source: Block[] } & T;

/** Each block with the title of the Part it sits under. */
const withPart = (blocks: Block[] = []) => {
  let part = '';
  return blocks
    .filter((b) => b && typeof b === 'object')
    .map((block) => {
      if (block.type === 'part') part = cleanCell(block.title);
      return { block, part };
    });
};

const plain = (html: string) =>
  String(html ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&rsquo;/g, '’')
    .replace(/\s+/g, ' ')
    .trim();

/** The guide's table of areas ("Region | Best for | …"): one line per area. */
export const parkAreas = (blocks: Block[] = []): Found<{ items: { name: string; text: string }[] }> | null => {
  for (const { block, part } of withPart(blocks)) {
    if (block.type !== 'table') continue;
    const table = normalizeTable(block);
    if (!/^(region|area|zone|sector|part)s?$/i.test(table.columns[0] ?? '') || table.rows.length < 2 || table.rows.length > 8) continue;
    return { title: part, source: [block], items: table.rows.map((row) => ({ name: row[0], text: row[1] ?? '' })).filter((it) => it.name) };
  }
  return null;
};

export type MonthEntry = { title: string; period: string; text: string };

/**
 * The guide's month-by-month table, read as twelve months: each month gets the
 * row whose period covers it. The tip that follows the table, if any, comes
 * with it.
 */
export const monthByMonth = (blocks: Block[] = []): Found<{ months: (MonthEntry | null)[]; tip: string }> | null => {
  const list = withPart(blocks);
  for (let i = 0; i < list.length; i++) {
    const { block, part } = list[i];
    if (block.type !== 'table') continue;
    const view = tableView(block);
    if (view.kind !== 'season') continue;
    const { columns, rows } = view.table;
    const months: (MonthEntry | null)[] = Array.from({ length: 12 }, () => null);
    rows.forEach((row, r) => {
      const rest = row
        .slice(2)
        .map((cell, c) => (cell ? `${columns[c + 2] ? `${columns[c + 2]}: ` : ''}${cell}` : ''))
        .filter(Boolean)
        .join(' · ');
      for (const m of view.months[r]) months[m] ??= { title: row[1] ?? '', period: row[0], text: rest };
    });
    const next = list[i + 1];
    const tipBlock = next && next.part === part && (next.block.type === 'callout' || next.block.type === 'did_you_know') ? next.block : null;
    return {
      title: part,
      source: tipBlock ? [block, tipBlock] : [block],
      months,
      tip: tipBlock ? plain((tipBlock as { body?: string }).body ?? '') : ''
    };
  }
  return null;
};

/**
 * "How many nights?" from the guide: the paragraphs under a "How many days /
 * how long" Part that open with a bold "N nights". The one the quick facts
 * recommend (their first number) is marked; a bold "Our advice" paragraph is
 * kept as the closing note.
 */
export const nightsAdvice = (
  blocks: Block[] = [],
  recommendedStay = ''
): Found<{ options: { label: string; text: string; recommended: boolean }[]; note: string }> | null => {
  const firstNumber = (recommendedStay.match(/\d+/) ?? [''])[0];
  for (const { block, part } of withPart(blocks)) {
    if (block.type !== 'richtext' || !/how many (days|nights)|how long/i.test(part)) continue;
    const paragraphs = [...String(block.body ?? '').matchAll(/<p>\s*<strong>([^<]+)<\/strong>([\s\S]*?)<\/p>/gi)].map((m) => ({
      label: plain(m[1]).replace(/[:.]$/, ''),
      text: plain(m[2]).replace(/^[:–—-]\s*/, '')
    }));
    const options = paragraphs.filter((p) => /\d/.test(p.label) && /night|day/i.test(p.label));
    if (options.length < 2) continue;
    const note = paragraphs.find((p) => /advice|tip/i.test(p.label));
    return {
      title: part,
      source: [block],
      options: options.map((o) => ({ ...o, text: o.text.charAt(0).toUpperCase() + o.text.slice(1), recommended: Boolean(firstNumber) && o.label.startsWith(firstNumber) })),
      note: note ? note.text.charAt(0).toUpperCase() + note.text.slice(1) : ''
    };
  }
  return null;
};

/** The guide's "how to get there" table ("Option | Best for | Typical approach"). */
export const gettingThere = (blocks: Block[] = []): Found<{ items: { title: string; bestFor: string; route: string }[] }> | null => {
  for (const { block, part } of withPart(blocks)) {
    if (block.type !== 'table' || !/get (to|there)|getting (to|there)|arriv/i.test(part)) continue;
    const { columns, rows } = normalizeTable(block);
    if (rows.length < 1 || rows.length > 6) continue;
    const bestCol = columns.findIndex((c, i) => i > 0 && /best for|suits?|ideal/i.test(c));
    const routeCol = columns.findIndex((c, i) => i > 0 && i !== bestCol);
    return {
      title: part,
      source: [block],
      items: rows.map((row) => ({ title: row[0], bestFor: bestCol > 0 ? row[bestCol] : '', route: routeCol > 0 ? row[routeCol] : '' })).filter((it) => it.title)
    };
  }
  return null;
};

export type CostRow = { style: string; perDay: number | null; amount: number | null; text: string; suits: string };

/**
 * The guide's price table ("Safari style | Starting from | Suitable for"):
 * one row per comfort level, with the amount read out of the price cell and
 * whether it is per day ("US$350 pp/day").
 */
export const costTable = (blocks: Block[] = []): Found<{ rows: CostRow[] }> | null => {
  for (const { block, part } of withPart(blocks)) {
    if (block.type !== 'table') continue;
    const { columns, rows } = normalizeTable(block);
    const priceCol = columns.findIndex((c) => /starting|from|price|cost|rate/i.test(c));
    if (priceCol < 1 || rows.length < 1 || rows.length > 6) continue;
    const suitsCol = columns.findIndex((c, i) => i > 0 && i !== priceCol);
    const parsed = rows.map((row) => {
      const text = row[priceCol] ?? '';
      const match = text.replace(/,/g, '').match(/(\d{2,})/);
      const amount = match ? Number(match[1]) : null;
      return { style: row[0], amount, perDay: amount != null && /day|night/i.test(text) ? amount : null, text, suits: suitsCol > 0 ? row[suitsCol] ?? '' : '' };
    });
    if (!parsed.some((r) => r.amount != null)) continue;
    return { title: part, source: [block], rows: parsed };
  }
  return null;
};

/**
 * Destinations the guide links to, in the order it mentions them — first from
 * a "plan your visit / combine" Part, else from anywhere in the guide. Used for
 * "Pairs well with" when the page doesn't name its own.
 */
export const linkedDestinations = (blocks: Block[] = [], selfSlug = ''): string[] => {
  const slugsIn = (list: { block: Block }[]) =>
    list.flatMap(({ block }) =>
      block.type === 'richtext' ? [...String(block.body ?? '').matchAll(/href="\/destinations\/([a-z0-9-]+)"/g)].map((m) => m[1]) : []
    );
  const all = withPart(blocks);
  const planned = slugsIn(all.filter(({ part }) => /plan|combin|pair|itinerar/i.test(part)));
  const found = planned.length ? planned : slugsIn(all);
  return [...new Set(found)].filter((slug) => slug && slug !== selfSlug);
};

/** "Best time" and "How long" from the guide's quick facts, for the strip under the hero. */
export const keyFacts = (items: { label?: string; value?: string }[] = []) => {
  const find = (re: RegExp) => cleanCell(items.find((it) => re.test(it?.label ?? ''))?.value);
  return {
    bestTime: find(/best time|when to go|best season|best months/i),
    howLong: find(/recommended stay|how long|ideal (stay|length|visit)|time needed|nights|days needed/i)
  };
};

export const MONTH_INITIALS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
