<script context="module" lang="ts">
  export type LightboxPhoto = { url: string; alt: string; caption?: string | null };
</script>

<script lang="ts">
  /**
   * Full-screen photo viewer: one photograph at a time, arrows, arrow keys or a
   * swipe to move, Escape or the backdrop to close. The caller opens it with
   * `show(index)` (bind:this); an optional slot sits under the counter.
   *
   * It is rendered into <body>: a section that fades in with a transform
   * becomes the containing block for `position: fixed` and caps its z-index,
   * so inside the section the viewer was clipped to the section's box and
   * later sections drew over it.
   */
  import { onDestroy, tick } from 'svelte';
  import { ChevronLeft, ChevronRight, X } from '@lucide/svelte';
  import ResponsiveImage from './ResponsiveImage.svelte';

  export let photos: LightboxPhoto[] = [];
  /** Accessible name of the dialog, e.g. "Giraffe Manor photos". */
  export let label = 'Photos';

  let open = false;
  let index = 0;
  let dialog: HTMLDivElement;
  let previouslyFocused: HTMLElement | null = null;
  let touchX: number | null = null;

  export const show = async (at = 0) => {
    if (!photos.length) return;
    previouslyFocused = document.activeElement as HTMLElement | null;
    index = Math.min(Math.max(at, 0), photos.length - 1);
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
    index = (index + delta + photos.length) % photos.length;
  };

  // On the dialog only (it takes focus on open): a window listener as well
  // would move two photos per key press.
  const onKeydown = (event: KeyboardEvent) => {
    if (!open) return;
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    if (event.key === 'ArrowRight') { event.preventDefault(); step(1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1); }
  };

  // A horizontal swipe of 50px or more moves one photo.
  const onTouchStart = (event: TouchEvent) => (touchX = event.touches[0]?.clientX ?? null);
  const onTouchEnd = (event: TouchEvent) => {
    const end = event.changedTouches[0]?.clientX;
    if (touchX != null && end != null && Math.abs(end - touchX) >= 50 && photos.length > 1) step(end < touchX ? 1 : -1);
    touchX = null;
  };

  const toBody = (node: HTMLElement) => {
    document.body.appendChild(node);
    return { destroy: () => node.remove() };
  };

  // The page scrolls behind an open viewer otherwise.
  $: if (typeof document !== 'undefined') {
    document.body.style.overflow = open ? 'hidden' : '';
  }

  onDestroy(() => {
    if (typeof document !== 'undefined') document.body.style.overflow = '';
  });

  $: photo = photos[index];
</script>

{#if open && photo}
  <div
    bind:this={dialog}
    use:toBody
    class="fixed inset-0 z-[100] grid place-items-center bg-ink/[0.92] p-4"
    role="dialog"
    aria-modal="true"
    aria-label={label}
    tabindex="-1"
    on:click|self={close}
    on:keydown={onKeydown}
    on:touchstart|passive={onTouchStart}
    on:touchend={onTouchEnd}
  >
    <button
      class="absolute right-4 top-4 grid h-11 w-11 place-items-center border border-white/25 text-white transition hover:bg-white/10"
      type="button"
      on:click={close}
      aria-label="Close photos"
    >
      <X size={18} />
    </button>

    <figure class="max-h-full w-full max-w-5xl">
      <ResponsiveImage src={photo.url} alt={photo.alt} width={1600} sizes="90vw" imgClass="max-h-[76vh] w-full object-contain" />
      {#if photo.caption}
        <figcaption class="mt-3 text-center text-sm text-white/70">{photo.caption}</figcaption>
      {/if}
      <p class="mt-2 text-center text-xs text-white/45">{index + 1} of {photos.length}</p>
      <slot />
    </figure>

    {#if photos.length > 1}
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
