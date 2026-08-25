<script lang="ts">
  // ───────────────────────────────────────────────────────────────────────────
  // ONE public route for every Google Ads market landing page.
  //
  // The page is a TEMPLATE: the hero comes from the `hero_*` columns and the body
  // is an ORDERED array of blocks in the `sections` jsonb, each rendered by a
  // component switch below. Marketing creates a new market in the admin and it
  // goes live with no code deploy — so this file must stay tolerant: every field
  // is optional, an empty block renders nothing, and an UNKNOWN block type is
  // skipped rather than thrown (a newer admin must never break a live page).
  //
  // Nothing here invents content: no prices, reviews or statistics are generated
  // — tours and testimonials are the real records loaded in +page.ts.
  // ───────────────────────────────────────────────────────────────────────────
  import { ArrowRight, MessageCircle, ShieldCheck } from '@lucide/svelte';
  import { page } from '$app/stores';
  import { fadeUpOnScroll, staggeredCardReveal } from '$lib/animations';
  import BookingForm from '$lib/components/public/BookingForm.svelte';
  import ComparisonTable from '$lib/components/public/ComparisonTable.svelte';
  import FAQAccordion from '$lib/components/public/FAQAccordion.svelte';
  import FinalCtaSection from '$lib/components/public/FinalCtaSection.svelte';
  import GuestReviewsSection from '$lib/components/public/GuestReviewsSection.svelte';
  import InclusionsGrid from '$lib/components/public/InclusionsGrid.svelte';
  import JsonLd from '$lib/components/public/JsonLd.svelte';
  import ResponsiveImage from '$lib/components/public/ResponsiveImage.svelte';
  import RichText from '$lib/components/public/RichText.svelte';
  import TourCardRich from '$lib/components/public/TourCardRich.svelte';
  import WhatsAppCta from '$lib/components/public/WhatsAppCta.svelte';
  import { SITE_URL } from '$lib/config/env';
  import { imgUrl, origUrl, thumbUrl } from '$lib/img';
  import { breadcrumbLd, faqLd } from '$lib/seo';
  import type { FAQ, Tour } from '$lib/types';
  import type { PageData } from './$types';

  export let data: PageData;

  // `mp` (not `page`) — `$page` is the SvelteKit store, imported above.
  $: mp = data.page;
  $: sections = mp.sections ?? [];
  $: tours = data.tours ?? [];
  $: testimonials = data.testimonials ?? [];

  // Tours arrive resolved from the loader; index them so a `packages` block can
  // map its tour_ids in order and silently drop ids that no longer resolve.
  $: tourById = new Map<string, Tour>(tours.map((tour): [string, Tour] => [tour.id, tour]));
  $: resolveTours = (ids: string[] | undefined): Tour[] =>
    (ids ?? []).map((id) => tourById.get(id)).filter((tour): tour is Tour => Boolean(tour));

  // ── Campaign attribution ───────────────────────────────────────────────────
  // Google Ads appends these to the landing URL. They are read here and kept in
  // one reactive object so the page can carry them onward (internal CTAs below);
  // wiring them into the enquiry payload is a separate follow-up.
  const CAMPAIGN_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid'] as const;
  type CampaignParam = (typeof CAMPAIGN_PARAMS)[number];

  $: campaign = CAMPAIGN_PARAMS.reduce<Partial<Record<CampaignParam, string>>>((acc, key) => {
    const value = $page.url.searchParams.get(key);
    if (value) acc[key] = value;
    return acc;
  }, {});
  $: campaignQuery = new URLSearchParams(campaign as Record<string, string>).toString();

  // Carry attribution across INTERNAL links only (never rewrite an external or
  // in-page href, and keep any existing query/hash intact).
  const withCampaign = (href: string, query: string): string => {
    if (!href || !query || !href.startsWith('/')) return href;
    const [path, hash] = href.split('#');
    const separator = path.includes('?') ? '&' : '?';
    return `${path}${separator}${query}${hash ? `#${hash}` : ''}`;
  };

  // ── Hero ───────────────────────────────────────────────────────────────────
  $: heroTitle = mp.hero_title || mp.name;
  $: heroImage = origUrl(mp, 'hero_image_url', 'og_image_url');
  $: heroThumb = thumbUrl(mp, 'hero_image_url', 'og_image_url');
  $: hasHeroCta = Boolean(mp.hero_cta_label && mp.hero_cta_href);
  $: heroCtaLabel = hasHeroCta ? (mp.hero_cta_label as string) : 'Plan my safari';
  $: heroCtaHref = withCampaign(hasHeroCta ? (mp.hero_cta_href as string) : '#enquiry', campaignQuery);
  $: whatsappMessage = `Hi Emnel, I'm interested in ${heroTitle}. Could you send me some options?`;

  // ── SEO ────────────────────────────────────────────────────────────────────
  $: origin = SITE_URL || $page.url.origin;
  // Canonical is deliberately the CLEAN url — ad traffic arrives with utm/gclid
  // query strings that must never become the indexed address.
  $: canonical = `${origin}/safaris/${mp.slug}`;
  $: metaTitle = mp.meta_title || heroTitle;
  $: metaDescription = mp.meta_description || mp.hero_subtitle || '';
  $: ogSource = mp.og_image_url || mp.hero_image_url || '';
  $: ogImage = ogSource ? imgUrl(ogSource, 1200) : '';

  // Every FAQ answer on the page, for FAQPage structured data.
  $: faqEntries = sections
    .flatMap((block) => (block.type === 'faq' ? (block.items ?? []) : []))
    .filter((item) => item.question && item.answer)
    .map((item) => ({ q: item.question as string, a: item.answer as string }));

  // FAQAccordion keys its open state by id; the blocks store plain Q/A pairs, so
  // synthesise a stable id per block + position.
  const toFaqs = (items: Array<{ question?: string; answer?: string }> | undefined, blockIndex: number): FAQ[] =>
    (items ?? [])
      .filter((item) => item.question && item.answer)
      .map((item, i) => ({ id: `faq-${blockIndex}-${i}`, question: item.question as string, answer: item.answer as string }));

  const cleanRows = (rows: Array<{ label?: string; cells?: string[] }> | undefined) =>
    (rows ?? []).map((row) => ({ label: row.label ?? '', cells: row.cells ?? [] }));

  const nonEmpty = (values: string[] | undefined) => (values ?? []).filter((value) => value && value.trim());
</script>

<svelte:head>
  <title>{metaTitle}</title>
  {#if metaDescription}<meta name="description" content={metaDescription} />{/if}
  <link rel="canonical" href={canonical} />
  <!-- The database defaults noindex to TRUE: a market page stays out of the
       index (while still passing link equity) until marketing opts it in. -->
  {#if mp.noindex}<meta name="robots" content="noindex,follow" />{/if}
  <meta property="og:type" content="website" />
  <meta property="og:title" content={metaTitle} />
  {#if metaDescription}<meta property="og:description" content={metaDescription} />{/if}
  <meta property="og:url" content={canonical} />
  {#if ogImage}<meta property="og:image" content={ogImage} />{/if}
</svelte:head>

<JsonLd
  data={breadcrumbLd(origin, [
    { name: 'Home', path: '/' },
    { name: heroTitle, path: `/safaris/${mp.slug}` }
  ])}
/>
{#if faqEntries.length}
  <JsonLd data={faqLd(faqEntries)} />
{/if}

<!-- ── Hero ──────────────────────────────────────────────────────────────── -->
<section class="relative isolate overflow-hidden bg-deep-green text-white">
  {#if heroImage}
    <ResponsiveImage
      src={heroImage}
      fallbackSrc={heroThumb}
      alt={heroTitle}
      width={1920}
      sizes="100vw"
      imgClass="absolute inset-0 h-full w-full object-cover"
      eager
      priority
    />
    <div class="absolute inset-0 bg-[linear-gradient(90deg,rgba(20,18,15,0.84)_0%,rgba(20,18,15,0.5)_50%,rgba(20,18,15,0.18)_100%)]"></div>
    <div class="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,18,15,0.3)_0%,transparent_34%,transparent_56%,rgba(20,18,15,0.7)_100%)]"></div>
  {:else}
    <div class="absolute inset-0 bg-[linear-gradient(140deg,#153733,rgba(74,55,40,0.95))]"></div>
  {/if}

  <div class="container-shell relative flex min-h-[62vh] flex-col justify-end pb-14 pt-28 [text-shadow:0_2px_18px_rgba(0,0,0,0.5)] md:min-h-[72vh] md:pb-20">
    <div class="max-w-4xl">
      {#if mp.hero_eyebrow}
        <p class="brand-eyebrow text-goldfinch-gold">{mp.hero_eyebrow}</p>
      {/if}
      <h1 class="mt-4 max-w-[820px] font-serif text-[36px] font-light leading-[1.05] tracking-normal text-white sm:text-[46px] lg:text-[58px]">
        {heroTitle}
      </h1>
      {#if mp.hero_subtitle}
        <p class="mt-5 max-w-[620px] text-[15px] font-medium leading-8 text-white/75 md:text-base">{mp.hero_subtitle}</p>
      {/if}

      <div class="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
        <a
          class="inline-flex h-[52px] items-center justify-center gap-3 bg-goldfinch-gold px-8 text-[12px] font-bold uppercase tracking-[0.18em] text-deep-green transition hover:bg-savanna"
          href={heroCtaHref}
        >
          {heroCtaLabel}
          <ArrowRight size={16} strokeWidth={2.5} />
        </a>
        <WhatsAppCta
          variant="ghost"
          className="inline-flex h-[52px] items-center justify-center gap-3 border border-white/25 px-8 text-[12px] font-bold uppercase tracking-[0.18em] text-white transition hover:border-goldfinch-gold hover:text-goldfinch-gold"
          context="market_landing_hero"
          message={whatsappMessage}
        >
          <MessageCircle size={16} strokeWidth={2.4} /> WhatsApp
        </WhatsAppCta>
      </div>
    </div>
  </div>
</section>

<!-- ── Body blocks, in the exact order the admin saved them ─────────────────
     A type this build does not know falls through every branch below and simply
     renders nothing — an older frontend never errors on a newer block. -->
{#each sections as block, blockIndex}
  {#if block.type === 'relevance'}
    {@const items = (block.items ?? []).filter((item) => item.label || item.value)}
    {#if block.title || block.intro || items.length}
      <section class="bg-surface py-14 md:py-20">
        <div class="container-shell" use:fadeUpOnScroll={{ y: 14 }}>
          {#if block.title}
            <h2 class="max-w-3xl font-serif text-[30px] font-light leading-[1.12] text-heading md:text-[40px]">{block.title}</h2>
          {/if}
          {#if block.intro}
            <p class="mt-4 max-w-3xl text-[15px] font-medium leading-8 text-ink/70 md:text-base">{block.intro}</p>
          {/if}
          {#if items.length}
            <dl class="mt-10 grid gap-px border border-ink/10 bg-ink/10 sm:grid-cols-2 lg:grid-cols-3">
              {#each items as item}
                <div class="bg-surface p-6">
                  {#if item.label}
                    <dt class="text-[11px] font-bold uppercase tracking-[0.16em] text-clay">{item.label}</dt>
                  {/if}
                  {#if item.value}
                    <dd class="mt-2 text-[15px] leading-7 text-heading">{item.value}</dd>
                  {/if}
                </div>
              {/each}
            </dl>
          {/if}
        </div>
      </section>
    {/if}

  {:else if block.type === 'benefits'}
    {@const items = (block.items ?? []).filter((item) => item.title || item.body)}
    {#if block.title || items.length}
      <section class="bg-sand/40 py-14 md:py-20">
        <div class="container-shell">
          {#if block.title}
            <h2 class="max-w-3xl font-serif text-[30px] font-light leading-[1.12] text-heading md:text-[40px]" use:fadeUpOnScroll={{ y: 14 }}>
              {block.title}
            </h2>
          {/if}
          {#if items.length}
            <div class="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 16, stagger: 0.06 }}>
              {#each items as item}
                <article class="border border-ink/10 bg-surface p-6">
                  {#if item.title}
                    <h3 class="font-serif text-[20px] font-light text-heading">{item.title}</h3>
                  {/if}
                  {#if item.body}
                    <p class="mt-3 text-[14.5px] leading-7 text-ink/70">{item.body}</p>
                  {/if}
                </article>
              {/each}
            </div>
          {/if}
        </div>
      </section>
    {/if}

  {:else if block.type === 'packages'}
    {@const blockTours = resolveTours(block.tour_ids)}
    <!-- No resolved tours → the whole block disappears. Never a placeholder card. -->
    {#if blockTours.length}
      <section class="bg-canvas py-14 md:py-20">
        <div class="container-shell">
          <div use:fadeUpOnScroll={{ y: 14 }}>
            {#if block.title}
              <h2 class="max-w-3xl font-serif text-[30px] font-light leading-[1.12] text-heading md:text-[40px]">{block.title}</h2>
            {/if}
            {#if block.intro}
              <p class="mt-4 max-w-3xl text-[15px] font-medium leading-8 text-ink/70 md:text-base">{block.intro}</p>
            {/if}
          </div>
          <div class="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 18, stagger: 0.07 }}>
            {#each blockTours as tour (tour.id)}
              <TourCardRich {tour} />
            {/each}
          </div>
        </div>
      </section>
    {/if}

  {:else if block.type === 'comparison'}
    {@const rows = cleanRows(block.rows)}
    {#if rows.length && (block.columns ?? []).length}
      <section class="bg-surface py-14 md:py-20">
        <div class="container-shell" use:fadeUpOnScroll={{ y: 14 }}>
          {#if block.title}
            <h2 class="mb-8 max-w-3xl font-serif text-[30px] font-light leading-[1.12] text-heading md:text-[40px]">{block.title}</h2>
          {/if}
          <ComparisonTable columns={block.columns ?? []} {rows} />
        </div>
      </section>
    {/if}

  {:else if block.type === 'inclusions'}
    {@const included = nonEmpty(block.included)}
    {@const excluded = nonEmpty(block.excluded)}
    {#if included.length || excluded.length}
      <section class="bg-canvas py-14 md:py-20">
        <div class="container-shell" use:fadeUpOnScroll={{ y: 14 }}>
          {#if block.title}
            <h2 class="max-w-3xl font-serif text-[30px] font-light leading-[1.12] text-heading md:text-[40px]">{block.title}</h2>
          {/if}
          <InclusionsGrid {included} {excluded} />
        </div>
      </section>
    {/if}

  {:else if block.type === 'prose'}
    {#if block.body}
      <section class="bg-surface py-14 md:py-20">
        <div class="container-shell" use:fadeUpOnScroll={{ y: 14 }}>
          <div class="max-w-3xl">
            {#if block.title}
              <h2 class="font-serif text-[30px] font-light leading-[1.12] text-heading md:text-[40px]">{block.title}</h2>
            {/if}
            <RichText value={block.body} className="mt-5 text-[15px] leading-8 text-ink/72 md:text-base" />
          </div>
        </div>
      </section>
    {/if}

  {:else if block.type === 'faq'}
    {@const faqs = toFaqs(block.items, blockIndex)}
    {#if faqs.length}
      <section class="bg-sand/40 py-14 md:py-20">
        <div class="container-shell" use:fadeUpOnScroll={{ y: 14 }}>
          <div class="max-w-3xl">
            {#if block.title}
              <h2 class="mb-8 font-serif text-[30px] font-light leading-[1.12] text-heading md:text-[40px]">{block.title}</h2>
            {/if}
            <FAQAccordion {faqs} />
          </div>
        </div>
      </section>
    {/if}

  {:else if block.type === 'reviews'}
    <!-- Real, published testimonials only — the section hides itself when empty. -->
    {#if block.title}
      <GuestReviewsSection {testimonials} title={block.title} accentTitle="" />
    {:else}
      <GuestReviewsSection {testimonials} />
    {/if}

  {:else if block.type === 'cta'}
    {#if block.title || (block.label && block.href)}
      <FinalCtaSection
        title={block.title ?? ''}
        subtitle={block.subtitle ?? ''}
        primaryLabel={block.label ?? ''}
        primaryHref={withCampaign(block.href ?? '', campaignQuery)}
        points={nonEmpty(block.points)}
      />
    {/if}
  {/if}
{/each}

<!-- ── Enquiry ───────────────────────────────────────────────────────────── -->
<section id="enquiry" class="scroll-mt-20 bg-canvas py-14 md:py-20">
  <div class="container-shell grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
    <div use:fadeUpOnScroll={{ y: 14 }}>
      <p class="brand-eyebrow">Start planning</p>
      <h2 class="mt-4 font-serif text-[30px] font-light leading-[1.12] text-heading md:text-[40px]">
        Request your tailor-made quote
      </h2>
      <p class="mt-4 max-w-md text-[15px] font-medium leading-8 text-ink/70">
        Tell us how you like to travel and a Tanzania specialist replies with a plan built around your dates. No payment is
        needed to start planning.
      </p>
      <p class="mt-6 inline-flex items-center gap-2 text-[13px] font-semibold text-forest">
        <ShieldCheck size={16} strokeWidth={2.2} /> Local experts in Arusha — you deal with the operator, not a reseller.
      </p>
      <div class="mt-8 max-w-xs">
        <WhatsAppCta
          variant="outline"
          className="w-full rounded-none"
          context="market_landing_enquiry"
          label="Chat on WhatsApp"
          message={whatsappMessage}
        />
      </div>
    </div>

    <div class="border border-ink/10 bg-surface p-5 md:p-7">
      <BookingForm tour={null} />
    </div>
  </div>
</section>
