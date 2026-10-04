<script lang="ts">
  import { ArrowRight, MapPin } from '@lucide/svelte';
  import ResponsiveImage from '$lib/components/public/ResponsiveImage.svelte';

  // A compact, in-article recommendation row: the guide is a reading column, so
  // a full product card is too heavy here. Links to the record's own page.
  export let href: string;
  export let title: string;
  export let image = '';
  export let fallbackImage = '';
  export let eyebrow = '';
  export let meta = '';
  export let price = '';
  export let priceNote = '';
</script>

<a {href} class="group flex gap-4 border border-ink/10 bg-surface p-3 transition hover:border-goldfinch-gold/50 hover:shadow-soft">
  <div class="relative h-[84px] w-[112px] shrink-0 overflow-hidden bg-deep-green sm:h-[96px] sm:w-[128px]">
    {#if image}
      <ResponsiveImage
        src={image}
        fallbackSrc={fallbackImage || image}
        alt={title}
        width={320}
        sizes="128px"
        imgClass="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
    {:else}
      <div class="grid h-full w-full place-items-center text-white/60"><MapPin size={20} strokeWidth={1.5} /></div>
    {/if}
  </div>
  <div class="flex min-w-0 flex-1 flex-col">
    {#if eyebrow}<p class="truncate text-[10.5px] font-bold uppercase tracking-[0.14em] text-clay">{eyebrow}</p>{/if}
    <p class="mt-0.5 line-clamp-2 font-serif text-[17px] font-normal leading-snug text-heading">{title}</p>
    {#if meta}<p class="mt-1 truncate text-[12.5px] text-ink/60">{meta}</p>{/if}
    <div class="mt-auto flex items-end justify-between gap-2 pt-1.5">
      {#if price}
        <p class="text-[13px] text-ink/70">From <span class="font-semibold text-heading">{price}</span>{#if priceNote}<span class="text-ink/50"> {priceNote}</span>{/if}</p>
      {:else}<span></span>{/if}
      <ArrowRight size={16} class="shrink-0 text-ink/40 transition group-hover:translate-x-0.5 group-hover:text-clay" />
    </div>
  </div>
</a>
