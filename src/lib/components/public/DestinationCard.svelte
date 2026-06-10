<script lang="ts">
  import type { Destination } from '$lib/types';

  export let destination: Destination;

  $: imageUrl = destination.main_image_url || destination.image_url || destination.banner_image_url || '';
</script>

<article class="overflow-hidden rounded-lg border border-ink/10 bg-white shadow-soft">
  <a href={`/destinations?d=${destination.slug}`} class="block">
    <div class="aspect-[4/3] bg-skywash">
      {#if imageUrl}
        <img class="h-full w-full object-cover" src={imageUrl} alt={destination.name} />
      {/if}
    </div>
    <div class="p-5">
      <p class="text-sm font-semibold text-clay">{destination.country}</p>
      <h3 class="mt-2 text-xl font-bold tracking-normal text-ink">{destination.name}</h3>
      <p class="mt-2 line-clamp-3 text-sm leading-6 text-ink/70">{destination.description}</p>
    </div>
  </a>
</article>
