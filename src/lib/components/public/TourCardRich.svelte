<script lang="ts">
  import { ArrowRight, MapPin, Star } from '@lucide/svelte';
  import { tilt } from '$lib/animations';
  import ShortlistButton from './ShortlistButton.svelte';
  import type { Tour } from '$lib/types';

  export let tour: Tour;

  const tierLabels: Record<string, string> = {
    budget: 'Budget',
    mid_range: 'Mid-range',
    'mid-range': 'Mid-range',
    midrange: 'Mid-range',
    luxury: 'Luxury',
    luxury_plus: 'Luxury+',
    'luxury-plus': 'Luxury+',
    ultra_luxury: 'Luxury+'
  };

  $: country = tour.destinations?.country || tour.destinations?.name || '';
  $: comfort = tour.budget_tier ? tierLabels[tour.budget_tier] ?? tour.budget_tier : '';
  $: durationLabel =
    tour.duration_days != null
      ? `${tour.duration_days}-Day${tour.duration_nights ? `, ${tour.duration_nights} nights` : ''}`
      : '';
  // "You Visit:" route — start → highlights → end (falls back to destination).
  $: stops = [
    ...(tour.start_location ? [`${tour.start_location} (Start)`] : []),
    ...((tour.highlights ?? []).slice(0, 3)),
    ...(tour.end_location ? [`${tour.end_location} (End)`] : [])
  ];
  $: metaBits = [country, comfort, durationLabel].filter(Boolean);

  $: item = {
    slug: tour.slug,
    title: tour.title,
    image_url: tour.main_image_url,
    duration_days: tour.duration_days,
    price_from: tour.price_from,
    currency: tour.currency,
    destination: tour.destinations?.name
  };
</script>

<article class="group relative flex h-full flex-col overflow-hidden rounded-[12px] border border-ink/10 bg-surface shadow-[0_14px_40px_rgba(15,47,36,0.07)] transition-shadow duration-300 hover:shadow-[0_26px_60px_rgba(15,47,36,0.16)]" use:tilt={{ max: 5 }}>
  <div class="absolute right-3 top-3 z-10">
    <ShortlistButton {item} />
  </div>

  <a href={`/tours/${tour.slug}`} class="flex h-full flex-col">
    <!-- Image + overlay title + badges -->
    <div class="relative aspect-[16/10] overflow-hidden bg-skywash">
      {#if tour.main_image_url}
        <img class="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" src={tour.main_image_url} alt={tour.title} loading="lazy" />
      {/if}
      <div class="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-deep-green/90 via-deep-green/30 to-transparent"></div>

      <div class="absolute left-3 top-3 flex flex-col gap-1.5">
        {#if tour.is_featured}
          <span class="inline-flex items-center gap-1 rounded-md bg-goldfinch-gold px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-heading shadow">
            <Star size={11} fill="currentColor" /> Top Rated
          </span>
        {/if}
        {#if tour.is_popular}
          <span class="inline-flex items-center rounded-md bg-forest px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow">
            Best Seller
          </span>
        {/if}
      </div>

      <h3 class="absolute inset-x-0 bottom-0 p-4 text-xl font-extrabold leading-tight text-white drop-shadow">
        {tour.title}
      </h3>
    </div>

    <!-- Body -->
    <div class="flex flex-1 flex-col p-5">
      <p class="text-lg font-extrabold text-forest">
        From {tour.currency ?? 'USD'} {(tour.price_from ?? 0).toLocaleString()}
        <span class="text-sm font-semibold text-ink/50">pp</span>
      </p>

      {#if metaBits.length}
        <p class="mt-2 text-sm font-semibold text-ink/75">
          {#each metaBits as bit, i}
            {#if i > 0}<span class="text-ink/30"> • </span>{/if}{bit}
          {/each}
        </p>
      {/if}

      {#if stops.length}
        <p class="mt-2 text-sm leading-6 text-ink/60">
          <span class="inline-flex items-center gap-1 font-semibold text-ink/70"><MapPin size={13} /> You visit:</span>
          {stops.join(', ')}
        </p>
      {:else if tour.short_description}
        <p class="mt-2 line-clamp-2 text-sm leading-6 text-ink/60">{tour.short_description}</p>
      {/if}

      <div class="mt-auto flex items-center justify-between border-t border-ink/[0.08] pt-4">
        {#if durationLabel}
          <span class="text-sm font-semibold text-clay">{durationLabel}</span>
        {:else}
          <span></span>
        {/if}
        <span class="inline-flex items-center gap-1.5 text-sm font-bold text-forest transition group-hover:text-heading">
          View tour <ArrowRight size={15} />
        </span>
      </div>
    </div>
  </a>
</article>
