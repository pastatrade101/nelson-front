<script lang="ts">
  import { ArrowRight } from '@lucide/svelte';
  import { staggeredCardReveal } from '$lib/animations';
  import DestinationCard from '$lib/components/public/DestinationCard.svelte';
  import FinalCtaSection from '$lib/components/public/FinalCtaSection.svelte';
  import JsonLd from '$lib/components/public/JsonLd.svelte';
  import SectionHeader from '$lib/components/public/SectionHeader.svelte';
  import TourCard from '$lib/components/public/TourCard.svelte';
  import TrustStrip from '$lib/components/public/TrustStrip.svelte';
  import { SITE_URL } from '$lib/config/env';
  import type { Destination, SafariEssential, Tour } from '$lib/types';
  import type { PageData } from './$types';

  export let data: PageData;

  $: country = data.country as string;
  $: destinations = (data.destinations ?? []) as Destination[];
  $: tours = (data.tours ?? []) as Tour[];
  $: essentials = (data.essentials ?? []) as SafariEssential[];

  // Ordered by the site's own notion of prominence, then trimmed — a hub routes
  // people onward, it is not a second catalogue.
  $: featuredTours = [...tours]
    .sort((a, b) => Number(b.is_featured ?? false) - Number(a.is_featured ?? false))
    .slice(0, 6);

  $: seoTitle = `Private ${country} Safaris | Emnel Adventures`;
  $: seoDescription = `Private, tailor-made ${country} safaris designed by local experts — ${destinations.length} destinations and ${tours.length} itineraries, with transparent pricing and no fixed departures.`;

  $: breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL || '/' },
      {
        '@type': 'ListItem',
        position: 2,
        name: `${country} Safaris`,
        ...(SITE_URL ? { item: `${SITE_URL}/${country.toLowerCase().replace(/\s+/g, '-')}-safaris` } : {})
      }
    ]
  };
</script>

<svelte:head>
  <title>{seoTitle}</title>
  <meta name="description" content={seoDescription} />
</svelte:head>

<JsonLd data={breadcrumbs} />

<!-- Hero -->
<section class="bg-deep-green text-white">
  <div class="container-shell py-16 md:py-24">
    <nav class="text-xs uppercase tracking-[0.2em] text-white/55" aria-label="Breadcrumb">
      <a href="/" class="transition hover:text-goldfinch-gold">Home</a>
      <span class="px-2">/</span>
      <span class="text-goldfinch-gold">{country} Safaris</span>
    </nav>
    <h1 class="mt-5 max-w-3xl font-serif text-4xl font-light leading-tight md:text-6xl">
      Private {country} Safaris
    </h1>
    <p class="mt-6 max-w-2xl text-lg leading-relaxed text-white/75">
      Every Emnel journey is private and built around you — your dates, your pace, your budget.
      No fixed departures, no strangers in the vehicle, and a local team who has driven these
      roads for years.
    </p>
    <div class="mt-9 flex flex-wrap gap-4">
      <a
        href="/plan-my-trip"
        class="inline-flex h-12 items-center bg-goldfinch-gold px-7 text-sm font-semibold text-ink transition hover:brightness-95"
      >
        Plan My Safari
      </a>
      <a
        href="/tours"
        class="inline-flex h-12 items-center border border-white/30 px-7 text-sm font-semibold text-white transition hover:bg-white/10"
      >
        Explore Itineraries
      </a>
    </div>
  </div>
</section>

<TrustStrip />

<!-- Destinations in this country -->
{#if destinations.length}
  <section class="container-shell py-16">
    <SectionHeader
      eyebrow="Where to go"
      title={`${country}'s parks and islands`}
      description={`The places we send travellers in ${country}, and what each is genuinely best for.`}
    />
    <div class="mt-10 grid gap-6 md:grid-cols-3" use:staggeredCardReveal={{ y: 16, stagger: 0.06 }}>
      {#each destinations.slice(0, 9) as destination (destination.id)}
        <DestinationCard {destination} />
      {/each}
    </div>
    {#if destinations.length > 9}
      <div class="mt-8">
        <a href="/destinations" class="inline-flex items-center gap-2 text-sm font-medium text-deep-green">
          All destinations
          <ArrowRight class="h-4 w-4" />
        </a>
      </div>
    {/if}
  </section>
{/if}

<!-- Itineraries -->
{#if featuredTours.length}
  <section class="bg-linen py-16">
    <div class="container-shell">
      <SectionHeader
        eyebrow="Itineraries"
        title={`Safaris in ${country}`}
        description="Starting points, not fixed packages — every one is reshaped around the people travelling."
      />
      <div class="mt-10 grid gap-6 md:grid-cols-3" use:staggeredCardReveal={{ y: 16, stagger: 0.06 }}>
        {#each featuredTours as tour (tour.id)}
          <TourCard {tour} />
        {/each}
      </div>
      <div class="mt-8">
        <a href="/tours" class="inline-flex items-center gap-2 text-sm font-medium text-deep-green">
          See all itineraries
          <ArrowRight class="h-4 w-4" />
        </a>
      </div>
    </div>
  </section>
{/if}

<!-- Essentials, only once guides are actually published for this country -->
{#if essentials.length}
  <section class="container-shell py-16">
    <SectionHeader
      eyebrow="Safari Essentials"
      title="Before you decide"
      description={`The questions worth answering before booking a ${country} safari.`}
    />
    <div class="mt-8 grid gap-4 md:grid-cols-2">
      {#each essentials.slice(0, 6) as guide (guide.id)}
        <a
          href={`/safari-essentials/${guide.slug}`}
          class="group flex items-center justify-between border border-ink/10 bg-surface px-5 py-4 transition hover:border-goldfinch-gold/40"
        >
          <span class="font-medium text-ink">{guide.title}</span>
          <ArrowRight class="h-4 w-4 text-ink/40 transition group-hover:translate-x-1 group-hover:text-deep-green" />
        </a>
      {/each}
    </div>
  </section>
{/if}

<FinalCtaSection
  eyebrow="Start planning"
  title={`Tell us what you want from ${country}`}
  subtitle="Share your dates and rough budget and we will come back with an honest plan — including whether the timing actually works."
  primaryLabel="Plan My Safari"
  primaryHref="/plan-my-trip"
/>
