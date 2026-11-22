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

export const MONTH_INITIALS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
