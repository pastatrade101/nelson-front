<script lang="ts">
  import { ArrowRight } from '@lucide/svelte';
  import { staggeredCardReveal } from '$lib/animations';
  import FinalCtaSection from '$lib/components/public/FinalCtaSection.svelte';
  import JsonLd from '$lib/components/public/JsonLd.svelte';
  import ResponsiveImage from '$lib/components/public/ResponsiveImage.svelte';
  import SectionHeader from '$lib/components/public/SectionHeader.svelte';
  import { SITE_URL } from '$lib/config/env';
  import type { MarketPage } from '$lib/types';
  import type { PageData } from './$types';

  export let data: PageData;

  $: markets = (data.markets ?? []) as MarketPage[];

  const cardTitle = (m: MarketPage) => m.hero_title?.trim() || `Tanzania Safaris from ${m.name}`;
  const cardBlurb = (m: MarketPage) => m.hero_subtitle?.trim() || m.meta_description?.trim() || '';

  const title = 'Tanzania Safaris by Departure Market | Emnel Adventures';
  const description =
    'Private Tanzania safaris planned around where you are flying from — routes, timings and pricing written for your market rather than translated from someone else’s.';

  // ItemList rather than a bare page: it tells search engines this is an index
  // of other pages, and names them, which is the whole point of the hub.
  $: itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Tanzania safaris by departure market',
    itemListElement: markets.map((m, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: cardTitle(m),
      ...(SITE_URL ? { url: `${SITE_URL}/safaris/${m.slug}` } : {})
    }))
  };
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
</svelte:head>

<JsonLd data={itemList} />

<section class="bg-deep-green text-white">
  <div class="container-shell py-14 md:py-20">
    <nav class="text-xs uppercase tracking-[0.2em] text-white/55" aria-label="Breadcrumb">
      <a href="/" class="transition hover:text-goldfinch-gold">Home</a>
      <span class="px-2">/</span>
      <span class="text-goldfinch-gold">By departure market</span>
    </nav>
    <h1 class="mt-5 max-w-3xl font-serif text-4xl font-light leading-tight md:text-5xl">
      Tanzania safaris, planned around where you fly from
    </h1>
    <p class="mt-5 max-w-2xl text-lg leading-relaxed text-white/75">
      Flight routes, trip length and timing all change depending on where you start. These pages
      are written for a particular departure market rather than translated from a generic one.
    </p>
  </div>
</section>

<section class="container-shell py-14">
  <SectionHeader
    eyebrow="Choose your departure"
    title="Where are you travelling from?"
    description="Each page carries the routes, seasons and pricing that actually apply from that market."
  />

  <div class="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 16, stagger: 0.06 }}>
    {#each markets as market (market.id)}
      <a
        href={`/safaris/${market.slug}`}
        class="group flex flex-col bg-linen shadow-soft transition hover:shadow-lg"
      >
        {#if market.hero_image_url}
          <div class="aspect-[3/2] overflow-hidden">
            <ResponsiveImage
              src={market.hero_image_url}
              alt={cardTitle(market)}
              sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
              imgClass="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          </div>
        {/if}
        <div class="flex flex-1 flex-col p-6">
          {#if market.hero_eyebrow}
            <p class="text-xs uppercase tracking-[0.2em] text-goldfinch-gold">{market.hero_eyebrow}</p>
          {/if}
          <h2 class="mt-2 font-serif text-xl font-light text-heading">{cardTitle(market)}</h2>
          {#if cardBlurb(market)}
            <p class="mt-3 flex-1 text-sm leading-relaxed text-ink/75">{cardBlurb(market)}</p>
          {/if}
          <span class="mt-5 inline-flex items-center gap-2 text-sm font-medium text-deep-green">
            View safaris from {market.name}
            <ArrowRight class="h-4 w-4 transition group-hover:translate-x-1" />
          </span>
        </div>
      </a>
    {/each}
  </div>
</section>

<FinalCtaSection
  eyebrow="Not on the list?"
  title="We plan from anywhere"
  subtitle="These pages cover our most common departure markets. Wherever you are flying from, tell us and we will build the trip around it."
  primaryLabel="Plan My Safari"
  primaryHref="/plan-my-trip"
/>
