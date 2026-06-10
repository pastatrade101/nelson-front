<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowRight, Sparkles } from '@lucide/svelte';
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { api } from '$lib/api/client';
  import LoadingState from '$lib/components/public/LoadingState.svelte';
  import TourCard from '$lib/components/public/TourCard.svelte';
  import { placeholderDestinations } from '$lib/data/placeholders';
  import type { Destination, Tour } from '$lib/types';

  let destinations: Destination[] = placeholderDestinations;
  let loading = true;
  let activeCountry = 'All';
  let relatedTours: Tour[] = [];

  onMount(async () => {
    try {
      const res = await api.destinations.list({ status: 'published', limit: 100 });
      if (res.data.items.length) destinations = res.data.items;
    } catch {
      // keep placeholders
    } finally {
      loading = false;
    }
  });

  $: countries = ['All', ...new Set(destinations.map((d) => d.country).filter((c): c is string => Boolean(c)))];
  $: filtered = activeCountry === 'All' ? destinations : destinations.filter((d) => d.country === activeCountry);

  // Selected tab lives in the URL (?d=slug) so it's deep-linkable + shareable.
  $: requested = $page.url.searchParams.get('d') ?? '';
  $: selected = destinations.find((d) => d.slug === requested) ?? filtered[0] ?? destinations[0];

  $: heroImage = selected ? selected.banner_image_url || selected.main_image_url || selected.image_url || '' : '';

  const selectDestination = (slug: string) =>
    goto(`/destinations?d=${slug}`, { replaceState: true, noScroll: true, keepFocus: true });

  const selectCountry = (country: string) => {
    activeCountry = country;
    const list = country === 'All' ? destinations : destinations.filter((d) => d.country === country);
    if (list.length && !list.some((d) => d.slug === selected?.slug)) void selectDestination(list[0].slug);
  };

  // Related tours for the selected destination.
  let lastDestId = '';
  $: if (browser && selected && selected.id !== lastDestId) {
    lastDestId = selected.id;
    relatedTours = [];
    void api.tours
      .list({ destination_id: selected.id, status: 'published', limit: 3 })
      .then((r) => (relatedTours = r.data.items ?? []))
      .catch(() => (relatedTours = []));
  }
</script>

{#if loading}
  <section class="container-shell py-20"><LoadingState message="Loading destinations..." /></section>
{:else if selected}
  <!-- hero -->
  <section class="relative h-[380px] w-full overflow-hidden bg-deep-green md:h-[460px]">
    {#if heroImage}
      <img class="absolute inset-0 h-full w-full object-cover" src={heroImage} alt={selected.name} />
    {/if}
    <div class="absolute inset-0 bg-gradient-to-t from-deep-green/95 via-deep-green/45 to-deep-green/20"></div>
    <div class="container-shell relative flex h-full flex-col justify-end pb-10 text-white md:pb-12">
      <p class="text-sm font-bold uppercase tracking-[0.18em] text-goldfinch-gold">
        Destinations{selected.country ? ` · ${selected.country}` : ''}
      </p>
      <h1 class="mt-2 max-w-2xl text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">{selected.name}</h1>
      {#if selected.short_description}
        <p class="mt-3 max-w-xl text-sm leading-7 text-white/85 md:text-base">{selected.short_description}</p>
      {/if}
      <div class="mt-6 flex flex-wrap gap-3">
        <a class="inline-flex h-12 items-center gap-2 rounded-xl bg-goldfinch-gold px-6 font-bold text-deep-green transition hover:brightness-105" href={`/plan-my-trip?destination=${selected.slug}`}>
          <Sparkles size={18} /> Plan a trip to {selected.name}
        </a>
        <a class="inline-flex h-12 items-center gap-2 rounded-xl border border-white/30 px-6 font-semibold text-white transition hover:bg-white/10" href={`/destinations/${selected.slug}`}>
          Full guide <ArrowRight size={18} />
        </a>
      </div>
    </div>
  </section>

  <!-- filters + destination tabs -->
  <section class="sticky top-0 z-20 border-b border-ink/10 bg-white/95 backdrop-blur">
    <div class="container-shell py-4">
      {#if countries.length > 2}
        <div class="hide-scroll mb-3 flex gap-2 overflow-x-auto">
          {#each countries as country}
            <button
              type="button"
              class={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                activeCountry === country ? 'border-forest bg-forest text-white' : 'border-ink/15 bg-white text-ink/60 hover:border-forest/40'
              }`}
              on:click={() => selectCountry(country)}
            >
              {country}
            </button>
          {/each}
        </div>
      {/if}
      <div class="hide-scroll flex gap-2 overflow-x-auto">
        {#each filtered as d (d.slug)}
          <button
            type="button"
            class={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
              selected.slug === d.slug ? 'bg-deep-green text-white shadow-sm' : 'bg-sand/60 text-ink/65 hover:bg-sand'
            }`}
            aria-current={selected.slug === d.slug ? 'true' : undefined}
            on:click={() => selectDestination(d.slug)}
          >
            {d.name}
          </button>
        {/each}
      </div>
    </div>
  </section>

  <!-- selected destination panel -->
  <section class="container-shell py-12 md:py-16">
    <div class="grid gap-10 lg:grid-cols-[1fr_0.8fr]">
      <div>
        {#if selected.country}<p class="text-sm font-semibold uppercase tracking-[0.16em] text-clay">{selected.country}</p>{/if}
        <h2 class="mt-2 text-3xl font-bold tracking-tight text-deep-green md:text-4xl">{selected.name}</h2>
        <p class="mt-4 whitespace-pre-line text-base leading-7 text-ink/70">{selected.description}</p>
        <div class="mt-6 flex flex-wrap gap-3">
          <a class="inline-flex h-11 items-center gap-2 rounded-xl bg-deep-green px-5 font-bold text-white transition hover:bg-forest" href={`/destinations/${selected.slug}`}>
            Explore {selected.name} in full <ArrowRight size={16} />
          </a>
          <a class="inline-flex h-11 items-center gap-2 rounded-xl border border-ink/15 bg-white px-5 font-semibold text-ink transition hover:bg-sand/60" href={`/plan-my-trip?destination=${selected.slug}`}>
            Plan My Trip
          </a>
        </div>
      </div>
      <div class="aspect-[4/3] overflow-hidden rounded-2xl bg-skywash shadow-soft">
        {#if selected.main_image_url || selected.image_url || heroImage}
          <img class="h-full w-full object-cover" src={selected.main_image_url || selected.image_url || heroImage} alt={selected.name} />
        {/if}
      </div>
    </div>

    {#if relatedTours.length}
      <div class="mt-12">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p class="text-sm font-semibold uppercase tracking-[0.16em] text-clay">Things to do</p>
            <h3 class="mt-1 text-2xl font-bold text-deep-green md:text-3xl">Trips in {selected.name}</h3>
          </div>
          <a class="inline-flex items-center gap-1.5 text-sm font-semibold text-forest transition hover:text-deep-green" href="/tours">
            Browse all tours <ArrowRight size={16} />
          </a>
        </div>
        <div class="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {#each relatedTours as tour (tour.id)}
            <TourCard {tour} />
          {/each}
        </div>
      </div>
    {/if}
  </section>
{:else}
  <section class="container-shell py-20 text-center text-ink/60">No destinations yet.</section>
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
