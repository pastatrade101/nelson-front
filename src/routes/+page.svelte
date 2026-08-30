<script lang="ts">
  import { branding } from '$lib/branding';
  import { ArrowRight } from '@lucide/svelte';
  import DestinationFeatureCard from '$lib/components/public/DestinationFeatureCard.svelte';
  import FAQAccordion from '$lib/components/public/FAQAccordion.svelte';
  import JsonLd from '$lib/components/public/JsonLd.svelte';
  import { faqLd } from '$lib/seo';
  import FinalCtaSection from '$lib/components/public/FinalCtaSection.svelte';
  import FounderStorySection from '$lib/components/public/FounderStorySection.svelte';
  import HomeProofStrip from '$lib/components/public/HomeProofStrip.svelte';
  import HeroSection from '$lib/components/public/HeroSection.svelte';
  import SafariProcessSection from '$lib/components/public/SafariProcessSection.svelte';
  import SafariShowcaseGrid from '$lib/components/public/SafariShowcaseGrid.svelte';
  import SectionHeader from '$lib/components/public/SectionHeader.svelte';
  import GallerySection from '$lib/components/public/GallerySection.svelte';
  import WhyEmnelSection from '$lib/components/public/WhyEmnelSection.svelte';
  import { sectionReveal, staggeredCardReveal } from '$lib/animations';
  import type { Destination, FAQ, GalleryItem, Testimonial, Tour } from '$lib/types';
  import type { PageData } from './$types';

  export let data: PageData;

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

  // All conversion-critical collections arrive SSR-loaded from +page.ts. The
  // first commercial section therefore contains real products, prices and
  // durations in the initial HTML instead of appearing after hydration.
  $: tours = (data.tours ?? []) as Tour[];
  $: destinations = (data.destinations ?? []) as Destination[];
  $: faqs = (data.faqs ?? []) as FAQ[];
  $: gallery = (data.gallery ?? []) as GalleryItem[];
  $: testimonials = (data.testimonials ?? []) as Testimonial[];
  $: sections = (data.sections ?? {}) as unknown as Record<string, HomeSection>;

  // CMS lookup with a safe fallback so the existing design never breaks.
  $: cms = (key: string, field: keyof HomeSection, fallback: string): string => {
    const value = sections[key]?.[field];
    return typeof value === 'string' && value.trim() ? value : fallback;
  };

  const DEFAULT_PARKS_CONTENT =
    'Emnel Adventures was founded in Arusha by Tanzanians who know these parks, seasons and routes first-hand. You plan directly with the local team responsible for your safari.\n\nEvery itinerary is private and tailored around your dates, pace, interests and budget - never pulled from a shelf.';
  const DEFAULT_PARKS_QUOTE =
    '“We are not resellers. We are the guides.”';
  const DEFAULT_FOUNDER_CONTENT =
    "Emnel Adventures started in Arusha in 2016 with a name, a story, and $200. The name carries weight: Emily, Nelson's daughter, and Nelson Kambo himself - two people, one vision, and one extraordinary country to share.\n\nNelson started Emnel with a belief that there was a better way to show Tanzania than through a reseller or fixed-package operator. He wanted guests to experience the country the way he knows it - from the inside, with someone who grew up in its shadow, reads its seasons, and understands that a great safari is built on specific knowledge, not generic itineraries.\n\nToday, Nelson and our team of certified Tanzanian guides handle every safari personally - from the first message through the last day in the field. That has not changed. It will not.";
  const DEFAULT_FOUNDER_QUOTE =
    '"We are a living tribute to what is possible when you refuse to accept the limitations others place on you. Every safari we run honours that."';
  const DEFAULT_FOUNDER_CAPTION =
    'Nelson Kambo - founder and head guide, Emnel Adventures, Arusha.';
  const DEFAULT_PROCESS_QUOTE = '"One conversation. One contact. One safari that is genuinely yours."';

  const DEFAULT_SHOWCASE_CONTENT =
    'Compare real private safari routes with clear durations and starting prices. Every itinerary can be adjusted around your dates, pace, lodges and travel season.';

  $: heroExtra = (sections.hero?.extra_data ?? {}) as Record<string, unknown>;
  $: heroVideo = typeof heroExtra.background_video === 'string' ? heroExtra.background_video : '';
  $: showcaseExtra = (sections.safari_showcase?.extra_data ?? {}) as Record<string, unknown>;
  $: faqExtra = (sections.faq?.extra_data ?? {}) as Record<string, unknown>;
  $: parksExtra = (sections.safari_parks_intro?.extra_data ?? {}) as Record<string, unknown>;
  $: founderExtra = (sections.founder_story?.extra_data ?? {}) as Record<string, unknown>;
  $: processExtra = (sections.how_it_works?.extra_data ?? {}) as Record<string, unknown>;

  // Final CTA background (image/video + overlay), all editable from Admin → Homepage.
  $: ctaExtra = (sections.final_cta?.extra_data ?? {}) as Record<string, unknown>;
  $: ctaImage = typeof sections.final_cta?.image_url === 'string' ? sections.final_cta.image_url : '';
  $: ctaVideo = typeof ctaExtra.background_video === 'string' ? ctaExtra.background_video : '';
  $: ctaPosition = typeof ctaExtra.media_position === 'string' ? ctaExtra.media_position : 'center';
  // Prefer a real CMS gallery image over a stock fallback. If neither exists,
  // FinalCtaSection uses its branded gradient.
  $: galleryCtaImage = gallery.find((item) => item.media_type !== 'video' && item.media_type !== 'document')?.image_url ?? '';
  $: ctaImageResolved = ctaImage || galleryCtaImage;
  $: ctaOverlayColor = typeof ctaExtra.overlay_color === 'string' ? ctaExtra.overlay_color : '#1C1A16';
  $: ctaOverlayOpacity = typeof ctaExtra.overlay_opacity === 'number' ? ctaExtra.overlay_opacity : 0.7;
  $: ctaOverlayGradient = ctaExtra.overlay_gradient !== false;

  // A homepage section renders only when its CMS "Active" toggle is on (absent /
  // undefined counts as active). This makes the admin Active switch actually
  // control what shows — previously most sections ignored it and always rendered.
  $: sectionOn = (key: string): boolean => sections[key]?.is_active !== false;

</script>

<svelte:head>
  <title>{$branding.site_name}</title>
  <meta
    name="description"
    content={`${$branding.tagline.replace(/[.\s]+$/, '')}. ${$branding.positioning}`}
  />
</svelte:head>


<HeroSection
  title={cms('hero', 'title', 'Where the wild speaks, we know how to listen.')}
  description={cms('hero', 'subtitle', 'Private Tanzania safaris, Kilimanjaro climbs and Zanzibar extensions planned by local experts in Arusha.')}
  eyebrow={typeof heroExtra.eyebrow === 'string' ? heroExtra.eyebrow : 'Private Tanzania Safaris · Authentic Experience · Local Experts'}
  imageUrl={cms('hero', 'image_url', '')}
  videoUrl={heroVideo}
  imagePosition={typeof heroExtra.media_position === 'string' ? heroExtra.media_position : 'center'}
  primaryCta={cms('hero', 'button_text', 'Plan My Safari')}
  primaryCtaUrl={cms('hero', 'button_url', '/plan-my-trip')}
  secondaryCta={typeof heroExtra.secondary_cta_text === 'string' ? heroExtra.secondary_cta_text : 'Explore Safaris & Prices'}
  secondaryCtaUrl={typeof heroExtra.secondary_cta_url === 'string' ? heroExtra.secondary_cta_url : '/tours'}
  trustLine={typeof heroExtra.trust_line === 'string' ? heroExtra.trust_line : 'Real itineraries · Clear durations and starting prices · Planned in Arusha'}
  overlayColor={typeof heroExtra.overlay_color === 'string' ? heroExtra.overlay_color : '#1C1A16'}
  overlayOpacity={typeof heroExtra.overlay_opacity === 'number' ? heroExtra.overlay_opacity : 0.3}
  overlayGradient={heroExtra.overlay_gradient !== false}
/>

<HomeProofStrip />

{#if sectionOn('safari_showcase') && tours.length}
  <div id="popular-safaris" class="scroll-mt-20">
    <SafariShowcaseGrid
      eyebrow={typeof showcaseExtra.eyebrow === 'string' ? showcaseExtra.eyebrow : 'Explore Real Itineraries'}
      title={cms('safari_showcase', 'title', 'Popular Private')}
      accentTitle={typeof showcaseExtra.accent_title === 'string' ? showcaseExtra.accent_title : 'Safaris'}
      content={cms('safari_showcase', 'content', DEFAULT_SHOWCASE_CONTENT)}
      ctaLabel={cms('safari_showcase', 'button_text', 'View All Safaris')}
      ctaHref={cms('safari_showcase', 'button_url', '/tours')}
      {tours}
    />
  </div>
{/if}

{#if sectionOn('safari_parks_intro')}
  <div id="why-emnel" class="scroll-mt-20">
    <WhyEmnelSection
      eyebrow={typeof parksExtra.why_eyebrow === 'string' ? parksExtra.why_eyebrow : 'Why Emnel'}
      title={cms('safari_parks_intro', 'title', 'Private Tanzania safaris,')}
      accentTitle={typeof parksExtra.why_accent_title === 'string' ? parksExtra.why_accent_title : 'planned where they happen.'}
      content={cms('safari_parks_intro', 'content', DEFAULT_PARKS_CONTENT)}
      quote={typeof parksExtra.quote === 'string' ? parksExtra.quote : DEFAULT_PARKS_QUOTE}
      ctaLabel={typeof parksExtra.why_cta_text === 'string' ? parksExtra.why_cta_text : 'Why Travel With Emnel'}
      ctaHref={typeof parksExtra.why_cta_url === 'string' ? parksExtra.why_cta_url : '/about'}
    />
  </div>
{/if}

{#if sectionOn('how_it_works')}
  <div id="how-it-works" class="scroll-mt-20">
    <SafariProcessSection
      eyebrow={typeof processExtra.eyebrow === 'string' ? processExtra.eyebrow : 'Simple From the Start'}
      title={cms('how_it_works', 'title', 'How a Private Tanzania Safari')}
      accentTitle={typeof processExtra.accent_title === 'string' ? processExtra.accent_title : 'With Emnel Works'}
      subtitle={cms('how_it_works', 'subtitle', "Custom safari booking can feel complicated. It is not - not when you work directly with the people who run the safaris. Here is how it works from first message to first game drive.")}
      quote={typeof processExtra.quote === 'string' ? processExtra.quote : DEFAULT_PROCESS_QUOTE}
      ctaLabel="Plan My Safari"
      ctaHref={cms('how_it_works', 'button_url', '/plan-my-trip')}
      steps={Array.isArray(processExtra.steps) ? processExtra.steps : undefined}
    />
  </div>
{/if}

{#if sectionOn('founder_story')}
  <div id="founder-story" class="scroll-mt-20">
    <FounderStorySection
      eyebrow={typeof founderExtra.eyebrow === 'string' ? founderExtra.eyebrow : "The Founder's Story"}
      title={cms('founder_story', 'title', 'Built in Tanzania.')}
      accentTitle={typeof founderExtra.accent_title === 'string' ? founderExtra.accent_title : 'For Those Who Want Africa Properly.'}
      content={cms('founder_story', 'content', DEFAULT_FOUNDER_CONTENT)}
      quote={typeof founderExtra.quote === 'string' ? founderExtra.quote : DEFAULT_FOUNDER_QUOTE}
      imageUrl={cms('founder_story', 'image_url', '')}
      imageCaption={typeof founderExtra.image_caption === 'string' ? founderExtra.image_caption : DEFAULT_FOUNDER_CAPTION}
      primaryCta={cms('founder_story', 'button_text', 'Read the Full Story')}
      primaryHref={cms('founder_story', 'button_url', '/about')}
      compact
    />
  </div>
{/if}

{#if sectionOn('featured_destinations') && destinations.length}
  <section id="destinations" class="scroll-mt-20 bg-sand/40 py-16 md:py-24" use:sectionReveal>
    <div class="container-shell">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <SectionHeader eyebrow="Places" title={cms('featured_destinations', 'title', 'Explore Tanzania')} description={cms('featured_destinations', 'subtitle', 'See what makes each safari region different, then explore the parks, wildlife and best travel seasons in detail.')} />
        <a class="inline-flex items-center gap-1.5 text-sm font-semibold text-forest transition hover:text-heading" href="/destinations">
          See all Destinations <ArrowRight size={16} />
        </a>
      </div>
      <div class="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal>
        {#each destinations.slice(0, 6) as destination (destination.slug)}
          <DestinationFeatureCard {destination} />
        {/each}
      </div>
    </div>
  </section>
{/if}

<div id="recent-safaris" class="scroll-mt-20">
  <GallerySection
    images={gallery}
    {testimonials}
    eyebrow="Real Traveller Proof"
    title="From Our Recent Safaris"
    description="Real moments from Emnel journeys, labelled by the place and safari they belong to."
  />
</div>

{#if sectionOn('faq') && faqs.length}
  <JsonLd data={faqLd(faqs.map((f) => ({ q: f.question, a: f.answer })))} />
  <section id="faq" class="scroll-mt-20 bg-canvas py-16 md:py-24" use:sectionReveal>
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

{#if sections.final_cta?.is_active !== false}
  <FinalCtaSection
    eyebrow="Start Your Journey"
    title={cms('final_cta', 'title', 'Ready to plan your private Tanzania safari?')}
    subtitle={cms('final_cta', 'subtitle', 'Talk to a local expert in Arusha and travel with confidence — no payment needed to start planning.')}
    primaryLabel={cms('final_cta', 'button_text', 'Plan My Safari')}
    primaryHref={cms('final_cta', 'button_url', '/plan-my-trip')}
    secondaryLabel="Talk to a Safari Advisor"
    secondaryHref="/contact"
    imageUrl={ctaImageResolved}
    videoUrl={ctaVideo}
    imagePosition={ctaPosition}
    points={['Local experts', 'No payment to plan', 'Honest, tailored advice']}
    overlayColor={ctaOverlayColor}
    overlayOpacity={ctaOverlayOpacity}
    overlayGradient={ctaOverlayGradient}
  />
{/if}
