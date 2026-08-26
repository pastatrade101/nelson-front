<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowDown, ArrowUp, Edit, ExternalLink, Globe, Plus, Save, Search, Trash2 } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import { assessMarketDifferentiation, type Assessment } from '$lib/marketDifferentiation';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminEmptyState from '$lib/components/admin/AdminEmptyState.svelte';
  import AdminFormInput from '$lib/components/admin/AdminFormInput.svelte';
  import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
  import AdminSelect from '$lib/components/admin/AdminSelect.svelte';
  import AdminTextArea from '$lib/components/admin/AdminTextArea.svelte';
  import AdminToolbar from '$lib/components/admin/AdminToolbar.svelte';
  import ConfirmModal from '$lib/components/admin/ConfirmModal.svelte';
  import MediaPicker from '$lib/components/admin/MediaPicker.svelte';
  import StatusBadge from '$lib/components/admin/StatusBadge.svelte';
  import ToastStack from '$lib/components/admin/ToastStack.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';

  // Market landing pages ("Tanzania Safari from Dubai") are rendered by ONE public
  // route, /safaris/[slug], from the market_pages table. Everything on this screen
  // is data — marketing can launch a new market with no code deploy.

  type Toast = { id: string; message: string; type: 'error' | 'success' };

  type MarketPage = {
    id: string;
    slug: string;
    name: string;
    market_code?: string | null;
    hero_eyebrow?: string | null;
    hero_title?: string | null;
    hero_subtitle?: string | null;
    hero_image_url?: string | null;
    hero_cta_label?: string | null;
    hero_cta_href?: string | null;
    sections?: unknown;
    featured_tour_ids?: unknown;
    meta_title?: string | null;
    meta_description?: string | null;
    og_image_url?: string | null;
    noindex?: boolean | null;
    status?: string | null;
    sort_order?: number | null;
    created_at?: string | null;
    updated_at?: string | null;
  };

  // ── block model ───────────────────────────────────────────────────────────
  // The stored JSON is exactly what the contract defines (one shape per type).
  // Editing uses a single superset object so every field binds cleanly; the
  // per-type `serializeBlock` below writes back only that type's keys.
  // One superset item covers every repeater on the screen: a fact (label/value),
  // a benefit or step (title/body), a question, a tier card, a split panel
  // (title + `lines` + image) a gallery tile (image + caption) and a season
  // (months/label/body). Only the fields a block type uses are ever serialized.
  type Item = {
    label: string;
    value: string;
    title: string;
    body: string;
    question: string;
    answer: string;
    months: string;
    caption: string;
    image_url: string;
    lines: string[];
  };
  type CompareRow = { label: string; cells: string[] };
  type Block = {
    type: string;
    eyebrow: string;
    title: string;
    intro: string;
    body: string;
    subtitle: string;
    label: string;
    href: string;
    note: string;
    /** 'numbered' — stored as a number, edited as a select. */
    column_count: string;
    /** 'steps' — closing button. */
    cta_label: string;
    cta_href: string;
    items: Item[];
    columns: string[];
    rows: CompareRow[];
    included: string[];
    excluded: string[];
    points: string[];
    stops: string[];
    tour_ids: string[];
    /** 'packages' — which of `tour_ids` gets the flagship treatment. */
    flagship_tour_id: string;
    /**
     * 'packages' — OPTIONAL real prices, one row per tour slot in `tour_ids`,
     * columns in PAX_SIZES order. Everything is a string so an untouched field
     * stays genuinely EMPTY: a blank is never turned into an example price.
     */
    pax_rows: string[][];
    /**
     * 'packages' — OPTIONAL per-tour copy the tours schema cannot hold (kicker,
     * route stops, nights split, best-for line, card image, CTA). One row per
     * tour slot. Every field is a string so an untouched box stays genuinely
     * EMPTY, and an empty box means "fall back to the tour's own data".
     */
    override_rows: OverrideRow[];
    // A block type this editor doesn't know (e.g. added later by another release)
    // is round-tripped untouched instead of being silently dropped on save.
    raw: Record<string, unknown>;
  };
  type StringListKey = 'included' | 'excluded' | 'points' | 'tour_ids' | 'columns' | 'stops';

  /** Draft shape of one tour slot's per-package overrides (all strings; blank = unset). */
  type OverrideRow = {
    kicker: string;
    /** One stop per line in the textarea; serialised to string[]. */
    route_stops: string;
    safari_nights: string;
    zanzibar_nights: string;
    best_for: string;
    image_url: string;
    cta_label: string;
    cta_href: string;
  };

  /** Party sizes offered by the optional per-tour price grid. */
  const PAX_SIZES = [2, 3, 4, 5, 6, 7];

  const BLOCK_TYPES: Array<{ hint: string; label: string; value: string }> = [
    { value: 'relevance', label: 'Market relevance', hint: 'Flights, visas, seasons — the facts that make this page genuinely market-specific.' },
    { value: 'trust', label: 'Trust strip', hint: 'A short row of reassurance labels under the hero. Type only what is actually true.' },
    { value: 'benefits', label: 'Benefits', hint: 'Short reasons to book — a heading plus a line of body copy each.' },
    { value: 'numbered', label: 'Numbered grid', hint: 'Numbered points in a grid — a heading plus a line of body copy each.' },
    { value: 'packages', label: 'Packages (tours)', hint: 'Feature existing tours. The cards render live tour data; per-party prices are optional and only appear once you type real figures.' },
    { value: 'comparison', label: 'Comparison table', hint: 'Type the columns and rows, or leave them empty to build the table from the tours below.' },
    { value: 'route', label: 'Route flow', hint: 'The journey as an ordered list of stops, with optional notes beside it.' },
    { value: 'tiers', label: 'Comfort tiers', hint: 'Essential / Classic / Luxury style cards, each with an optional image.' },
    { value: 'panels', label: 'Split panels', hint: 'Side-by-side panels, each a heading, a list of lines and an optional image.' },
    { value: 'inclusions', label: 'Included / excluded', hint: 'Two plain lists shown side by side.' },
    { value: 'imagegrid', label: 'Image grid', hint: 'A gallery of real uploaded images. A caption without an image is not shown.' },
    { value: 'season', label: 'Season strip', hint: 'Months, a short label and a line of detail per season.' },
    { value: 'steps', label: 'How it works (steps)', hint: 'Numbered steps, with an optional button at the end.' },
    { value: 'prose', label: 'Prose', hint: 'A heading and free paragraphs — leave a blank line between paragraphs.' },
    { value: 'faq', label: 'FAQ', hint: 'Question and answer pairs.' },
    { value: 'reviews', label: 'Reviews', hint: 'Pulls published reviews from the site — only the heading is set here.' },
    { value: 'cta', label: 'Call to action', hint: 'Closing CTA with an optional list of reassurance points.' }
  ];
  const BLOCK_LABELS: Record<string, string> = Object.fromEntries(BLOCK_TYPES.map((b) => [b.value, b.label]));
  const BLOCK_HINTS: Record<string, string> = Object.fromEntries(BLOCK_TYPES.map((b) => [b.value, b.hint]));
  const blockTypeOptions = BLOCK_TYPES.map((b) => ({ label: b.label, value: b.value }));

  const statusOptions = [
    { label: 'Draft', value: 'draft' },
    { label: 'Published', value: 'published' }
  ];

  const emptyForm = () => ({
    name: '',
    slug: '',
    market_code: '',
    hero_eyebrow: '',
    hero_title: '',
    hero_subtitle: '',
    hero_image_url: '',
    hero_cta_label: '',
    hero_cta_href: '',
    meta_title: '',
    meta_description: '',
    og_image_url: '',
    noindex: true,
    status: 'draft',
    sort_order: '0'
  });

  // ── state ─────────────────────────────────────────────────────────────────
  let view: 'edit' | 'list' = 'list';
  let rows: MarketPage[] = [];
  let tours: Array<{ id: string; title: string }> = [];

  let loading = true;
  let saving = false;
  let deleting = false;
  let error = '';
  let search = '';
  let statusFilter = 'all';

  let editingId: string | null = null;
  let form = emptyForm();
  let blocks: Block[] = [];
  let featuredTourIds: string[] = [];

  // ── Indexability guard ──────────────────────────────────────────────────────
  // A market page is only worth indexing if it answers questions that are FALSE
  // for other markets. The assessment runs whenever the editor turns noindex OFF;
  // it never touches saving a noindex page, and never blocks outright — a weak
  // result just has to be acknowledged first.
  let ackWeak = false;

  $: assessedPage = {
    slug: form.slug,
    name: form.name,
    market_code: form.market_code,
    hero_eyebrow: form.hero_eyebrow,
    hero_title: form.hero_title,
    hero_subtitle: form.hero_subtitle,
    hero_cta_label: form.hero_cta_label,
    meta_title: form.meta_title,
    meta_description: form.meta_description,
    featured_tour_ids: featuredTourIds,
    sections: blocks.map(serializeBlock)
  };

  // Only pages that are already indexable compete with this one in search, so
  // they are the only meaningful comparison set.
  $: indexableRivals = rows.filter((r) => r.noindex === false && r.status === 'published' && r.id !== editingId);

  $: assessment = form.noindex ? null : (assessMarketDifferentiation(assessedPage, indexableRivals) as Assessment);

  // Any edit invalidates a previous acknowledgement — otherwise an editor could
  // acknowledge a warning, then paste in a clone and save it unchallenged.
  $: if (assessment?.verdict !== 'weak') ackWeak = false;
  $: assessmentFingerprint = assessment ? `${assessment.verdict}|${assessment.gaps.join('|')}` : '';
  let lastFingerprint = '';
  $: if (assessmentFingerprint !== lastFingerprint) {
    lastFingerprint = assessmentFingerprint;
    ackWeak = false;
  }
  let newBlockType = BLOCK_TYPES[0].value;
  let slugManuallyEdited = false;
  let baseline = '';

  let confirmOpen = false;
  let discardOpen = false;
  let toDelete: MarketPage | null = null;
  let toasts: Toast[] = [];

  // ── toasts ────────────────────────────────────────────────────────────────
  const toast = (message: string, type: Toast['type'] = 'success') => {
    const id = Math.random().toString(36).slice(2);
    toasts = [{ id, message, type }, ...toasts].slice(0, 4);
    setTimeout(() => { toasts = toasts.filter((t) => t.id !== id); }, 3500);
  };
  const dismissToast = (e: CustomEvent<string>) => { toasts = toasts.filter((t) => t.id !== e.detail); };

  // ── small helpers ─────────────────────────────────────────────────────────
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const strList = (v: unknown): string[] => (Array.isArray(v) ? v.map(str) : []);
  const record = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});
  const slugify = (v: string) => v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const fmtDate = (v?: string | null) =>
    v ? new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(v)) : '-';

  const move = <T,>(list: T[], i: number, delta: number): T[] => {
    const j = i + delta;
    if (j < 0 || j >= list.length) return list;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  };

  // The API client is shared — accept either a bare array or a paginated { items }.
  const asList = (payload: unknown): MarketPage[] => {
    if (Array.isArray(payload)) return payload as MarketPage[];
    const items = record(payload).items;
    return Array.isArray(items) ? (items as MarketPage[]) : [];
  };

  // ── blocks: hydrate / serialize ───────────────────────────────────────────
  const blankItem = (): Item => ({
    label: '',
    value: '',
    title: '',
    body: '',
    question: '',
    answer: '',
    months: '',
    caption: '',
    image_url: '',
    lines: []
  });

  const hydrateItem = (raw: unknown): Item => {
    const r = record(raw);
    return {
      label: str(r.label),
      value: str(r.value),
      title: str(r.title),
      body: str(r.body),
      question: str(r.question),
      answer: str(r.answer),
      months: str(r.months),
      caption: str(r.caption),
      image_url: str(r.image_url),
      // Split panels nest their own list of lines under `items`.
      lines: strList(r.items)
    };
  };

  // Which stored key holds this type's repeater — they all edit as `items`.
  const ITEMS_KEY: Record<string, string> = {
    route: 'notes',
    steps: 'steps',
    tiers: 'tiers',
    panels: 'panels',
    imagegrid: 'images',
    season: 'seasons'
  };

  const blankPaxRow = (): string[] => PAX_SIZES.map(() => '');

  const blankOverrideRow = (): OverrideRow => ({
    kicker: '',
    route_stops: '',
    safari_nights: '',
    zanzibar_nights: '',
    best_for: '',
    image_url: '',
    cta_label: '',
    cta_href: ''
  });

  /** Stored `overrides` (tour id → override) back into one row per tour slot. */
  const hydrateOverrideRows = (raw: unknown, tourIds: string[]): OverrideRow[] => {
    const all = record(raw);
    return tourIds.map((id) => {
      const o = record(all[id]);
      const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? String(v) : '');
      return {
        kicker: str(o.kicker),
        route_stops: strList(o.route_stops).join('\n'),
        safari_nights: num(o.safari_nights),
        zanzibar_nights: num(o.zanzibar_nights),
        best_for: str(o.best_for),
        image_url: str(o.image_url),
        cta_label: str(o.cta_label),
        cta_href: str(o.cta_href)
      };
    });
  };

  /** Stored `pax_pricing` (tour id → pax → price) back into one row per tour slot. */
  const hydratePaxRows = (raw: unknown, tourIds: string[]): string[][] => {
    const pricing = record(raw);
    return tourIds.map((id) => {
      const forTour = record(pricing[id]);
      return PAX_SIZES.map((size) => {
        const price = forTour[String(size)];
        return typeof price === 'number' && Number.isFinite(price) && price > 0 ? String(price) : '';
      });
    });
  };

  const hydrateBlock = (raw: unknown): Block => {
    const r = record(raw);
    const type = str(r.type);
    const columns = strList(r.columns);
    const tourIds = strList(r.tour_ids);
    const rawItems = r[ITEMS_KEY[type] ?? 'items'];
    const columnCount = typeof r.columns === 'number' ? String(r.columns) : '';
    return {
      type,
      eyebrow: str(r.eyebrow),
      title: str(r.title),
      intro: str(r.intro),
      body: str(r.body),
      subtitle: str(r.subtitle),
      label: str(r.label),
      href: str(r.href),
      note: str(r.note),
      column_count: columnCount || '3',
      cta_label: str(r.cta_label),
      cta_href: str(r.cta_href),
      items: Array.isArray(rawItems) ? (rawItems as unknown[]).map(hydrateItem) : [],
      // `columns` is a string list on a comparison table and a number on a
      // numbered grid — only the table shape belongs in this field.
      columns: type === 'numbered' ? [] : columns,
      rows: Array.isArray(r.rows)
        ? (r.rows as unknown[]).map((row) => {
            const rr = record(row);
            const cells = strList(rr.cells);
            return { label: str(rr.label), cells: columns.map((_, i) => cells[i] ?? '') };
          })
        : [],
      included: strList(r.included),
      excluded: strList(r.excluded),
      points: strList(r.points),
      stops: strList(r.stops),
      tour_ids: tourIds,
      flagship_tour_id: str(r.flagship_tour_id),
      pax_rows: hydratePaxRows(r.pax_pricing, tourIds),
      override_rows: hydrateOverrideRows(r.overrides, tourIds),
      raw: r
    };
  };

  const blankBlock = (type: string): Block => {
    const block: Block = {
      type,
      eyebrow: '',
      title: '',
      intro: '',
      body: '',
      subtitle: '',
      label: '',
      href: '',
      note: '',
      column_count: '3',
      cta_label: '',
      cta_href: '',
      items: [],
      columns: [],
      rows: [],
      included: [],
      excluded: [],
      points: [],
      stops: [],
      tour_ids: [],
      flagship_tour_id: '',
      pax_rows: [],
      override_rows: [],
      raw: { type }
    };
    const startsWithOneItem = ['relevance', 'benefits', 'faq', 'trust', 'numbered', 'tiers', 'panels', 'imagegrid', 'steps', 'season'];
    if (startsWithOneItem.includes(type)) block.items = [blankItem()];
    if (type === 'comparison') {
      block.columns = ['', ''];
      block.rows = [{ label: '', cells: ['', ''] }];
    }
    if (type === 'inclusions') {
      block.included = [''];
      block.excluded = [''];
    }
    if (type === 'packages') {
      block.tour_ids = [''];
      block.pax_rows = [blankPaxRow()];
      block.override_rows = [blankOverrideRow()];
    }
    if (type === 'route') {
      block.stops = [''];
      block.items = [blankItem()];
    }
    if (type === 'cta') block.points = [''];
    return block;
  };

  const cleanList = (values: string[]) => values.map((v) => v.trim()).filter(Boolean);
  const titleBody = (items: Item[]) =>
    items.map((i) => ({ title: i.title.trim(), body: i.body.trim() })).filter((i) => i.title || i.body);

  /**
   * The optional per-tour price grid. A field left blank is simply absent — no
   * example figure is ever written — and a tour with nothing typed for it keeps
   * showing its own "from" price on the public page.
   */
  /**
   * Draft override rows → `overrides` keyed by tour id. A blank box is DELETED
   * rather than saved as an empty string, so "blank" genuinely means "use the
   * tour's own data"; a slot with nothing filled in is omitted entirely.
   */
  const serializeOverrides = (b: Block, slots: string[]): Record<string, Record<string, unknown>> => {
    const out: Record<string, Record<string, unknown>> = {};
    slots.forEach((tourId, slot) => {
      if (!tourId) return;
      const row = b.override_rows[slot];
      if (!row) return;
      const o: Record<string, unknown> = {};
      const text = (v: string) => v.trim();
      if (text(row.kicker)) o.kicker = text(row.kicker);
      const stops = row.route_stops.split('\n').map((s) => s.trim()).filter(Boolean);
      if (stops.length) o.route_stops = stops;
      const nights = (v: string) => {
        const n = Number(v.trim());
        return v.trim() && Number.isFinite(n) && n > 0 ? n : null;
      };
      const safari = nights(row.safari_nights);
      if (safari !== null) o.safari_nights = safari;
      const zanzibar = nights(row.zanzibar_nights);
      if (zanzibar !== null) o.zanzibar_nights = zanzibar;
      if (text(row.best_for)) o.best_for = text(row.best_for);
      if (text(row.image_url)) o.image_url = text(row.image_url);
      if (text(row.cta_label)) o.cta_label = text(row.cta_label);
      if (text(row.cta_href)) o.cta_href = text(row.cta_href);
      if (Object.keys(o).length) out[tourId] = o;
    });
    return out;
  };

  const serializePaxPricing = (b: Block, tourIds: string[]): Record<string, Record<string, number>> => {
    const pricing: Record<string, Record<string, number>> = {};
    tourIds.forEach((id, slot) => {
      if (!id) return;
      const prices: Record<string, number> = {};
      PAX_SIZES.forEach((size, column) => {
        const raw = (b.pax_rows[slot]?.[column] ?? '').trim();
        if (!raw) return;
        const amount = Number(raw);
        if (Number.isFinite(amount) && amount > 0) prices[String(size)] = amount;
      });
      if (Object.keys(prices).length) pricing[id] = prices;
    });
    return pricing;
  };

  const serializeBlock = (b: Block): Record<string, unknown> => {
    const title = b.title.trim();
    const eyebrow = b.eyebrow.trim();
    const intro = b.intro.trim();
    switch (b.type) {
      case 'relevance':
        return {
          type: 'relevance',
          title,
          intro,
          items: b.items.map((i) => ({ label: i.label.trim(), value: i.value.trim() })).filter((i) => i.label || i.value)
        };
      case 'benefits':
        return {
          type: 'benefits',
          title,
          items: b.items.map((i) => ({ title: i.title.trim(), body: i.body.trim() })).filter((i) => i.title || i.body)
        };
      case 'packages': {
        const slots = b.tour_ids.map((t) => t.trim());
        const tourIds = slots.filter(Boolean);
        const pricing = serializePaxPricing(b, slots);
        const block: Record<string, unknown> = { type: 'packages', eyebrow, title, intro, tour_ids: tourIds };
        // Both keys stay OFF the payload unless they carry real values.
        if (b.flagship_tour_id && tourIds.includes(b.flagship_tour_id)) block.flagship_tour_id = b.flagship_tour_id;
        if (Object.keys(pricing).length) block.pax_pricing = pricing;
        const overrides = serializeOverrides(b, slots);
        if (Object.keys(overrides).length) block.overrides = overrides;
        return block;
      }
      case 'comparison': {
        const columns = b.columns.map((c) => c.trim());
        return {
          type: 'comparison',
          title,
          columns,
          rows: b.rows
            .map((r) => ({ label: r.label.trim(), cells: columns.map((_, i) => (r.cells[i] ?? '').trim()) }))
            .filter((r) => r.label || r.cells.some(Boolean)),
          tour_ids: cleanList(b.tour_ids)
        };
      }
      case 'inclusions':
        return { type: 'inclusions', title, included: cleanList(b.included), excluded: cleanList(b.excluded) };
      case 'prose':
        return { type: 'prose', title, body: b.body.trim() };
      case 'faq':
        return {
          type: 'faq',
          title,
          items: b.items.map((i) => ({ question: i.question.trim(), answer: i.answer.trim() })).filter((i) => i.question || i.answer)
        };
      case 'reviews':
        return { type: 'reviews', title };
      case 'cta':
        return {
          type: 'cta',
          title,
          subtitle: b.subtitle.trim(),
          label: b.label.trim(),
          href: b.href.trim(),
          points: cleanList(b.points)
        };
      case 'trust':
        return {
          type: 'trust',
          items: b.items.map((i) => ({ label: i.label.trim() })).filter((i) => i.label)
        };
      case 'numbered': {
        const count = Number(b.column_count);
        return {
          type: 'numbered',
          eyebrow,
          title,
          columns: Number.isFinite(count) && count > 0 ? count : 3,
          items: titleBody(b.items)
        };
      }
      case 'route':
        return { type: 'route', eyebrow, title, intro, stops: cleanList(b.stops), notes: titleBody(b.items) };
      case 'tiers':
        return {
          type: 'tiers',
          eyebrow,
          title,
          intro,
          tiers: b.items
            .map((i) => ({ label: i.label.trim(), title: i.title.trim(), body: i.body.trim(), image_url: i.image_url.trim() }))
            .filter((t) => t.label || t.title || t.body || t.image_url)
        };
      case 'panels':
        return {
          type: 'panels',
          eyebrow,
          title,
          panels: b.items
            .map((i) => ({ title: i.title.trim(), items: cleanList(i.lines), image_url: i.image_url.trim() }))
            .filter((p) => p.title || p.items.length || p.image_url)
        };
      case 'imagegrid':
        return {
          type: 'imagegrid',
          eyebrow,
          title,
          // A caption with no image is dropped — the public grid shows real images only.
          images: b.items
            .map((i) => ({ image_url: i.image_url.trim(), caption: i.caption.trim() }))
            .filter((i) => i.image_url)
        };
      case 'steps':
        return {
          type: 'steps',
          eyebrow,
          title,
          steps: titleBody(b.items),
          cta_label: b.cta_label.trim(),
          cta_href: b.cta_href.trim()
        };
      case 'season':
        return {
          type: 'season',
          eyebrow,
          title,
          intro,
          seasons: b.items
            .map((i) => ({ months: i.months.trim(), label: i.label.trim(), body: i.body.trim() }))
            .filter((s) => s.months || s.label || s.body),
          note: b.note.trim()
        };
      default:
        return b.raw;
    }
  };

  // ── block builder actions ─────────────────────────────────────────────────
  const addBlock = () => {
    blocks = [...blocks, blankBlock(newBlockType)];
  };
  const removeBlock = (i: number) => {
    blocks = blocks.filter((_, j) => j !== i);
  };
  const moveBlock = (i: number, delta: number) => {
    blocks = move(blocks, i, delta);
  };

  const addItem = (i: number) => {
    blocks[i].items = [...blocks[i].items, blankItem()];
    blocks = blocks;
  };
  const removeItem = (i: number, j: number) => {
    blocks[i].items = blocks[i].items.filter((_, k) => k !== j);
    blocks = blocks;
  };
  const moveItem = (i: number, j: number, delta: number) => {
    blocks[i].items = move(blocks[i].items, j, delta);
    blocks = blocks;
  };

  const addString = (i: number, key: StringListKey) => {
    blocks[i][key] = [...blocks[i][key], ''];
    blocks = blocks;
  };
  const removeString = (i: number, key: StringListKey, j: number) => {
    blocks[i][key] = blocks[i][key].filter((_, k) => k !== j);
    blocks = blocks;
  };
  const moveString = (i: number, key: StringListKey, j: number, delta: number) => {
    blocks[i][key] = move(blocks[i][key], j, delta);
    blocks = blocks;
  };

  // A split panel owns a nested list of lines.
  const addLine = (i: number, j: number) => {
    blocks[i].items[j].lines = [...blocks[i].items[j].lines, ''];
    blocks = blocks;
  };
  const removeLine = (i: number, j: number, k: number) => {
    blocks[i].items[j].lines = blocks[i].items[j].lines.filter((_, n) => n !== k);
    blocks = blocks;
  };
  const moveLine = (i: number, j: number, k: number, delta: number) => {
    blocks[i].items[j].lines = move(blocks[i].items[j].lines, k, delta);
    blocks = blocks;
  };

  // A packages tour slot carries its own (optional) price row, so the two lists
  // are always added, removed and reordered together.
  const addTourSlot = (i: number) => {
    blocks[i].tour_ids = [...blocks[i].tour_ids, ''];
    blocks[i].pax_rows = [...blocks[i].pax_rows, blankPaxRow()];
    blocks[i].override_rows = [...blocks[i].override_rows, blankOverrideRow()];
    blocks = blocks;
  };
  const removeTourSlot = (i: number, j: number) => {
    const removed = blocks[i].tour_ids[j];
    blocks[i].tour_ids = blocks[i].tour_ids.filter((_, k) => k !== j);
    blocks[i].pax_rows = blocks[i].pax_rows.filter((_, k) => k !== j);
    blocks[i].override_rows = blocks[i].override_rows.filter((_, k) => k !== j);
    if (removed && blocks[i].flagship_tour_id === removed) blocks[i].flagship_tour_id = '';
    blocks = blocks;
  };
  const moveTourSlot = (i: number, j: number, delta: number) => {
    if (j + delta < 0 || j + delta >= blocks[i].tour_ids.length) return;
    blocks[i].tour_ids = move(blocks[i].tour_ids, j, delta);
    blocks[i].pax_rows = move(blocks[i].pax_rows, j, delta);
    blocks[i].override_rows = move(blocks[i].override_rows, j, delta);
    blocks = blocks;
  };
  /** Only the tours actually chosen can be the flagship. */
  const flagshipOptions = (block: Block, list: Array<{ id: string; title: string }>) => [
    { label: 'No flagship', value: '' },
    ...block.tour_ids
      .map((id) => id.trim())
      .filter(Boolean)
      .map((id) => ({ value: id, label: list.find((t) => t.id === id)?.title ?? id }))
  ];

  // Columns and row cells must stay the same length, so they change together.
  const addColumn = (i: number) => {
    blocks[i].columns = [...blocks[i].columns, ''];
    blocks[i].rows = blocks[i].rows.map((r) => ({ ...r, cells: [...r.cells, ''] }));
    blocks = blocks;
  };
  const removeColumn = (i: number, col: number) => {
    blocks[i].columns = blocks[i].columns.filter((_, k) => k !== col);
    blocks[i].rows = blocks[i].rows.map((r) => ({ ...r, cells: r.cells.filter((_, k) => k !== col) }));
    blocks = blocks;
  };
  const addRow = (i: number) => {
    blocks[i].rows = [...blocks[i].rows, { label: '', cells: blocks[i].columns.map(() => '') }];
    blocks = blocks;
  };
  const removeRow = (i: number, j: number) => {
    blocks[i].rows = blocks[i].rows.filter((_, k) => k !== j);
    blocks = blocks;
  };
  const moveRow = (i: number, j: number, delta: number) => {
    blocks[i].rows = move(blocks[i].rows, j, delta);
    blocks = blocks;
  };

  const addFeaturedTour = () => {
    featuredTourIds = [...featuredTourIds, ''];
  };
  const removeFeaturedTour = (i: number) => {
    featuredTourIds = featuredTourIds.filter((_, j) => j !== i);
  };

  // ── data loading ──────────────────────────────────────────────────────────
  const loadRows = async (silent = false) => {
    if (!silent) loading = true;
    error = '';
    try {
      const res = await api.marketPages.list({ all: true, limit: 200 });
      rows = asList(res.data);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to load market landing pages.';
    } finally {
      loading = false;
    }
  };

  const loadTours = async () => {
    try {
      const res = await api.tours.list({ limit: 200, status: 'all' });
      tours = res.data.items.map((t) => ({ id: t.id, title: t.title }));
    } catch {
      tours = []; // non-critical — the tour pickers fall back to plain ID fields
    }
  };

  $: tourOptions = [{ label: 'Select a tour...', value: '' }, ...tours.map((t) => ({ label: t.title, value: t.id }))];

  $: filteredRows = rows
    .filter((r) => {
      const q = search.trim().toLowerCase();
      const matchesSearch = !q || `${r.name ?? ''} ${r.slug ?? ''} ${r.market_code ?? ''}`.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || (r.status ?? 'draft') === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || (a.name ?? '').localeCompare(b.name ?? ''));

  // ── editor open / close ───────────────────────────────────────────────────
  const fill = (page: MarketPage | null) => {
    if (!page) {
      form = emptyForm();
      blocks = [];
      featuredTourIds = [];
    } else {
      form = {
        name: page.name ?? '',
        slug: page.slug ?? '',
        market_code: page.market_code ?? '',
        hero_eyebrow: page.hero_eyebrow ?? '',
        hero_title: page.hero_title ?? '',
        hero_subtitle: page.hero_subtitle ?? '',
        hero_image_url: page.hero_image_url ?? '',
        hero_cta_label: page.hero_cta_label ?? '',
        hero_cta_href: page.hero_cta_href ?? '',
        meta_title: page.meta_title ?? '',
        meta_description: page.meta_description ?? '',
        og_image_url: page.og_image_url ?? '',
        noindex: page.noindex !== false,
        status: page.status ?? 'draft',
        sort_order: String(page.sort_order ?? 0)
      };
      blocks = Array.isArray(page.sections) ? (page.sections as unknown[]).map(hydrateBlock) : [];
      featuredTourIds = strList(page.featured_tour_ids);
    }
    newBlockType = BLOCK_TYPES[0].value;
    baseline = JSON.stringify({ form, blocks, featuredTourIds });
  };

  $: dirty = view === 'edit' && baseline !== JSON.stringify({ form, blocks, featuredTourIds });

  const openCreate = () => {
    editingId = null;
    slugManuallyEdited = false;
    fill(null);
    view = 'edit';
    void loadTours();
  };

  const openEdit = async (row: MarketPage) => {
    editingId = row.id;
    slugManuallyEdited = true;
    let full = row;
    // The list may only carry summary columns — pull the full record when the
    // blocks aren't already on the row.
    if (!Array.isArray(row.sections)) {
      try {
        const res = await api.marketPages.get(row.slug);
        const data = res.data as unknown;
        if (data && typeof data === 'object') full = { ...row, ...(data as MarketPage) };
      } catch {
        toast('Loaded the summary only — open again once the page endpoint responds.', 'error');
      }
    }
    fill(full);
    view = 'edit';
    void loadTours();
  };

  const backToList = () => {
    if (dirty) {
      discardOpen = true;
      return;
    }
    view = 'list';
    editingId = null;
  };

  const discardChanges = () => {
    discardOpen = false;
    view = 'list';
    editingId = null;
    fill(null);
  };

  // A name typed before the slug is touched keeps the slug in sync.
  $: if (view === 'edit' && !slugManuallyEdited) form.slug = slugify(form.name);

  // ── save / delete ─────────────────────────────────────────────────────────
  const save = async () => {
    if (saving) return;
    const name = form.name.trim();
    const slug = form.slug.trim();
    if (!name) {
      toast('Give the page a name (the label used in this list).', 'error');
      return;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      toast('The slug must be lowercase letters, numbers and hyphens, e.g. tanzania-safari-from-dubai.', 'error');
      return;
    }

    // Going indexable with a weak assessment needs an explicit acknowledgement.
    // Saving a noindex page is never obstructed — that is the whole point of the
    // noindex default: unlimited ad pages, no SEO risk, no friction.
    if (!form.noindex && assessment?.requiresAcknowledgement && !ackWeak) {
      toast('This page looks too similar to an existing indexed page. Review the differentiation warning and confirm before making it indexable.', 'error');
      return;
    }

    const sort = Number(form.sort_order);
    const payload = {
      name,
      slug,
      market_code: form.market_code.trim().toUpperCase() || null,
      hero_eyebrow: form.hero_eyebrow.trim() || null,
      hero_title: form.hero_title.trim() || null,
      hero_subtitle: form.hero_subtitle.trim() || null,
      hero_image_url: form.hero_image_url.trim() || null,
      hero_cta_label: form.hero_cta_label.trim() || null,
      hero_cta_href: form.hero_cta_href.trim() || null,
      sections: blocks.map(serializeBlock),
      featured_tour_ids: featuredTourIds.map((id) => id.trim()).filter(Boolean),
      meta_title: form.meta_title.trim() || null,
      meta_description: form.meta_description.trim() || null,
      og_image_url: form.og_image_url.trim() || null,
      noindex: form.noindex,
      status: form.status,
      sort_order: Number.isFinite(sort) ? sort : 0
    };

    saving = true;
    try {
      if (editingId) {
        await api.marketPages.update(editingId, payload);
        toast('Landing page saved.');
      } else {
        const res = await api.marketPages.create(payload);
        const created = record(res.data);
        if (typeof created.id === 'string') editingId = created.id;
        // The URL now exists — stop mirroring the admin name into the slug.
        slugManuallyEdited = true;
        toast('Landing page created.');
      }
      baseline = JSON.stringify({ form, blocks, featuredTourIds });
      await loadRows(true);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Unable to save the landing page.', 'error');
    } finally {
      saving = false;
    }
  };

  const openDelete = (row: MarketPage) => {
    toDelete = row;
    confirmOpen = true;
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    deleting = true;
    try {
      await api.marketPages.remove(toDelete.id);
      toast('Landing page deleted.');
      if (editingId === toDelete.id) {
        view = 'list';
        editingId = null;
        fill(null);
      }
      confirmOpen = false;
      toDelete = null;
      await loadRows(true);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Unable to delete the landing page.', 'error');
    } finally {
      deleting = false;
    }
  };

  onMount(loadRows);
</script>

<ToastStack {toasts} on:dismiss={dismissToast} />

{#if view === 'list'}
  <div class="mx-auto grid w-full max-w-[1500px] gap-6">
    <AdminPageHeader
      eyebrow="Growth"
      title="Market landing pages"
      description="Google Ads landing pages built from one template — e.g. “Tanzania Safari from Dubai”. Each page renders at its own /safaris/... URL, so a new market needs no code deploy."
      actionLabel="New landing page"
      actionIcon={Plus}
      on:action={openCreate}
    />

    <AdminToolbar className="grid gap-3 md:grid-cols-[1fr_190px_auto] md:items-end">
      <label class="grid gap-1.5">
        <span class="text-[13px] font-semibold text-ink/65">Search</span>
        <span class="flex h-11 items-center gap-2 rounded-md border border-ink/15 bg-black/[0.02] px-3.5 transition focus-within:border-forest focus-within:bg-surface focus-within:ring-2 focus-within:ring-forest/20">
          <Search size={16} class="text-ink/45" />
          <input class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink/35" bind:value={search} placeholder="Name, slug or market code..." />
        </span>
      </label>
      <AdminSelect label="Status" name="status_filter" bind:value={statusFilter} options={[{ label: 'All statuses', value: 'all' }, ...statusOptions]} />
      <AdminButton variant="secondary" on:click={() => loadRows()}>Refresh</AdminButton>
    </AdminToolbar>

    {#if loading}
      <LoadingState message="Loading market landing pages..." />
    {:else if error}
      <ErrorState message={error} />
    {:else if rows.length === 0}
      <AdminEmptyState
        title="No market landing pages yet"
        message="Create one page per market you advertise in. Keep it as a draft with noindex on until it has genuinely market-specific content."
        actionLabel="New landing page"
        icon={Globe}
        on:action={openCreate}
      />
    {:else if filteredRows.length === 0}
      <AdminEmptyState title="Nothing matches that filter" message="Try another search term or status." icon={Globe} />
    {:else}
      <div class="overflow-hidden rounded-none border border-ink/10 bg-surface shadow-[0_18px_50px_rgba(28,26,22,0.06)]">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[900px] text-sm">
            <thead class="bg-sand/70 text-xs uppercase tracking-[0.08em] text-ink/60">
              <tr>
                <th class="px-4 py-3 text-left font-semibold">Page</th>
                <th class="px-4 py-3 text-left font-semibold">Market</th>
                <th class="px-4 py-3 text-left font-semibold">Blocks</th>
                <th class="px-4 py-3 text-left font-semibold">Search engines</th>
                <th class="px-4 py-3 text-left font-semibold">Status</th>
                <th class="px-4 py-3 text-left font-semibold">Updated</th>
                <th class="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-ink/10">
              {#each filteredRows as row (row.id)}
                <tr class="transition hover:bg-sand/25">
                  <td class="px-4 py-4">
                    <div class="font-semibold text-ink">{row.name}</div>
                    <p class="mt-0.5 font-mono text-xs text-ink/50">/safaris/{row.slug}</p>
                  </td>
                  <td class="px-4 py-4 text-ink/60">
                    {row.market_code || '-'}
                  </td>
                  <td class="px-4 py-4 text-ink/60">{Array.isArray(row.sections) ? row.sections.length : '-'}</td>
                  <td class="px-4 py-4">
                    {#if row.noindex !== false}
                      <span class="inline-flex rounded-md bg-goldfinch-gold/15 px-2 py-0.5 text-xs font-semibold text-heading ring-1 ring-goldfinch-gold/25">noindex</span>
                    {:else}
                      <span class="inline-flex rounded-md bg-forest/10 px-2 py-0.5 text-xs font-semibold text-forest ring-1 ring-forest/20">indexable</span>
                    {/if}
                  </td>
                  <td class="px-4 py-4"><StatusBadge status={row.status ?? 'draft'} /></td>
                  <td class="px-4 py-4 text-ink/60">{fmtDate(row.updated_at ?? row.created_at)}</td>
                  <td class="px-4 py-4">
                    <div class="flex justify-end gap-2">
                      <a
                        class="inline-flex h-9 items-center gap-2 rounded-md border border-ink/15 bg-surface px-3 text-xs font-semibold text-ink shadow-sm transition hover:border-forest/30 hover:bg-black/[0.02]"
                        href={`/safaris/${row.slug}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink size={14} />View
                      </a>
                      <AdminButton size="sm" variant="secondary" on:click={() => openEdit(row)}><Edit size={14} />Edit</AdminButton>
                      <AdminButton size="sm" variant="danger" on:click={() => openDelete(row)}><Trash2 size={14} />Delete</AdminButton>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}
  </div>
{:else}
  <!-- ═══ editor ══════════════════════════════════════════════════════════ -->
  <div class="mx-auto grid w-full max-w-[1200px] gap-6">
    <AdminPageHeader
      eyebrow="Market landing page"
      title={form.name || 'New landing page'}
      description={form.slug ? `Renders at /safaris/${form.slug}` : 'One market, one page. Everything below is data — no deploy needed.'}
      secondaryLabel="Back to list"
      on:secondary={backToList}
    />

    <!-- ── page basics ─────────────────────────────────────────────────── -->
    <section class="rounded-none border border-ink/10 bg-surface p-5">
      <div class="border-b border-ink/10 pb-4">
        <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">Page basics</p>
        <p class="mt-0.5 text-xs text-ink/50">The name is only used in this admin list. The slug is the public URL.</p>
      </div>
      <div class="grid gap-4 pt-4">
        <div class="grid gap-4 sm:grid-cols-2">
          <AdminFormInput label="Name (admin label)" name="name" bind:value={form.name} placeholder="Dubai" required />
          <label class="grid gap-1.5">
            <span class="text-[13px] font-semibold text-ink/65">Slug (URL)</span>
            <input
              class="h-11 rounded-md border border-ink/15 bg-black/[0.02] px-3.5 font-mono text-sm text-ink outline-none transition placeholder:text-ink/35 hover:border-ink/25 focus:border-forest focus:bg-surface focus:ring-2 focus:ring-forest/20"
              name="slug"
              bind:value={form.slug}
              placeholder="tanzania-safari-from-dubai"
              on:input={() => (slugManuallyEdited = true)}
            />
          </label>
        </div>
        <div class="grid gap-4 sm:grid-cols-3">
          <div class="grid gap-1.5">
            <AdminFormInput label="Market code" name="market_code" bind:value={form.market_code} placeholder="AE" />
            <p class="text-xs leading-5 text-ink/55">
              ISO country code for the departure market — AE, GB, US, DE, IN. The indexability
              guard uses it to know which airports, holidays and place names count as
              market-specific, so it is worth setting.
            </p>
          </div>
          <AdminSelect label="Status" name="status" bind:value={form.status} options={statusOptions} />
          <AdminFormInput label="Sort order" name="sort_order" type="number" bind:value={form.sort_order} />
        </div>
        <p class="text-xs text-ink/50">
          Market code is the ISO country code you buy ads in (AE, GB, US). Currency is the three-letter code prices are shown in for this market.
        </p>
      </div>
    </section>

    <!-- ── hero ────────────────────────────────────────────────────────── -->
    <section class="rounded-none border border-ink/10 bg-surface p-5">
      <div class="border-b border-ink/10 pb-4">
        <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">Hero</p>
        <p class="mt-0.5 text-xs text-ink/50">The first screen. Anything left empty simply isn't rendered.</p>
      </div>
      <div class="grid gap-4 pt-4">
        <div class="grid gap-4 sm:grid-cols-2">
          <AdminFormInput label="Eyebrow" name="hero_eyebrow" bind:value={form.hero_eyebrow} placeholder="Departing from Dubai" />
          <AdminFormInput label="Title" name="hero_title" bind:value={form.hero_title} placeholder="Tanzania Safaris from Dubai" />
        </div>
        <AdminTextArea label="Subtitle" name="hero_subtitle" bind:value={form.hero_subtitle} rows={3} />
        <MediaPicker label="Hero image" uploadFolder="landing" bind:value={form.hero_image_url} />
        <div class="grid gap-4 sm:grid-cols-2">
          <AdminFormInput label="CTA label" name="hero_cta_label" bind:value={form.hero_cta_label} placeholder="Plan my safari" />
          <AdminFormInput label="CTA link" name="hero_cta_href" bind:value={form.hero_cta_href} placeholder="/plan-my-trip" />
        </div>
      </div>
    </section>

    <!-- ── block builder ───────────────────────────────────────────────── -->
    <section class="rounded-none border border-ink/10 bg-surface p-5">
      <div class="flex flex-wrap items-end justify-between gap-4 border-b border-ink/10 pb-4">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">Content blocks</p>
          <p class="mt-0.5 text-xs text-ink/50">The page renders these in order. Reorder or remove any block at any time.</p>
        </div>
        <div class="flex items-end gap-3">
          <div class="w-52">
            <AdminSelect label="Block type" name="new_block_type" bind:value={newBlockType} options={blockTypeOptions} />
          </div>
          <AdminButton variant="secondary" on:click={addBlock}><Plus size={15} /> Add block</AdminButton>
        </div>
      </div>

      <div class="grid gap-4 pt-4">
        {#if blocks.length === 0}
          <p class="border border-dashed border-ink/15 bg-sand/20 py-6 text-center text-sm text-ink/50">
            No blocks yet — pick a type above and add the first one.
          </p>
        {/if}

        {#each blocks as block, i}
          <article class="grid gap-4 border border-ink/10 bg-sand/25 p-4">
            <div class="flex flex-wrap items-start justify-between gap-3 border-b border-ink/10 pb-3">
              <div>
                <p class="text-xs font-bold uppercase tracking-[0.14em] text-ink/55">
                  {i + 1}. {BLOCK_LABELS[block.type] ?? (block.type || 'Unknown block')}
                </p>
                <p class="mt-0.5 text-xs text-ink/45">{BLOCK_HINTS[block.type] ?? 'This block type is not editable here — it is saved back unchanged.'}</p>
              </div>
              <div class="flex gap-1">
                <AdminButton size="sm" variant="ghost" ariaLabel="Move block up" on:click={() => moveBlock(i, -1)}><ArrowUp size={14} /></AdminButton>
                <AdminButton size="sm" variant="ghost" ariaLabel="Move block down" on:click={() => moveBlock(i, 1)}><ArrowDown size={14} /></AdminButton>
                <AdminButton size="sm" variant="danger" ariaLabel="Remove block" on:click={() => removeBlock(i)}><Trash2 size={14} /></AdminButton>
              </div>
            </div>

            {#if block.type === 'relevance'}
              <AdminFormInput label="Title" name={`b${i}_title`} bind:value={block.title} placeholder="Why Tanzania works from Dubai" />
              <AdminTextArea label="Intro" name={`b${i}_intro`} bind:value={block.intro} rows={3} />
              <div class="grid gap-3 border-t border-ink/10 pt-3">
                <div class="flex items-center justify-between">
                  <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">Facts</p>
                  <AdminButton size="sm" variant="secondary" on:click={() => addItem(i)}><Plus size={14} /> Add fact</AdminButton>
                </div>
                {#each block.items as item, j}
                  <div class="grid gap-3 border border-ink/10 bg-surface p-3 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end">
                    <AdminFormInput label="Label" name={`b${i}_i${j}_label`} bind:value={item.label} placeholder="Flight time" />
                    <AdminFormInput label="Value" name={`b${i}_i${j}_value`} bind:value={item.value} placeholder="5h 20m direct" />
                    <div class="flex gap-1 pb-1">
                      <AdminButton size="sm" variant="ghost" ariaLabel="Move up" on:click={() => moveItem(i, j, -1)}><ArrowUp size={14} /></AdminButton>
                      <AdminButton size="sm" variant="ghost" ariaLabel="Move down" on:click={() => moveItem(i, j, 1)}><ArrowDown size={14} /></AdminButton>
                      <AdminButton size="sm" variant="danger" ariaLabel="Remove fact" on:click={() => removeItem(i, j)}><Trash2 size={14} /></AdminButton>
                    </div>
                  </div>
                {/each}
              </div>

            {:else if block.type === 'benefits'}
              <AdminFormInput label="Title" name={`b${i}_title`} bind:value={block.title} />
              <div class="grid gap-3 border-t border-ink/10 pt-3">
                <div class="flex items-center justify-between">
                  <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">Benefits</p>
                  <AdminButton size="sm" variant="secondary" on:click={() => addItem(i)}><Plus size={14} /> Add benefit</AdminButton>
                </div>
                {#each block.items as item, j}
                  <div class="grid gap-3 border border-ink/10 bg-surface p-3">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-bold uppercase tracking-[0.14em] text-ink/50">{item.title || `Benefit ${j + 1}`}</span>
                      <div class="flex gap-1">
                        <AdminButton size="sm" variant="ghost" ariaLabel="Move up" on:click={() => moveItem(i, j, -1)}><ArrowUp size={14} /></AdminButton>
                        <AdminButton size="sm" variant="ghost" ariaLabel="Move down" on:click={() => moveItem(i, j, 1)}><ArrowDown size={14} /></AdminButton>
                        <AdminButton size="sm" variant="danger" ariaLabel="Remove benefit" on:click={() => removeItem(i, j)}><Trash2 size={14} /></AdminButton>
                      </div>
                    </div>
                    <AdminFormInput label="Heading" name={`b${i}_i${j}_title`} bind:value={item.title} />
                    <AdminTextArea label="Body" name={`b${i}_i${j}_body`} bind:value={item.body} rows={2} />
                  </div>
                {/each}
              </div>

            {:else if block.type === 'packages'}
              <div class="grid gap-4 sm:grid-cols-2">
                <AdminFormInput label="Eyebrow" name={`b${i}_eyebrow`} bind:value={block.eyebrow} placeholder="Our journeys" />
                <AdminFormInput label="Title" name={`b${i}_title`} bind:value={block.title} placeholder="Safaris that fit a Dubai departure" />
              </div>
              <AdminTextArea label="Intro" name={`b${i}_intro`} bind:value={block.intro} rows={2} />
              <div class="grid gap-3 border-t border-ink/10 pt-3">
                <div class="flex items-center justify-between">
                  <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">Tours</p>
                  <AdminButton size="sm" variant="secondary" on:click={() => addTourSlot(i)}><Plus size={14} /> Add tour</AdminButton>
                </div>
                {#each block.tour_ids as _tourId, j}
                  <div class="grid gap-3 border border-ink/10 bg-surface p-3">
                    <div class="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                      {#if tours.length}
                        <AdminSelect label={`Tour ${j + 1}`} name={`b${i}_tour_${j}`} bind:value={block.tour_ids[j]} options={tourOptions} />
                      {:else}
                        <AdminFormInput label={`Tour ${j + 1} (ID)`} name={`b${i}_tour_${j}`} bind:value={block.tour_ids[j]} placeholder="Tour UUID" />
                      {/if}
                      <div class="flex gap-1 pb-1">
                        <AdminButton size="sm" variant="ghost" ariaLabel="Move up" on:click={() => moveTourSlot(i, j, -1)}><ArrowUp size={14} /></AdminButton>
                        <AdminButton size="sm" variant="ghost" ariaLabel="Move down" on:click={() => moveTourSlot(i, j, 1)}><ArrowDown size={14} /></AdminButton>
                        <AdminButton size="sm" variant="danger" ariaLabel="Remove tour" on:click={() => removeTourSlot(i, j)}><Trash2 size={14} /></AdminButton>
                      </div>
                    </div>

                    <!-- Per-package copy the tours schema cannot hold. Every box
                         is optional: blank falls back to the tour's own data, so
                         nothing here is ever invented on the visitor's behalf. -->
                    {#if block.override_rows[j]}
                      <details class="border border-dashed border-ink/15">
                        <summary class="cursor-pointer list-none px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">
                          Card details for this package (optional)
                        </summary>
                        <div class="grid gap-3 border-t border-dashed border-ink/15 p-3">
                          <div class="grid gap-3 sm:grid-cols-2">
                            <AdminFormInput label="Kicker label" name={`b${i}_tour_${j}_kicker`} bind:value={block.override_rows[j].kicker} placeholder="e.g. Short Escape" />
                            <AdminFormInput label="Best for" name={`b${i}_tour_${j}_bestfor`} bind:value={block.override_rows[j].best_for} placeholder="e.g. First-time visitors with limited time" />
                          </div>
                          <AdminTextArea
                            label="Route stops — one per line"
                            name={`b${i}_tour_${j}_route`}
                            bind:value={block.override_rows[j].route_stops}
                            rows={4}
                          />
                          <p class="-mt-1 text-xs text-ink/55">
                            Shown as the route line on the card, and as a “Parks” row in the comparison table. Leave empty to use the tour's own
                            start and end points.
                          </p>
                          <div class="grid gap-3 sm:grid-cols-2">
                            <AdminFormInput label="Safari nights" name={`b${i}_tour_${j}_safnights`} type="number" bind:value={block.override_rows[j].safari_nights} />
                            <AdminFormInput label="Zanzibar nights" name={`b${i}_tour_${j}_zannights`} type="number" bind:value={block.override_rows[j].zanzibar_nights} />
                          </div>
                          <MediaPicker label="Card image (optional)" uploadFolder="landing" bind:value={block.override_rows[j].image_url} />
                          <p class="-mt-1 text-xs text-ink/55">Leave empty to use the tour's own photo.</p>
                          <div class="grid gap-3 sm:grid-cols-2">
                            <AdminFormInput label="Button label" name={`b${i}_tour_${j}_ctalabel`} bind:value={block.override_rows[j].cta_label} placeholder="View This Journey" />
                            <AdminFormInput label="Button link" name={`b${i}_tour_${j}_ctahref`} bind:value={block.override_rows[j].cta_href} placeholder="Defaults to the tour page" />
                          </div>
                        </div>
                      </details>
                    {/if}

                    <!-- Optional price grid. Blank means blank: the card keeps
                         showing the tour's own "from" price. (Every slot has a
                         row; the guard is belt-and-braces against odd data.) -->
                    {#if block.pax_rows[j]}
                    <div class="grid gap-2 border-t border-dashed border-ink/15 pt-3">
                      <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">Price per person by party size (optional)</p>
                      <p class="text-xs leading-5 text-ink/55">
                        Only fill these in with real, quoted figures — they are shown to visitors exactly as typed. Leave every box
                        empty and this card simply shows the tour's normal “from” price instead.
                      </p>
                      <div class="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
                        {#each PAX_SIZES as pax, p}
                          <AdminFormInput
                            label={`${pax} guests`}
                            name={`b${i}_tour_${j}_pax_${pax}`}
                            type="number"
                            bind:value={block.pax_rows[j][p]}
                            placeholder=""
                          />
                        {/each}
                      </div>
                    </div>
                    {/if}
                  </div>
                {/each}

                {#if block.tour_ids.filter(Boolean).length}
                  <div class="grid gap-2 border border-ink/10 bg-surface p-3">
                    <AdminSelect
                      label="Flagship tour (highlighted card)"
                      name={`b${i}_flagship`}
                      bind:value={block.flagship_tour_id}
                      options={flagshipOptions(block, tours)}
                    />
                    <p class="text-xs text-ink/55">The flagship card gets the gold border. Leave it on “No flagship” to treat every tour equally.</p>
                  </div>
                {/if}
              </div>

            {:else if block.type === 'comparison'}
              <AdminFormInput label="Title" name={`b${i}_title`} bind:value={block.title} />
              <div class="grid gap-3 border-t border-ink/10 pt-3">
                <div class="flex items-center justify-between">
                  <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">Columns</p>
                  <AdminButton size="sm" variant="secondary" on:click={() => addColumn(i)}><Plus size={14} /> Add column</AdminButton>
                </div>
                <div class="grid gap-3 sm:grid-cols-2">
                  {#each block.columns as _column, c}
                    <div class="grid gap-3 border border-ink/10 bg-surface p-3 sm:grid-cols-[1fr_auto] sm:items-end">
                      <AdminFormInput label={`Column ${c + 1}`} name={`b${i}_col_${c}`} bind:value={block.columns[c]} placeholder="Emnel" />
                      <div class="pb-1">
                        <AdminButton size="sm" variant="danger" ariaLabel="Remove column" on:click={() => removeColumn(i, c)}><Trash2 size={14} /></AdminButton>
                      </div>
                    </div>
                  {/each}
                </div>

                <div class="mt-1 flex items-center justify-between">
                  <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">Rows</p>
                  <AdminButton size="sm" variant="secondary" on:click={() => addRow(i)}><Plus size={14} /> Add row</AdminButton>
                </div>
                {#each block.rows as row, r}
                  <div class="grid gap-3 border border-ink/10 bg-surface p-3">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-bold uppercase tracking-[0.14em] text-ink/50">{row.label || `Row ${r + 1}`}</span>
                      <div class="flex gap-1">
                        <AdminButton size="sm" variant="ghost" ariaLabel="Move up" on:click={() => moveRow(i, r, -1)}><ArrowUp size={14} /></AdminButton>
                        <AdminButton size="sm" variant="ghost" ariaLabel="Move down" on:click={() => moveRow(i, r, 1)}><ArrowDown size={14} /></AdminButton>
                        <AdminButton size="sm" variant="danger" ariaLabel="Remove row" on:click={() => removeRow(i, r)}><Trash2 size={14} /></AdminButton>
                      </div>
                    </div>
                    <AdminFormInput label="Row label" name={`b${i}_row_${r}_label`} bind:value={row.label} placeholder="Park fees" />
                    <div class="grid gap-3 sm:grid-cols-2">
                      {#each block.columns as _column, c}
                        <AdminFormInput
                          label={block.columns[c] || `Column ${c + 1}`}
                          name={`b${i}_row_${r}_cell_${c}`}
                          bind:value={row.cells[c]}
                        />
                      {/each}
                    </div>
                  </div>
                {/each}

                <!-- With no rows typed above, the table is built from the tour
                     records themselves — only from fields they actually store. -->
                <div class="mt-1 flex items-center justify-between">
                  <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">Or compare these tours</p>
                  <AdminButton size="sm" variant="secondary" on:click={() => addString(i, 'tour_ids')}><Plus size={14} /> Add tour</AdminButton>
                </div>
                <p class="text-xs leading-5 text-ink/55">
                  Leave the rows above empty and the table is generated from these tours — duration, nights, comfort level, group
                  size and “from” price, using whatever each tour actually has. Pick no tours here and it uses the page's featured
                  tours. Nothing is invented: a detail the tours don't store gets no row.
                </p>
                {#each block.tour_ids as _tourId, j}
                  <div class="grid gap-3 border border-ink/10 bg-surface p-3 sm:grid-cols-[1fr_auto] sm:items-end">
                    {#if tours.length}
                      <AdminSelect label={`Tour ${j + 1}`} name={`b${i}_cmp_tour_${j}`} bind:value={block.tour_ids[j]} options={tourOptions} />
                    {:else}
                      <AdminFormInput label={`Tour ${j + 1} (ID)`} name={`b${i}_cmp_tour_${j}`} bind:value={block.tour_ids[j]} placeholder="Tour UUID" />
                    {/if}
                    <div class="flex gap-1 pb-1">
                      <AdminButton size="sm" variant="ghost" ariaLabel="Move up" on:click={() => moveString(i, 'tour_ids', j, -1)}><ArrowUp size={14} /></AdminButton>
                      <AdminButton size="sm" variant="ghost" ariaLabel="Move down" on:click={() => moveString(i, 'tour_ids', j, 1)}><ArrowDown size={14} /></AdminButton>
                      <AdminButton size="sm" variant="danger" ariaLabel="Remove tour" on:click={() => removeString(i, 'tour_ids', j)}><Trash2 size={14} /></AdminButton>
                    </div>
                  </div>
                {/each}
              </div>

            {:else if block.type === 'inclusions'}
              <AdminFormInput label="Title" name={`b${i}_title`} bind:value={block.title} />
              <div class="grid gap-4 border-t border-ink/10 pt-3 lg:grid-cols-2">
                <div class="grid content-start gap-3">
                  <div class="flex items-center justify-between">
                    <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">Included</p>
                    <AdminButton size="sm" variant="secondary" on:click={() => addString(i, 'included')}><Plus size={14} /> Add</AdminButton>
                  </div>
                  {#each block.included as _line, j}
                    <div class="grid gap-3 border border-ink/10 bg-surface p-3 sm:grid-cols-[1fr_auto] sm:items-end">
                      <AdminFormInput label={`Item ${j + 1}`} name={`b${i}_inc_${j}`} bind:value={block.included[j]} />
                      <div class="flex gap-1 pb-1">
                        <AdminButton size="sm" variant="ghost" ariaLabel="Move up" on:click={() => moveString(i, 'included', j, -1)}><ArrowUp size={14} /></AdminButton>
                        <AdminButton size="sm" variant="ghost" ariaLabel="Move down" on:click={() => moveString(i, 'included', j, 1)}><ArrowDown size={14} /></AdminButton>
                        <AdminButton size="sm" variant="danger" ariaLabel="Remove item" on:click={() => removeString(i, 'included', j)}><Trash2 size={14} /></AdminButton>
                      </div>
                    </div>
                  {/each}
                </div>
                <div class="grid content-start gap-3">
                  <div class="flex items-center justify-between">
                    <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">Excluded</p>
                    <AdminButton size="sm" variant="secondary" on:click={() => addString(i, 'excluded')}><Plus size={14} /> Add</AdminButton>
                  </div>
                  {#each block.excluded as _line, j}
                    <div class="grid gap-3 border border-ink/10 bg-surface p-3 sm:grid-cols-[1fr_auto] sm:items-end">
                      <AdminFormInput label={`Item ${j + 1}`} name={`b${i}_exc_${j}`} bind:value={block.excluded[j]} />
                      <div class="flex gap-1 pb-1">
                        <AdminButton size="sm" variant="ghost" ariaLabel="Move up" on:click={() => moveString(i, 'excluded', j, -1)}><ArrowUp size={14} /></AdminButton>
                        <AdminButton size="sm" variant="ghost" ariaLabel="Move down" on:click={() => moveString(i, 'excluded', j, 1)}><ArrowDown size={14} /></AdminButton>
                        <AdminButton size="sm" variant="danger" ariaLabel="Remove item" on:click={() => removeString(i, 'excluded', j)}><Trash2 size={14} /></AdminButton>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>

            {:else if block.type === 'prose'}
              <AdminFormInput label="Title" name={`b${i}_title`} bind:value={block.title} />
              <AdminTextArea label="Body — leave a blank line between paragraphs" name={`b${i}_body`} bind:value={block.body} rows={8} />

            {:else if block.type === 'faq'}
              <AdminFormInput label="Title" name={`b${i}_title`} bind:value={block.title} placeholder="Questions from travellers in the UAE" />
              <div class="grid gap-3 border-t border-ink/10 pt-3">
                <div class="flex items-center justify-between">
                  <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">Questions</p>
                  <AdminButton size="sm" variant="secondary" on:click={() => addItem(i)}><Plus size={14} /> Add question</AdminButton>
                </div>
                {#each block.items as item, j}
                  <div class="grid gap-3 border border-ink/10 bg-surface p-3">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-bold uppercase tracking-[0.14em] text-ink/50">{item.question || `Question ${j + 1}`}</span>
                      <div class="flex gap-1">
                        <AdminButton size="sm" variant="ghost" ariaLabel="Move up" on:click={() => moveItem(i, j, -1)}><ArrowUp size={14} /></AdminButton>
                        <AdminButton size="sm" variant="ghost" ariaLabel="Move down" on:click={() => moveItem(i, j, 1)}><ArrowDown size={14} /></AdminButton>
                        <AdminButton size="sm" variant="danger" ariaLabel="Remove question" on:click={() => removeItem(i, j)}><Trash2 size={14} /></AdminButton>
                      </div>
                    </div>
                    <AdminFormInput label="Question" name={`b${i}_i${j}_q`} bind:value={item.question} />
                    <AdminTextArea label="Answer" name={`b${i}_i${j}_a`} bind:value={item.answer} rows={3} />
                  </div>
                {/each}
              </div>

            {:else if block.type === 'reviews'}
              <AdminFormInput label="Title" name={`b${i}_title`} bind:value={block.title} placeholder="What our guests say" />
              <p class="text-xs text-ink/50">Reviews come from the published testimonials on the site — nothing is entered here.</p>

            {:else if block.type === 'cta'}
              <div class="grid gap-4 sm:grid-cols-2">
                <AdminFormInput label="Title" name={`b${i}_title`} bind:value={block.title} />
                <AdminFormInput label="Subtitle" name={`b${i}_subtitle`} bind:value={block.subtitle} />
              </div>
              <div class="grid gap-4 sm:grid-cols-2">
                <AdminFormInput label="Button label" name={`b${i}_label`} bind:value={block.label} placeholder="Plan my safari" />
                <AdminFormInput label="Button link" name={`b${i}_href`} bind:value={block.href} placeholder="/plan-my-trip" />
              </div>
              <div class="grid gap-3 border-t border-ink/10 pt-3">
                <div class="flex items-center justify-between">
                  <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">Reassurance points</p>
                  <AdminButton size="sm" variant="secondary" on:click={() => addString(i, 'points')}><Plus size={14} /> Add point</AdminButton>
                </div>
                {#each block.points as _point, j}
                  <div class="grid gap-3 border border-ink/10 bg-surface p-3 sm:grid-cols-[1fr_auto] sm:items-end">
                    <AdminFormInput label={`Point ${j + 1}`} name={`b${i}_pt_${j}`} bind:value={block.points[j]} />
                    <div class="flex gap-1 pb-1">
                      <AdminButton size="sm" variant="ghost" ariaLabel="Move up" on:click={() => moveString(i, 'points', j, -1)}><ArrowUp size={14} /></AdminButton>
                      <AdminButton size="sm" variant="ghost" ariaLabel="Move down" on:click={() => moveString(i, 'points', j, 1)}><ArrowDown size={14} /></AdminButton>
                      <AdminButton size="sm" variant="danger" ariaLabel="Remove point" on:click={() => removeString(i, 'points', j)}><Trash2 size={14} /></AdminButton>
                    </div>
                  </div>
                {/each}
              </div>

            {:else if block.type === 'trust'}
              <p class="text-xs text-ink/55">
                One short line each — the guarantees you can actually stand behind. An empty label is dropped.
              </p>
              <div class="grid gap-3 border-t border-ink/10 pt-3">
                <div class="flex items-center justify-between">
                  <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">Labels</p>
                  <AdminButton size="sm" variant="secondary" on:click={() => addItem(i)}><Plus size={14} /> Add label</AdminButton>
                </div>
                {#each block.items as item, j}
                  <div class="grid gap-3 border border-ink/10 bg-surface p-3 sm:grid-cols-[1fr_auto] sm:items-end">
                    <AdminFormInput label={`Label ${j + 1}`} name={`b${i}_i${j}_label`} bind:value={item.label} placeholder="Licensed Tanzanian operator" />
                    <div class="flex gap-1 pb-1">
                      <AdminButton size="sm" variant="ghost" ariaLabel="Move up" on:click={() => moveItem(i, j, -1)}><ArrowUp size={14} /></AdminButton>
                      <AdminButton size="sm" variant="ghost" ariaLabel="Move down" on:click={() => moveItem(i, j, 1)}><ArrowDown size={14} /></AdminButton>
                      <AdminButton size="sm" variant="danger" ariaLabel="Remove label" on:click={() => removeItem(i, j)}><Trash2 size={14} /></AdminButton>
                    </div>
                  </div>
                {/each}
              </div>

            {:else if block.type === 'numbered'}
              <div class="grid gap-4 sm:grid-cols-[1fr_1fr_160px]">
                <AdminFormInput label="Eyebrow" name={`b${i}_eyebrow`} bind:value={block.eyebrow} placeholder="Why us" />
                <AdminFormInput label="Title" name={`b${i}_title`} bind:value={block.title} />
                <AdminSelect
                  label="Columns"
                  name={`b${i}_columns`}
                  bind:value={block.column_count}
                  options={[{ label: '2 across', value: '2' }, { label: '3 across', value: '3' }, { label: '4 across', value: '4' }]}
                />
              </div>
              <div class="grid gap-3 border-t border-ink/10 pt-3">
                <div class="flex items-center justify-between">
                  <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">Points</p>
                  <AdminButton size="sm" variant="secondary" on:click={() => addItem(i)}><Plus size={14} /> Add point</AdminButton>
                </div>
                {#each block.items as item, j}
                  <div class="grid gap-3 border border-ink/10 bg-surface p-3">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-bold uppercase tracking-[0.14em] text-ink/50">{item.title || `Point ${j + 1}`}</span>
                      <div class="flex gap-1">
                        <AdminButton size="sm" variant="ghost" ariaLabel="Move up" on:click={() => moveItem(i, j, -1)}><ArrowUp size={14} /></AdminButton>
                        <AdminButton size="sm" variant="ghost" ariaLabel="Move down" on:click={() => moveItem(i, j, 1)}><ArrowDown size={14} /></AdminButton>
                        <AdminButton size="sm" variant="danger" ariaLabel="Remove point" on:click={() => removeItem(i, j)}><Trash2 size={14} /></AdminButton>
                      </div>
                    </div>
                    <AdminFormInput label="Heading" name={`b${i}_i${j}_title`} bind:value={item.title} />
                    <AdminTextArea label="Body" name={`b${i}_i${j}_body`} bind:value={item.body} rows={2} />
                  </div>
                {/each}
              </div>

            {:else if block.type === 'route'}
              <div class="grid gap-4 sm:grid-cols-2">
                <AdminFormInput label="Eyebrow" name={`b${i}_eyebrow`} bind:value={block.eyebrow} placeholder="The route" />
                <AdminFormInput label="Title" name={`b${i}_title`} bind:value={block.title} />
              </div>
              <AdminTextArea label="Intro" name={`b${i}_intro`} bind:value={block.intro} rows={2} />
              <div class="grid gap-3 border-t border-ink/10 pt-3">
                <div class="flex items-center justify-between">
                  <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">Stops (in order)</p>
                  <AdminButton size="sm" variant="secondary" on:click={() => addString(i, 'stops')}><Plus size={14} /> Add stop</AdminButton>
                </div>
                {#each block.stops as _stop, j}
                  <div class="grid gap-3 border border-ink/10 bg-surface p-3 sm:grid-cols-[1fr_auto] sm:items-end">
                    <AdminFormInput label={`Stop ${j + 1}`} name={`b${i}_stop_${j}`} bind:value={block.stops[j]} placeholder="Arusha" />
                    <div class="flex gap-1 pb-1">
                      <AdminButton size="sm" variant="ghost" ariaLabel="Move up" on:click={() => moveString(i, 'stops', j, -1)}><ArrowUp size={14} /></AdminButton>
                      <AdminButton size="sm" variant="ghost" ariaLabel="Move down" on:click={() => moveString(i, 'stops', j, 1)}><ArrowDown size={14} /></AdminButton>
                      <AdminButton size="sm" variant="danger" ariaLabel="Remove stop" on:click={() => removeString(i, 'stops', j)}><Trash2 size={14} /></AdminButton>
                    </div>
                  </div>
                {/each}

                <div class="mt-1 flex items-center justify-between">
                  <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">Notes (optional)</p>
                  <AdminButton size="sm" variant="secondary" on:click={() => addItem(i)}><Plus size={14} /> Add note</AdminButton>
                </div>
                {#each block.items as item, j}
                  <div class="grid gap-3 border border-ink/10 bg-surface p-3">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-bold uppercase tracking-[0.14em] text-ink/50">{item.title || `Note ${j + 1}`}</span>
                      <div class="flex gap-1">
                        <AdminButton size="sm" variant="ghost" ariaLabel="Move up" on:click={() => moveItem(i, j, -1)}><ArrowUp size={14} /></AdminButton>
                        <AdminButton size="sm" variant="ghost" ariaLabel="Move down" on:click={() => moveItem(i, j, 1)}><ArrowDown size={14} /></AdminButton>
                        <AdminButton size="sm" variant="danger" ariaLabel="Remove note" on:click={() => removeItem(i, j)}><Trash2 size={14} /></AdminButton>
                      </div>
                    </div>
                    <AdminFormInput label="Heading" name={`b${i}_i${j}_title`} bind:value={item.title} />
                    <AdminTextArea label="Body" name={`b${i}_i${j}_body`} bind:value={item.body} rows={2} />
                  </div>
                {/each}
              </div>

            {:else if block.type === 'tiers'}
              <div class="grid gap-4 sm:grid-cols-2">
                <AdminFormInput label="Eyebrow" name={`b${i}_eyebrow`} bind:value={block.eyebrow} placeholder="Comfort levels" />
                <AdminFormInput label="Title" name={`b${i}_title`} bind:value={block.title} />
              </div>
              <AdminTextArea label="Intro" name={`b${i}_intro`} bind:value={block.intro} rows={2} />
              <div class="grid gap-3 border-t border-ink/10 pt-3">
                <div class="flex items-center justify-between">
                  <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">Tiers</p>
                  <AdminButton size="sm" variant="secondary" on:click={() => addItem(i)}><Plus size={14} /> Add tier</AdminButton>
                </div>
                {#each block.items as item, j}
                  <div class="grid gap-3 border border-ink/10 bg-surface p-3">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-bold uppercase tracking-[0.14em] text-ink/50">{item.title || item.label || `Tier ${j + 1}`}</span>
                      <div class="flex gap-1">
                        <AdminButton size="sm" variant="ghost" ariaLabel="Move up" on:click={() => moveItem(i, j, -1)}><ArrowUp size={14} /></AdminButton>
                        <AdminButton size="sm" variant="ghost" ariaLabel="Move down" on:click={() => moveItem(i, j, 1)}><ArrowDown size={14} /></AdminButton>
                        <AdminButton size="sm" variant="danger" ariaLabel="Remove tier" on:click={() => removeItem(i, j)}><Trash2 size={14} /></AdminButton>
                      </div>
                    </div>
                    <div class="grid gap-3 sm:grid-cols-2">
                      <AdminFormInput label="Label" name={`b${i}_i${j}_label`} bind:value={item.label} placeholder="Classic" />
                      <AdminFormInput label="Heading" name={`b${i}_i${j}_title`} bind:value={item.title} />
                    </div>
                    <AdminTextArea label="Body" name={`b${i}_i${j}_body`} bind:value={item.body} rows={2} />
                    <MediaPicker label="Image (optional)" uploadFolder="landing" bind:value={item.image_url} />
                  </div>
                {/each}
              </div>

            {:else if block.type === 'panels'}
              <div class="grid gap-4 sm:grid-cols-2">
                <AdminFormInput label="Eyebrow" name={`b${i}_eyebrow`} bind:value={block.eyebrow} />
                <AdminFormInput label="Title" name={`b${i}_title`} bind:value={block.title} />
              </div>
              <div class="grid gap-3 border-t border-ink/10 pt-3">
                <div class="flex items-center justify-between">
                  <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">Panels</p>
                  <AdminButton size="sm" variant="secondary" on:click={() => addItem(i)}><Plus size={14} /> Add panel</AdminButton>
                </div>
                {#each block.items as item, j}
                  <div class="grid gap-3 border border-ink/10 bg-surface p-3">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-bold uppercase tracking-[0.14em] text-ink/50">{item.title || `Panel ${j + 1}`}</span>
                      <div class="flex gap-1">
                        <AdminButton size="sm" variant="ghost" ariaLabel="Move up" on:click={() => moveItem(i, j, -1)}><ArrowUp size={14} /></AdminButton>
                        <AdminButton size="sm" variant="ghost" ariaLabel="Move down" on:click={() => moveItem(i, j, 1)}><ArrowDown size={14} /></AdminButton>
                        <AdminButton size="sm" variant="danger" ariaLabel="Remove panel" on:click={() => removeItem(i, j)}><Trash2 size={14} /></AdminButton>
                      </div>
                    </div>
                    <AdminFormInput label="Panel heading" name={`b${i}_i${j}_title`} bind:value={item.title} />
                    <div class="grid gap-2">
                      <div class="flex items-center justify-between">
                        <span class="text-[13px] font-semibold text-ink/65">Lines</span>
                        <AdminButton size="sm" variant="secondary" on:click={() => addLine(i, j)}><Plus size={14} /> Add line</AdminButton>
                      </div>
                      {#each item.lines as _line, k}
                        <div class="grid gap-3 border border-ink/10 bg-sand/25 p-3 sm:grid-cols-[1fr_auto] sm:items-end">
                          <AdminFormInput label={`Line ${k + 1}`} name={`b${i}_i${j}_line_${k}`} bind:value={item.lines[k]} />
                          <div class="flex gap-1 pb-1">
                            <AdminButton size="sm" variant="ghost" ariaLabel="Move up" on:click={() => moveLine(i, j, k, -1)}><ArrowUp size={14} /></AdminButton>
                            <AdminButton size="sm" variant="ghost" ariaLabel="Move down" on:click={() => moveLine(i, j, k, 1)}><ArrowDown size={14} /></AdminButton>
                            <AdminButton size="sm" variant="danger" ariaLabel="Remove line" on:click={() => removeLine(i, j, k)}><Trash2 size={14} /></AdminButton>
                          </div>
                        </div>
                      {/each}
                    </div>
                    <MediaPicker label="Panel image (optional)" uploadFolder="landing" bind:value={item.image_url} />
                  </div>
                {/each}
              </div>

            {:else if block.type === 'imagegrid'}
              <div class="grid gap-4 sm:grid-cols-2">
                <AdminFormInput label="Eyebrow" name={`b${i}_eyebrow`} bind:value={block.eyebrow} />
                <AdminFormInput label="Title" name={`b${i}_title`} bind:value={block.title} />
              </div>
              <div class="grid gap-3 border-t border-ink/10 pt-3">
                <div class="flex items-center justify-between">
                  <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">Images</p>
                  <AdminButton size="sm" variant="secondary" on:click={() => addItem(i)}><Plus size={14} /> Add image</AdminButton>
                </div>
                <p class="text-xs text-ink/55">A tile with no image is not shown — captions never appear on their own.</p>
                {#each block.items as item, j}
                  <div class="grid gap-3 border border-ink/10 bg-surface p-3">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-bold uppercase tracking-[0.14em] text-ink/50">{item.caption || `Image ${j + 1}`}</span>
                      <div class="flex gap-1">
                        <AdminButton size="sm" variant="ghost" ariaLabel="Move up" on:click={() => moveItem(i, j, -1)}><ArrowUp size={14} /></AdminButton>
                        <AdminButton size="sm" variant="ghost" ariaLabel="Move down" on:click={() => moveItem(i, j, 1)}><ArrowDown size={14} /></AdminButton>
                        <AdminButton size="sm" variant="danger" ariaLabel="Remove image" on:click={() => removeItem(i, j)}><Trash2 size={14} /></AdminButton>
                      </div>
                    </div>
                    <MediaPicker label="Image" uploadFolder="landing" bind:value={item.image_url} />
                    <AdminFormInput label="Caption (optional)" name={`b${i}_i${j}_caption`} bind:value={item.caption} />
                  </div>
                {/each}
              </div>

            {:else if block.type === 'steps'}
              <div class="grid gap-4 sm:grid-cols-2">
                <AdminFormInput label="Eyebrow" name={`b${i}_eyebrow`} bind:value={block.eyebrow} placeholder="How it works" />
                <AdminFormInput label="Title" name={`b${i}_title`} bind:value={block.title} />
              </div>
              <div class="grid gap-3 border-t border-ink/10 pt-3">
                <div class="flex items-center justify-between">
                  <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">Steps</p>
                  <AdminButton size="sm" variant="secondary" on:click={() => addItem(i)}><Plus size={14} /> Add step</AdminButton>
                </div>
                {#each block.items as item, j}
                  <div class="grid gap-3 border border-ink/10 bg-surface p-3">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-bold uppercase tracking-[0.14em] text-ink/50">{item.title || `Step ${j + 1}`}</span>
                      <div class="flex gap-1">
                        <AdminButton size="sm" variant="ghost" ariaLabel="Move up" on:click={() => moveItem(i, j, -1)}><ArrowUp size={14} /></AdminButton>
                        <AdminButton size="sm" variant="ghost" ariaLabel="Move down" on:click={() => moveItem(i, j, 1)}><ArrowDown size={14} /></AdminButton>
                        <AdminButton size="sm" variant="danger" ariaLabel="Remove step" on:click={() => removeItem(i, j)}><Trash2 size={14} /></AdminButton>
                      </div>
                    </div>
                    <AdminFormInput label="Heading" name={`b${i}_i${j}_title`} bind:value={item.title} />
                    <AdminTextArea label="Body" name={`b${i}_i${j}_body`} bind:value={item.body} rows={2} />
                  </div>
                {/each}
                <div class="grid gap-4 border-t border-ink/10 pt-3 sm:grid-cols-2">
                  <AdminFormInput label="Button label (optional)" name={`b${i}_cta_label`} bind:value={block.cta_label} placeholder="Plan my safari" />
                  <AdminFormInput label="Button link (optional)" name={`b${i}_cta_href`} bind:value={block.cta_href} placeholder="/plan-my-trip" />
                </div>
                <p class="text-xs text-ink/55">The button only appears when both a label and a link are set.</p>
              </div>

            {:else if block.type === 'season'}
              <div class="grid gap-4 sm:grid-cols-2">
                <AdminFormInput label="Eyebrow" name={`b${i}_eyebrow`} bind:value={block.eyebrow} placeholder="When to go" />
                <AdminFormInput label="Title" name={`b${i}_title`} bind:value={block.title} />
              </div>
              <AdminTextArea label="Intro" name={`b${i}_intro`} bind:value={block.intro} rows={2} />
              <div class="grid gap-3 border-t border-ink/10 pt-3">
                <div class="flex items-center justify-between">
                  <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">Seasons</p>
                  <AdminButton size="sm" variant="secondary" on:click={() => addItem(i)}><Plus size={14} /> Add season</AdminButton>
                </div>
                {#each block.items as item, j}
                  <div class="grid gap-3 border border-ink/10 bg-surface p-3">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-bold uppercase tracking-[0.14em] text-ink/50">{item.months || item.label || `Season ${j + 1}`}</span>
                      <div class="flex gap-1">
                        <AdminButton size="sm" variant="ghost" ariaLabel="Move up" on:click={() => moveItem(i, j, -1)}><ArrowUp size={14} /></AdminButton>
                        <AdminButton size="sm" variant="ghost" ariaLabel="Move down" on:click={() => moveItem(i, j, 1)}><ArrowDown size={14} /></AdminButton>
                        <AdminButton size="sm" variant="danger" ariaLabel="Remove season" on:click={() => removeItem(i, j)}><Trash2 size={14} /></AdminButton>
                      </div>
                    </div>
                    <div class="grid gap-3 sm:grid-cols-2">
                      <AdminFormInput label="Months" name={`b${i}_i${j}_months`} bind:value={item.months} placeholder="Jun – Oct" />
                      <AdminFormInput label="Label" name={`b${i}_i${j}_label`} bind:value={item.label} placeholder="Dry season" />
                    </div>
                    <AdminTextArea label="Detail" name={`b${i}_i${j}_body`} bind:value={item.body} rows={2} />
                  </div>
                {/each}
                <AdminTextArea label="Footnote (optional)" name={`b${i}_note`} bind:value={block.note} rows={2} />
              </div>

            {:else}
              <p class="border border-dashed border-ink/15 bg-surface p-3 text-xs text-ink/55">
                Block type <span class="font-mono">{block.type || 'unknown'}</span> isn't editable in this release. It is saved back exactly as it is — reorder or remove it above.
              </p>
            {/if}
          </article>
        {/each}
      </div>
    </section>

    <!-- ── featured tours ──────────────────────────────────────────────── -->
    <section class="rounded-none border border-ink/10 bg-surface p-5">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 pb-4">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">Featured tours</p>
          <p class="mt-0.5 text-xs text-ink/50">Page-level tour shortlist, used where the template needs one outside a packages block.</p>
        </div>
        <AdminButton size="sm" variant="secondary" on:click={addFeaturedTour}><Plus size={14} /> Add tour</AdminButton>
      </div>
      <div class="grid gap-3 pt-4">
        {#if featuredTourIds.length === 0}
          <p class="border border-dashed border-ink/15 bg-sand/20 py-5 text-center text-sm text-ink/50">No featured tours — the page falls back to whatever the template shows by default.</p>
        {/if}
        {#each featuredTourIds as _tourId, i}
          <div class="grid gap-3 border border-ink/10 bg-sand/25 p-3 sm:grid-cols-[1fr_auto] sm:items-end">
            {#if tours.length}
              <AdminSelect label={`Tour ${i + 1}`} name={`ft_${i}`} bind:value={featuredTourIds[i]} options={tourOptions} />
            {:else}
              <AdminFormInput label={`Tour ${i + 1} (ID)`} name={`ft_${i}`} bind:value={featuredTourIds[i]} placeholder="Tour UUID" />
            {/if}
            <div class="flex gap-1 pb-1">
              <AdminButton size="sm" variant="ghost" ariaLabel="Move up" on:click={() => (featuredTourIds = move(featuredTourIds, i, -1))}><ArrowUp size={14} /></AdminButton>
              <AdminButton size="sm" variant="ghost" ariaLabel="Move down" on:click={() => (featuredTourIds = move(featuredTourIds, i, 1))}><ArrowDown size={14} /></AdminButton>
              <AdminButton size="sm" variant="danger" ariaLabel="Remove tour" on:click={() => removeFeaturedTour(i)}><Trash2 size={14} /></AdminButton>
            </div>
          </div>
        {/each}
      </div>
    </section>

    <!-- ── SEO & indexing ──────────────────────────────────────────────── -->
    <section class="rounded-none border border-ink/10 bg-surface p-5">
      <div class="border-b border-ink/10 pb-4">
        <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">SEO &amp; indexing</p>
        <p class="mt-0.5 text-xs text-ink/50">Ads traffic reaches this page whether or not Google indexes it.</p>
      </div>
      <div class="grid gap-4 pt-4">
        <AdminFormInput label="Meta title" name="meta_title" bind:value={form.meta_title} placeholder="Tanzania Safari from Dubai | Emnel Adventures" />
        <AdminTextArea label="Meta description" name="meta_description" bind:value={form.meta_description} rows={3} />
        <MediaPicker label="Social share image (og:image)" uploadFolder="landing" bind:value={form.og_image_url} />

        <div class={`grid gap-3 border p-4 ${form.noindex ? 'border-goldfinch-gold/40 bg-goldfinch-gold/10' : 'border-ink/15 bg-sand/25'}`}>
          <label class="flex cursor-pointer items-start gap-3">
            <input class="mt-0.5 h-4 w-4 accent-forest" type="checkbox" bind:checked={form.noindex} />
            <span>
              <span class="block text-sm font-semibold text-ink">
                Hide this page from search engines (noindex)
                <span class="ml-2 inline-flex rounded-md px-2 py-0.5 text-[11px] font-bold ring-1 {form.noindex ? 'bg-goldfinch-gold/20 text-heading ring-goldfinch-gold/30' : 'bg-forest/10 text-forest ring-forest/20'}">
                  {form.noindex ? 'ON — not indexed' : 'OFF — indexable'}
                </span>
              </span>
              <span class="mt-1 block text-xs leading-5 text-ink/60">
                Leave ON until this page has genuinely market-specific content (flights, visas, seasons). Near-duplicate pages
                across markets can be treated as doorway pages by Google.
              </span>
            </span>
          </label>
        </div>

        <!-- Differentiation assessment: only shown when the page is going indexable. -->
        {#if assessment}
          {@const tone = assessment.verdict === 'strong'
            ? 'border-forest/40 bg-forest/5'
            : assessment.verdict === 'moderate'
              ? 'border-goldfinch-gold/50 bg-goldfinch-gold/10'
              : 'border-red-300 bg-red-50'}
          <div class={`grid gap-3 border p-4 ${tone}`}>
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-sm font-semibold text-ink">Market differentiation:</span>
              <span
                class="inline-flex rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ring-1 {assessment.verdict === 'strong'
                  ? 'bg-forest/15 text-forest ring-forest/30'
                  : assessment.verdict === 'moderate'
                    ? 'bg-goldfinch-gold/20 text-heading ring-goldfinch-gold/30'
                    : 'bg-red-100 text-red-800 ring-red-300'}"
              >
                {assessment.verdict}
              </span>
            </div>

            {#if assessment.strengths.length}
              <ul class="grid gap-1 text-xs leading-5 text-ink/75">
                {#each assessment.strengths as line}
                  <li class="flex gap-2"><span class="text-forest">✓</span><span>{line}</span></li>
                {/each}
              </ul>
            {/if}

            {#if assessment.gaps.length}
              <ul class="grid gap-1 text-xs leading-5 text-ink/75">
                {#each assessment.gaps as line}
                  <li class="flex gap-2"><span class="text-red-600">•</span><span>{line}</span></li>
                {/each}
              </ul>
            {/if}

            {#if assessment.similar.length}
              <p class="text-xs leading-5 text-ink/60">
                Compared against {indexableRivals.length} indexed market page{indexableRivals.length === 1 ? '' : 's'};
                closest match {Math.round(assessment.similar[0].overlap * 100)}% ({assessment.similar[0].name}).
              </p>
            {:else if indexableRivals.length}
              <p class="text-xs leading-5 text-ink/60">
                No substantial overlap with the {indexableRivals.length} page{indexableRivals.length === 1 ? '' : 's'} already indexed.
              </p>
            {/if}

            {#if assessment.requiresAcknowledgement}
              <label class="flex cursor-pointer items-start gap-3 border-t border-red-200 pt-3">
                <input class="mt-0.5 h-4 w-4 accent-red-600" type="checkbox" bind:checked={ackWeak} />
                <span class="text-xs leading-5 text-ink/80">
                  I have reviewed this and want to make the page indexable anyway. Weak differentiation
                  risks being treated as a doorway page, which can affect the whole domain — not just
                  this URL.
                </span>
              </label>
            {/if}
          </div>
        {/if}
      </div>
    </section>

    <!-- sticky save bar -->
    <div class="sticky bottom-0 z-20 -mx-4 border-t border-ink/10 bg-surface/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-xs text-ink/55">
          {#if dirty}
            Unsaved changes.
          {:else if editingId}
            All changes saved.
          {:else}
            Not created yet — save to add this page.
          {/if}
          {#if form.status === 'published'}
            Published pages are live at /safaris/{form.slug || '...'}.
          {:else}
            Drafts stay hidden from the public site.
          {/if}
        </p>
        <div class="flex flex-wrap gap-3">
          <AdminButton variant="secondary" type="button" on:click={backToList}>Back to list</AdminButton>
          <AdminButton type="button" disabled={saving} on:click={save}>
            <Save size={16} /> {saving ? 'Saving...' : editingId ? 'Save landing page' : 'Create landing page'}
          </AdminButton>
        </div>
      </div>
    </div>
  </div>
{/if}

<ConfirmModal
  open={confirmOpen}
  title="Delete landing page"
  message={`Delete "${toDelete?.name ?? 'this page'}"? This soft-deletes the record — the URL stops resolving.`}
  on:cancel={() => { confirmOpen = false; toDelete = null; }}
  on:confirm={confirmDelete}
/>

<ConfirmModal
  open={discardOpen}
  title="Discard changes"
  message="This landing page has unsaved changes. Leave the editor and lose them?"
  on:cancel={() => (discardOpen = false)}
  on:confirm={discardChanges}
/>

{#if deleting}
  <div class="fixed bottom-4 right-4 z-[70] rounded-md bg-black px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(28,26,22,0.18)]">
    Deleting landing page...
  </div>
{/if}
