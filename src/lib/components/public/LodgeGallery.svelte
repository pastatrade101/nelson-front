<script lang="ts">
  /**
   * Property gallery — a large lead image with supporting shots beside it, and a
   * lightbox for the rest.
   *
   * Built on ResponsiveImage, which takes a URL. Only the lead and four
   * supporting shots are laid out; the remainder are reachable through the
   * lightbox, so a property with a dozen photographs does not cost a dozen
   * full-size downloads to look at one.
   */
  import { Expand } from '@lucide/svelte';
  import PhotoLightbox from './PhotoLightbox.svelte';
  import ResponsiveImage from './ResponsiveImage.svelte';
  import type { LodgeImage } from '$lib/types';

  export let images: LodgeImage[] = [];
  export let propertyName = '';

  let viewer: PhotoLightbox;

  // The cover leads, then the saved order; the same photograph is never shown
  // twice (the embed returns rows unordered, and a URL can be saved twice).
  $: ordered = (() => {
    const seen = new Set<string>();
    return [...images]
      .filter((i) => (i.image_url ?? '').trim())
      .sort(
        (a, b) =>
          Number(b.is_cover ?? false) - Number(a.is_cover ?? false) || (a.sort_order ?? 0) - (b.sort_order ?? 0)
      )
      .filter((i) => {
        const url = (i.image_url ?? '').trim();
        return !seen.has(url) && Boolean(seen.add(url));
      });
  })();
  $: lead = ordered[0];
  // The grid lays out the lead and two supporting shots; the rest are in the lightbox.
  $: supporting = ordered.slice(1, 3);
  $: extra = Math.max(0, ordered.length - 3);

  const alt = (image: LodgeImage, position: number) =>
    image.alt_text || image.caption || (propertyName ? `${propertyName} — photo ${position + 1}` : '');

  const show = (at: number) => viewer.show(at);
  $: photos = ordered.map((image, n) => ({ url: image.image_url ?? '', alt: alt(image, n), caption: image.caption }));
</script>

{#if lead}
  <div class={`grid gap-2 ${supporting.length ? 'sm:grid-cols-[1.6fr_1fr]' : ''}`}>
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
        sizes={supporting.length ? '(min-width:640px) 55vw, 100vw' : '100vw'}
        imgClass={`${supporting.length ? 'aspect-[4/3]' : 'aspect-[16/9]'} w-full object-cover transition duration-700 group-hover:scale-[1.03]`}
      />
      <span class="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1.5 bg-ink/70 px-2.5 py-1.5 text-[11px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
        <Expand size={13} /> View
      </span>
    </button>

    {#if supporting.length}
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-1 sm:grid-rows-2">
        {#each supporting as image, n (image.id ?? image.image_url ?? n)}
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
            {#if n === supporting.length - 1 && extra > 0}
              <span class="absolute inset-0 grid place-items-center bg-ink/55 text-sm font-semibold text-white">
                +{extra} more
              </span>
            {/if}
          </button>
        {/each}
      </div>
    {/if}
  </div>
  {#if lead.caption}
    <p class="mt-3 text-[13px] leading-6 text-ink/55">{lead.caption}</p>
  {/if}
{/if}

<PhotoLightbox bind:this={viewer} {photos} label={`${propertyName} gallery`} />
