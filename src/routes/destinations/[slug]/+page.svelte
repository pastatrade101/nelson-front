<script lang="ts">
  import { ArrowRight } from '@lucide/svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { trackEvent } from '$lib/analytics';
  import { api } from '$lib/api/client';
  import { staggeredCardReveal } from '$lib/animations/motion';
  import BlogCard from '$lib/components/public/BlogCard.svelte';
  import DestinationCard from '$lib/components/public/DestinationCard.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import ActivityCard from '$lib/components/public/ActivityCard.svelte';
  import JsonLd from '$lib/components/public/JsonLd.svelte';
  import LodgeCard from '$lib/components/public/LodgeCard.svelte';
  import SectionHeader from '$lib/components/public/SectionHeader.svelte';
  import TourCard from '$lib/components/public/TourCard.svelte';
  import DestinationGuide from '$lib/components/public/guide/DestinationGuide.svelte';
  import { placeholderDestinations } from '$lib/data/placeholders';
  import { breadcrumbLd } from '$lib/seo';
  import { FileCheck, HeartPulse, Phone, Plane, Shield, ShieldCheck } from '@lucide/svelte';
  import type { Activity, BlogPost, Destination, Lodge, Tour, TripPoint } from '$lib/types';
  import type { PageData } from './$types';

  export let data: PageData;

  $: origin = $page.url.origin;
  $: slug = $page.params.slug ?? '';

  // Destination comes from the SSR load for a fast first paint; fall back to a
  // bundled placeholder only if the API failed, so the page never hard-fails.
  $: destination =
    (data.destination as Destination | null) ??
    placeholderDestinations.find((item) => item.slug === slug) ??
    null;

  // Relevant content for onward navigation (loaded best-effort after the destination).
  let relatedTours: Tour[] = [];
  let otherDestinations: Destination[] = [];
  let recentPosts: BlogPost[] = [];
  let lodges: Lodge[] = [];
  let activities: Activity[] = [];
  let tripPoints: TripPoint[] = [];

  const roleLabel = (role: TripPoint['role']) =>
    role === 'start' ? 'Trips start here' : role === 'end' ? 'Trips end here' : 'Start & end point';

  $: hasSafety = Boolean(
    destination &&
      (destination.safety_overview ||
        destination.health_vaccinations ||
        destination.security_advice ||
        destination.travel_insurance_note ||
        destination.emergency_contacts)
  );

  $: heroImage = destination
    ? destination.banner_image_url || destination.main_image_url || destination.image_url || ''
    : '';

  const loadRelated = async (dest: Destination) => {
    const [tourRes, destRes, postRes, lodgeRes, activityRes, tripPointRes] = await Promise.allSettled([
      api.tours.list({ destination_id: dest.id, limit: 3 }),
      api.destinations.list({ limit: 7 }),
      api.blog.list({ limit: 3 }),
      api.lodges.list({ destination_id: dest.id, limit: 3 }),
      api.activities.list({ destination_id: dest.id, limit: 3 }),
      api.tripPoints.list({ destination_id: dest.id, limit: 4 })
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
    if (activityRes.status === 'fulfilled') {
      activities = activityRes.value.data.items ?? [];
    }
    if (tripPointRes.status === 'fulfilled') {
      tripPoints = tripPointRes.value.data.items ?? [];
    }
  };

  // Related content (below the fold) loads on the client, once per destination.
  let relatedFor = '';
  $: if (browser && destination?.id && destination.id !== relatedFor) {
    relatedFor = destination.id;
    void loadRelated(destination);
  }

  // Track a page view once per destination.
  let trackedSlug = '';
  $: if (browser && destination && slug && slug !== trackedSlug) {
    trackedSlug = slug;
    trackEvent('destination_page_view', { destination: destination.name });
  }
</script>

<section class="container-shell py-14">
  {#if !destination}
    <ErrorState message="Destination not found." />
  {:else}
    <JsonLd data={breadcrumbLd(origin, [{ name: 'Home', path: '/' }, { name: 'Destinations', path: '/destinations' }, { name: destination.name, path: `/destinations/${destination.slug}` }])} />
    <nav class="mb-6 flex items-center gap-2 text-sm">
      <a class="font-medium text-ink/70 transition hover:text-forest" href="/destinations">Destinations</a>
      <span class="text-ink/30">/</span>
      <span class="font-medium text-ink/80">{destination.name}</span>
    </nav>

    <div class="grid gap-10 lg:grid-cols-[1fr_0.8fr]">
      <div>
        {#if destination.country}
          <p class="font-serif text-xl italic text-clay">{destination.country}</p>
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

{#if destination}
  <!-- Long-form destination guide (the editorial "destination template") -->
  {#if destination.guide?.length}
    <DestinationGuide blocks={destination.guide} reviewedAt={destination.guide_reviewed_at ?? null} />
  {/if}

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
            class="inline-flex items-center gap-1.5 text-sm font-semibold text-forest transition hover:text-heading"
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

  <!-- Top things to do (activities) -->
  {#if activities.length}
    <section class="py-14 md:py-20">
      <div class="container-shell">
        <SectionHeader
          eyebrow="Things to do"
          title={`Top experiences in ${destination.name}`}
          description="Stand-out activities our specialists build into trips here — book them as part of your itinerary."
        />
        <div class="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 18, stagger: 0.07 }}>
          {#each activities as activity (activity.id)}
            <ActivityCard {activity} />
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

  <!-- Health & safety -->
  {#if hasSafety}
    <section class="py-14 md:py-20">
      <div class="container-shell">
        <SectionHeader
          eyebrow="Health &amp; safety"
          title={`Staying safe in ${destination.name}`}
          description="Honest, practical guidance for your trip. See our full guide for more."
        />
        <div class="mt-9 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          {#if destination.safety_overview}
            <div class="rounded-2xl border border-ink/10 bg-surface p-6 shadow-soft">
              <div class="flex items-center gap-3">
                <span class="grid h-11 w-11 place-items-center rounded-xl bg-forest/10 text-forest"><ShieldCheck size={20} /></span>
                <h3 class="text-lg font-bold text-ink">Is it safe?</h3>
              </div>
              <p class="mt-3 text-sm leading-7 text-ink/70">{destination.safety_overview}</p>
            </div>
          {/if}

          <div class="grid gap-4">
            {#if destination.health_vaccinations}
              <div class="flex gap-3 rounded-2xl border border-ink/10 bg-surface p-5 shadow-soft">
                <span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-clay/10 text-clay"><HeartPulse size={18} /></span>
                <div><p class="text-sm font-bold text-ink">Health &amp; vaccinations</p><p class="mt-1 text-sm leading-6 text-ink/65">{destination.health_vaccinations}</p></div>
              </div>
            {/if}
            {#if destination.security_advice}
              <div class="flex gap-3 rounded-2xl border border-ink/10 bg-surface p-5 shadow-soft">
                <span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-forest/10 text-forest"><Shield size={18} /></span>
                <div><p class="text-sm font-bold text-ink">Security</p><p class="mt-1 text-sm leading-6 text-ink/65">{destination.security_advice}</p></div>
              </div>
            {/if}
            {#if destination.travel_insurance_note}
              <div class="flex gap-3 rounded-2xl border border-ink/10 bg-surface p-5 shadow-soft">
                <span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-goldfinch-gold/15 text-goldfinch-gold"><FileCheck size={18} /></span>
                <div><p class="text-sm font-bold text-ink">Travel insurance</p><p class="mt-1 text-sm leading-6 text-ink/65">{destination.travel_insurance_note}</p></div>
              </div>
            {/if}
            {#if destination.emergency_contacts}
              <div class="flex gap-3 rounded-2xl border border-ink/10 bg-surface p-5 shadow-soft">
                <span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-forest/10 text-forest"><Phone size={18} /></span>
                <div><p class="text-sm font-bold text-ink">Emergency contacts</p><p class="mt-1 text-sm leading-6 text-ink/65">{destination.emergency_contacts}</p></div>
              </div>
            {/if}
          </div>
        </div>
        <a class="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-forest transition hover:text-heading" href="/safety">
          Read the full health &amp; safety guide <ArrowRight size={16} />
        </a>
      </div>
    </section>
  {/if}

  <!-- Getting there (start & end points) -->
  {#if tripPoints.length}
    <section class="border-t border-ink/[0.06] bg-sand/30 py-14 md:py-20">
      <div class="container-shell">
        <SectionHeader
          eyebrow="Getting there"
          title={`How trips to ${destination.name} start and end`}
          description="The airports and hub towns we use as gateways — and how we connect you onward."
        />
        <div class="mt-9 grid gap-5 sm:grid-cols-2">
          {#each tripPoints as point (point.id)}
            <div class="flex gap-4 rounded-2xl border border-ink/10 bg-surface p-5 shadow-soft">
              <div class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-forest/10 text-forest">
                <Plane size={20} />
              </div>
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="text-base font-bold text-ink">{point.name}</h3>
                  {#if point.airport_code}
                    <span class="rounded-md bg-forest/10 px-1.5 py-0.5 font-mono text-[11px] font-bold text-forest">{point.airport_code}</span>
                  {/if}
                </div>
                <p class="mt-0.5 text-xs font-semibold uppercase tracking-[0.1em] text-clay">{roleLabel(point.role)}</p>
                {#if point.transfer_info}
                  <p class="mt-2 text-sm leading-6 text-ink/70">{point.transfer_info}</p>
                {:else if point.description}
                  <p class="mt-2 text-sm leading-6 text-ink/70">{point.description}</p>
                {/if}
              </div>
            </div>
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
            class="inline-flex items-center gap-1.5 text-sm font-semibold text-forest transition hover:text-heading"
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
            class="inline-flex items-center gap-1.5 text-sm font-semibold text-forest transition hover:text-heading"
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
    <div class="relative overflow-hidden rounded-none bg-gradient-to-br from-deep-green via-forest to-deep-green px-6 py-12 text-center text-white md:px-12 md:py-16">
      <div class="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-goldfinch-gold/20 blur-3xl"></div>
      <div class="pointer-events-none absolute -bottom-20 -left-12 h-56 w-56 rounded-full bg-savanna/15 blur-3xl"></div>
      <div class="relative mx-auto max-w-2xl">
        <h2 class="text-2xl font-extrabold md:text-3xl">Ready to explore {destination.name}?</h2>
        <p class="mt-3 text-white/75">
          Tell us what you have in mind and a local expert will craft a tailored plan — no payment needed to start.
        </p>
        <div class="mt-7 flex flex-wrap justify-center gap-3">
          <a
            class="inline-flex h-12 items-center gap-2 rounded-xl bg-goldfinch-gold px-6 font-bold text-heading shadow-lg transition hover:brightness-105"
            href="/plan-my-trip"
          >
            Plan My Safari <ArrowRight size={18} />
          </a>
          <a
            class="inline-flex h-12 items-center rounded-xl border border-white/30 px-6 font-semibold text-white transition hover:bg-surface/10"
            href="/contact"
          >
            Talk to an Advisor
          </a>
        </div>
      </div>
    </div>
  </section>
{/if}
