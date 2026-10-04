<script lang="ts">
  import { ArrowRight, MapPin, Tent } from '@lucide/svelte';
  import { origUrl } from '$lib/img';
  import { lodgeImage, levelLabel, typeLabel } from '$lib/lodge';
  import { toMetaText } from '$lib/richtext';
  import ShortlistButton from './ShortlistButton.svelte';
  import ResponsiveImage from './ResponsiveImage.svelte';
  import type { Lodge } from '$lib/types';
  export let lodge: Lodge;
  export let feature = false;
  $: image = lodgeImage(lodge);
  $: teaser = toMetaText(lodge.short_description || lodge.why_we_recommend || lodge.description, 180);
  $: place = lodge.destinations?.name || lodge.park_area || lodge.region || lodge.country || undefined;
  $: shortlistItem = { kind: 'lodge' as const, slug: lodge.slug, title: lodge.name, image_url: image, destination: place, ...(lodge.show_rates_publicly === true ? { price_from: lodge.price_per_night_from ?? undefined } : {}), currency: lodge.currency };
</script>

<article class={`group relative flex h-full flex-col overflow-hidden rounded-lg border border-ink/10 bg-surface ${feature ? 'md:grid md:grid-cols-2' : ''}`}>
  <div class="relative aspect-[3/2] overflow-hidden bg-sand">
    {#if image}
      <ResponsiveImage src={origUrl(lodge, 'hero_image_url', 'image_url')} fallbackSrc={image} alt={lodge.name} width={720} sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" imgClass="h-full w-full object-cover" />
    {:else}
      <div class="flex h-full items-center justify-center bg-forest/10 text-forest/50"><Tent size={36} strokeWidth={1.2} /></div>
    {/if}
    {#if lodge.is_featured}<span class="absolute left-3 top-3 rounded-sm bg-surface/95 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-forest">Emnel pick</span>{/if}
    <div class="absolute right-3 top-3 z-10"><ShortlistButton item={shortlistItem} /></div>
  </div>
  <div class="flex flex-1 flex-col p-5 md:p-6">
    <p class="text-[10px] font-semibold uppercase tracking-[.16em] text-clay">{levelLabel(lodge)} · {typeLabel(lodge)}</p>
    <h3 class="mt-2 font-serif text-2xl leading-tight text-heading"><a class="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-forest" href={`/accommodation/${lodge.slug}`}>{lodge.name}</a></h3>
    {#if place}<p class="mt-2 flex items-start gap-1.5 text-xs text-ink/55"><MapPin size={13} class="shrink-0" />{place}</p>{/if}
    {#if teaser}<p class="mt-4 line-clamp-3 text-sm leading-6 text-ink/65">{teaser}</p>{/if}
    <div class="mt-auto flex items-end justify-between gap-3 pt-6">
      <span class="inline-flex items-center gap-2 text-xs font-semibold text-forest">Explore this stay <ArrowRight size={14} /></span>
      {#if lodge.show_rates_publicly === true && lodge.price_per_night_from != null}<span class="text-right text-xs text-ink/60">From {lodge.currency || 'USD'} {Number(lodge.price_per_night_from).toLocaleString()}<br /><span class="text-[10px]">per night</span></span>{/if}
    </div>
  </div>
</article>
