<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowRight, ArrowUpRight, Check, ChevronDown } from '@lucide/svelte';
  import { page } from '$app/stores';
  import FinalCtaSection from '$lib/components/public/FinalCtaSection.svelte';
  import JsonLd from '$lib/components/public/JsonLd.svelte';
  import ResponsiveImage from '$lib/components/public/ResponsiveImage.svelte';
  import TourCardRich from '$lib/components/public/TourCardRich.svelte';
  import StyleSections from '$lib/components/public/style/StyleSections.svelte';
  import { buildStylePage } from '$lib/components/public/style/styleContent';
  import { breadcrumbLd } from '$lib/seo';
  import { SITE_URL } from '$lib/config/env';
  import { canonicalForPath, safeSiteOrigin } from '$lib/seo-policy';
  import { styleStructuredData } from '$lib/components/public/style/styleSeo';
  import type { Destination, Lodge, Tour, TravelStyle } from '$lib/types';
  import type { PageData } from './$types';

  export let data: PageData;

  $: style = data.style as TravelStyle;
  $: others = (data.others ?? []) as TravelStyle[];
  $: tours = (data.tours ?? []) as Tour[];
  $: lodges = (data.lodges ?? []) as Lodge[];
  $: destinations = (data.destinations ?? []) as Destination[];
  $: configuredOrigin = typeof data.publicSettings?.canonical_base_url === 'string' ? data.publicSettings.canonical_base_url : '';
  $: origin = safeSiteOrigin(configuredOrigin || SITE_URL, $page.url.origin);
  $: canonical = canonicalForPath(origin, $page.url.pathname, data.seoOverride?.canonical_url);

  $: blocks = (Array.isArray(style.sections) ? style.sections : []) as Record<string, unknown>[];
  $: model = buildStylePage(blocks, tours, lodges, destinations);
  $: desires = (style.desires ?? []).filter((d) => d && d.trim());
  $: concerns = (style.concerns ?? []).filter((c) => c && c.trim());

  // The opening prose leads the page; the "what you are after" band follows it,
  // then everything else in the editor's order.
  $: leadSection = model.sections[0]?.kind === 'prose' && model.sections[0].lead ? model.sections[0] : null;
  $: restSections = leadSection ? model.sections.slice(1) : model.sections;
  $: hasFaq = model.sections.some((s) => s.kind === 'faq');
  $: hasCuratedTours = model.sections.some((s) => s.kind === 'tours');
  $: hasClosingCta = model.sections.some((s) => s.kind === 'cta' && s.final);
  $: fallbackTours = hasCuratedTours ? [] : tours.filter((t) => t.is_featured).slice(0, 3);
  // Concerns read as questions; once a FAQ block answers them, listing them again is noise.
  $: showConcerns = concerns.length > 0 && !hasFaq;
  $: showWants = desires.length > 0 || showConcerns;

  $: toursHref = data.categorySlug
    ? `/tours?category=${data.categorySlug}`
    : style.persona ? `/tours?persona=${style.persona}` : '/tours';
  $: planHref = `/plan-my-trip${style.persona ? `?persona=${style.persona}` : ''}`;

  $: nav = [
    ...(leadSection?.nav ? [{ id: leadSection.id, label: leadSection.nav }] : []),
    ...(showWants ? [{ id: 'what-you-want', label: leadSection ? 'What you get' : 'Overview' }] : []),
    ...restSections.filter((s) => s.nav).map((s) => ({ id: s.id, label: s.nav }))
  ];
  $: quickNav = nav.filter((item) => ['Overview', 'Why us', 'Prices', 'Itineraries', 'FAQ'].includes(item.label));

  $: structuredData = styleStructuredData({
    name: style.name,
    description: data.seoOverride?.meta_description?.trim() || style.meta_description?.trim() || style.description?.trim() || '',
    url: canonical, origin, image: style.hero_image_url || style.image_url, sections: model.sections
  });
  $: itinerarySection = model.sections.find((s) => s.kind === 'tours');

  // Highlight the section being read in the sticky bar: the last one whose top
  // has passed a line ~a third down the screen. Scroll-driven rather than an
  // IntersectionObserver so sections without a nav entry don't blank the state.
  let active = '';
  let mobileNav: HTMLDetailsElement;
  let desktopNav: HTMLDetailsElement;
  onMount(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.33;
      let current = '';
      for (const n of nav) {
        const el = document.getElementById(n.id);
        if (el && el.getBoundingClientRect().top <= line) current = n.id;
      }
      if (current === active) return;
      active = current;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      for (const menu of [mobileNav, desktopNav]) {
        if (menu?.open) {
          menu.open = false;
          menu.querySelector('summary')?.focus();
        }
      }
    };
    const onClick = (event: MouseEvent) => {
      for (const menu of [mobileNav, desktopNav]) {
        if (menu?.open && event.target instanceof Node && !menu.contains(event.target)) menu.open = false;
      }
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('keydown', onKey);
    window.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('click', onClick);
      if (frame) cancelAnimationFrame(frame);
    };
  });
</script>

<JsonLd
  data={breadcrumbLd(origin, [
    { name: 'Home', path: '/' },
    { name: 'Travel Styles', path: '/travel-styles' },
    { name: style.name, path: `/travel-styles/${style.slug}` }
  ])}
/>
<JsonLd data={structuredData} />

<div class="travel-style-page min-w-0">
<!-- ── Hero ───────────────────────────────────────────────────────────────── -->
<section class="relative isolate overflow-hidden bg-deep-green text-white">
  {#if style.hero_image_url}
    <ResponsiveImage
      src={style.hero_image_url}
      alt=""
      sizes="100vw"
      width={1920}
      eager
      priority
      imgClass="absolute inset-0 -z-10 h-full w-full object-cover"
    />
    <div class="absolute inset-0 -z-10 bg-ink/40 bg-gradient-to-r from-ink/70 via-ink/40 to-ink/20 md:bg-transparent md:from-ink/85 md:via-ink/55 md:to-ink/10"></div>
    <div class="absolute inset-x-0 bottom-0 -z-10 h-48 bg-gradient-to-t from-ink/75 to-transparent"></div>
  {/if}

  <div class="container-shell flex min-h-[min(780px,85svh)] flex-col justify-end pb-8 pt-20 md:pb-10 md:pt-28">
    <div class="max-w-3xl">
      <nav class="text-[11px] uppercase tracking-[0.24em] text-white/60" aria-label="Breadcrumb">
        <a class="transition hover:text-goldfinch-gold" href="/">Home</a>
        <span class="px-2 text-white/30">/</span>
        <a class="transition hover:text-goldfinch-gold" href="/travel-styles">Travel styles</a>
      </nav>

      <p class="mt-8 text-[11px] font-semibold uppercase tracking-[0.26em] text-goldfinch-gold">A journey shaped around you</p>
      <h1 class="mt-4 max-w-[15ch] font-serif text-[clamp(2.75rem,6vw,5.5rem)] font-light leading-[1.02]">
        {style.name}
      </h1>
      {#if style.emotional_promise?.trim()}
        <p class="mt-5 max-w-[38ch] font-serif text-[23px] font-light leading-snug text-white/95 md:text-[30px]">{style.emotional_promise}</p>
      {/if}
      {#if style.description}
        <p class="mt-5 max-w-[58ch] text-[15px] leading-7 text-white/80 md:text-[16px]">{style.description}</p>
      {/if}

      <div class="mt-8 grid gap-3 min-[400px]:flex min-[400px]:flex-wrap">
        <a class="inline-flex min-h-12 items-center justify-center gap-2 bg-goldfinch-gold px-6 py-3 text-sm font-semibold tracking-wide text-ink transition hover:brightness-95" href={planHref}>
          Plan this trip
          <ArrowRight class="h-4 w-4" />
        </a>
        <a class="inline-flex min-h-12 items-center justify-center border border-white/30 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/10" href={itinerarySection ? `#${itinerarySection.id}` : toursHref}>
          Browse itineraries
        </a>
      </div>
    </div>

    {#if model.trust.length}
      <ul class="mt-9 grid gap-x-8 gap-y-3 border-t border-white/20 pt-6 sm:grid-cols-2 lg:grid-cols-4">
        {#each model.trust as item, k (k)}
          <li class="flex items-start gap-3 text-[13px] leading-6 text-white/90">
            <Check class="mt-1 h-4 w-4 shrink-0 text-goldfinch-gold" strokeWidth={2.4} />
            {item}
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</section>

<!-- ── Section bar ────────────────────────────────────────────────────────── -->
{#if nav.length > 2}
  <div class="sticky top-[var(--nav-h,70px)] z-30 border-b border-ink/15 bg-canvas shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
    <div class="container-shell">
      <details bind:this={mobileNav} class="page-menu relative md:hidden">
        <summary class="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-sm font-semibold text-heading">
          <span><span class="mr-2 text-[10px] font-medium uppercase tracking-[0.12em] text-clay">Explore</span>{nav.find((item) => item.id === active)?.label || 'On this page'}</span>
          <ChevronDown size={17} class="shrink-0" />
        </summary>
        <nav class="absolute inset-x-0 top-full grid max-h-[65svh] grid-cols-2 gap-1 overflow-y-auto border border-ink/10 bg-canvas p-2 shadow-lg" aria-label="On this page">
          {#each nav as item (item.id)}
            <a href={`#${item.id}`} aria-current={active === item.id ? 'location' : undefined} on:click={() => (mobileNav.open = false)} class={`flex min-h-11 items-center px-3 py-3 text-[13px] ${active === item.id ? 'bg-deep-green text-white' : 'text-heading hover:bg-linen'}`}>{item.label}</a>
          {/each}
        </nav>
      </details>
      <div class="hidden items-center gap-4 md:flex">
      <nav class="relative -ml-3.5 flex min-w-0 items-center" aria-label="Quick sections">
        {#each quickNav as item (item.id)}
          <a
            data-nav={item.id}
            href={`#${item.id}`}
            aria-current={active === item.id ? 'location' : undefined}
            class={`relative shrink-0 whitespace-nowrap px-3.5 py-4 text-[13px] font-medium transition ${
              active === item.id ? 'text-heading' : 'text-ink/50 hover:text-heading'
            }`}
          >
            {item.label}
            <span class={`absolute inset-x-3.5 bottom-0 h-0.5 bg-goldfinch-gold transition-opacity ${active === item.id ? 'opacity-100' : 'opacity-0'}`}></span>
          </a>
        {/each}
      </nav>
      <details bind:this={desktopNav} class="page-menu relative">
        <summary class="flex min-h-14 cursor-pointer list-none items-center gap-2 border-l border-ink/10 pl-5 text-[13px] font-medium text-heading">
          {active && !quickNav.some((item) => item.id === active) ? nav.find((item) => item.id === active)?.label : 'All sections'} <ChevronDown size={14} />
        </summary>
        <nav class="absolute left-0 top-full grid max-h-[65svh] w-80 grid-cols-2 gap-1 overflow-y-auto border border-ink/10 bg-canvas p-2 shadow-lg" aria-label="All page sections">
          {#each nav as item (item.id)}
            <a href={`#${item.id}`} aria-current={active === item.id ? 'location' : undefined} on:click={() => (desktopNav.open = false)} class={`flex min-h-11 items-center px-3 py-3 text-[13px] ${active === item.id ? 'bg-deep-green text-white' : 'text-heading hover:bg-linen'}`}>{item.label}</a>
          {/each}
        </nav>
      </details>
      <a class="ml-auto hidden min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap bg-deep-green px-4 text-[12px] font-semibold text-white transition hover:bg-forest lg:inline-flex" href={planHref}>
        Plan this trip <ArrowRight class="h-3.5 w-3.5" />
      </a>
      </div>
    </div>
  </div>
{/if}

{#if leadSection}
  <StyleSections sections={[leadSection]} prevTone="dark" {toursHref} {planHref} />
{/if}

<!-- ── What you are after / what we plan around ───────────────────────────── -->
{#if showWants}
  <section id="what-you-want" class="scroll-mt-[calc(var(--nav-h,70px)+64px)] bg-linen/45 py-14 md:py-24">
    <div class="container-shell">
      {#if desires.length}
        <div class="grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-16">
          <div class="lg:col-span-6">
            <p class="text-[11px] font-medium uppercase tracking-[0.26em] text-clay">Designed around you</p>
            <h2 class="mt-4 font-serif text-[32px] font-light leading-[1.08] text-heading md:text-[44px]">Everything this trip is built around</h2>
          </div>
          <p class="max-w-[56ch] text-[15px] leading-7 text-ink/65 lg:col-span-6">
            What travellers like you tell us matters most, and what every itinerary in this style is planned to deliver.
          </p>
        </div>
        <ul class="mt-12 grid gap-x-10 border-t border-ink/10 sm:grid-cols-2 lg:grid-cols-3 md:mt-14">
          {#each desires as d, k (k)}
            <li class="flex items-start gap-3.5 border-b border-ink/10 py-4 text-[15px] leading-6 text-ink/80">
              <span class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center bg-deep-green/10">
                <Check class="h-3 w-3 text-deep-green" strokeWidth={3} />
              </span>
              {d}
            </li>
          {/each}
        </ul>
      {/if}

      {#if showConcerns}
        <div class={desires.length ? 'mt-20' : ''}>
          <p class="text-[11px] font-medium uppercase tracking-[0.26em] text-clay">What we plan around</p>
          <div class="mt-8 grid gap-8 md:grid-cols-3">
            {#each concerns as c, k (k)}
              <blockquote class="border-l-2 border-goldfinch-gold/60 pl-5 font-serif text-[21px] font-light leading-[1.45] text-heading">“{c}”</blockquote>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </section>
{/if}

<StyleSections
  sections={restSections}
  prevTone={showWants ? 'linen' : leadSection ? 'canvas' : 'dark'}
  {toursHref}
  {planHref}
/>

<!-- ── Fallback itineraries, only when the editor has not curated any ─────── -->
{#if fallbackTours.length}
  <section class="border-t border-ink/10 bg-canvas py-14 md:py-24">
    <div class="container-shell">
      <div class="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p class="text-[11px] font-medium uppercase tracking-[0.26em] text-clay">Itineraries</p>
          <h2 class="mt-4 font-serif text-[32px] font-light leading-[1.08] text-heading md:text-[44px]">Somewhere to start</h2>
        </div>
        <a class="group inline-flex items-center gap-2 border-b border-deep-green/30 pb-1 text-sm font-semibold text-deep-green transition hover:border-deep-green" href={toursHref}>
          Browse all itineraries
          <ArrowUpRight class="h-4 w-4" />
        </a>
      </div>
      <div class="mt-12 grid gap-6 md:mt-16 md:grid-cols-2 lg:grid-cols-3">
        {#each fallbackTours as tour (tour.id)}
          <TourCardRich {tour} />
        {/each}
      </div>
    </div>
  </section>
{/if}

<!-- ── A closing call to action when the editor has not written one ───────── -->
{#if !hasClosingCta}
  <FinalCtaSection
    eyebrow="Start planning"
    title="Let's shape your trip"
    subtitle="Tell us your dates and who is travelling. We'll send a personal route and a clear price, with no obligation."
    primaryLabel="Plan this trip"
    primaryHref={planHref}
    secondaryLabel="Browse itineraries"
    secondaryHref={toursHref}
  />
{/if}

<!-- ── Other styles ───────────────────────────────────────────────────────── -->
{#if others.length}
  <section class="bg-canvas py-14 md:py-24">
    <div class="container-shell">
      <div class="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p class="text-[11px] font-medium uppercase tracking-[0.26em] text-clay">Other ways to travel</p>
          <h2 class="mt-4 font-serif text-[30px] font-light leading-[1.1] text-heading md:text-[38px]">Explore another travel style</h2>
        </div>
        <a class="group inline-flex items-center gap-2 border-b border-deep-green/30 pb-1 text-sm font-semibold text-deep-green transition hover:border-deep-green" href="/travel-styles">
          All travel styles
          <ArrowUpRight class="h-4 w-4" />
        </a>
      </div>
      <div class="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {#each others.slice(0, 6) as o (o.slug)}
          {@const img = o.hero_image_url || o.image_url}
          {#if img}
            <a class="group relative isolate flex aspect-[16/10] items-end overflow-hidden bg-deep-green p-6" href={`/travel-styles/${o.slug}`}>
              <ResponsiveImage src={img} alt="" sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" width={720} imgClass="absolute inset-0 -z-10 h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]" />
              <div class="absolute inset-0 -z-10 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent"></div>
              <div class="flex w-full items-end justify-between gap-4">
                <div class="min-w-0">
                  <span class="font-serif text-[26px] font-light leading-tight text-white">{o.name}</span>
                  {#if o.emotional_promise}<p class="mt-1 truncate text-[13px] text-white/70">{o.emotional_promise}</p>{/if}
                </div>
                <ArrowUpRight class="h-5 w-5 shrink-0 text-white/70 transition group-hover:text-goldfinch-gold" />
              </div>
            </a>
          {:else}
            <!-- No image: a quiet text tile rather than an empty colour block. -->
            <a class="group flex min-w-0 items-center justify-between gap-4 border border-ink/10 bg-surface px-6 py-6 transition hover:border-goldfinch-gold/60 hover:bg-linen/40" href={`/travel-styles/${o.slug}`}>
              <div class="min-w-0">
                <span class="font-serif text-[24px] font-light leading-tight text-heading">{o.name}</span>
                {#if o.emotional_promise}<p class="mt-1 truncate text-[13px] text-ink/55">{o.emotional_promise}</p>{/if}
              </div>
              <ArrowUpRight class="h-5 w-5 shrink-0 text-ink/30 transition group-hover:text-deep-green" />
            </a>
          {/if}
        {/each}
      </div>
    </div>
  </section>
{/if}
</div>

<style>
  .page-menu > summary::-webkit-details-marker { display: none; }
  .travel-style-page { overflow-wrap: anywhere; }
  .travel-style-page :global(h1), .travel-style-page :global(h2) { text-wrap: balance; }
  .travel-style-page :global(a:focus-visible), .travel-style-page :global(summary:focus-visible) {
    outline: 2px solid currentColor;
    outline-offset: 4px;
  }
</style>
