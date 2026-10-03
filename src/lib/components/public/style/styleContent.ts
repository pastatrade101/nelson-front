/**
 * Turns a travel style's loose CMS blocks into a fixed set of presentational
 * sections.
 *
 * The editor stores free-form blocks (a rich-text body, a list of panels, a few
 * lines per price tier). Rendering those literally hands the layout to whatever
 * the editor typed: a day-by-day route becomes a run of bullet paragraphs, a
 * lodge becomes five sentences in a box. This module reads the *shape* of the
 * content instead and picks a layout the page owns:
 *
 *   prose whose paragraphs open with "<strong>Day 1:</strong> …"   → route timeline
 *   "<strong>6:30 am — Morning drive.</strong> …"                  → day schedule
 *   "<strong>June–October:</strong> …"                              → season rows
 *   any other run of "<strong>Label:</strong> …"                   → fact rows
 *   panels with no images                                          → team cards
 *   panels with "Best for: / Children: / Rooms:" lines             → stay cards
 *   other panels                                                   → place cards
 *   "From US$350 per person…" in a tier                            → large price
 *
 * Editors keep writing naturally; nothing here needs a new field or migration,
 * and anything unrecognised falls back to well-set plain prose.
 */
import { sanitizeRichText, toPlainText } from '$lib/richtext';
import type { Destination, Lodge, Tour } from '$lib/types';

type Raw = Record<string, unknown>;

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const arr = <T = Raw>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const strings = (v: unknown) => arr<unknown>(v).map(str).filter(Boolean);

/** Editors leave stray trailing dots and spaces on titles ("Tarangire National Park. "). */
export const cleanTitle = (v: unknown) => str(v).replace(/[\s.]+$/, '');

/** "WHERE TO GO" → "Where to go". Eyebrows are styled uppercase anyway; this keeps them readable to screen readers. */
const slug = (v: unknown) =>
  cleanTitle(v).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').split('-').slice(0, 6).join('-');

const sentenceCase = (v: string) => (v === v.toUpperCase() ? v.charAt(0) + v.slice(1).toLowerCase() : v);

/**
 * Absolute links to the live site become relative, so a CTA keeps the visitor
 * on the host they are on (staging, localhost) instead of bouncing to production.
 */
export const localHref = (href: string) => {
  const m = /^https?:\/\/(?:www\.)?emneladventures\.com(\/[^\s]*)?$/i.exec(href.trim());
  return m ? m[1] || '/' : href.trim();
};

/* ── Prose ─────────────────────────────────────────────────────────────────── */

export type Row = { label: string; text: string };
export type ProseKind = 'text' | 'facts' | 'route' | 'schedule' | 'seasons';

const decode = (s: string) => toPlainText(`<p>${s}</p>`).replace(/\s+/g, ' ').trim();

/** Split a TipTap body into paragraph inner-HTML strings, dropping empties and bullet glyphs. */
const paragraphs = (html: string): string[] => {
  const found = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => m[1]);
  const list = found.length ? found : html.split(/\n{2,}/);
  return list
    .map((p) => p.replace(/^(?:\s|&nbsp;| |[•·▪◦-](?=\s|&nbsp;))+/g, '').trim())
    .filter((p) => decode(p));
};

const LEAD = /^<strong>([\s\S]+?)<\/strong>([\s\S]*)$/i;
const MONTHS = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i;

export type ProseView = {
  kind: ProseKind;
  /** Sanitised HTML before the structured rows (or the whole body for `text`). */
  intro: string;
  rows: Row[];
  /** A paragraph that is bold from end to end — the editor's own pull quote. */
  callout: string;
  /** Sanitised HTML after the rows. */
  outro: string;
  /** "View the 8-Day Tanzania Family Safari" resolved to a real itinerary. */
  link: { label: string; href: string } | null;
};

const toHtml = (ps: string[]) => sanitizeRichText(ps.map((p) => `<p>${p}</p>`).join(''));

export const readProse = (body: string, tours: Tour[]): ProseView => {
  const ps = paragraphs(body);
  let callout = '';
  // A closing paragraph that is entirely bold reads as a pull quote, not body copy.
  const last = ps[ps.length - 1];
  const lastLead = last ? LEAD.exec(last) : null;
  if (lastLead && !decode(lastLead[2]) && ps.length > 1) {
    callout = decode(lastLead[1]);
    ps.pop();
  }

  // "View the 8-Day Tanzania Family Safari" → link it when an itinerary of that name exists.
  let link: ProseView['link'] = null;
  const tail = ps[ps.length - 1];
  const viewMatch = tail ? /^view (?:the |our )?(.+)$/i.exec(decode(tail)) : null;
  if (viewMatch) {
    const want = viewMatch[1].toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const words = want.split(' ').filter((w) => w.length > 1);
    const tour = tours.find((t) => {
      const name = t.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ');
      return words.every((w) => name.includes(w));
    });
    if (tour) {
      link = { label: decode(tail), href: `/tours/${tour.slug}` };
      ps.pop();
    }
  }

  const leads = ps.map((p) => LEAD.exec(p));
  const rowCount = leads.filter(Boolean).length;
  if (rowCount < 3 || rowCount < ps.length * 0.55) {
    return { kind: 'text', intro: toHtml(ps), rows: [], callout, outro: '', link };
  }

  const first = leads.findIndex(Boolean);
  const lastRow = leads.length - 1 - [...leads].reverse().findIndex(Boolean);
  const rows: Row[] = [];
  for (let i = first; i <= lastRow; i += 1) {
    const m = leads[i];
    if (m) rows.push({ label: decode(m[1]).replace(/[:\s]+$/, ''), text: decode(m[2]).replace(/^[:\s—–-]+/, '') });
    else if (rows.length) rows[rows.length - 1].text += ` ${decode(ps[i])}`;
  }

  const labels = rows.map((r) => r.label);
  const all = (re: RegExp) => labels.every((l) => re.test(l));
  const kind: ProseKind = all(/^days?\s+\d/i)
    ? 'route'
    : all(/^\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/i)
      ? 'schedule'
      : all(MONTHS)
        ? 'seasons'
        : 'facts';

  return {
    kind,
    intro: toHtml(ps.slice(0, first)),
    rows,
    callout,
    outro: toHtml(ps.slice(lastRow + 1)),
    link
  };
};

/** "6:30 am — Morning game drive." → { time: "6:30 am", title: "Morning game drive" } */
export const splitSchedule = (label: string) => {
  const m = /^(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*[—–-]?\s*(.*)$/i.exec(label);
  return m ? { time: m[1], title: m[2].replace(/\.$/, '') } : { time: '', title: label };
};

/** "Tarangire — elephants and baobabs, with time at the pool" → place + detail. */
export const splitPlace = (text: string) => {
  const m = /^([^—–]{2,60}?)\s+[—–]\s+(.+)$/.exec(text);
  return m ? { place: m[1], detail: m[2] } : { place: text, detail: '' };
};

/* ── Panels ────────────────────────────────────────────────────────────────── */

export type Fact = { label: string; value: string };
export type PlaceCard = { title: string; text: string; image: string };
export type StayCard = { title: string; image: string; bestFor: string; body: string[]; facts: Fact[] };
export type PersonCard = { name: string; role: string; bio: string; image: string };

const LABELLED = /^([A-Z][A-Za-z ]{1,24}):\s+(.+)$/;

type RawPanel = { title?: unknown; items?: unknown; image_url?: unknown };

export type PanelsView =
  | { kind: 'places'; items: PlaceCard[] }
  | { kind: 'stays'; items: StayCard[] }
  | { kind: 'people'; items: PersonCard[] };

export const readPanels = (raw: unknown): PanelsView | null => {
  const panels = arr<RawPanel>(raw)
    .map((p) => ({ title: cleanTitle(p.title), items: strings(p.items), image: str(p.image_url) }))
    .filter((p) => p.title || p.items.length);
  if (!panels.length) return null;

  if (panels.every((p) => !p.image)) {
    return {
      kind: 'people',
      items: panels.map((p) => {
        // "Minja, Head Guide" carries the role in the title; otherwise a short
        // first line ("Operations Lead & Guide") is the role.
        const [name, ...rest] = p.title.split(/,\s*/);
        let role = rest.join(', ');
        let items = p.items;
        if (!role && items.length > 1 && items[0].length < 48 && !/[.!?]$/.test(items[0])) {
          role = items[0];
          items = items.slice(1);
        }
        return { name, role: role.replace(/\s*&\s*/g, ' & '), bio: items.join(' '), image: '' };
      })
    };
  }

  const labelled = (p: (typeof panels)[number]) => p.items.filter((i) => LABELLED.test(i)).length;
  if (panels.some((p) => labelled(p) >= 2)) {
    return {
      kind: 'stays',
      items: panels.map((p) => {
        const facts: Fact[] = [];
        const body: string[] = [];
        let bestFor = '';
        for (const item of p.items) {
          const m = LABELLED.exec(item);
          if (m && /^best for$/i.test(m[1])) bestFor = m[2];
          else if (m) facts.push({ label: m[1], value: m[2] });
          else body.push(item);
        }
        return { title: p.title, image: p.image, bestFor, body, facts };
      })
    };
  }

  return {
    kind: 'places',
    items: panels.map((p) => ({ title: p.title, text: p.items.join(' '), image: p.image }))
  };
};

/* ── Destinations ──────────────────────────────────────────────────────────── */

const placeKey = (v: string) =>
  v
    .toLowerCase()
    .replace(/\b(national park|game reserve|conservation area|island|crater|park)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/**
 * Every title resolved to a published destination ("Tarangire National Park" →
 * Tarangire), or null when any one doesn't match — a partial match would mix
 * card styles, so the panels are kept as written instead.
 */
export const matchDestinations = (titles: string[], destinations: Destination[]): Destination[] | null => {
  if (!titles.length || !destinations.length) return null;
  const out: Destination[] = [];
  for (const title of titles) {
    const key = placeKey(title);
    const hit =
      destinations.find((d) => placeKey(d.name) === key) ??
      destinations.find((d) => {
        const k = placeKey(d.name);
        return k.length > 3 && (key.includes(k) || k.includes(key));
      });
    if (!hit || out.includes(hit)) return null;
    out.push(hit);
  }
  return out;
};

/* ── Price tiers ───────────────────────────────────────────────────────────── */

export type TierCard = { title: string; label: string; price: string; unit: string; notes: string[]; image: string; lodges: Lodge[] };

export const readTiers = (raw: unknown, lodges: Lodge[] = []): TierCard[] =>
  arr<Raw>(raw)
    .map((t) => {
      const lines = str(t.body).split(/\n+/).map((l) => l.trim()).filter(Boolean);
      let price = '';
      let unit = '';
      const notes: string[] = [];
      for (const line of lines) {
        const m = !price ? /^(?:from\s+)?(US\$\s?[\d,]+|\$\s?[\d,]+)\s*(.*)$/i.exec(line) : null;
        if (m) {
          price = m[1].replace(/\s/g, '');
          unit = m[2];
        } else notes.push(line);
      }
      // Picked accommodation, in the editor's order, skipping any since unpublished.
      const picked = arr<string>(t.lodge_ids)
        .map((id) => lodges.find((l) => l.id === id))
        .filter((l): l is Lodge => Boolean(l));
      return { title: cleanTitle(t.title), label: str(t.label), price, unit, notes, image: str(t.image_url), lodges: picked };
    })
    .filter((t) => t.title || t.price || t.notes.length || t.lodges.length);

/* ── Page model ────────────────────────────────────────────────────────────── */

export type Section =
  | { kind: 'prose'; id: string; nav: string; eyebrow: string; title: string; prose: ProseView; lead: boolean }
  | { kind: 'numbered'; id: string; nav: string; eyebrow: string; title: string; items: { title: string; body: string }[] }
  | { kind: 'panels'; id: string; nav: string; eyebrow: string; title: string; view: PanelsView }
  | { kind: 'tiers'; id: string; nav: string; eyebrow: string; title: string; intro: string; tiers: TierCard[] }
  | { kind: 'cta'; id: string; nav: string; title: string; subtitle: string; label: string; href: string; points: string[]; final: boolean }
  | { kind: 'steps'; id: string; nav: string; eyebrow: string; title: string; steps: { title: string; body: string }[]; ctaLabel: string; ctaHref: string }
  | { kind: 'gallery'; id: string; nav: string; eyebrow: string; title: string; images: { url: string; caption: string }[] }
  | { kind: 'inclusions'; id: string; nav: string; eyebrow: string; title: string; included: string[]; excluded: string[] }
  | { kind: 'destinations'; id: string; nav: string; eyebrow: string; title: string; intro: string; destinations: Destination[] }
  | { kind: 'tours'; id: string; nav: string; eyebrow: string; title: string; intro: string; tours: Tour[] }
  | { kind: 'faq'; id: string; nav: string; eyebrow: string; title: string; items: { q: string; a: string }[] };

export type StylePage = { trust: string[]; sections: Section[] };

const NAV: Record<string, string> = {
  overview: 'Overview',
  numbered: 'Why us',
  places: 'Where to go',
  stays: 'Where to stay',
  people: 'Your team',
  tiers: 'Prices',
  seasons: 'When to go',
  route: 'Sample route',
  inclusions: "What's included",
  tours: 'Itineraries',
  faq: 'FAQ'
};

export const buildStylePage = (blocks: Raw[], tours: Tour[], lodges: Lodge[] = [], destinations: Destination[] = []): StylePage => {
  const trust: string[] = [];
  const sections: Section[] = [];
  const used = new Set<string>();
  let n = 0;

  /** Stable, readable anchors; a kind that repeats gets a numeric suffix. */
  const anchor = (base: string) => {
    let id = base;
    for (let k = 2; used.has(id); k += 1) id = `${base}-${k}`;
    used.add(id);
    return id;
  };
  /** A nav label is offered once per kind, so repeated kinds don't crowd the bar. */
  const navFor = (key: string) => {
    const label = NAV[key] ?? '';
    return label && !used.has(`nav:${key}`) && used.add(`nav:${key}`) ? label : '';
  };
  const head = (b: Raw) => ({ eyebrow: sentenceCase(str(b.eyebrow)), title: cleanTitle(b.title) });

  const ctas = blocks.filter((b) => b.type === 'cta');
  const finalCta = ctas[ctas.length - 1];

  for (const b of blocks) {
    n += 1;
    switch (b.type) {
      case 'trust':
        trust.push(...arr<Raw>(b.items).map((i) => str(i.label)).filter(Boolean));
        break;

      case 'prose': {
        if (!toPlainText(b.body).trim()) break;
        const prose = readProse(str(b.body), tours);
        // The opening layout suits flowing copy; a structured block (rows, a
        // route, a schedule) keeps its own layout even when it comes first.
        const lead = prose.kind === 'text' && !sections.some((s) => s.kind === 'prose');
        const key = lead ? 'overview' : prose.kind;
        sections.push({ kind: 'prose', id: anchor(lead ? 'overview' : slug(b.title) || `section-${n}`), nav: navFor(key), ...head(b), prose, lead });
        break;
      }

      case 'numbered': {
        const items = arr<Raw>(b.items)
          .map((i) => ({ title: cleanTitle(i.title), body: str(i.body) }))
          .filter((i) => i.title || i.body);
        if (items.length) sections.push({ kind: 'numbered', id: anchor('why'), nav: navFor('numbered'), ...head(b), items });
        break;
      }

      case 'panels': {
        const view = readPanels(b.panels);
        // Place panels that each name a real destination become destination
        // cards, so the photo, facts and link come from the destination itself.
        const matched = view?.kind === 'places' ? matchDestinations(view.items.map((p) => p.title), destinations) : null;
        if (matched && view?.kind === 'places') {
          // A destination with no photo of its own borrows the panel's photo.
          // The editor's own words for each place lead the card; a destination with
          // no photo of its own borrows the panel's photo.
          const withPhotos = matched.map((d, k) => {
            const panel = view.items[k];
            const card = { ...d, short_description: panel.text || d.short_description };
            return d.main_image_url || d.banner_image_url || d.image_url || !panel.image ? card : { ...card, image_url: panel.image };
          });
          sections.push({ kind: 'destinations', id: anchor('where-to-go'), nav: navFor('places'), ...head(b), intro: '', destinations: withPhotos });
          break;
        }
        if (view) sections.push({ kind: 'panels', id: anchor(view.kind), nav: navFor(view.kind), ...head(b), view });
        break;
      }

      case 'tiers': {
        const tiers = readTiers(b.tiers, lodges);
        if (tiers.length) sections.push({ kind: 'tiers', id: anchor('prices'), nav: navFor('tiers'), ...head(b), intro: str(b.intro), tiers });
        break;
      }

      case 'cta': {
        const title = cleanTitle(b.title);
        const label = str(b.label).replace(/\s*[→>]+\s*$/, '');
        const href = localHref(str(b.href));
        if (title || (label && href)) {
          sections.push({
            kind: 'cta', id: anchor('cta'), nav: '', title, subtitle: str(b.subtitle), label, href,
            points: strings(b.points).flatMap((pt) => pt.split(/\s+[·•|]\s+/)).map((pt) => pt.trim()).filter(Boolean),
            // The closing band: the last CTA, when there are several or nothing but CTAs follows it.
            final: b === finalCta && (ctas.length > 1 || blocks.slice(blocks.indexOf(b) + 1).every((x) => x.type === 'cta'))
          });
        }
        break;
      }

      case 'steps': {
        const steps = arr<Raw>(b.steps)
          .map((s) => ({ title: cleanTitle(s.title), body: str(s.body) }))
          .filter((s) => s.title || s.body);
        if (steps.length) {
          sections.push({
            kind: 'steps', id: anchor('how-it-works'), nav: navFor('steps'), ...head(b), steps,
            ctaLabel: str(b.cta_label), ctaHref: localHref(str(b.cta_href))
          });
        }
        break;
      }

      // 'When to go' blocks: each season becomes a row of the seasons layout.
      case 'season': {
        const rows = arr<Raw>(b.seasons)
          .map((x) => ({
            label: [str(x.months), str(x.label)].filter(Boolean).join(' · '),
            text: str(x.body)
          }))
          .filter((r) => r.label || r.text);
        if (rows.length) {
          const prose: ProseView = {
            kind: 'seasons', intro: toHtml(str(b.intro) ? [str(b.intro)] : []), rows, callout: '',
            outro: toHtml(str(b.note) ? [str(b.note)] : []), link: null
          };
          sections.push({ kind: 'prose', id: anchor('when-to-go'), nav: navFor('seasons'), ...head(b), prose, lead: false });
        }
        break;
      }

      // 'Suggested route' blocks: the stops become the route timeline, notes follow.
      case 'route': {
        const stops = strings(b.stops);
        if (stops.length) {
          const notes = arr<Raw>(b.notes)
            .map((x) => [str(x.title) ? `<strong>${str(x.title)}</strong>` : '', str(x.body)].filter(Boolean).join(' '))
            .filter(Boolean);
          const prose: ProseView = {
            kind: 'route', intro: toHtml(str(b.intro) ? [str(b.intro)] : []),
            rows: stops.map((stop, k) => ({ label: `Stop ${k + 1}`, text: stop })),
            callout: '', outro: toHtml(notes), link: null
          };
          sections.push({ kind: 'prose', id: anchor('route'), nav: navFor('route'), ...head(b), prose, lead: false });
        }
        break;
      }

      case 'imagegrid': {
        const images = arr<Raw>(b.images)
          .map((im) => ({ url: str(im.image_url), caption: str(im.caption) }))
          .filter((im) => im.url);
        if (images.length) sections.push({ kind: 'gallery', id: anchor('gallery'), nav: navFor('gallery'), ...head(b), images });
        break;
      }

      case 'inclusions': {
        const included = strings(b.included);
        const excluded = strings(b.excluded);
        if (included.length || excluded.length) {
          sections.push({ kind: 'inclusions', id: anchor('included'), nav: navFor('inclusions'), ...head(b), included, excluded });
        }
        break;
      }

      case 'tours': {
        const picked = arr<string>(b.tour_ids)
          .map((id) => tours.find((t) => t.id === id))
          .filter((t): t is Tour => Boolean(t));
        if (picked.length) {
          sections.push({ kind: 'tours', id: anchor('itineraries'), nav: navFor('tours'), ...head(b), intro: str(b.intro), tours: picked });
        }
        break;
      }

      case 'destinations': {
        const picked = arr<string>(b.destination_ids)
          .map((id) => destinations.find((d) => d.id === id))
          .filter((d): d is Destination => Boolean(d));
        if (picked.length) {
          sections.push({ kind: 'destinations', id: anchor('where-to-go'), nav: navFor('places'), ...head(b), intro: str(b.intro), destinations: picked });
        }
        break;
      }

      case 'faq': {
        const items = arr<Raw>(b.items)
          .map((i) => ({ q: str(i.question), a: str(i.answer) }))
          .filter((i) => i.q && i.a);
        if (items.length) sections.push({ kind: 'faq', id: anchor('faq'), nav: navFor('faq'), ...head(b), items });
        break;
      }
    }
  }

  return { trust, sections };
};
