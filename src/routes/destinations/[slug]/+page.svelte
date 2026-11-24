<script lang="ts">
  /**
   * A destination page (Nelson's redesign, Nov 2026): the facts people ask
   * first, then short sections — in short, why, month by month, the areas,
   * the safaris, "your way", where to stay, cost, practicalities and one list
   * of questions — beside an enquiry form that stays in view. The full guide
   * follows for those who want to read on; whatever the sections above have
   * already shown is left out of it, so nothing is said twice.
   *
   * Everything is read from the destination's own records: its guide, its
   * page fields (CMS), its tours, stays and questions. A section with nothing
   * to show is left out, never filled in.
   */
  import { ArrowRight } from '@lucide/svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { SITE_URL } from '$lib/config/env';
  import { destinationStructuredData } from '$lib/destination-seo';
  import { trackEvent } from '$lib/analytics';
  import { api } from '$lib/api/client';
  import { currency, formatUsdWhole } from '$lib/currency';
  import { thumbUrl } from '$lib/img';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import FAQAccordion from '$lib/components/public/FAQAccordion.svelte';
  import JsonLd from '$lib/components/public/JsonLd.svelte';
  import RichText from '$lib/components/public/RichText.svelte';
  import WhatsAppCta from '$lib/components/public/WhatsAppCta.svelte';
  import DestinationGuide from '$lib/components/public/guide/DestinationGuide.svelte';
  import CostEstimator from '$lib/components/public/destination/CostEstimator.svelte';
  import DestEnquiry from '$lib/components/public/destination/DestEnquiry.svelte';
  import DestHero from '$lib/components/public/destination/DestHero.svelte';
  import DestSectionNav from '$lib/components/public/destination/DestSectionNav.svelte';
  import DestWays from '$lib/components/public/destination/DestWays.svelte';
  import MonthPicker from '$lib/components/public/destination/MonthPicker.svelte';
  import StaysByTier from '$lib/components/public/destination/StaysByTier.svelte';
  import { splitTourTitle } from '$lib/components/public/destination/tourTitle';
  import { breadcrumbLd, faqLd, faqPairs, plainText } from '$lib/seo';
  import { ownedFaqs } from '$lib/faqEntities';
  import { costTable, findQuickFacts, gettingThere, keyFacts, monthByMonth, nightsAdvice, parkAreas, questionsNotInGuide } from '$lib/guideLayout';
  import { TIER_LABELS, tourTierKeys } from '$lib/tiers';
  import type { Destination, DestinationPage, FAQ, GuideBlock, Lodge, Tour, TripPoint } from '$lib/types';
  import type { PageData } from './$types';

  export let data: PageData;

  const PLAN = '#plan';
  const SECTION = 'scroll-mt-[calc(var(--nav-h)+72px)] mt-14 border-t border-ink/10 pt-12 md:mt-16 md:pt-14';
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  // "Ngorongoro Conservation Area" → "Ngorongoro".
  const shortPlace = (place = '') =>
    place.replace(/\s+(national park|conservation area|game reserve|marine park|crater|archipelago)$/i, '').trim() || place;

  $: origin = (SITE_URL || $page.url.origin).replace(/\/$/, '');
  $: slug = $page.params.slug ?? '';

  // Null when the API failed or the slug does not exist: the page shows an
  // honest error state, never made-up content.
  $: destination = (data.destination as Destination | null) ?? null;
  $: guide = (destination?.guide ?? []) as GuideBlock[];
  $: fields = (destination?.page ?? {}) as DestinationPage;
  $: name = destination?.name ?? '';
  // "the Serengeti" in sentences, "Serengeti" before a noun ("a Serengeti
  // safari"). Without a short name: the full name, and the name without
  // "National Park" before a noun.
  $: noun = fields.short_name?.trim() || name;
  $: adj = fields.short_name?.trim() ? noun.replace(/^the\s+/i, '') : shortPlace(name);
  $: money = (n: number) => formatUsdWhole(n, $currency);

  // ── Read from the guide ──────────────────────────────────────────────────
  $: quickFacts = findQuickFacts(guide);
  $: facts = keyFacts(quickFacts?.items ?? []);
  $: months = monthByMonth(guide);
  $: areas = parkAreas(guide);
  $: nights = nightsAdvice(guide, facts.howLong);
  $: arrival = gettingThere(guide);
  $: cost = costTable(guide);
  $: costRows = (cost?.rows ?? []).filter((row) => row.amount != null);
  $: cheapest = costRows.filter((row) => row.perDay != null).sort((a, b) => (a.perDay ?? 0) - (b.perDay ?? 0))[0];

  // ── Records ──────────────────────────────────────────────────────────────
  $: guideTours = (data.guideTours ?? []) as Tour[];
  $: relatedTours = (data.tours ?? []) as Tour[];
  $: popularTours = (data.popularTours ?? []) as Tour[];
  // The guide's own picks first, then the other tours through here.
  $: safariTours = [...guideTours, ...relatedTours].filter((t, i, all) => all.findIndex((x) => x.id === t.id) === i);
  $: shownTours = (safariTours.length ? safariTours : popularTours).slice(0, 4);
  $: lodges = (data.lodges ?? []) as Lodge[];
  $: pairs = ((data.pairs ?? []) as Destination[]).length ? (data.pairs as Destination[]) : ((data.otherDestinations ?? []) as Destination[]).slice(0, 4);
  $: faqs = (data.faqs ?? []) as FAQ[];


  // The strip under the hero: only the facts this destination has.
  $: heroFacts = [
    { label: 'Best time', value: facts.bestTime },
    { label: 'How long', value: facts.howLong },
    { label: 'Pairs well with', value: ((data.pairs ?? []) as Destination[]).slice(0, 3).map((d) => shortPlace(d.name)).join(', ') },
    {
      label: 'Private safaris from',
      value: cheapest?.perDay != null
        ? `${money(cheapest.perDay)} per person, per day`
        : destination?.score_budget_from ? `${money(destination.score_budget_from)} per person` : ''
    }
  ].filter((fact) => fact.value);

  // "In short": the page's own summary, with the guide's quick facts not
  // already in the strip above.
  $: shortFacts = (quickFacts?.items ?? []).filter((it) => it?.label && it?.value && it.value !== facts.bestTime && it.value !== facts.howLong);
  const reviewedOn = (d?: string | null) => {
    if (!d) return '';
    const dt = new Date(d);
    return Number.isNaN(dt.getTime()) ? '' : dt.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  };
  $: reviewed = reviewedOn(destination?.guide_reviewed_at);
  $: byline = reviewed ? `Reviewed ${reviewed}${fields.reviewed_by?.trim() ? ` by ${fields.reviewed_by.trim()}` : ''}` : '';
  $: highlights = (fields.highlights ?? []).filter((h) => h?.title?.trim());
  $: ways = (fields.ways ?? []).filter((w) => w?.title?.trim() || w?.body?.trim());
  $: quote = fields.guide_quote?.quote?.trim() ? fields.guide_quote : null;

  // ── Questions: one list per page ─────────────────────────────────────────
  // The guide's own questions, then the library's questions the guide doesn't
  // already ask. With no guide FAQ, the library's (general ones included).
  $: guideQuestions = guide
    .flatMap((b) => (b?.type === 'faq' ? ((b as { items?: { q?: string; a?: string }[] }).items ?? []) : []))
    .filter((it) => it?.q?.trim() && it?.a?.trim()) as { q: string; a: string }[];
  $: owned = destination ? ownedFaqs(faqs, { type: 'destinations', id: destination.id }) : [];
  $: libraryQuestions = guideQuestions.length ? questionsNotInGuide(owned, guide, name) : faqs;
  $: questions = [
    ...guideQuestions.map((it, i) => ({ id: `guide-${i}`, question: it.q, answer: it.a }) as FAQ),
    ...libraryQuestions
  ];
  // Marked up here: the guide's and this destination's own. General ones are
  // marked up on the page that owns them.
  $: questionLd = [
    ...guideQuestions.map((it) => ({ q: plainText(it.q), a: plainText(it.a) })),
    ...faqPairs(guideQuestions.length ? libraryQuestions : owned)
  ].filter((p) => p.q && p.a);

  $: safety = destination
    ? ([
        [`Is ${noun} safe to visit?`, [destination.safety_overview, destination.security_advice].filter(Boolean).join('\n\n')],
        ['Do we need vaccinations?', destination.health_vaccinations],
        ['What travel insurance do we need?', destination.travel_insurance_note],
        ['Who do we call in an emergency?', destination.emergency_contacts]
      ]
        .filter(([, answer]) => answer?.trim())
        .map(([question, answer], i) => ({ id: `safety-${i}`, question, answer }) as FAQ))
    : [];

  // The blocks the sections above show, left out of the full guide below.
  // Its tours and stays are in the Safaris and Where to stay sections.
  $: shown = [
    ...(months?.source ?? []),
    ...(areas?.source ?? []),
    ...(nights?.source ?? []),
    ...(arrival?.source ?? []),
    ...(cost?.source ?? []),
    ...guide.filter((b) => b?.type === 'faq' || b?.type === 'tours' || b?.type === 'lodges')
  ];

  // Start and end points, for "getting there" when the guide has no table of its own.
  let tripPoints: TripPoint[] = [];
  let pointsFor = '';
  $: if (browser && destination?.id && !arrival && destination.id !== pointsFor) {
    pointsFor = destination.id;
    api.tripPoints
      .list({ destination_id: destination.id, limit: 4 })
      .then((res) => (tripPoints = res.data.items ?? []))
      .catch(() => (tripPoints = []));
  }
  const roleLabel = (role: TripPoint['role']) =>
    role === 'start' ? 'Trips start here' : role === 'end' ? 'Trips end here' : 'Start and end point';

  $: hasPracticalities = Boolean(nights || arrival || tripPoints.length || safety.length);
  $: isPark = /national park|game reserve|conservation area/i.test(name);

  $: navLinks = [
    { label: 'Overview', href: '#overview' },
    months ? { label: 'When to go', href: '#when-to-go' } : null,
    shownTours.length ? { label: 'Safaris', href: '#safaris' } : null,
    ways.length ? { label: 'Your way', href: '#your-way' } : null,
    lodges.length ? { label: 'Where to stay', href: '#stays' } : null,
    costRows.length ? { label: 'Cost', href: '#cost' } : null,
    questions.length ? { label: 'Questions', href: '#questions' } : null
  ].filter(Boolean) as { label: string; href: string }[];

  const tierOf = (tour: Tour) => {
    const tier = tourTierKeys(tour)[0];
    return tier ? TIER_LABELS[tier] : '';
  };

  // An ItemList of the tours and stays this page links to, so search engines
  // read the destination as a hub for them.
  $: itemListLd =
    destination && (safariTours.length || lodges.length)
      ? {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: `Safaris and stays in ${destination.name}`,
          itemListElement: [
            ...safariTours.map((t) => ({ name: t.title, url: `${origin}/tours/${t.slug}` })),
            ...lodges.slice(0, 12).map((l) => ({ name: l.name, url: `${origin}/accommodation/${l.slug}` }))
          ].map((item, i) => ({ '@type': 'ListItem', position: i + 1, ...item }))
        }
      : null;

  let trackedSlug = '';
  $: if (browser && destination && slug && slug !== trackedSlug) {
    trackedSlug = slug;
    trackEvent('destination_page_view', { destination: destination.name });
  }
</script>

{#if !destination}
  <section class="container-shell py-20">
    <ErrorState message="We couldn't load this destination. Please refresh in a moment, or browse our other destinations." />
  </section>
{:else}
  <JsonLd data={breadcrumbLd(origin, [{ name: 'Home', path: '/' }, { name: 'Destinations', path: '/destinations' }, { name: destination.name, path: `/destinations/${destination.slug}` }])} />
  <JsonLd data={destinationStructuredData(destination, origin)} />
  {#if itemListLd}<JsonLd data={itemListLd} />{/if}
  {#if questionLd.length}<JsonLd data={faqLd(questionLd)} />{/if}

  <DestHero {destination} adjName={adj} facts={heroFacts} planHref={PLAN} />
  <DestSectionNav links={navLinks} planHref={PLAN} label={`${destination.name} on this page`} />

  <div class="bg-canvas">
    <div class="container-shell grid gap-14 py-12 md:py-16 lg:grid-cols-12 lg:gap-12">
      <div class="min-w-0 lg:col-span-8">
        <!-- In short, and why go -->
        <section id="overview" class="scroll-mt-[calc(var(--nav-h)+72px)]">
          {#if fields.in_short?.trim() || shortFacts.length}
            <div class="border border-ink/10 bg-white p-6 sm:p-8">
              <p class="dest-label">{noun} in short</p>
              {#if fields.in_short?.trim()}
                <p class="mt-3 text-[17px] leading-[1.7] text-heading">{fields.in_short}</p>
              {/if}
              {#if shortFacts.length}
                <dl class={`grid gap-x-8 sm:grid-cols-2 ${fields.in_short?.trim() ? 'mt-6' : 'mt-4'}`}>
                  {#each shortFacts as item (item.label)}
                    <div class="border-t border-ink/10 py-3">
                      <dt class="text-[13px] text-ink/55">{item.label}</dt>
                      <dd class="mt-0.5 text-[15px] leading-[1.55] text-heading">{item.value}</dd>
                    </div>
                  {/each}
                </dl>
              {/if}
              {#if byline}<p class="mt-4 text-[13px] text-ink/55">{byline}</p>{/if}
            </div>
          {/if}

          {#if destination.description || highlights.length}
            <div class={fields.in_short?.trim() || shortFacts.length ? 'mt-14' : ''}>
              <p class="dest-label">Overview</p>
              <h2 class="type-h2 mt-2 text-heading">Why {noun}</h2>
              {#if destination.description}
                <RichText value={destination.description} className="mt-5 max-w-[68ch] text-base leading-[1.8] text-ink/75" />
              {/if}
              {#if highlights.length}
                <ul class="mt-8 grid gap-4 sm:grid-cols-3">
                  {#each highlights as item, i (i)}
                    <li class="border border-ink/10 bg-white p-5">
                      <h3 class="font-serif text-[20px] font-normal leading-snug text-heading">{item.title}</h3>
                      {#if item.text}<p class="mt-2 text-[14px] leading-[1.65] text-ink/70">{item.text}</p>{/if}
                    </li>
                  {/each}
                </ul>
              {/if}
            </div>
          {/if}
        </section>

        {#if months}
          <section id="when-to-go" class={SECTION}>
            <p class="dest-label">When to go</p>
            <h2 class="type-h2 mt-2 text-heading">{cap(noun)}, month by month</h2>
            <div class="mt-7">
              <MonthPicker months={months.months} tip={months.tip} adjName={adj} planHref={PLAN} />
            </div>
          </section>
        {/if}

        {#if areas}
          <section id="areas" class={SECTION}>
            <p class="dest-label">{isPark ? 'Areas of the park' : 'Areas'}</p>
            <h2 class="type-h2 mt-2 text-heading">Which part of {noun}?</h2>
            <ul class="mt-7 grid gap-x-8 sm:grid-cols-2 xl:grid-cols-3">
              {#each areas.items as area (area.name)}
                <li class="border-t border-ink/15 pb-6 pt-4">
                  <h3 class="text-[16px] font-semibold leading-snug text-heading">{area.name}</h3>
                  {#if area.text}<p class="mt-1.5 text-[14px] leading-[1.65] text-ink/70">{area.text}</p>{/if}
                </li>
              {/each}
            </ul>
          </section>
        {/if}

        {#if shownTours.length}
          <section id="safaris" class={SECTION}>
            <div class="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
              <div>
                <p class="dest-label">Safaris</p>
                <h2 class="type-h2 mt-2 text-heading">{safariTours.length ? `Journeys through ${noun}` : 'Popular safaris'}</h2>
              </div>
              <a class="group inline-flex items-center gap-1 text-[14px] font-semibold text-forest transition hover:text-heading" href={safariTours.length ? `/tours?destination=${encodeURIComponent(destination.slug)}` : '/tours'}>
                {safariTours.length ? `All ${adj} safaris` : 'All safaris'} <ArrowRight size={15} class="transition group-hover:translate-x-0.5" />
              </a>
            </div>
            <ul class="mt-7 grid gap-x-5 gap-y-9 sm:grid-cols-2">
              {#each shownTours as tour (tour.id)}
                {@const parts = splitTourTitle(tour.title)}
                {@const photo = thumbUrl(tour, 'main_image_url', 'image_url', 'banner_image_url')}
                {@const meta = [tierOf(tour), tour.duration_days ? `${tour.duration_days} days` : ''].filter(Boolean).join(' · ')}
                <li>
                  <a class="group block" href={`/tours/${tour.slug}`}>
                    <div class="aspect-[16/10] overflow-hidden bg-linen">
                      {#if photo}<img src={photo} alt={tour.title} loading="lazy" class="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />{/if}
                    </div>
                    {#if meta}<p class="dest-label mt-4">{meta}</p>{/if}
                    <h3 class="mt-1.5 font-serif text-[22px] font-normal leading-tight text-heading transition group-hover:text-forest">{parts.name}</h3>
                    {#if parts.route}<p class="mt-1 text-[14px] text-ink/60">{parts.route}</p>{/if}
                  </a>
                  <p class="mt-3 flex items-baseline justify-between gap-4 border-t border-ink/10 pt-3 text-[14px]">
                    {#if tour.price_from}<span class="text-ink/70">From <span class="font-semibold text-heading">{money(Number(tour.price_from))}</span> pp</span>{:else}<span></span>{/if}
                    <a class="font-semibold text-forest transition hover:text-heading" href={`/tours/${tour.slug}`}>View safari →</a>
                  </p>
                </li>
              {/each}
            </ul>
          </section>
        {/if}

        {#if ways.length}
          <section id="your-way" class={SECTION}>
            <p class="dest-label">{adj} your way</p>
            <h2 class="type-h2 mt-2 text-heading">A {adj} safari shaped around you</h2>
            <div class="mt-9">
              <DestWays {ways} planHref={PLAN} />
            </div>
          </section>
        {/if}

        {#if quote}
          <section class="mt-14 bg-deep-green text-white md:mt-16">
            <div class={quote.image_url ? 'grid sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]' : ''}>
              {#if quote.image_url}
                <div class="aspect-[4/3] overflow-hidden bg-white/5 sm:aspect-auto">
                  <img src={quote.image_url} alt={quote.name || ''} loading="lazy" class="h-full w-full object-cover" />
                </div>
              {/if}
              <figure class="p-7 sm:p-9">
                <p class="dest-label-dark">Planned by the people who guide you</p>
                <blockquote class="mt-4 font-serif text-[24px] font-normal leading-[1.35] text-white sm:text-[28px]">“{quote.quote}”</blockquote>
                {#if quote.name}
                  <figcaption class="mt-4 text-[14px] text-white/75">{quote.name}{#if quote.role}, {quote.role}{/if}</figcaption>
                {/if}
                <a class="group mt-6 inline-flex items-center gap-1 text-[14px] font-semibold text-emnel-gold transition hover:text-white" href="/about">
                  Meet our team <ArrowRight size={15} class="transition group-hover:translate-x-0.5" />
                </a>
              </figure>
            </div>
          </section>
        {/if}

        {#if lodges.length}
          <section id="stays" class={SECTION}>
            <div class="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
              <div>
                <p class="dest-label">Where to stay</p>
                <h2 class="type-h2 mt-2 text-heading">Camps and lodges in {noun}</h2>
              </div>
              <a class="group inline-flex items-center gap-1 text-[14px] font-semibold text-forest transition hover:text-heading" href={`/accommodation?destination=${encodeURIComponent(destination.name)}`}>
                See all {lodges.length} stays <ArrowRight size={15} class="transition group-hover:translate-x-0.5" />
              </a>
            </div>
            <div class="mt-7">
              <StaysByTier {lodges} />
            </div>
          </section>
        {/if}

        {#if costRows.length}
          <section id="cost" class={SECTION}>
            <p class="dest-label">Cost</p>
            <h2 class="type-h2 mt-2 text-heading">What a private {adj} safari costs</h2>
            <p class="mt-4 max-w-[64ch] text-base leading-[1.75] text-ink/70">
              The price per person depends on your style of travel, the length of the trip and how many of you travel together. Set your trip below for a starting budget.
            </p>
            <div class="mt-7">
              <CostEstimator rows={costRows} tours={safariTours} adjName={adj} toursHref={`/tours?destination=${encodeURIComponent(destination.slug)}`} planHref={PLAN} />
            </div>
          </section>
        {/if}

        {#if hasPracticalities}
          <section id="practicalities" class={SECTION}>
            <p class="dest-label">Practicalities</p>
            <h2 class="type-h2 mt-2 text-heading">Planning your {adj} safari</h2>

            {#if nights}
              <h3 class="mt-8 text-[18px] font-semibold text-heading">How many nights do you need?</h3>
              <ul class={`mt-4 grid gap-x-6 sm:grid-cols-2 ${nights.options.length === 3 ? 'xl:grid-cols-3' : ''}`}>
                {#each nights.options as option (option.label)}
                  <li class="border-t border-ink/15 pb-5 pt-4">
                    <p class="font-serif text-[20px] leading-tight text-heading">{option.label}</p>
                    {#if option.recommended}<p class="dest-label mt-1.5">Recommended</p>{/if}
                    <p class="mt-1.5 text-[14px] leading-[1.65] text-ink/70">{option.text}</p>
                  </li>
                {/each}
              </ul>
              {#if nights.note}<p class="mt-2 max-w-[68ch] text-[14px] leading-[1.65] text-ink/70"><span class="font-semibold text-heading">Our advice:</span> {nights.note}</p>{/if}
            {/if}

            {#if arrival}
              <h3 class="mt-10 text-[18px] font-semibold text-heading">How to get to {noun}</h3>
              <ul class="mt-4 grid gap-x-6 sm:grid-cols-2 xl:grid-cols-3">
                {#each arrival.items as item (item.title)}
                  <li class="border-t border-ink/15 pb-5 pt-4">
                    <p class="text-[15px] font-semibold text-heading">{item.title}</p>
                    {#if item.route}<p class="mt-1.5 text-[14px] leading-[1.65] text-ink/70">{item.route}</p>{/if}
                    {#if item.bestFor}<p class="mt-1.5 text-[13px] leading-[1.6] text-ink/55">Best for: {item.bestFor}</p>{/if}
                  </li>
                {/each}
              </ul>
            {:else if tripPoints.length}
              <h3 class="mt-10 text-[18px] font-semibold text-heading">How trips to {noun} start and end</h3>
              <ul class="mt-4 grid gap-x-6 sm:grid-cols-2">
                {#each tripPoints as point (point.id)}
                  <li class="border-t border-ink/15 pb-5 pt-4">
                    <p class="text-[15px] font-semibold text-heading">{point.name}{#if point.airport_code}<span class="ml-2 text-[13px] text-ink/50">{point.airport_code}</span>{/if}</p>
                    <p class="dest-label mt-1">{roleLabel(point.role)}</p>
                    {#if point.transfer_info || point.description}<p class="mt-1.5 text-[14px] leading-[1.65] text-ink/70">{point.transfer_info || point.description}</p>{/if}
                  </li>
                {/each}
              </ul>
            {/if}

            {#if safety.length}
              <h3 class="mt-10 text-[18px] font-semibold text-heading">Health and safety</h3>
              <div class="mt-4">
                <FAQAccordion faqs={safety} headingLevel={4} />
              </div>
              <a class="group mt-4 inline-flex items-center gap-1 text-[14px] font-semibold text-forest transition hover:text-heading" href="/safety">
                The full health and safety guide <ArrowRight size={15} class="transition group-hover:translate-x-0.5" />
              </a>
            {/if}
          </section>
        {/if}

        {#if questions.length}
          <section id="questions" class={SECTION}>
            <p class="dest-label">Questions</p>
            <h2 class="type-h2 mt-2 text-heading">{adj} questions, answered</h2>
            <div class="mt-7">
              <FAQAccordion faqs={questions} />
            </div>
          </section>
        {/if}
      </div>

      <aside class="lg:col-span-4">
        <div class="lg:sticky lg:top-[calc(var(--nav-h)+76px)]">
          <DestEnquiry destinationName={destination.name} adjName={adj} />
        </div>
      </aside>
    </div>
  </div>

  <!-- The full guide, for those who want to read on. -->
  {#if guide.length}
    <DestinationGuide
      destinationName={destination.name}
      title={`The complete ${adj} guide`}
      blocks={guide}
      skip={shown}
      reviewedAt={destination.guide_reviewed_at ?? null}
      tours={(data.guideTours ?? []) as Tour[]}
      lodges={(data.guideLodges ?? []) as Lodge[]}
    />
  {/if}

  {#if pairs.length}
    <section class="bg-canvas py-16 md:py-20">
      <div class="container-shell">
        <p class="dest-label">{(data.pairs ?? []).length ? 'Pairs well with' : 'More destinations'}</p>
        <h2 class="type-h2 mt-2 text-heading">Complete the journey</h2>
        <ul class={`mt-8 grid grid-cols-2 gap-x-4 gap-y-8 ${pairs.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}>
          {#each pairs as item (item.id)}
            {@const photo = thumbUrl(item, 'main_image_url', 'image_url', 'banner_image_url')}
            {@const where = item.region || item.country || ''}
            <li>
              <a class="group block" href={`/destinations/${item.slug}`}>
                <div class={`overflow-hidden bg-linen ${pairs.length === 3 ? 'aspect-[4/3]' : 'aspect-[4/5]'}`}>
                  {#if photo}<img src={photo} alt={item.name} loading="lazy" class="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />{/if}
                </div>
                {#if where}<p class="dest-label mt-3 line-clamp-1">{where}</p>{/if}
                <h3 class="mt-1 font-serif text-[19px] font-normal leading-snug text-heading transition group-hover:text-forest">{item.name}</h3>
              </a>
            </li>
          {/each}
        </ul>
      </div>
    </section>
  {/if}

  <section class="bg-deep-green py-16 text-center text-white md:py-20">
    <div class="container-shell">
      <h2 class="type-h2 mx-auto max-w-[24ch] text-white">Your {adj}, planned around you</h2>
      <p class="mx-auto mt-4 max-w-[60ch] text-[16px] leading-[1.7] text-white/80">
        Share your dates and how you like to travel. We'll come back with a considered route, the right camps and an honest price.
      </p>
      <div class="mt-8 flex flex-wrap justify-center gap-3">
        <a class="inline-flex h-12 items-center bg-emnel-gold px-6 text-[15px] font-semibold text-deep-green transition hover:bg-savanna" href={PLAN}>Plan my safari</a>
        <WhatsAppCta
          variant="ghost"
          context="destination_final_cta"
          message={`Hello Emnel, I would like help planning a ${destination.name} safari.`}
          className="inline-flex h-12 items-center border border-white/30 px-6 text-[15px] font-semibold text-white transition hover:bg-white/10"
          label="Talk to our team"
        >Talk to our team</WhatsAppCta>
      </div>
    </div>
  </section>

  <!-- Phones and tablets: the two ways to start, always in reach. -->
  <div class="dest-mobile-bar fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-white lg:hidden" style="padding-bottom: env(safe-area-inset-bottom);">
    <div class="grid grid-cols-2 gap-2 px-3 py-2.5">
      <WhatsAppCta
        variant="ghost"
        context="destination_mobile_bar"
        message={`Hello Emnel, I would like help planning a ${destination.name} safari.`}
        className="inline-flex h-12 w-full items-center justify-center border border-ink/20 text-[15px] font-semibold text-heading"
        label="WhatsApp"
      >WhatsApp</WhatsAppCta>
      <a class="inline-flex h-12 items-center justify-center bg-deep-green text-[15px] font-semibold text-white" href={PLAN}>Plan my safari</a>
    </div>
  </div>
{/if}

<style>
  /* Room under the footer for the bar, so it never covers the last line. */
  @media (max-width: 1023px) {
    :global(body:has(.dest-mobile-bar)) {
      padding-bottom: calc(72px + env(safe-area-inset-bottom));
    }
  }
</style>
