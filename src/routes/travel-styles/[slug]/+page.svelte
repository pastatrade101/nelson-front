<script lang="ts">
  import { ArrowRight, ArrowUpRight } from '@lucide/svelte';
  import { page } from '$app/stores';
  import { fadeUpOnScroll } from '$lib/animations';
  import ContentBlocks from '$lib/components/public/ContentBlocks.svelte';
  import JsonLd from '$lib/components/public/JsonLd.svelte';
  import ResponsiveImage from '$lib/components/public/ResponsiveImage.svelte';
  import TourCard from '$lib/components/public/TourCard.svelte';
  import { breadcrumbLd } from '$lib/seo';
  import type { Tour, TravelStyle } from '$lib/types';
  import type { PageData } from './$types';

  export let data: PageData;

  $: style = data.style as TravelStyle;
  $: others = (data.others ?? []) as TravelStyle[];
  $: tours = (data.tours ?? []) as Tour[];
  $: origin = $page.url.origin;

  $: blocks = (Array.isArray(style.sections) ? style.sections : []) as Record<string, unknown>[];
  $: desires = (style.desires ?? []).filter((d) => d && d.trim());
  $: concerns = (style.concerns ?? []).filter((c) => c && c.trim());

  $: toursHref = style.persona ? `/tours?persona=${style.persona}` : '/tours';
  $: planHref = `/plan-my-trip${style.persona ? `?persona=${style.persona}` : ''}`;

  // A curated tour block replaces the generic fallback; only show the fallback
  // strip when the editor has not chosen tours themselves.
  $: hasCuratedTours = blocks.some((b) => b.type === 'tours' && Array.isArray(b.tour_ids) && b.tour_ids.length);
  $: fallbackTours = hasCuratedTours ? [] : tours.filter((t) => t.is_featured).slice(0, 3);

  $: seoTitle = style.meta_title?.trim() || style.seo_title?.trim() || `${style.name} Safaris in Tanzania | Emnel Adventures`;
  $: seoDescription = style.meta_description?.trim() || style.emotional_promise?.trim() || style.description?.trim() || '';
</script>

<svelte:head>
  <title>{seoTitle}</title>
  {#if seoDescription}<meta name="description" content={seoDescription} />{/if}
  {#if style.hero_image_url}<meta property="og:image" content={style.hero_image_url} />{/if}
</svelte:head>

<JsonLd
  data={breadcrumbLd(origin, [
    { name: 'Home', path: '/' },
    { name: 'Travel Styles', path: '/travel-styles' },
    { name: style.name, path: `/travel-styles/${style.slug}` }
  ])}
/>

<!-- ── Hero: full-bleed image, editorial type, restrained gold ───────────────── -->
<section class="relative isolate overflow-hidden bg-deep-green text-white">
  {#if style.hero_image_url}
    <ResponsiveImage
      src={style.hero_image_url}
      alt=""
      sizes="100vw"
      width={1920}
      eager
      priority
      imgClass="absolute inset-0 h-full w-full object-cover"
    />
    <div class="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/55 to-ink/25"></div>
  {/if}

  <div class="container-shell relative py-20 md:py-32">
    <nav class="text-[11px] uppercase tracking-[0.24em] text-white/55" aria-label="Breadcrumb">
      <a class="transition hover:text-goldfinch-gold" href="/">Home</a>
      <span class="px-2 text-white/25">/</span>
      <a class="transition hover:text-goldfinch-gold" href="/travel-styles">Travel Styles</a>
      <span class="px-2 text-white/25">/</span>
      <span class="text-goldfinch-gold">{style.name}</span>
    </nav>

    <p class="mt-10 text-[11px] uppercase tracking-[0.28em] text-goldfinch-gold">{style.name}</p>

    {#if style.emotional_promise}
      <h1 class="mt-5 max-w-4xl font-serif text-[38px] font-light leading-[1.06] md:text-[68px]">
        {style.emotional_promise}
      </h1>
    {:else}
      <h1 class="mt-5 max-w-4xl font-serif text-[38px] font-light leading-[1.06] md:text-[68px]">
        {style.name} Safaris
      </h1>
    {/if}

    {#if style.description}
      <p class="mt-7 max-w-2xl text-[15px] leading-8 text-white/80 md:text-[17px]">{style.description}</p>
    {/if}

    <div class="mt-11 flex flex-wrap gap-4">
      <a
        class="inline-flex h-12 items-center bg-goldfinch-gold px-8 text-sm font-semibold tracking-wide text-ink transition hover:brightness-95"
        href={planHref}
      >
        Plan this trip
      </a>
      <a
        class="inline-flex h-12 items-center gap-2 border border-white/25 px-8 text-sm font-semibold text-white transition hover:bg-white/10"
        href={toursHref}
      >
        Browse itineraries
        <ArrowRight class="h-4 w-4" />
      </a>
    </div>
  </div>
</section>

<!-- ── The two-column read: what they want / what we plan around ─────────────── -->
{#if desires.length || concerns.length}
  <section class="bg-linen py-16 md:py-24">
    <div class="container-shell grid gap-14 md:grid-cols-2 md:gap-20" use:fadeUpOnScroll={{ y: 16 }}>
      {#if desires.length}
        <div>
          <p class="text-[11px] uppercase tracking-[0.24em] text-clay">What you are after</p>
          <div class="mt-7 grid gap-0">
            {#each desires as d, i (d)}
              <div class="flex gap-5 border-t border-ink/10 py-4 {i === desires.length - 1 ? 'border-b' : ''}">
                <span class="mt-1 font-serif text-lg font-light leading-none text-goldfinch-gold">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span class="text-[15px] leading-7 text-ink/80">{d}</span>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      {#if concerns.length}
        <div>
          <p class="text-[11px] uppercase tracking-[0.24em] text-clay">What we plan around</p>
          <div class="mt-7 grid gap-6">
            {#each concerns as c (c)}
              <blockquote class="border-l-2 border-goldfinch-gold/60 pl-5">
                <p class="font-serif text-[21px] font-light leading-[1.45] text-heading">“{c}”</p>
              </blockquote>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </section>
{/if}

<!-- ── Editor-authored blocks: the rich half of the page ─────────────────────── -->
<ContentBlocks {blocks} {tours} />

<!-- ── Fallback itineraries, only when the editor has not curated any ────────── -->
{#if fallbackTours.length}
  <section class="bg-canvas py-16 md:py-20">
    <div class="container-shell" use:fadeUpOnScroll={{ y: 14 }}>
      <div class="flex flex-wrap items-end justify-between gap-5">
        <h2 class="font-serif text-[30px] font-light leading-[1.12] text-heading md:text-[40px]">
          Somewhere to start
        </h2>
        <a class="inline-flex items-center gap-2 text-sm font-medium text-deep-green" href={toursHref}>
          Browse all itineraries
          <ArrowRight class="h-4 w-4" />
        </a>
      </div>
      <div class="mt-10 grid gap-6 md:grid-cols-3">
        {#each fallbackTours as tour (tour.id)}
          <TourCard {tour} />
        {/each}
      </div>
    </div>
  </section>
{/if}

<!-- ── Other styles ─────────────────────────────────────────────────────────── -->
{#if others.length}
  <section class="border-t border-ink/10 bg-surface py-16 md:py-20">
    <div class="container-shell" use:fadeUpOnScroll={{ y: 14 }}>
      <p class="text-[11px] uppercase tracking-[0.24em] text-clay">Other ways to travel</p>
      <div class="mt-8 grid gap-px border border-ink/10 bg-ink/10 sm:grid-cols-2 lg:grid-cols-3">
        {#each others.slice(0, 6) as o (o.slug)}
          <a
            class="group flex items-center justify-between gap-4 bg-surface px-6 py-6 transition hover:bg-linen"
            href={`/travel-styles/${o.slug}`}
          >
            <span class="font-serif text-xl font-light text-heading">{o.name}</span>
            <ArrowUpRight class="h-4 w-4 shrink-0 text-ink/30 transition group-hover:text-deep-green" />
          </a>
        {/each}
      </div>
    </div>
  </section>
{/if}
