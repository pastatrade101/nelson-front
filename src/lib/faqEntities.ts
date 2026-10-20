import { api } from '$lib/api/client';
import type { FAQ, FaqEntityType } from '$lib/types';

/**
 * Lengths the public accordion is designed around — the same numbers the API
 * enforces (faqs.schema.ts), so the form stops an editor before the API does.
 */
export const FAQ_QUESTION_MAX = 150;
export const FAQ_ANSWER_MAX = 600;

/**
 * The collections an FAQ can be attached to, in the order an editor sees them.
 * `value` is the database table name — the same spelling the API filters on and
 * the `faqs_entity_type_check` constraint allows. Labels follow the admin
 * sidebar, so an editor finds the same word in both places.
 */
export const FAQ_ENTITY_TYPES: Array<{ value: FaqEntityType; label: string; plural: string }> = [
  { value: 'destinations', label: 'Destination', plural: 'Destinations' },
  { value: 'tours', label: 'Tour', plural: 'Tours' },
  { value: 'tour_categories', label: 'Category', plural: 'Categories' },
  { value: 'lodges', label: 'Lodge or camp', plural: 'Lodges & camps' },
  { value: 'travel_styles', label: 'Travel style', plural: 'Travel styles' }
];

export const faqEntityLabel = (type?: string | null) =>
  FAQ_ENTITY_TYPES.find((entry) => entry.value === type)?.label ?? '';

/** Where an attached record lives on the public site, for the admin's preview link. */
const ENTITY_PATH: Record<FaqEntityType, (slug: string) => string> = {
  destinations: (slug) => `/destinations/${slug}`,
  tours: (slug) => `/tours/${slug}`,
  // Categories and lodges are published under the visitor-facing words for
  // them, not the table names.
  tour_categories: (slug) => `/experiences/${slug}`,
  lodges: (slug) => `/accommodation/${slug}`,
  travel_styles: (slug) => `/travel-styles/${slug}`
};

export const faqEntityHref = (type?: string | null, slug?: string | null) => {
  if (!type || !slug) return '';
  const build = ENTITY_PATH[type as FaqEntityType];
  return build ? build(slug) : '';
};

/**
 * Every row of a list endpoint. The API caps a page at 100, and the FAQ library
 * alone is past that — asking for `limit: 200` silently returned the first 100
 * and the rest never appeared in the admin. Reads page 1, then the remaining
 * pages together; bounded so a runaway total cannot fan out without end.
 */
export const readAllPages = async <T>(
  read: (page: number) => Promise<{ data: { items?: T[]; pagination?: { totalPages?: number } } }>
): Promise<T[]> => {
  const first = await read(1);
  const pages = Math.min(first.data.pagination?.totalPages ?? 1, 20);
  if (pages <= 1) return first.data.items ?? [];
  const rest = await Promise.all(Array.from({ length: pages - 1 }, (_, i) => read(i + 2)));
  // A row edited between page reads can shift across a page boundary; keep the
  // first copy so a keyed list never sees the same id twice.
  const seen = new Set<string>();
  return [first, ...rest]
    .flatMap((res) => res.data.items ?? [])
    .filter((item) => {
      const id = (item as { id?: unknown })?.id;
      if (typeof id !== 'string') return true;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
};

/**
 * The records an editor can attach an FAQ to, for the picker. Drafts are
 * included on purpose — questions are usually written alongside the page they
 * belong to, before either goes live.
 */
export const loadFaqEntityRecords = async (type: FaqEntityType): Promise<Array<{ id: string; label: string }>> => {
  const params = (page: number) => ({ status: 'all', limit: 100, page });

  const named = (items: unknown[], key: 'name' | 'title') =>
    (items as Array<Record<string, unknown>>)
      .filter((row) => typeof row?.id === 'string')
      .map((row) => ({ id: String(row.id), label: String(row[key] ?? row.slug ?? 'Untitled') }))
      .sort((a, b) => a.label.localeCompare(b.label));

  switch (type) {
    case 'destinations':
      return named(await readAllPages((page) => api.destinations.list(params(page))), 'name');
    case 'tours':
      return named(await readAllPages((page) => api.tours.list(params(page))), 'title');
    case 'tour_categories':
      return named(await readAllPages((page) => api.categories.list(params(page))), 'name');
    case 'lodges':
      return named(await readAllPages((page) => api.lodges.list(params(page))), 'name');
    case 'travel_styles':
      return named(await readAllPages((page) => api.travelStyles.list(params(page))), 'name');
    default:
      return [];
  }
};

/**
 * Attached questions first, then general ones to fill the remaining slots.
 *
 * A page that has its own questions should lead with them; the general set
 * ("do I need a visa?", "how do I pay?") is genuinely useful everywhere and
 * keeps a page from showing a two-item FAQ. Because an unattached library
 * behaves exactly like it did before, attaching nothing changes nothing.
 */
export const mergeFaqs = (attached: FAQ[], general: FAQ[], limit: number): FAQ[] => {
  const seen = new Set<string>();
  const out: FAQ[] = [];

  for (const faq of [...attached, ...general]) {
    if (!faq?.id || !faq.question || seen.has(faq.id)) continue;
    seen.add(faq.id);
    out.push(faq);
    if (out.length >= limit) break;
  }

  return out;
};

/**
 * Query strings for the two kinds of read, for routes that load in `+page.ts`.
 * No `limit`: the caller adds one, or reads every page with readAllFaqs.
 */
export const attachedFaqQuery = (type: FaqEntityType, id: string) =>
  `entity_type=${type}&entity_id=${encodeURIComponent(id)}&status=published`;

// "null" is the API's spelling for IS NULL — the general library.
export const generalFaqQuery = () => 'entity_type=null&status=published';

type FetchLike = (input: string) => Promise<Response>;
type Attachment = { type: FaqEntityType; id?: string | null };

const readFaqs = (fetcher: FetchLike, query: string): Promise<FAQ[]> =>
  fetcher(`/api/faqs?${query}`)
    .then((res) => (res.ok ? res.json() : null))
    .then((body) => ((body?.data?.items ?? []) as FAQ[]))
    .catch(() => [] as FAQ[]);

/**
 * Every FAQ a query matches, however many pages that takes (the API caps a
 * page at 100). Used where a page must carry the whole set — the page that owns
 * a question is the only one that marks it up, so it must never drop one.
 * Never throws: a failed read is an empty list.
 */
export const readAllFaqs = async (fetcher: FetchLike, query: string): Promise<FAQ[]> => {
  try {
    return await readAllPages<FAQ>(async (page) => {
      const res = await fetcher(`/api/faqs?${query}&limit=100&page=${page}`);
      if (!res.ok) throw new Error(`FAQ read failed (${res.status})`);
      return res.json();
    });
  } catch {
    return [];
  }
};

/**
 * Questions for a page, for a `+page.ts` loader (pass its `fetch`, so the read
 * goes through the app's own API proxy and lands in the server HTML).
 *
 *   owner   the record this page is about. ALL of its questions are shown —
 *           this is the one page that marks them up (ownedFaqs), so a question
 *           cut here would be marked up nowhere.
 *   borrow  records the page belongs to. A tour belongs to a category, and
 *           most of what a reader wants to know about a migration safari was
 *           answered once on that category rather than retyped onto each tour.
 *           They follow the page's own, up to `limit` in total; every one of
 *           them is also on its owner's page, in full.
 *   fill    general questions top the list up to this many, so a page with
 *           one or two of its own does not show a two-item FAQ.
 *
 * mergeFaqs dedupes, so a question reached two ways is shown once, at its more
 * specific place. An attachment with no id is skipped rather than requested —
 * a tour with no category is not a tour whose category has no questions. Never
 * throws: a failed read is an empty list, and the page renders without FAQs.
 */
export const loadFaqsFor = async (
  fetcher: FetchLike,
  owner: Attachment | null,
  { borrow = [], limit = 8, fill = limit }: { borrow?: Attachment[]; limit?: number; fill?: number } = {}
): Promise<FAQ[]> => {
  const borrowed = borrow.filter((entry): entry is { type: FaqEntityType; id: string } => Boolean(entry.id));

  const [own, general, ...others] = await Promise.all([
    owner?.id ? readAllFaqs(fetcher, attachedFaqQuery(owner.type, owner.id)) : Promise.resolve([] as FAQ[]),
    fill > 0 ? readFaqs(fetcher, `${generalFaqQuery()}&limit=${fill}`) : Promise.resolve([] as FAQ[]),
    ...borrowed.map((entry) => readFaqs(fetcher, `${attachedFaqQuery(entry.type, entry.id)}&limit=${limit}`))
  ]);

  const withBorrowed = mergeFaqs(own, others.flat(), Math.max(own.length, limit));
  return mergeFaqs(withBorrowed, general, Math.max(withBorrowed.length, fill));
};

/**
 * The page that carries the FAQPage markup for the general library. Every
 * other page may show general questions, but does not mark them up.
 */
export const GENERAL_FAQ_HOME = '/expert-advice';

/**
 * The questions a page should mark up as FAQPage structured data — the ones it
 * owns — out of everything it shows.
 *
 * Google's rule for FAQ markup: when the same question and answer appear in
 * several places on a site, mark up one instance only. Attachments make that
 * the normal case — a general question tops up every page, a category's
 * questions appear on each of its tours — so the markup follows ownership,
 * not visibility:
 *
 *   - a question attached to a record is marked up on that record's page;
 *   - a general question is marked up on GENERAL_FAQ_HOME;
 *   - everywhere else it is still shown, in full, in the server HTML, which is
 *     what search engines and AI assistants read — just not marked up twice.
 */
export const ownedFaqs = (faqs: FAQ[], owner: { type: FaqEntityType; id?: string | null } | 'general'): FAQ[] =>
  faqs.filter((faq) =>
    owner === 'general'
      ? // Strictly null, not merely falsy: a row without the field at all comes
        // from an API or database that predates attachments, and must not be
        // marked up as general on the strength of a missing key.
        faq.entity_type === null
      : Boolean(owner.id) && faq.entity_type === owner.type && faq.entity_id === owner.id
  );
