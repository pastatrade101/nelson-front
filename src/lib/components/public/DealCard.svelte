<script lang="ts">
  import { ArrowRight, Clock } from '@lucide/svelte';
  import { tilt } from '$lib/animations';
  import ShortlistButton from './ShortlistButton.svelte';
  import type { Tour } from '$lib/types';

  export let tour: Tour;
  export let index = 0;

  $: image = tour.main_image_url || tour.banner_image_url || '';
  // Offer badge derived from the tour's flags (admin-editable via those flags).
  $: badge = tour.is_featured ? 'Best Value' : tour.is_popular ? 'Popular' : index % 2 === 0 ? 'Save 10%' : 'Special Offer';
  $: badgeTone = tour.is_featured
    ? 'bg-goldfinch-gold text-heading'
    : tour.is_popular
      ? 'bg-forest text-white'
      : 'bg-clay text-white';

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
  <a href={`/tours/${tour.slug}`} class="relative block aspect-[4/3] overflow-hidden bg-skywash">
    {#if image}
      <img class="h-full w-full object-cover transition-transform duration-[800ms] ease-out group-hover:scale-110" src={image} alt={tour.title} loading="lazy" />
    {/if}
    <span class="pointer-events-none absolute inset-0 bg-gradient-to-t from-deep-green/55 via-transparent to-transparent"></span>

    <!-- offer badge -->
    <span class={`absolute left-3 top-3 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide shadow-md ${badgeTone}`}>
      {badge}
    </span>

    <!-- duration -->
    {#if tour.duration_days}
      <span class="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-surface/90 px-2.5 py-1 text-xs font-bold text-heading shadow backdrop-blur">
        <Clock size={13} strokeWidth={2.6} /> {tour.duration_days} days
      </span>
    {/if}

    <!-- shortlist -->
    <div class="absolute right-3 top-3">
      <ShortlistButton {item} />
    </div>
  </a>

  <div class="flex flex-1 flex-col p-5">
    {#if tour.destinations?.name}
      <p class="text-xs font-semibold uppercase tracking-[0.12em] text-clay">{tour.destinations.name}</p>
    {/if}
    <h3 class="mt-1.5 text-lg font-extrabold leading-snug tracking-tight text-ink">{tour.title}</h3>
    {#if tour.short_description}
      <p class="mt-2 line-clamp-2 text-sm leading-6 text-ink/60">{tour.short_description}</p>
    {/if}

    <div class="mt-auto flex items-center justify-between gap-3 border-t border-ink/[0.08] pt-4">
      <p class="leading-tight">
        <span class="block text-[11px] font-medium uppercase tracking-wide text-ink/45">From</span>
        <span class="text-lg font-extrabold text-heading">{tour.currency ?? 'USD'} {(tour.price_from ?? 0).toLocaleString()}</span>
        <span class="text-xs font-semibold text-ink/45"> pp</span>
      </p>
      <a
        href={`/tours/${tour.slug}`}
        class="inline-flex items-center gap-1.5 rounded-[8px] bg-forest px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-deep-green"
      >
        Explore Deal
        <ArrowRight size={16} strokeWidth={2.6} class="transition-transform duration-300 group-hover:translate-x-0.5" />
      </a>
    </div>
  </div>
</article>
