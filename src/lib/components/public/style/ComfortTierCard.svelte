<script lang="ts">
  import { ArrowRight, Check, Clock, MapPin, Users } from '@lucide/svelte';
  import ResponsiveImage from '$lib/components/public/ResponsiveImage.svelte';
  import { currency, formatUsd } from '$lib/currency';
  import type { TierCard } from './styleContent';

  export let tier: TierCard;
  export let planHref = '/plan-my-trip';
  export let preview = false;
  let failedImage = '';
  $: hasImage = Boolean(tier.image && failedImage !== tier.image);
  $: party = tier.example ? [
    tier.example.adults !== null ? `${tier.example.adults} adult${tier.example.adults === 1 ? '' : 's'}` : '',
    tier.example.children !== null && tier.example.children > 0 ? `${tier.example.children} ${tier.example.children === 1 ? 'child' : 'children'}` : ''
  ].filter(Boolean).join(' · ') : '';
</script>

<article class="comfort-tier-card flex h-full min-w-0 flex-col overflow-hidden rounded-none border border-ink/10 bg-surface shadow-[0_14px_40px_rgba(28,26,22,0.07)]">
  <div class="relative aspect-[16/10] shrink-0 overflow-hidden rounded-none bg-deep-green">
    {#if hasImage}
      <ResponsiveImage
        src={tier.image}
        alt={tier.imageAlt}
        width={960}
        sizes="(min-width:1280px) 410px, (min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
        imgClass="absolute inset-0 h-full w-full rounded-none object-cover"
        on:error={() => (failedImage = tier.image)}
      />
    {/if}
    <div class="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 to-transparent" aria-hidden="true"></div>
    {#if tier.label}
      <span class="absolute left-4 top-4 max-w-[calc(100%-32px)] bg-goldfinch-gold px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-deep-green">{tier.label}</span>
    {/if}
    <h3 class="absolute inset-x-0 bottom-0 px-5 pb-5 font-serif text-[30px] font-light leading-tight text-white">{tier.title}</h3>
  </div>

  <div class="flex flex-1 flex-col p-5 sm:p-6">
    <div>
      <p class="text-[10px] font-semibold uppercase tracking-[0.14em] text-clay">{tier.price !== null ? `From · ${$currency.selectedCurrency}` : 'Tailor-made pricing'}</p>
      <p class="mt-2 break-words font-serif text-[34px] font-light leading-none text-heading">
        {tier.price !== null ? formatUsd(tier.price, $currency) : 'Request a quote'}
      </p>
      {#if tier.unit}<p class="mt-2 text-[12px] leading-5 text-ink/60">{tier.unit}</p>{/if}
    </div>

    {#if tier.highlights.length}
      <ul class="mt-5 space-y-2">
        {#each tier.highlights as highlight, i (i)}
          <li class="flex items-start gap-2 text-[13px] leading-6 text-ink/75"><Check size={14} class="mt-1 shrink-0 text-clay" /><span class="min-w-0 break-words">{highlight}</span></li>
        {/each}
      </ul>
    {/if}

    {#if tier.notes.length}
      <div class="mt-4 space-y-2 text-[13px] leading-6 text-ink/70">
        {#each tier.notes as note, i (i)}<p class="break-words">{note}</p>{/each}
      </div>
    {/if}

    {#if tier.example}
      <div class="mt-5 border-l-2 border-goldfinch-gold bg-linen/55 px-4 py-4">
        <p class="text-[10px] font-semibold uppercase tracking-[0.14em] text-clay">Example safari</p>
        <div class="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2 text-[12px] text-ink/75">
          {#if tier.example.days !== null}<span class="inline-flex items-center gap-1.5"><Clock size={13} />{tier.example.days}-day safari</span>{/if}
          {#if party}<span class="inline-flex items-center gap-1.5"><Users size={13} />{party}</span>{/if}
        </div>
        {#if tier.example.total !== null}
          <p class="mt-3 text-[11px] text-ink/60">Trip total from</p>
          <p class="mt-1 break-words font-serif text-[26px] leading-tight text-heading">{formatUsd(tier.example.total, $currency)}</p>
        {/if}
      </div>
    {/if}

    {#if tier.lodges.length}
      <div class="mt-5">
        <p class="text-[10px] font-semibold uppercase tracking-[0.14em] text-clay">Selected stays</p>
        <ul class="mt-2 space-y-2">
          {#each tier.lodges as lodge (lodge.id)}
            <li><svelte:element this={preview ? 'span' : 'a'} href={preview ? undefined : `/accommodation/${lodge.slug}`} class="flex items-start gap-1.5 text-[13px] leading-5 text-ink/75 underline decoration-ink/20 underline-offset-4 hover:text-clay focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-clay"><MapPin size={13} class="mt-1 shrink-0" /><span>{lodge.name}</span></svelte:element></li>
          {/each}
        </ul>
      </div>
    {/if}

    <div class="mt-auto pt-5">
      <svelte:element this={preview ? 'span' : 'a'} href={preview ? undefined : planHref} aria-label={preview ? undefined : `Plan a ${tier.title} safari`} class="flex min-h-11 w-full items-center justify-between gap-3 rounded-none bg-deep-green px-4 py-3 text-[10px] font-bold uppercase tracking-[0.13em] text-white hover:bg-forest focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-clay">
        Plan this safari <ArrowRight size={16} class="shrink-0" />
      </svelte:element>
    </div>
  </div>
</article>
