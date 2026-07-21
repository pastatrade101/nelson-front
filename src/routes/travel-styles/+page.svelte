<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowRight } from '@lucide/svelte';
  import { revealHeading, staggeredCardReveal, tilt } from '$lib/animations';
  import { api } from '$lib/api/client';
  import LoadingState from '$lib/components/public/LoadingState.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import EmptyState from '$lib/components/public/EmptyState.svelte';
  import type { TravelStyle } from '$lib/types';

  type Card = { slug: string; name: string; emotionalPromise: string; description: string };

  let styles: Card[] = [];
  let loading = true;
  let loadFailed = false;

  onMount(async () => {
    try {
      const res = await api.travelStyles.list({ status: 'published', limit: 100 });
      const items = res.data.items as TravelStyle[];
      styles = items.map((s) => ({
        slug: s.slug,
        name: s.name,
        emotionalPromise: s.emotional_promise ?? '',
        description: s.description ?? ''
      }));
    } catch {
      loadFailed = true;
      styles = [];
    } finally {
      loading = false;
    }
  });
</script>

<section class="relative overflow-hidden bg-gradient-to-br from-deep-green via-forest to-deep-green text-white">
  <div class="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-goldfinch-gold/20 blur-3xl"></div>
  <div class="container-shell relative py-16 text-center md:py-20">
    <p class="font-serif text-xl italic text-savanna">Travel Styles</p>
    <h1 class="mx-auto mt-5 max-w-3xl text-3xl font-extrabold leading-[1.1] tracking-tight md:text-[44px]" use:revealHeading>How do you want to travel?</h1>
    <p class="mx-auto mt-4 max-w-2xl text-[15px] leading-7 text-white/75 md:text-lg">
      Honeymoon, family, luxury, photography and more — we shape the trip around how you travel, not just where.
    </p>
  </div>
</section>

<section class="container-shell py-12 md:py-16">
  {#if loading}
    <LoadingState message="Loading travel styles..." />
  {:else if loadFailed}
    <ErrorState message="We couldn't load travel styles right now. Please refresh in a moment." />
  {:else if styles.length === 0}
    <EmptyState title="No travel styles yet" message="Our travel styles are being prepared. Please check back again soon." />
  {:else}
    <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 16, stagger: 0.05 }}>
      {#each styles as style (style.slug)}
        <a class="group flex flex-col rounded-none border border-ink/10 bg-surface p-6 shadow-[0_14px_40px_rgba(28,26,22,0.07)] transition-shadow duration-300 hover:border-goldfinch-gold/40 hover:shadow-[0_26px_60px_rgba(28,26,22,0.16)]" href={`/travel-styles/${style.slug}`} use:tilt={{ max: 5 }}>
          <h2 class="text-xl font-extrabold text-heading">{style.name}</h2>
          <p class="mt-1 text-sm font-semibold text-clay">{style.emotionalPromise}</p>
          <p class="mt-2 flex-1 text-sm leading-6 text-ink/65">{style.description}</p>
          <span class="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-forest transition group-hover:text-heading">Explore {style.name} <ArrowRight size={15} /></span>
        </a>
      {/each}
    </div>
  {/if}
</section>
