// The homepage's sections, in one place. The public homepage renders from this
// list and the CMS homepage editor offers exactly these sections and fields, so
// what an editor can change is what the page shows.
//
// They drifted apart once: the page was redesigned to read new section keys and
// field names while the editor kept saving the old ones, so edits to "Signature
// Journeys", the parks intro, typical costs, testimonials and more saved fine and
// never appeared. Anything the editor offers must have a renderer here.

/** Standard fields every section row has (homepage_sections columns). */
export type HomeField = 'title' | 'subtitle' | 'content' | 'image_url' | 'button' | 'background';

/** Extra fields kept in extra_data, edited with their own inputs. `points` is a list, one per line. */
export type HomeExtra = 'eyebrow' | 'accent_title' | 'quote' | 'points';

export type HomeSectionDef = {
  key: string;
  label: string;
  /** What the section is, for the editor. */
  help: string;
  fields: HomeField[];
  extras: HomeExtra[];
  /** Older keys that render the same section (rows saved before a rename). */
  aliases?: string[];
  /** Shown even without a CMS row (with built-in text) — the page's essentials. */
  defaultOn?: boolean;
};

// In the homepage's standard order (the founder's brief, Oct 2026). The CMS sort
// order decides the live page; this order only places sections never saved.
export const HOME_SECTIONS: HomeSectionDef[] = [
  {
    key: 'hero',
    label: 'Hero',
    help: 'The top of the page, with the trust strip under it. The title is the page headline (H1); the subtitle sits under it. A review score appears under the buttons once guest reviews are published.',
    fields: ['title', 'subtitle', 'image_url', 'button', 'background'],
    extras: ['eyebrow'],
    defaultOn: true
  },
  {
    key: 'travel_styles',
    label: 'Choose your journey',
    help: 'One card per published travel style (Admin › Travel Styles), with its image, promise and the lowest "from" price of its itineraries.',
    fields: ['title', 'subtitle', 'button'],
    extras: ['eyebrow', 'accent_title'],
    defaultOn: true
  },
  {
    key: 'featured_tours',
    aliases: ['safari_showcase'],
    label: 'Signature Journeys',
    help: 'The tours ticked Featured in the tour editor, with durations and "from" prices per person.',
    fields: ['title', 'subtitle', 'button'],
    extras: ['eyebrow', 'accent_title'],
    defaultOn: true
  },
  {
    key: 'why_emnel',
    label: 'Why Emnel',
    help: 'Why travel with Emnel: a short text, a quote and the Emnel promises (one per line).',
    fields: ['title', 'content', 'button'],
    extras: ['eyebrow', 'accent_title', 'quote', 'points'],
    defaultOn: true
  },
  {
    key: 'testimonials',
    label: 'Guest reviews',
    help: 'Published guest reviews (managed under Testimonials) with this heading. Hidden until at least one review is published.',
    fields: ['title', 'subtitle', 'button'],
    extras: ['eyebrow', 'accent_title', 'quote']
  },
  {
    key: 'founder_story',
    label: 'Founder story',
    help: 'The story behind Emnel, with a photo, a quote and two buttons.',
    fields: ['title', 'content', 'image_url', 'button'],
    extras: [],
    defaultOn: true
  },
  {
    key: 'cost_ranges',
    label: 'Typical costs',
    help: 'Guide prices per person per day, one card per comfort level.',
    fields: ['title', 'subtitle'],
    extras: []
  },
  {
    key: 'how_it_works',
    label: 'How it works',
    help: 'The planning steps from first message to first game drive.',
    fields: ['title', 'subtitle', 'button'],
    extras: [],
    defaultOn: true
  },
  {
    key: 'featured_destinations',
    label: 'Destinations',
    help: 'Six destination cards.',
    fields: ['title', 'subtitle', 'button'],
    extras: ['eyebrow'],
    defaultOn: true
  },
  {
    key: 'gallery',
    label: 'Recent safaris gallery',
    help: 'Published photos from the Gallery, labelled by place and safari.',
    fields: ['title', 'subtitle'],
    extras: ['eyebrow'],
    defaultOn: true
  },
  {
    key: 'blog_preview',
    label: 'Journal / blog preview',
    help: 'The latest published journal articles. Hidden until at least one is published.',
    fields: ['title', 'button'],
    extras: ['eyebrow', 'accent_title']
  },
  {
    key: 'faq',
    label: 'FAQ',
    help: 'General questions from the FAQ library.',
    fields: ['title', 'subtitle'],
    extras: ['eyebrow'],
    defaultOn: true
  },
  {
    key: 'final_cta',
    label: 'Final call to action',
    help: 'The closing band: a background image or video, a short enquiry form that goes to Bookings, and a button to the full trip planner.',
    fields: ['title', 'subtitle', 'image_url', 'button', 'background'],
    extras: ['eyebrow']
  },
  // Not in the standard order: shown only when switched on.
  {
    key: 'safari_parks_intro',
    label: 'Safari parks intro',
    help: 'Introduction to the parks: text, a quote, the parks list, stats and a closing line.',
    fields: ['title', 'content', 'button'],
    extras: []
  },
  {
    key: 'partners',
    label: 'Partners',
    help: 'A strip of partner logos. Only real Emnel partnerships belong here.',
    fields: ['title'],
    extras: []
  }
];

/** Sections that live in the same table but render elsewhere (not on the homepage). */
export const OTHER_SECTION_LABELS: Record<string, string> = {
  login_slider: 'Login screen slider'
};

export const homeSectionDef = (key: string) =>
  HOME_SECTIONS.find((s) => s.key === key || s.aliases?.includes(key));

type Row = { section_key: string; sort_order?: number | null; is_active?: boolean | null };

/**
 * The homepage, top to bottom: the hero, then every section in the CMS order,
 * then essentials that have never been saved, in this file's order. Inactive
 * sections are left out. Each entry carries the row it renders (or null).
 */
export const orderedHomeSections = <R extends Row>(rows: R[]): Array<{ def: HomeSectionDef; row: R | null }> => {
  const byDef = new Map<string, R>();
  for (const row of rows) {
    const def = homeSectionDef(row.section_key);
    if (!def) continue;
    // The current key wins over an alias saved before a rename.
    const held = byDef.get(def.key);
    if (!held || row.section_key === def.key) byDef.set(def.key, row);
  }

  const saved = HOME_SECTIONS.filter((def) => byDef.has(def.key))
    .map((def) => ({ def, row: byDef.get(def.key) as R }))
    .sort((a, b) => Number(a.row.sort_order ?? 0) - Number(b.row.sort_order ?? 0));
  const unsaved = HOME_SECTIONS.filter((def) => !byDef.has(def.key) && def.defaultOn).map((def) => ({ def, row: null }));

  const ordered = [...saved, ...unsaved].filter(({ row }) => row?.is_active !== false);
  // The hero is the page's headline and the final call to action closes it,
  // whatever their sort order.
  const hero = ordered.find(({ def }) => def.key === 'hero');
  const closing = ordered.find(({ def }) => def.key === 'final_cta');
  const middle = ordered.filter((entry) => entry !== hero && entry !== closing);
  return [...(hero ? [hero] : []), ...middle, ...(closing ? [closing] : [])];
};
