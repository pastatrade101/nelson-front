<script lang="ts">
  import {
    ArrowRight,
    BedDouble,
    CalendarDays,
    Check,
    ChevronDown,
    Clock,
    Compass,
    MapPin,
    MessageCircle,
    Mountain,
    Plane,
    Route,
    Shield,
    Sparkles,
    Star,
    Users,
    Utensils,
    X
  } from '@lucide/svelte';
  import { fade, scale, slide } from 'svelte/transition';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { trackEvent } from '$lib/analytics';
  import { api } from '$lib/api/client';
  import { staggeredCardReveal } from '$lib/animations/motion';
  import { imgUrl, thumbUrl } from '$lib/img';
  import { publicSettings, settingText } from '$lib/settings';
  import BookingForm from '$lib/components/public/BookingForm.svelte';
  import EmailItineraryCapture from '$lib/components/public/EmailItineraryCapture.svelte';
  import JsonLd from '$lib/components/public/JsonLd.svelte';
  import ShortlistButton from '$lib/components/public/ShortlistButton.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';
  import type { BlogPost, FAQ, ItineraryDay, Tour } from '$lib/types';

  type DisplayDay = ItineraryDay;

  const DEFAULT_TOUR_IMAGE = 'https://images.unsplash.com/photo-1516426122078-c23e76319801';

  const uniqueStrings = (items: Array<string | null | undefined>) => {
    const seen = new Set<string>();
    return items.filter((item): item is string => {
      if (!item || seen.has(item)) return false;
      seen.add(item);
      return true;
    });
  };

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

  const tourCardImage = (item: Tour) =>
    thumbUrl(item as unknown as Record<string, unknown>, 'main_image_url', 'banner_image_url') || item.main_image_url || DEFAULT_TOUR_IMAGE;

  const postCardImage = (post: BlogPost) =>
    thumbUrl(post as unknown as Record<string, unknown>, 'featured_image_url') || post.featured_image_url || DEFAULT_TOUR_IMAGE;

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
  const formatPrice = (amount: number, currency?: string | null) => `${currency ?? 'USD'} ${Number(amount).toLocaleString()}`;

  // Day-by-day itinerary + what's included (embedded in the tour detail response).
  $: itineraryDays = [...(tour?.itinerary_days ?? [])].sort((a, b) => (a.day_number ?? 0) - (b.day_number ?? 0));
  $: inclusions = [...(tour?.tour_inclusions ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  $: exclusions = [...(tour?.tour_exclusions ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  // Pricing options + gallery images (embedded in the tour detail response).
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
  let openFaqId = '';

  const loadRelated = async (current: Tour) => {
    const destId = (current as unknown as { destination_id?: string | null }).destination_id ?? null;

    const [tourRes, postRes, faqRes] = await Promise.allSettled([
      api.tours.list(destId ? { destination_id: destId, limit: 7 } : { limit: 7 }),
      api.blog.list({ limit: 6 }),
      api.faqs.list({ limit: 10 })
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
    openFaqId = '';
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
      trackEvent('tour_page_view', { tour_id: tour.id, tour_title: tour.title, destination: tour.destinations?.name });
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
  $: priceText = tour?.price_from ? `${tour.currency ?? 'USD'} ${tour.price_from.toLocaleString()}` : 'On request';
  $: routeLabel = tour?.start_location || tour?.end_location
    ? `${tour.start_location ?? destinationName} to ${tour.end_location ?? destinationName}`
    : `${destinationName} route`;
  $: fitTags = uniqueStrings([
    tour?.experience_type,
    tour?.budget_tier,
    tour?.difficulty_level,
    ...(tour?.persona_tags ?? [])
  ]).slice(0, 5);
  $: detailImages = uniqueStrings([
    tour?.main_image_url,
    tour?.banner_image_url,
    ...displayDays.map((day) => day.image_url)
  ]).slice(0, 3);
  $: planningCards = recentPosts.slice(0, 6);
  $: tourNavLinks = [
    { href: '#overview', label: 'Overview', show: true },
    { href: '#highlights', label: 'Highlights', show: highlights.length > 0 || fitTags.length > 0 },
    { href: '#itinerary', label: 'Itinerary', show: displayDays.length > 0 },
    { href: '#gallery', label: 'Gallery', show: galleryImages.length > 0 },
    { href: '#included', label: 'Included', show: inclusions.length > 0 || exclusions.length > 0 },
    { href: '#pricing', label: 'Pricing', show: priceOptions.length > 0 },
    { href: '#related', label: 'More Trips', show: relatedTours.length > 0 },
    { href: '#planning', label: 'Planning', show: planningCards.length > 0 },
    { href: '#faqs', label: 'FAQs', show: faqs.length > 0 }
  ].filter((link) => link.show);
</script>

{#if loading}
  <section class="container-shell py-20">
    <LoadingState message="Loading tour..." />
  </section>
{:else if !tour}
  <section class="container-shell py-20">
    <ErrorState message={error || 'Tour not found.'} />
  </section>
{:else}
  <section class="relative isolate min-h-[82vh] overflow-hidden bg-midnight text-white">
    <img class="absolute inset-0 h-full w-full object-cover" src={imgUrl(heroImage, 1900, 78)} alt={tour.title} />
    <div class="absolute inset-0 bg-[linear-gradient(90deg,rgba(28,26,22,0.86)_0%,rgba(28,26,22,0.58)_46%,rgba(28,26,22,0.24)_100%)]"></div>
    <div class="absolute inset-x-0 bottom-0 h-48 bg-[linear-gradient(180deg,rgba(28,26,22,0)_0%,rgba(28,26,22,1)_100%)]"></div>

    <div class="container-shell relative flex min-h-[82vh] flex-col justify-end pb-10 pt-28 md:pb-14">
      <nav class="mb-8 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-white/58">
        <a class="transition hover:text-goldfinch-gold" href="/">Home</a>
        <span>/</span>
        <a class="transition hover:text-goldfinch-gold" href="/tours">Itineraries</a>
        <span>/</span>
        <span class="text-white/78">{tour.title}</span>
      </nav>

      <div class="max-w-[920px]">
        <p class="brand-eyebrow text-goldfinch-gold">{categoryName} · {destinationName}</p>
        <h1 class="mt-5 max-w-[880px] font-serif text-[48px] font-light leading-[0.98] tracking-normal text-white sm:text-[66px] lg:text-[82px]">
          {tour.title}
        </h1>
        <p class="mt-6 max-w-[720px] text-base font-medium leading-8 text-white/72 md:text-lg">
          {tour.full_description ?? tour.short_description}
        </p>

        <div class="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            class="inline-flex h-[52px] items-center justify-center gap-3 bg-goldfinch-gold px-8 text-[12px] font-bold uppercase tracking-[0.18em] text-deep-green transition hover:bg-savanna"
            type="button"
            on:click={openForm}
          >
            Plan this safari <ArrowRight size={16} strokeWidth={2.5} />
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
            <div class="sm:min-w-[190px]">
              <ShortlistButton item={shortlistItem} variant="full" />
            </div>
          {/if}
        </div>
      </div>

      <div class="mt-12 grid border-y border-white/[0.12] md:grid-cols-4">
        <div class="border-b border-white/[0.12] py-5 md:border-b-0 md:border-r md:px-6">
          <p class="text-[10px] font-bold uppercase tracking-[0.22em] text-white/42">Duration</p>
          <p class="mt-2 font-serif text-2xl text-white">{durationText}</p>
        </div>
        <div class="border-b border-white/[0.12] py-5 md:border-b-0 md:border-r md:px-6">
          <p class="text-[10px] font-bold uppercase tracking-[0.22em] text-white/42">From</p>
          <p class="mt-2 font-serif text-2xl text-white">{priceText}</p>
        </div>
        <div class="border-b border-white/[0.12] py-5 md:border-b-0 md:border-r md:px-6">
          <p class="text-[10px] font-bold uppercase tracking-[0.22em] text-white/42">Route</p>
          <p class="mt-2 font-serif text-2xl text-white">{routeLabel}</p>
        </div>
        <div class="py-5 md:px-6">
          <p class="text-[10px] font-bold uppercase tracking-[0.22em] text-white/42">Style</p>
          <p class="mt-2 font-serif text-2xl text-white">{tour.budget_tier ?? categoryName}</p>
        </div>
      </div>
    </div>
  </section>

  <div class="sticky top-0 z-30 border-y border-white/[0.08] bg-deep-green/95 text-white shadow-[0_16px_40px_rgba(0,0,0,0.18)] backdrop-blur">
    <div class="container-shell flex min-h-[64px] items-center justify-between gap-4">
      <div class="flex min-w-0 flex-1 gap-1 overflow-x-auto py-2">
        {#each tourNavLinks as link}
          <a class="shrink-0 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/62 transition hover:text-goldfinch-gold" href={link.href}>
            {link.label}
          </a>
        {/each}
      </div>
      <button class="hidden h-10 shrink-0 items-center gap-2 border border-goldfinch-gold px-4 text-[11px] font-bold uppercase tracking-[0.16em] text-goldfinch-gold transition hover:bg-goldfinch-gold hover:text-deep-green md:inline-flex" type="button" on:click={openForm}>
        Enquire <ArrowRight size={14} />
      </button>
    </div>
  </div>

  <section id="overview" class="scroll-mt-28 bg-deep-green py-16 text-white md:py-24">
    <div class="container-shell grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
      <div>
        <p class="brand-eyebrow text-goldfinch-gold">Private safari design</p>
        <h2 class="mt-5 font-serif text-[42px] font-light leading-[1.08] tracking-normal text-white sm:text-[58px]">
          Your {destinationName.toLowerCase()}.
          <span class="block italic text-goldfinch-gold">Your timeline.</span>
          <span class="block">Your private vehicle.</span>
        </h2>
        <p class="mt-7 max-w-[560px] text-[15px] font-medium leading-8 text-white/64 md:text-base">
          This tour is a starting point shaped by the live CMS record. The route, pace, lodges, activities, and final cost can be adjusted by the Emnel team around your dates and travel style.
        </p>
      </div>

      <div class="grid gap-5">
        <div class="border border-white/[0.08] bg-white/[0.06] p-7 md:p-8">
          <p class="font-serif text-[28px] font-light leading-tight text-white">What this safari gives you</p>
          <div class="mt-7 grid gap-5">
            <div class="flex gap-4">
              <span class="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-goldfinch-gold text-deep-green"><Compass size={17} /></span>
              <div>
                <h3 class="font-semibold text-white">Local route logic</h3>
                <p class="mt-1 text-sm leading-6 text-white/58">{tour.short_description ?? 'A route planned around real wildlife timing, travel distance, and lodge fit.'}</p>
              </div>
            </div>
            <div class="flex gap-4">
              <span class="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-goldfinch-gold text-deep-green"><Shield size={17} /></span>
              <div>
                <h3 class="font-semibold text-white">Private and adjustable</h3>
                <p class="mt-1 text-sm leading-6 text-white/58">The itinerary is not a fixed package. It can be changed around your interests, budget tier, group size, and comfort level.</p>
              </div>
            </div>
            <div class="flex gap-4">
              <span class="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-goldfinch-gold text-deep-green"><Plane size={17} /></span>
              <div>
                <h3 class="font-semibold text-white">One point of contact</h3>
                <p class="mt-1 text-sm leading-6 text-white/58">Start with a request or WhatsApp. You get direct help from the same team that operates the safari in Tanzania.</p>
              </div>
            </div>
          </div>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          {#if tour.duration_days}
            <div class="border border-white/[0.08] bg-midnight p-5">
              <CalendarDays class="text-goldfinch-gold" size={19} />
              <p class="mt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-white/38">Trip length</p>
              <p class="mt-1 font-serif text-2xl text-white">{durationText}</p>
            </div>
          {/if}
          {#if groupSize}
            <div class="border border-white/[0.08] bg-midnight p-5">
              <Users class="text-goldfinch-gold" size={19} />
              <p class="mt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-white/38">Group size</p>
              <p class="mt-1 font-serif text-2xl text-white">{groupSize}</p>
            </div>
          {/if}
          {#if tour.difficulty_level}
            <div class="border border-white/[0.08] bg-midnight p-5">
              <Mountain class="text-goldfinch-gold" size={19} />
              <p class="mt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-white/38">Difficulty</p>
              <p class="mt-1 font-serif text-2xl text-white">{tour.difficulty_level}</p>
            </div>
          {/if}
          {#if tour.minimum_age}
            <div class="border border-white/[0.08] bg-midnight p-5">
              <Check class="text-goldfinch-gold" size={19} />
              <p class="mt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-white/38">Minimum age</p>
              <p class="mt-1 font-serif text-2xl text-white">{tour.minimum_age}+</p>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </section>

  <section id="highlights" class="scroll-mt-28 border-y border-[#C5A265]/16 bg-[#16130F] py-16 text-[#FAFAF7] md:py-24">
    <div class="container-shell">
      <div class="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
        <div class="max-w-[650px]">
          <p class="brand-eyebrow text-goldfinch-gold">Trip character</p>
          <h2 class="mt-5 font-serif text-[40px] font-light leading-[1.08] tracking-normal text-[#FAFAF7] sm:text-[56px]">
            Designed around what matters on safari.
          </h2>
          <div class="mt-7 h-px w-24 bg-goldfinch-gold"></div>
        </div>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ selector: '.tour-design-card', y: 16, stagger: 0.05 }}>
          {#each fitTags as tag}
            <div class="tour-design-card border border-[#C5A265]/20 bg-[#2E2820] p-5 shadow-[0_18px_45px_rgba(0,0,0,0.22)]">
              <Sparkles class="text-goldfinch-gold" size={18} />
              <p class="mt-5 text-[10px] font-bold uppercase tracking-[0.22em] text-[#E8E0D2]/72">Best fit</p>
              <p class="mt-2 font-serif text-[24px] leading-tight text-[#FAFAF7]">{tag}</p>
            </div>
          {/each}
          {#if tour.price_from}
            <div class="tour-design-card border border-[#C5A265]/20 bg-[#2E2820] p-5 shadow-[0_18px_45px_rgba(0,0,0,0.22)]">
              <Clock class="text-goldfinch-gold" size={18} />
              <p class="mt-5 text-[10px] font-bold uppercase tracking-[0.22em] text-[#E8E0D2]/72">Starts from</p>
              <p class="mt-2 font-serif text-[24px] leading-tight text-[#FAFAF7]">{priceText}</p>
            </div>
          {/if}
        </div>
      </div>

      {#if highlights.length}
        <div class="mt-14 grid border border-[#C5A265]/18 bg-[#24201A] md:grid-cols-3">
          {#each highlights as h}
            <article class="border-b border-[#C5A265]/14 p-7 md:border-b-0 md:border-r">
              <span class="grid h-9 w-9 place-items-center rounded-full bg-goldfinch-gold text-deep-green">
                <Check size={16} strokeWidth={2.8} />
              </span>
              <p class="mt-7 text-[15px] font-medium leading-8 text-[#E8E0D2]/84">{h}</p>
            </article>
          {/each}
        </div>
      {/if}

      {#if detailImages.length}
        <div class="mt-12 grid gap-4 md:grid-cols-3">
          {#each detailImages as image, i}
            <div class={`overflow-hidden bg-deep-green ${i === 0 ? 'md:col-span-2' : ''}`}>
              <img class="h-full min-h-[260px] w-full object-cover" src={imgUrl(image, i === 0 ? 1100 : 700, 76)} alt={`${tour.title} image ${i + 1}`} loading="lazy" />
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </section>

  {#if displayDays.length}
    <section id="itinerary" class="scroll-mt-28 bg-deep-green py-16 text-white md:py-24">
      <div class="container-shell">
        <div class="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div class="max-w-[720px]">
            <p class="brand-eyebrow text-goldfinch-gold">Day by day</p>
            <h2 class="mt-5 font-serif text-[40px] font-light leading-[1.08] tracking-normal text-white sm:text-[56px]">
              How the route unfolds.
            </h2>
            <p class="mt-5 text-[15px] font-medium leading-8 text-white/62">
              This is the itinerary stored for this tour. The Emnel team can adjust each day around your dates, lodge preference, flight timing, and pace.
            </p>
          </div>
          <button class="inline-flex h-[52px] items-center justify-center gap-3 border border-goldfinch-gold px-8 text-[12px] font-bold uppercase tracking-[0.18em] text-goldfinch-gold transition hover:bg-goldfinch-gold hover:text-deep-green" type="button" on:click={openForm}>
            Tailor this route <ArrowRight size={16} />
          </button>
        </div>

        <ol class="mt-14 grid gap-8">
          {#each displayDays as day (day.day_number)}
            <li class="grid gap-6 border-t border-white/[0.1] pt-8 md:grid-cols-[0.22fr_1fr_220px] md:gap-10">
              <div>
                <p class="font-serif text-[44px] leading-none text-goldfinch-gold">{day.day_number}</p>
                <p class="mt-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white/36">Day</p>
              </div>
              <div>
                <h3 class="font-serif text-[30px] font-light leading-tight text-white">{day.title}</h3>
                {#if day.description}
                  <p class="mt-4 max-w-[760px] text-[15px] font-medium leading-8 text-white/62">{day.description}</p>
                {/if}
                {#if day.accommodation || day.meals || day.activities}
                  <div class="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold uppercase tracking-[0.12em] text-white/52">
                    {#if day.activities}<span class="inline-flex items-center gap-2"><MapPin size={14} class="text-goldfinch-gold" /> {day.activities}</span>{/if}
                    {#if day.accommodation}<span class="inline-flex items-center gap-2"><BedDouble size={14} class="text-goldfinch-gold" /> {day.accommodation}</span>{/if}
                    {#if day.meals}<span class="inline-flex items-center gap-2"><Utensils size={14} class="text-goldfinch-gold" /> {day.meals}</span>{/if}
                  </div>
                {/if}
              </div>
              <div class="hidden overflow-hidden bg-midnight md:block">
                {#if day.image_url}
                  <img class="h-full min-h-[150px] w-full object-cover" src={imgUrl(day.image_url, 420, 72)} alt={day.title} loading="lazy" />
                {:else}
                  <img class="h-full min-h-[150px] w-full object-cover" src={imgUrl(heroImage, 420, 72)} alt={day.title} loading="lazy" />
                {/if}
              </div>
            </li>
          {/each}
        </ol>
      </div>
    </section>
  {/if}

  {#if galleryImages.length}
    <section id="gallery" class="scroll-mt-28 bg-linen py-16 text-ink md:py-24">
      <div class="container-shell">
        <div class="max-w-[760px]">
          <p class="brand-eyebrow">From the field</p>
          <h2 class="mt-5 font-serif text-[40px] font-light leading-[1.08] tracking-normal text-heading sm:text-[56px]">
            A closer look at this safari.
          </h2>
        </div>
        <div class="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ selector: '.tour-gallery-card', y: 16, stagger: 0.05 }}>
          {#each galleryImages as image (image.id)}
            <figure class="tour-gallery-card group overflow-hidden border border-ink/10 bg-surface">
              <div class="aspect-[4/3] overflow-hidden bg-deep-green">
                <img class="h-full w-full object-cover transition duration-[800ms] group-hover:scale-105" src={imgUrl(image.image_url, 800, 76)} alt={image.alt_text ?? tour.title} loading="lazy" />
              </div>
              {#if image.caption}
                <figcaption class="px-5 py-4 text-[13px] font-medium leading-6 text-ink/64">{image.caption}</figcaption>
              {/if}
            </figure>
          {/each}
        </div>
      </div>
    </section>
  {/if}

  {#if inclusions.length || exclusions.length}
    <section id="included" class="scroll-mt-28 bg-ivory py-16 text-ink md:py-24">
      <div class="container-shell">
        <div class="max-w-[760px]">
          <p class="brand-eyebrow">What is covered</p>
          <h2 class="mt-5 font-serif text-[40px] font-light leading-[1.08] tracking-normal text-heading sm:text-[56px]">
            Clear inclusions before you enquire.
          </h2>
        </div>
        <div class="mt-12 grid gap-8 lg:grid-cols-2">
          {#if inclusions.length}
            <div class="border border-ink/10 bg-surface p-8">
              <h3 class="font-serif text-[30px] font-light text-heading">Included</h3>
              <ul class="mt-7 grid gap-4">
                {#each inclusions as inc}
                  <li class="flex gap-3 text-[15px] font-medium leading-7 text-ink/70">
                    <span class="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-goldfinch-gold text-deep-green"><Check size={12} strokeWidth={3} /></span>
                    {inc.title}
                  </li>
                {/each}
              </ul>
            </div>
          {/if}
          {#if exclusions.length}
            <div class="border border-ink/10 bg-surface p-8">
              <h3 class="font-serif text-[30px] font-light text-heading">Not Included</h3>
              <ul class="mt-7 grid gap-4">
                {#each exclusions as exc}
                  <li class="flex gap-3 text-[15px] font-medium leading-7 text-ink/70">
                    <span class="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ink/8 text-ink/45"><X size={12} strokeWidth={3} /></span>
                    {exc.title}
                  </li>
                {/each}
              </ul>
            </div>
          {/if}
        </div>
      </div>
    </section>
  {/if}

  {#if priceOptions.length}
    <section id="pricing" class="scroll-mt-28 bg-deep-green py-16 text-white md:py-24">
      <div class="container-shell">
        <div class="max-w-[760px]">
          <p class="brand-eyebrow text-goldfinch-gold">Pricing</p>
          <h2 class="mt-5 font-serif text-[40px] font-light leading-[1.08] tracking-normal text-white sm:text-[56px]">
            Ways this safari is priced.
          </h2>
          <p class="mt-5 text-[15px] font-medium leading-8 text-white/62">
            Indicative rates from the live CMS record. Final pricing is confirmed by the Emnel team around your dates, group size, and chosen lodges.
          </p>
        </div>
        <div class="mt-12 grid gap-4 md:grid-cols-2">
          {#each priceOptions as option (option.id)}
            <div class="flex flex-col gap-4 border border-white/[0.1] bg-white/[0.04] p-7">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <h3 class="font-serif text-[26px] font-light leading-tight text-white">{option.title}</h3>
                  {#if option.label && option.label !== option.title}
                    <p class="mt-1 text-sm font-medium text-white/58">{option.label}</p>
                  {/if}
                </div>
                <span class="shrink-0 rounded-full border border-goldfinch-gold/30 bg-goldfinch-gold/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-goldfinch-gold">
                  {priceTypeLabel(option.price_type)}
                </span>
              </div>
              <p class="font-serif text-[34px] leading-none text-goldfinch-gold">{formatPrice(option.price, option.currency)}</p>
              {#if option.description}
                <p class="text-[14px] font-medium leading-7 text-white/62">{option.description}</p>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    </section>
  {/if}

  <section class="bg-linen py-16 text-ink md:py-24">
    <div class="container-shell grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
      <div>
        <p class="brand-eyebrow">Ask for this route</p>
        <h2 class="mt-5 font-serif text-[40px] font-light leading-[1.08] tracking-normal text-heading sm:text-[56px]">
          Tell us what you are imagining and we will build it around you.
        </h2>
        <p class="mt-6 text-[15px] font-medium leading-8 text-ink/68">
          No payment is required to start. Share your email for the itinerary or speak directly on WhatsApp if you want a faster answer.
        </p>
        <div class="mt-8 flex flex-col gap-3 sm:flex-row">
          <button class="inline-flex h-[52px] items-center justify-center gap-3 bg-goldfinch-gold px-8 text-[12px] font-bold uppercase tracking-[0.18em] text-deep-green transition hover:bg-savanna" type="button" on:click={openForm}>
            Start a conversation <ArrowRight size={16} />
          </button>
          <a class="inline-flex h-[52px] items-center justify-center gap-3 border border-ink/20 px-8 text-[12px] font-bold uppercase tracking-[0.18em] text-heading transition hover:border-goldfinch-gold hover:text-goldfinch-gold" href={waHref} target="_blank" rel="noopener noreferrer">
            <MessageCircle size={16} /> WhatsApp us
          </a>
        </div>
      </div>
      <div class="border border-ink/10 bg-surface p-6 md:p-8">
        <EmailItineraryCapture tourTitle={tour.title} />
      </div>
    </div>
  </section>

  {#if relatedTours.length}
    <section id="related" class="scroll-mt-28 bg-deep-green py-16 text-white md:py-24">
      <div class="container-shell">
        <div class="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div class="max-w-[720px]">
            <p class="brand-eyebrow text-goldfinch-gold">Every safari is private</p>
            <h2 class="mt-5 font-serif text-[40px] font-light leading-[1.08] tracking-normal text-white sm:text-[56px]">
              More routes you can compare.
            </h2>
          </div>
          <a class="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.18em] text-goldfinch-gold transition hover:text-white" href="/tours">
            View all itineraries <ArrowRight size={15} />
          </a>
        </div>

        <div class="mt-12 grid border border-white/[0.08] md:grid-cols-3" use:staggeredCardReveal={{ selector: '.related-tour-card', y: 16, stagger: 0.06 }}>
          {#each relatedTours as item (item.id)}
            <article class="related-tour-card border-b border-white/[0.08] bg-[#242118] md:border-b-0 md:border-r">
              <a class="group block h-full" href={`/tours/${item.slug}`}>
                <div class="aspect-[16/10] overflow-hidden bg-midnight">
                  <img class="h-full w-full object-cover transition duration-[800ms] group-hover:scale-105" src={imgUrl(tourCardImage(item), 800, 74)} alt={item.title} loading="lazy" />
                </div>
                <div class="p-7">
                  <p class="text-[11px] font-bold uppercase tracking-[0.2em] text-white/38">{item.duration_days ?? 1} days · {item.currency ?? 'USD'} {item.price_from?.toLocaleString() ?? 'on request'}</p>
                  <h3 class="mt-5 font-serif text-[28px] font-light leading-tight text-white">{item.title}</h3>
                  <p class="mt-4 line-clamp-3 text-[14px] font-medium leading-7 text-white/58">{item.short_description}</p>
                  <span class="mt-7 inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.18em] text-goldfinch-gold">
                    Open route <ArrowRight size={14} />
                  </span>
                </div>
              </a>
            </article>
          {/each}
        </div>
      </div>
    </section>
  {/if}

  {#if planningCards.length}
    <section id="planning" class="scroll-mt-28 bg-ivory py-16 text-ink md:py-24">
      <div class="container-shell">
        <div class="mx-auto max-w-[760px] text-center">
          <p class="brand-eyebrow">Planning hub</p>
          <h2 class="mt-5 font-serif text-[40px] font-light leading-[1.08] tracking-normal text-heading sm:text-[56px]">
            Plan with context before you enquire.
          </h2>
        </div>

        <div class="mt-12 grid gap-4 md:grid-cols-4" use:staggeredCardReveal={{ selector: '.planning-card', y: 16, stagger: 0.05 }}>
          {#each planningCards as post, i (post.id)}
            <article class={`planning-card group overflow-hidden border border-ink/10 bg-surface ${i < 2 ? 'md:col-span-2' : ''}`}>
              <a class="block h-full" href={`/blog/${post.slug}`}>
                <div class={i < 2 ? 'aspect-[16/8]' : 'aspect-[16/10]'}>
                  <img class="h-full w-full object-cover transition duration-[800ms] group-hover:scale-105" src={imgUrl(postCardImage(post), i < 2 ? 1000 : 620, 74)} alt={post.title} loading="lazy" />
                </div>
                <div class="p-6">
                  <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-goldfinch-gold">{post.author_name ?? 'Emnel Journal'}</p>
                  <h3 class="mt-4 font-serif text-[25px] font-light leading-tight text-heading">{post.title}</h3>
                  {#if post.excerpt}<p class="mt-3 line-clamp-3 text-sm font-medium leading-7 text-ink/62">{post.excerpt}</p>{/if}
                  <span class="mt-5 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-goldfinch-gold">Explore guide <ArrowRight size={13} /></span>
                </div>
              </a>
            </article>
          {/each}
        </div>
      </div>
    </section>
  {/if}

  {#if faqs.length}
    <section id="faqs" class="scroll-mt-28 bg-deep-green py-16 text-white md:py-24">
      <div class="container-shell grid gap-12 lg:grid-cols-[0.65fr_1.35fr]">
        <div>
          <p class="brand-eyebrow text-goldfinch-gold">Safari FAQs</p>
          <h2 class="mt-5 font-serif text-[40px] font-light leading-[1.08] tracking-normal text-white sm:text-[56px]">
            Questions we hear most often.
          </h2>
          <p class="mt-6 text-[15px] font-medium leading-8 text-white/58">
            These answers come from the existing FAQ schema and help guests understand the planning process before speaking with us.
          </p>
        </div>
        <div class="border-y border-white/[0.1]">
          {#each faqs as faq}
            <div class="border-b border-white/[0.1]">
              <button class="flex w-full items-center justify-between gap-5 py-5 text-left font-serif text-xl font-light text-white transition hover:text-goldfinch-gold" type="button" on:click={() => (openFaqId = openFaqId === faq.id ? '' : faq.id)}>
                <span>{faq.question}</span>
                <ChevronDown class={`shrink-0 text-goldfinch-gold transition ${openFaqId === faq.id ? 'rotate-180' : ''}`} size={18} />
              </button>
              {#if openFaqId === faq.id}
                <p class="pb-6 text-[15px] font-medium leading-8 text-white/62" transition:slide={{ duration: 180 }}>{faq.answer}</p>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    </section>
  {/if}

  <section class="bg-linen py-16 text-ink md:py-20">
    <div class="container-shell">
      <div class="grid gap-8 bg-deep-green p-8 text-white md:grid-cols-[1fr_auto] md:items-center md:p-10">
        <div>
          <p class="brand-eyebrow text-goldfinch-gold">Still deciding?</p>
          <h2 class="mt-4 font-serif text-[34px] font-light leading-tight text-white md:text-[44px]">
            Speak directly with our Arusha team.
          </h2>
          <div class="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-white/58">
            <span class="inline-flex items-center gap-2"><Star size={15} class="text-goldfinch-gold" /> Private advice</span>
            <span class="inline-flex items-center gap-2"><Route size={15} class="text-goldfinch-gold" /> Route adjustments</span>
            <span class="inline-flex items-center gap-2"><Shield size={15} class="text-goldfinch-gold" /> No payment to enquire</span>
          </div>
        </div>
        <button class="inline-flex h-[52px] items-center justify-center gap-3 border border-goldfinch-gold px-8 text-[12px] font-bold uppercase tracking-[0.18em] text-goldfinch-gold transition hover:bg-goldfinch-gold hover:text-deep-green" type="button" on:click={openForm}>
          Start a conversation <ArrowRight size={16} />
        </button>
      </div>
    </div>
  </section>
{/if}

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
