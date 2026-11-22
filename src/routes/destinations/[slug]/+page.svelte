<script lang="ts">
  import FinalCtaSection from '$lib/components/public/FinalCtaSection.svelte';
  import { ArrowRight } from '@lucide/svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { SITE_URL } from '$lib/config/env';
  import { destinationSeo, destinationStructuredData } from '$lib/destination-seo';
  import { trackEvent } from '$lib/analytics';
  import { api } from '$lib/api/client';
  import { staggeredCardReveal } from '$lib/animations/motion';
  import DestinationCard from '$lib/components/public/DestinationCard.svelte';
  import DestinationHero from '$lib/components/public/DestinationHero.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import ActivityCard from '$lib/components/public/ActivityCard.svelte';
  import JsonLd from '$lib/components/public/JsonLd.svelte';
  import LodgeCard from '$lib/components/public/LodgeCard.svelte';
  import SectionHeader from '$lib/components/public/SectionHeader.svelte';
  import TourCardRich from '$lib/components/public/TourCardRich.svelte';
  import DestinationGuide from '$lib/components/public/guide/DestinationGuide.svelte';
  import FAQAccordion from '$lib/components/public/FAQAccordion.svelte';
  import { breadcrumbLd, faqLd, faqPairs } from '$lib/seo';
  import { ownedFaqs } from '$lib/faqEntities';
  import { findQuickFacts } from '$lib/guideLayout';
  import type { Activity, Destination, FAQ, Lodge, Tour, TripPoint } from '$lib/types';
  import type { PageData } from './$types';

  export let data: PageData;

  $: origin = (SITE_URL || $page.url.origin).replace(/\/$/, '');
  $: slug = $page.params.slug ?? '';

  // Destination comes from the SSR load (fast first paint). Null when the API
  // failed or the slug does not exist — the page shows an honest error state,
  // never fabricated content.
  $: destination = (data.destination as Destination | null) ?? null;
  $: seo = destination ? destinationSeo(destination) : null;

  // Relevant content for onward navigation (loaded best-effort after the destination).
  // Tours, stays and other destinations come from the SSR load, so these onward
  // links are in the first response for travellers and crawlers alike.
  $: relatedTours = ((data.tours ?? []) as Array<Tour & { match?: string }>);
  $: popularTours = ((data.popularTours ?? []) as Tour[]);
  $: otherDestinations = ((data.otherDestinations ?? []) as Destination[]);
  // Stays come from the SSR load; the page lays out six and links to the rest.
  $: allLodges = ((data.lodges ?? []) as Lodge[]);
  $: lodges = allLodges.slice(0, 6);

  // The guide's quick facts open the page, beside the overview.
  $: quickFacts = findQuickFacts(destination?.guide ?? []);
  // A second photograph for the guide's photo break: the first one that isn't the hero's.
  $: heroPhoto = destination ? destination.banner_image_url || destination.main_image_url || destination.image_url || '' : '';
  $: breakImage = destination ? [destination.main_image_url, destination.image_url, destination.banner_image_url].find((u) => u && u !== heroPhoto) ?? '' : '';
  let activities: Activity[] = [];
  let tripPoints: TripPoint[] = [];
  $: faqs = ((data.faqs ?? []) as FAQ[]);
  // The questions this page marks up: its own. General ones that round the list
  // out are shown, but marked up on the page that owns them (ownedFaqs).
  $: ownFaqPairs = destination ? faqPairs(ownedFaqs(faqs, { type: 'destinations', id: destination.id })) : [];

  // This destination's FAQs, grouped by their (optional) category for display.
  $: faqGroups = (() => {
    const groups: { category: string; items: FAQ[] }[] = [];
    for (const f of faqs) {
      const cat = (f.category || 'General').trim();
      let g = groups.find((x) => x.category === cat);
      if (!g) {
        g = { category: cat, items: [] };
        groups.push(g);
      }
      g.items.push(f);
    }
    return groups;
  })();

  const roleLabel = (role: TripPoint['role']) =>
    role === 'start' ? 'Trips start here' : role === 'end' ? 'Trips end here' : 'Start & end point';

  $: hasSafety = Boolean(
    destination &&
      (destination.safety_overview ||
        destination.health_vaccinations ||
        destination.security_advice ||
        destination.travel_insurance_note ||
        destination.emergency_contacts)
  );

  const loadRelated = async (dest: Destination) => {
    const [activityRes, tripPointRes] = await Promise.allSettled([
      api.activities.list({ destination_id: dest.id, limit: 3 }),
      api.tripPoints.list({ destination_id: dest.id, limit: 4 })
    ]);

    if (activityRes.status === 'fulfilled') {
      activities = activityRes.value.data.items ?? [];
    }
    if (tripPointRes.status === 'fulfilled') {
      tripPoints = tripPointRes.value.data.items ?? [];
    }
  };

  // Related content (below the fold) loads on the client, once per destination.
  let relatedFor = '';
  $: if (browser && destination?.id && destination.id !== relatedFor) {
    relatedFor = destination.id;
    void loadRelated(destination);
  }

  // The page's onward routes, as plain links (counts only where they help).
  $: quickLinks = destination
    ? [
        relatedTours.length
          ? { label: 'Safaris through here', href: '#tours', count: relatedTours.length }
          : popularTours.length ? { label: 'Popular safaris', href: '#tours', count: 0 } : null,
        lodges.length ? { label: 'Where to stay', href: '#stays', count: allLodges.length } : null,
        tripPoints.length ? { label: 'Getting there', href: '#getting-there', count: 0 } : null,
        faqs.length ? { label: 'Questions', href: '#faqs', count: 0 } : null,
        { label: 'Plan a trip here', href: '/plan-my-trip', count: 0 }
      ].filter(Boolean) as { label: string; href: string; count: number }[]
    : [];
  $: sectionLinks = [
    { label: 'Overview', href: '#overview', count: 0 },
    ...(destination?.guide?.length ? [{ label: 'Travel guide', href: '#guide-top', count: 0 }] : []),
    ...quickLinks.filter((link) => link.href !== '/plan-my-trip'),
    ...(hasSafety ? [{ label: 'Health & safety', href: '#health-safety', count: 0 }] : [])
  ];

  // An ItemList of the tours and stays this page links to, so search engines
  // read the destination as a hub for them.
  $: itemListLd =
    destination && (relatedTours.length || lodges.length)
      ? {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: `Safaris and stays in ${destination.name}`,
          itemListElement: [
            ...relatedTours.map((t) => ({ name: t.title, url: `${origin}/tours/${t.slug}` })),
            ...lodges.map((l) => ({ name: l.name, url: `${origin}/accommodation/${l.slug}` }))
          ].map((item, i) => ({ '@type': 'ListItem', position: i + 1, ...item }))
        }
      : null;

  // Track a page view once per destination.
  let trackedSlug = '';
  $: if (browser && destination && slug && slug !== trackedSlug) {
    trackedSlug = slug;
    trackEvent('destination_page_view', { destination: destination.name });
  }
</script>
<!-- Unique per-destination title and description. -->
<!-- svelte:head must be top level, so the guard lives inside it. -->

{#if !destination}
  <section class="container-shell py-20">
    <ErrorState message="We couldn't load this destination. Please refresh in a moment, or browse our other destinations." />
  </section>
{:else}
  <JsonLd data={breadcrumbLd(origin, [{ name: 'Home', path: '/' }, { name: 'Destinations', path: '/destinations' }, { name: destination.name, path: `/destinations/${destination.slug}` }])} />
  <!-- With a guide, its FAQPage already includes these; otherwise the page carries its own. -->
  {#if !destination.guide?.length && ownFaqPairs.length}<JsonLd data={faqLd(ownFaqPairs)} />{/if}
  <JsonLd data={destinationStructuredData(destination, origin)} />
  <DestinationHero {destination} facts={quickFacts?.items ?? []}>
  {#if itemListLd}<JsonLd data={itemListLd} />{/if}

  <!-- Plan your time here: the page's onward routes in one place, as real links. -->
  {#if sectionLinks.length}
    <nav class="sticky top-[var(--nav-h)] z-20 border-b border-ink/10 bg-surface" aria-label={`Explore ${destination.name}`}>
      <div class="container-shell">
        <ul class="flex gap-7 overflow-x-auto py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {#each sectionLinks as link (link.href)}
            <li>
              <a class="inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap text-[14px] font-semibold text-deep-green transition hover:text-clay" href={link.href}>
                {link.label}{#if link.count}<span class="font-normal text-ink/45">({link.count})</span>{/if}
              </a>
            </li>
          {/each}
        </ul>
      </div>
    </nav>
  {/if}
  </DestinationHero>
{/if}

{#if destination}
  <!-- Long-form destination guide (the editorial "destination template") -->
  {#if destination.guide?.length}
    <DestinationGuide destinationName={destination.name} blocks={destination.guide} reviewedAt={destination.guide_reviewed_at ?? null} extraFaqs={ownFaqPairs} tours={(data.guideTours ?? []) as Tour[]} lodges={(data.guideLodges ?? []) as Lodge[]} {breakImage} />
  {/if}

  <!-- Safaris through this destination: connected tours first, then popular ones -->
  {#if relatedTours.length || popularTours.length}
    <section id="tours" class="scroll-mt-[calc(var(--nav-h)+64px)] border-t border-ink/10 bg-canvas py-16 md:py-24">
      <div class="container-shell">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <SectionHeader
            title={relatedTours.length ? `Safaris through ${destination.name}` : 'Popular safaris'}
            description={relatedTours.length
              ? `Private itineraries that visit ${destination.name} or spend a night at one of its lodges.`
              : `Our most-travelled private safaris — any of them can be shaped to include ${destination.name}.`}
          />
          <a
            class="group inline-flex items-center gap-1.5 text-sm font-semibold text-deep-green transition hover:text-clay"
            href={relatedTours.length ? `/tours?destination=${encodeURIComponent(destination.slug)}` : '/tours'}
          >
            {relatedTours.length ? `All tours in ${destination.name}` : 'Browse all safaris'} <ArrowRight size={16} class="transition group-hover:translate-x-0.5" />
          </a>
        </div>
        {#if relatedTours.length}
          <div class="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 18, stagger: 0.07 }}>
            {#each relatedTours as tour (tour.id)}
              <TourCardRich {tour} />
            {/each}
          </div>
        {/if}
        {#if popularTours.length}
          {#if relatedTours.length}
            <h3 class="type-h3 mt-16 text-heading">Popular safaris</h3>
          {/if}
          <div class={`grid gap-6 sm:grid-cols-2 lg:grid-cols-3 ${relatedTours.length ? 'mt-6' : 'mt-10'}`} use:staggeredCardReveal={{ y: 18, stagger: 0.07 }}>
            {#each popularTours as tour (tour.id)}
              <TourCardRich {tour} />
            {/each}
          </div>
        {/if}
      </div>
    </section>
  {/if}

  <!-- Top things to do (activities) -->
  {#if activities.length}
    <section class="border-t border-ink/10 bg-canvas py-16 md:py-24">
      <div class="container-shell">
        <SectionHeader
          title={`Top experiences in ${destination.name}`}
          description="Stand-out activities our specialists build into trips here — book them as part of your itinerary."
        />
        <div class="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 18, stagger: 0.07 }}>
          {#each activities as activity (activity.id)}
            <ActivityCard {activity} />
          {/each}
        </div>
      </div>
    </section>
  {/if}

  <!-- Where to stay (recommended lodges & camps) -->
  {#if lodges.length}
    <section id="stays" class="scroll-mt-[calc(var(--nav-h)+64px)] bg-linen/45 py-16 md:py-24">
      <div class="container-shell">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <SectionHeader
            title={`Lodges & camps in ${destination.name}`}
            description="Accommodation our specialists recommend and book — chosen for location, comfort and value."
          />
          <a class="group inline-flex items-center gap-1.5 text-sm font-semibold text-deep-green transition hover:text-clay" href={`/accommodation?destination=${encodeURIComponent(destination.name)}`}>
            {allLodges.length > lodges.length ? `See all stays in ${destination.name}` : `Compare stays in ${destination.name}`} <ArrowRight size={16} class="transition group-hover:translate-x-0.5" />
          </a>
        </div>
        <div class="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 18, stagger: 0.07 }}>
          {#each lodges as lodge (lodge.id)}
            <LodgeCard {lodge} />
          {/each}
        </div>
      </div>
    </section>
  {/if}

  <!-- Health & safety: the answer first, the practical notes beside it -->
  {#if hasSafety}
    <section id="health-safety" class="scroll-mt-[calc(var(--nav-h)+64px)] bg-canvas py-16 md:py-24">
      <div class="container-shell grid gap-10 lg:grid-cols-12 lg:gap-14">
        <div class="lg:col-span-5">
          <h2 class="type-h2 text-heading">Staying safe in {destination.name}</h2>
          {#if destination.safety_overview}
            <p class="mt-6 max-w-[60ch] text-base leading-[1.8] text-ink/75">{destination.safety_overview}</p>
          {/if}
          <a class="group mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-deep-green transition hover:text-clay" href="/safety">
            Read the full health &amp; safety guide <ArrowRight size={16} class="transition group-hover:translate-x-0.5" />
          </a>
        </div>
        <dl class="border-t border-ink/15 lg:col-span-7">
          {#each [['Health & vaccinations', destination.health_vaccinations], ['Security', destination.security_advice], ['Travel insurance', destination.travel_insurance_note], ['Emergency contacts', destination.emergency_contacts]] as [label, text] (label)}
            {#if text}
              <div class="grid gap-1.5 border-b border-ink/10 py-5 sm:grid-cols-[190px_minmax(0,1fr)] sm:gap-6">
                <dt class="text-[15px] font-semibold text-heading">{label}</dt>
                <dd class="text-[15px] leading-[1.7] text-ink/75">{text}</dd>
              </div>
            {/if}
          {/each}
        </dl>
      </div>
    </section>
  {/if}

  <!-- Getting there (start & end points) -->
  {#if tripPoints.length}
    <section id="getting-there" class="scroll-mt-[calc(var(--nav-h)+64px)] border-t border-ink/10 bg-canvas py-16 md:py-24">
      <div class="container-shell grid gap-10 lg:grid-cols-12 lg:gap-14">
        <div class="lg:col-span-5">
          <h2 class="type-h2 text-heading">How trips to {destination.name} start and end</h2>
          <p class="mt-6 max-w-[60ch] text-base leading-[1.8] text-ink/70">The airports and hub towns we use as gateways, and how we connect you onward.</p>
        </div>
        <ul class="border-t border-ink/15 lg:col-span-7">
          {#each tripPoints as point (point.id)}
            <li class="border-b border-ink/10 py-5">
              <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h3 class="type-card text-heading">{point.name}{#if point.airport_code}<span class="ml-2 font-sans text-[14px] font-semibold text-ink/50">{point.airport_code}</span>{/if}</h3>
                <span class="text-[13px] font-semibold text-clay">{roleLabel(point.role)}</span>
              </div>
              {#if point.transfer_info || point.description}
                <p class="mt-2 max-w-[68ch] text-[15px] leading-[1.7] text-ink/70">{point.transfer_info || point.description}</p>
              {/if}
            </li>
          {/each}
        </ul>
      </div>
    </section>
  {/if}

  <!-- FAQs attached to this destination (dynamic, imported per-destination) -->
  {#if faqs.length}
    <section id="faqs" class="scroll-mt-[calc(var(--nav-h)+64px)] bg-linen/45 py-16 md:py-24">
      <div class="container-shell grid gap-10 lg:grid-cols-12 lg:gap-14">
        <div class="lg:col-span-4">
          <h2 class="type-h2 text-heading">{destination.name}: your questions, answered</h2>
          <p class="mt-6 text-base leading-[1.8] text-ink/70">Honest, specific answers to the questions we're asked most about this destination.</p>
        </div>
        <div class="grid content-start gap-10 lg:col-span-8">
          {#each faqGroups as group (group.category)}
            <div>
              {#if faqGroups.length > 1}
                <h3 class="mb-3 text-[15px] font-semibold text-clay">{group.category}</h3>
              {/if}
              <FAQAccordion faqs={group.items} headingLevel={faqGroups.length > 1 ? 4 : 3} />
            </div>
          {/each}
        </div>
      </div>
    </section>
  {/if}

  <!-- More destinations to explore -->
  {#if otherDestinations.length}
    <section id="more-destinations" class="bg-canvas py-16 md:py-24">
      <div class="container-shell">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <SectionHeader
            title="More destinations"
            description="Other places our local experts know and love across the region."
          />
          <a class="group inline-flex items-center gap-1.5 text-sm font-semibold text-deep-green transition hover:text-clay" href="/destinations">
            All destinations <ArrowRight size={16} class="transition group-hover:translate-x-0.5" />
          </a>
        </div>
        <div class="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 18, stagger: 0.07 }}>
          {#each otherDestinations as item (item.id)}
            <DestinationCard destination={item} />
          {/each}
        </div>
      </div>
    </section>
  {/if}

  <!-- Plan-your-trip CTA so the page never dead-ends into the footer -->
  <FinalCtaSection
    title={`Ready to explore ${destination.name}?`}
    subtitle="Tell us what you have in mind and a local expert will craft a tailored plan — no payment needed to start."
    primaryLabel="Plan my safari"
    primaryHref="/plan-my-trip"
    secondaryLabel="Talk to an advisor"
    secondaryHref="/contact"
  />
{/if}
