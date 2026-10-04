<script lang="ts">
  import { ArrowUpRight, MapPin } from '@lucide/svelte';
  import { toMetaText } from '$lib/richtext';
  import { origUrl, thumbUrl } from '$lib/img';
  import ResponsiveImage from './ResponsiveImage.svelte';
  import type { Destination } from '$lib/types';

  export let destination: Destination;

  $: imageUrl = thumbUrl(destination, 'main_image_url', 'image_url', 'banner_image_url');
  $: summary = toMetaText(destination.short_description || destination.description, 230);
</script>

<article class="group flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-ink/10 bg-surface">
  <a href={`/destinations/${destination.slug}`} class="flex h-full flex-col focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-forest">
    <div class="relative aspect-[16/10] overflow-hidden bg-sand">
      {#if imageUrl}
        <ResponsiveImage src={origUrl(destination, 'main_image_url', 'image_url', 'banner_image_url')} fallbackSrc={imageUrl} width={800} alt={destination.name} imgClass="h-full w-full object-cover" sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" />
      {:else}
        <div class="flex h-full flex-col items-center justify-center gap-3 bg-deep-green text-goldfinch-gold/70"><MapPin size={32} strokeWidth={1} /><span class="text-xs uppercase tracking-[0.18em]">{destination.country || 'Explore Tanzania'}</span></div>
      {/if}
    </div>
    <div class="flex flex-1 flex-col p-6">
      <p class="text-[10px] font-semibold uppercase tracking-[0.15em] text-clay">{[destination.region, destination.country].filter(Boolean).join(' · ')}</p>
      <h3 class="mt-2 font-serif text-[28px] font-medium leading-tight text-heading">{destination.name}</h3>
      {#if summary}<p class="mt-3 line-clamp-3 text-sm leading-6 text-ink/65">{summary}</p>{/if}
      <div class="mt-auto pt-5"><span class="flex items-center justify-between gap-3 border-t border-ink/10 pt-4 text-xs font-semibold text-forest">Explore destination <ArrowUpRight size={18} /></span></div>
    </div>
  </a>
</article>
