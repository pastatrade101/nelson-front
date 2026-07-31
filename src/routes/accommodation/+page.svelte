<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowRight } from '@lucide/svelte';
  import { staggeredCardReveal } from '$lib/animations/motion';
  import { api } from '$lib/api/client';
  import LodgeCard from '$lib/components/public/LodgeCard.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import EmptyState from '$lib/components/public/EmptyState.svelte';
  import type { Lodge } from '$lib/types';

  let lodges: Lodge[] = [];
  let loading = true;
  let loadFailed = false;

  let activeDestination = 'All';
  let activeLevel = 'All';

  const LEVELS = [
    { value: 'All', label: 'All styles' },
    { value: 'budget', label: 'Budget' },
    { value: 'mid_range', label: 'Mid-range' },
    { value: 'luxury', label: 'Luxury' },
    { value: 'ultra_luxury', label: 'Ultra-luxury' }
  ];

  onMount(async () => {
    try {
      const res = await api.lodges.list({ status: 'published', limit: 200 });
      lodges = res.data.items ?? [];
    } catch {
      loadFailed = true;
      lodges = [];
    } finally {
      loading = false;
    }
  });

  $: destinations = ['All', ...new Set(lodges.map((l) => l.destinations?.name).filter((n): n is string => Boolean(n)))];

  $: filtered = lodges
    .filter((l) => activeDestination === 'All' || l.destinations?.name === activeDestination)
    .filter((l) => activeLevel === 'All' || l.accommodation_level === activeLevel)
    // Featured first, then by name — a stable, sensible browse order.
    .slice()
    .sort((a, b) => Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured)) || a.name.localeCompare(b.name));
</script>

<svelte:head>
  <title>Where to Stay in Tanzania — Hand-Picked Lodges & Camps | Emnel Adventures</title>
  <meta
    name="description"
    content="Hand-picked safari lodges, tented camps and beach hotels across Tanzania's Serengeti, Ngorongoro, Tarangire, Ruaha, Kilimanjaro and Zanzibar — chosen and booked by Emnel Adventures."
  />
</svelte:head>

<!-- header -->
<section class="relative overflow-hidden bg-deep-green text-white">
  <div class="container-shell py-16 md:py-20">
    <p class="brand-eyebrow">Where to stay</p>
    <h1 class="mt-4 max-w-3xl text-4xl font-light leading-[1.1] md:text-6xl">Hand-picked lodges &amp; camps</h1>
    <p class="mt-5 max-w-2xl text-base leading-8 text-white/80 md:text-lg">
      Every safari is only as good as where you rest each night. These are the lodges, tented camps and beach
      retreats our specialists know, trust and book — chosen for location, character and value across Tanzania's
      finest wild places.
    </p>
  </div>
</section>

{#if loading}
  <section class="container-shell py-20"><LoadingState message="Loading lodges & camps..." /></section>
{:else if loadFailed}
  <section class="container-shell py-20">
    <ErrorState message="We couldn't load our lodges right now. Please refresh in a moment." />
  </section>
{:else if !lodges.length}
  <section class="container-shell py-20">
    <EmptyState title="Lodges coming soon" message="Our hand-picked lodges and camps are being prepared. Please check back again shortly." />
  </section>
{:else}
  <!-- filters -->
  <section class="sticky top-0 z-20 border-b border-ink/10 bg-surface/95 backdrop-blur">
    <div class="container-shell flex flex-col gap-3 py-4">
      {#if destinations.length > 2}
        <div class="hide-scroll flex gap-2 overflow-x-auto">
          {#each destinations as d}
            <button
              type="button"
              class={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${activeDestination === d ? 'bg-deep-green text-white shadow-sm' : 'bg-sand/60 text-ink/65 hover:bg-sand'}`}
              aria-current={activeDestination === d ? 'true' : undefined}
              on:click={() => (activeDestination = d)}
            >
              {d === 'All' ? 'All destinations' : d}
            </button>
          {/each}
        </div>
      {/if}
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
    </div>
  </section>

  <!-- grid -->
  <section class="container-shell py-12 md:py-16">
    {#if filtered.length}
      <p class="mb-6 text-sm text-ink/55">{filtered.length} {filtered.length === 1 ? 'property' : 'properties'}</p>
      <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 18, stagger: 0.06 }}>
        {#each filtered as lodge (lodge.id)}
          <LodgeCard {lodge} />
        {/each}
      </div>
    {:else}
      <EmptyState title="No matches" message="No lodges match those filters yet. Try a different destination or style." />
    {/if}
  </section>

  <!-- CTA -->
  <section class="container-shell pb-16">
    <div class="flex flex-col items-start justify-between gap-4 border border-goldfinch-gold/30 bg-savanna/20 p-6 sm:flex-row sm:items-center md:p-8">
      <div>
        <p class="text-lg font-bold text-heading">Not sure where to stay?</p>
        <p class="mt-1 text-sm text-ink/70">Tell us your dates and style — we'll match you to the right lodges and handle every booking.</p>
      </div>
      <a class="inline-flex h-12 shrink-0 items-center gap-2 bg-deep-green px-6 font-bold text-white transition hover:bg-forest" href="/plan-my-trip">
        Plan My Safari <ArrowRight size={16} />
      </a>
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
