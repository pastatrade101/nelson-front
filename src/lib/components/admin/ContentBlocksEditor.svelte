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

  type MediaItem = { file_name: string; file_url: string; id: string; thumbnail_url?: string | null };
  type TourOption = { id: string; title: string };

  type Field =
    | { key: string; label: string; kind: 'text'; placeholder?: string }
    | { key: string; label: string; kind: 'textarea'; rows?: number; placeholder?: string }
    | { key: string; label: string; kind: 'richtext' }
    | { key: string; label: string; kind: 'number' }
    | { key: string; label: string; kind: 'image' }
    | { key: string; label: string; kind: 'lines'; help?: string }
    | { key: string; label: string; kind: 'tours' }
    | { key: string; label: string; kind: 'list'; itemLabel: string; fields: Field[] };

  type BlockSpec = { type: string; label: string; blurb: string; fields: Field[] };

  const BLOCK_TYPES: BlockSpec[] = [
    {
      type: 'prose',
      label: 'Written section',
      blurb: 'A heading and formatted copy. The workhorse block.',
      fields: [
        { key: 'title', label: 'Heading', kind: 'text' },
        { key: 'body', label: 'Body', kind: 'richtext' }
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
        { key: 'columns', label: 'Columns', kind: 'number' },
        { key: 'items', label: 'Points', kind: 'list', itemLabel: 'Point', fields: [
          { key: 'title', label: 'Title', kind: 'text' },
          { key: 'body', label: 'Body', kind: 'textarea', rows: 3 }
        ] }
      ]
    },
    {
      type: 'panels',
      label: 'Split panels',
      blurb: 'Two or three image panels, each with a short list.',
      fields: [
        { key: 'eyebrow', label: 'Eyebrow', kind: 'text' },
        { key: 'title', label: 'Heading', kind: 'text' },
        { key: 'panels', label: 'Panels', kind: 'list', itemLabel: 'Panel', fields: [
          { key: 'title', label: 'Title', kind: 'text' },
          { key: 'items', label: 'Bullets', kind: 'lines' },
          { key: 'image_url', label: 'Image', kind: 'image' }
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
          { key: 'label', label: 'Label', kind: 'text' },
          { key: 'title', label: 'Title', kind: 'text' },
          { key: 'body', label: 'Body', kind: 'textarea', rows: 3 },
          { key: 'image_url', label: 'Image', kind: 'image' }
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
          { key: 'image_url', label: 'Image', kind: 'image' },
          { key: 'caption', label: 'Caption', kind: 'text' }
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
      type: 'faq',
      label: 'FAQ',
      blurb: 'The questions this traveller actually asks.',
      fields: [
        { key: 'title', label: 'Heading', kind: 'text' },
        { key: 'items', label: 'Questions', kind: 'list', itemLabel: 'Question', fields: [
          { key: 'question', label: 'Question', kind: 'text' },
          { key: 'answer', label: 'Answer', kind: 'textarea', rows: 4 }
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
  const textToLines = (v: string) => v.split('\n').map((l) => l.trim()).filter(Boolean);

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

  /** A one-line summary so a collapsed block is still identifiable. */
  const summarise = (block: Record<string, unknown>) => {
    const spec = specFor(block.type);
    const title = str(block.title) || str(block.eyebrow);
    if (title) return title;
    for (const key of ['items', 'panels', 'tiers', 'seasons', 'steps', 'images', 'notes', 'tour_ids']) {
      const n = Array.isArray(block[key]) ? (block[key] as unknown[]).length : 0;
      if (n) return `${n} ${n === 1 ? 'entry' : 'entries'}`;
    }
    return spec ? 'Empty — nothing will render' : 'Unknown block type';
  };
</script>

<div class="grid gap-4">
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
        <button class="flex flex-1 items-center gap-3 text-left" type="button" on:click={() => (open = { ...open, [i]: !open[i] })}>
          <span class="text-sm font-semibold text-ink">{spec?.label ?? String(block.type ?? 'Unknown')}</span>
          <span class="truncate text-xs text-ink/50">{summarise(block)}</span>
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
          {#each spec.fields as field (field.key)}
            {#if field.kind === 'text'}
              <AdminFormInput
                label={field.label}
                name={`${i}-${field.key}`}
                value={str(block[field.key])}
                placeholder={field.placeholder ?? ''}
                on:input={(e) => setField(i, field.key, (e.target as HTMLInputElement).value)}
              />
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
                value={str(block[field.key])}
                placeholder={field.placeholder ?? ''}
                on:input={(e) => setField(i, field.key, (e.target as HTMLTextAreaElement).value)}
              />
            {:else if field.kind === 'richtext'}
              <RichTextEditor
                label={field.label}
                value={str(block[field.key])}
                {media}
                {uploadFolder}
                on:change={(e) => setField(i, field.key, (e as CustomEvent<string>).detail)}
              />
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
                    {#each field.fields as sub (sub.key)}
                      {#if sub.kind === 'image'}
                        <MediaPicker
                          label={sub.label}
                          {media}
                          {uploadFolder}
                          value={str(item[sub.key])}
                          on:change={(e) => setListItem(i, field.key, n, sub.key, (e as CustomEvent<string>).detail)}
                        />
                      {:else if sub.kind === 'lines'}
                        <AdminTextArea
                          label={sub.label}
                          name={`${i}-${field.key}-${n}-${sub.key}`}
                          rows={3}
                          value={linesToText(item[sub.key])}
                          on:input={(e) => setListItem(i, field.key, n, sub.key, textToLines((e.target as HTMLTextAreaElement).value))}
                        />
                      {:else if sub.kind === 'textarea'}
                        <AdminTextArea
                          label={sub.label}
                          name={`${i}-${field.key}-${n}-${sub.key}`}
                          rows={sub.rows ?? 3}
                          value={str(item[sub.key])}
                          on:input={(e) => setListItem(i, field.key, n, sub.key, (e.target as HTMLTextAreaElement).value)}
                        />
                      {:else}
                        <AdminFormInput
                          label={sub.label}
                          name={`${i}-${field.key}-${n}-${sub.key}`}
                          value={str(item[sub.key])}
                          on:input={(e) => setListItem(i, field.key, n, sub.key, (e.target as HTMLInputElement).value)}
                        />
                      {/if}
                    {/each}
                  </div>
                {/each}
              </div>
            {/if}
          {/each}
        </div>
      {/if}
    </div>
  {/each}
</div>
