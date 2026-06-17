<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowRight, MapPin } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import EmptyState from '$lib/components/public/EmptyState.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';
  import type { Country } from '$lib/types';

  let countries: Country[] = [];
  let loading = true;

  onMount(async () => {
    try {
      const res = await api.countries.list({ status: 'published', limit: 100 });
      countries = res.data.items ?? [];
    } catch {
      countries = [];
    } finally {
      loading = false;
    }
  });
</script>

<section class="relative overflow-hidden bg-gradient-to-br from-deep-green via-forest to-deep-green text-white">
  <div class="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-goldfinch-gold/20 blur-3xl"></div>
  <div class="container-shell relative py-16 text-center md:py-20">
    <span class="inline-flex items-center gap-2 rounded-full border border-goldfinch-gold/30 bg-goldfinch-gold/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-goldfinch-gold">
      <MapPin size={14} strokeWidth={2.4} /> Countries
    </span>
    <h1 class="mx-auto mt-5 max-w-3xl text-3xl font-extrabold leading-[1.1] tracking-tight md:text-[44px]">Where in East Africa?</h1>
    <p class="mx-auto mt-4 max-w-2xl text-[15px] leading-7 text-white/75 md:text-lg">
      Honest country guides — best time to visit, what to expect, and the trips that suit you.
    </p>
  </div>
</section>

<section class="container-shell py-12 md:py-16">
  {#if loading}
    <LoadingState message="Loading countries..." />
  {:else if countries.length === 0}
    <EmptyState title="Countries coming soon" message="We're adding country guides — tell us where you'd like to go." />
  {:else}
    <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {#each countries as c (c.slug)}
        <a class="group relative flex h-72 flex-col justify-end overflow-hidden rounded-2xl bg-deep-green shadow-soft" href={`/countries/${c.slug}`}>
          {#if c.hero_image_url}
            <img class="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105" src={c.hero_image_url} alt={c.name} loading="lazy" />
          {/if}
          <div class="absolute inset-0 bg-gradient-to-t from-deep-green via-deep-green/40 to-transparent"></div>
          <div class="relative p-5 text-white">
            {#if c.phase && c.phase !== 'live'}<span class="mb-2 inline-block rounded-full bg-goldfinch-gold/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-deep-green">Coming soon</span>{/if}
            <h2 class="text-2xl font-extrabold">{c.name}</h2>
            {#if c.capital}<p class="text-sm text-white/75">Capital: {c.capital}</p>{/if}
            <span class="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-goldfinch-gold">Explore {c.name} <ArrowRight size={15} /></span>
          </div>
        </a>
      {/each}
    </div>
  {/if}
</section>
