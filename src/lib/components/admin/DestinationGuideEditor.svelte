<script lang="ts">
  import { ArrowDown, ArrowUp, Plus, Trash2 } from '@lucide/svelte';
  import AdminFormInput from '$lib/components/admin/AdminFormInput.svelte';
  import AdminTextArea from '$lib/components/admin/AdminTextArea.svelte';
  import AdminSelect from '$lib/components/admin/AdminSelect.svelte';
  import MediaPicker from '$lib/components/admin/MediaPicker.svelte';

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
    { value: 'faq', label: 'FAQ group' }
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
      default: return { type: 'richtext', body: '' };
    }
  };

  let addType = 'part';
  const addBlock = () => { blocks = [...blocks, make(addType)]; };
  const removeBlock = (i: number) => { blocks = blocks.filter((_, idx) => idx !== i); };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j], next[i]];
    blocks = next;
  };

  // Table structure helpers.
  const addColumn = (b: any) => { b.columns = [...b.columns, '']; b.rows = b.rows.map((r: any[]) => [...r, '']); blocks = blocks; };
  const removeColumn = (b: any, ci: number) => { b.columns = b.columns.filter((_: any, k: number) => k !== ci); b.rows = b.rows.map((r: any[]) => r.filter((_: any, k: number) => k !== ci)); blocks = blocks; };
  const addRow = (b: any) => { b.rows = [...b.rows, b.columns.map(() => '')]; blocks = blocks; };
  const removeRow = (b: any, ri: number) => { b.rows = b.rows.filter((_: any, k: number) => k !== ri); blocks = blocks; };

  // Fact/FAQ item helpers.
  const addItem = (b: any, empty: any) => { b.items = [...b.items, { ...empty }]; blocks = blocks; };
  const removeItem = (b: any, j: number) => { b.items = b.items.filter((_: any, k: number) => k !== j); blocks = blocks; };

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
      if (!Array.isArray(parsed)) throw new Error('Must be a JSON array of blocks.');
      blocks = parsed;
      jsonError = '';
      jsonOpen = false;
    } catch (e) {
      jsonError = e instanceof Error ? e.message : 'Invalid JSON';
    }
  };
</script>

<div class="grid gap-4">
  {#if !blocks.length}
    <p class="rounded-xl border border-dashed border-ink/20 bg-sand/20 px-4 py-6 text-center text-sm text-ink/50">
      No guide blocks yet. Add your first block below, or import JSON.
    </p>
  {/if}

  {#each blocks as block, i (i)}
    <div class="rounded-xl border border-ink/12 bg-surface p-4">
      <div class="mb-3 flex items-center justify-between gap-2">
        <span class="rounded-md bg-forest/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-forest">
          {TYPE_LABEL[block.type] ?? block.type}
        </span>
        <div class="flex items-center gap-1">
          <button type="button" class="grid h-7 w-7 place-items-center rounded-md border border-ink/10 text-ink/60 transition hover:bg-sand disabled:opacity-30" on:click={() => move(i, -1)} disabled={i === 0} aria-label="Move up"><ArrowUp size={15} /></button>
          <button type="button" class="grid h-7 w-7 place-items-center rounded-md border border-ink/10 text-ink/60 transition hover:bg-sand disabled:opacity-30" on:click={() => move(i, 1)} disabled={i === blocks.length - 1} aria-label="Move down"><ArrowDown size={15} /></button>
          <button type="button" class={DEL} on:click={() => removeBlock(i)} aria-label="Delete block"><Trash2 size={15} /></button>
        </div>
      </div>

      {#if block.type === 'part'}
        <div class="grid gap-3 sm:grid-cols-[120px_1fr]">
          <AdminFormInput label="Part number" name={`part-${i}`} type="number" bind:value={block.part} />
          <AdminFormInput label="Title" name={`title-${i}`} bind:value={block.title} />
        </div>
      {:else if block.type === 'richtext'}
        <div class="grid gap-3">
          <AdminFormInput label="Heading (optional)" name={`h-${i}`} bind:value={block.heading} />
          <AdminTextArea label="Body" name={`body-${i}`} rows={5} bind:value={block.body} />
        </div>
      {:else if block.type === 'field_notes'}
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
                  <input class={`${CELL} w-36`} placeholder={`Col ${ci + 1}`} bind:value={block.columns[ci]} />
                  <button type="button" class={DEL} on:click={() => removeColumn(block, ci)} aria-label="Remove column"><Trash2 size={13} /></button>
                </div>
              {/each}
              <button type="button" class={ADD} on:click={() => addColumn(block)}><Plus size={14} /> Column</button>
            </div>
          </div>
          <div class="grid gap-2">
            <p class="text-xs font-semibold text-ink/60">Rows</p>
            {#each block.rows as _row, ri}
              <div class="flex items-center gap-2">
                {#each block.columns as _c, ci}
                  <input class={`${CELL} flex-1`} placeholder={block.columns[ci] || `Col ${ci + 1}`} bind:value={block.rows[ri][ci]} />
                {/each}
                <button type="button" class={DEL} on:click={() => removeRow(block, ri)} aria-label="Remove row"><Trash2 size={14} /></button>
              </div>
            {/each}
            <button type="button" class={ADD} on:click={() => addRow(block)}><Plus size={14} /> Add row</button>
          </div>
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
        <textarea class={`${CELL} font-mono text-xs`} rows="10" bind:value={jsonDraft}></textarea>
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
