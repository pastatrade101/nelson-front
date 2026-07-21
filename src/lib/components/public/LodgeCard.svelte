<script lang="ts">
  import { ExternalLink, Sparkles, Star } from '@lucide/svelte';
  import { tilt } from '$lib/animations';
  import { imgUrl, thumbUrl } from '$lib/img';
  import type { Lodge } from '$lib/types';

  export let lodge: Lodge;

  const levelLabels: Record<string, string> = {
    budget: 'Budget',
    mid_range: 'Mid-range',
    luxury: 'Luxury',
    ultra_luxury: 'Ultra-luxury'
  };
  const typeLabels: Record<string, string> = {
    tented_camp: 'Tented camp',
    lodge: 'Lodge',
    hotel: 'Hotel',
    mobile_camp: 'Mobile camp',
    treehouse: 'Treehouse'
  };

  $: imageUrl = thumbUrl(lodge, 'image_url', 'hero_image_url');
  $: priceLabel =
    lodge.price_per_night_from != null
      ? `${lodge.currency ?? 'USD'} ${Math.round(lodge.price_per_night_from).toLocaleString()}`
      : '';
</script>

<article class="group flex h-full flex-col overflow-hidden rounded-none border border-ink/10 bg-surface shadow-[0_14px_40px_rgba(28,26,22,0.07)] transition-shadow duration-300 hover:shadow-[0_26px_60px_rgba(28,26,22,0.16)]" use:tilt={{ max: 5 }}>
  <div class="relative aspect-[4/3] overflow-hidden bg-skywash">
    {#if imageUrl}
      <img class="h-full w-full object-cover transition-transform duration-[800ms] ease-out group-hover:scale-110" src={imgUrl(imageUrl, 700)} alt={lodge.name} loading="lazy" decoding="async" />
    {/if}
    {#if lodge.is_featured}
      <span class="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-goldfinch-gold px-2.5 py-1 text-[11px] font-bold text-heading shadow">
        <Sparkles size={12} /> Recommended
      </span>
    {/if}
  </div>
  <div class="flex flex-1 flex-col p-5">
    <p class="text-xs font-semibold uppercase tracking-[0.12em] text-clay">
      {levelLabels[lodge.accommodation_level] ?? lodge.accommodation_level} · {typeLabels[lodge.lodge_type] ?? lodge.lodge_type}
    </p>
    <h3 class="mt-2 text-lg font-bold tracking-normal text-ink">{lodge.name}</h3>
    {#if lodge.why_we_recommend}
      <p class="mt-2 line-clamp-3 text-sm leading-6 text-ink/70">{lodge.why_we_recommend}</p>
    {:else if lodge.description}
      <p class="mt-2 line-clamp-3 text-sm leading-6 text-ink/70">{lodge.description}</p>
    {/if}

    {#if lodge.best_for?.length}
      <div class="mt-3 flex flex-wrap gap-1.5">
        {#each lodge.best_for.slice(0, 3) as tag}
          <span class="rounded-full bg-sand px-2.5 py-1 text-[11px] font-semibold text-forest">{tag}</span>
        {/each}
      </div>
    {/if}

    {#if lodge.website_url}
      <a class="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-forest transition-colors hover:text-forest/70" href={lodge.website_url} target="_blank" rel="noopener">
        <ExternalLink size={14} /> Visit website
      </a>
    {/if}

    <div class="mt-auto flex items-center justify-between pt-4">
      {#if priceLabel}
        <p class="text-sm text-ink/70">
          <span class="font-bold text-ink">{priceLabel}</span> / night
        </p>
      {:else}
        <span></span>
      {/if}
      {#if lodge.romantic_rating != null || lodge.family_rating != null}
        <span class="inline-flex items-center gap-1 text-sm font-semibold text-goldfinch-gold">
          <Star size={14} fill="currentColor" />
          {Math.max(lodge.romantic_rating ?? 0, lodge.family_rating ?? 0).toFixed(1)}
        </span>
      {/if}
    </div>
  </div>
</article>
