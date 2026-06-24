<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowRight, Check, MessageCircle } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import BlogCard from '$lib/components/public/BlogCard.svelte';
  import DestinationCard from '$lib/components/public/DestinationCard.svelte';
  import FAQAccordion from '$lib/components/public/FAQAccordion.svelte';
  import JsonLd from '$lib/components/public/JsonLd.svelte';
  import { faqLd } from '$lib/seo';
  import FeaturedTripsShowcase from '$lib/components/public/FeaturedTripsShowcase.svelte';
  import PopularDestinationsPromo from '$lib/components/public/PopularDestinationsPromo.svelte';
  import StatsCounter from '$lib/components/public/StatsCounter.svelte';
  import HeroSection from '$lib/components/public/HeroSection.svelte';
  import PartnerStrip from '$lib/components/public/PartnerStrip.svelte';
  import TrustStrip from '$lib/components/public/TrustStrip.svelte';
  import PlanningProcess from '$lib/components/public/PlanningProcess.svelte';
  import PopularActivitiesSlider from '$lib/components/public/PopularActivitiesSlider.svelte';
  import SectionHeader from '$lib/components/public/SectionHeader.svelte';
  import TestimonialCard from '$lib/components/public/TestimonialCard.svelte';
  import PriceRangeBlock from '$lib/components/public/PriceRangeBlock.svelte';
  import DealCard from '$lib/components/public/DealCard.svelte';
  import TripFinderBand from '$lib/components/public/TripFinderBand.svelte';
  import { fadeUpOnScroll, sectionReveal, staggeredCardReveal } from '$lib/animations';
  import { placeholderDestinations, placeholderFaqs, placeholderPosts, placeholderTestimonials, placeholderTours } from '$lib/data/placeholders';
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

  let tours: Tour[] = placeholderTours;
  let destinations: Destination[] = placeholderDestinations;
  let posts: BlogPost[] = placeholderPosts;
  let testimonials: Testimonial[] = placeholderTestimonials;
  let faqs: FAQ[] = placeholderFaqs;
  let sections: Record<string, HomeSection> = {};

  // CMS lookup with a safe fallback so the existing design never breaks.
  const cms = (key: string, field: keyof HomeSection, fallback: string) => {
    const value = sections[key]?.[field];
    return typeof value === 'string' && value.trim() ? value : fallback;
  };

  $: heroExtra = (sections.hero?.extra_data ?? {}) as Record<string, unknown>;

  const hexToRgba = (hex: string, alpha: number) => {
    const match = /^#?([0-9a-fA-F]{6})$/.exec(hex);
    if (!match) return `rgba(15,47,36,${alpha})`;
    const n = parseInt(match[1], 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
  };

  // Final CTA background (image/video + overlay), all editable from Admin → Homepage.
  $: ctaExtra = (sections.final_cta?.extra_data ?? {}) as Record<string, unknown>;
  $: ctaImage = typeof sections.final_cta?.image_url === 'string' ? sections.final_cta.image_url : '';
  $: ctaVideo = typeof ctaExtra.background_video === 'string' ? ctaExtra.background_video : '';
  $: ctaPosition = typeof ctaExtra.media_position === 'string' ? ctaExtra.media_position : 'center';
  $: ctaHasMedia = Boolean(ctaImage || ctaVideo);
  $: ctaOverlayColor = typeof ctaExtra.overlay_color === 'string' ? ctaExtra.overlay_color : '#0F2F24';
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
    try {
      const [tourResponse, destinationResponse, postResponse, testimonialResponse, faqResponse, homepageResponse] = await Promise.all([
        api.tours.list({ limit: 3 }),
        api.destinations.list({ limit: 3 }),
        api.blog.list({ limit: 3 }),
        api.testimonials.list({ limit: 6 }),
        api.faqs.list({ limit: 5 }),
        api.homepage.get()
      ]);

      tours = tourResponse.data.items.length ? tourResponse.data.items : placeholderTours;
      destinations = destinationResponse.data.items.length ? destinationResponse.data.items : placeholderDestinations;
      posts = postResponse.data.items.length ? postResponse.data.items : placeholderPosts;
      testimonials = testimonialResponse.data.items.length ? testimonialResponse.data.items : placeholderTestimonials;
      faqs = faqResponse.data.items.length ? faqResponse.data.items : placeholderFaqs;

      const sectionList = (homepageResponse.data ?? []) as unknown as HomeSection[];
      sections = Object.fromEntries(sectionList.map((section) => [section.section_key, section]));
    } catch {
      tours = placeholderTours;
      destinations = placeholderDestinations;
      posts = placeholderPosts;
      testimonials = placeholderTestimonials;
      faqs = placeholderFaqs;
      sections = {};
    }
  });
</script>

<HeroSection
  title={cms('hero', 'title', 'Plan East Africa With Confidence')}
  description={cms('hero', 'subtitle', 'Honest safari, Kilimanjaro, gorilla trekking and beach advice from local experts.')}
  imageUrl={cms('hero', 'image_url', '/images/surf-hero.jpg')}
  primaryCta={cms('hero', 'button_text', 'Plan My Trip')}
  secondaryCta={typeof heroExtra.secondary_cta_text === 'string' ? heroExtra.secondary_cta_text : 'Talk to a Travel Advisor'}
  secondaryCtaUrl={typeof heroExtra.secondary_cta_url === 'string' ? heroExtra.secondary_cta_url : '/contact'}
/>

<TrustStrip />

<!-- Trip Finder entry (spec §4.1 B) -->
<TripFinderBand />

<PopularActivitiesSlider />

<FeaturedTripsShowcase />

<PopularDestinationsPromo />

<StatsCounter />

<section class="relative overflow-hidden bg-gradient-to-b from-sand/55 via-surface to-surface py-14 md:py-20" use:sectionReveal>
  <span class="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-goldfinch-gold/10 blur-3xl" aria-hidden="true"></span>
  <div class="container-shell relative">
    <div class="mx-auto max-w-2xl text-center" use:fadeUpOnScroll={{ y: 14 }}>
      <p class="font-serif text-xl italic text-clay">Limited Time Offers</p>
      <h2 class="mt-4 text-3xl font-extrabold tracking-tight text-heading md:text-[40px]">
        {cms('featured_tours', 'title', 'Exclusive Safari Deals & Travel Offers')}
      </h2>
      <p class="mt-3 text-[15px] font-medium leading-7 text-ink/70 md:text-lg">
        {cms('featured_tours', 'subtitle', 'Handpicked Tanzania safari, Kilimanjaro and Zanzibar experiences at our best seasonal prices — limited spots, big value.')}
      </p>
    </div>
    <div class="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal>
      {#each tours as tour, i}
        <DealCard {tour} index={i} />
      {/each}
    </div>
  </div>
</section>

<!-- typical cost band (spec §4.1 F / §6) -->
<section class="bg-sand/40 py-14 md:py-20" use:sectionReveal>
  <div class="container-shell">
    <PriceRangeBlock
      title={cms('cost_ranges', 'title', 'What trips typically cost')}
      subtitle={cms('cost_ranges', 'subtitle', 'A confident brand is upfront about price — here are honest starting points by trip type.')}
      ranges={costRanges}
    />
  </div>
</section>

<section class="bg-surface py-14" use:sectionReveal>
  <div class="container-shell">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <SectionHeader eyebrow="Places" title={cms('featured_destinations', 'title', 'Destinations')} description={cms('featured_destinations', 'subtitle', 'Destination content can be managed from the CMS.')} />
      <a class="inline-flex items-center gap-1.5 text-sm font-semibold text-forest transition hover:text-heading" href="/destinations">
        See all Destinations <ArrowRight size={16} />
      </a>
    </div>
    <div class="mt-8 grid gap-6 md:grid-cols-3" use:staggeredCardReveal>
      {#each destinations as destination}
        <DestinationCard {destination} />
      {/each}
    </div>
  </div>
</section>

<section class="container-shell py-14" use:sectionReveal>
  <div class="flex flex-wrap items-end justify-between gap-4">
    <SectionHeader eyebrow="Stories" title={cms('blog_preview', 'title', 'Latest Blog Posts')} description={cms('blog_preview', 'subtitle', 'Blog posts are pulled from the backend when available.')} />
    <a class="inline-flex items-center gap-1.5 text-sm font-semibold text-forest transition hover:text-heading" href="/blog">
      View all <ArrowRight size={16} />
    </a>
  </div>
  <div class="mt-8 grid gap-6 md:grid-cols-3" use:staggeredCardReveal>
    {#each posts as post}
      <BlogCard {post} />
    {/each}
  </div>
</section>

<section class="bg-surface py-14 md:py-20" use:sectionReveal>
  <div class="container-shell">
    <div class="mx-auto max-w-2xl text-center" use:fadeUpOnScroll={{ y: 14 }}>
      <h2 class="text-3xl font-extrabold tracking-normal text-heading md:text-[40px]">
        {cms('testimonials', 'title', 'What Our Travelers Say')}
      </h2>
      <p class="mx-auto mt-3 max-w-xl text-[15px] font-medium leading-7 text-ink/70 md:text-lg">
        {cms('testimonials', 'subtitle', 'Real stories from travelers who planned their East Africa trip with confidence.')}
      </p>
    </div>
    <div class="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 18, stagger: 0.07 }}>
      {#each testimonials as testimonial}
        <TestimonialCard {testimonial} />
      {/each}
    </div>
  </div>
</section>

{#if faqs.length}
  <JsonLd data={faqLd(faqs.map((f) => ({ q: f.question, a: f.answer })))} />
{/if}
<section class="bg-sand/40 py-14 md:py-16" use:sectionReveal>
  <div class="container-shell grid gap-8 md:grid-cols-[0.7fr_1.3fr]">
    <SectionHeader eyebrow="Good to Know" title="Frequently Asked Questions" description="Honest answers to the questions East Africa travelers ask most." />
    <FAQAccordion {faqs} />
  </div>
</section>

<section class="bg-surface py-14 md:py-20" use:sectionReveal>
  <div class="container-shell">
    <PlanningProcess
      title={cms('how_it_works', 'title', 'How planning works')}
      subtitle={cms('how_it_works', 'subtitle', 'A calm, transparent process — no pressure, and no payment to start.')}
    />
    <div class="mt-10 flex justify-center">
      <a
        class="inline-flex h-12 items-center gap-2 rounded-xl bg-deep-green px-7 font-bold text-white shadow-sm transition hover:bg-forest"
        href="/plan-my-trip"
      >
        Start planning <ArrowRight size={18} />
      </a>
    </div>
  </div>
</section>

{#if sections.final_cta?.is_active !== false && (sections.final_cta?.title || sections.final_cta?.button_text)}
  <section class="relative w-full overflow-hidden text-white" use:sectionReveal>
    <!-- background media layer (admin-configurable: video > image > brand gradient) -->
    {#if ctaVideo}
      <!-- svelte-ignore a11y-media-has-caption -->
      <video class="absolute inset-0 h-full w-full object-cover" style={`object-position:${ctaPosition}`} src={ctaVideo} poster={ctaImage || undefined} autoplay muted loop playsinline></video>
    {:else if ctaImage}
      <img class="absolute inset-0 h-full w-full object-cover" style={`object-position:${ctaPosition}`} src={ctaImage} alt="" />
    {:else}
      <div class="absolute inset-0 bg-gradient-to-br from-deep-green via-forest to-deep-green"></div>
    {/if}

    <!-- overlay (color + opacity + optional gradient) only over real media -->
    {#if ctaHasMedia}
      <div class="absolute inset-0" style={ctaOverlayStyle}></div>
    {/if}

    <!-- decorative depth -->
    <div class="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-goldfinch-gold/20 blur-3xl"></div>
    <div class="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-savanna/15 blur-3xl"></div>
    <div
      class="pointer-events-none absolute inset-0 opacity-[0.06]"
      style="background-image: radial-gradient(circle, #ffffff 1px, transparent 1.6px); background-size: 26px 26px;"
    ></div>

    <div class="container-shell relative py-16 text-center md:py-24" use:fadeUpOnScroll={{ y: 18 }}>
      <div class="mx-auto max-w-3xl">
        <p class="font-serif text-xl italic text-savanna">Start Your Journey</p>

        <h2 class="mt-5 text-3xl font-extrabold leading-[1.1] tracking-normal md:text-[44px]">
          {cms('final_cta', 'title', 'Ready to Plan Your East Africa Adventure?')}
        </h2>

        <p class="mx-auto mt-4 max-w-xl text-[15px] font-medium leading-7 text-white/75 md:text-lg">
          {cms('final_cta', 'subtitle', 'Talk to a local expert and travel with confidence — no payment needed to start planning.')}
        </p>

        <div class="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            class="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-goldfinch-gold px-7 text-sm font-bold text-heading shadow-lg shadow-goldfinch-gold/20 transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-deep-green sm:w-auto md:h-[52px] md:text-base"
            href={cms('final_cta', 'button_url', '/plan-my-trip')}
          >
            {cms('final_cta', 'button_text', 'Plan My Trip')}
            <ArrowRight size={18} strokeWidth={2.6} class="transition-transform group-hover:translate-x-0.5" />
          </a>
          <a
            class="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/25 bg-surface/5 px-7 text-sm font-bold text-white backdrop-blur transition hover:bg-surface/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 sm:w-auto md:h-[52px] md:text-base"
            href="/contact"
          >
            <MessageCircle size={17} strokeWidth={2.4} />
            Talk to a Travel Advisor
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
