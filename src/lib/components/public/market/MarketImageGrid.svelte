<script lang="ts">
  import { origUrl, thumbUrl } from '$lib/img';
  import ResponsiveImage from '../ResponsiveImage.svelte';

  // Square 3-up gallery with an optional caption in a bottom gradient bar.
  // REAL DATA ONLY: images come from the media library via an admin. An entry
  // with no image_url is dropped (a caption alone cannot make a tile), and the
  // section hides entirely when nothing has been uploaded.
  export let eyebrow = '';
  export let title = '';
  export let images: { image_url?: string; caption?: string }[] = [];

  $: shown = (images ?? []).filter((image) => image && image.image_url);
</script>

{#if shown.length}
  <section class="bg-canvas py-12 md:py-16">
    <div class="container-shell">
      {#if eyebrow || title}
        <div class="max-w-[820px]">
          {#if eyebrow}
            <p class="brand-eyebrow">{eyebrow}</p>
          {/if}
          {#if title}
            <h2 class="mt-4 font-serif text-[32px] font-light leading-[1.1] text-heading md:text-[44px]">{title}</h2>
          {/if}
        </div>
      {/if}

      <div class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {#each shown as image}
          <figure class="group relative aspect-square overflow-hidden bg-sand">
            <ResponsiveImage
              src={origUrl(image, 'image_url')}
              fallbackSrc={thumbUrl(image, 'image_url')}
              width={800}
              alt={image.caption || ''}
              imgClass="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
              sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
            />
            {#if image.caption}
              <figcaption
                class="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,rgba(28,26,22,0)_0%,rgba(28,26,22,0.85)_100%)] p-5 pt-12 text-[13px] font-semibold leading-6 text-white"
              >
                {image.caption}
              </figcaption>
            {/if}
          </figure>
        {/each}
      </div>
    </div>
  </section>
{/if}
