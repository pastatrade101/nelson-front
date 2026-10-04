<script lang="ts">
  import { page } from '$app/stores';
  import { ArrowRight, Search, X } from '@lucide/svelte';
  import LodgeCard from '$lib/components/public/LodgeCard.svelte';
  import ResponsiveImage from '$lib/components/public/ResponsiveImage.svelte';
  import FinalCtaSection from '$lib/components/public/FinalCtaSection.svelte';
  import JsonLd from '$lib/components/public/JsonLd.svelte';
  import { SITE_URL } from '$lib/config/env';
  import { lodgeImage, lodgeRating } from '$lib/lodge';
  import { origUrl } from '$lib/img';
  import { TIER_OPTIONS, normalizeTier, tierRank } from '$lib/tiers';
  import type { PageData } from './$types';
  import type { Lodge } from '$lib/types';
  export let data: PageData;
  let search = '';
  let activeDestination = 'All';
  let activeLevel = 'All';
  let activeType = 'All';
  let sortBy = 'recommended';
  let lastQuery: string | null = null;
  $: if ($page.url.search !== lastQuery) {
    lastQuery = $page.url.search;
    search = $page.url.searchParams.get('search') || '';
    activeDestination = $page.url.searchParams.get('destination') || 'All';
    activeLevel = normalizeTier($page.url.searchParams.get('level') || '') || 'All';
    activeType = $page.url.searchParams.get('type') || 'All';
  }
  const types: Record<string, string> = { tented_camp: 'Tented camp', lodge: 'Lodge', hotel: 'Hotel', mobile_camp: 'Mobile camp', treehouse: 'Treehouse' };
  $: lodges = data.lodges ?? [];
  const placeFor = (lodge: Lodge) => lodge.destinations?.name || lodge.park_area || lodge.region || lodge.country || '';
  $: destinations = [...new Set(lodges.map(placeFor).filter(Boolean))].sort();
  $: hero = lodges.find(l => l.is_featured && lodgeImage(l)) || lodges.find(l => lodgeImage(l));
  $: filtered = search.trim() !== '' || activeDestination !== 'All' || activeLevel !== 'All' || activeType !== 'All';
  const clear = () => { search = ''; activeDestination = activeLevel = activeType = 'All'; };
  $: matches = lodges.filter(l =>
    (activeDestination === 'All' || placeFor(l) === activeDestination || l.destinations?.slug === activeDestination) &&
    (activeLevel === 'All' || normalizeTier(l.accommodation_level) === activeLevel) &&
    (activeType === 'All' || l.lodge_type === activeType) &&
    (!search.trim() || [l.name, l.destinations?.name, l.country, l.region, l.park_area, l.short_description, ...(l.best_for ?? [])].join(' ').toLowerCase().includes(search.trim().toLowerCase()))
  ).sort((a, b) => sortBy === 'name' ? a.name.localeCompare(b.name) : sortBy === 'luxury' ? tierRank(b.accommodation_level) - tierRank(a.accommodation_level) || a.name.localeCompare(b.name) : sortBy === 'rated' ? (lodgeRating(b) ?? 0) - (lodgeRating(a) ?? 0) : Number(!!b.is_featured) - Number(!!a.is_featured) || (lodgeRating(b) ?? 0) - (lodgeRating(a) ?? 0) || a.name.localeCompare(b.name));
  $: origin = (SITE_URL || $page.url.origin).replace(/\/$/, '');
  $: collection = { '@type': 'CollectionPage', name: 'Tanzania safari lodges, camps and beach stays', url: origin + '/accommodation', mainEntity: { '@type': 'ItemList', numberOfItems: lodges.filter(l => l.indexable !== false).length, itemListElement: lodges.filter(l => l.indexable !== false).map((l, i) => ({ '@type': 'ListItem', position: i + 1, name: l.name, url: origin + '/accommodation/' + l.slug })) } };
</script>

<svelte:head>
  <title>Tanzania Safari Lodges, Camps & Beach Stays | Emnel Adventures</title>
  <meta name="description" content="Find your Tanzania stay. Browse hand-picked safari lodges, tented camps and island retreats by destination, comfort and property type." />
</svelte:head>
<JsonLd data={collection} />

<section class="bg-deep-green text-white">
  <div class="container-shell grid items-center gap-8 pb-10 pt-28 md:grid-cols-[1.1fr_1fr] md:gap-14 md:pb-14 md:pt-32">
    <div>
      <p class="text-[11px] font-semibold uppercase tracking-[.2em] text-goldfinch-gold">The Emnel collection</p>
      <h1 class="mt-4 max-w-xl font-serif text-[42px] font-light leading-[1.05] md:text-6xl">Extraordinary places<br />to stay in Tanzania.</h1>
      <p class="mt-5 max-w-lg text-base leading-7 text-white/75">Safari lodges, intimate camps and island retreats. Find a stay that feels like you, then let us build the journey around it.</p>
      <a href="#browse" class="mt-7 inline-flex h-11 items-center gap-3 border-b border-goldfinch-gold text-sm font-semibold text-goldfinch-gold">Explore the collection <ArrowRight size={16} /></a>
    </div>
    {#if hero}<div class="relative aspect-[3/2] overflow-hidden rounded-lg"><ResponsiveImage src={origUrl(hero, 'hero_image_url', 'image_url')} fallbackSrc={lodgeImage(hero)} alt={hero.name} width={1000} sizes="(min-width:768px) 45vw, 100vw" eager priority imgClass="h-full w-full object-cover" /><a href={`/accommodation/${hero.slug}`} class="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-3 rounded-md bg-deep-green/80 px-4 py-3 text-xs text-white">{hero.name}<ArrowRight size={14} /></a></div>{/if}
  </div>
</section>

<section id="browse" class="container-shell scroll-mt-[calc(var(--nav-h,70px)+20px)] py-10 md:py-14" aria-labelledby="browse-title">
  <div class="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p class="text-[10px] font-semibold uppercase tracking-widest text-clay">Find your place</p><h2 id="browse-title" class="mt-2 font-serif text-3xl text-heading">A stay for every kind of journey</h2></div><a href="/plan-my-trip" class="text-sm font-semibold text-forest underline underline-offset-4">Need help choosing?</a></div>
  {#if data.loadFailed}
    <div role="alert" class="rounded-lg border border-ink/15 bg-sand p-8"><h3 class="font-serif text-2xl">The collection is temporarily unavailable</h3><p class="mt-2 text-sm text-ink/65">Please reload to try again. Your trip planning can continue with our team.</p><a href="/accommodation" class="mt-4 inline-block font-semibold text-forest underline">Reload accommodation</a></div>
  {:else}
    <div class="rounded-lg border border-ink/10 bg-sand/40 p-4 md:p-5">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <label class="filter"><span>Search stays</span><span class="relative"><Search size={15} class="absolute left-3 top-3.5 text-ink/40" /><input type="search" bind:value={search} placeholder="Property, place or travel style" class="pl-9" /></span></label>
        <label class="filter"><span>Destination</span><select bind:value={activeDestination}><option value="All">All destinations</option>{#each destinations as destination}<option value={destination}>{destination}</option>{/each}{#if activeDestination !== 'All' && !destinations.includes(activeDestination)}<option value={activeDestination}>{activeDestination}</option>{/if}</select></label>
        <label class="filter"><span>Comfort</span><select bind:value={activeLevel}><option value="All">All comfort levels</option>{#each TIER_OPTIONS as level}<option value={level.value}>{level.label}</option>{/each}</select></label>
        <label class="filter"><span>Property type</span><select bind:value={activeType}><option value="All">All property types</option>{#each Object.entries(types) as [value,label]}<option {value}>{label}</option>{/each}</select></label>
      </div>
    </div>
    <div class="my-6 flex flex-wrap items-center justify-between gap-3">
      <p role="status" aria-live="polite" class="text-sm text-ink/60">{matches.length} {matches.length === 1 ? 'stay' : 'stays'}{filtered ? matches.length === 1 ? ' matches your search' : ' match your search' : ' in the collection'}</p>
      <div class="flex items-center gap-4">{#if filtered}<button type="button" on:click={clear} class="inline-flex items-center gap-1.5 text-xs font-semibold text-forest"><X size={13} />Clear filters</button>{/if}<label class="flex items-center gap-2 text-xs text-ink/60">Sort by<select bind:value={sortBy} class="max-w-[160px] rounded-md border border-ink/15 bg-surface p-2 text-ink"><option value="recommended">Recommended</option><option value="luxury">Luxury first</option><option value="rated">Our highest rated</option><option value="name">Name (A–Z)</option></select></label></div>
    </div>
    {#if matches.length}<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{#each matches as lodge (lodge.id)}<LodgeCard {lodge} />{/each}</div>
    {:else}<div class="rounded-lg border border-dashed border-ink/20 px-6 py-16 text-center"><h3 class="font-serif text-3xl">{filtered ? 'No stays match just yet' : 'Our collection is being prepared'}</h3><p class="mx-auto mt-3 max-w-md text-sm leading-6 text-ink/60">{filtered ? 'Try a broader destination or comfort level, or clear the filters to see the full collection.' : 'Speak with our team to find the right accommodation for your route.'}</p>{#if filtered}<button type="button" class="mt-5 rounded-md bg-forest px-5 py-3 text-sm font-semibold text-white" on:click={clear}>Show all stays</button>{/if}</div>{/if}
  {/if}
</section>

<FinalCtaSection eyebrow="Made for your journey" title="The right stay, in the right place." subtitle="Tell us your dates and travel style. Our local specialists will match the camps, lodges and coast to your route." primaryLabel="Plan my safari" primaryHref="/plan-my-trip" secondaryLabel="Explore destinations" secondaryHref="/destinations" points={['Private itineraries', 'Local guidance', 'No obligation to book']} />

<style>
  .filter { display: grid; min-width: 0; gap: 8px; font-size: 12px; font-weight: 600; }
  .filter input, .filter select { width: 100%; min-width: 0; height: 44px; border: 1px solid #d5d9d0; border-radius: 5px; background: #fff; padding-right: 10px; font-weight: 400; font-size: 13px; }
  .filter select { padding-left: 10px; } .filter input:focus, .filter select:focus { outline: 2px solid #82947b; outline-offset: 2px; }
</style>
