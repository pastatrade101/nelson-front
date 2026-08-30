<script lang="ts">
  import {
    ArrowLeft,
    ArrowRight,
    BedDouble,
    CalendarDays,
    Check,
    ChevronDown,
    Compass,
    MapPin,
    MessageCircle,
    Mountain,
    Route,
    Sparkles,
    Users,
    Utensils,
    Wallet,
    X
  } from '@lucide/svelte';
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { trackEvent } from '$lib/analytics';
  import { api } from '$lib/api/client';
  import { currency, formatUsd } from '$lib/currency';
  import { staggeredCardReveal } from '$lib/animations/motion';
  import { origUrl, thumbUrl } from '$lib/img';
  import { hasRichContent } from '$lib/richtext';
  import { publicSettings, settingText } from '$lib/settings';
  import { tierLabel } from '$lib/tiers';
  import BookingForm from '$lib/components/public/BookingForm.svelte';
  import BlogCard from '$lib/components/public/BlogCard.svelte';
  import EmailItineraryCapture from '$lib/components/public/EmailItineraryCapture.svelte';
  import InclusionsGrid from '$lib/components/public/InclusionsGrid.svelte';
  import JsonLd from '$lib/components/public/JsonLd.svelte';
  import RichText from '$lib/components/public/RichText.svelte';
  import SectionHeader from '$lib/components/public/SectionHeader.svelte';
  import ShortlistButton from '$lib/components/public/ShortlistButton.svelte';
  import ResponsiveImage from '$lib/components/public/ResponsiveImage.svelte';
  import TourCardRich from '$lib/components/public/TourCardRich.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';
  import type { BlogPost, FAQ, ItineraryDay, Tour } from '$lib/types';

  type DisplayDay = ItineraryDay;

  const DEFAULT_TOUR_IMAGE = 'https://images.unsplash.com/photo-1516426122078-c23e76319801';

  const sampleItineraryToDays = (value: unknown): DisplayDay[] => {
    let raw = value;
    if (typeof raw === 'string') {
      try {
        raw = JSON.parse(raw);
      } catch {
        return [];
      }
    }
    if (!Array.isArray(raw)) return [];

    return raw
      .map((item, index) => {
        if (!item || typeof item !== 'object') return null;
        const source = item as Record<string, unknown>;
        const dayNumber = Number(source.day_number ?? source.day ?? index + 1);
        const title = typeof source.title === 'string' ? source.title : `Day ${dayNumber}`;
        if (!Number.isFinite(dayNumber) || !title.trim()) return null;
        return {
          day_number: dayNumber,
          title,
          description: typeof source.description === 'string' ? source.description : null,
          accommodation: typeof source.accommodation === 'string' ? source.accommodation : null,
          meals: typeof source.meals === 'string' ? source.meals : null,
          activities: typeof source.activities === 'string' ? source.activities : null,
          image_url: typeof source.image_url === 'string' ? source.image_url : null
        };
      })
      .filter(Boolean) as DisplayDay[];
  };

  const postCardImage = (post: BlogPost) =>
    thumbUrl(post as unknown as Record<string, unknown>, 'featured_image_url') || post.featured_image_url || DEFAULT_TOUR_IMAGE;

  let tour: Tour | null = null;
  let loading = true;
  let error = '';

  // Every "Plan this trip" / "Start a conversation" CTA opens the stepper booking
  // form in an overlay — a centered modal on desktop, a bottom sheet on mobile.
  // (The desktop sticky sidebar still shows the same form inline.)
  let sheetOpen = false;
  const closeSheet = () => (sheetOpen = false);
  $: if (browser) document.body.style.overflow = sheetOpen ? 'hidden' : '';

  const openPlanner = (source = '') => {
    trackEvent('request_trip_opened', { tour_id: tour?.id, metadata: { source } });
    sheetOpen = true;
  };

  // "About this safari" prose is clamped to ~4 lines with a Read more toggle;
  // the button only appears when the text actually overflows the clamp.
  let overviewEl: HTMLElement;
  let overviewExpanded = false;
  let overviewOverflows = false;
  const measureOverview = () => {
    if (!overviewEl) return;
    overviewOverflows = overviewEl.scrollHeight > 118;
  };

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
    ? `https://wa.me/${waDigits}?text=${encodeURIComponent(`Hi Emnel, I'm interested in the ${tour.title}. Can you help me plan it?`)}`
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
          { '@type': 'ListItem', position: 2, name: 'Itineraries', item: `${origin}/tours` },
          { '@type': 'ListItem', position: 3, name: tour.title, item: `${origin}/tours/${tour.slug}` }
        ]
      }
    : null;

  // Human-readable labels for the tour_price_options.price_type enum.
  const priceTypeLabels: Record<string, string> = {
    per_person: 'Per person',
    per_group: 'Per group',
    per_child: 'Per child',
    single_supplement: 'Single supplement',
    upgrade: 'Upgrade',
    discount: 'Discount'
  };
  const priceTypeLabel = (value?: string | null) => (value ? priceTypeLabels[value] ?? value : 'Per person');

  // Day-by-day itinerary + what's included (embedded in the tour detail response).
  $: itineraryDays = [...(tour?.itinerary_days ?? [])].sort((a, b) => (a.day_number ?? 0) - (b.day_number ?? 0));

  /**
   * Up to four photographs of the property a day stays at.
   *
   * Prefers the lodge's own ordered gallery, then falls back to its hero and card
   * images, so a property with no gallery yet still shows something. Deduped,
   * because the migration seeds hero/card into the gallery and a lodge edited
   * since could hold the same URL twice. Empty for a day whose accommodation is
   * still free text — there is no record to show, and inventing one would be
   * worse than showing nothing.
   */
  const stayImages = (day: DisplayDay) => {
    const lodge = day.lodge;
    if (!lodge) return [] as { url: string; alt: string }[];
    const gallery = [...(lodge.lodge_images ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const seen = new Set<string>();
    const out: { url: string; alt: string }[] = [];
    const add = (url?: string | null, alt?: string | null) => {
      const clean = (url ?? '').trim();
      if (!clean || seen.has(clean) || out.length >= 4) return;
      seen.add(clean);
      out.push({ url: clean, alt: (alt ?? '').trim() || lodge.name });
    };
    for (const image of gallery) add(image.image_url, image.alt_text || image.caption);
    add(lodge.hero_image_url);
    add(lodge.image_url);
    return out;
  };
  $: inclusions = [...(tour?.tour_inclusions ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  $: exclusions = [...(tour?.tour_exclusions ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  // InclusionsGrid is driven by plain strings; map the sorted records here.
  $: inclusionTitles = inclusions.map((inc) => inc.title);
  $: exclusionTitles = exclusions.map((exc) => exc.title);
  $: priceOptions = [...(tour?.tour_price_options ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  $: galleryImages = [...(tour?.tour_images ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
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
  let faqs: FAQ[] = [];

  const loadRelated = async (current: Tour) => {
    const destId = (current as unknown as { destination_id?: string | null }).destination_id ?? null;

    const [tourRes, postRes, faqRes] = await Promise.allSettled([
      api.tours.list(destId ? { destination_id: destId, limit: 7 } : { limit: 7 }),
      api.blog.list({ limit: 6 }),
      api.faqs.list({ destination_id: 'null', limit: 10 })
    ]);

    if (tourRes.status === 'fulfilled') {
      let items = (tourRes.value.data.items ?? []).filter(
        (item) => item.id !== current.id && item.slug !== current.slug
      );
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
    if (faqRes.status === 'fulfilled') {
      faqs = faqRes.value.data.items ?? [];
    } else {
      faqs = [];
    }
  };

  const load = async (slug: string) => {
    loading = true;
    error = '';
    relatedTours = [];
    recentPosts = [];
    faqs = [];
    sheetOpen = false;
    overviewExpanded = false;
    overviewOverflows = false;
    try {
      const response = await api.tours.get(slug);
      tour = response.data;
    } catch (requestError) {
      error = requestError instanceof Error ? requestError.message : 'Unable to load tour.';
      tour = null;
    } finally {
      loading = false;
    }

    if (tour) {
      void loadRelated(tour);
      trackEvent('tour_page_view', {
        tour_id: tour.id,
        tour_title: tour.title,
        destination: tour.destinations?.name,
        experience_type: tour.experience_type,
        duration_days: tour.duration_days ?? undefined,
        price_from: tour.price_from ?? undefined,
        currency: tour.currency ?? undefined
      });
      if (browser) requestAnimationFrame(() => requestAnimationFrame(measureOverview));
    }
  };

  // The component is reused across /tours/[slug] navigations, so a one-shot
  // onMount would leave the page stale. Re-load whenever the slug changes.
  $: slug = $page.params.slug ?? '';
  $: if (browser && slug) void load(slug);

  $: displayDays = tour
    ? itineraryDays.length
      ? itineraryDays
      : sampleItineraryToDays(tour.sample_itinerary)
    : [];
  $: heroImage = tour ? tour.banner_image_url || tour.main_image_url || DEFAULT_TOUR_IMAGE : DEFAULT_TOUR_IMAGE;
  $: destinationName = tour?.destinations?.name ?? tour?.destinations?.country ?? 'Tanzania';
  $: categoryName = tour?.tour_categories?.name ?? tour?.experience_type ?? 'Private Safari';
  $: durationText = tour?.duration_days
    ? `${tour.duration_days} days${tour.duration_nights ? ` / ${tour.duration_nights} nights` : ''}`
    : 'Tailor-made timing';
  $: priceText = tour?.price_from ? formatUsd(tour.price_from, $currency) : 'On request';
  $: routeLabel = tour?.start_location || tour?.end_location
    ? `${tour.start_location ?? destinationName} to ${tour.end_location ?? destinationName}`
    : `${destinationName} route`;
  // Compact trip facts for the overview grid — only the ones we actually have.
  $: tripFacts = [
    tour?.duration_days ? { icon: CalendarDays, label: 'Duration', value: durationText } : null,
    groupSize ? { icon: Users, label: 'Group size', value: groupSize } : null,
    tierLabel(tour?.budget_tier) ? { icon: Sparkles, label: 'Style', value: tierLabel(tour?.budget_tier) } : null,
    tour?.difficulty_level ? { icon: Mountain, label: 'Pace', value: `${tour.difficulty_level}` } : null,
    { icon: Route, label: 'Route', value: routeLabel },
    tour?.minimum_age ? { icon: Check, label: 'Minimum age', value: `${tour.minimum_age}+` } : null
  ].filter(Boolean) as Array<{ icon: typeof CalendarDays; label: string; value: string }>;

  $: planningCards = recentPosts.slice(0, 6);
  $: tourNavLinks = [
    { key: 'overview', label: 'Overview', show: true },
    { key: 'itinerary', label: 'Day by Day', show: displayDays.length > 0 },
    { key: 'gallery', label: 'Gallery', show: galleryImages.length > 0 },
    { key: 'included', label: 'Inclusions', show: inclusions.length > 0 || exclusions.length > 0 },
    { key: 'pricing', label: 'Prices', show: priceOptions.length > 0 },
    { key: 'related', label: 'More Trips', show: relatedTours.length > 0 },
    { key: 'planning', label: 'Journal', show: planningCards.length > 0 },
    { key: 'faqs', label: 'Good to Know', show: faqs.length > 0 }
  ].filter((link) => link.show);

  // Sticky scroll-spy tab bar (mirrors the previous behaviour).
  let activeTab = 'overview';
  $: if (tourNavLinks.length && !tourNavLinks.some((l) => l.key === activeTab)) activeTab = tourNavLinks[0].key;

  const navHeight = () => document.querySelector('header')?.getBoundingClientRect().height ?? 0;
  function stickBelowNav(node: HTMLElement) {
    const apply = () => { node.style.top = `${Math.round(navHeight())}px`; };
    apply();
    requestAnimationFrame(apply);
    window.addEventListener('resize', apply);
    return { destroy() { window.removeEventListener('resize', apply); } };
  }

  const stickyOffset = () => {
    const tabBar = document.getElementById('tour-tabs');
    return navHeight() + (tabBar ? tabBar.getBoundingClientRect().height : 56);
  };

  // Keep the booking sidebar pinned just below the sticky nav + tab bar.
  function stickBelowTabs(node: HTMLElement) {
    const apply = () => { node.style.top = `${Math.round(stickyOffset()) + 16}px`; };
    apply();
    requestAnimationFrame(apply);
    window.addEventListener('resize', apply);
    return { destroy() { window.removeEventListener('resize', apply); } };
  }

  let spySuppressedUntil = 0;
  const selectTab = (key: string) => {
    activeTab = key;
    const el = typeof document !== 'undefined' ? document.getElementById(key) : null;
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - stickyOffset() - 8;
    spySuppressedUntil = Date.now() + 800;
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
  };

  const updateSpy = () => {
    if (typeof window === 'undefined' || Date.now() < spySuppressedUntil) return;
    const trigger = stickyOffset() + 12;
    let current = tourNavLinks[0]?.key ?? activeTab;
    for (const link of tourNavLinks) {
      const el = document.getElementById(link.key);
      if (el && el.getBoundingClientRect().top <= trigger) current = link.key;
    }
    if (current && current !== activeTab) activeTab = current;
  };

  // FAQ progress rail: mark items complete/active as they scroll past centre.
  let faqStates: Record<string, 'upcoming' | 'active' | 'complete'> = {};
  const updateFaqTimeline = () => {
    if (typeof window === 'undefined') return;
    const items = [...document.querySelectorAll<HTMLElement>('[data-faq-item]')];
    if (!items.length) return;
    const mid = window.innerHeight * 0.5;
    let lastPassed = -1;
    items.forEach((el, i) => { if (el.getBoundingClientRect().top <= mid) lastPassed = i; });
    const next: Record<string, 'upcoming' | 'active' | 'complete'> = {};
    items.forEach((el, i) => {
      const id = el.dataset.faqId ?? String(i);
      next[id] = i < lastPassed ? 'complete' : i === lastPassed ? 'active' : 'upcoming';
    });
    faqStates = next;
  };

  const onScroll = () => { updateSpy(); updateFaqTimeline(); };
  const onResize = () => { onScroll(); measureOverview(); };
  onMount(() => {
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    requestAnimationFrame(() => { updateFaqTimeline(); measureOverview(); });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  });
</script>

{#if loading}
  <section class="container-shell py-20">
    <LoadingState message="Loading itinerary..." />
  </section>
{:else if !tour}
  <section class="container-shell py-20">
    <ErrorState message={error || 'Tour not found.'} />
  </section>
{:else}
  <!-- ── Hero ─────────────────────────────────────────────────────────────── -->
  <section class="relative isolate min-h-[78vh] overflow-hidden bg-deep-green text-white">
    <ResponsiveImage imgClass="absolute inset-0 h-full w-full object-cover" src={heroImage} fallbackSrc={thumbUrl(tour, 'banner_image_url', 'main_image_url')} width={1900} alt={tour.title} sizes="100vw" eager priority />
    <div class="absolute inset-0 bg-[linear-gradient(90deg,rgba(20,18,15,0.82)_0%,rgba(20,18,15,0.45)_46%,rgba(20,18,15,0.12)_100%)]"></div>
    <div class="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,18,15,0.28)_0%,transparent_32%,transparent_54%,rgba(20,18,15,0.72)_100%)]"></div>

    <div class="container-shell relative flex min-h-[78vh] flex-col justify-end pb-11 pt-28 [text-shadow:0_2px_18px_rgba(0,0,0,0.5)] md:pb-16">
      <a class="mb-8 hidden w-fit items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/60 transition hover:text-goldfinch-gold md:inline-flex" href="/tours">
        <ArrowLeft size={15} strokeWidth={2.4} /> Back to itineraries
      </a>

      <div class="max-w-4xl">
        <p class="brand-eyebrow text-goldfinch-gold">{categoryName} · {destinationName}</p>
        <h1 class="mt-4 max-w-[760px] font-serif text-[36px] font-light leading-[1.04] tracking-normal text-white sm:text-[46px] lg:text-[56px]">
          {tour.title}
        </h1>
        <p class="mt-5 line-clamp-3 max-w-[560px] text-[15px] font-medium leading-7 text-white/72 md:text-base">
          {tour.short_description ?? tour.full_description}
        </p>

        <!-- key-facts stat chips -->
        <div class="mt-8 grid max-w-2xl grid-cols-1 gap-2 sm:grid-cols-3">
          <div class="flex items-center gap-3 border-l-2 border-goldfinch-gold/70 bg-deep-green/45 px-3.5 py-3 backdrop-blur-md">
            <CalendarDays class="shrink-0 text-goldfinch-gold" size={19} strokeWidth={1.7} />
            <div class="min-w-0">
              <p class="text-[9.5px] font-bold uppercase tracking-[0.16em] text-white/50">Duration</p>
              <p class="truncate text-[13px] font-extrabold text-white">{durationText}</p>
            </div>
          </div>
          <div class="flex items-center gap-3 border-l-2 border-goldfinch-gold/70 bg-deep-green/45 px-3.5 py-3 backdrop-blur-md">
            <MapPin class="shrink-0 text-goldfinch-gold" size={19} strokeWidth={1.7} />
            <div class="min-w-0">
              <p class="text-[9.5px] font-bold uppercase tracking-[0.16em] text-white/50">Destination</p>
              <p class="truncate text-[13px] font-extrabold text-white">{destinationName}</p>
            </div>
          </div>
          <div class="flex items-center gap-3 border-l-2 border-goldfinch-gold/70 bg-deep-green/45 px-3.5 py-3 backdrop-blur-md">
            <Wallet class="shrink-0 text-goldfinch-gold" size={19} strokeWidth={1.7} />
            <div class="min-w-0">
              <p class="text-[9.5px] font-bold uppercase tracking-[0.16em] text-white/50">Starting from</p>
              <p class="truncate text-[13px] font-extrabold text-white">{priceText}</p>
            </div>
          </div>
        </div>

        <div class="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            class="inline-flex h-[52px] items-center justify-center gap-3 bg-goldfinch-gold px-8 text-[12px] font-bold uppercase tracking-[0.18em] text-deep-green transition hover:bg-savanna"
            type="button"
            on:click={() => openPlanner('hero')}
          >
            Plan this trip <ArrowRight size={16} strokeWidth={2.5} />
          </button>
          <a
            class="inline-flex h-[52px] items-center justify-center gap-3 border border-white/25 px-8 text-[12px] font-bold uppercase tracking-[0.18em] text-white transition hover:border-goldfinch-gold hover:text-goldfinch-gold"
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle size={16} strokeWidth={2.4} /> WhatsApp
          </a>
          {#if shortlistItem}
            <div class="sm:min-w-[180px]">
              <ShortlistButton item={shortlistItem} variant="full" />
            </div>
          {/if}
        </div>
      </div>
    </div>
  </section>

  <!-- ── Sticky section-tab bar ───────────────────────────────────────────── -->
  <div id="tour-tabs" use:stickBelowNav class="sticky top-0 z-30 border-b border-ink/10 bg-canvas/95 backdrop-blur">
    <div class="container-shell flex min-h-[60px] items-center justify-between gap-4">
      <div class="hide-scroll flex min-w-0 flex-1 gap-6 overflow-x-auto" role="tablist" aria-label="Itinerary sections">
        {#each tourNavLinks as link}
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === link.key}
            class={`relative shrink-0 whitespace-nowrap py-4 text-[13px] font-semibold transition ${activeTab === link.key ? 'text-heading' : 'text-ink/55 hover:text-heading'}`}
            on:click={() => selectTab(link.key)}
          >
            {link.label}
            <span class={`absolute inset-x-0 -bottom-px h-0.5 bg-clay transition-opacity ${activeTab === link.key ? 'opacity-100' : 'opacity-0'}`}></span>
          </button>
        {/each}
      </div>
      <button class="hidden h-9 shrink-0 items-center gap-2 bg-deep-green px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-white transition hover:bg-forest md:inline-flex" type="button" on:click={() => openPlanner('tabbar')}>
        Plan this trip <ArrowRight size={13} />
      </button>
    </div>
  </div>

  <!-- ── Two-column content: main + sticky booking sidebar ────────────────── -->
  <div class="container-shell grid gap-10 py-10 md:py-14 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-14">
    <main class="min-w-0 space-y-12 md:space-y-16">
      <!-- Overview -->
      <section id="overview" class="scroll-mt-32">
        <span class="inline-flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-clay"><span class="h-px w-6 bg-clay"></span> Overview</span>
        <h2 class="mt-4 font-serif text-[30px] font-light leading-[1.1] text-heading md:text-[38px]">About this safari</h2>

        <div class="relative mt-6 max-w-[680px]">
          <div bind:this={overviewEl} class={`overflow-hidden ${overviewExpanded ? '' : 'max-h-[7.25rem]'}`}>
            {#if hasRichContent(tour.full_description)}
              <RichText value={tour.full_description} className="text-[15px] leading-7 text-ink/70" />
            {:else if hasRichContent(tour.short_description)}
              <RichText value={tour.short_description} className="text-[15px] leading-7 text-ink/70" />
            {:else}
              <p class="text-[15px] leading-7 text-ink/70">
                This itinerary is a starting point. The route, pace, lodges, activities and final cost can all be adjusted by the Emnel team around your dates and travel style.
              </p>
            {/if}
          </div>
          {#if overviewOverflows && !overviewExpanded}
            <div class="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-canvas to-transparent"></div>
          {/if}
        </div>
        {#if overviewOverflows}
          <button type="button" class="mt-2.5 inline-flex items-center gap-1.5 text-[12.5px] font-bold uppercase tracking-[0.12em] text-clay transition hover:text-heading" on:click={() => (overviewExpanded = !overviewExpanded)}>
            {overviewExpanded ? 'Read less' : 'Read more'}
            <ChevronDown size={14} class={`transition-transform ${overviewExpanded ? 'rotate-180' : ''}`} />
          </button>
        {/if}

        {#if tripFacts.length}
          <div class="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {#each tripFacts as fact}
              <div class="border border-ink/10 bg-savanna/40 p-3.5">
                <p class="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-ink/60">
                  <svelte:component this={fact.icon} size={13} class="text-clay" /> {fact.label}
                </p>
                <p class="mt-1 text-[14px] font-bold leading-snug text-heading">{fact.value}</p>
              </div>
            {/each}
          </div>
        {/if}

        {#if highlights.length}
          <div class="mt-9">
            <h3 class="font-serif text-[21px] font-light text-heading">Trip highlights</h3>
            <ul class="mt-4 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
              {#each highlights as h}
                <li class="flex items-start gap-2.5 text-[14.5px] leading-7 text-heading">
                  <span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-goldfinch-gold"></span>
                  {h}
                </li>
              {/each}
            </ul>
          </div>
        {/if}

        <button class="mt-8 inline-flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.12em] text-clay transition hover:text-heading" type="button" on:click={() => openPlanner('overview')}>
          Customize this route <ArrowRight size={14} />
        </button>
      </section>

      <!-- Day by Day -->
      {#if displayDays.length}
        <section id="itinerary" class="scroll-mt-32">
          <span class="inline-flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-clay"><span class="h-px w-6 bg-clay"></span> The route</span>
          <h2 class="mt-4 font-serif text-[30px] font-light leading-[1.1] text-heading md:text-[38px]">Day by day</h2>
          <p class="mt-4 max-w-[640px] text-[15px] leading-7 text-ink/70">
            The itinerary stored for this trip. The Emnel team can adjust each day around your dates, lodge preference, flight timing and pace.
          </p>

          <div class="mt-8 grid gap-2.5">
            {#each displayDays as day, i (day.day_number)}
              <details class="tour-day group overflow-hidden border border-ink/10 bg-surface" open={i === 0}>
                <summary class="tour-day-summary flex cursor-pointer list-none items-center gap-4 p-4">
                  <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-deep-green text-[13px] font-bold text-white">{day.day_number}</span>
                  <div class="min-w-0 flex-1">
                    <p class="text-[10.5px] font-bold uppercase tracking-[0.16em] text-clay">Day {day.day_number}</p>
                    <h3 class="mt-0.5 font-serif text-[18px] font-light leading-tight text-heading">{day.title}</h3>
                    {#if day.accommodation || day.meals}
                      <p class="mt-0.5 truncate text-[12.5px] text-ink/55">{[day.accommodation, day.meals].filter(Boolean).join(' · ')}</p>
                    {/if}
                  </div>
                  <span class="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-ink/12 text-ink/50 transition duration-300 group-open:rotate-180">
                    <ChevronDown size={16} />
                  </span>
                </summary>
                <div class="tour-day-body border-t border-ink/[0.08] px-4 pb-8 pt-6">
                  {#if day.image_url}
                    <ResponsiveImage imgClass="mb-6 h-[220px] w-full object-cover sm:h-[300px]" src={day.image_url} fallbackSrc={thumbUrl(day, 'image_url')} width={900} alt={day.title} sizes="(min-width:1024px) 60vw, 100vw" />
                  {/if}
                  {#if hasRichContent(day.description)}
                    <RichText value={day.description} className="text-[15px] leading-[1.7] text-ink/70" />
                  {/if}
                  {#if day.activities || day.accommodation || day.meals}
                    <ul class="mt-6 grid gap-3 border border-ink/10 bg-savanna/45 p-5">
                      {#if day.activities}
                        <li class="flex gap-2.5 text-[14px] leading-6 text-ink/70"><Compass size={16} class="mt-0.5 shrink-0 text-clay" /><span><span class="font-semibold text-heading">Activities:</span> {day.activities}</span></li>
                      {/if}
                      {#if day.accommodation}
                        <li class="flex gap-2.5 text-[14px] leading-6 text-ink/70"><BedDouble size={16} class="mt-0.5 shrink-0 text-clay" /><span><span class="font-semibold text-heading">Accommodation:</span> {day.accommodation}</span></li>
                      {/if}
                      {#if day.meals}
                        <li class="flex gap-2.5 text-[14px] leading-6 text-ink/70"><Utensils size={16} class="mt-0.5 shrink-0 text-clay" /><span><span class="font-semibold text-heading">Meals:</span> {day.meals}</span></li>
                      {/if}
                    </ul>
                  {/if}

                    <!-- The property itself, shown when the day is linked to a
                         real lodge record rather than free text. -->
                    {#if day.lodge}
                      {@const stay = stayImages(day)}
                      {#if stay.length}
                      <figure class="mt-5">
                        <figcaption class="flex flex-wrap items-baseline justify-between gap-3">
                          <span class="text-[11px] uppercase tracking-[0.2em] text-clay">{day.lodge?.name}</span>
                          {#if day.lodge?.slug}
                            <a
                              class="text-[12.5px] font-medium text-deep-green transition hover:underline"
                              href={`/accommodation/${day.lodge.slug}`}
                            >
                              About this property
                            </a>
                          {/if}
                        </figcaption>
                        <div class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {#each stay as image (image.url)}
                            <ResponsiveImage
                              src={image.url}
                              alt={image.alt}
                              width={420}
                              sizes="(min-width:640px) 22vw, 45vw"
                              imgClass="aspect-[4/3] w-full object-cover"
                            />
                          {/each}
                        </div>
                      </figure>
                      {/if}
                    {/if}
                </div>
              </details>
            {/each}
          </div>
        </section>
      {/if}

      <!-- Gallery -->
      {#if galleryImages.length}
        <section id="gallery" class="scroll-mt-32">
          <span class="inline-flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-clay"><span class="h-px w-6 bg-clay"></span> From the field</span>
          <h2 class="mt-4 font-serif text-[30px] font-light leading-[1.1] text-heading md:text-[38px]">A closer look</h2>
          <div class="mt-8 grid gap-3 sm:grid-cols-2" use:staggeredCardReveal={{ selector: '.tour-gallery-card', y: 16, stagger: 0.05 }}>
            {#each galleryImages as image (image.id)}
              <figure class="tour-gallery-card group overflow-hidden border border-ink/10 bg-surface">
                <div class="aspect-[4/3] overflow-hidden bg-deep-green">
                  <ResponsiveImage imgClass="h-full w-full object-cover transition duration-[800ms] group-hover:scale-105" src={image.image_url} fallbackSrc={thumbUrl(image, 'image_url')} width={800} alt={image.alt_text ?? tour.title} sizes="(min-width:1024px) 40vw, (min-width:640px) 50vw, 100vw" />
                </div>
                {#if image.caption}
                  <figcaption class="px-5 py-4 text-[13px] leading-6 text-ink/64">{image.caption}</figcaption>
                {/if}
              </figure>
            {/each}
          </div>
        </section>
      {/if}

      <!-- Inclusions -->
      {#if inclusions.length || exclusions.length}
        <section id="included" class="scroll-mt-32">
          <span class="inline-flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-clay"><span class="h-px w-6 bg-clay"></span> What is covered</span>
          <h2 class="mt-4 font-serif text-[30px] font-light leading-[1.1] text-heading md:text-[38px]">What's included</h2>
          <InclusionsGrid included={inclusionTitles} excluded={exclusionTitles} />
        </section>
      {/if}

      <!-- Prices -->
      {#if priceOptions.length}
        <section id="pricing" class="scroll-mt-32">
          <span class="inline-flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-clay"><span class="h-px w-6 bg-clay"></span> Pricing</span>
          <h2 class="mt-4 font-serif text-[30px] font-light leading-[1.1] text-heading md:text-[38px]">Tour rates</h2>
          <p class="mt-4 max-w-[640px] text-[15px] leading-7 text-ink/70">
            Indicative rates from the live record. Final pricing is confirmed by the Emnel team around your dates, group size and chosen lodges.
          </p>

          <!-- desktop table -->
          <div class="mt-8 hidden overflow-hidden border border-ink/10 md:block">
            <table class="w-full border-collapse text-left">
              <thead>
                <tr class="bg-deep-green text-white">
                  <th class="px-5 py-3 text-[11px] font-bold uppercase tracking-[0.14em]">Option</th>
                  <th class="px-5 py-3 text-[11px] font-bold uppercase tracking-[0.14em]">Basis</th>
                  <th class="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-[0.14em]">From</th>
                </tr>
              </thead>
              <tbody>
                {#each priceOptions as option, i (option.id)}
                  <tr class={i % 2 === 0 ? 'bg-surface' : 'bg-savanna/35'}>
                    <td class="border-t border-ink/[0.06] px-5 py-4 align-top">
                      <p class="font-semibold text-heading">{option.title}</p>
                      {#if option.label && option.label !== option.title}<p class="mt-0.5 text-[13px] text-ink/60">{option.label}</p>{/if}
                      {#if option.description}<p class="mt-1.5 text-[13px] leading-6 text-ink/60">{option.description}</p>{/if}
                    </td>
                    <td class="border-t border-ink/[0.06] px-5 py-4 align-top text-[13.5px] text-ink/70">{priceTypeLabel(option.price_type)}</td>
                    <td class="border-t border-ink/[0.06] px-5 py-4 text-right align-top font-serif text-[22px] font-light text-heading">{option.price ? formatUsd(option.price, $currency) : 'On request'}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>

          <!-- mobile cards -->
          <div class="mt-8 grid gap-2.5 md:hidden">
            {#each priceOptions as option (option.id)}
              <div class="border border-ink/10 bg-surface p-5">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="font-semibold text-heading">{option.title}</p>
                    {#if option.label && option.label !== option.title}<p class="mt-0.5 text-[13px] text-ink/60">{option.label}</p>{/if}
                  </div>
                  <span class="shrink-0 border border-goldfinch-gold/30 bg-goldfinch-gold/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-clay">{priceTypeLabel(option.price_type)}</span>
                </div>
                <p class="mt-3 font-serif text-[26px] font-light text-heading">{option.price ? formatUsd(option.price, $currency) : 'On request'}</p>
                {#if option.description}<p class="mt-2 text-[13.5px] leading-6 text-ink/62">{option.description}</p>{/if}
              </div>
            {/each}
          </div>

          <button class="mt-7 inline-flex h-12 items-center justify-center gap-2 bg-goldfinch-gold px-6 text-[12px] font-bold uppercase tracking-[0.14em] text-deep-green transition hover:bg-savanna" type="button" on:click={() => openPlanner('pricing')}>
            Get my exact quote <ArrowRight size={15} />
          </button>
        </section>
      {/if}
    </main>

    <!-- sticky booking sidebar (desktop) -->
    <aside id="plan-this-trip" class="hidden self-stretch lg:block">
      <div use:stickBelowTabs class="sticky">
        <BookingForm {tour} />
        <a class="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 border border-forest/25 bg-surface text-[12px] font-bold uppercase tracking-[0.12em] text-forest transition hover:border-goldfinch-gold hover:text-goldfinch-gold" href={waHref} target="_blank" rel="noopener noreferrer">
          <MessageCircle size={15} /> Prefer to talk? WhatsApp
        </a>
      </div>
    </aside>
  </div>

  <!-- ── Related tours ────────────────────────────────────────────────────── -->
  {#if relatedTours.length}
    <section id="related" class="scroll-mt-32 border-t border-ink/[0.07] bg-savanna/30 py-14 md:py-20">
      <div class="container-shell">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <SectionHeader eyebrow="You might also like" title="More itineraries" description="Other private routes you can compare and combine." />
          <a class="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-forest transition hover:text-goldfinch-gold" href="/tours">
            Browse all tours <ArrowRight size={14} />
          </a>
        </div>
        <div class="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ selector: '.related-tour-card', y: 16, stagger: 0.06 }}>
          {#each relatedTours as item (item.id)}
            <div class="related-tour-card">
              <TourCardRich tour={item} />
            </div>
          {/each}
        </div>
      </div>
    </section>
  {/if}

  <!-- ── From the journal ─────────────────────────────────────────────────── -->
  {#if planningCards.length}
    <section id="planning" class="scroll-mt-32 py-14 md:py-20">
      <div class="container-shell">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <SectionHeader eyebrow="Stories & guides" title="From the journal" description="Read up on the region before you enquire." />
          <a class="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-forest transition hover:text-goldfinch-gold" href="/blog">
            Read the blog <ArrowRight size={14} />
          </a>
        </div>
        <div class="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ selector: '.planning-card', y: 16, stagger: 0.05 }}>
          {#each planningCards.slice(0, 3) as post (post.id)}
            <div class="planning-card">
              <BlogCard {post} />
            </div>
          {/each}
        </div>
      </div>
    </section>
  {/if}

  <!-- ── FAQ timeline ─────────────────────────────────────────────────────── -->
  {#if faqs.length}
    <section id="faqs" class="scroll-mt-32 border-t border-ink/10 bg-savanna/25 py-14 md:py-20">
      <div class="container-shell">
        <div class="mx-auto max-w-4xl">
          <span class="inline-flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-clay"><span class="h-px w-6 bg-clay"></span> Good to know</span>
          <h2 class="mt-4 font-serif text-[30px] font-light leading-[1.1] text-heading md:text-[38px]">Frequently asked questions</h2>

          <ol class="relative mt-10">
            {#each faqs as faq, i (faq.id)}
              {@const state = faqStates[faq.id] ?? (i === 0 ? 'active' : 'upcoming')}
              <li data-faq-item data-faq-id={faq.id} class="relative pb-9 pl-16 last:pb-0 md:pl-20">
                <span
                  class={`absolute left-0 top-0 grid h-10 w-10 place-items-center rounded-full border font-serif text-[15px] transition-colors duration-300 ${state === 'upcoming' ? 'border-ink/15 bg-surface text-ink/45' : 'border-clay bg-clay text-white'}`}
                >{String(i + 1).padStart(2, '0')}</span>
                {#if i < faqs.length - 1}
                  <span class={`absolute left-[19px] top-11 bottom-1 w-px transition-colors duration-300 ${state === 'complete' ? 'bg-clay' : 'bg-ink/12'}`}></span>
                {/if}
                <h3 class="font-serif text-[19px] font-light leading-snug text-heading md:text-[22px]">{faq.question}</h3>
                <RichText value={faq.answer} className="mt-2.5 text-[15px] leading-[1.7] text-ink/70" />
              </li>
            {/each}
          </ol>
        </div>
      </div>
    </section>
  {/if}

  <!-- ── Enquiry / email capture ──────────────────────────────────────────── -->
  <section class="border-t border-ink/[0.07] bg-canvas py-14 md:py-20">
    <div class="container-shell grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
      <div>
        <span class="inline-flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-clay"><span class="h-px w-6 bg-clay"></span> Ask for this route</span>
        <h2 class="mt-4 font-serif text-[30px] font-light leading-[1.1] text-heading md:text-[40px]">
          Tell us what you're imagining and we'll build it around you.
        </h2>
        <p class="mt-5 max-w-[540px] text-[15px] leading-7 text-ink/68">
          No payment is required to start. Share your email for the full itinerary, or speak directly on WhatsApp for a faster answer.
        </p>
        <div class="mt-8 flex flex-col gap-3 sm:flex-row">
          <button class="inline-flex h-[52px] items-center justify-center gap-3 bg-goldfinch-gold px-8 text-[12px] font-bold uppercase tracking-[0.18em] text-deep-green transition hover:bg-savanna" type="button" on:click={() => openPlanner('enquiry')}>
            Start a conversation <ArrowRight size={16} />
          </button>
          <a class="inline-flex h-[52px] items-center justify-center gap-3 border border-ink/20 px-8 text-[12px] font-bold uppercase tracking-[0.18em] text-heading transition hover:border-goldfinch-gold hover:text-goldfinch-gold" href={waHref} target="_blank" rel="noopener noreferrer">
            <MessageCircle size={16} /> WhatsApp us
          </a>
        </div>
      </div>
      <div class="border border-ink/10 bg-surface p-6 shadow-soft md:p-8">
        <EmailItineraryCapture tourTitle={tour.title} />
      </div>
    </div>
  </section>

  <!-- ── Fixed mobile CTA bar ─────────────────────────────────────────────── -->
  <div class="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-surface px-4 py-3 shadow-[0_-6px_20px_rgba(28,26,22,0.1)] lg:hidden" style="padding-bottom: calc(0.75rem + env(safe-area-inset-bottom));">
    <div class="flex items-center gap-3">
      <div class="min-w-0 flex-1">
        <p class="truncate text-[13px] font-bold text-heading">{priceText === 'On request' ? 'Price on request' : `From ${priceText}`}</p>
        <p class="truncate text-[11.5px] text-ink/55">{durationText} · {destinationName}</p>
      </div>
      <button class="inline-flex h-11 shrink-0 items-center gap-2 bg-goldfinch-gold px-5 text-[12px] font-bold uppercase tracking-[0.12em] text-deep-green transition hover:bg-savanna" type="button" on:click={() => openPlanner('mobile-bar')}>
        Plan this trip <ArrowRight size={14} />
      </button>
    </div>
  </div>
  <div class="h-20 lg:hidden"></div>
{/if}

<!-- ── Planner overlay: bottom sheet on mobile, centered modal on desktop ──── -->
{#if sheetOpen && tour}
  <div class="fixed inset-0 z-[80] flex items-end justify-center overflow-y-auto sm:p-4 lg:items-center" role="dialog" aria-modal="true" aria-label="Plan this trip">
    <button class="fixed inset-0 cursor-default bg-black/60 backdrop-blur-sm" type="button" aria-label="Close" on:click={closeSheet} transition:fade={{ duration: 150 }}></button>
    <div class="relative z-10 w-full max-w-lg" transition:fly={{ y: 340, duration: 260 }}>
      <button class="absolute -top-3 right-2 z-20 grid h-9 w-9 place-items-center rounded-full bg-surface text-ink shadow-md transition hover:bg-sand sm:right-0" type="button" aria-label="Close" on:click={closeSheet}>
        <X size={18} />
      </button>
      <BookingForm {tour} />
    </div>
  </div>
{/if}

<svelte:window on:keydown={(e) => e.key === 'Escape' && closeSheet()} />

{#if touristTripLd}<JsonLd data={touristTripLd} />{/if}
{#if breadcrumbLd}<JsonLd data={breadcrumbLd} />{/if}

<style>
  /* Day accordion: hide the native marker; reveal the body with a soft slide. */
  .tour-day-summary::-webkit-details-marker {
    display: none;
  }
  details.tour-day > .tour-day-body {
    animation: tourDayReveal 260ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  @keyframes tourDayReveal {
    from {
      opacity: 0;
      transform: translateY(-6px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    details.tour-day > .tour-day-body {
      animation: none;
    }
  }
</style>
