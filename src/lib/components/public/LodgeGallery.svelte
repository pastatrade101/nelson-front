<script lang="ts">
  /**
   * Property gallery — a large lead image with supporting shots beside it, and a
   * lightbox for the rest.
   *
   * Ported from goldfinch and adapted to this codebase's ResponsiveImage, which
   * takes a URL rather than a record/fields pair. Only the lead and four
   * supporting shots are laid out; the remainder are reachable through the
   * lightbox, so a property with a dozen photographs does not cost a dozen
   * full-size downloads to look at one.
   */
  import { onDestroy, tick } from 'svelte';
  import { ChevronLeft, ChevronRight, Expand, X } from '@lucide/svelte';
  import ResponsiveImage from './ResponsiveImage.svelte';
  import type { LodgeImage } from '$lib/types';

  export let images: LodgeImage[] = [];
  export let propertyName = '';

  let open = false;
  let index = 0;
  let dialog: HTMLDivElement;
  let previouslyFocused: HTMLElement | null = null;

  // The cover leads; everything else follows in its saved order.
  $: ordered = [...images]
    .filter((i) => (i.image_url ?? '').trim())
    .sort((a, b) => Number(b.is_cover ?? false) - Number(a.is_cover ?? false));
  $: lead = ordered[0];
  $: supporting = ordered.slice(1, 5);
  $: extra = Math.max(0, ordered.length - 5);

  const alt = (image: LodgeImage, position: number) =>
    image.alt_text || (propertyName ? `${propertyName} — photo ${position + 1}` : '');

  const show = async (at: number) => {
    previouslyFocused = document.activeElement as HTMLElement | null;
    index = at;
    open = true;
    await tick();
    dialog?.focus();
  };

  const close = () => {
    open = false;
    previouslyFocused?.focus();
    previouslyFocused = null;
  };

  const step = (delta: number) => {
    index = (index + delta + ordered.length) % ordered.length;
  };

  const onKeydown = (event: KeyboardEvent) => {
    if (!open) return;
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    if (event.key === 'ArrowRight') { event.preventDefault(); step(1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1); }
  };

  // The page scrolls behind an open lightbox otherwise.
  $: if (typeof document !== 'undefined') {
    document.body.style.overflow = open ? 'hidden' : '';
  }

  onDestroy(() => {
    if (typeof document !== 'undefined') document.body.style.overflow = '';
  });
</script>

<svelte:window on:keydown={onKeydown} />

{#if lead}
  <div class="grid gap-2 sm:grid-cols-[1.6fr_1fr]">
    <button
      type="button"
      class="group relative block overflow-hidden bg-linen"
      on:click={() => show(0)}
      aria-label={`Open ${propertyName || 'gallery'} — photo 1`}
    >
      <ResponsiveImage
        src={lead.image_url ?? ''}
        alt={alt(lead, 0)}
        width={1100}
        sizes="(min-width:640px) 55vw, 100vw"
        imgClass="aspect-[4/3] w-full object-cover transition duration-700 group-hover:scale-[1.03]"
      />
      <span class="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1.5 bg-ink/70 px-2.5 py-1.5 text-[11px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
        <Expand size={13} /> View
      </span>
    </button>

    {#if supporting.length}
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-1 sm:grid-rows-2">
        {#each supporting.slice(0, 2) as image, n (image.id ?? n)}
          <button
            type="button"
            class="group relative block overflow-hidden bg-linen"
            on:click={() => show(n + 1)}
            aria-label={`Open ${propertyName || 'gallery'} — photo ${n + 2}`}
          >
            <ResponsiveImage
              src={image.image_url ?? ''}
              alt={alt(image, n + 1)}
              width={560}
              sizes="(min-width:640px) 28vw, 50vw"
              imgClass="aspect-[4/3] h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
            />
            {#if n === 1 && extra > 0}
              <span class="absolute inset-0 grid place-items-center bg-ink/55 text-sm font-semibold text-white">
                +{extra} more
              </span>
            {/if}
          </button>
        {/each}
      </div>
    {/if}
  </div>
{/if}

{#if open && ordered.length}
  <div
    bind:this={dialog}
    class="fixed inset-0 z-[100] grid place-items-center bg-ink/92 p-4"
    role="dialog"
    aria-modal="true"
    aria-label={`${propertyName} gallery`}
    tabindex="-1"
    on:click|self={close}
    on:keydown={onKeydown}
  >
    <button
      class="absolute right-4 top-4 grid h-11 w-11 place-items-center border border-white/25 text-white transition hover:bg-white/10"
      type="button"
      on:click={close}
      aria-label="Close gallery"
    >
      <X size={18} />
    </button>

    <figure class="max-h-full w-full max-w-5xl">
      <ResponsiveImage
        src={ordered[index].image_url ?? ''}
        alt={alt(ordered[index], index)}
        width={1600}
        sizes="90vw"
        imgClass="max-h-[76vh] w-full object-contain"
      />
      {#if ordered[index].caption}
        <figcaption class="mt-3 text-center text-sm text-white/70">{ordered[index].caption}</figcaption>
      {/if}
      <p class="mt-2 text-center text-xs text-white/45">{index + 1} of {ordered.length}</p>
    </figure>

    {#if ordered.length > 1}
      <button
        class="absolute left-3 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center border border-white/25 text-white transition hover:bg-white/10 md:left-6"
        type="button"
        on:click|stopPropagation={() => step(-1)}
        aria-label="Previous photo"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        class="absolute right-3 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center border border-white/25 text-white transition hover:bg-white/10 md:right-6"
        type="button"
        on:click|stopPropagation={() => step(1)}
        aria-label="Next photo"
      >
        <ChevronRight size={20} />
      </button>
    {/if}
  </div>
{/if}
