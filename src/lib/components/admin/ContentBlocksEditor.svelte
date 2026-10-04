<script lang="ts">
  /**
   * Editor for the ordered content blocks that ContentBlocks.svelte renders.
   *
   * Schema-driven rather than a hand-written form per block: each type declares
   * its fields once in BLOCK_TYPES, and one generic renderer draws them. Adding a
   * block type is a data change here plus a branch in the public renderer — not a
   * new screen. That is what keeps this from drifting into a second, divergent
   * editor the way a copy-paste form would.
   *
   * Every field is optional by design. The public renderer skips empty blocks and
   * ignores unknown types, so a half-finished block is safe to save.
   */
  import { ChevronDown, ChevronUp, GripVertical, Plus, Trash2 } from '@lucide/svelte';
  import AdminFormInput from './AdminFormInput.svelte';
  import AdminSelect from './AdminSelect.svelte';
  import AdminTextArea from './AdminTextArea.svelte';
  import MediaPicker from './MediaPicker.svelte';
  import RichTextEditor from './RichTextEditor.svelte';
  import GuideCard from '$lib/components/public/style/GuideCard.svelte';
  import ComfortTierCard from '$lib/components/public/style/ComfortTierCard.svelte';
  import { readPanels, readProse, readTiers } from '$lib/components/public/style/styleContent';

  type MediaItem = { file_name: string; file_url: string; id: string; thumbnail_url?: string | null };
  type TourOption = { id: string; title: string };
  type DestinationOption = { id: string; name: string; region?: string | null };
  type LodgeOption = { id: string; name: string; level?: string | null; place?: string | null };

  type Field = (
    | { key: string; label: string; kind: 'text'; placeholder?: string }
    | { key: string; label: string; kind: 'textarea'; rows?: number; placeholder?: string; help?: string }
    | { key: string; label: string; kind: 'richtext'; help?: string }
    | { key: string; label: string; kind: 'number'; min?: number; step?: string }
    | { key: string; label: string; kind: 'select'; options: { label: string; value: string }[]; help?: string }
    | { key: string; label: string; kind: 'image' }
    | { key: string; label: string; kind: 'lines'; help?: string }
    | { key: string; label: string; kind: 'tours' }
    | { key: string; label: string; kind: 'lodges'; help?: string }
    | { key: string; label: string; kind: 'destinations' }
    | { key: string; label: string; kind: 'list'; itemLabel: string; fields: Field[] }
  ) & { peopleOnly?: boolean; help?: string; counter?: number };

  type BlockSpec = { type: string; label: string; blurb: string; fields: Field[] };

  const BLOCK_TYPES: BlockSpec[] = [
    {
      type: 'prose',
      label: 'Written section',
      blurb: 'An editorial section: choose a layout or let bold paragraph labels select it automatically.',
      fields: [
        { key: 'title', label: 'Heading', kind: 'text' },
        { key: 'prose_layout', label: 'Public-page layout', kind: 'select', options: [
          { label: 'Automatic — recognise the content', value: '' },
          { label: 'Editorial text — keep paragraphs and links', value: 'text' },
          { label: 'Day-by-day route timeline', value: 'route' },
          { label: 'A typical safari day', value: 'schedule' },
          { label: 'Season cards', value: 'seasons' },
          { label: 'Labelled facts', value: 'facts' }
        ], help: 'Structured layouts need a bold label at the beginning of each paragraph. If none exist, the copy remains readable prose; nothing is hidden.' },
        { key: 'body', label: 'Body', kind: 'richtext', help: 'Write normally. Start each paragraph with a bold label and the page lays it out for you: "Day 1:" → route timeline, "6:30 am — Game drive." → day schedule, "June–October:" → season cards, any other "Label:" → tidy fact rows. A final paragraph that is all bold becomes a pull quote.' }
      ]
    },
    {
      type: 'trust',
      label: 'Reassurance strip',
      blurb: 'Four or five short, genuine claims across a band.',
      fields: [{ key: 'items', label: 'Claims', kind: 'list', itemLabel: 'Claim', fields: [{ key: 'label', label: 'Text', kind: 'text' }] }]
    },
    {
      type: 'numbered',
      label: 'Numbered points',
      blurb: 'Ordered points — what makes this style work.',
      fields: [
        { key: 'eyebrow', label: 'Eyebrow', kind: 'text' },
        { key: 'title', label: 'Heading', kind: 'text' },
        { key: 'columns', label: 'Desktop card columns', kind: 'select', options: [
          { label: '3 columns — recommended', value: '' }, { label: '2 columns — longer copy', value: '2' },
          { label: '3 columns', value: '3' }, { label: '4 columns — short copy', value: '4' }
        ], help: 'Phones always show one card per row; tablets show two.' },
        { key: 'items', label: 'Points', kind: 'list', itemLabel: 'Point', fields: [
          { key: 'title', label: 'Title', kind: 'text', counter: 65 },
          { key: 'body', label: 'Body', kind: 'textarea', rows: 3 }
        ] }
      ]
    },
    {
      type: 'panels',
      label: 'Split panels',
      blurb: 'Image cards for places, accommodation or your team.',
      fields: [
        { key: 'eyebrow', label: 'Eyebrow', kind: 'text' },
        { key: 'title', label: 'Heading', kind: 'text' },
        { key: 'panel_layout', label: 'Card layout', kind: 'select', options: [
          { label: 'Automatic — based on the content', value: '' },
          { label: 'Team & guides', value: 'people' },
          { label: 'Places', value: 'places' },
          { label: 'Lodges & camps', value: 'stays' }
        ], help: 'Choose Team & guides for portrait cards. Existing team sections are also recognised automatically.' },
        { key: 'panels', label: 'Panels', kind: 'list', itemLabel: 'Panel', fields: [
          { key: 'title', label: 'Name / card title', kind: 'text', counter: 55 },
          { key: 'role', label: 'Role', kind: 'text', peopleOnly: true, placeholder: 'Head Guide' },
          { key: 'items', label: 'Description / facts', kind: 'lines', help: 'For guides, each line becomes a biography paragraph. A role after a comma in the title still works. For lodges, use facts such as "Best for: …", "Children: …", "Rooms: …".' },
          { key: 'image_url', label: 'Image', kind: 'image', help: 'Team: a real, well-lit 4:5 portrait, ideally 800 × 1000 px or larger. No photo means initials, never a made-up face.' },
          { key: 'image_alt', label: 'Photo description', kind: 'text', peopleOnly: true, placeholder: 'Defaults to the person’s name and role' },
          { key: 'image_fit', label: 'Portrait display', kind: 'select', peopleOnly: true, options: [
            { label: 'Show the entire photo — no cropping', value: '' },
            { label: 'Fill the portrait frame — crop to fit', value: 'cover' }
          ], help: 'A clear 4:5 portrait works best. The entire photo is visible by default; text never covers the face.' },
          { key: 'image_position', label: 'Portrait alignment', kind: 'select', peopleOnly: true, options: [
            { label: 'Centre', value: '' },
            { label: 'Top — keep faces near the top visible', value: 'top' },
            { label: 'Bottom', value: 'bottom' }
          ] }
        ] }
      ]
    },
    {
      type: 'tiers',
      label: 'Comfort tiers',
      blurb: 'Essential / Classic / Luxury, described in your own words.',
      fields: [
        { key: 'eyebrow', label: 'Eyebrow', kind: 'text' },
        { key: 'title', label: 'Heading', kind: 'text' },
        { key: 'intro', label: 'Intro', kind: 'textarea', rows: 2 },
        { key: 'tiers', label: 'Tiers', kind: 'list', itemLabel: 'Tier', fields: [
          { key: 'label', label: 'Optional image badge', kind: 'text', counter: 24, help: 'A short factual label, such as “Private safari”. Leave blank if unnecessary.' },
          { key: 'title', label: 'Comfort level — on the photo', kind: 'text', counter: 36 },
          { key: 'image_url', label: 'Card image', kind: 'image', help: 'Landscape, ideally 1200 × 750 px. Keep the focal subject away from the bottom title overlay.' },
          { key: 'image_alt', label: 'Image description (accessibility)', kind: 'text', counter: 140, help: 'Describe the actual property or scene. Avoid a list of SEO keywords.' },
          { key: 'price_from_usd', label: 'Starting price (USD)', kind: 'number', min: 0.01, step: '0.01' },
          { key: 'price_unit', label: 'Price basis', kind: 'text', placeholder: 'per person sharing per day' },
          { key: 'highlights', label: 'Included highlights', kind: 'lines', help: 'One genuine inclusion per line. Aim for 3–5 concise highlights; each appears with a check mark.' },
          { key: 'example_days', label: 'Example safari — days', kind: 'number', min: 1, step: '1' },
          { key: 'example_adults', label: 'Example safari — adults', kind: 'number', min: 1, step: '1' },
          { key: 'example_children', label: 'Example safari — children', kind: 'number', min: 0, step: '1' },
          { key: 'example_total_usd', label: 'Example safari — total starting price (USD)', kind: 'number', min: 0.01, step: '0.01' },
          { key: 'body', label: 'Notes / existing price copy', kind: 'textarea', rows: 3, help: 'Existing price copy is still supported. The fields above override matching values in this text. The example total is your quoted total, never calculated from the daily price.' },
          { key: 'lodge_ids', label: 'Accommodation', kind: 'lodges', help: 'Selected properties appear as links within the card. The first property supplies its photo when no card image is selected.' }
        ] }
      ]
    },
    {
      type: 'season',
      label: 'When to go',
      blurb: 'Seasonal guidance for this style of trip.',
      fields: [
        { key: 'eyebrow', label: 'Eyebrow', kind: 'text' },
        { key: 'title', label: 'Heading', kind: 'text' },
        { key: 'intro', label: 'Intro', kind: 'textarea', rows: 2 },
        { key: 'seasons', label: 'Seasons', kind: 'list', itemLabel: 'Season', fields: [
          { key: 'months', label: 'Months', kind: 'text' },
          { key: 'label', label: 'Label', kind: 'text' },
          { key: 'body', label: 'Body', kind: 'textarea', rows: 3 }
        ] },
        { key: 'note', label: 'Footnote', kind: 'text' }
      ]
    },
    {
      type: 'route',
      label: 'Suggested route',
      blurb: 'An ordered circuit, plus side notes.',
      fields: [
        { key: 'eyebrow', label: 'Eyebrow', kind: 'text' },
        { key: 'title', label: 'Heading', kind: 'text' },
        { key: 'intro', label: 'Intro', kind: 'textarea', rows: 2 },
        { key: 'stops', label: 'Stops', kind: 'lines', help: 'One stop per line, in order.' },
        { key: 'notes', label: 'Notes', kind: 'list', itemLabel: 'Note', fields: [
          { key: 'title', label: 'Title', kind: 'text' },
          { key: 'body', label: 'Body', kind: 'textarea', rows: 3 }
        ] }
      ]
    },
    {
      type: 'steps',
      label: 'How it works',
      blurb: 'The planning sequence, step by step.',
      fields: [
        { key: 'eyebrow', label: 'Eyebrow', kind: 'text' },
        { key: 'title', label: 'Heading', kind: 'text' },
        { key: 'steps', label: 'Steps', kind: 'list', itemLabel: 'Step', fields: [
          { key: 'title', label: 'Title', kind: 'text' },
          { key: 'body', label: 'Body', kind: 'textarea', rows: 3 }
        ] },
        { key: 'cta_label', label: 'Button label', kind: 'text' },
        { key: 'cta_href', label: 'Button link', kind: 'text' }
      ]
    },
    {
      type: 'imagegrid',
      label: 'Image grid',
      blurb: 'A set of photographs with captions.',
      fields: [
        { key: 'eyebrow', label: 'Eyebrow', kind: 'text' },
        { key: 'title', label: 'Heading', kind: 'text' },
        { key: 'images', label: 'Images', kind: 'list', itemLabel: 'Image', fields: [
          { key: 'image_url', label: 'Image', kind: 'image', help: 'Use sharp original photography. The first image leads the mosaic when there are at least four images.' },
          { key: 'caption', label: 'Visible caption', kind: 'text', counter: 90 },
          { key: 'image_alt', label: 'Image description (accessibility)', kind: 'text', counter: 140, help: 'Describe what is visible. Falls back to the caption. Without either, the image is treated as decorative.' }
        ] }
      ]
    },
    {
      type: 'inclusions',
      label: 'Included / not included',
      blurb: 'Two honest columns.',
      fields: [
        { key: 'title', label: 'Heading', kind: 'text' },
        { key: 'included', label: 'Included', kind: 'lines' },
        { key: 'excluded', label: 'Not included', kind: 'lines' }
      ]
    },
    {
      type: 'tours',
      label: 'Recommended itineraries',
      blurb: 'Points at existing trips — it never restates one. Cards link to the canonical /tours page.',
      fields: [
        { key: 'eyebrow', label: 'Eyebrow', kind: 'text' },
        { key: 'title', label: 'Heading', kind: 'text' },
        { key: 'intro', label: 'Intro', kind: 'textarea', rows: 2 },
        { key: 'tour_ids', label: 'Itineraries', kind: 'tours' }
      ]
    },
    {
      type: 'destinations',
      label: 'Destinations',
      blurb: 'Points at existing destinations, shown as photo cards that link to each destination page. Use this for "Where to go".',
      fields: [
        { key: 'eyebrow', label: 'Eyebrow', kind: 'text' },
        { key: 'title', label: 'Heading', kind: 'text' },
        { key: 'intro', label: 'Intro', kind: 'textarea', rows: 2 },
        { key: 'destination_ids', label: 'Destinations', kind: 'destinations' }
      ]
    },
    {
      type: 'faq',
      label: 'FAQ',
      blurb: 'The questions this traveller actually asks.',
      fields: [
        { key: 'title', label: 'Heading', kind: 'text' },
        { key: 'items', label: 'Questions', kind: 'list', itemLabel: 'Question', fields: [
          { key: 'topic', label: 'Optional question group', kind: 'text', placeholder: 'Children & ages / Costs / Travel planning', counter: 40, help: 'Questions with the same group appear together under a subheading. Leave blank for one uninterrupted list.' },
          { key: 'question', label: 'Question', kind: 'text', counter: 120 },
          { key: 'answer', label: 'Answer', kind: 'textarea', rows: 4, counter: 600, help: 'Answer directly, then add useful detail. Complete questions and answers appear in both the page and its structured data.' }
        ] }
      ]
    },
    {
      type: 'cta',
      label: 'Call to action',
      blurb: 'A closing band with one button.',
      fields: [
        { key: 'title', label: 'Heading', kind: 'text' },
        { key: 'subtitle', label: 'Subtitle', kind: 'textarea', rows: 2 },
        { key: 'label', label: 'Button label', kind: 'text' },
        { key: 'href', label: 'Button link', kind: 'text' },
        { key: 'points', label: 'Reassurance points', kind: 'lines' }
      ]
    }
  ];

  export let blocks: Record<string, unknown>[] = [];
  export let media: MediaItem[] = [];
  export let tours: TourOption[] = [];
  /** Published destinations, for the `destinations` block. */
  export let destinations: DestinationOption[] = [];
  /** Published lodges, for the accommodation picker inside price tiers. */
  export let lodges: LodgeOption[] = [];
  export let uploadFolder = 'travel-styles';

  let addType = BLOCK_TYPES[0].type;
  let open: Record<number, boolean> = {};

  const specFor = (type: unknown) => BLOCK_TYPES.find((b) => b.type === type);

  const addBlock = () => {
    const spec = specFor(addType);
    if (!spec) return;
    blocks = [...blocks, { type: spec.type }];
    open = { ...open, [blocks.length - 1]: true };
  };

  const removeBlock = (i: number) => {
    blocks = blocks.filter((_, n) => n !== i);
  };

  const move = (i: number, delta: number) => {
    const j = i + delta;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j], next[i]];
    blocks = next;
  };

  // ── value plumbing ────────────────────────────────────────────────────────
  // Blocks are loose records, so every read is defensive and every write
  // replaces the array so Svelte sees the change.

  const setField = (i: number, key: string, value: unknown) => {
    blocks = blocks.map((b, n) => (n === i ? { ...b, [key]: value } : b));
  };

  const str = (v: unknown) => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '');
  const list = (v: unknown) => (Array.isArray(v) ? (v as Record<string, unknown>[]) : []);
  const linesToText = (v: unknown) => (Array.isArray(v) ? (v as string[]).join('\n') : '');
  // Preserve line breaks while typing. Public parsers ignore blank lines.
  const textToLines = (v: string) => v.split('\n');
  const panelsView = (block: Record<string, unknown>) =>
    readPanels(block.panels, block.panel_layout, `${str(block.title)} ${str(block.eyebrow)}`);
  const isPeoplePanel = (block: Record<string, unknown>) => block.panel_layout === 'people' || panelsView(block)?.kind === 'people';

  const layoutHint = (block: Record<string, unknown>) => {
    if (block.type === 'prose') {
      const layout = readProse(str(block.body), [], block.prose_layout).kind;
      const labels = { text: 'Editorial text', route: 'Route timeline', schedule: 'Daily schedule', seasons: 'Season cards', facts: 'Labelled facts' };
      return `Current layout: ${labels[layout]}. The heading becomes an H2; the page name supplies the single H1.`;
    }
    if (block.type === 'panels') return isPeoplePanel(block) ? 'Portrait → role → name → biography. Photos are shown in full by default; initials appear until a real photo is selected.' : 'The card layout follows your selection. Places matching published destinations use their linked destination cards.';
    if (block.type === 'tiers') return 'Photo + title → starting price → highlights → example trip total → selected stays → enquiry button. USD values follow the visitor’s currency selection.';
    if (block.type === 'faq') return 'Accessible expandable answers, grouped by your topic labels. Answers are included in server-rendered HTML and generated FAQ structured data.';
    if (block.type === 'trust') return 'These short claims appear below the hero buttons, not as a separate section. Use only claims you can substantiate.';
    if (block.type === 'tours' || block.type === 'destinations') return 'Selected published records supply the live photos, titles and links. Update the source record to update its card here.';
    return specFor(block.type)?.blurb || '';
  };

  const editorialNotes = (block: Record<string, unknown>) => {
    const notes: string[] = [];
    if (/\bbefore publishing\b|\bTODO\b|\bTBD\b/.test(JSON.stringify(block))) notes.push('This section contains a draft marker or an instruction about publishing. Review the copy before making it public; the website displays saved wording as written.');
    if (block.type === 'panels' && isPeoplePanel(block)) {
      const missing = panelsView(block);
      if (missing?.kind === 'people') {
        const names = missing.items.filter((person) => !person.image).map((person) => person.name);
        if (names.length) notes.push(`Portraits still needed: ${names.join(', ')}. These cards currently show initials.`);
      }
    }
    if (block.type === 'tiers') {
      const tiers = readTiers(block.tiers);
      const prices = tiers.map((tier) => tier.price).filter((price) => price !== null);
      if (new Set(prices).size < prices.length) notes.push('Some comfort levels have the same starting price. Verify this is intentional; the page displays your saved amounts without inventing a difference.');
    }
    if (block.type === 'faq' && list(block.items).some((item) => !str(item.question) || !str(item.answer))) notes.push('Incomplete questions are not displayed. Add both a question and an answer.');
    if (block.type === 'imagegrid') {
      const count = list(block.images).filter((item) => str(item.image_url) && !str(item.image_alt) && !str(item.caption)).length;
      if (count) notes.push(`${count} gallery image(s) have no description or caption. Add descriptions for informative photos.`);
    }
    return notes;
  };

  const fieldCounter = (field: Field, nested = false) => field.counter ?? (field.kind === 'text' ? ({ title: nested ? 65 : 90, eyebrow: 40, label: 32, role: 50, cta_label: 32 } as Record<string, number>)[field.key] : undefined);

  const setListItem = (i: number, key: string, index: number, field: string, value: unknown) => {
    const items = list(blocks[i]?.[key]).map((it, n) => (n === index ? { ...it, [field]: value } : it));
    setField(i, key, items);
  };

  const addListItem = (i: number, key: string) => setField(i, key, [...list(blocks[i]?.[key]), {}]);

  const removeListItem = (i: number, key: string, index: number) =>
    setField(i, key, list(blocks[i]?.[key]).filter((_, n) => n !== index));

  const toggleTour = (i: number, id: string) => {
    const current = Array.isArray(blocks[i]?.tour_ids) ? (blocks[i].tour_ids as string[]) : [];
    setField(i, 'tour_ids', current.includes(id) ? current.filter((t) => t !== id) : [...current, id]);
  };

  const toggleId = (i: number, key: string, id: string) => {
    const current = Array.isArray(blocks[i]?.[key]) ? (blocks[i][key] as string[]) : [];
    setField(i, key, current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  };

  const toggleListId = (i: number, key: string, index: number, field: string, id: string) => {
    const item = list(blocks[i]?.[key])[index] ?? {};
    const current = Array.isArray(item[field]) ? (item[field] as string[]) : [];
    setListItem(i, key, index, field, current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  };

  const LEVEL_LABEL: Record<string, string> = { essential: 'Essential', classic: 'Classic', luxury: 'Luxury', ultra_luxury: 'Ultra luxury' };

  /** A one-line summary so a collapsed block is still identifiable. */
  const summarise = (block: Record<string, unknown>) => {
    const spec = specFor(block.type);
    const title = str(block.title) || str(block.eyebrow);
    if (title) return title;
    for (const key of ['items', 'panels', 'tiers', 'seasons', 'steps', 'images', 'notes', 'tour_ids', 'destination_ids']) {
      const n = Array.isArray(block[key]) ? (block[key] as unknown[]).length : 0;
      if (n) return `${n} ${n === 1 ? 'entry' : 'entries'}`;
    }
    return spec ? 'Empty — nothing will render' : 'Unknown block type';
  };
</script>

<div class="grid gap-4">
  <div class="border-l-2 border-forest bg-forest/5 p-4 text-sm leading-6 text-ink/75">
    <p class="font-semibold text-ink">Content → design</p>
    <p>Your fields drive the public layout, not just its text. Counts are editorial suggestions, not limits: longer content is preserved and wraps. Use the card previews below before saving.</p>
  </div>
  <div class="flex flex-wrap items-end gap-3 border border-ink/10 bg-sand/25 p-4">
    <div class="min-w-[220px] flex-1">
      <AdminSelect
        label="Add a section"
        name="add_block_type"
        bind:value={addType}
        options={BLOCK_TYPES.map((b) => ({ label: b.label, value: b.type }))}
      />
    </div>
    <button
      class="inline-flex h-11 items-center gap-2 bg-forest px-5 text-sm font-semibold text-white transition hover:brightness-110"
      type="button"
      on:click={addBlock}
    >
      <Plus size={16} /> Add
    </button>
    <p class="w-full text-xs leading-5 text-ink/55">
      {specFor(addType)?.blurb ?? ''}
    </p>
  </div>

  {#if !blocks.length}
    <p class="border border-dashed border-ink/20 px-5 py-8 text-center text-sm text-ink/55">
      No sections yet. The page will render its hero and the two lists above, and nothing more.
    </p>
  {/if}

  {#each blocks as block, i (i)}
    {@const spec = specFor(block.type)}
    <div class="border border-ink/12 bg-surface">
      <div class="flex items-center gap-3 border-b border-ink/10 bg-sand/30 px-4 py-3">
        <GripVertical size={15} class="shrink-0 text-ink/25" />
        <button class="flex min-w-0 flex-1 flex-col items-start gap-1 text-left sm:flex-row sm:items-center sm:gap-3" type="button" aria-expanded={!!open[i]} on:click={() => (open = { ...open, [i]: !open[i] })}>
          <span class="text-sm font-semibold text-ink">{spec?.label ?? String(block.type ?? 'Unknown')}</span>
          <span class="max-w-full truncate text-xs text-ink/50">{summarise(block)}</span>
        </button>
        <button class="p-1 text-ink/40 transition hover:text-ink disabled:opacity-30" type="button" disabled={i === 0} on:click={() => move(i, -1)} aria-label="Move up">
          <ChevronUp size={16} />
        </button>
        <button class="p-1 text-ink/40 transition hover:text-ink disabled:opacity-30" type="button" disabled={i === blocks.length - 1} on:click={() => move(i, 1)} aria-label="Move down">
          <ChevronDown size={16} />
        </button>
        <button class="p-1 text-red-500 transition hover:text-red-700" type="button" on:click={() => removeBlock(i)} aria-label="Remove section">
          <Trash2 size={15} />
        </button>
      </div>

      {#if open[i] && spec}
        <div class="grid gap-5 p-5">
          <p class="border border-ink/10 bg-linen/40 p-3 text-xs leading-6 text-ink/75">{layoutHint(block)}</p>
          {#each editorialNotes(block) as note}
            <p class="border-l-2 border-amber-500 bg-amber-50 p-3 text-xs leading-6 text-amber-900">{note}</p>
          {/each}
          {#each spec.fields as field (field.key)}
            {#if field.kind === 'text'}
              <AdminFormInput
                label={field.label}
                name={`${i}-${field.key}`}
                value={str(block[field.key])}
                placeholder={field.placeholder ?? ''}
                counter={fieldCounter(field)}
                on:input={(e) => setField(i, field.key, (e.target as HTMLInputElement).value)}
              />
              {#if field.help}<p class="-mt-1 text-xs leading-5 text-ink/60">{field.help}</p>{/if}
            {:else if field.kind === 'select'}
              <AdminSelect
                label={field.label}
                name={`${i}-${field.key}`}
                value={str(block[field.key])}
                options={field.options}
                on:change={(e) => setField(i, field.key, (e.target as HTMLSelectElement).value)}
              />
              {#if field.help}<p class="-mt-1 text-xs leading-5 text-ink/50">{field.help}</p>{/if}
            {:else if field.kind === 'number'}
              <AdminFormInput
                label={field.label}
                name={`${i}-${field.key}`}
                type="number"
                value={str(block[field.key])}
                on:input={(e) => setField(i, field.key, Number((e.target as HTMLInputElement).value) || undefined)}
              />
            {:else if field.kind === 'textarea'}
              <AdminTextArea
                label={field.label}
                name={`${i}-${field.key}`}
                rows={field.rows ?? 3}
                counter={fieldCounter(field)}
                value={str(block[field.key])}
                placeholder={field.placeholder ?? ''}
                on:input={(e) => setField(i, field.key, (e.target as HTMLTextAreaElement).value)}
              />
              {#if field.help}<p class="-mt-1 text-xs leading-5 text-ink/50">{field.help}</p>{/if}
            {:else if field.kind === 'richtext'}
              <RichTextEditor
                label={field.label}
                value={str(block[field.key])}
                {media}
                {uploadFolder}
                on:change={(e) => setField(i, field.key, (e as CustomEvent<string>).detail)}
              />
              {#if field.help}<p class="-mt-1 text-xs leading-5 text-ink/50">{field.help}</p>{/if}
            {:else if field.kind === 'image'}
              <MediaPicker
                label={field.label}
                {media}
                {uploadFolder}
                value={str(block[field.key])}
                on:change={(e) => setField(i, field.key, (e as CustomEvent<string>).detail)}
              />
            {:else if field.kind === 'lines'}
              <div class="grid gap-1.5">
                <AdminTextArea
                  label={field.label}
                  name={`${i}-${field.key}`}
                  rows={4}
                  value={linesToText(block[field.key])}
                  on:input={(e) => setField(i, field.key, textToLines((e.target as HTMLTextAreaElement).value))}
                />
                <p class="text-xs text-ink/50">{field.help ?? 'One per line.'}</p>
              </div>
            {:else if field.kind === 'tours'}
              <div class="grid gap-2">
                <p class="text-sm font-medium text-ink">{field.label}</p>
                <p class="text-xs text-ink/55">
                  Recommends existing itineraries. Cards link to the canonical /tours page — a trip is never duplicated here.
                </p>
                <div class="grid max-h-56 gap-1 overflow-y-auto border border-ink/10 p-3">
                  {#each tours as t (t.id)}
                    <label class="flex cursor-pointer items-start gap-2 text-sm text-ink/80">
                      <input
                        class="mt-0.5 h-4 w-4 accent-forest"
                        type="checkbox"
                        checked={Array.isArray(block.tour_ids) && (block.tour_ids as string[]).includes(t.id)}
                        on:change={() => toggleTour(i, t.id)}
                      />
                      <span>{t.title}</span>
                    </label>
                  {/each}
                </div>
              </div>
            {:else if field.kind === 'destinations'}
              {@const picked = Array.isArray(block[field.key]) ? (block[field.key] as string[]) : []}
              <div class="grid gap-2">
                <p class="text-sm font-medium text-ink">
                  {field.label}
                  {#if picked.length}<span class="ml-1 text-xs font-normal text-ink/50">· {picked.length} selected</span>{/if}
                </p>
                <p class="text-xs text-ink/55">Shown in the order you tick them. Each card uses the destination's own photo and facts, and links to its page.</p>
                <div class="grid max-h-56 gap-1 overflow-y-auto border border-ink/10 p-3">
                  {#each destinations as d (d.id)}
                    <label class="flex cursor-pointer items-start gap-2 text-sm text-ink/80">
                      <input
                        class="mt-0.5 h-4 w-4 accent-forest"
                        type="checkbox"
                        checked={picked.includes(d.id)}
                        on:change={() => toggleId(i, field.key, d.id)}
                      />
                      <span>{d.name}{#if d.region}<span class="ml-1 text-xs text-ink/45">{d.region}</span>{/if}</span>
                    </label>
                  {/each}
                </div>
              </div>
            {:else if field.kind === 'list'}
              <div class="grid gap-3 border border-ink/10 bg-canvas p-4">
                <div class="flex items-center justify-between">
                  <p class="text-sm font-medium text-ink">{field.label}</p>
                  <button class="text-xs font-semibold text-forest transition hover:underline" type="button" on:click={() => addListItem(i, field.key)}>
                    + Add {field.itemLabel.toLowerCase()}
                  </button>
                </div>
                {#each list(block[field.key]) as item, n (n)}
                  <div class="grid gap-3 border border-ink/10 bg-surface p-3">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-semibold uppercase tracking-wide text-ink/45">{field.itemLabel} {n + 1}</span>
                      <button class="text-red-500 transition hover:text-red-700" type="button" on:click={() => removeListItem(i, field.key, n)} aria-label="Remove">
                        <Trash2 size={13} />
                      </button>
                    </div>
                    {#each field.fields.filter((sub) => !sub.peopleOnly || isPeoplePanel(block)) as sub (sub.key)}
                      {#if sub.kind === 'image'}
                        <MediaPicker
                          label={sub.label}
                          {media}
                          {uploadFolder}
                          value={str(item[sub.key])}
                          on:change={(e) => setListItem(i, field.key, n, sub.key, (e as CustomEvent<string>).detail)}
                        />
                        {#if sub.help}<p class="-mt-1 text-xs leading-5 text-ink/60">{sub.help}</p>{/if}
                      {:else if sub.kind === 'number'}
                        <AdminFormInput
                          label={sub.label}
                          name={`${i}-${field.key}-${n}-${sub.key}`}
                          type="number"
                          min={sub.min}
                          step={sub.step}
                          value={str(item[sub.key])}
                          on:input={(e) => {
                            const value = (e.target as HTMLInputElement).value;
                            setListItem(i, field.key, n, sub.key, value === '' ? undefined : Number(value));
                          }}
                        />
                      {:else if sub.kind === 'select'}
                        <AdminSelect
                          label={sub.label}
                          name={`${i}-${field.key}-${n}-${sub.key}`}
                          value={str(item[sub.key])}
                          options={sub.options}
                          on:change={(e) => setListItem(i, field.key, n, sub.key, (e.target as HTMLSelectElement).value)}
                        />
                        {#if sub.help}<p class="-mt-1 text-xs leading-5 text-ink/50">{sub.help}</p>{/if}
                      {:else if sub.kind === 'lodges'}
                        {@const picked = Array.isArray(item[sub.key]) ? (item[sub.key] as string[]) : []}
                        <div class="grid gap-1.5">
                          <p class="text-sm font-medium text-ink">
                            {sub.label}
                            {#if picked.length}<span class="ml-1 text-xs font-normal text-ink/50">· {picked.length} selected</span>{/if}
                          </p>
                          {#if sub.help}<p class="text-xs leading-5 text-ink/50">{sub.help}</p>{/if}
                          {#if lodges.length}
                            <div class="grid max-h-52 gap-1 overflow-y-auto border border-ink/10 p-3">
                              {#each lodges as l (l.id)}
                                <label class="flex cursor-pointer items-start gap-2 text-sm text-ink/80">
                                  <input
                                    class="mt-0.5 h-4 w-4 accent-forest"
                                    type="checkbox"
                                    checked={picked.includes(l.id)}
                                    on:change={() => toggleListId(i, field.key, n, sub.key, l.id)}
                                  />
                                  <span>
                                    {l.name}
                                    <span class="text-xs text-ink/45">{[l.level ? LEVEL_LABEL[l.level] ?? l.level : '', l.place].filter(Boolean).join(' · ')}</span>
                                  </span>
                                </label>
                              {/each}
                            </div>
                          {:else}
                            <p class="text-xs text-ink/50">No published accommodation yet — add some under Accommodation first.</p>
                          {/if}
                        </div>
                      {:else if sub.kind === 'lines'}
                        <AdminTextArea
                          label={sub.label}
                          name={`${i}-${field.key}-${n}-${sub.key}`}
                          rows={3}
                          value={linesToText(item[sub.key])}
                          on:input={(e) => setListItem(i, field.key, n, sub.key, textToLines((e.target as HTMLTextAreaElement).value))}
                        />
                        {#if sub.help}<p class="-mt-1 text-xs leading-5 text-ink/50">{sub.help}</p>{/if}
                      {:else if sub.kind === 'textarea'}
                        <AdminTextArea
                          label={sub.label}
                          name={`${i}-${field.key}-${n}-${sub.key}`}
                          rows={sub.rows ?? 3}
                          counter={fieldCounter(sub, true)}
                          value={str(item[sub.key])}
                          on:input={(e) => setListItem(i, field.key, n, sub.key, (e.target as HTMLTextAreaElement).value)}
                        />
                        {#if sub.help}<p class="-mt-1 text-xs leading-5 text-ink/50">{sub.help}</p>{/if}
                      {:else}
                        <AdminFormInput
                          label={sub.label}
                          name={`${i}-${field.key}-${n}-${sub.key}`}
                          value={str(item[sub.key])}
                          placeholder={sub.kind === 'text' ? sub.placeholder ?? '' : ''}
                          counter={fieldCounter(sub, true)}
                          on:input={(e) => setListItem(i, field.key, n, sub.key, (e.target as HTMLInputElement).value)}
                        />
                        {#if sub.help}<p class="-mt-1 text-xs leading-5 text-ink/60">{sub.help}</p>{/if}
                      {/if}
                    {/each}
                  </div>
                {/each}
              </div>
            {/if}
          {/each}
          {#if block.type === 'panels'}
            {@const preview = panelsView(block)}
            {#if preview?.kind === 'people'}
              <div class="min-w-0 border-t border-ink/10 pt-5">
                <p class="mb-4 text-sm font-semibold text-ink">Guide card preview</p>
                <div class="grid min-w-0 gap-4 xl:grid-cols-3">
                  {#each preview.items as person, n (n)}
                    <GuideCard {person} showPortrait={preview.items.some((item) => item.image)} />
                  {/each}
                </div>
              </div>
            {/if}
          {:else if block.type === 'tiers'}
            <div class="min-w-0 border-t border-ink/10 pt-5">
              <p class="mb-4 text-sm font-semibold text-ink">Safari cost card preview</p>
              <div class="grid min-w-0 gap-4 xl:grid-cols-3">
                {#each readTiers(block.tiers) as tier, n (n)}
                  <ComfortTierCard {tier} preview />
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {/each}
</div>
