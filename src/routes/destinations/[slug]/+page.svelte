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
  import BlogCard from '$lib/components/public/BlogCard.svelte';
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
  import { FileCheck, HeartPulse, Phone, Plane, Shield, ShieldCheck } from '@lucide/svelte';
  import type { Activity, BlogPost, Destination, FAQ, Lodge, Tour, TripPoint } from '$lib/types';
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
  let recentPosts: BlogPost[] = [];
  // Stays come from the SSR load; the page lays out twelve and links to the rest.
  $: allLodges = ((data.lodges ?? []) as Lodge[]);
  $: lodges = allLodges.slice(0, 12);
  let activities: Activity[] = [];
  let tripPoints: TripPoint[] = [];
  $: faqs = ((data.faqs ?? []) as FAQ[]);

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
    const [postRes, activityRes, tripPointRes] = await Promise.allSettled([
      api.blog.list({ limit: 3 }),
      api.activities.list({ destination_id: dest.id, limit: 3 }),
      api.tripPoints.list({ destination_id: dest.id, limit: 4 })
    ]);

    if (postRes.status === 'fulfilled') {
      recentPosts = postRes.value.data.items ?? [];
    }
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
<svelte:head>
  <title>{seo?.title || 'Destination unavailable | Emnel Adventures'}</title>
  {#if seo?.description}
    <meta name="description" content={seo.description} />
  {/if}
  {#if !destination}
    <meta name="robots" content="noindex, follow" />
  {/if}
</svelte:head>


{#if !destination}
  <section class="container-shell py-20">
    <ErrorState message="We couldn't load this destination. Please refresh in a moment, or browse our other destinations." />
  </section>
{:else}
  <JsonLd data={breadcrumbLd(origin, [{ name: 'Home', path: '/' }, { name: 'Destinations', path: '/destinations' }, { name: destination.name, path: `/destinations/${destination.slug}` }])} />
  <!-- With a guide, its FAQPage already includes these; otherwise the page carries its own. -->
  {#if !destination.guide?.length && faqPairs(faqs).length}<JsonLd data={faqLd(faqPairs(faqs))} />{/if}
  <JsonLd data={destinationStructuredData(destination, origin)} />
  <DestinationHero {destination}>
  {#if itemListLd}<JsonLd data={itemListLd} />{/if}

  <!-- Plan your time here: the page's onward routes in one place, as real links. -->
  {#if sectionLinks.length}
    <nav class="sticky top-[var(--nav-h)] z-20 border-b border-ink/10 bg-surface" aria-label={`Explore ${destination.name}`}>
      <div class="container-shell">
        <ul class="flex gap-6 overflow-x-auto py-5">
          {#each sectionLinks as link (link.href)}
            <li>
              <a class="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[13px] font-semibold text-deep-green hover:underline hover:underline-offset-4" href={link.href}>
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
    <DestinationGuide destinationName={destination.name} blocks={destination.guide} reviewedAt={destination.guide_reviewed_at ?? null} extraFaqs={faqPairs(faqs)} tours={(data.guideTours ?? []) as Tour[]} lodges={(data.guideLodges ?? []) as Lodge[]} />
  {/if}

  <!-- Safaris through this destination: connected tours first, then popular ones -->
  {#if relatedTours.length || popularTours.length}
    <section id="tours" class="scroll-mt-[calc(var(--nav-h)+96px)] border-t border-ink/[0.06] bg-sand/30 py-14 md:py-20">
      <div class="container-shell">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <SectionHeader
            eyebrow="Safaris"
            title={relatedTours.length ? `Safaris through ${destination.name}` : 'Popular safaris'}
            description={relatedTours.length
              ? `Private itineraries that visit ${destination.name} or spend a night at one of its lodges.`
              : `Our most-travelled private safaris — any of them can be shaped to include ${destination.name}.`}
          />
          <a
            class="inline-flex items-center gap-1.5 text-sm font-semibold text-forest transition hover:text-heading"
            href={relatedTours.length ? `/tours?destination=${encodeURIComponent(destination.slug)}` : '/tours'}
          >
            {relatedTours.length ? `All tours in ${destination.name}` : 'Browse all safaris'} <ArrowRight size={16} />
          </a>
        </div>
        {#if relatedTours.length}
          <div class="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 18, stagger: 0.07 }}>
            {#each relatedTours as tour (tour.id)}
              <TourCardRich {tour} />
            {/each}
          </div>
        {/if}
        {#if popularTours.length}
          {#if relatedTours.length}
            <p class="mt-14 text-[11px] font-semibold uppercase tracking-[0.2em] text-heading">Popular safaris</p>
          {/if}
          <div class={`grid gap-6 sm:grid-cols-2 lg:grid-cols-3 ${relatedTours.length ? 'mt-6' : 'mt-9'}`} use:staggeredCardReveal={{ y: 18, stagger: 0.07 }}>
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
    <section class="py-14 md:py-20">
      <div class="container-shell">
        <SectionHeader
          eyebrow="Things to do"
          title={`Top experiences in ${destination.name}`}
          description="Stand-out activities our specialists build into trips here — book them as part of your itinerary."
        />
        <div class="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 18, stagger: 0.07 }}>
          {#each activities as activity (activity.id)}
            <ActivityCard {activity} />
          {/each}
        </div>
      </div>
    </section>
  {/if}

  <!-- Where to stay (recommended lodges & camps) -->
  {#if lodges.length}
    <section id="stays" class="scroll-mt-[calc(var(--nav-h)+96px)] border-t border-ink/[0.06] bg-canvas py-14 md:py-20">
      <div class="container-shell">
        <SectionHeader
          eyebrow="Where to stay"
          title={`Lodges & camps in ${destination.name}`}
          description="Accommodation our specialists recommend and book — chosen for location, comfort and value."
        />
        <div class="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 18, stagger: 0.07 }}>
          {#each lodges as lodge (lodge.id)}
            <LodgeCard {lodge} />
          {/each}
        </div>
        <a class="mt-10 inline-flex items-center gap-2 border-b border-deep-green/30 pb-1 text-sm font-semibold text-deep-green transition hover:border-deep-green" href={`/accommodation?destination=${encodeURIComponent(destination.name)}`}>
          {allLodges.length > lodges.length ? `See all stays in ${destination.name}` : `Compare stays in ${destination.name}`} <ArrowRight size={14} />
        </a>
      </div>
    </section>
  {/if}

  <!-- Health & safety -->
  {#if hasSafety}
    <section id="health-safety" class="scroll-mt-[calc(var(--nav-h)+96px)] py-14 md:py-20">
      <div class="container-shell">
        <SectionHeader
          eyebrow="Health &amp; safety"
          title={`Staying safe in ${destination.name}`}
          description="Honest, practical guidance for your trip. See our full guide for more."
        />
        <div class="mt-9 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          {#if destination.safety_overview}
            <div class="rounded-2xl border border-ink/10 bg-surface p-6 shadow-soft">
              <div class="flex items-center gap-3">
                <span class="grid h-11 w-11 place-items-center rounded-xl bg-forest/10 text-forest"><ShieldCheck size={20} /></span>
                <h3 class="text-lg font-serif font-normal text-ink">Is it safe?</h3>
              </div>
              <p class="mt-3 text-sm leading-7 text-ink/70">{destination.safety_overview}</p>
            </div>
          {/if}

          <div class="grid gap-4">
            {#if destination.health_vaccinations}
              <div class="flex gap-3 rounded-2xl border border-ink/10 bg-surface p-5 shadow-soft">
                <span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-clay/10 text-clay"><HeartPulse size={18} /></span>
                <div><p class="text-sm font-bold text-ink">Health &amp; vaccinations</p><p class="mt-1 text-sm leading-6 text-ink/65">{destination.health_vaccinations}</p></div>
              </div>
            {/if}
            {#if destination.security_advice}
              <div class="flex gap-3 rounded-2xl border border-ink/10 bg-surface p-5 shadow-soft">
                <span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-forest/10 text-forest"><Shield size={18} /></span>
                <div><p class="text-sm font-bold text-ink">Security</p><p class="mt-1 text-sm leading-6 text-ink/65">{destination.security_advice}</p></div>
              </div>
            {/if}
            {#if destination.travel_insurance_note}
              <div class="flex gap-3 rounded-2xl border border-ink/10 bg-surface p-5 shadow-soft">
                <span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-goldfinch-gold/15 text-goldfinch-gold"><FileCheck size={18} /></span>
                <div><p class="text-sm font-bold text-ink">Travel insurance</p><p class="mt-1 text-sm leading-6 text-ink/65">{destination.travel_insurance_note}</p></div>
              </div>
            {/if}
            {#if destination.emergency_contacts}
              <div class="flex gap-3 rounded-2xl border border-ink/10 bg-surface p-5 shadow-soft">
                <span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-forest/10 text-forest"><Phone size={18} /></span>
                <div><p class="text-sm font-bold text-ink">Emergency contacts</p><p class="mt-1 text-sm leading-6 text-ink/65">{destination.emergency_contacts}</p></div>
              </div>
            {/if}
          </div>
        </div>
        <a class="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-forest transition hover:text-heading" href="/safety">
          Read the full health &amp; safety guide <ArrowRight size={16} />
        </a>
      </div>
    </section>
  {/if}

  <!-- Getting there (start & end points) -->
  {#if tripPoints.length}
    <section id="getting-there" class="scroll-mt-[calc(var(--nav-h)+96px)] border-t border-ink/[0.06] bg-sand/30 py-14 md:py-20">
      <div class="container-shell">
        <SectionHeader
          eyebrow="Getting there"
          title={`How trips to ${destination.name} start and end`}
          description="The airports and hub towns we use as gateways — and how we connect you onward."
        />
        <div class="mt-9 grid gap-5 sm:grid-cols-2">
          {#each tripPoints as point (point.id)}
            <div class="flex gap-4 rounded-2xl border border-ink/10 bg-surface p-5 shadow-soft">
              <div class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-forest/10 text-forest">
                <Plane size={20} />
              </div>
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="text-base font-serif font-normal text-ink">{point.name}</h3>
                  {#if point.airport_code}
                    <span class="rounded-md bg-forest/10 px-1.5 py-0.5 font-mono text-[11px] font-bold text-forest">{point.airport_code}</span>
                  {/if}
                </div>
                <p class="mt-0.5 text-xs font-semibold uppercase tracking-[0.1em] text-clay">{roleLabel(point.role)}</p>
                {#if point.transfer_info}
                  <p class="mt-2 text-sm leading-6 text-ink/70">{point.transfer_info}</p>
                {:else if point.description}
                  <p class="mt-2 text-sm leading-6 text-ink/70">{point.description}</p>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    </section>
  {/if}

  <!-- FAQs attached to this destination (dynamic, imported per-destination) -->
  {#if faqs.length}
    <section id="faqs" class="scroll-mt-[calc(var(--nav-h)+96px)] border-t border-ink/[0.06] py-14 md:py-20">
      <div class="container-shell">
        <SectionHeader
          eyebrow="Good to know"
          title={`${destination.name} — your questions, answered`}
          description="Honest, specific answers to the questions we're asked most about this destination."
        />
        <div class="mt-9 grid gap-8">
          {#each faqGroups as group (group.category)}
            <div>
              {#if faqGroups.length > 1}
                <p class="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-clay">{group.category}</p>
              {/if}
              <FAQAccordion faqs={group.items} />
            </div>
          {/each}
        </div>
      </div>
    </section>
  {/if}

  <!-- More destinations to explore -->
  {#if otherDestinations.length}
    <section id="more-destinations" class="py-14 md:py-20">
      <div class="container-shell">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <SectionHeader
            eyebrow="Keep exploring"
            title="More destinations"
            description="Other places our local experts know and love across the region."
          />
          <a
            class="inline-flex items-center gap-1.5 text-sm font-semibold text-forest transition hover:text-heading"
            href="/destinations"
          >
            All destinations <ArrowRight size={16} />
          </a>
        </div>
        <div class="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 18, stagger: 0.07 }}>
          {#each otherDestinations as item (item.id)}
            <DestinationCard destination={item} />
          {/each}
        </div>
      </div>
    </section>
  {/if}

  <!-- Recent stories -->
  {#if recentPosts.length}
    <section class="border-t border-ink/[0.06] bg-sand/30 py-14 md:py-20">
      <div class="container-shell">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <SectionHeader
            eyebrow="Stories &amp; guides"
            title="From the journal"
            description="Travel inspiration, tips and stories from the field."
          />
          <a
            class="inline-flex items-center gap-1.5 text-sm font-semibold text-forest transition hover:text-heading"
            href="/blog"
          >
            Read the blog <ArrowRight size={16} />
          </a>
        </div>
        <div class="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 18, stagger: 0.07 }}>
          {#each recentPosts as post (post.id)}
            <BlogCard {post} />
          {/each}
        </div>
      </div>
    </section>
  {/if}

  <!-- Plan-your-trip CTA so the page never dead-ends into the footer -->
  <FinalCtaSection
    eyebrow="Start planning"
    title={`Ready to explore ${destination.name}?`}
    subtitle="Tell us what you have in mind and a local expert will craft a tailored plan — no payment needed to start."
    primaryLabel="Plan My Safari"
    primaryHref="/plan-my-trip"
    secondaryLabel="Talk to an Advisor"
    secondaryHref="/contact"
  />
{/if}
