<script lang="ts">
  /**
   * The destination page's own sections: how headings name the place, the
   * "in short" summary, the three "why" cards, "your way" (one section per
   * kind of traveller), a guide's quote and the destinations it pairs with.
   * Every field is optional: a section left empty is simply not shown.
   */
  import { ArrowDown, ArrowUp, Plus, Trash2 } from '@lucide/svelte';
  import { emptyWay, type EditablePage } from '$lib/admin/destination-form';
  import AdminFormInput from './AdminFormInput.svelte';
  import AdminTextArea from './AdminTextArea.svelte';
  import MediaPicker from './MediaPicker.svelte';

  type MediaItem = { file_name: string; file_url: string; id: string; thumbnail_url?: string | null };

  export let page: EditablePage;
  export let media: MediaItem[] = [];
  /** The other destinations, for "Pairs well with". */
  export let destinations: { slug: string; name: string }[] = [];

  const MAX_PAIRS = 4;

  const addWay = () => (page.ways = [...page.ways, emptyWay()]);
  const removeWay = (i: number) => (page.ways = page.ways.filter((_, n) => n !== i));
  const moveWay = (i: number, by: number) => {
    const ways = [...page.ways];
    [ways[i], ways[i + by]] = [ways[i + by], ways[i]];
    page.ways = ways;
  };
  const togglePair = (slug: string) => {
    page.pairs_with = page.pairs_with.includes(slug)
      ? page.pairs_with.filter((s) => s !== slug)
      : [...page.pairs_with, slug].slice(0, MAX_PAIRS);
  };
  $: nameOf = (slug: string) => destinations.find((d) => d.slug === slug)?.name ?? slug;
</script>

<p class="border-l-[3px] border-emnel-gold bg-sand/30 px-4 py-3 text-[13px] leading-[1.7] text-ink/70">
  These sections sit at the top of the destination page, above the travel guide. Fill in what you know to be true; any section left empty is hidden from visitors.
</p>

<div class="grid gap-3.5 rounded-[10px] border border-ink/10 p-5">
  <h4 class="text-[15px] font-semibold">Name and summary</h4>
  <div class="grid gap-5 sm:grid-cols-2">
    <div>
      <AdminFormInput label="Name in headings" name="page_short_name" bind:value={page.short_name} placeholder="e.g. the Serengeti" />
      <p class="mt-2 text-xs text-ink/50">Used in headings such as “Why the Serengeti” and “Plan my Serengeti safari”. Empty: the destination name.</p>
    </div>
    <div>
      <AdminFormInput label="Reviewed by" name="page_reviewed_by" bind:value={page.reviewed_by} placeholder="e.g. Joseph, Emnel guide" />
      <p class="mt-2 text-xs text-ink/50">Shown with the “Last reviewed” date from the Travel guide section.</p>
    </div>
  </div>
  <div>
    <AdminTextArea label="In short" name="page_in_short" bind:value={page.in_short} rows={4} placeholder="Three or four factual sentences: size, what it is known for, how people get there, how long they stay." />
    <p class="mt-2 text-xs text-ink/50">Shown in the summary card with the guide's quick facts.</p>
  </div>
</div>

<div class="grid gap-3.5 rounded-[10px] border border-ink/10 p-5">
  <h4 class="text-[15px] font-semibold">“Why go” cards</h4>
  <p class="text-[13px] leading-[1.65] text-ink/60">Up to three short reasons to go, shown under the destination overview. A card without a title is left out.</p>
  <div class="grid gap-5 lg:grid-cols-3">
    {#each page.highlights as item, i (i)}
      <div class="grid content-start gap-3">
        <AdminFormInput label={`Card ${i + 1} title`} name={`page_highlight_${i}_title`} bind:value={item.title} placeholder={i === 0 ? 'e.g. The Great Migration' : ''} />
        <AdminTextArea label={`Card ${i + 1} text`} name={`page_highlight_${i}_text`} bind:value={item.text} rows={3} />
      </div>
    {/each}
  </div>
</div>

<div class="grid gap-3.5 rounded-[10px] border border-ink/10 p-5">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h4 class="text-[15px] font-semibold">“Your way”</h4>
      <p class="mt-1 text-[13px] leading-[1.65] text-ink/60">One section per kind of traveller: families, couples, luxury, photographers, a first safari. Photographs alternate sides.</p>
    </div>
    <button type="button" class="inline-flex h-9 items-center gap-1.5 rounded-md border border-ink/15 px-3 text-[13px] font-semibold hover:bg-sand/40" on:click={addWay}>
      <Plus size={15} /> Add a section
    </button>
  </div>
  {#each page.ways as way, i (i)}
    <div class="grid gap-4 rounded-md border border-ink/10 bg-sand/10 p-4">
      <div class="flex items-center justify-between gap-3">
        <p class="text-[13px] font-semibold text-ink/70">{way.title || way.label || `Section ${i + 1}`}</p>
        <div class="flex gap-1">
          <button type="button" class="grid h-8 w-8 place-items-center rounded border border-ink/10 disabled:opacity-30" disabled={i === 0} aria-label="Move up" on:click={() => moveWay(i, -1)}><ArrowUp size={14} /></button>
          <button type="button" class="grid h-8 w-8 place-items-center rounded border border-ink/10 disabled:opacity-30" disabled={i === page.ways.length - 1} aria-label="Move down" on:click={() => moveWay(i, 1)}><ArrowDown size={14} /></button>
          <button type="button" class="grid h-8 w-8 place-items-center rounded border border-ink/10 text-red-700" aria-label="Remove this section" on:click={() => removeWay(i)}><Trash2 size={14} /></button>
        </div>
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <AdminFormInput label="Small label" name={`page_way_${i}_label`} bind:value={way.label} placeholder="e.g. Families" />
        <AdminFormInput label="Heading" name={`page_way_${i}_title`} bind:value={way.title} placeholder="e.g. The Serengeti for families" />
      </div>
      <div>
        <AdminTextArea label="Text" name={`page_way_${i}_body`} bind:value={way.body} rows={6} />
        <p class="mt-2 text-xs text-ink/50">Leave a blank line between paragraphs.</p>
      </div>
      <div class="grid items-start gap-4 sm:grid-cols-2">
        <MediaPicker label="Photograph" {media} uploadFolder="destinations" bind:value={way.image_url} aspect="aspect-[4/5]" />
        <div class="grid gap-4">
          <AdminFormInput label="Photograph description" name={`page_way_${i}_image_alt`} bind:value={way.image_alt} placeholder="What the photograph shows" />
          <AdminFormInput label="Nights" name={`page_way_${i}_nights`} bind:value={way.nights} placeholder="e.g. 3, in one central camp" />
          <AdminFormInput label="Best area" name={`page_way_${i}_best_area`} bind:value={way.best_area} placeholder="e.g. Central Serengeti" />
          <div class="grid grid-cols-2 gap-3">
            <AdminFormInput label="Third fact: label" name={`page_way_${i}_extra_label`} bind:value={way.extra_label} placeholder="Pair with" />
            <AdminFormInput label="Third fact: value" name={`page_way_${i}_extra_value`} bind:value={way.extra_value} placeholder="e.g. Tarangire, Zanzibar" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <AdminFormInput label="Link text" name={`page_way_${i}_link_label`} bind:value={way.link_label} placeholder="e.g. Explore family safaris" />
            <AdminFormInput label="Link address" name={`page_way_${i}_link_href`} bind:value={way.link_href} placeholder="/tours?style=family" />
          </div>
        </div>
      </div>
    </div>
  {:else}
    <p class="text-[13px] text-ink/50">No sections yet.</p>
  {/each}
</div>

<div class="grid gap-3.5 rounded-[10px] border border-ink/10 p-5">
  <h4 class="text-[15px] font-semibold">A guide's words</h4>
  <p class="text-[13px] leading-[1.65] text-ink/60">One line from one of your guides, in their own words, with their permission. Shown only when the quote is filled in.</p>
  <AdminTextArea label="Quote" name="page_quote" bind:value={page.guide_quote.quote} rows={3} />
  <div class="grid items-start gap-4 sm:grid-cols-2">
    <div class="grid gap-4">
      <AdminFormInput label="Name" name="page_quote_name" bind:value={page.guide_quote.name} />
      <AdminFormInput label="Role" name="page_quote_role" bind:value={page.guide_quote.role} placeholder="e.g. Emnel guide, Arusha" />
    </div>
    <MediaPicker label="Photograph" {media} uploadFolder="destinations" bind:value={page.guide_quote.image_url} aspect="aspect-[4/3]" />
  </div>
</div>

<div class="grid gap-3.5 rounded-[10px] border border-ink/10 p-5">
  <h4 class="text-[15px] font-semibold">Pairs well with</h4>
  <p class="text-[13px] leading-[1.65] text-ink/60">
    Up to {MAX_PAIRS}, in the order you pick them. Shown under the page title and in “Complete the journey”. None picked: the destinations the travel guide links to.
  </p>
  {#if page.pairs_with.length}
    <p class="text-[13px] font-semibold text-ink">{page.pairs_with.map(nameOf).join(' · ')}</p>
  {/if}
  <div class="grid max-h-64 gap-1 overflow-y-auto rounded-md border border-ink/10 p-2 sm:grid-cols-2">
    {#each destinations as d (d.slug)}
      {@const picked = page.pairs_with.includes(d.slug)}
      <label class={`flex min-h-9 items-center gap-2.5 rounded px-2 text-[13px] ${picked ? 'bg-sand/40 font-semibold' : ''} ${!picked && page.pairs_with.length >= MAX_PAIRS ? 'opacity-40' : 'hover:bg-sand/25'}`}>
        <input type="checkbox" class="h-4 w-4 accent-forest" checked={picked} disabled={!picked && page.pairs_with.length >= MAX_PAIRS} on:change={() => togglePair(d.slug)} />
        {d.name}
      </label>
    {/each}
  </div>
</div>
