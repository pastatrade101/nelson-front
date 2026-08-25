<script lang="ts">
  import { origUrl, thumbUrl } from '$lib/img';
  import ResponsiveImage from '../ResponsiveImage.svelte';

  // Accommodation tiers — "Where you'll stay".
  // REAL DATA ONLY: the mockup's HOTEL_6_DAY placeholder is NOT reproduced.
  // Lodge/camp names must be entered by an admin; this component never supplies
  // an example, a default tier, or invented prose. A tier with no image simply
  // renders without one, and the section hides entirely when there are no tiers.
  export let eyebrow = '';
  export let title = '';
  export let intro = '';
  export let tiers: { label?: string; title?: string; body?: string; image_url?: string }[] = [];

  $: shown = (tiers ?? []).filter((tier) => tier && (tier.label || tier.title || tier.body || tier.image_url));

  // Full literal class strings so Tailwind's scanner keeps them.
  const colsFor = (n: number): string => (n <= 1 ? '' : n === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3');
  $: gridClass = colsFor(shown.length);
</script>

{#if shown.length}
  <section class="bg-canvas py-12 md:py-16">
    <div class="container-shell">
      {#if eyebrow || title || intro}
        <div class="max-w-[820px]">
          {#if eyebrow}
            <p class="brand-eyebrow">{eyebrow}</p>
          {/if}
          {#if title}
            <h2 class="mt-4 font-serif text-[32px] font-light leading-[1.1] text-heading md:text-[44px]">{title}</h2>
          {/if}
          {#if intro}
            <p class="mt-5 text-[15px] leading-8 text-ink/70">{intro}</p>
          {/if}
        </div>
      {/if}

      <div class={`mt-10 grid gap-6 ${gridClass}`}>
        {#each shown as tier}
          <article class="group flex flex-col border border-ink/10 bg-surface shadow-soft">
            {#if tier.image_url}
              <div class="relative aspect-[4/3] overflow-hidden bg-sand">
                <ResponsiveImage
                  src={origUrl(tier, 'image_url')}
                  fallbackSrc={thumbUrl(tier, 'image_url')}
                  width={800}
                  alt={tier.title || tier.label || ''}
                  imgClass="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
                />
              </div>
            {/if}
            <div class="flex flex-1 flex-col p-7">
              {#if tier.label}
                <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-goldfinch-gold">{tier.label}</p>
              {/if}
              {#if tier.title}
                <h3 class="mt-3 font-serif text-[23px] font-light leading-snug text-heading">{tier.title}</h3>
              {/if}
              {#if tier.body}
                <p class="mt-3 text-[14.5px] leading-7 text-ink/70">{tier.body}</p>
              {/if}
            </div>
          </article>
        {/each}
      </div>
    </div>
  </section>
{/if}
