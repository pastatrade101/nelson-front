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
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { fadeUpOnScroll, staggeredCardReveal } from '$lib/animations';
  import BookingForm from '$lib/components/public/BookingForm.svelte';
  import ComparisonTable from '$lib/components/public/ComparisonTable.svelte';
  import FAQAccordion from '$lib/components/public/FAQAccordion.svelte';
  import FinalCtaSection from '$lib/components/public/FinalCtaSection.svelte';
  import GuestReviewsSection from '$lib/components/public/GuestReviewsSection.svelte';
  import InclusionsGrid from '$lib/components/public/InclusionsGrid.svelte';
  import JsonLd from '$lib/components/public/JsonLd.svelte';
  import MarketTourCard from '$lib/components/public/MarketTourCard.svelte';
  import MarketImageGrid from '$lib/components/public/market/MarketImageGrid.svelte';
  import MarketNumberedGrid from '$lib/components/public/market/MarketNumberedGrid.svelte';
  import MarketRouteFlow from '$lib/components/public/market/MarketRouteFlow.svelte';
  import MarketSeasonStrip from '$lib/components/public/market/MarketSeasonStrip.svelte';
  import MarketSplitPanels from '$lib/components/public/market/MarketSplitPanels.svelte';
  import MarketSteps from '$lib/components/public/market/MarketSteps.svelte';
  import MarketTierCards from '$lib/components/public/market/MarketTierCards.svelte';
  import MarketTrustStrip from '$lib/components/public/market/MarketTrustStrip.svelte';
  import ResponsiveImage from '$lib/components/public/ResponsiveImage.svelte';
  import RichText from '$lib/components/public/RichText.svelte';
  import WhatsAppCta from '$lib/components/public/WhatsAppCta.svelte';
  import { SITE_URL } from '$lib/config/env';
  import { currency, formatUsd } from '$lib/currency';
  import type { CurrencyStoreState } from '$lib/currency';
  import { imgUrl, origUrl, thumbUrl } from '$lib/img';
  import { breadcrumbLd, faqLd } from '$lib/seo';
  import { tierLabel } from '$lib/tiers';
  import type { FAQ, MarketPackageOverride, MarketPageBlock, Tour } from '$lib/types';
  import type { PageData } from './$types';

  export let data: PageData;

  // `mp` (not `page`) — `$page` is the SvelteKit store, imported above.
  $: mp = data.page;
  $: sections = mp.sections ?? [];
  $: tours = data.tours ?? [];
  $: testimonials = data.testimonials ?? [];

  // ── Tours referenced by blocks ─────────────────────────────────────────────
  // The loader resolves the tours a `packages` block (and the page shortlist)
  // names, server-side, so ad traffic gets finished cards in the first response.
  // `extraTours` only ever holds ids the loader did not pre-fetch — e.g. a
  // `comparison` block pointing at its own tours — topped up from the same
  // public endpoint. Everything here is a real published record; an id that
  // does not resolve is dropped and its card/column simply never appears.
  let extraTours: Record<string, Tour> = {};
  const requestedIds = new Set<string>();
  const MAX_EXTRA_TOURS = 24;

  /** The tours a block points at, falling back to the page-level shortlist. */
  const blockTourIds = (block: MarketPageBlock, fallback: string[]): string[] => {
    if (block.type !== 'packages' && block.type !== 'comparison') return [];
    const ids = (block.tour_ids ?? []).filter((id) => typeof id === 'string' && id.trim());
    return ids.length ? ids : fallback;
  };

  $: tourById = new Map<string, Tour>(
    [...tours, ...Object.values(extraTours)].map((tour): [string, Tour] => [tour.id, tour])
  );
  $: resolveTours = (ids: string[] | undefined): Tour[] =>
    (ids ?? []).map((id) => tourById.get(id)).filter((tour): tour is Tour => Boolean(tour));

  const topUpTours = async (ids: string[]) => {
    const todo = ids.filter((id) => !requestedIds.has(id)).slice(0, MAX_EXTRA_TOURS);
    if (!todo.length) return;
    // Marked as requested BEFORE awaiting, so a failed id is never re-fetched in
    // a reactive loop.
    todo.forEach((id) => requestedIds.add(id));
    const loaded: Record<string, Tour> = {};
    await Promise.all(
      todo.map(async (id) => {
        try {
          const res = await fetch(`/api/tours/${encodeURIComponent(id)}`);
          if (!res.ok) return;
          const body = (await res.json()) as { data?: Tour } | null;
          const tour = body?.data ?? null;
          // Drafts must never surface through a landing page.
          if (tour?.id && tour.slug && (tour.status ?? 'published') === 'published') loaded[tour.id] = tour;
        } catch {
          // Silent — the block renders nothing rather than a placeholder.
        }
      })
    );
    if (Object.keys(loaded).length) extraTours = { ...extraTours, ...loaded };
  };

  // Every id the page points at, minus the ones already in hand. Server-side this
  // is always empty — SSR content comes from the loader alone.
  $: referencedIds = [...new Set(sections.flatMap((block) => blockTourIds(block, mp.featured_tour_ids ?? [])))];
  $: missingIds = browser ? referencedIds.filter((id) => !tourById.has(id) && !requestedIds.has(id)) : [];
  $: if (missingIds.length) void topUpTours(missingIds);

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

  // ── Block field normalisers ────────────────────────────────────────────────
  // Every block field is optional (the admin saves partial blocks), so each list
  // is flattened to a concrete shape and stripped of entries that carry nothing.
  // An empty list means the block renders nothing at all.
  const text = (value: string | undefined) => (value ?? '').trim();

  const labelItems = (items: Array<{ label?: string }> | undefined) =>
    (items ?? []).map((item) => ({ label: text(item.label) })).filter((item) => item.label);

  const titledItems = (items: Array<{ title?: string; body?: string }> | undefined) =>
    (items ?? [])
      .map((item) => ({ title: text(item.title), body: text(item.body) }))
      .filter((item) => item.title || item.body);

  const tierCards = (tiers: Array<{ label?: string; title?: string; body?: string; image_url?: string }> | undefined) =>
    (tiers ?? [])
      .map((tier) => ({
        label: text(tier.label),
        title: text(tier.title),
        body: text(tier.body),
        image_url: text(tier.image_url)
      }))
      .filter((tier) => tier.label || tier.title || tier.body || tier.image_url);

  const splitPanels = (panels: Array<{ title?: string; items?: string[]; image_url?: string }> | undefined) =>
    (panels ?? [])
      .map((panel) => ({ title: text(panel.title), items: nonEmpty(panel.items), image_url: text(panel.image_url) }))
      .filter((panel) => panel.title || panel.items.length || panel.image_url);

  // No image, no tile — a caption on its own is never rendered.
  const gridImages = (images: Array<{ image_url?: string; caption?: string }> | undefined) =>
    (images ?? [])
      .map((image) => ({ image_url: text(image.image_url), caption: text(image.caption) }))
      .filter((image) => image.image_url);

  const seasonRows = (seasons: Array<{ months?: string; label?: string; body?: string }> | undefined) =>
    (seasons ?? [])
      .map((season) => ({ months: text(season.months), label: text(season.label), body: text(season.body) }))
      .filter((season) => season.months || season.label || season.body);

  // ── Packages ───────────────────────────────────────────────────────────────
  // Per-party prices are OPTIONAL and only ever the figures an admin typed in.
  // Anything blank, non-numeric or zero is discarded, and a tour with no usable
  // grid gets `null` — the card then falls back to its own "from" price.
  const cleanPaxPricing = (entry: Record<string, number> | undefined): Record<string, number> | null => {
    if (!entry || typeof entry !== 'object') return null;
    const usable = Object.entries(entry).filter(
      ([pax, price]) => Number(pax) > 0 && typeof price === 'number' && Number.isFinite(price) && price > 0
    );
    return usable.length ? Object.fromEntries(usable) : null;
  };

  // The block-level grid predates the per-tour overrides — pages saved before
  // them still price their cards from here.
  const paxPricingFor = (pricing: Record<string, Record<string, number>> | undefined, tourId: string) =>
    cleanPaxPricing(pricing?.[tourId]);

  // ── Per-tour card overrides ────────────────────────────────────────────────
  // Real copy the client typed against a tour in the admin (kicker, route stops,
  // nights split, "best for", card image, CTA). It is never generated here: an
  // absent key means the card falls back to the tour's own record, and a night
  // count is only a night count when it is a real positive number.
  /** Carries nothing — every value on the card then falls back to the tour. */
  const NO_OVERRIDE: MarketPackageOverride = {};

  const nights = (value: number | undefined): number | null => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
  };
  const nightsLabel = (value: number | undefined): string => {
    const n = nights(value);
    return n == null ? '' : `${n} ${n === 1 ? 'night' : 'nights'}`;
  };

  // ── Comparison (auto-derived) ──────────────────────────────────────────────
  // Built ONLY from real data: the fields the tour records store, plus the two
  // the admin typed per tour in a packages block (parks, Zanzibar nights) — the
  // tours schema has no column for those. A row where no tour has a value is
  // dropped rather than filled with a dash or invented copy, and anything nobody
  // holds (airlines, hotel names) still has no row at all.
  const groupSizeLabel = (tour: Tour): string => {
    const min = tour.group_size_min ?? null;
    const max = tour.group_size_max ?? null;
    if (min != null && max != null) return min === max ? `${min} guests` : `${min}–${max} guests`;
    if (min != null) return `From ${min} guests`;
    if (max != null) return `Up to ${max} guests`;
    return '';
  };

  const COMPARISON_FIELDS: Array<{
    label: string;
    value: (tour: Tour, override: MarketPackageOverride, state: CurrencyStoreState) => string;
  }> = [
    { label: 'Duration', value: (t) => (t.duration_days ? `${t.duration_days} ${t.duration_days === 1 ? 'day' : 'days'}` : '') },
    { label: 'Nights', value: (t) => (t.duration_nights ? `${t.duration_nights} ${t.duration_nights === 1 ? 'night' : 'nights'}` : '') },
    // Parks and beach nights are not tour columns — these two rows exist ONLY
    // because an admin typed them into a packages block's per-tour overrides.
    // A tour nobody typed them for keeps a blank cell.
    { label: 'Parks', value: (_t, ov) => nonEmpty(ov.route_stops).join(' · ') },
    { label: 'Zanzibar nights', value: (_t, ov) => nightsLabel(ov.zanzibar_nights) },
    { label: 'Comfort', value: (t) => tierLabel(t.budget_tier) },
    { label: 'Group size', value: (t) => groupSizeLabel(t) },
    { label: 'From', value: (t, _ov, state) => (t.price_from != null ? formatUsd(t.price_from, state) : '') }
  ];

  // The overrides live on the packages blocks (keyed by tour id); a comparison
  // block reads the same copy so both sections describe a tour identically.
  // A later block wins if two of them describe the same tour.
  $: packageOverrides = sections.reduce<Record<string, MarketPackageOverride>>((acc, block) => {
    if (block.type !== 'packages') return acc;
    return { ...acc, ...(block.overrides ?? {}) };
  }, {});

  const deriveComparison = (
    compared: Tour[],
    state: CurrencyStoreState,
    overrides: Record<string, MarketPackageOverride>
  ) => {
    // One column is not a comparison.
    if (compared.length < 2) return null;
    const rows = COMPARISON_FIELDS.map((field) => ({
      label: field.label,
      cells: compared.map((tour) => field.value(tour, overrides[tour.id] ?? NO_OVERRIDE, state))
    })).filter((row) => row.cells.some((cell) => cell));
    if (!rows.length) return null;
    // columns[0] heads the row-label column — left blank so no label is invented.
    return { columns: ['', ...compared.map((tour) => tour.title)], rows };
  };
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
    {@const blockTours = resolveTours(blockTourIds(block, mp.featured_tour_ids ?? []))}
    <!-- No resolved tours → the whole block disappears. Never a placeholder card. -->
    {#if blockTours.length}
      <section class="bg-canvas py-14 md:py-20">
        <div class="container-shell">
          <div use:fadeUpOnScroll={{ y: 14 }}>
            {#if block.eyebrow}
              <p class="brand-eyebrow">{block.eyebrow}</p>
            {/if}
            {#if block.title}
              <h2 class="max-w-3xl font-serif text-[30px] font-light leading-[1.12] text-heading md:text-[40px] {block.eyebrow ? 'mt-4' : ''}">
                {block.title}
              </h2>
            {/if}
            {#if block.intro}
              <p class="mt-4 max-w-3xl text-[15px] font-medium leading-8 text-ink/70 md:text-base">{block.intro}</p>
            {/if}
          </div>
          <div class="mt-10 grid items-stretch gap-5 md:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 18, stagger: 0.07 }}>
            {#each blockTours as tour, tourIndex (tour.id)}
              <!-- Everything the admin typed for THIS tour. Each value is blank
                   unless it was actually entered, and a blank one falls back to
                   the tour's own record inside the card. The CTA label is spread
                   in only when set, so blank leaves the card's own button
                   wording alone instead of emptying it. -->
              {@const ov = block.overrides?.[tour.id] ?? NO_OVERRIDE}
              {@const ctaLabel = text(ov.cta_label)}
              <MarketTourCard
                {tour}
                index={tourIndex}
                flagship={Boolean(block.flagship_tour_id) && block.flagship_tour_id === tour.id}
                kicker={text(ov.kicker)}
                routeStops={nonEmpty(ov.route_stops)}
                safariNights={nights(ov.safari_nights)}
                zanzibarNights={nights(ov.zanzibar_nights)}
                bestFor={text(ov.best_for)}
                imageUrl={text(ov.image_url)}
                paxPricing={cleanPaxPricing(ov.pax_pricing) ?? paxPricingFor(block.pax_pricing, tour.id)}
                ctaHref={withCampaign(text(ov.cta_href) || `/tours/${tour.slug}`, campaignQuery)}
                {...(ctaLabel ? { ctaLabel } : {})}
              />
            {/each}
          </div>
        </div>
      </section>
    {/if}

  {:else if block.type === 'comparison'}
    {@const rows = cleanRows(block.rows)}
    {@const hasExplicitRows = rows.length > 0 && (block.columns ?? []).length > 0}
    <!-- Rows an admin typed win; otherwise the table is DERIVED from the real
         tour records — only from fields those records actually store. -->
    {@const derived = hasExplicitRows
      ? null
      : deriveComparison(resolveTours(blockTourIds(block, mp.featured_tour_ids ?? [])), $currency, packageOverrides)}
    {#if hasExplicitRows || derived}
      <section class="bg-surface py-14 md:py-20">
        <div class="container-shell" use:fadeUpOnScroll={{ y: 14 }}>
          {#if block.title}
            <h2 class="mb-8 max-w-3xl font-serif text-[30px] font-light leading-[1.12] text-heading md:text-[40px]">{block.title}</h2>
          {/if}
          <ComparisonTable columns={derived ? derived.columns : (block.columns ?? [])} rows={derived ? derived.rows : rows} />
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

  {:else if block.type === 'trust'}
    {@const items = labelItems(block.items)}
    {#if items.length}
      <MarketTrustStrip {items} />
    {/if}

  {:else if block.type === 'numbered'}
    {@const items = titledItems(block.items)}
    {#if items.length}
      <MarketNumberedGrid
        eyebrow={block.eyebrow ?? ''}
        title={block.title ?? ''}
        {items}
        columns={block.columns ?? 3}
      />
    {/if}

  {:else if block.type === 'route'}
    {@const stops = nonEmpty(block.stops)}
    {@const notes = titledItems(block.notes)}
    {#if stops.length || notes.length}
      <MarketRouteFlow
        eyebrow={block.eyebrow ?? ''}
        title={block.title ?? ''}
        intro={block.intro ?? ''}
        {stops}
        {notes}
      />
    {/if}

  {:else if block.type === 'tiers'}
    {@const tiers = tierCards(block.tiers)}
    {#if tiers.length}
      <MarketTierCards
        eyebrow={block.eyebrow ?? ''}
        title={block.title ?? ''}
        intro={block.intro ?? ''}
        {tiers}
      />
    {/if}

  {:else if block.type === 'panels'}
    {@const panels = splitPanels(block.panels)}
    {#if panels.length}
      <MarketSplitPanels {panels} />
    {/if}

  {:else if block.type === 'imagegrid'}
    {@const images = gridImages(block.images)}
    <!-- Only real, uploaded images — a caption with no image never renders. -->
    {#if images.length}
      <MarketImageGrid eyebrow={block.eyebrow ?? ''} title={block.title ?? ''} {images} />
    {/if}

  {:else if block.type === 'steps'}
    {@const steps = titledItems(block.steps)}
    {@const stepsCtaLabel = (block.cta_label ?? '').trim()}
    {@const stepsCtaHref = (block.cta_href ?? '').trim()}
    {#if steps.length}
      <MarketSteps
        eyebrow={block.eyebrow ?? ''}
        title={block.title ?? ''}
        {steps}
        ctaLabel={stepsCtaHref ? stepsCtaLabel : ''}
        ctaHref={stepsCtaLabel ? withCampaign(stepsCtaHref, campaignQuery) : ''}
      />
    {/if}

  {:else if block.type === 'season'}
    {@const seasons = seasonRows(block.seasons)}
    {#if seasons.length}
      <MarketSeasonStrip
        eyebrow={block.eyebrow ?? ''}
        title={block.title ?? ''}
        intro={block.intro ?? ''}
        {seasons}
        note={block.note ?? ''}
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
