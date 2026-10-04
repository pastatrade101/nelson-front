<script lang="ts">
  import { ArrowDown, ArrowUp, ChevronDown, Plus, Trash2, Undo2 } from '@lucide/svelte';
  import { toMetaText } from '$lib/richtext';
  import RichTextEditor from './RichTextEditor.svelte';
  import AdminFormInput from '$lib/components/admin/AdminFormInput.svelte';
  import AdminTextArea from '$lib/components/admin/AdminTextArea.svelte';
  import AdminSelect from '$lib/components/admin/AdminSelect.svelte';
  import MediaPicker from '$lib/components/admin/MediaPicker.svelte';
  import { onMount } from 'svelte';
  import { api } from '$lib/api/client';

  type MediaItem = { id: string; file_name: string; file_url: string; thumbnail_url?: string | null };

  // Bound from the parent (the destination form's `guide` array). Kept `any[]`
  // deliberately — this is a structural editor over heterogeneous block objects.
  export let blocks: any[] = [];
  export let media: MediaItem[] = [];

  const TYPES = [
    { value: 'part', label: 'Part heading' },
    { value: 'richtext', label: 'Text' },
    { value: 'field_notes', label: 'Field Notes box' },
    { value: 'callout', label: 'Tip / Insight callout' },
    { value: 'did_you_know', label: 'Did You Know?' },
    { value: 'table', label: 'Comparison table' },
    { value: 'facts', label: 'Fact list' },
    { value: 'photo', label: 'Photo' },
    { value: 'faq', label: 'FAQ group' },
    { value: 'tours', label: 'Tours — pick itineraries' },
    { value: 'lodges', label: 'Accommodation — pick stays' }
  ];
  const TYPE_LABEL: Record<string, string> = Object.fromEntries(TYPES.map((t) => [t.value, t.label]));
  const VARIANTS = [
    { value: 'guide_tip', label: "Guide's Tip" },
    { value: 'local_insight', label: 'Local Insight' },
    { value: 'safari_wisdom', label: 'Safari Wisdom' }
  ];

  // Shared control classes (avoids relying on @apply in component <style>).
  const CELL =
    'w-full rounded-md border border-ink/15 bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-forest focus:ring-2 focus:ring-forest/15';
  const DEL =
    'grid h-8 w-8 shrink-0 place-items-center rounded-md border border-red-200 text-red-500 transition hover:bg-red-50';
  const ADD =
    'inline-flex w-fit items-center gap-1 rounded-lg border border-forest/30 bg-forest/[0.06] px-3 py-1.5 text-xs font-bold text-forest transition hover:bg-forest/10';

  const make = (type: string): any => {
    switch (type) {
      case 'part': return { type, part: null, title: '' };
      case 'richtext': return { type, heading: '', body: '' };
      case 'field_notes': return { type, body: '' };
      case 'callout': return { type, variant: 'guide_tip', body: '' };
      case 'did_you_know': return { type, body: '' };
      case 'table': return { type, title: '', columns: ['', ''], rows: [['', '']] };
      case 'facts': return { type, title: '', items: [{ label: '', value: '' }] };
      case 'photo': return { type, caption: '', url: '' };
      case 'faq': return { type, title: '', items: [{ q: '', a: '' }] };
      case 'tours': return { type, title: '', intro: '', tour_ids: [] };
      case 'lodges': return { type, title: '', intro: '', lodge_ids: [] };
      default: return { type: 'richtext', body: '' };
    }
  };

  let addType = 'part';
  let expanded = new Set<any>();
  let undoBlocks: any[] | null = null;
  let undoLabel = '';
  const remember = (label: string) => {
    undoBlocks = JSON.parse(JSON.stringify(blocks));
    undoLabel = label;
  };
  const undo = () => {
    if (!undoBlocks) return;
    blocks = undoBlocks;
    undoBlocks = null;
    expanded = new Set();
  };
  const toggleBlock = (block: any) => {
    const next = new Set(expanded);
    if (next.has(block)) next.delete(block); else next.add(block);
    expanded = next;
  };
  const summary = (block: any) => toMetaText(block.title || block.heading || block.caption || block.body || '', 110) || 'Click to add content';
  const addBlock = () => { const block = make(addType); blocks = [...blocks, block]; expanded = new Set([...expanded, block]); };
  const removeBlock = (i: number) => { remember('Block removed'); blocks = blocks.filter((_, idx) => idx !== i); };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j], next[i]];
    blocks = next;
  };

  // Table structure helpers.
  const addColumn = (b: any) => { b.columns = [...b.columns, '']; b.rows = b.rows.map((r: any[]) => [...r, '']); blocks = blocks; };
  const removeColumn = (b: any, ci: number) => { remember('Column removed'); b.columns = b.columns.filter((_: any, k: number) => k !== ci); b.rows = b.rows.map((r: any[]) => r.filter((_: any, k: number) => k !== ci)); blocks = blocks; };
  const addRow = (b: any) => { b.rows = [...b.rows, b.columns.map(() => '')]; blocks = blocks; };
  const removeRow = (b: any, ri: number) => { remember('Row removed'); b.rows = b.rows.filter((_: any, k: number) => k !== ri); blocks = blocks; };

  // Fact/FAQ item helpers.
  const addItem = (b: any, empty: any) => { b.items = [...b.items, { ...empty }]; blocks = blocks; };
  const removeItem = (b: any, j: number) => { remember('Item removed'); b.items = b.items.filter((_: any, k: number) => k !== j); blocks = blocks; };

  // Tours and Accommodation blocks hold ids of real records, rendered as cards
  // on the destination page — a trip or a stay is never retyped into the guide.
  type Option = { id: string; label: string; meta: string; status: string };
  let tourOptions: Option[] = [];
  let lodgeOptions: Option[] = [];
  let optionsLoaded = false;
  let optionsError = '';
  let pickerQuery: Record<number, string> = {};
  onMount(async () => {
    const [tours, lodges] = await Promise.allSettled([
      api.tours.list({ status: 'all', limit: 200 }),
      api.lodges.list({ status: 'all', limit: 200 })
    ]);
    if (tours.status === 'fulfilled') {
      tourOptions = (tours.value.data.items as unknown as Record<string, unknown>[]).map((t) => ({
        id: String(t.id),
        label: String(t.title ?? t.slug ?? ''),
        meta: t.duration_days ? `${t.duration_days} days` : '',
        status: String(t.status ?? '')
      }));
    }
    if (lodges.status === 'fulfilled') {
      lodgeOptions = (lodges.value.data.items as unknown as Record<string, unknown>[]).map((l) => ({
        id: String(l.id),
        label: String(l.name ?? l.slug ?? ''),
        meta: String((l.destinations as { name?: string } | null)?.name ?? ''),
        status: String(l.status ?? '')
      }));
    }
    optionsLoaded = true;
    if (tours.status === 'rejected' || lodges.status === 'rejected') optionsError = 'Some choices could not load. Existing selections are preserved. Reopen the editor to try again.';
  });
  const pickKey = (b: any): 'tour_ids' | 'lodge_ids' => (b.type === 'tours' ? 'tour_ids' : 'lodge_ids');
  const optionsFor = (b: any) => (b.type === 'tours' ? tourOptions : lodgeOptions);
  const picked = (b: any): string[] => (Array.isArray(b[pickKey(b)]) ? b[pickKey(b)] : []);
  const togglePick = (b: any, id: string) => {
    const key = pickKey(b);
    const ids = picked(b);
    b[key] = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
    blocks = blocks;
  };
  const movePick = (b: any, j: number, dir: -1 | 1) => {
    const ids = [...picked(b)];
    const k = j + dir;
    if (k < 0 || k >= ids.length) return;
    [ids[j], ids[k]] = [ids[k], ids[j]];
    b[pickKey(b)] = ids;
    blocks = blocks;
  };
  const filtered = (b: any, i: number, _deps?: unknown) => {
    const q = (pickerQuery[i] ?? '').trim().toLowerCase();
    return optionsFor(b).filter((o) => !q || `${o.label} ${o.meta}`.toLowerCase().includes(q));
  };
  const labelOf = (b: any, id: string) => optionsFor(b).find((o) => o.id === id);

  // Advanced JSON import/export (bulk paste, e.g. a converted guide, or backup).
  let jsonOpen = false;
  let jsonDraft = '';
  let jsonError = '';
  const toggleJson = () => {
    jsonOpen = !jsonOpen;
    if (jsonOpen) { jsonDraft = JSON.stringify(blocks, null, 2); jsonError = ''; }
  };
  const applyJson = () => {
    try {
      const parsed = JSON.parse(jsonDraft);
      if (!Array.isArray(parsed) || parsed.some((block) => !block || typeof block !== 'object' || typeof block.type !== 'string')) throw new Error('Use an array of objects, each with a block type. Your existing guide has not changed.');
      for (const block of parsed) {
        if (['facts', 'faq'].includes(block.type) && (!Array.isArray(block.items) || block.items.some((item: unknown) => !item || typeof item !== 'object'))) throw new Error('Fact and FAQ blocks need an items array of objects.');
        if (block.type === 'table' && (!Array.isArray(block.columns) || !Array.isArray(block.rows) || block.rows.some((row: unknown) => !Array.isArray(row)))) throw new Error('Table blocks need columns and rows arrays.');
        if (['tours', 'lodges'].includes(block.type) && block[pickKey(block)] != null && !Array.isArray(block[pickKey(block)])) throw new Error('Selected record IDs must be an array.');
      }
      remember('Guide replaced');
      blocks = parsed;
      expanded = new Set();
      jsonError = '';
      jsonOpen = false;
    } catch (e) {
      jsonError = e instanceof Error ? e.message : 'Invalid JSON';
    }
  };
</script>

<div class="grid gap-4">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <p class="text-sm font-semibold text-ink">{blocks.length} content {blocks.length === 1 ? 'block' : 'blocks'}</p>
    {#if blocks.length}<div class="flex gap-3 text-xs font-semibold text-forest">
      <button type="button" on:click={() => (expanded = new Set(blocks))}>Expand all</button>
      <button type="button" on:click={() => (expanded = new Set())}>Collapse all</button>
    </div>{/if}
  </div>
  {#if undoBlocks}
    <div class="sticky top-0 z-10 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-ink" role="status">
      <span>{undoLabel}. Undo restores the guide to just before that action.</span>
      <button type="button" class="inline-flex shrink-0 items-center gap-1 font-semibold text-forest" on:click={undo}><Undo2 size={14} />Undo</button>
    </div>
  {/if}
  {#if !blocks.length}
    <p class="rounded-xl border border-dashed border-ink/20 bg-sand/20 px-4 py-6 text-center text-sm text-ink/50">
      Start with a section heading, then add text, photographs or useful facts. Your guide can grow one section at a time.
    </p>
  {/if}

  {#each blocks as block, i (block)}
    <div class="min-w-0 rounded-lg border border-ink/15 bg-surface">
      <div class="flex items-center justify-between gap-2 p-3">
        <button type="button" class="flex min-w-0 flex-1 items-center gap-3 text-left" aria-expanded={expanded.has(block)} aria-controls={`guide-block-${i}`} on:click={() => toggleBlock(block)}>
          <span class="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-sand text-xs font-semibold text-ink/50">{String(i + 1).padStart(2, '0')}</span>
          <span class="min-w-0 flex-1"><span class="block text-xs font-semibold text-forest">{TYPE_LABEL[block.type] ?? block.type}</span><span class="mt-1 block truncate text-sm text-ink/65">{summary(block)}</span></span>
          <ChevronDown size={16} class={expanded.has(block) ? 'rotate-180 text-ink/45' : 'text-ink/45'} />
        </button>
        <div class="flex items-center gap-1">
          <button type="button" class="grid h-7 w-7 place-items-center rounded-md border border-ink/10 text-ink/60 transition hover:bg-sand disabled:opacity-30" on:click={() => move(i, -1)} disabled={i === 0} aria-label="Move up"><ArrowUp size={15} /></button>
          <button type="button" class="grid h-7 w-7 place-items-center rounded-md border border-ink/10 text-ink/60 transition hover:bg-sand disabled:opacity-30" on:click={() => move(i, 1)} disabled={i === blocks.length - 1} aria-label="Move down"><ArrowDown size={15} /></button>
          <button type="button" class={DEL} on:click={() => removeBlock(i)} aria-label="Delete block"><Trash2 size={15} /></button>
        </div>
      </div>

      {#if expanded.has(block)}
      <div id={`guide-block-${i}`} class="grid min-w-0 gap-4 border-t border-ink/10 p-4">
      {#if block.type === 'part'}
        <div class="grid gap-3 sm:grid-cols-[120px_1fr]">
          <AdminFormInput label="Part number" name={`part-${i}`} type="number" bind:value={block.part} />
          <AdminFormInput label="Title" name={`title-${i}`} bind:value={block.title} />
        </div>
        <AdminFormInput label="Subtitle (optional)" name={`subtitle-${i}`} bind:value={block.subtitle} />
      {:else if block.type === 'richtext'}
        <div class="grid gap-3">
          <AdminFormInput label="Heading (optional)" name={`h-${i}`} bind:value={block.heading} />
          <!-- Rich text: the toolbar's link button searches every itinerary,
               destination, travel style and journal post, so a paragraph can
               link to the page it is discussing without typing a URL. -->
          <RichTextEditor label="Body" allowPageHeading={false} bind:value={block.body} media={media} uploadFolder="destinations" minHeight="220px" placeholder="Write this section — link place names and safaris as you go." />
        </div>
      {:else if block.type === 'field_notes'}
        <AdminFormInput label="Title (optional)" name={`fn-title-${i}`} bind:value={block.title} />
        <AdminTextArea label="Field Notes body" name={`fn-${i}`} rows={4} bind:value={block.body} />
      {:else if block.type === 'callout'}
        <div class="grid gap-3">
          <AdminSelect label="Style" name={`v-${i}`} bind:value={block.variant} options={VARIANTS} />
          <AdminTextArea label="Body" name={`cb-${i}`} rows={3} bind:value={block.body} />
        </div>
      {:else if block.type === 'did_you_know'}
        <AdminTextArea label="Did You Know body" name={`dyk-${i}`} rows={3} bind:value={block.body} />
      {:else if block.type === 'photo'}
        <div class="grid gap-3 sm:grid-cols-2">
          <MediaPicker label="Image" {media} uploadFolder="destinations" bind:value={block.url} />
          <AdminTextArea label="Caption" name={`cap-${i}`} rows={4} bind:value={block.caption} />
        </div>
        <AdminFormInput label="Image description (alt text)" name={`alt-${i}`} bind:value={block.alt} placeholder="Describe what is in the photo for people using screen readers." />
      {:else if block.type === 'facts'}
        <div class="grid gap-3">
          <AdminFormInput label="Title" name={`ft-${i}`} bind:value={block.title} />
          <div class="grid gap-2">
            {#each block.items as _item, j}
              <div class="flex items-center gap-2">
                <input class={CELL} placeholder="Label" bind:value={block.items[j].label} />
                <input class={CELL} placeholder="Value" bind:value={block.items[j].value} />
                <button type="button" class={DEL} on:click={() => removeItem(block, j)} aria-label="Remove fact"><Trash2 size={14} /></button>
              </div>
            {/each}
          </div>
          <button type="button" class={ADD} on:click={() => addItem(block, { label: '', value: '' })}><Plus size={14} /> Add fact</button>
        </div>
      {:else if block.type === 'faq'}
        <div class="grid gap-3">
          <AdminFormInput label="Group title" name={`qt-${i}`} bind:value={block.title} />
          <div class="grid gap-3">
            {#each block.items as _item, j}
              <div class="grid gap-1.5 rounded-lg border border-ink/10 bg-sand/20 p-2.5">
                <div class="flex items-center gap-2">
                  <input class={CELL} placeholder="Question" bind:value={block.items[j].q} />
                  <button type="button" class={DEL} on:click={() => removeItem(block, j)} aria-label="Remove question"><Trash2 size={14} /></button>
                </div>
                <textarea class={CELL} rows="2" placeholder="Answer" bind:value={block.items[j].a}></textarea>
              </div>
            {/each}
          </div>
          <button type="button" class={ADD} on:click={() => addItem(block, { q: '', a: '' })}><Plus size={14} /> Add question</button>
        </div>
      {:else if block.type === 'table'}
        <div class="grid gap-3">
          <AdminFormInput label="Table title" name={`tt-${i}`} bind:value={block.title} />
          <div>
            <p class="mb-1 text-xs font-semibold text-ink/60">Columns</p>
            <div class="flex flex-wrap items-center gap-2">
              {#each block.columns as _col, ci}
                <div class="flex items-center gap-1">
                  <input class={`${CELL} w-36`} aria-label={`Column ${ci + 1} heading`} placeholder={`Col ${ci + 1}`} bind:value={block.columns[ci]} />
                  <button type="button" class={DEL} on:click={() => removeColumn(block, ci)} aria-label="Remove column"><Trash2 size={13} /></button>
                </div>
              {/each}
              <button type="button" class={ADD} on:click={() => addColumn(block)}><Plus size={14} /> Column</button>
            </div>
          </div>
          <div class="grid gap-2 overflow-x-auto">
            <p class="text-xs font-semibold text-ink/60">Rows</p>
            {#each block.rows as _row, ri}
              <div class="flex items-center gap-2">
                {#each block.columns as _c, ci}
                  <input class={`${CELL} min-w-[130px] flex-1`} aria-label={`Row ${ri + 1}, ${block.columns[ci] || `column ${ci + 1}`}`} placeholder={block.columns[ci] || `Col ${ci + 1}`} bind:value={block.rows[ri][ci]} />
                {/each}
                <button type="button" class={DEL} on:click={() => removeRow(block, ri)} aria-label="Remove row"><Trash2 size={14} /></button>
              </div>
            {/each}
            <button type="button" class={ADD} on:click={() => addRow(block)}><Plus size={14} /> Add row</button>
          </div>
        </div>
      {:else if block.type === 'tours' || block.type === 'lodges'}
        {@const noun = block.type === 'tours' ? 'itinerary' : 'stay'}
        <div class="grid gap-3">
          <AdminFormInput label="Title (optional)" name={`pt-${i}`} bind:value={block.title} placeholder={block.type === 'tours' ? 'Safaris that include this park' : 'Where to stay'} />
          <AdminTextArea label="Intro (optional)" name={`pi-${i}`} rows={2} bind:value={block.intro} />

          {#if picked(block).length}
            <div class="grid gap-1.5">
              <p class="text-xs font-semibold text-ink/60">Shown in this order · {picked(block).length} selected</p>
              {#each picked(block) as id, j (id)}
                {@const opt = labelOf(block, id)}
                <div class="flex items-center gap-2 rounded-md border border-ink/10 bg-sand/20 px-3 py-1.5 text-sm">
                  <span class="min-w-0 flex-1 truncate text-ink">{opt?.label ?? 'Existing selection (details unavailable)'}</span>
                  {#if opt && opt.status !== 'published'}<span class="text-[10px] font-bold uppercase text-clay">{opt.status} · hidden</span>{/if}
                  <button type="button" class="grid h-7 w-7 place-items-center rounded-md border border-ink/10 text-ink/60 disabled:opacity-30" on:click={() => movePick(block, j, -1)} disabled={j === 0} aria-label="Move up"><ArrowUp size={13} /></button>
                  <button type="button" class="grid h-7 w-7 place-items-center rounded-md border border-ink/10 text-ink/60 disabled:opacity-30" on:click={() => movePick(block, j, 1)} disabled={j === picked(block).length - 1} aria-label="Move down"><ArrowDown size={13} /></button>
                  <button type="button" class={DEL} on:click={() => togglePick(block, id)} aria-label={`Remove ${opt?.label ?? noun}`}><Trash2 size={13} /></button>
                </div>
              {/each}
            </div>
          {/if}

          <div class="grid gap-1.5">
            <input class={CELL} aria-label={`Search ${block.type === 'tours' ? 'itineraries' : 'accommodation'}`} placeholder={`Search ${block.type === 'tours' ? 'itineraries' : 'accommodation'}…`} bind:value={pickerQuery[i]} />
            <div class="grid max-h-56 gap-1 overflow-y-auto rounded-md border border-ink/10 p-2">
              {#each filtered(block, i, pickerQuery) as o (o.id)}
                <label class="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm text-ink/80 hover:bg-sand/40">
                  <input class="h-4 w-4 accent-forest" type="checkbox" checked={picked(block).includes(o.id)} on:change={() => togglePick(block, o.id)} />
                  <span class="min-w-0 flex-1 truncate">{o.label}</span>
                  {#if o.meta}<span class="shrink-0 text-xs text-ink/45">{o.meta}</span>{/if}
                  {#if o.status !== 'published'}<span class="shrink-0 text-[10px] font-bold uppercase text-clay">{o.status}</span>{/if}
                </label>
              {:else}
                <p class="px-1.5 py-2 text-xs text-ink/50">{!optionsLoaded ? 'Loading…' : optionsError || 'No matching records found.'}</p>
              {/each}
            </div>
            <p class="text-xs text-ink/50">Each card uses the {noun}'s own photo and details and links to its page. Drafts are kept but not shown until published.</p>
          </div>
        </div>
      {:else}
        <p class="text-sm text-ink/60">This block type is preserved as saved. Use the advanced JSON editor if you need to edit it.</p>
      {/if}
      </div>
      {/if}
    </div>
  {/each}

  <div class="flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-ink/20 bg-sand/20 p-3">
    <div class="min-w-[180px] flex-1">
      <AdminSelect label="Add a block" name="add-type" bind:value={addType} options={TYPES} />
    </div>
    <button type="button" class="inline-flex h-10 items-center gap-1.5 rounded-lg bg-forest px-4 text-sm font-bold text-white transition hover:bg-deep-green" on:click={addBlock}>
      <Plus size={16} /> Add block
    </button>
  </div>

  <div class="rounded-xl border border-ink/10">
    <button type="button" class="flex w-full items-center justify-between px-4 py-2.5 text-sm font-semibold text-ink/70" on:click={toggleJson}>
      Advanced: import / export JSON
      <span>{jsonOpen ? '−' : '+'}</span>
    </button>
    {#if jsonOpen}
      <div class="border-t border-ink/10 p-3">
        <p class="mb-3 text-xs leading-6 text-ink/60">For bulk editing and backups. Applying JSON replaces the guide in this form; nothing is saved until you save the destination.</p>
        <textarea aria-label="Guide JSON" class={`${CELL} font-mono text-xs`} rows="10" bind:value={jsonDraft}></textarea>
        {#if jsonError}
          <p class="mt-1 text-xs font-medium text-red-600">{jsonError}</p>
        {/if}
        <div class="mt-2 flex justify-end">
          <button type="button" class="rounded-lg bg-forest px-4 py-2 text-sm font-bold text-white transition hover:bg-deep-green" on:click={applyJson}>Apply JSON</button>
        </div>
      </div>
    {/if}
  </div>
</div>
