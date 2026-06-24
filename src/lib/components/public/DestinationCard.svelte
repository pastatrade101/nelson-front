<script lang="ts">
  import { tilt } from '$lib/animations';
  import type { Destination } from '$lib/types';

  export let destination: Destination;

  $: imageUrl = destination.main_image_url || destination.image_url || destination.banner_image_url || '';
</script>

<article class="group flex h-full flex-col overflow-hidden rounded-[12px] border border-ink/10 bg-surface shadow-[0_14px_40px_rgba(15,47,36,0.07)] transition-shadow duration-300 hover:shadow-[0_26px_60px_rgba(15,47,36,0.16)]" use:tilt={{ max: 5 }}>
  <a href={`/destinations?d=${destination.slug}`} class="flex h-full flex-col">
    <div class="aspect-[4/3] overflow-hidden bg-skywash">
      {#if imageUrl}
        <img class="h-full w-full object-cover transition-transform duration-[800ms] ease-out group-hover:scale-110" src={imageUrl} alt={destination.name} loading="lazy" />
      {/if}
    </div>
    <div class="flex flex-1 flex-col p-5">
      <p class="text-sm font-semibold text-clay">{destination.country}</p>
      <h3 class="mt-2 text-xl font-bold tracking-normal text-ink">{destination.name}</h3>
      <p class="mt-2 line-clamp-3 text-sm leading-6 text-ink/70">{destination.description}</p>
    </div>
  </a>
</article>
