<script lang="ts">
  import { page } from '$app/stores';
  import { ArrowRight, ChevronDown, MapPin, MessageCircle, Quote, Search, ShieldCheck, Sparkles, X } from '@lucide/svelte';
  import { staggeredCardReveal, fadeUpOnScroll, revealHeading } from '$lib/animations/motion';
  import { origUrl } from '$lib/img';
  import { lodgeImage, lodgeRating } from '$lib/lodge';
  import LodgeCard from '$lib/components/public/LodgeCard.svelte';
  import ResponsiveImage from '$lib/components/public/ResponsiveImage.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import EmptyState from '$lib/components/public/EmptyState.svelte';
  import type { Lodge } from '$lib/types';
  import { TIER_OPTIONS, normalizeTier, tierRank } from '$lib/tiers';
  import type { PageData } from './$types';

  export let data: PageData;

  // lodges + loadFailed are SSR-loaded in +page.ts.
  $: lodges = (data.lodges ?? []) as Lodge[];
  $: loadFailed = data.loadFailed;

  let search = '';
  let activeDestination = 'All';
  let activeLevel = 'All';
  let activeType = 'All';
  let sortBy = 'recommended';

  // Seed the filters from ?level= / ?type= / ?destination= so the nav mega-menu's
  // "Browse by Style" links land pre-filtered. Re-applies only when the query
  // string itself changes, so in-page filter changes are never overridden.
  let lastQuery = '';
  $: if ($page.url.search !== lastQuery) {
    lastQuery = $page.url.search;
    const sp = $page.url.searchParams;
    const lvl = sp.get('level');
    const typ = sp.get('type');
    const dst = sp.get('destination');
    const q = sp.get('search');
    if (lvl) activeLevel = lvl;
    if (typ) activeType = typ;
    if (dst) activeDestination = dst;
    if (q) search = q;
  }

  // Premium-first (Ultra Luxury → Essential), from the shared tier vocabulary.
  const LEVELS = [{ value: 'All', label: 'All styles' }, ...[...TIER_OPTIONS].reverse()];
  const TYPES: Record<string, string> = {
    tented_camp: 'Tented camp',
    lodge: 'Lodge',
    hotel: 'Hotel',
    mobile_camp: 'Mobile camp',
    treehouse: 'Treehouse'
  };
  const SORTS = [
    { value: 'recommended', label: 'Recommended' },
    { value: 'luxury', label: 'Luxury first' },
    { value: 'price_asc', label: 'Price: low to high' },
    { value: 'price_desc', label: 'Price: high to low' },
    { value: 'rated', label: 'Highest rated' },
    { value: 'name', label: 'Name (A–Z)' }
  ];

  $: destinations = ['All', ...new Set(lodges.map((l) => l.destinations?.name).filter((n): n is string => Boolean(n)))].sort((a, b) => (a === 'All' ? -1 : a.localeCompare(b)));
  $: typesPresent = [...new Set(lodges.map((l) => l.lodge_type))];

  // Real hero image — a featured (or the first) property that actually has a photo.
  $: heroLodge = (() => {
    const withImg = lodges.filter((l) => lodgeImage(l));
    return withImg.find((l) => l.is_featured) ?? withImg[0] ?? null;
  })();
  $: heroImageSrc = heroLodge ? origUrl(heroLodge, 'hero_image_url', 'image_url') : '';
  $: heroImageFallback = heroLodge ? lodgeImage(heroLodge) : '';

  // Honest, count-derived stats (chosen to read well on the real catalogue).
  $: stats = [
    { n: lodges.length, s: '', l: 'Hand-picked stays' },
    { n: lodges.filter((l) => ['luxury', 'ultra_luxury'].includes(normalizeTier(l.accommodation_level))).length, s: '', l: 'Luxury camps' },
    { n: lodges.filter((l) => l.lodge_type === 'tented_camp').length, s: '', l: 'Tented camps' },
    { n: lodges.filter((l) => l.lodge_type === 'lodge').length, s: '', l: 'Safari lodges' }
  ];

  $: activeFilters = [
    activeDestination !== 'All' ? { key: 'destination', label: activeDestination, clear: () => (activeDestination = 'All') } : null,
    activeLevel !== 'All' ? { key: 'level', label: LEVELS.find((l) => l.value === activeLevel)?.label ?? activeLevel, clear: () => (activeLevel = 'All') } : null,
    activeType !== 'All' ? { key: 'type', label: TYPES[activeType] ?? activeType, clear: () => (activeType = 'All') } : null,
    search.trim() ? { key: 'search', label: `“${search.trim()}”`, clear: () => (search = '') } : null
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

  $: matched = lodges
    .filter((l) => activeDestination === 'All' || l.destinations?.name === activeDestination)
    .filter((l) => activeLevel === 'All' || normalizeTier(l.accommodation_level) === activeLevel)
    .filter((l) => activeType === 'All' || l.lodge_type === activeType)
    .filter((l) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return `${l.name} ${l.destinations?.name ?? ''} ${(l.best_for ?? []).join(' ')} ${l.why_we_recommend ?? ''}`.toLowerCase().includes(q);
    });

  $: sorted = matched.slice().sort((a, b) => {
    switch (sortBy) {
      case 'luxury':
        return tierRank(b.accommodation_level) - tierRank(a.accommodation_level) || a.name.localeCompare(b.name);
      case 'price_asc':
        return (a.price_per_night_from ?? Infinity) - (b.price_per_night_from ?? Infinity);
      case 'price_desc':
        return (b.price_per_night_from ?? -1) - (a.price_per_night_from ?? -1);
      case 'rated':
        return (lodgeRating(b) ?? 0) - (lodgeRating(a) ?? 0);
      case 'name':
        return a.name.localeCompare(b.name);
      default: // recommended: featured first, then rating, then name
        return Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured)) || (lodgeRating(b) ?? 0) - (lodgeRating(a) ?? 0) || a.name.localeCompare(b.name);
    }
  });

  // When browsing the default view, let the top featured property headline the page.
  $: isDefaultView = !activeFilters.length && sortBy === 'recommended';
  $: featuredLodge = isDefaultView ? sorted.find((l) => l.is_featured && lodgeImage(l)) ?? null : null;
  $: gridLodges = featuredLodge ? sorted.filter((l) => l.id !== featuredLodge?.id) : sorted;

  const heroChips = ['Luxury', 'Tented camps', 'Family stays', 'Romantic hideaways', 'Beach retreats', 'Private conservancies'];
  const trust = ['Personally visited', 'Booked & managed for you', 'Location-first choices', 'Honest guidance'];

  const countUp = (node: HTMLElement, target: number) => {
    let done = false;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || done) return;
        done = true;
        const dur = 1100;
        const start = performance.now();
        const step = (now: number) => {
          const p = Math.min(1, (now - start) / dur);
          node.textContent = String(Math.round((1 - Math.pow(1 - p, 3)) * target));
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      },
      { threshold: 0.5 }
    );
    io.observe(node);
    return { destroy: () => io.disconnect() };
  };
</script>

<svelte:head>
  <title>Where to Stay in Tanzania — Hand-Picked Safari Lodges & Camps | Emnel Adventures</title>
  <meta
    name="description"
    content="Hand-picked safari lodges, tented camps and beach hotels across Tanzania's Serengeti, Ngorongoro, Tarangire, Ruaha, Kilimanjaro and Zanzibar — personally chosen and booked by Emnel Adventures."
  />
</svelte:head>

<!-- ── cinematic hero ─────────────────────────────────────────────────────── -->
<section class="relative overflow-hidden bg-deep-green text-white">
  {#if heroImageSrc}
    <ResponsiveImage src={heroImageSrc} fallbackSrc={heroImageFallback} width={1920} alt="" imgClass="absolute inset-0 h-full w-full object-cover object-center" sizes="100vw" eager priority />
    <div class="absolute inset-0 bg-[linear-gradient(90deg,rgba(28,26,22,0.94)_0%,rgba(28,26,22,0.72)_48%,rgba(28,26,22,0.38)_100%)]"></div>
  {/if}
  <div class="container-shell relative py-20 md:py-28">
    <p class="text-[12px] font-bold uppercase tracking-[0.22em] text-goldfinch-gold">Where to stay</p>
    <h1 class="mt-4 max-w-3xl font-serif text-4xl font-light leading-[1.06] md:text-6xl" use:revealHeading>
      A collection of Tanzania's finest safari stays
    </h1>
    <p class="mt-5 max-w-2xl text-base leading-8 text-white/80 md:text-lg">
      Every safari is only as good as where you rest each night. These are the lodges, tented camps and beach retreats
      our specialists know, trust and book — chosen for location, character and value.
    </p>
    <div class="mt-7 flex flex-wrap gap-2">
      {#each heroChips as chip}
        <span class="border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/85 backdrop-blur">{chip}</span>
      {/each}
    </div>
    <div class="mt-8 flex flex-wrap gap-3">
      <a href="#browse" class="group inline-flex h-12 items-center gap-2 bg-goldfinch-gold px-7 text-[12px] font-bold uppercase tracking-[0.14em] text-deep-green transition hover:bg-savanna">
        Browse Stays <ArrowRight size={16} strokeWidth={2.5} class="transition-transform group-hover:translate-x-0.5" />
      </a>
      <a href="/plan-my-trip" class="inline-flex h-12 items-center gap-2 border border-white/30 px-7 text-[12px] font-bold uppercase tracking-[0.14em] text-white transition hover:border-goldfinch-gold hover:text-goldfinch-gold">
        Plan My Safari
      </a>
    </div>
  </div>
  <a href="#browse" aria-label="Scroll to browse" class="absolute inset-x-0 bottom-5 mx-auto grid w-fit place-items-center text-white/60 transition hover:text-goldfinch-gold">
    <ChevronDown size={22} class="animate-bounce" />
  </a>
</section>

{#if loadFailed}
  <section class="container-shell py-20"><ErrorState message="We couldn't load our lodges right now. Please refresh in a moment." /></section>
{:else if !lodges.length}
  <section class="container-shell py-20"><EmptyState title="Lodges coming soon" message="Our hand-picked lodges and camps are being prepared. Please check back again shortly." /></section>
{:else}
  <!-- ── stats strip ──────────────────────────────────────────────────────── -->
  <section class="border-y border-white/10 bg-deep-green text-white">
    <div class="container-shell grid gap-px overflow-hidden border-x border-white/[0.07] sm:grid-cols-2 lg:grid-cols-4">
      {#each stats as stat}
        <div class="border-b border-white/[0.07] px-6 py-9 sm:border-r lg:border-b-0">
          <p class="font-serif text-[44px] font-light leading-none text-goldfinch-gold md:text-[52px]"><span use:countUp={stat.n}>0</span>{stat.s}</p>
          <p class="mt-3 text-[11px] font-bold uppercase tracking-[0.2em] text-white/45">{stat.l}</p>
        </div>
      {/each}
    </div>
  </section>

  <!-- ── trust bar ────────────────────────────────────────────────────────── -->
  <section class="border-b border-ink/[0.06] bg-sand/40">
    <div class="container-shell flex flex-wrap items-center justify-center gap-x-8 gap-y-3 py-5 text-[12px] font-semibold text-ink/65">
      {#each trust as point}
        <span class="inline-flex items-center gap-2"><ShieldCheck size={14} class="text-forest" strokeWidth={2.4} />{point}</span>
      {/each}
    </div>
  </section>

  <div id="browse" class="scroll-mt-24"></div>

  <!-- ── sticky search / filter / sort ────────────────────────────────────── -->
  <section class="sticky top-0 z-20 border-b border-ink/10 bg-surface/95 backdrop-blur">
    <div class="container-shell flex flex-col gap-3 py-4">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label class="relative flex-1">
          <Search size={16} class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
          <input
            type="search"
            bind:value={search}
            placeholder="Search stays, destinations, styles…"
            class="h-11 w-full border border-ink/15 bg-surface pl-9 pr-3 text-sm text-heading placeholder:text-ink/40 focus:border-goldfinch-gold focus:outline-none"
          />
        </label>
        <div class="flex flex-wrap items-center gap-2">
          <select bind:value={activeDestination} class="h-11 min-w-0 border border-ink/15 bg-surface px-3 text-sm font-semibold text-heading focus:border-goldfinch-gold focus:outline-none">
            {#each destinations as d}<option value={d}>{d === 'All' ? 'All destinations' : d}</option>{/each}
          </select>
          {#if typesPresent.length > 1}
            <select bind:value={activeType} class="h-11 min-w-0 border border-ink/15 bg-surface px-3 text-sm font-semibold text-heading focus:border-goldfinch-gold focus:outline-none">
              <option value="All">All types</option>
              {#each typesPresent as t}<option value={t}>{TYPES[t] ?? t}</option>{/each}
            </select>
          {/if}
          <select bind:value={sortBy} class="h-11 min-w-0 border border-ink/15 bg-surface px-3 text-sm font-semibold text-heading focus:border-goldfinch-gold focus:outline-none">
            {#each SORTS as s}<option value={s.value}>{s.label}</option>{/each}
          </select>
        </div>
      </div>
      <div class="hide-scroll flex gap-2 overflow-x-auto">
        {#each LEVELS as lvl}
          <button
            type="button"
            class={`shrink-0 border px-3.5 py-1.5 text-[13px] font-semibold transition ${activeLevel === lvl.value ? 'border-goldfinch-gold bg-goldfinch-gold/10 text-heading' : 'border-ink/15 text-ink/55 hover:border-ink/30 hover:text-heading'}`}
            aria-current={activeLevel === lvl.value ? 'true' : undefined}
            on:click={() => (activeLevel = lvl.value)}
          >
            {lvl.label}
          </button>
        {/each}
      </div>
      {#if activeFilters.length}
        <div class="flex flex-wrap items-center gap-2">
          {#each activeFilters as f (f.key)}
            <button type="button" on:click={f.clear} class="inline-flex items-center gap-1.5 rounded-full bg-deep-green px-3 py-1 text-[12px] font-semibold text-white transition hover:bg-forest">
              {f.label} <X size={12} strokeWidth={3} />
            </button>
          {/each}
          <button type="button" on:click={() => { activeDestination = 'All'; activeLevel = 'All'; activeType = 'All'; search = ''; }} class="text-[12px] font-bold uppercase tracking-[0.1em] text-clay hover:text-heading">Clear all</button>
        </div>
      {/if}
    </div>
  </section>

  <!-- ── featured property (default view only) ────────────────────────────── -->
  {#if featuredLodge}
    <section class="container-shell pt-12 md:pt-16" use:fadeUpOnScroll={{ y: 18 }}>
      <div class="mb-5 flex items-center gap-3">
        <span class="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-goldfinch-gold"><Sparkles size={13} strokeWidth={2.6} /> Editor's pick</span>
        <span class="h-px flex-1 bg-ink/10"></span>
      </div>
      <LodgeCard lodge={featuredLodge} feature />
    </section>
  {/if}

  <!-- ── results grid ─────────────────────────────────────────────────────── -->
  <section class="container-shell py-12 md:py-16">
    {#if sorted.length}
      <p class="mb-6 text-sm text-ink/55">{sorted.length} {sorted.length === 1 ? 'property' : 'properties'}{#if !isDefaultView} match your filters{/if}</p>
      {#if gridLodges.length}
        {#key `${activeDestination}|${activeLevel}|${activeType}|${sortBy}|${search}`}
          <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 18, stagger: 0.05 }}>
            {#each gridLodges as lodge (lodge.id)}
              <LodgeCard {lodge} />
            {/each}
          </div>
        {/key}
      {/if}
    {:else}
      <EmptyState title="No matches" message="No stays match those filters yet. Try a different destination or style." />
    {/if}
  </section>

  <!-- ── inspiration quote ────────────────────────────────────────────────── -->
  <section class="bg-deep-green text-white" use:fadeUpOnScroll={{ y: 16 }}>
    <div class="container-shell py-16 text-center md:py-20">
      <Quote size={34} class="mx-auto text-goldfinch-gold/70" strokeWidth={1.6} />
      <p class="mx-auto mt-5 max-w-3xl font-serif text-2xl font-light italic leading-[1.4] md:text-[32px]">
        The right camp turns a good safari into the trip of a lifetime — so we choose every one ourselves.
      </p>
      <p class="mt-6 text-[11px] font-bold uppercase tracking-[0.2em] text-goldfinch-gold">The Emnel Team · Arusha, Tanzania</p>
    </div>
  </section>

  <!-- ── premium final CTA ────────────────────────────────────────────────── -->
  <section class="container-shell py-16 md:py-20">
    <div class="relative overflow-hidden bg-deep-green px-6 py-14 text-center text-white md:px-12 md:py-20">
      {#if heroImageSrc}<ResponsiveImage src={heroImageSrc} fallbackSrc={heroImageFallback} width={1920} alt="" imgClass="absolute inset-0 h-full w-full object-cover object-center opacity-25" sizes="100vw" />{/if}
      <div class="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-goldfinch-gold/20 blur-3xl"></div>
      <div class="relative mx-auto max-w-2xl">
        <p class="brand-eyebrow justify-center text-goldfinch-gold">Not sure where to stay?</p>
        <h2 class="mt-3 font-serif text-3xl font-light leading-[1.1] md:text-[44px]">We'll match you to the right camps.</h2>
        <p class="mx-auto mt-4 max-w-xl text-white/75">Tell us your dates and how you like to travel — a local specialist will pair you with the right lodges and handle every booking.</p>
        <div class="mt-8 flex flex-wrap justify-center gap-3">
          <a class="inline-flex h-12 items-center gap-2 bg-goldfinch-gold px-7 text-[12px] font-bold uppercase tracking-[0.14em] text-deep-green transition hover:bg-savanna" href="/plan-my-trip">Plan My Safari <ArrowRight size={16} strokeWidth={2.5} /></a>
          <a class="inline-flex h-12 items-center gap-2 border border-white/30 px-7 text-[12px] font-bold uppercase tracking-[0.14em] text-white transition hover:border-goldfinch-gold hover:text-goldfinch-gold" href="/contact"><MessageCircle size={15} /> Talk to an Advisor</a>
        </div>
        <div class="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 border-t border-white/15 pt-6 text-[12px] font-medium text-white/70">
          {#each ['Personally chosen', 'Every booking handled', 'No obligation to book'] as t}
            <span class="inline-flex items-center gap-1.5"><MapPin size={13} class="text-goldfinch-gold" />{t}</span>
          {/each}
        </div>
      </div>
    </div>
  </section>
{/if}

<style>
  .hide-scroll {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .hide-scroll::-webkit-scrollbar {
    display: none;
  }
</style>
