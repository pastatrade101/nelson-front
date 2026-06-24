<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { Check, MapPin, Search, SlidersHorizontal, Star, X } from '@lucide/svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { api } from '$lib/api/client';
  import { revealHeading, staggeredCardReveal } from '$lib/animations';
  import { EXPERIENCE_TO_CATEGORY, PERSONA_ORDER, PERSONAS } from '$lib/data/personas';
  import EmptyState from '$lib/components/public/EmptyState.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';
  import RangeSlider from '$lib/components/public/RangeSlider.svelte';
  import TourCardRich from '$lib/components/public/TourCardRich.svelte';
  import { placeholderTours } from '$lib/data/placeholders';
  import type { Tour } from '$lib/types';

  // ---- canonical comfort tiers ----
  const TIERS = [
    { key: 'luxury_plus', label: 'Luxury+' },
    { key: 'luxury', label: 'Luxury' },
    { key: 'mid_range', label: 'Mid-range' },
    { key: 'budget', label: 'Budget' }
  ];
  const normTier = (t?: string | null) => {
    if (!t) return '';
    const v = t.toLowerCase().replace(/[\s-]+/g, '_');
    if (v === 'midrange') return 'mid_range';
    if (v === 'luxuryplus' || v === 'ultra_luxury') return 'luxury_plus';
    return v;
  };

  // ---- data ----
  let allTours: Tour[] = [];
  let loading = true;
  let error = '';

  // ---- local (non-URL) filter state ----
  let selectedTiers: string[] = [];
  let popularOnly = false;
  let lenMin = 1, lenMax = 21, lengthLo = 1, lengthHi = 21;
  let priceMin = 0, priceMax = 10000, priceLo = 0, priceHi = 10000;
  let rangesReady = false;
  let sort = 'recommended';
  let filtersOpen = false; // mobile drawer

  // ---- URL-driven filters (so nav links + sharing work) ----
  $: params = $page.url.searchParams;
  $: searchTerm = params.get('search')?.trim() ?? '';
  $: destSlug = params.get('destination')?.trim() ?? '';
  $: persona = params.get('persona')?.trim() ?? '';
  $: experience = params.get('experience')?.trim() ?? '';
  $: urlCategories = (() => {
    const set = new Set<string>();
    (params.get('category')?.split(',') ?? []).forEach((c) => c.trim() && set.add(c.trim()));
    if (experience && EXPERIENCE_TO_CATEGORY[experience]) set.add(EXPERIENCE_TO_CATEGORY[experience]);
    return set;
  })();
  $: personaCfg = persona ? PERSONAS[persona] : null;

  const load = async () => {
    loading = true;
    error = '';
    try {
      const res = await api.tours.list({ status: 'published', limit: 100 });
      const items = res.data.items ?? [];
      allTours = items.length ? items : placeholderTours;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to load tours.';
      allTours = placeholderTours;
    } finally {
      loading = false;
    }
    initRanges();
  };

  const initRanges = () => {
    const prices = allTours.map((t) => t.price_from ?? 0).filter((n) => n > 0);
    const durs = allTours.map((t) => t.duration_days ?? 0).filter((n) => n > 0);
    priceMin = prices.length ? Math.floor(Math.min(...prices)) : 0;
    priceMax = prices.length ? Math.ceil(Math.max(...prices)) : 10000;
    if (priceMax <= priceMin) priceMax = priceMin + 100;
    lenMin = durs.length ? Math.min(...durs) : 1;
    lenMax = durs.length ? Math.max(...durs) : 21;
    if (lenMax <= lenMin) lenMax = lenMin + 1;
    priceLo = priceMin; priceHi = priceMax;
    lengthLo = lenMin; lengthHi = lenMax;
    rangesReady = true;
  };

  onMount(load);

  // ---- facet option lists (derived from the loaded tours) ----
  const distinctBy = <T,>(arr: T[], key: (x: T) => string | undefined) => {
    const seen = new Map<string, T>();
    for (const x of arr) { const k = key(x); if (k && !seen.has(k)) seen.set(k, x); }
    return [...seen.values()];
  };
  $: destinationOptions = distinctBy(allTours, (t) => t.destinations?.slug)
    .map((t) => ({ slug: t.destinations!.slug as string, name: t.destinations!.name as string }))
    .sort((a, b) => a.name.localeCompare(b.name));
  $: categoryOptions = distinctBy(allTours, (t) => t.tour_categories?.slug)
    .map((t) => ({ slug: t.tour_categories!.slug as string, name: t.tour_categories!.name as string }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const matchSearch = (t: Tour, q: string) => {
    const hay = `${t.title} ${t.short_description ?? ''} ${t.destinations?.name ?? ''}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  };

  // base = search + destination only (used for facet counts)
  $: base = allTours.filter((t) => (!searchTerm || matchSearch(t, searchTerm)) && (!destSlug || t.destinations?.slug === destSlug));
  const catCount = (slug: string) => base.filter((t) => t.tour_categories?.slug === slug).length;
  const tierCount = (key: string) => base.filter((t) => normTier(t.budget_tier) === key).length;

  // full result
  $: result = base.filter(
    (t) =>
      (urlCategories.size === 0 || (t.tour_categories?.slug ? urlCategories.has(t.tour_categories.slug) : false)) &&
      (selectedTiers.length === 0 || selectedTiers.includes(normTier(t.budget_tier))) &&
      (t.duration_days == null || (t.duration_days >= lengthLo && t.duration_days <= lengthHi)) &&
      ((t.price_from ?? 0) >= priceLo && (t.price_from ?? 0) <= priceHi) &&
      (!popularOnly || Boolean(t.is_popular))
  );

  const personaTags = (t: Tour) => t.persona_tags ?? [];
  $: sorted = (() => {
    const r = [...result];
    if (sort === 'price_asc') return r.sort((a, b) => (a.price_from ?? 0) - (b.price_from ?? 0));
    if (sort === 'price_desc') return r.sort((a, b) => (b.price_from ?? 0) - (a.price_from ?? 0));
    if (sort === 'duration_asc') return r.sort((a, b) => (a.duration_days ?? 0) - (b.duration_days ?? 0));
    if (sort === 'duration_desc') return r.sort((a, b) => (b.duration_days ?? 0) - (a.duration_days ?? 0));
    // recommended: persona match → featured → popular
    return r.sort((a, b) => {
      const p = persona ? Number(personaTags(b).includes(persona)) - Number(personaTags(a).includes(persona)) : 0;
      if (p) return p;
      const f = Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured));
      if (f) return f;
      return Number(Boolean(b.is_popular)) - Number(Boolean(a.is_popular));
    });
  })();

  // ---- URL writers ----
  const withParams = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams($page.url.searchParams);
    for (const [k, v] of Object.entries(changes)) v ? next.set(k, v) : next.delete(k);
    return `/tours${next.toString() ? `?${next}` : ''}`;
  };
  const writeUrl = (changes: Record<string, string | null>) =>
    void goto(withParams(changes), { replaceState: true, noScroll: true, keepFocus: true });

  const toggleCategory = (slug: string) => {
    const next = new Set(urlCategories);
    next.has(slug) ? next.delete(slug) : next.add(slug);
    writeUrl({ category: next.size ? [...next].join(',') : null, experience: null });
  };
  const setDestination = (slug: string) => writeUrl({ destination: slug || null });
  const submitSearch = (e: Event) => {
    e.preventDefault();
    const v = (new FormData(e.target as HTMLFormElement).get('q') as string)?.trim();
    writeUrl({ search: v || null });
  };
  const toggleTier = (key: string) => {
    selectedTiers = selectedTiers.includes(key) ? selectedTiers.filter((k) => k !== key) : [...selectedTiers, key];
  };

  $: lengthActive = lengthLo > lenMin || lengthHi < lenMax;
  $: priceActive = priceLo > priceMin || priceHi < priceMax;
  $: activeCount =
    urlCategories.size + selectedTiers.length + (destSlug ? 1 : 0) + (searchTerm ? 1 : 0) +
    (popularOnly ? 1 : 0) + (lengthActive ? 1 : 0) + (priceActive ? 1 : 0);

  const clearAll = () => {
    selectedTiers = [];
    popularOnly = false;
    lengthLo = lenMin; lengthHi = lenMax;
    priceLo = priceMin; priceHi = priceMax;
    sort = 'recommended';
    void goto('/tours', { replaceState: true, noScroll: true });
  };

  const money = (n: number) => `$${n.toLocaleString()}`;
  const days = (n: number) => `${n} day${n === 1 ? '' : 's'}`;
  $: catName = (slug: string) => categoryOptions.find((c) => c.slug === slug)?.name ?? slug;
  $: destName = destinationOptions.find((d) => d.slug === destSlug)?.name ?? destSlug;
</script>

<svelte:head>
  <title>Safari &amp; Tour Packages | Goldfinch Adventures</title>
  <meta name="description" content="Browse and filter East Africa safari and tour packages — by destination, experience, length, price and comfort level." />
</svelte:head>

<section class="container-shell py-10 md:py-14">
  {#if personaCfg}
    <div class="overflow-hidden rounded-[10px] border border-goldfinch-gold/20 bg-gradient-to-br from-sand via-sand to-savanna/40 p-7 md:p-9">
      <p class="font-serif text-xl italic text-clay">For {personaCfg.label}</p>
      {#key personaCfg.headline}
        <h1 class="mt-2 max-w-2xl text-3xl font-extrabold tracking-tight text-heading md:text-4xl" use:revealHeading>{personaCfg.headline}</h1>
      {/key}
      <p class="mt-3 max-w-2xl text-base leading-7 text-ink/70">{personaCfg.sub}</p>
      <div class="mt-5 flex flex-wrap gap-2.5">
        {#each personaCfg.concerns as concern}
          <span class="inline-flex items-center gap-1.5 rounded-full border border-forest/15 bg-surface/70 px-3 py-1.5 text-sm font-medium text-ink/70">
            <span class="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-forest/10 text-forest"><Check size={11} strokeWidth={3} /></span>
            {concern}
          </span>
        {/each}
      </div>
    </div>
  {:else}
    <p class="font-serif text-xl italic text-clay">Safari &amp; Tours</p>
    <h1 class="mt-2 text-3xl font-extrabold tracking-tight text-heading md:text-[40px]" use:revealHeading>African Safari Tours &amp; Holidays</h1>
    <p class="mt-3 max-w-3xl text-base leading-7 text-ink/70">
      Explore our trusted East Africa tours — safaris, Kilimanjaro climbs, gorilla trekking and beach escapes.
      Use the filters to find the trip that fits your dates, budget and style.
    </p>
  {/if}

  <!-- persona switcher -->
  <div class="mt-6 flex flex-wrap items-center gap-2">
    <span class="text-sm font-medium text-ink/50">Who's travelling?</span>
    {#each PERSONA_ORDER as key}
      <a
        class={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${persona === key ? 'border-forest bg-forest text-white' : 'border-ink/15 bg-surface text-ink/65 hover:border-forest/40'}`}
        href={withParams({ persona: persona === key ? null : key })}
      >
        {PERSONAS[key].label}
      </a>
    {/each}
  </div>

  <div class="mt-8 grid gap-8 lg:grid-cols-[300px_1fr]">
    <!-- ============ FILTER SIDEBAR ============ -->
    <aside class={`${filtersOpen ? 'block' : 'hidden'} lg:block`}>
      <div class="filter-scroll grid gap-5 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:overscroll-contain lg:pb-2">
        <!-- search card -->
        <div class="rounded-2xl border border-goldfinch-gold/30 bg-sand/40 p-5">
          <p class="font-serif text-lg font-bold text-heading">Your Safari</p>
          <form class="mt-4 grid gap-3" on:submit={submitSearch}>
            <label class="grid gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink/55">
              Where to
              <select
                class="h-11 rounded-xl border border-ink/15 bg-surface px-3 text-sm font-medium text-ink outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/15"
                value={destSlug}
                on:change={(e) => setDestination(e.currentTarget.value)}
              >
                <option value="">All destinations</option>
                {#each destinationOptions as d}
                  <option value={d.slug}>{d.name}</option>
                {/each}
              </select>
            </label>
            <label class="grid gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink/55">
              Keyword
              <span class="flex h-11 items-center gap-2 rounded-xl border border-ink/15 bg-surface px-3 transition focus-within:border-forest focus-within:ring-2 focus-within:ring-forest/15">
                <Search size={16} class="text-ink/40" />
                <input name="q" value={searchTerm} placeholder="e.g. migration, gorilla" class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink/35" />
              </span>
            </label>
            <button type="submit" class="h-11 rounded-xl bg-deep-green text-sm font-bold text-white transition hover:bg-forest">Search</button>
          </form>
        </div>

        <!-- tour length -->
        {#if rangesReady}
          <div class="rounded-2xl border border-ink/10 bg-surface p-5">
            <p class="text-sm font-bold text-ink">Tour Length</p>
            <div class="mt-4">
              <RangeSlider min={lenMin} max={lenMax} bind:lo={lengthLo} bind:hi={lengthHi} format={days} />
            </div>
          </div>

          <!-- price -->
          <div class="rounded-2xl border border-ink/10 bg-surface p-5">
            <p class="text-sm font-bold text-ink">Rates in USD</p>
            <p class="mt-0.5 text-xs text-ink/45">Per person, excl. international flights</p>
            <div class="mt-4">
              <RangeSlider min={priceMin} max={priceMax} step={50} bind:lo={priceLo} bind:hi={priceHi} format={money} />
            </div>
          </div>
        {/if}

        <!-- comfort level -->
        <div class="rounded-2xl border border-ink/10 bg-surface p-5">
          <p class="text-sm font-bold text-ink">Comfort Level</p>
          <div class="mt-3 grid gap-2.5">
            {#each TIERS as t}
              <label class="flex cursor-pointer items-center justify-between text-sm">
                <span class="flex items-center gap-2.5 text-ink/75">
                  <input type="checkbox" class="h-4 w-4 accent-forest" checked={selectedTiers.includes(t.key)} on:change={() => toggleTier(t.key)} />
                  {t.label}
                </span>
                <span class="text-xs text-ink/40">({tierCount(t.key)})</span>
              </label>
            {/each}
          </div>
        </div>

        <!-- safari type / experience (category) -->
        {#if categoryOptions.length}
          <div class="rounded-2xl border border-ink/10 bg-surface p-5">
            <p class="text-sm font-bold text-ink">Safari Type</p>
            <div class="mt-3 grid gap-2.5">
              {#each categoryOptions as c}
                <label class="flex cursor-pointer items-center justify-between text-sm">
                  <span class="flex items-center gap-2.5 text-ink/75">
                    <input type="checkbox" class="h-4 w-4 accent-forest" checked={urlCategories.has(c.slug)} on:change={() => toggleCategory(c.slug)} />
                    {c.name}
                  </span>
                  <span class="text-xs text-ink/40">({catCount(c.slug)})</span>
                </label>
              {/each}
            </div>
          </div>
        {/if}

        <!-- quick toggle -->
        <div class="rounded-2xl border border-ink/10 bg-surface p-5">
          <p class="text-sm font-bold text-ink">Other</p>
          <label class="mt-3 flex cursor-pointer items-center gap-2.5 text-sm text-ink/75">
            <input type="checkbox" class="h-4 w-4 accent-forest" bind:checked={popularOnly} />
            Best sellers only
          </label>
        </div>
      </div>
    </aside>

    <!-- ============ RESULTS ============ -->
    <div>
      <!-- result bar -->
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 pb-4">
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-xl border border-ink/15 bg-surface px-3.5 py-2 text-sm font-semibold text-ink lg:hidden"
            on:click={() => (filtersOpen = !filtersOpen)}
          >
            <SlidersHorizontal size={15} /> Filters{#if activeCount}<span class="rounded-full bg-forest px-1.5 text-xs text-white">{activeCount}</span>{/if}
          </button>
          <p class="text-sm text-ink/60">{#if !loading}<span class="font-bold text-ink">{sorted.length}</span> tour{sorted.length === 1 ? '' : 's'}{/if}</p>
        </div>
        <label class="flex items-center gap-2 text-sm text-ink/55">
          Sort
          <select class="h-9 rounded-lg border border-ink/15 bg-surface px-2 text-sm font-medium text-ink outline-none focus:border-forest" bind:value={sort}>
            <option value="recommended">Recommended</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value="duration_asc">Duration: short to long</option>
            <option value="duration_desc">Duration: long to short</option>
          </select>
        </label>
      </div>

      <!-- active filter chips -->
      {#if activeCount}
        <div class="mt-4 flex flex-wrap items-center gap-2">
          {#if destSlug}
            <button class="chip" type="button" on:click={() => setDestination('')}>{destName} <X size={13} /></button>
          {/if}
          {#each [...urlCategories] as slug}
            <button class="chip" type="button" on:click={() => toggleCategory(slug)}>{catName(slug)} <X size={13} /></button>
          {/each}
          {#each selectedTiers as key}
            <button class="chip" type="button" on:click={() => toggleTier(key)}>{TIERS.find((t) => t.key === key)?.label} <X size={13} /></button>
          {/each}
          {#if searchTerm}
            <button class="chip" type="button" on:click={() => writeUrl({ search: null })}>“{searchTerm}” <X size={13} /></button>
          {/if}
          {#if lengthActive}
            <button class="chip" type="button" on:click={() => { lengthLo = lenMin; lengthHi = lenMax; }}>{days(lengthLo)}–{days(lengthHi)} <X size={13} /></button>
          {/if}
          {#if priceActive}
            <button class="chip" type="button" on:click={() => { priceLo = priceMin; priceHi = priceMax; }}>{money(priceLo)}–{money(priceHi)} <X size={13} /></button>
          {/if}
          {#if popularOnly}
            <button class="chip" type="button" on:click={() => (popularOnly = false)}>Best sellers <X size={13} /></button>
          {/if}
          <button class="text-sm font-semibold text-forest underline-offset-2 hover:underline" type="button" on:click={clearAll}>Clear all</button>
        </div>
      {/if}

      <div class="mt-6">
        {#if loading}
          <LoadingState message="Loading tours..." />
        {:else if error && allTours.length === 0}
          <ErrorState message={error} />
        {:else if sorted.length === 0}
          <EmptyState
            title="No tours match your filters"
            message="Try widening your dates, budget or destination — or plan a custom trip and we'll tailor it to you."
          />
        {:else}
          <div class="grid gap-6 sm:grid-cols-2" use:staggeredCardReveal={{ y: 16, stagger: 0.05 }}>
            {#each sorted as tour (tour.slug)}
              <TourCardRich {tour} />
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
</section>

<style>
  :global(.chip) {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    border-radius: 999px;
    border: 1px solid rgba(31, 77, 58, 0.2);
    background: rgba(31, 77, 58, 0.06);
    padding: 0.25rem 0.75rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: #1f4d3a;
    transition: background 0.15s;
  }
  :global(.chip:hover) {
    background: rgba(31, 77, 58, 0.12);
  }

  /* self-scrolling filter rail: scroll by gesture (wheel/trackpad/touch),
     no visible scrollbar handle */
  .filter-scroll {
    scrollbar-width: none;
    -ms-overflow-style: none;
    -webkit-overflow-scrolling: touch;
  }
  .filter-scroll::-webkit-scrollbar {
    display: none;
  }
</style>
