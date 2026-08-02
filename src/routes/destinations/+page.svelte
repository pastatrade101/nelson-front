<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowRight, MessageCircle } from '@lucide/svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { api } from '$lib/api/client';
  import { imgUrl, thumbUrl } from '$lib/img';
  import { groupByCircuit } from '$lib/destination-facts';
  import DestinationSpotlight from '$lib/components/public/DestinationSpotlight.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import EmptyState from '$lib/components/public/EmptyState.svelte';
  import SectionHeader from '$lib/components/public/SectionHeader.svelte';
  import CircuitMosaic from '$lib/components/public/CircuitMosaic.svelte';
  import CircuitTable from '$lib/components/public/CircuitTable.svelte';
  import IslandsShowcase from '$lib/components/public/IslandsShowcase.svelte';
  import JournalFeatureSection from '$lib/components/public/JournalFeatureSection.svelte';
  import FounderStorySection from '$lib/components/public/FounderStorySection.svelte';
  import GuestReviewsSection from '$lib/components/public/GuestReviewsSection.svelte';
  import FAQAccordion from '$lib/components/public/FAQAccordion.svelte';
  import type { BlogPost, Destination, FAQ, Testimonial, Tour } from '$lib/types';

  // Per-destination itinerary stats (real): count of published tours that
  // reference it + the lowest price_from. Powers "N itineraries · from $X".
  type TourStat = { count: number; from: number; currency: string; tours: Tour[] };
  let tourStats: Record<string, TourStat> = {};

  let destinations: Destination[] = [];
  let posts: BlogPost[] = [];
  let testimonials: Testimonial[] = [];
  let allFaqs: FAQ[] = [];
  let founderImage = '';
  let loading = true;
  let loadFailed = false;

  onMount(async () => {
    try {
      const res = await api.destinations.list({ status: 'published', limit: 100 });
      destinations = res.data.items ?? [];
    } catch {
      loadFailed = true;
    } finally {
      loading = false;
    }

    // Supporting content for the lower sections — best-effort, never blocking.
    const [p, t, f, h, tr] = await Promise.allSettled([
      api.blog.list({ status: 'published', limit: 8 }),
      api.testimonials.list({ status: 'published', limit: 6 }),
      api.faqs.list({ status: 'published', limit: 200 }),
      api.homepage.get(),
      api.tours.list({ status: 'published', limit: 100 })
    ]);
    if (p.status === 'fulfilled') posts = p.value.data.items ?? [];
    if (t.status === 'fulfilled') testimonials = t.value.data.items ?? [];
    if (f.status === 'fulfilled') allFaqs = f.value.data.items ?? [];
    if (tr.status === 'fulfilled') {
      const stats: Record<string, TourStat> = {};
      for (const tour of (tr.value.data.items ?? []) as Tour[]) {
        const id =
          (tour as unknown as { destinations?: { id?: string } }).destinations?.id ??
          (tour as unknown as { destination_id?: string }).destination_id;
        if (!id) continue;
        const s = (stats[id] = stats[id] ?? { count: 0, from: Infinity, currency: 'USD', tours: [] });
        s.count += 1;
        s.tours.push(tour);
        const price = tour.price_from ?? 0;
        if (price > 0 && price < s.from) { s.from = price; s.currency = tour.currency || 'USD'; }
      }
      for (const s of Object.values(stats)) if (s.from === Infinity) s.from = 0;
      tourStats = stats;
    }
    if (h.status === 'fulfilled') {
      const founder = (h.value.data ?? []).find(
        (s) => (s as Record<string, unknown>).section_key === 'founder_story'
      ) as Record<string, unknown> | undefined;
      if (founder && typeof founder.image_url === 'string') founderImage = founder.image_url;
    }
  });

  $: circuits = groupByCircuit(destinations);

  // Hero banner: prefer a featured destination's photo, else any destination
  // with an image; deep-green branded fallback when none has one yet.
  const destImg = (d: Destination) => thumbUrl(d, 'banner_image_url', 'main_image_url', 'image_url');
  $: heroSource = destinations.find((d) => d.is_featured && destImg(d)) ?? destinations.find((d) => destImg(d));
  $: heroImage = heroSource ? imgUrl(destImg(heroSource), 1920) : '';

  // Tab selection lives in the URL (?d=slug) so it's deep-linkable + shareable.
  // No selection (or ?d=all) = the default "all destinations" editorial page.
  $: selectedSlug = $page.url.searchParams.get('d') ?? '';
  $: spotlight =
    selectedSlug && selectedSlug !== 'all' ? destinations.find((d) => d.slug === selectedSlug) : undefined;

  // FAQ section is context-aware: a spotlighted destination shows its own FAQs;
  // otherwise only general (unattached) FAQs — never a mix of other destinations.
  $: faqs = spotlight
    ? allFaqs.filter((x) => x.destination_id === spotlight.id)
    : allFaqs.filter((x) => !x.destination_id);

  const selectTab = (slug: string) =>
    goto(slug === 'all' ? '/destinations' : `/destinations?d=${slug}`, {
      replaceState: true,
      noScroll: true,
      keepFocus: true
    });
</script>

<svelte:head>
  <title>Tanzania Safari Destinations & National Parks | Emnel Adventures</title>
  <meta
    name="description"
    content="Explore Tanzania's safari destinations — the Serengeti, Ngorongoro, Tarangire and the northern circuit, the wild southern parks of Ruaha and Nyerere, and the islands of Zanzibar, Pemba and Mafia. Planned by Arusha-based specialists."
  />
</svelte:head>

<!-- page header -->
<section class="relative overflow-hidden bg-deep-green text-white">
  {#if heroImage}
    <img src={heroImage} alt={heroSource?.name ?? ''} class="absolute inset-0 h-full w-full object-cover object-center" decoding="async" />
    <div class="absolute inset-0 bg-[linear-gradient(90deg,rgba(28,26,22,0.94)_0%,rgba(28,26,22,0.78)_45%,rgba(28,26,22,0.42)_100%)]"></div>
  {/if}
  <div class="container-shell relative py-16 md:py-24">
    <p class="text-[12px] font-bold uppercase tracking-[0.2em] text-goldfinch-gold">Safari destinations</p>
    <h1 class="mt-4 max-w-3xl font-serif text-4xl font-light leading-[1.08] md:text-6xl">Where to go on safari in Tanzania</h1>
    <p class="mt-5 max-w-2xl text-base leading-8 text-white/80 md:text-lg">
      One country, endless safari worlds. From the northern circuit's iconic parks to the wild, uncrowded south and the
      beaches of the Indian Ocean — here's how it all fits together, and how we help you choose.
    </p>

    <div class="mt-8 flex flex-wrap gap-3">
      <a href="#circuits" class="inline-flex h-12 items-center gap-2 bg-goldfinch-gold px-7 text-[12px] font-bold uppercase tracking-[0.14em] text-deep-green transition hover:bg-savanna">
        Explore Destinations <ArrowRight size={16} strokeWidth={2.5} />
      </a>
      <a href="/plan-my-trip" class="inline-flex h-12 items-center gap-2 border border-white/30 px-7 text-[12px] font-bold uppercase tracking-[0.14em] text-white transition hover:border-goldfinch-gold hover:text-goldfinch-gold">
        Plan My Safari
      </a>
    </div>

    <div class="mt-8 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/15 pt-6 text-[13px] font-medium text-white/80">
      {#each ['Arusha-based since 2016', 'Tanzania-born guides', 'Private vehicles only', 'Tailor-made journeys'] as point}
        <span class="inline-flex items-center gap-2"><span class="h-1.5 w-1.5 rounded-full bg-goldfinch-gold"></span>{point}</span>
      {/each}
    </div>
  </div>
</section>

{#if loading}
  <section class="container-shell py-20"><LoadingState message="Loading destinations..." /></section>
{:else if loadFailed}
  <section class="container-shell py-20">
    <ErrorState message="We couldn't load destinations right now. Please refresh in a moment." />
  </section>
{:else if !destinations.length}
  <section class="container-shell py-20">
    <EmptyState title="Destinations coming soon" message="Our destinations are being prepared. Please check back again shortly." />
  </section>
{:else}
  <!-- Sticky destination tabs — deep-linkable via ?d=slug -->
  <section class="sticky top-0 z-30 border-b border-ink/10 bg-surface/95 backdrop-blur">
    <div class="container-shell py-3">
      <div class="hide-scroll flex gap-2 overflow-x-auto" role="tablist" aria-label="Destinations">
        <button
          type="button"
          role="tab"
          aria-selected={!spotlight}
          class={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${!spotlight ? 'bg-deep-green text-white shadow-sm' : 'bg-sand/60 text-ink/65 hover:bg-sand'}`}
          on:click={() => selectTab('all')}
        >
          All destinations
        </button>
        {#each destinations as d (d.slug)}
          <button
            type="button"
            role="tab"
            aria-selected={selectedSlug === d.slug}
            class={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${selectedSlug === d.slug ? 'bg-deep-green text-white shadow-sm' : 'bg-sand/60 text-ink/65 hover:bg-sand'}`}
            on:click={() => selectTab(d.slug)}
          >
            {d.name}
          </button>
        {/each}
      </div>
    </div>
  </section>

  <!-- Spotlight for the selected destination (editorial layout stays below) -->
  {#if spotlight}
    {#key spotlight.slug}
      <DestinationSpotlight destination={spotlight} stat={tourStats[spotlight.id]} />
    {/key}
  {/if}

  <!-- Northern circuit — iconic parks mosaic -->
  {#if circuits.northern.length}
    <div id="circuits" class="scroll-mt-24">
      <CircuitMosaic destinations={circuits.northern} stats={tourStats} />
    </div>
  {/if}

  <!-- Combine-parks CTA -->
  <section class="border-y border-ink/[0.06] bg-savanna/20">
    <div class="container-shell flex flex-col items-start justify-between gap-4 py-8 sm:flex-row sm:items-center">
      <p class="font-serif text-xl italic text-heading md:text-2xl">Not sure which parks to combine? We'll tell you — honestly.</p>
      <a class="inline-flex h-11 shrink-0 items-center gap-2 bg-deep-green px-6 text-[12px] font-bold uppercase tracking-[0.14em] text-white transition hover:bg-forest" href="/plan-my-trip">
        Speak to a specialist <ArrowRight size={15} strokeWidth={2.5} />
      </a>
    </div>
  </section>

  <!-- Southern & western circuits — table -->
  {#if circuits.beyond.length}
    <CircuitTable destinations={circuits.beyond} stats={tourStats} />
  {/if}

  <!-- Islands -->
  {#if circuits.islands.length}
    <IslandsShowcase destinations={circuits.islands} stats={tourStats} />
  {/if}

  <!-- Planning hub — journal guides -->
  {#if posts.length}
    <JournalFeatureSection
      posts={posts}
      eyebrow="Planning hub"
      title="Planning a"
      accentTitle="Tanzania safari"
      ctaLabel="All guides"
      ctaHref="/blog"
    />
  {/if}

  <!-- Guest reviews -->
  {#if testimonials.length}
    <GuestReviewsSection testimonials={testimonials} />
  {/if}

  <!-- Founder message -->
  <FounderStorySection
    eyebrow="A message from Nelson Laizer · Founder"
    title="Tell us what you're imagining"
    accentTitle="and we'll build it around you."
    content="I grew up in Arusha, at the foot of Mount Meru, with Kilimanjaro visible on clear mornings. The guides who work with us have spent years in these parks — not as observers, but as people who understand how the bush moves. When guests ask me which park is best, I ask them a question back: what does a good day in the bush look like to you? That answer shapes everything. We don't sell packages — we design safaris around people."
    quote="“We don’t sell packages. We design safaris around people.”"
    imageUrl={founderImage || undefined}
    imageCaption="Nelson Laizer, Founder — Emnel Adventures"
    primaryCta="Start a conversation"
    primaryHref="/plan-my-trip"
    secondaryCta="Message on WhatsApp"
    secondaryHref="/contact"
  />

  <!-- FAQs -->
  {#if faqs.length}
    <section class="bg-sand/30 py-14 md:py-20">
      <div class="container-shell">
        <SectionHeader
          eyebrow={spotlight ? `${spotlight.name} FAQs` : 'Tanzania safari FAQs'}
          title={spotlight ? `Questions about ${spotlight.name}` : 'Questions we hear most often'}
          description={spotlight
            ? `The questions travellers ask us most about ${spotlight.name} — answered the way we'd answer them in person.`
            : "Planning a first safari raises a lot of questions. Here are the ones we're asked most — answered the way we'd answer them in person."}
        />
        <div class="mt-9 grid gap-8 lg:grid-cols-[1fr_0.4fr]">
          <FAQAccordion faqs={faqs} />
          <div class="h-max border border-goldfinch-gold/30 bg-surface p-6 shadow-soft">
            <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-clay">Still have questions?</p>
            <p class="mt-2 font-serif text-xl text-heading">Speak directly with our Arusha team.</p>
            <a class="mt-5 inline-flex h-11 items-center gap-2 bg-deep-green px-5 text-[12px] font-bold uppercase tracking-[0.14em] text-white transition hover:bg-forest" href="/contact">
              <MessageCircle size={16} /> Start a conversation
            </a>
          </div>
        </div>
      </div>
    </section>
  {/if}

  <!-- Closing CTA -->
  <section class="container-shell py-14 md:py-16">
    <div class="relative overflow-hidden bg-gradient-to-br from-deep-green via-forest to-deep-green px-6 py-12 text-center text-white md:px-12 md:py-16">
      <div class="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-goldfinch-gold/20 blur-3xl"></div>
      <div class="relative mx-auto max-w-2xl">
        <h2 class="font-serif text-2xl font-light md:text-4xl">Ready to plan your Tanzania safari?</h2>
        <p class="mt-3 text-white/75">Tell us your dates and what you have in mind — a local expert will build a tailored plan. No payment needed to start.</p>
        <div class="mt-7 flex flex-wrap justify-center gap-3">
          <a class="inline-flex h-12 items-center gap-2 bg-goldfinch-gold px-6 text-[13px] font-bold uppercase tracking-[0.08em] text-deep-green transition hover:bg-savanna" href="/plan-my-trip">
            Plan My Safari <ArrowRight size={18} />
          </a>
          <a class="inline-flex h-12 items-center border border-white/30 px-6 text-[13px] font-bold uppercase tracking-[0.08em] text-white transition hover:bg-white/10" href="/contact">
            Talk to an Advisor
          </a>
        </div>
      </div>
    </div>
  </section>
{/if}

<style>
  .hide-scroll {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .hide-scroll::-webkit-scrollbar {
    display: none;
  }
</style>
