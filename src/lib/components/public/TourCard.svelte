<script lang="ts">
  import { tilt } from '$lib/animations';
  import ShortlistButton from './ShortlistButton.svelte';
  import type { Tour } from '$lib/types';

  export let tour: Tour;

  $: item = {
    slug: tour.slug,
    title: tour.title,
    image_url: tour.main_image_url,
    duration_days: tour.duration_days,
    price_from: tour.price_from,
    currency: tour.currency,
    destination: (tour as unknown as { destinations?: { name?: string } }).destinations?.name
  };
</script>

<article class="group relative flex h-full flex-col overflow-hidden rounded-[12px] border border-ink/10 bg-surface shadow-[0_14px_40px_rgba(15,47,36,0.07)] transition-shadow duration-300 hover:shadow-[0_26px_60px_rgba(15,47,36,0.16)]" use:tilt={{ max: 5 }}>
  <div class="absolute right-3 top-3 z-10">
    <ShortlistButton {item} />
  </div>
  <a href={`/tours/${tour.slug}`} class="flex h-full flex-col">
    <div class="aspect-[4/3] overflow-hidden bg-skywash">
      {#if tour.main_image_url}
        <img class="h-full w-full object-cover transition-transform duration-[800ms] ease-out group-hover:scale-110" src={tour.main_image_url} alt={tour.title} loading="lazy" />
      {/if}
    </div>
    <div class="flex flex-1 flex-col p-5">
      <p class="text-sm font-semibold text-clay">{tour.duration_days ?? 1} days</p>
      <h3 class="mt-2 text-xl font-bold tracking-normal text-ink">{tour.title}</h3>
      <p class="mt-2 line-clamp-3 text-sm leading-6 text-ink/70">{tour.short_description}</p>
      <div class="mt-auto flex items-center justify-between pt-5 text-sm">
        <span class="font-semibold text-forest">From {tour.currency ?? 'USD'} {tour.price_from ?? 0}</span>
        <span class="font-semibold text-ink">View</span>
      </div>
    </div>
  </a>
</article>
