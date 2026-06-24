<script lang="ts">
  import { ArrowRight, BedDouble, CalendarDays, Check, MapPin, MessageCircle, Mountain, Sparkles, Users, Utensils, X } from '@lucide/svelte';
  import { fade, scale } from 'svelte/transition';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { trackEvent } from '$lib/analytics';
  import { api } from '$lib/api/client';
  import { staggeredCardReveal } from '$lib/animations/motion';
  import { publicSettings, settingText } from '$lib/settings';
  import BlogCard from '$lib/components/public/BlogCard.svelte';
  import BookingForm from '$lib/components/public/BookingForm.svelte';
  import EmailItineraryCapture from '$lib/components/public/EmailItineraryCapture.svelte';
  import JsonLd from '$lib/components/public/JsonLd.svelte';
  import ShortlistButton from '$lib/components/public/ShortlistButton.svelte';
  import SpecialistCard from '$lib/components/public/SpecialistCard.svelte';
  import { defaultSpecialist } from '$lib/data/specialists';
  import TripCostSection from '$lib/components/public/TripCostSection.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';
  import SectionHeader from '$lib/components/public/SectionHeader.svelte';
  import TourCard from '$lib/components/public/TourCard.svelte';
  import { placeholderTours } from '$lib/data/placeholders';
  import type { BlogPost, Tour } from '$lib/types';

  let tour: Tour | null = null;
  let loading = true;
  let error = '';

  // Booking form opens in a modal on request.
  let formOpen = false;
  const openForm = () => (formOpen = true);
  const closeForm = () => (formOpen = false);
  $: if (browser) document.body.style.overflow = formOpen ? 'hidden' : '';

  // Shortlist item for the save button.
  $: shortlistItem = tour
    ? {
        slug: tour.slug,
        title: tour.title,
        image_url: tour.main_image_url,
        duration_days: tour.duration_days,
        price_from: tour.price_from,
        currency: tour.currency,
        destination: (tour as unknown as { destinations?: { name?: string } }).destinations?.name
      }
    : null;

  // WhatsApp deep-link pre-filled with the trip name (spec §7).
  $: waDigits = (settingText($publicSettings, 'whatsapp_number') || '+255 700 000 000').replace(/\D/g, '');
  $: waHref = tour
    ? `https://wa.me/${waDigits}?text=${encodeURIComponent(`Hi Goldfinch, I'm interested in the ${tour.title}. Can you help me plan it?`)}`
    : '#';

  // SEO schema (SRS v2.0 §7.4): TouristTrip + BreadcrumbList.
  $: origin = $page.url.origin;
  $: touristTripLd = tour
    ? {
        '@type': 'TouristTrip',
        name: tour.title,
        description: tour.short_description ?? tour.full_description ?? '',
        ...(tour.main_image_url ? { image: tour.main_image_url } : {}),
        ...(tour.price_from
          ? { offers: { '@type': 'Offer', price: tour.price_from, priceCurrency: tour.currency ?? 'USD' } }
          : {}),
        url: `${origin}/tours/${tour.slug}`
      }
    : null;
  $: breadcrumbLd = tour
    ? {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
          { '@type': 'ListItem', position: 2, name: 'Tours', item: `${origin}/tours` },
          { '@type': 'ListItem', position: 3, name: tour.title, item: `${origin}/tours/${tour.slug}` }
        ]
      }
    : null;

  // Day-by-day itinerary + what's included (embedded in the tour detail response).
  $: itineraryDays = [...(tour?.itinerary_days ?? [])].sort((a, b) => (a.day_number ?? 0) - (b.day_number ?? 0));
  $: inclusions = [...(tour?.tour_inclusions ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  $: exclusions = [...(tour?.tour_exclusions ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  $: highlights = tour?.highlights ?? [];
  $: groupSize = tour
    ? tour.group_size_min && tour.group_size_max
      ? `${tour.group_size_min}–${tour.group_size_max} people`
      : tour.group_size_max
        ? `Up to ${tour.group_size_max} people`
        : tour.group_size ?? ''
    : '';

  // Relevant content for onward navigation (loaded best-effort after the tour).
  let relatedTours: Tour[] = [];
  let recentPosts: BlogPost[] = [];

  const loadRelated = async (current: Tour) => {
    const destId = (current as unknown as { destination_id?: string | null }).destination_id ?? null;

    const [tourRes, postRes] = await Promise.allSettled([
      api.tours.list(destId ? { destination_id: destId, limit: 7 } : { limit: 7 }),
      api.blog.list({ limit: 3 })
    ]);

    if (tourRes.status === 'fulfilled') {
      let items = (tourRes.value.data.items ?? []).filter(
        (item) => item.id !== current.id && item.slug !== current.slug
      );
      // If this destination only has the current tour, fall back to any tours.
      if (!items.length && destId) {
        const fallback = await api.tours.list({ limit: 7 }).catch(() => null);
        items = (fallback?.data.items ?? []).filter(
          (item) => item.id !== current.id && item.slug !== current.slug
        );
      }
      relatedTours = items.slice(0, 3);
    }
    if (postRes.status === 'fulfilled') {
      recentPosts = postRes.value.data.items ?? [];
    }
  };

  const load = async (slug: string) => {
    loading = true;
    error = '';
    relatedTours = [];
    recentPosts = [];
    try {
      const response = await api.tours.get(slug);
      tour = response.data;
    } catch (requestError) {
      error = requestError instanceof Error ? requestError.message : 'Unable to load tour.';
      tour = placeholderTours.find((item) => item.slug === slug) ?? placeholderTours[0];
    } finally {
      loading = false;
    }

    if (tour) {
      void loadRelated(tour);
      trackEvent('tour_page_view', { tour_id: tour.id, tour_title: tour.title, destination: tour.destinations?.name });
    }
  };

  // The component is reused across /tours/[slug] navigations, so a one-shot
  // onMount would leave the page stale. Re-load whenever the slug changes.
  $: slug = $page.params.slug ?? '';
  $: if (browser && slug) void load(slug);
</script>

<section class="container-shell py-14">
  {#if loading}
    <LoadingState message="Loading tour..." />
  {:else if !tour}
    <ErrorState message={error || 'Tour not found.'} />
  {:else}
    <nav class="mb-6 flex items-center gap-2 text-sm">
      <a class="font-medium text-ink/70 transition hover:text-forest" href="/tours">Tours</a>
      <span class="text-ink/30">/</span>
      <span class="font-medium text-ink/80">{tour.title}</span>
    </nav>

    <div class="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
      <div>
        <div class="aspect-[16/10] overflow-hidden rounded-lg bg-skywash">
          {#if tour.main_image_url}
            <img class="h-full w-full object-cover" src={tour.main_image_url} alt={tour.title} />
          {/if}
        </div>
        <div class="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1">
          <p class="text-sm font-semibold uppercase tracking-[0.16em] text-clay">{tour.duration_days ?? 1} days</p>
          {#if tour.price_from}
            <p class="text-sm text-ink/70">
              from
              <span class="text-lg font-extrabold text-heading">{tour.currency ?? 'USD'} {tour.price_from.toLocaleString()}</span>
              <span class="text-ink/70">/ person</span>
            </p>
          {/if}
        </div>
        <h1 class="mt-2 text-4xl font-bold tracking-normal text-ink">{tour.title}</h1>
        <p class="mt-4 text-base leading-7 text-ink/70">{tour.full_description ?? tour.short_description}</p>

        <!-- primary actions (mobile; desktop uses the sticky booking card) -->
        <div class="mt-7 grid gap-3 lg:hidden">
          <button
            class="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-goldfinch-gold px-6 font-bold text-heading shadow-sm transition hover:brightness-105"
            type="button"
            on:click={openForm}
          >
            <Sparkles size={18} strokeWidth={2.4} /> Request this trip
          </button>
          <a
            class="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-6 font-semibold text-white shadow-sm transition hover:brightness-105"
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle size={18} strokeWidth={2.2} /> Chat on WhatsApp
          </a>
          {#if shortlistItem}
            <ShortlistButton item={shortlistItem} variant="full" />
          {/if}
        </div>

        <!-- "a starting point, tailored to you" (spec §4.4 C) -->
        <div class="mt-6 flex items-start gap-3 rounded-2xl border border-goldfinch-gold/30 bg-savanna/20 p-4">
          <Sparkles size={20} class="mt-0.5 shrink-0 text-goldfinch-gold" />
          <p class="text-sm leading-6 text-ink/75">
            <span class="font-semibold text-ink">A starting point, tailored to you.</span>
            This itinerary is a sample — a Goldfinch specialist will adapt it to your dates, pace and interests.
          </p>
        </div>

        <!-- trust strip (spec §4.4 B) -->
        <div class="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
          {#each ['Local experts', 'Customizable itinerary', 'No-pressure planning', 'Secure enquiry'] as point}
            <span class="inline-flex items-center gap-1.5 text-sm font-medium text-ink/65">
              <span class="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-forest/10 text-forest"><Check size={11} strokeWidth={3} /></span>
              {point}
            </span>
          {/each}
        </div>

        <!-- trip facts -->
        {#if tour.duration_days || tour.start_location || tour.end_location || groupSize || tour.difficulty_level || tour.minimum_age}
          <div class="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {#if tour.duration_days}
              <div class="rounded-[10px] border border-ink/10 bg-sand/30 p-3.5">
                <span class="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink/70"><CalendarDays size={13} /> Duration</span>
                <p class="mt-1 text-sm font-bold text-ink">{tour.duration_days} days{tour.duration_nights ? ` · ${tour.duration_nights} nights` : ''}</p>
              </div>
            {/if}
            {#if tour.start_location || tour.end_location}
              <div class="rounded-[10px] border border-ink/10 bg-sand/30 p-3.5">
                <span class="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink/70"><MapPin size={13} /> Start / End</span>
                <p class="mt-1 text-sm font-bold text-ink">{tour.start_location ?? '—'} → {tour.end_location ?? '—'}</p>
              </div>
            {/if}
            {#if groupSize}
              <div class="rounded-[10px] border border-ink/10 bg-sand/30 p-3.5">
                <span class="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink/70"><Users size={13} /> Group size</span>
                <p class="mt-1 text-sm font-bold text-ink">{groupSize}</p>
              </div>
            {/if}
            {#if tour.difficulty_level}
              <div class="rounded-[10px] border border-ink/10 bg-sand/30 p-3.5">
                <span class="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink/70"><Mountain size={13} /> Difficulty</span>
                <p class="mt-1 text-sm font-bold text-ink">{tour.difficulty_level}</p>
              </div>
            {/if}
            {#if tour.minimum_age}
              <div class="rounded-[10px] border border-ink/10 bg-sand/30 p-3.5">
                <span class="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink/70"><Check size={13} /> Minimum age</span>
                <p class="mt-1 text-sm font-bold text-ink">{tour.minimum_age}+</p>
              </div>
            {/if}
          </div>
        {/if}

        <!-- trip highlights -->
        {#if highlights.length}
          <section class="mt-9">
            <h2 class="text-xl font-bold text-heading">Trip highlights</h2>
            <div class="mt-3 grid gap-2 sm:grid-cols-2">
              {#each highlights as h}
                <span class="inline-flex items-start gap-2 text-sm leading-6 text-ink/75">
                  <span class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-goldfinch-gold/20 text-goldfinch-gold"><Check size={12} strokeWidth={3} /></span>
                  {h}
                </span>
              {/each}
            </div>
          </section>
        {/if}

        <!-- day-by-day itinerary -->
        {#if itineraryDays.length}
          <section class="mt-10">
            <h2 class="text-2xl font-bold text-heading">Day-by-day itinerary</h2>
            <p class="mt-1 text-sm text-ink/70">A sample flow — your specialist can tailor every day to you.</p>
            <ol class="mt-6 space-y-4">
              {#each itineraryDays as day (day.day_number)}
                <li class="rounded-[10px] border border-ink/10 bg-surface p-5 shadow-sm transition hover:border-forest/30">
                  <div class="flex gap-4">
                    <span class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-forest text-sm font-extrabold text-white">{day.day_number}</span>
                    <div class="min-w-0 flex-1">
                      <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-clay">Day {day.day_number}</p>
                      <h3 class="mt-0.5 text-lg font-bold text-ink">{day.title}</h3>
                      {#if day.description}<p class="mt-1.5 text-sm leading-6 text-ink/70">{day.description}</p>{/if}
                      {#if day.accommodation || day.meals || day.activities}
                        <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-medium text-ink/70">
                          {#if day.activities}<span class="inline-flex items-center gap-1.5"><MapPin size={14} class="text-forest" /> {day.activities}</span>{/if}
                          {#if day.accommodation}<span class="inline-flex items-center gap-1.5"><BedDouble size={14} class="text-forest" /> {day.accommodation}</span>{/if}
                          {#if day.meals}<span class="inline-flex items-center gap-1.5"><Utensils size={14} class="text-forest" /> {day.meals}</span>{/if}
                        </div>
                      {/if}
                    </div>
                  </div>
                </li>
              {/each}
            </ol>
          </section>
        {/if}

        <!-- what's included / not included -->
        {#if inclusions.length || exclusions.length}
          <section class="mt-10 grid gap-6 sm:grid-cols-2">
            {#if inclusions.length}
              <div class="rounded-[10px] border border-ink/10 bg-surface p-5 shadow-sm">
                <h3 class="text-base font-bold text-ink">What's included</h3>
                <ul class="mt-3 space-y-2">
                  {#each inclusions as inc}
                    <li class="flex gap-2 text-sm leading-6 text-ink/70">
                      <span class="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-forest/10 text-forest"><Check size={11} strokeWidth={3} /></span>
                      {inc.title}
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}
            {#if exclusions.length}
              <div class="rounded-[10px] border border-ink/10 bg-surface p-5 shadow-sm">
                <h3 class="text-base font-bold text-ink">Not included</h3>
                <ul class="mt-3 space-y-2">
                  {#each exclusions as exc}
                    <li class="flex gap-2 text-sm leading-6 text-ink/70">
                      <span class="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-black/5 text-ink/40"><X size={11} strokeWidth={3} /></span>
                      {exc.title}
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}
          </section>
        {/if}

        <!-- cost confidence (spec §4.4 G) -->
        <div class="mt-10">
          <TripCostSection priceFrom={tour.price_from} currency={tour.currency ?? 'USD'} tourSlug={tour.slug} />
        </div>

        <!-- low-commitment capture (spec §7) -->
        <div class="mt-6 sm:max-w-md">
          <EmailItineraryCapture tourTitle={tour.title} />
        </div>
      </div>
      <div>
        <!-- sticky booking summary card -->
        <div class="lg:sticky lg:top-24">
          <div class="overflow-hidden rounded-[12px] border border-ink/10 bg-surface shadow-[0_18px_50px_rgba(15,47,36,0.10)]">
            <div class="bg-gradient-to-br from-deep-green to-forest p-5 text-white">
              <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-savanna">From</p>
              <p class="mt-0.5 text-3xl font-extrabold leading-none">
                {tour.currency ?? 'USD'} {(tour.price_from ?? 0).toLocaleString()}
                <span class="text-sm font-semibold text-white/70">/ person</span>
              </p>
              <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium text-white/85">
                {#if tour.duration_days}<span class="inline-flex items-center gap-1.5"><CalendarDays size={14} /> {tour.duration_days} days</span>{/if}
                {#if groupSize}<span class="inline-flex items-center gap-1.5"><Users size={14} /> {groupSize}</span>{/if}
              </div>
            </div>

            <div class="grid gap-3 p-5">
              <button
                class="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-goldfinch-gold px-6 font-bold text-heading shadow-sm transition hover:brightness-105"
                type="button"
                on:click={openForm}
              >
                <Sparkles size={18} strokeWidth={2.4} /> Request this trip
              </button>
              <a
                class="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-6 font-semibold text-white shadow-sm transition hover:brightness-105"
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle size={18} strokeWidth={2.2} /> Chat on WhatsApp
              </a>
              {#if shortlistItem}
                <ShortlistButton item={shortlistItem} variant="full" />
              {/if}

              <p class="flex items-center justify-center gap-1.5 pt-1 text-center text-xs text-ink/70">
                <Check size={13} class="text-forest" /> No payment now — a request, not a final booking.
              </p>

              <div class="mt-1 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-ink/[0.07] pt-3">
                {#each ['Local experts', 'Tailor-made', 'No-pressure planning', 'Private & secure'] as point}
                  <span class="inline-flex items-center gap-1.5 text-xs font-medium text-ink/70">
                    <span class="grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full bg-forest/10 text-forest"><Check size={9} strokeWidth={3} /></span>
                    {point}
                  </span>
                {/each}
              </div>
            </div>
          </div>

          <div class="mt-6">
            <SpecialistCard specialist={defaultSpecialist} />
          </div>
        </div>
      </div>
    </div>
  {/if}
</section>

<!-- booking request modal -->
{#if formOpen && tour}
  <div class="fixed inset-0 z-[60] grid place-items-center overflow-y-auto p-4" role="dialog" aria-modal="true" aria-label="Booking request">
    <button class="fixed inset-0 cursor-default bg-black/55 backdrop-blur-sm" type="button" aria-label="Close" on:click={closeForm} transition:fade={{ duration: 150 }}></button>
    <div class="relative my-auto w-full max-w-xl" transition:scale={{ duration: 180, start: 0.97 }}>
      <button
        class="absolute -top-3 right-0 z-10 grid h-9 w-9 place-items-center rounded-full bg-surface text-ink shadow-md transition hover:bg-sand sm:-right-3"
        type="button"
        aria-label="Close"
        on:click={closeForm}
      >
        <X size={18} />
      </button>
      <BookingForm {tour} />
    </div>
  </div>
{/if}

<svelte:window on:keydown={(e) => e.key === 'Escape' && closeForm()} />

{#if touristTripLd}<JsonLd data={touristTripLd} />{/if}
{#if breadcrumbLd}<JsonLd data={breadcrumbLd} />{/if}

{#if tour && !loading}
  <!-- More tours -->
  {#if relatedTours.length}
    <section class="border-t border-ink/[0.06] bg-sand/30 py-14 md:py-20">
      <div class="container-shell">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <SectionHeader
            eyebrow="You might also like"
            title="More tours"
            description="Other trusted trips travellers book with us."
          />
          <a
            class="inline-flex items-center gap-1.5 text-sm font-semibold text-forest transition hover:text-heading"
            href="/tours"
          >
            Browse all tours <ArrowRight size={16} />
          </a>
        </div>
        <div class="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 18, stagger: 0.07 }}>
          {#each relatedTours as item (item.id)}
            <TourCard tour={item} />
          {/each}
        </div>
      </div>
    </section>
  {/if}

  <!-- Recent stories -->
  {#if recentPosts.length}
    <section class="py-14 md:py-20">
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
{/if}
