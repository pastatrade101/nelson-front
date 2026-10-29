<script lang="ts">
  import { ArrowRight } from '@lucide/svelte';
  import DestinationFeatureCard from '$lib/components/public/DestinationFeatureCard.svelte';
  import FAQAccordion from '$lib/components/public/FAQAccordion.svelte';
  import FinalCtaSection from '$lib/components/public/FinalCtaSection.svelte';
  import FounderStorySection from '$lib/components/public/FounderStorySection.svelte';
  import GallerySection from '$lib/components/public/GallerySection.svelte';
  import GuestReviewsSection from '$lib/components/public/GuestReviewsSection.svelte';
  import HeroSection from '$lib/components/public/HeroSection.svelte';
  import HomeProofStrip from '$lib/components/public/HomeProofStrip.svelte';
  import JournalFeatureSection from '$lib/components/public/JournalFeatureSection.svelte';
  import PartnerStrip from '$lib/components/public/PartnerStrip.svelte';
  import PriceRangeBlock from '$lib/components/public/PriceRangeBlock.svelte';
  import SafariParksIntroSection from '$lib/components/public/SafariParksIntroSection.svelte';
  import SafariProcessSection from '$lib/components/public/SafariProcessSection.svelte';
  import SafariShowcaseGrid from '$lib/components/public/SafariShowcaseGrid.svelte';
  import SectionHeader from '$lib/components/public/SectionHeader.svelte';
  import { sectionReveal, staggeredCardReveal } from '$lib/animations';
  import { orderedHomeSections } from '$lib/homeSections';
  import type { BlogPost, Destination, FAQ, GalleryItem, Testimonial, Tour } from '$lib/types';
  import type { PageData } from './$types';

  export let data: PageData;

  type HomeSection = {
    button_text?: string | null;
    button_url?: string | null;
    content?: string | null;
    extra_data?: Record<string, unknown> | null;
    image_url?: string | null;
    is_active?: boolean | null;
    section_key: string;
    sort_order?: number | null;
    subtitle?: string | null;
    title?: string | null;
  };

  // All conversion-critical collections arrive SSR-loaded from +page.ts. The
  // first commercial section therefore contains real products, prices and
  // durations in the initial HTML instead of appearing after hydration.
  $: tours = (data.tours ?? []) as Tour[];
  $: destinations = (data.destinations ?? []) as Destination[];
  $: faqs = (data.faqs ?? []) as FAQ[];
  $: gallery = (data.gallery ?? []) as GalleryItem[];
  $: testimonials = (data.testimonials ?? []) as Testimonial[];
  $: posts = (data.posts ?? []) as BlogPost[];
  $: rows = (data.sectionRows ?? []) as unknown as HomeSection[];

  // The page, top to bottom, exactly as the CMS homepage editor orders it
  // (Admin › Homepage): its sort order, its Active switches. See
  // $lib/homeSections for the list both sides share.
  $: sections = orderedHomeSections(rows);

  // ── reading one section's CMS fields ──────────────────────────────────────
  // A field the editor filled in always wins. Built-in text only stands in for
  // a field left empty, so a saved section never shows stale default copy.
  const text = (row: HomeSection | null, field: 'title' | 'subtitle' | 'content' | 'image_url' | 'button_text' | 'button_url', fallback: string) => {
    const value = row?.[field];
    return typeof value === 'string' && value.trim() ? value : fallback;
  };
  const extra = (row: HomeSection | null): Record<string, unknown> =>
    row?.extra_data && typeof row.extra_data === 'object' && !Array.isArray(row.extra_data) ? row.extra_data : {};
  const extraText = (row: HomeSection | null, key: string, fallback: string) => {
    const value = extra(row)[key];
    return typeof value === 'string' && value.trim() ? value : fallback;
  };
  /**
   * The italic second half of a split heading. Its default only belongs to the
   * default title: under an edited title ("Signature Journeys") the old accent
   * ("Safaris") would read as one garbled headline, so it is left blank unless
   * the editor wrote one.
   */
  const accent = (row: HomeSection | null, fallback: string) => {
    if (!row?.title?.trim()) return fallback;
    const value = extra(row).accent_title;
    return typeof value === 'string' ? value : '';
  };
  const list = (row: HomeSection | null, key: string) => {
    const value = extra(row)[key];
    return Array.isArray(value) ? value : undefined;
  };

  // Overlay settings shared by the hero and the closing band.
  const overlay = (row: HomeSection | null, opacity: number) => {
    const ex = extra(row);
    return {
      overlayColor: typeof ex.overlay_color === 'string' ? ex.overlay_color : '#1C1A16',
      overlayOpacity: typeof ex.overlay_opacity === 'number' ? ex.overlay_opacity : opacity,
      overlayGradient: ex.overlay_gradient !== false,
      imagePosition: typeof ex.media_position === 'string' ? ex.media_position : 'center',
      videoUrl: typeof ex.background_video === 'string' ? ex.background_video : ''
    };
  };

  // Cost ranges: only complete rows (a label and a price) are shown.
  const costRows = (row: HomeSection | null) =>
    (list(row, 'ranges') ?? [])
      .map((r) => r as Record<string, unknown>)
      .filter((r) => typeof r.label === 'string' && r.label.trim() && typeof r.from === 'string' && r.from.trim())
      .map((r) => ({ label: String(r.label), from: String(r.from), note: typeof r.note === 'string' ? r.note : undefined, image: typeof r.image === 'string' ? r.image : undefined }));

  // The photo gallery is not a CMS section: it sits after the destinations (or
  // before the FAQ / closing band when those are switched off).
  $: galleryAfter = sections.find(({ def }) => def.key === 'featured_destinations')?.def.key ?? null;
  $: galleryBefore = galleryAfter ? null : sections.find(({ def }) => def.key === 'faq' || def.key === 'final_cta')?.def.key ?? null;
  // Reviews show once: in their own section when it is on, else beside the photos.
  $: reviewsSectionOn = sections.some(({ def }) => def.key === 'testimonials') && testimonials.length > 0;

  const DEFAULT_PARKS_CONTENT =
    'Emnel Adventures was founded in Arusha by Tanzanians who know these parks, seasons and routes first-hand. You plan directly with the local team responsible for your safari.\n\nEvery itinerary is private and tailored around your dates, pace, interests and budget - never pulled from a shelf.';
  const DEFAULT_FOUNDER_CONTENT =
    "Emnel Adventures started in Arusha in 2016 with a name, a story, and $200. Nelson started Emnel with a belief that there was a better way to show Tanzania than through a reseller or fixed-package operator.\n\nToday, Nelson and our team of certified Tanzanian guides handle every safari personally - from the first message through the last day in the field.";
  const DEFAULT_SHOWCASE_CONTENT =
    'Compare real private safari routes with clear durations and starting prices. Every itinerary can be adjusted around your dates, pace, lodges and travel season.';
</script>

{#snippet gallerySection()}
  <div id="recent-safaris" class="scroll-mt-20">
    <GallerySection
      images={gallery}
      testimonials={reviewsSectionOn ? [] : testimonials}
      eyebrow="Real Traveller Proof"
      title="From Our Recent Safaris"
      description="Real moments from Emnel journeys, labelled by the place and safari they belong to."
    />
  </div>
{/snippet}

{#each sections as { def, row } (def.key)}
  {#if galleryBefore === def.key}{@render gallerySection()}{/if}

  {#if def.key === 'hero'}
    {@const o = overlay(row, 0.3)}
    <HeroSection
      title={text(row, 'title', 'Where the wild speaks, we know how to listen.')}
      description={text(row, 'subtitle', 'Private Tanzania safaris, Kilimanjaro climbs and Zanzibar extensions planned by local experts in Arusha.')}
      eyebrow={extraText(row, 'eyebrow', 'Private Tanzania Safaris · Authentic Experience · Local Experts')}
      imageUrl={text(row, 'image_url', '')}
      videoUrl={o.videoUrl}
      imagePosition={o.imagePosition}
      primaryCta={text(row, 'button_text', 'Plan My Safari')}
      primaryCtaUrl={text(row, 'button_url', '/plan-my-trip')}
      secondaryCta={extraText(row, 'secondary_cta_text', 'Explore Safaris & Prices')}
      secondaryCtaUrl={extraText(row, 'secondary_cta_url', '/tours')}
      trustLine={extraText(row, 'trust_line', 'Real itineraries · Clear durations and starting prices · Planned in Arusha')}
      overlayColor={o.overlayColor}
      overlayOpacity={o.overlayOpacity}
      overlayGradient={o.overlayGradient}
    />
    <HomeProofStrip />

  {:else if def.key === 'featured_tours' && tours.length}
    <div id="popular-safaris" class="scroll-mt-20">
      <SafariShowcaseGrid
        eyebrow={extraText(row, 'eyebrow', 'Explore Real Itineraries')}
        title={text(row, 'title', 'Popular Private')}
        accentTitle={accent(row, 'Safaris')}
        content={text(row, 'content', text(row, 'subtitle', DEFAULT_SHOWCASE_CONTENT))}
        ctaLabel={text(row, 'button_text', 'View All Safaris')}
        ctaHref={text(row, 'button_url', '/tours')}
        {tours}
      />
    </div>

  {:else if def.key === 'cost_ranges' && costRows(row).length}
    <section id="typical-costs" class="scroll-mt-20 bg-canvas py-16 md:py-24" use:sectionReveal>
      <div class="container-shell">
        <PriceRangeBlock title={text(row, 'title', '')} subtitle={text(row, 'subtitle', '')} ranges={costRows(row)} />
      </div>
    </section>

  {:else if def.key === 'safari_parks_intro'}
    <div id="safari-parks" class="scroll-mt-20">
      <SafariParksIntroSection
        eyebrow={extraText(row, 'eyebrow', "Tanzania's Greatest Safari Parks")}
        title={text(row, 'title', 'The Best Safari Destinations')}
        accentTitle={accent(row, 'in Tanzania')}
        content={text(row, 'content', DEFAULT_PARKS_CONTENT)}
        quote={extraText(row, 'quote', '"One country. Endless safari worlds - each one shaped around your season, pace, and reason for travel."')}
        closing={extraText(row, 'closing', '')}
        ctaLabel={text(row, 'button_text', 'Explore Destinations')}
        ctaHref={text(row, 'button_url', '/destinations')}
        stats={list(row, 'stats')}
        parks={list(row, 'parks')}
      />
    </div>

  {:else if def.key === 'how_it_works'}
    <div id="how-it-works" class="scroll-mt-20">
      <SafariProcessSection
        eyebrow={extraText(row, 'eyebrow', 'Simple From the Start')}
        title={text(row, 'title', 'How a Private Tanzania Safari')}
        accentTitle={accent(row, 'With Emnel Works')}
        subtitle={text(row, 'subtitle', 'Custom safari booking can feel complicated. It is not - not when you work directly with the people who run the safaris. Here is how it works from first message to first game drive.')}
        quote={extraText(row, 'quote', '"One conversation. One contact. One safari that is genuinely yours."')}
        ctaLabel={text(row, 'button_text', 'Begin Your Journey')}
        ctaHref={text(row, 'button_url', '/plan-my-trip')}
        steps={list(row, 'steps')}
      />
    </div>

  {:else if def.key === 'founder_story'}
    <div id="founder-story" class="scroll-mt-20">
      <FounderStorySection
        eyebrow={extraText(row, 'eyebrow', "The Founder's Story")}
        title={text(row, 'title', 'Built in Tanzania.')}
        accentTitle={accent(row, 'For Those Who Want Africa Properly.')}
        content={text(row, 'content', DEFAULT_FOUNDER_CONTENT)}
        quote={extraText(row, 'quote', '"We are a living tribute to what is possible when you refuse to accept the limitations others place on you. Every safari we run honours that."')}
        imageUrl={text(row, 'image_url', '')}
        imageCaption={extraText(row, 'image_caption', 'Nelson Laizer - founder and head guide, Emnel Adventures, Arusha.')}
        primaryCta={text(row, 'button_text', 'Read the Full Story')}
        primaryHref={text(row, 'button_url', '/about')}
        secondaryCta={extraText(row, 'secondary_cta_text', 'Speak to Nelson')}
        secondaryHref={extraText(row, 'secondary_cta_url', '/contact')}
        showSecondary={Boolean(extraText(row, 'secondary_cta_text', ''))}
        trim={false}
        compact
      />
    </div>

  {:else if def.key === 'testimonials' && testimonials.length}
    <div id="guest-reviews" class="scroll-mt-20">
      <GuestReviewsSection
        {testimonials}
        eyebrow={extraText(row, 'eyebrow', 'Guest Experiences')}
        title={text(row, 'title', 'What Guests Say About')}
        accentTitle={accent(row, 'Their Tanzania Safari')}
        subtitle={text(row, 'subtitle', 'Every review is from a guest who travelled with Emnel Adventures on a private, tailor-made safari.')}
        quote={extraText(row, 'quote', '')}
        ctaLabel={text(row, 'button_text', 'Plan Your Safari')}
        ctaHref={text(row, 'button_url', '/plan-my-trip')}
      />
    </div>

  {:else if def.key === 'featured_destinations' && destinations.length}
    <section id="destinations" class="scroll-mt-20 bg-sand/40 py-16 md:py-24" use:sectionReveal>
      <div class="container-shell">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <SectionHeader
            eyebrow={extraText(row, 'eyebrow', 'Places')}
            title={text(row, 'title', 'Explore Tanzania')}
            description={text(row, 'subtitle', 'See what makes each safari region different, then explore the parks, wildlife and best travel seasons in detail.')}
          />
          <a class="inline-flex items-center gap-1.5 text-sm font-semibold text-forest transition hover:text-heading" href={text(row, 'button_url', '/destinations')}>
            {text(row, 'button_text', 'See all Destinations')} <ArrowRight size={16} />
          </a>
        </div>
        <div class="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal>
          {#each destinations.slice(0, 6) as destination (destination.slug)}
            <DestinationFeatureCard {destination} />
          {/each}
        </div>
      </div>
    </section>

  {:else if def.key === 'blog_preview' && posts.length}
    <div id="journal" class="scroll-mt-20">
      <JournalFeatureSection
        {posts}
        eyebrow={extraText(row, 'eyebrow', 'The Emnel Journal')}
        title={text(row, 'title', 'Field Notes From')}
        accentTitle={accent(row, 'Tanzania')}
        ctaLabel={text(row, 'button_text', 'View All Articles')}
        ctaHref={text(row, 'button_url', '/blog')}
      />
    </div>

  {:else if def.key === 'faq' && faqs.length}
    <!-- Shown in full in the server HTML, but not marked up as FAQPage here: every
         question on the homepage is marked up on the page that owns it (see
         ownedFaqs in $lib/faqEntities), and Google asks for one instance per site. -->
    <section id="faq" class="scroll-mt-20 bg-canvas py-16 md:py-24" use:sectionReveal>
      <div class="container-shell grid gap-10 md:grid-cols-[0.8fr_1.2fr] md:gap-12">
        <SectionHeader
          eyebrow={extraText(row, 'eyebrow', 'Good to Know')}
          title={text(row, 'title', 'Frequently Asked Questions')}
          description={text(row, 'subtitle', 'Honest answers to the questions Tanzania safari travellers ask most.')}
        />
        <FAQAccordion {faqs} />
      </div>
    </section>

  {:else if def.key === 'partners' && (list(row, 'logos') ?? []).length}
    <PartnerStrip title={text(row, 'title', '')} logos={(list(row, 'logos') ?? []) as Array<{ image_url: string; name?: string; url?: string }>} />

  {:else if def.key === 'final_cta'}
    {@const o = overlay(row, 0.7)}
    <FinalCtaSection
      eyebrow={extraText(row, 'eyebrow', '')}
      title={text(row, 'title', 'Ready to plan your private Tanzania safari?')}
      subtitle={text(row, 'subtitle', 'Talk to a local expert in Arusha and travel with confidence.')}
      primaryLabel={text(row, 'button_text', 'Plan My Safari')}
      primaryHref={text(row, 'button_url', '/plan-my-trip')}
      imageUrl={text(row, 'image_url', '')}
      videoUrl={o.videoUrl}
      imagePosition={o.imagePosition}
      overlayColor={o.overlayColor}
      overlayOpacity={o.overlayOpacity}
      overlayGradient={o.overlayGradient}
    />
  {/if}

  {#if galleryAfter === def.key}{@render gallerySection()}{/if}
{/each}
