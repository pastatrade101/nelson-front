<script lang="ts" context="module">
  /** One gallery photograph while it is being edited. `key` is client-only and keeps rows stable across reorders. */
  export type GalleryItem = { key: string; image_url: string; alt_text: string; caption: string };

  export const toGalleryItems = (rows: Array<Record<string, unknown>>): GalleryItem[] =>
    rows
      .filter((r) => String(r.image_url ?? '').trim())
      .map((r) => ({
        key: crypto.randomUUID(),
        image_url: String(r.image_url ?? '').trim(),
        alt_text: String(r.alt_text ?? ''),
        caption: String(r.caption ?? '')
      }));
</script>

<script lang="ts">
  /**
   * A property's photo gallery, in the lodge editor.
   *
   * Ported from the goldfinch gallery editor: photos are added straight from
   * the media library (the picker appends and resets, so it works as a repeat
   * "add" control), duplicates are refused, and the cover is chosen explicitly
   * rather than by fiddling with arrows. The cover is simply the first photo —
   * the API stores is_cover for index 0.
   *
   * The parent owns loading and saving. `state` says whether the saved gallery
   * actually arrived: while it is 'loading' or 'failed' nothing here can be
   * edited, so a gallery that never loaded can never be saved back as empty.
   */
  import { createEventDispatcher } from 'svelte';
  import { ArrowDown, ArrowUp, ImagePlus, RotateCw, Star, Trash2 } from '@lucide/svelte';
  import { imgUrl } from '$lib/img';
  import MediaPicker from './MediaPicker.svelte';

  type MediaItem = { file_name: string; file_url: string; id: string; thumbnail_url?: string | null };

  export let images: GalleryItem[] = [];
  export let state: 'loading' | 'ready' | 'failed' = 'ready';
  export let media: MediaItem[] = [];
  export let uploadFolder = 'lodges';

  const dispatch = createEventDispatcher<{ retry: void }>();

  let picked = '';
  let notice = '';
  let undoSnapshot = '';

  const add = (url: string) => {
    const clean = (url ?? '').trim();
    picked = '';
    if (!clean) return;
    if (images.some((image) => image.image_url === clean)) {
      notice = 'That photo is already in the gallery.';
      return;
    }
    notice = '';
    images = [...images, { key: crypto.randomUUID(), image_url: clean, alt_text: '', caption: '' }];
  };

  const move = (index: number, delta: number) => {
    const to = index + delta;
    if (to < 0 || to >= images.length) return;
    const next = [...images];
    [next[index], next[to]] = [next[to], next[index]];
    images = next;
  };

  const makeCover = (index: number) => {
    if (index <= 0) return;
    const next = [...images];
    const [chosen] = next.splice(index, 1);
    images = [chosen, ...next];
  };

  const remove = (index: number) => {
    undoSnapshot = JSON.stringify(images);
    images = images.filter((_, at) => at !== index);
  };
</script>

<div class="grid gap-3 border border-ink/10 bg-sand/20 p-4">
  {#if undoSnapshot}<div role="status" class="flex items-center justify-between gap-3 bg-sand p-3 text-sm"><span>Photo removed. Undo restores the previous gallery.</span><button type="button" class="font-semibold text-forest underline" on:click={() => { images = JSON.parse(undoSnapshot); undoSnapshot = ''; }}>Undo removal</button></div>{/if}
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h3 class="text-base font-semibold text-ink">Photo gallery</h3>
      <p class="mt-1 text-sm text-ink/55">
        Shown as a row on every itinerary day that stays here. The cover leads; alt text describes each photo for
        screen readers and search, and the caption is optional.
      </p>
    </div>
    {#if state === 'ready'}
      <span class="text-xs font-semibold text-ink/45">{images.length} photo{images.length === 1 ? '' : 's'}</span>
    {/if}
  </div>

  {#if state === 'loading'}
    <p class="border border-dashed border-ink/20 px-4 py-6 text-center text-sm text-ink/55">Loading the gallery&hellip;</p>
  {:else if state === 'failed'}
    <div class="flex flex-wrap items-center justify-between gap-3 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <span>The gallery could not be loaded, so it will be left exactly as it is when you save.</span>
      <button class="inline-flex items-center gap-1.5 font-semibold underline-offset-2 hover:underline" type="button" on:click={() => dispatch('retry')}>
        <RotateCw size={14} /> Try again
      </button>
    </div>
  {:else}
    {#if images.length}
      <div class="grid gap-3 sm:grid-cols-2">
        {#each images as image, i (image.key)}
          <div class={`grid gap-2 border bg-surface p-3 ${i === 0 ? 'border-goldfinch-gold/60' : 'border-ink/10'}`}>
            <div class="relative aspect-[4/3] overflow-hidden bg-ink/5">
              <img class="h-full w-full object-cover" src={imgUrl(image.image_url, 480)} alt={image.alt_text} loading="lazy" />
              {#if i === 0}
                <span class="absolute left-2 top-2 inline-flex items-center gap-1 bg-goldfinch-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink">
                  <Star size={11} class="fill-ink" /> Cover
                </span>
              {/if}
            </div>
            <div class="flex items-center justify-between gap-2">
              {#if i === 0}
                <span class="text-xs font-semibold text-ink/45">Leads the gallery</span>
              {:else}
                <button class="inline-flex items-center gap-1 text-xs font-semibold text-forest hover:underline" type="button" on:click={() => makeCover(i)}>
                  <Star size={12} /> Make cover
                </button>
              {/if}
              <div class="flex items-center gap-1">
                <button class="grid h-7 w-7 place-items-center text-ink/45 transition hover:bg-sand hover:text-ink disabled:opacity-30" type="button" disabled={i === 0} on:click={() => move(i, -1)} aria-label="Move earlier"><ArrowUp size={14} /></button>
                <button class="grid h-7 w-7 place-items-center text-ink/45 transition hover:bg-sand hover:text-ink disabled:opacity-30" type="button" disabled={i === images.length - 1} on:click={() => move(i, 1)} aria-label="Move later"><ArrowDown size={14} /></button>
                <button class="grid h-7 w-7 place-items-center text-red-500 transition hover:bg-red-50 hover:text-red-700" type="button" on:click={() => remove(i)} aria-label="Remove photo"><Trash2 size={14} /></button>
              </div>
            </div>
            <label class="grid gap-1 text-xs font-medium text-ink/70">
              <span>Alt text</span>
              <input class="h-9 border border-ink/10 bg-surface px-2.5 text-sm text-ink outline-none transition focus:border-forest/40" bind:value={image.alt_text} placeholder="What the photograph shows" />
            </label>
            <label class="grid gap-1 text-xs font-medium text-ink/70">
              <span>Caption <span class="font-normal text-ink/40">(optional)</span></span>
              <input class="h-9 border border-ink/10 bg-surface px-2.5 text-sm text-ink outline-none transition focus:border-forest/40" bind:value={image.caption} placeholder="Shown under the photo where captions appear" />
            </label>
          </div>
        {/each}
      </div>
    {:else}
      <p class="border border-dashed border-ink/20 px-4 py-6 text-center text-sm text-ink/55">
        No gallery yet. Itinerary days fall back to the hero and card images above.
      </p>
    {/if}

    <div class="grid gap-1.5 border-t border-ink/10 pt-3">
      <p class="inline-flex items-center gap-1.5 text-sm font-semibold text-ink"><ImagePlus size={15} class="text-forest" /> Add a photo</p>
      <p class="text-xs text-ink/50">Pick or upload one; it joins the end of the gallery and the picker clears for the next.</p>
      <div class="max-w-xs">
        <MediaPicker label="" {media} {uploadFolder} aspect="aspect-[4/3]" commitUrlOnType={false} bind:value={picked} on:change={(e) => add(e.detail)} />
      </div>
      {#if notice}<p class="text-xs font-semibold text-clay">{notice}</p>{/if}
    </div>
  {/if}
</div>
