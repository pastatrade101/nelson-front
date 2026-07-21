<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowRight, Check, MessageCircle } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import DestinationCard from '$lib/components/public/DestinationCard.svelte';
  import FAQAccordion from '$lib/components/public/FAQAccordion.svelte';
  import JsonLd from '$lib/components/public/JsonLd.svelte';
  import { faqLd } from '$lib/seo';
  import StatsCounter from '$lib/components/public/StatsCounter.svelte';
  import FounderStorySection from '$lib/components/public/FounderStorySection.svelte';
  import GuestReviewsSection from '$lib/components/public/GuestReviewsSection.svelte';
  import HeroSection from '$lib/components/public/HeroSection.svelte';
  import JournalFeatureSection from '$lib/components/public/JournalFeatureSection.svelte';
  import PartnerStrip from '$lib/components/public/PartnerStrip.svelte';
  import SafariParksIntroSection from '$lib/components/public/SafariParksIntroSection.svelte';
  import SafariProcessSection from '$lib/components/public/SafariProcessSection.svelte';
  import SafariShowcaseGrid from '$lib/components/public/SafariShowcaseGrid.svelte';
  import SectionHeader from '$lib/components/public/SectionHeader.svelte';
  import PriceRangeBlock from '$lib/components/public/PriceRangeBlock.svelte';
  import DealCard from '$lib/components/public/DealCard.svelte';
  import { fadeUpOnScroll, sectionReveal, staggeredCardReveal } from '$lib/animations';
  import type { BlogPost, Destination, FAQ, Testimonial, Tour } from '$lib/types';

  type HomeSection = {
    button_text?: string | null;
    button_url?: string | null;
    content?: string | null;
    extra_data?: Record<string, unknown> | null;
    image_url?: string | null;
    is_active?: boolean;
    section_key: string;
    subtitle?: string | null;
    title?: string | null;
  };

  let tours: Tour[] = [];
  let destinations: Destination[] = [];
  let posts: BlogPost[] = [];
  let testimonials: Testimonial[] = [];
  let faqs: FAQ[] = [];
  let sections: Record<string, HomeSection> = {};

  // CMS lookup with a safe fallback so the existing design never breaks.
  // Reactive ($:) so it re-reads `sections` after onMount loads them — otherwise
  // every cms('…') in the markup would be computed once (with empty sections)
  // and never update, so admin homepage edits (e.g. the hero image) never show.
  $: cms = (key: string, field: keyof HomeSection, fallback: string): string => {
    const value = sections[key]?.[field];
    return typeof value === 'string' && value.trim() ? value : fallback;
  };

  const DEFAULT_HERO_IMAGE = 'https://images.unsplash.com/photo-1516426122078-c23e76319801';
  const DEFAULT_PARKS_CONTENT =
    'From the endless Serengeti plains to the crater floor of Ngorongoro, the elephant woodlands of Tarangire, and the Indian Ocean coast of Zanzibar - Tanzania holds more extraordinary wildlife experiences within a single country than anywhere else on Earth.';
  const DEFAULT_PARKS_QUOTE =
    '"One country. Endless safari worlds - each one shaped around your season, pace, and reason for travel."';
  const DEFAULT_PARKS_CLOSING =
    'We design private routes across northern Tanzania, southern Tanzania, and the coast so every park has a reason to be in your itinerary.';
  const DEFAULT_FOUNDER_CONTENT =
    "Emnel Adventures started in Arusha in 2016 with a name, a story, and $200. The name carries weight: Emily, Nelson's daughter, and Nelson Kambo himself - two people, one vision, and one extraordinary country to share.\n\nNelson started Emnel with a belief that there was a better way to show Tanzania than through a reseller or fixed-package operator. He wanted guests to experience the country the way he knows it - from the inside, with someone who grew up in its shadow, reads its seasons, and understands that a great safari is built on specific knowledge, not generic itineraries.\n\nToday, Nelson and our team of certified Tanzanian guides handle every safari personally - from the first message through the last day in the field. That has not changed. It will not.";
  const DEFAULT_FOUNDER_QUOTE =
    '"We are a living tribute to what is possible when you refuse to accept the limitations others place on you. Every safari we run honours that."';
  const DEFAULT_FOUNDER_CAPTION =
    'Nelson Kambo - founder and head guide, Emnel Adventures, Arusha.';
  const DEFAULT_PROCESS_QUOTE = '"One conversation. One contact. One safari that is genuinely yours."';
  const DEFAULT_REVIEWS_QUOTE = '"From first enquiry to last game drive - consistently extraordinary."';
  // Stats band values/labels are CMS-overridable via the `stats` section's
  // extra_data. Accept either a bare array or { items: [...] } (the shape the
  // admin raw-JSON editor round-trips cleanly), else fall back to the defaults.
  type StatItem = { value: number; decimals?: number; suffix?: string; label: string };
  const DEFAULT_STATS: StatItem[] = [
    { value: 9, suffix: '+', label: 'Years in Tanzania' },
    { value: 20, suffix: '+', label: 'Tailor-made safaris designed' },
    { value: 5, suffix: '', label: 'Destinations covered' },
    { value: 4.9, decimals: 1, suffix: '★', label: 'Average traveller rating' }
  ];
  $: statsExtra = (sections.stats?.extra_data ?? null) as unknown;
  $: homeStats = ((): StatItem[] => {
    if (Array.isArray(statsExtra) && statsExtra.length) return statsExtra as StatItem[];
    const items = (statsExtra as { items?: unknown } | null)?.items;
    if (Array.isArray(items) && items.length) return items as StatItem[];
    return DEFAULT_STATS;
  })();

  const DEFAULT_SHOWCASE_CONTENT =
    'Use these safari and climb ideas as starting points. Every route can be adjusted around your dates, pace, lodges, and the season you travel.';

  $: heroExtra = (sections.hero?.extra_data ?? {}) as Record<string, unknown>;
  $: showcaseExtra = (sections.safari_showcase?.extra_data ?? {}) as Record<string, unknown>;
  $: faqExtra = (sections.faq?.extra_data ?? {}) as Record<string, unknown>;
  $: parksExtra = (sections.safari_parks_intro?.extra_data ?? {}) as Record<string, unknown>;
  $: founderExtra = (sections.founder_story?.extra_data ?? {}) as Record<string, unknown>;
  $: processExtra = (sections.how_it_works?.extra_data ?? {}) as Record<string, unknown>;
  $: blogExtra = (sections.blog_preview?.extra_data ?? {}) as Record<string, unknown>;
  $: testimonialExtra = (sections.testimonials?.extra_data ?? {}) as Record<string, unknown>;

  const hexToRgba = (hex: string, alpha: number) => {
    const match = /^#?([0-9a-fA-F]{6})$/.exec(hex);
    if (!match) return `rgba(28,26,22,${alpha})`;
    const n = parseInt(match[1], 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
  };

  // Final CTA background (image/video + overlay), all editable from Admin → Homepage.
  $: ctaExtra = (sections.final_cta?.extra_data ?? {}) as Record<string, unknown>;
  $: ctaImage = typeof sections.final_cta?.image_url === 'string' ? sections.final_cta.image_url : '';
  $: ctaVideo = typeof ctaExtra.background_video === 'string' ? ctaExtra.background_video : '';
  $: ctaPosition = typeof ctaExtra.media_position === 'string' ? ctaExtra.media_position : 'center';
  // Fallback background image for the final CTA when no admin media is set, so
  // the band is a photo with an overlay rather than a flat colour. Admin image
  // (sections.final_cta.image_url) still overrides this.
  const DEFAULT_CTA_IMAGE =
    'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1600&q=70';
  $: ctaImageResolved = ctaImage || DEFAULT_CTA_IMAGE;
  $: ctaOverlayColor = typeof ctaExtra.overlay_color === 'string' ? ctaExtra.overlay_color : '#1C1A16';
  $: ctaOverlayOpacity = typeof ctaExtra.overlay_opacity === 'number' ? ctaExtra.overlay_opacity : 0.7;
  $: ctaOverlayStyle =
    ctaExtra.overlay_gradient !== false
      ? `background:linear-gradient(135deg, ${hexToRgba(ctaOverlayColor, ctaOverlayOpacity)}, ${hexToRgba(ctaOverlayColor, ctaOverlayOpacity * 0.55)})`
      : `background:${hexToRgba(ctaOverlayColor, ctaOverlayOpacity)}`;

  // Partner / company logo strip (managed in Admin → Homepage → "partners").
  $: partnersExtra = (sections.partners?.extra_data ?? {}) as Record<string, unknown>;
  $: partnerLogos = (Array.isArray(partnersExtra.logos) ? partnersExtra.logos : []) as Array<{
    image_url: string;
    name?: string;
    url?: string;
  }>;
  $: partnersActive = sections.partners?.is_active !== false;

  // Typical-cost rows, CMS-overridable (cost_ranges → extra_data.ranges).
  $: costRanges = (() => {
    const r = (sections.cost_ranges?.extra_data as Record<string, unknown> | undefined)?.ranges;
    return Array.isArray(r) ? (r as Array<{ label: string; from: string; note?: string }>) : [];
  })();

  onMount(async () => {
    // Each request is independent: a failure (or emptiness) in one collection
    // must never blank the others — in particular, a hiccup in tours/blog/faqs
    // should not wipe the CMS homepage sections and drop the hero to its default.
    const [tourRes, destRes, postRes, testRes, faqRes, homeRes] = await Promise.allSettled([
      api.tours.list({ limit: 6 }),
      api.destinations.list({ limit: 3 }),
      api.blog.list({ limit: 3 }),
      api.testimonials.list({ limit: 6 }),
      api.faqs.list({ limit: 5 }),
      api.homepage.get()
    ]);

    if (tourRes.status === 'fulfilled' && tourRes.value.data.items.length) tours = tourRes.value.data.items;
    if (destRes.status === 'fulfilled' && destRes.value.data.items.length) destinations = destRes.value.data.items;
    if (postRes.status === 'fulfilled' && postRes.value.data.items.length) posts = postRes.value.data.items;
    if (testRes.status === 'fulfilled' && testRes.value.data.items.length) testimonials = testRes.value.data.items;
    if (faqRes.status === 'fulfilled' && faqRes.value.data.items.length) faqs = faqRes.value.data.items;

    if (homeRes.status === 'fulfilled') {
      const sectionList = (homeRes.value.data ?? []) as unknown as HomeSection[];
      sections = Object.fromEntries(sectionList.map((section) => [section.section_key, section]));
    }
  });
</script>

<HeroSection
  title={cms('hero', 'title', 'Where the wild speaks, we know how to listen.')}
  description={cms('hero', 'subtitle', 'Private Tanzania safaris, Kilimanjaro climbs and Zanzibar extensions planned by local experts in Arusha.')}
  eyebrow={typeof heroExtra.eyebrow === 'string' ? heroExtra.eyebrow : 'Private Tanzania Safaris · Authentic Experience · Local Experts'}
  imageUrl={cms('hero', 'image_url', DEFAULT_HERO_IMAGE)}
  imagePosition={typeof heroExtra.media_position === 'string' ? heroExtra.media_position : 'center'}
  primaryCta={cms('hero', 'button_text', 'Plan My Safari')}
  primaryCtaUrl={cms('hero', 'button_url', '/plan-my-trip')}
  secondaryCta={typeof heroExtra.secondary_cta_text === 'string' ? heroExtra.secondary_cta_text : 'Talk to a Safari Advisor'}
  secondaryCtaUrl={typeof heroExtra.secondary_cta_url === 'string' ? heroExtra.secondary_cta_url : '/contact'}
  trustLine={typeof heroExtra.trust_line === 'string' ? heroExtra.trust_line : 'TripAdvisor · TLTO Certified · Private vehicles only · Tanzania-born team · Dedicated safari specialist'}
/>

<SafariParksIntroSection
  eyebrow={typeof parksExtra.eyebrow === 'string' ? parksExtra.eyebrow : "Tanzania's Greatest Safari Parks"}
  title={cms('safari_parks_intro', 'title', 'The Best Safari Destinations')}
  accentTitle={typeof parksExtra.accent_title === 'string' ? parksExtra.accent_title : 'in Tanzania'}
  content={cms('safari_parks_intro', 'content', DEFAULT_PARKS_CONTENT)}
  quote={typeof parksExtra.quote === 'string' ? parksExtra.quote : DEFAULT_PARKS_QUOTE}
  closing={typeof parksExtra.closing === 'string' ? parksExtra.closing : DEFAULT_PARKS_CLOSING}
  ctaLabel="Explore Destinations"
  ctaHref="/destinations"
  stats={Array.isArray(parksExtra.stats) ? parksExtra.stats : undefined}
  parks={Array.isArray(parksExtra.parks) ? parksExtra.parks : undefined}
/>

{#if tours.length}
  <SafariShowcaseGrid
    eyebrow={typeof showcaseExtra.eyebrow === 'string' ? showcaseExtra.eyebrow : 'Private Safari Itineraries'}
    title={cms('safari_showcase', 'title', 'Six Routes')}
    accentTitle={typeof showcaseExtra.accent_title === 'string' ? showcaseExtra.accent_title : 'to Start From'}
    content={cms('safari_showcase', 'content', DEFAULT_SHOWCASE_CONTENT)}
    ctaLabel={cms('safari_parks_intro', 'button_text', 'View Safari Itineraries')}
    ctaHref={cms('safari_parks_intro', 'button_url', '/tours')}
    {tours}
  />
{/if}

<FounderStorySection
  eyebrow={typeof founderExtra.eyebrow === 'string' ? founderExtra.eyebrow : "The Founder's Story"}
  title={cms('founder_story', 'title', 'Built in Tanzania.')}
  accentTitle={typeof founderExtra.accent_title === 'string' ? founderExtra.accent_title : 'For Those Who Want Africa Properly.'}
  content={cms('founder_story', 'content', DEFAULT_FOUNDER_CONTENT)}
  quote={typeof founderExtra.quote === 'string' ? founderExtra.quote : DEFAULT_FOUNDER_QUOTE}
  imageUrl={cms('founder_story', 'image_url', 'https://images.unsplash.com/photo-1523805009345-7448845a9e53')}
  imageCaption={typeof founderExtra.image_caption === 'string' ? founderExtra.image_caption : DEFAULT_FOUNDER_CAPTION}
  primaryCta={cms('founder_story', 'button_text', 'Read the Full Story')}
  primaryHref={cms('founder_story', 'button_url', '/about')}
  secondaryCta={typeof founderExtra.secondary_cta_text === 'string' ? founderExtra.secondary_cta_text : 'Speak to Nelson'}
  secondaryHref={typeof founderExtra.secondary_cta_url === 'string' ? founderExtra.secondary_cta_url : '/contact'}
/>

<SafariProcessSection
  eyebrow={typeof processExtra.eyebrow === 'string' ? processExtra.eyebrow : 'Simple From the Start'}
  title={cms('how_it_works', 'title', 'How a Private Tanzania Safari')}
  accentTitle={typeof processExtra.accent_title === 'string' ? processExtra.accent_title : 'With Emnel Works'}
  subtitle={cms('how_it_works', 'subtitle', "Custom safari booking can feel complicated. It is not - not when you work directly with the people who run the safaris. Here is how it works from first message to first game drive.")}
  quote={typeof processExtra.quote === 'string' ? processExtra.quote : DEFAULT_PROCESS_QUOTE}
  ctaLabel={cms('how_it_works', 'button_text', 'Begin Your Journey')}
  ctaHref={cms('how_it_works', 'button_url', '/plan-my-trip')}
  steps={Array.isArray(processExtra.steps) ? processExtra.steps : undefined}
/>

{#if posts.length}
  <JournalFeatureSection
    eyebrow={typeof blogExtra.eyebrow === 'string' ? blogExtra.eyebrow : 'The Emnel Journal'}
    title={cms('blog_preview', 'title', 'Field Notes From')}
    accentTitle={typeof blogExtra.accent_title === 'string' ? blogExtra.accent_title : 'Tanzania'}
    ctaLabel={cms('blog_preview', 'button_text', 'View All Articles')}
    ctaHref={cms('blog_preview', 'button_url', '/blog')}
    {posts}
  />
{/if}

{#if testimonials.length}
  <GuestReviewsSection
    eyebrow={typeof testimonialExtra.eyebrow === 'string' ? testimonialExtra.eyebrow : 'Guest Experiences'}
    title={cms('testimonials', 'title', 'What Guests Say About')}
    accentTitle={typeof testimonialExtra.accent_title === 'string' ? testimonialExtra.accent_title : 'Their Tanzania Safari'}
    subtitle={cms('testimonials', 'subtitle', 'Every review is from a guest who travelled with Emnel Adventures on a private, tailor-made safari.')}
    quote={typeof testimonialExtra.quote === 'string' ? testimonialExtra.quote : DEFAULT_REVIEWS_QUOTE}
    ctaLabel={cms('testimonials', 'button_text', 'Plan Your Safari')}
    ctaHref={cms('testimonials', 'button_url', '/plan-my-trip')}
    {testimonials}
  />
{/if}

<StatsCounter stats={homeStats} />

{#if tours.length}
  <section class="relative overflow-hidden bg-gradient-to-b from-sand/55 via-surface to-surface py-16 md:py-24" use:sectionReveal>
    <span class="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-goldfinch-gold/10 blur-3xl" aria-hidden="true"></span>
    <div class="container-shell relative">
      <div class="mx-auto max-w-2xl text-center" use:fadeUpOnScroll={{ y: 14 }}>
        <p class="brand-eyebrow">Limited Time Offers</p>
        <h2 class="mt-4 text-3xl font-normal tracking-normal text-heading md:text-[40px]">
          {cms('featured_tours', 'title', 'Exclusive Safari Deals & Travel Offers')}
        </h2>
        <p class="mt-3 text-[15px] font-medium leading-7 text-ink/70 md:text-lg">
          {cms('featured_tours', 'subtitle', 'Handpicked Tanzania safari, Kilimanjaro and Zanzibar experiences at our best seasonal prices — limited spots, big value.')}
        </p>
      </div>
      <div class="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal>
        {#each tours.slice(0, 3) as tour, i}
          <DealCard {tour} index={i} />
        {/each}
      </div>
    </div>
  </section>
{/if}

<!-- typical cost band (spec §4.1 F / §6) — only shown when real ranges are set in the CMS -->
{#if costRanges.length}
  <section class="bg-canvas py-16 md:py-24" use:sectionReveal>
    <div class="container-shell">
      <PriceRangeBlock
        title={cms('cost_ranges', 'title', 'What trips typically cost')}
        subtitle={cms('cost_ranges', 'subtitle', 'A confident brand is upfront about price — here are honest starting points by trip type.')}
        ranges={costRanges}
      />
    </div>
  </section>
{/if}

{#if destinations.length}
  <section class="bg-sand/40 py-16 md:py-24" use:sectionReveal>
    <div class="container-shell">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <SectionHeader eyebrow="Places" title={cms('featured_destinations', 'title', 'Destinations')} description={cms('featured_destinations', 'subtitle', 'Destination content can be managed from the CMS.')} />
        <a class="inline-flex items-center gap-1.5 text-sm font-semibold text-forest transition hover:text-heading" href="/destinations">
          See all Destinations <ArrowRight size={16} />
        </a>
      </div>
      <div class="mt-10 grid gap-6 md:grid-cols-3" use:staggeredCardReveal>
        {#each destinations as destination}
          <DestinationCard {destination} />
        {/each}
      </div>
    </div>
  </section>
{/if}

{#if faqs.length}
  <JsonLd data={faqLd(faqs.map((f) => ({ q: f.question, a: f.answer })))} />
  <section class="bg-canvas py-16 md:py-24" use:sectionReveal>
    <div class="container-shell grid gap-10 md:grid-cols-[0.8fr_1.2fr] md:gap-12">
      <SectionHeader
        eyebrow={typeof faqExtra.eyebrow === 'string' ? faqExtra.eyebrow : 'Good to Know'}
        title={cms('faq', 'title', 'Frequently Asked Questions')}
        description={cms('faq', 'subtitle', 'Honest answers to the questions Tanzania safari travellers ask most.')}
      />
      <FAQAccordion {faqs} />
    </div>
  </section>
{/if}

{#if sections.final_cta?.is_active !== false && (sections.final_cta?.title || sections.final_cta?.button_text)}
  <section class="relative w-full overflow-hidden text-white" use:sectionReveal>
    <!-- background media layer (admin-configurable: video > image > brand gradient) -->
    {#if ctaVideo}
      <!-- svelte-ignore a11y-media-has-caption -->
      <video class="absolute inset-0 h-full w-full object-cover" style={`object-position:${ctaPosition}`} src={ctaVideo} poster={ctaImageResolved} autoplay muted loop playsinline></video>
    {:else}
      <img class="absolute inset-0 h-full w-full object-cover" style={`object-position:${ctaPosition}`} src={ctaImageResolved} alt="" loading="lazy" decoding="async" />
    {/if}

    <!-- green overlay so the photo shows through but the text stays crisp -->
    <div class="absolute inset-0" style={ctaOverlayStyle}></div>

    <!-- decorative depth -->
    <div class="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-goldfinch-gold/20 blur-3xl"></div>
    <div class="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-savanna/15 blur-3xl"></div>
    <div
      class="pointer-events-none absolute inset-0 opacity-[0.06]"
      style="background-image: radial-gradient(circle, #ffffff 1px, transparent 1.6px); background-size: 26px 26px;"
    ></div>

    <div class="container-shell relative py-16 text-center md:py-24" use:fadeUpOnScroll={{ y: 18 }}>
      <div class="mx-auto max-w-3xl">
        <p class="brand-eyebrow">Start Your Journey</p>

        <h2 class="mt-5 text-3xl font-normal leading-[1.12] tracking-normal md:text-[44px]">
          {cms('final_cta', 'title', 'Ready to plan your private Tanzania safari?')}
        </h2>

        <p class="mx-auto mt-4 max-w-xl text-[15px] font-medium leading-7 text-white/75 md:text-lg">
          {cms('final_cta', 'subtitle', 'Talk to a local expert in Arusha and travel with confidence — no payment needed to start planning.')}
        </p>

        <div class="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            class="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-goldfinch-gold px-7 text-sm font-semibold text-goldfinch-gold transition hover:bg-goldfinch-gold hover:text-deep-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-deep-green sm:w-auto md:h-[52px] md:text-base"
            href={cms('final_cta', 'button_url', '/plan-my-trip')}
          >
            {cms('final_cta', 'button_text', 'Plan My Safari')}
            <ArrowRight size={18} strokeWidth={2.6} class="transition-transform group-hover:translate-x-0.5" />
          </a>
          <a
            class="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/25 bg-surface/5 px-7 text-sm font-bold text-white backdrop-blur transition hover:bg-surface/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 sm:w-auto md:h-[52px] md:text-base"
            href="/contact"
          >
            <MessageCircle size={17} strokeWidth={2.4} />
            Talk to a Safari Advisor
          </a>
        </div>

        <div class="mt-10 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-sm font-medium text-white/70">
          {#each ['Local experts', 'No payment to plan', 'Honest, tailored advice'] as point}
            <span class="inline-flex items-center gap-2">
              <span class="grid h-5 w-5 place-items-center rounded-full bg-goldfinch-gold/20 text-goldfinch-gold">
                <Check size={12} strokeWidth={3} />
              </span>
              {point}
            </span>
          {/each}
        </div>
      </div>
    </div>
  </section>
{/if}

{#if partnersActive}
  <PartnerStrip logos={partnerLogos} title={cms('partners', 'title', 'Trusted by leading travel partners')} />
{/if}
