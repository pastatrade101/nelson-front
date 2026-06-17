<script lang="ts">
  import { ArrowRight } from '@lucide/svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { api } from '$lib/api/client';
  import { staggeredCardReveal } from '$lib/animations/motion';
  import BlogCard from '$lib/components/public/BlogCard.svelte';
  import DestinationCard from '$lib/components/public/DestinationCard.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import JsonLd from '$lib/components/public/JsonLd.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';
  import LodgeCard from '$lib/components/public/LodgeCard.svelte';
  import SectionHeader from '$lib/components/public/SectionHeader.svelte';
  import TourCard from '$lib/components/public/TourCard.svelte';
  import { placeholderDestinations } from '$lib/data/placeholders';
  import { breadcrumbLd } from '$lib/seo';
  import type { BlogPost, Destination, Lodge, Tour } from '$lib/types';

  $: origin = $page.url.origin;

  let destination: Destination | null = null;
  let loading = true;
  let error = '';

  // Relevant content for onward navigation (loaded best-effort after the destination).
  let relatedTours: Tour[] = [];
  let otherDestinations: Destination[] = [];
  let recentPosts: BlogPost[] = [];
  let lodges: Lodge[] = [];

  $: heroImage = destination
    ? destination.banner_image_url || destination.main_image_url || destination.image_url || ''
    : '';

  const loadRelated = async (dest: Destination) => {
    const [tourRes, destRes, postRes, lodgeRes] = await Promise.allSettled([
      api.tours.list({ destination_id: dest.id, limit: 3 }),
      api.destinations.list({ limit: 7 }),
      api.blog.list({ limit: 3 }),
      api.lodges.list({ destination_id: dest.id, limit: 3 })
    ]);

    if (tourRes.status === 'fulfilled') {
      relatedTours = tourRes.value.data.items ?? [];
    }
    if (destRes.status === 'fulfilled') {
      otherDestinations = (destRes.value.data.items ?? [])
        .filter((item) => item.id !== dest.id && item.slug !== dest.slug)
        .slice(0, 3);
    }
    if (postRes.status === 'fulfilled') {
      recentPosts = postRes.value.data.items ?? [];
    }
    if (lodgeRes.status === 'fulfilled') {
      lodges = lodgeRes.value.data.items ?? [];
    }
  };

  const load = async (slug: string) => {
    loading = true;
    error = '';
    relatedTours = [];
    otherDestinations = [];
    recentPosts = [];
    lodges = [];
    try {
      const response = await api.destinations.get(slug);
      destination = response.data;
    } catch (requestError) {
      error = requestError instanceof Error ? requestError.message : 'Unable to load destination.';
      destination = placeholderDestinations.find((item) => item.slug === slug) ?? placeholderDestinations[0];
    } finally {
      loading = false;
    }

    if (destination) void loadRelated(destination);
  };

  // The component is reused across /destinations/[slug] navigations, so a one-shot
  // onMount would leave the page stale. Re-load whenever the slug changes.
  $: slug = $page.params.slug ?? '';
  $: if (browser && slug) void load(slug);
</script>

<section class="container-shell py-14">
  {#if loading}
    <LoadingState message="Loading destination..." />
  {:else if !destination}
    <ErrorState message={error || 'Destination not found.'} />
  {:else}
    <JsonLd data={breadcrumbLd(origin, [{ name: 'Home', path: '/' }, { name: 'Destinations', path: '/destinations' }, { name: destination.name, path: `/destinations/${destination.slug}` }])} />
    <nav class="mb-6 flex items-center gap-2 text-sm">
      <a class="font-medium text-ink/55 transition hover:text-forest" href="/destinations">Destinations</a>
      <span class="text-ink/30">/</span>
      <span class="font-medium text-ink/80">{destination.name}</span>
    </nav>

    <div class="grid gap-10 lg:grid-cols-[1fr_0.8fr]">
      <div>
        {#if destination.country}
          <p class="text-sm font-semibold uppercase tracking-[0.16em] text-clay">{destination.country}</p>
        {/if}
        <h1 class="mt-3 text-4xl font-bold tracking-normal text-ink">{destination.name}</h1>
        <p class="mt-4 text-base leading-7 text-ink/70">{destination.description}</p>
      </div>
      <div class="aspect-[4/3] overflow-hidden rounded-lg bg-skywash shadow-soft">
        {#if heroImage}
          <img class="h-full w-full object-cover" src={heroImage} alt={destination.name} />
        {/if}
      </div>
    </div>
  {/if}
</section>

{#if destination && !loading}
  <!-- Tours in this destination -->
  {#if relatedTours.length}
    <section class="border-t border-ink/[0.06] bg-sand/30 py-14 md:py-20">
      <div class="container-shell">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <SectionHeader
            eyebrow="Things to do"
            title={`Tours in ${destination.name}`}
            description={`Trusted trips that start in or pass through ${destination.name}.`}
          />
          <a
            class="inline-flex items-center gap-1.5 text-sm font-semibold text-forest transition hover:text-deep-green"
            href="/tours"
          >
            Browse all tours <ArrowRight size={16} />
          </a>
        </div>
        <div class="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 18, stagger: 0.07 }}>
          {#each relatedTours as tour (tour.id)}
            <TourCard {tour} />
          {/each}
        </div>
      </div>
    </section>
  {/if}

  <!-- Where to stay (recommended lodges & camps) -->
  {#if lodges.length}
    <section class="border-t border-ink/[0.06] bg-sand/30 py-14 md:py-20">
      <div class="container-shell">
        <SectionHeader
          eyebrow="Where to stay"
          title={`Lodges & camps in ${destination.name}`}
          description="Accommodation our specialists recommend and book — chosen for location, comfort and value."
        />
        <div class="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 18, stagger: 0.07 }}>
          {#each lodges as lodge (lodge.id)}
            <LodgeCard {lodge} />
          {/each}
        </div>
      </div>
    </section>
  {/if}

  <!-- More destinations to explore -->
  {#if otherDestinations.length}
    <section class="py-14 md:py-20">
      <div class="container-shell">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <SectionHeader
            eyebrow="Keep exploring"
            title="More destinations"
            description="Other places our local experts know and love across the region."
          />
          <a
            class="inline-flex items-center gap-1.5 text-sm font-semibold text-forest transition hover:text-deep-green"
            href="/destinations"
          >
            All destinations <ArrowRight size={16} />
          </a>
        </div>
        <div class="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 18, stagger: 0.07 }}>
          {#each otherDestinations as item (item.id)}
            <DestinationCard destination={item} />
          {/each}
        </div>
      </div>
    </section>
  {/if}

  <!-- Recent stories -->
  {#if recentPosts.length}
    <section class="border-t border-ink/[0.06] bg-sand/30 py-14 md:py-20">
      <div class="container-shell">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <SectionHeader
            eyebrow="Stories &amp; guides"
            title="From the journal"
            description="Travel inspiration, tips and stories from the field."
          />
          <a
            class="inline-flex items-center gap-1.5 text-sm font-semibold text-forest transition hover:text-deep-green"
            href="/blog"
          >
            Read the blog <ArrowRight size={16} />
          </a>
        </div>
        <div class="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 18, stagger: 0.07 }}>
          {#each recentPosts as post (post.id)}
            <BlogCard {post} />
          {/each}
        </div>
      </div>
    </section>
  {/if}

  <!-- Plan-your-trip CTA so the page never dead-ends into the footer -->
  <section class="container-shell py-14 md:py-16">
    <div class="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-deep-green via-forest to-deep-green px-6 py-12 text-center text-white md:px-12 md:py-16">
      <div class="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-goldfinch-gold/20 blur-3xl"></div>
      <div class="pointer-events-none absolute -bottom-20 -left-12 h-56 w-56 rounded-full bg-savanna/15 blur-3xl"></div>
      <div class="relative mx-auto max-w-2xl">
        <h2 class="text-2xl font-extrabold md:text-3xl">Ready to explore {destination.name}?</h2>
        <p class="mt-3 text-white/75">
          Tell us what you have in mind and a local expert will craft a tailored plan — no payment needed to start.
        </p>
        <div class="mt-7 flex flex-wrap justify-center gap-3">
          <a
            class="inline-flex h-12 items-center gap-2 rounded-xl bg-goldfinch-gold px-6 font-bold text-deep-green shadow-lg transition hover:brightness-105"
            href="/plan-my-trip"
          >
            Plan My Trip <ArrowRight size={18} />
          </a>
          <a
            class="inline-flex h-12 items-center rounded-xl border border-white/30 px-6 font-semibold text-white transition hover:bg-white/10"
            href="/contact"
          >
            Talk to an Advisor
          </a>
        </div>
      </div>
    </div>
  </section>
{/if}
