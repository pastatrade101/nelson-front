<script lang="ts">
  /**
   * Renders an ordered list of editorial content blocks.
   *
   * The block vocabulary and the components below are the ones the market
   * landing pages already use — this component exists so a second content type
   * (travel styles) can be equally rich without a second block system, a second
   * editor and a second set of bugs. Every field is optional, an empty block
   * renders nothing, and an unrecognised block type is skipped rather than
   * throwing, so an editor can never break a page by saving a block this build
   * does not know about.
   *
   * Presentational only: `tours` arrives already resolved, so the component
   * never fetches and can be dropped into any page.
   */
  import { fadeUpOnScroll } from '$lib/animations';
  import FAQAccordion from '$lib/components/public/FAQAccordion.svelte';
  import FinalCtaSection from '$lib/components/public/FinalCtaSection.svelte';
  import InclusionsGrid from '$lib/components/public/InclusionsGrid.svelte';
  import RichText from '$lib/components/public/RichText.svelte';
  import TourCard from '$lib/components/public/TourCard.svelte';
  import MarketImageGrid from '$lib/components/public/market/MarketImageGrid.svelte';
  import MarketNumberedGrid from '$lib/components/public/market/MarketNumberedGrid.svelte';
  import MarketRouteFlow from '$lib/components/public/market/MarketRouteFlow.svelte';
  import MarketSeasonStrip from '$lib/components/public/market/MarketSeasonStrip.svelte';
  import MarketSplitPanels from '$lib/components/public/market/MarketSplitPanels.svelte';
  import MarketSteps from '$lib/components/public/market/MarketSteps.svelte';
  import MarketTierCards from '$lib/components/public/market/MarketTierCards.svelte';
  import MarketTrustStrip from '$lib/components/public/market/MarketTrustStrip.svelte';
  import type { FAQ, Tour } from '$lib/types';

  type Block = Record<string, unknown>;

  export let blocks: Block[] = [];
  /** Resolved tours, for `tours` blocks. Kept canonical — cards link to /tours/[slug]. */
  export let tours: Tour[] = [];

  const str = (v: unknown): string => (typeof v === 'string' ? v : '');
  const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
  const nonEmpty = (v: unknown) => arr<string>(v).filter((s) => typeof s === 'string' && s.trim());

  const toFaqs = (items: unknown, index: number): FAQ[] =>
    arr<{ question?: string; answer?: string }>(items)
      .filter((i) => i?.question && i?.answer)
      .map((i, n) => ({ id: `faq-${index}-${n}`, question: i.question as string, answer: i.answer as string }));

  const labelItems = (items: unknown) =>
    arr<{ label?: string }>(items)
      .filter((i) => i?.label && String(i.label).trim())
      .map((i) => ({ label: String(i.label) }));

  /** Tours named by a block, in the order the editor chose, skipping any that vanished. */
  const blockTours = (ids: unknown): Tour[] =>
    arr<string>(ids)
      .map((id) => tours.find((t) => t.id === id))
      .filter((t): t is Tour => Boolean(t));

  // Alternating surfaces keep a long page from reading as one flat slab.
  const surface = (i: number) => (i % 2 === 0 ? 'bg-surface' : 'bg-canvas');
</script>

{#each blocks as block, i (i)}
  {#if block.type === 'trust'}
    {@const items = labelItems(block.items)}
    {#if items.length}
      <MarketTrustStrip {items} />
    {/if}

  {:else if block.type === 'prose'}
    {#if str(block.body)}
      <section class={`${surface(i)} py-14 md:py-20`}>
        <div class="container-shell" use:fadeUpOnScroll={{ y: 14 }}>
          <div class="max-w-3xl">
            {#if str(block.title)}
              <h2 class="font-serif text-[30px] font-light leading-[1.12] text-heading md:text-[40px]">{str(block.title)}</h2>
            {/if}
            <RichText value={str(block.body)} className="mt-5 text-[15px] leading-8 text-ink/72 md:text-base" />
          </div>
        </div>
      </section>
    {/if}

  {:else if block.type === 'numbered'}
    {@const items = arr<{ title?: string; body?: string }>(block.items)}
    {#if items.length}
      <MarketNumberedGrid
        eyebrow={str(block.eyebrow)}
        title={str(block.title)}
        {items}
        columns={typeof block.columns === 'number' ? block.columns : 3}
      />
    {/if}

  {:else if block.type === 'panels'}
    {@const panels = arr<{ title?: string; items?: string[]; image_url?: string }>(block.panels)}
    {#if panels.length}
      <section class={`${surface(i)} pt-14 md:pt-20`}>
        <div class="container-shell" use:fadeUpOnScroll={{ y: 14 }}>
          <div class="max-w-3xl">
            {#if str(block.eyebrow)}
              <p class="text-xs uppercase tracking-[0.22em] text-goldfinch-gold">{str(block.eyebrow)}</p>
            {/if}
            {#if str(block.title)}
              <h2 class="mt-3 font-serif text-[30px] font-light leading-[1.12] text-heading md:text-[40px]">{str(block.title)}</h2>
            {/if}
          </div>
        </div>
      </section>
      <MarketSplitPanels {panels} />
    {/if}

  {:else if block.type === 'tiers'}
    {@const tiers = arr<{ label?: string; title?: string; body?: string; image_url?: string }>(block.tiers)}
    {#if tiers.length}
      <MarketTierCards eyebrow={str(block.eyebrow)} title={str(block.title)} intro={str(block.intro)} {tiers} />
    {/if}

  {:else if block.type === 'imagegrid'}
    {@const images = arr<{ image_url?: string; caption?: string }>(block.images).filter((im) => im?.image_url)}
    {#if images.length}
      <MarketImageGrid eyebrow={str(block.eyebrow)} title={str(block.title)} {images} />
    {/if}

  {:else if block.type === 'steps'}
    {@const steps = arr<{ title?: string; body?: string }>(block.steps)}
    {#if steps.length}
      <MarketSteps
        eyebrow={str(block.eyebrow)}
        title={str(block.title)}
        {steps}
        ctaLabel={str(block.cta_label)}
        ctaHref={str(block.cta_href)}
      />
    {/if}

  {:else if block.type === 'season'}
    {@const seasons = arr<{ months?: string; label?: string; body?: string }>(block.seasons)}
    {#if seasons.length}
      <MarketSeasonStrip
        eyebrow={str(block.eyebrow)}
        title={str(block.title)}
        intro={str(block.intro)}
        {seasons}
        note={str(block.note)}
      />
    {/if}

  {:else if block.type === 'route'}
    {@const stops = nonEmpty(block.stops)}
    {#if stops.length}
      <MarketRouteFlow
        {stops}
        notes={arr<{ title?: string; body?: string }>(block.notes)}
        eyebrow={str(block.eyebrow)}
        title={str(block.title)}
        intro={str(block.intro)}
      />
    {/if}

  {:else if block.type === 'inclusions'}
    {@const included = nonEmpty(block.included)}
    {@const excluded = nonEmpty(block.excluded)}
    {#if included.length || excluded.length}
      <section class={`${surface(i)} py-14 md:py-20`}>
        <div class="container-shell" use:fadeUpOnScroll={{ y: 14 }}>
          {#if str(block.title)}
            <h2 class="max-w-3xl font-serif text-[30px] font-light leading-[1.12] text-heading md:text-[40px]">{str(block.title)}</h2>
          {/if}
          <InclusionsGrid {included} {excluded} />
        </div>
      </section>
    {/if}

  {:else if block.type === 'tours'}
    <!-- Recommends existing itineraries; it never restates one. Cards link to the
         canonical /tours/[slug], which stays the single product page. -->
    {@const picked = blockTours(block.tour_ids)}
    {#if picked.length}
      <section class={`${surface(i)} py-14 md:py-20`}>
        <div class="container-shell" use:fadeUpOnScroll={{ y: 14 }}>
          <div class="max-w-3xl">
            {#if str(block.eyebrow)}
              <p class="text-xs uppercase tracking-[0.22em] text-goldfinch-gold">{str(block.eyebrow)}</p>
            {/if}
            {#if str(block.title)}
              <h2 class="mt-3 font-serif text-[30px] font-light leading-[1.12] text-heading md:text-[40px]">{str(block.title)}</h2>
            {/if}
            {#if str(block.intro)}
              <p class="mt-4 text-[15px] leading-8 text-ink/72">{str(block.intro)}</p>
            {/if}
          </div>
          <div class="mt-10 grid gap-6 md:grid-cols-3">
            {#each picked as tour (tour.id)}
              <TourCard {tour} />
            {/each}
          </div>
        </div>
      </section>
    {/if}

  {:else if block.type === 'faq'}
    {@const faqs = toFaqs(block.items, i)}
    {#if faqs.length}
      <section class="bg-sand/40 py-14 md:py-20">
        <div class="container-shell" use:fadeUpOnScroll={{ y: 14 }}>
          <div class="max-w-3xl">
            {#if str(block.title)}
              <h2 class="mb-8 font-serif text-[30px] font-light leading-[1.12] text-heading md:text-[40px]">{str(block.title)}</h2>
            {/if}
            <FAQAccordion {faqs} />
          </div>
        </div>
      </section>
    {/if}

  {:else if block.type === 'cta'}
    {#if str(block.title) || (str(block.label) && str(block.href))}
      <FinalCtaSection
        title={str(block.title)}
        subtitle={str(block.subtitle)}
        primaryLabel={str(block.label)}
        primaryHref={str(block.href)}
        points={nonEmpty(block.points)}
      />
    {/if}
  {/if}
{/each}
