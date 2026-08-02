<script lang="ts">
  import { ArrowRight, MapPin, Sparkles, Star, Tent } from '@lucide/svelte';
  import { origUrl } from '$lib/img';
  import { lodgeBestForLabel, lodgeImage, lodgePriceLabel, lodgeRating, levelLabel, typeLabel } from '$lib/lodge';
  import ShortlistButton from '$lib/components/public/ShortlistButton.svelte';
  import ResponsiveImage from '$lib/components/public/ResponsiveImage.svelte';
  import type { Lodge } from '$lib/types';

  export let lodge: Lodge;
  export let feature = false; // larger, two-column treatment for a standout property

  $: imageUrl = lodgeImage(lodge);
  $: originalImage = origUrl(lodge, 'hero_image_url', 'image_url');
  $: priceLabel = lodgePriceLabel(lodge);
  $: rating = lodgeRating(lodge);
  $: bestForLabel = lodgeBestForLabel(lodge);
  $: isLux = lodge.accommodation_level === 'luxury' || lodge.accommodation_level === 'ultra_luxury';
  $: shortlistItem = {
    slug: lodge.slug,
    title: lodge.name,
    image_url: imageUrl,
    destination: lodge.destinations?.name,
    price_from: lodge.price_per_night_from ?? undefined,
    currency: lodge.currency
  };
</script>

<a
  href={`/accommodation/${lodge.slug}`}
  class={`group relative flex h-full flex-col overflow-hidden border border-ink/10 bg-surface shadow-[0_14px_40px_rgba(28,26,22,0.07)] transition-all duration-300 hover:-translate-y-1 hover:border-goldfinch-gold/40 hover:shadow-[0_28px_64px_rgba(28,26,22,0.18)] ${feature ? 'md:grid md:grid-cols-2' : ''}`}
>
  <!-- image -->
  <div class={`relative overflow-hidden bg-deep-green ${feature ? 'min-h-[260px] md:min-h-full' : 'aspect-[4/3]'}`}>
    {#if imageUrl}
      <ResponsiveImage
        src={originalImage}
        fallbackSrc={imageUrl}
        alt={lodge.name}
        width={feature ? 1200 : 720}
        sizes={feature ? '(min-width:768px) 640px, 100vw' : '(min-width:1024px) 360px, (min-width:640px) 50vw, 100vw'}
        imgClass="h-full w-full object-cover transition-transform duration-[800ms] ease-out group-hover:scale-105"
      />
    {:else}
      <div class="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-[linear-gradient(135deg,rgba(21,55,51,0.98),rgba(74,55,40,0.92))] text-white/80">
        <Tent size={30} strokeWidth={1.4} />
        <span class="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/65">{typeLabel(lodge)}</span>
      </div>
    {/if}
    <span class="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,26,24,0)_45%,rgba(13,22,20,0.72)_100%)]"></span>

    <!-- badges -->
    <div class="absolute left-3 top-3 flex flex-wrap items-center gap-2">
      {#if lodge.is_featured}
        <span class="inline-flex items-center gap-1 bg-goldfinch-gold px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-deep-green shadow"><Sparkles size={11} strokeWidth={2.6} /> Recommended</span>
      {:else if isLux}
        <span class="bg-deep-green/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-goldfinch-gold backdrop-blur">{levelLabel(lodge)}</span>
      {/if}
    </div>
    <div class="absolute right-3 top-3">
      <ShortlistButton item={shortlistItem} />
    </div>

    {#if rating != null}
      <span class="absolute bottom-3 left-3 inline-flex items-center gap-1 bg-surface/90 px-2 py-1 text-[12px] font-bold text-heading backdrop-blur">
        <Star size={12} fill="currentColor" class="text-goldfinch-gold" /> {rating.toFixed(1)}<span class="font-medium text-ink/45">/10</span>
      </span>
    {/if}
  </div>

  <!-- body -->
  <div class={`flex flex-1 flex-col p-5 ${feature ? 'md:justify-center md:p-8' : ''}`}>
    <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-clay">{levelLabel(lodge)} · {typeLabel(lodge)}</p>
    <h3 class={`mt-2 font-serif font-normal leading-tight text-heading ${feature ? 'text-[26px] md:text-[32px]' : 'text-[20px]'}`}>{lodge.name}</h3>
    {#if lodge.destinations?.name}
      <p class="mt-1 inline-flex items-center gap-1 text-[12px] font-semibold text-ink/50"><MapPin size={12} /> {lodge.destinations.name}</p>
    {/if}

    {#if lodge.why_we_recommend || lodge.description}
      <p class={`mt-3 leading-6 text-ink/70 ${feature ? 'text-[15px] md:line-clamp-4' : 'text-[14px] line-clamp-2'}`}>{lodge.why_we_recommend || lodge.description}</p>
    {/if}

    {#if bestForLabel || lodge.best_for?.length}
      <div class="mt-4 flex flex-wrap gap-1.5">
        {#if bestForLabel}
          <span class="border border-goldfinch-gold/40 bg-goldfinch-gold/10 px-2.5 py-1 text-[11px] font-semibold text-clay">{bestForLabel}</span>
        {/if}
        {#each (lodge.best_for ?? []).slice(0, feature ? 4 : 2) as tag}
          <span class="border border-ink/10 bg-sand/50 px-2.5 py-1 text-[11px] font-semibold text-ink/65">{tag}</span>
        {/each}
      </div>
    {/if}

    <div class="mt-auto flex items-center justify-between gap-3 pt-5">
      <span class="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-forest transition group-hover:text-goldfinch-gold">
        View property <ArrowRight size={14} strokeWidth={2.6} class="transition-transform group-hover:translate-x-0.5" />
      </span>
      {#if priceLabel}
        <span class="shrink-0 text-right text-[13px] text-ink/60"><span class="font-bold text-heading">{priceLabel}</span> <span class="text-ink/45">/ night</span></span>
      {/if}
    </div>
  </div>
</a>
