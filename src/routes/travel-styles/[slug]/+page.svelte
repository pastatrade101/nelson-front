<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowRight, Check, Sparkles } from '@lucide/svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { api } from '$lib/api/client';
  import JsonLd from '$lib/components/public/JsonLd.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import TourCard from '$lib/components/public/TourCard.svelte';
  import { breadcrumbLd } from '$lib/seo';
  import type { TravelStyle, Tour } from '$lib/types';

  type NormStyle = {
    slug: string;
    name: string;
    emotionalPromise: string;
    description: string;
    desires: string[];
    concerns: string[];
    persona?: string;
    heroImage?: string;
  };

  $: origin = $page.url.origin;

  let style: NormStyle | null = null;
  let others: { slug: string; name: string }[] = [];
  let featured: Tour[] = [];
  let loading = true;
  let loadFailed = false;

  const fromApi = (s: TravelStyle): NormStyle => ({
    slug: s.slug,
    name: s.name,
    emotionalPromise: s.emotional_promise ?? '',
    description: s.description ?? '',
    desires: s.desires ?? [],
    concerns: s.concerns ?? [],
    persona: s.persona ?? undefined,
    heroImage: s.hero_image_url ?? undefined
  });

  $: toursHref = style?.persona ? `/tours?persona=${style.persona}` : '/tours';
  $: planHref = `/plan-my-trip${style?.persona ? `?persona=${style.persona}` : ''}`;

  const loadStyle = async (slug: string) => {
    loading = true;
    loadFailed = false;
    style = null;
    try {
      const res = await api.travelStyles.get(slug);
      style = fromApi(res.data);
    } catch {
      // Unknown slug or fetch failure — show an honest error, never fabricate.
      loadFailed = true;
      style = null;
    }
    try {
      const list = await api.travelStyles.list({ status: 'published', limit: 100 });
      const items = list.data.items as TravelStyle[];
      others = items
        .map((s) => ({ slug: s.slug, name: s.name }))
        .filter((s) => s.slug !== slug)
        .slice(0, 3);
    } catch {
      others = [];
    }
    loading = false;
  };

  $: slug = $page.params.slug ?? '';
  $: if (browser && slug) void loadStyle(slug);

  onMount(async () => {
    try {
      const res = await api.tours.list({ is_featured: 'true', status: 'published', limit: 3 });
      featured = res.data.items.length ? res.data.items : (await api.tours.list({ status: 'published', limit: 3 })).data.items;
    } catch {
      featured = [];
    }
  });
</script>

{#if loading}
  <section class="container-shell py-20"><LoadingState message="Loading travel style..." /></section>
{:else if loadFailed || !style}
  <section class="container-shell py-20">
    <ErrorState message="We couldn't load this travel style right now. It may have moved, or please refresh in a moment." />
  </section>
{:else}
  <JsonLd data={breadcrumbLd(origin, [{ name: 'Home', path: '/' }, { name: 'Travel Styles', path: '/travel-styles' }, { name: style.name, path: `/travel-styles/${style.slug}` }])} />
  <section class="relative overflow-hidden bg-gradient-to-br from-deep-green via-forest to-deep-green text-white">
    {#if style.heroImage}
      <img class="absolute inset-0 h-full w-full object-cover opacity-40" src={style.heroImage} alt="" />
      <div class="absolute inset-0 bg-gradient-to-t from-deep-green via-deep-green/80 to-deep-green/40"></div>
    {/if}
    <div class="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-goldfinch-gold/20 blur-3xl"></div>
    <div class="container-shell relative py-14 md:py-20">
      <nav class="mb-5 flex items-center gap-2 text-sm text-white/70">
        <a class="font-medium transition hover:text-white" href="/travel-styles">Travel Styles</a>
        <span class="text-white/30">/</span>
        <span class="font-medium text-white">{style.name}</span>
      </nav>
      <p class="font-serif text-xl italic text-savanna">{style.name}</p>
      <h1 class="mt-2 max-w-3xl text-3xl font-extrabold leading-[1.08] tracking-tight md:text-5xl">{style.emotionalPromise}</h1>
      <p class="mt-4 max-w-2xl text-[15px] leading-7 text-white/85 md:text-base">{style.description}</p>
      <div class="mt-6 flex flex-wrap gap-3">
        <a class="inline-flex h-12 items-center gap-2 rounded-xl bg-goldfinch-gold px-6 font-bold text-heading transition hover:brightness-105" href={planHref}>
          <Sparkles size={18} /> Plan a {style.name.toLowerCase()} trip
        </a>
        <a class="inline-flex h-12 items-center gap-2 rounded-xl border border-white/30 px-6 font-semibold text-white transition hover:bg-surface/10" href={toursHref}>
          Browse trips <ArrowRight size={18} />
        </a>
      </div>
    </div>
  </section>

  <section class="container-shell py-12 md:py-16">
    <div class="grid gap-6 md:grid-cols-2">
      <div class="rounded-2xl border border-ink/10 bg-surface p-6 shadow-soft">
        <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-clay">What you want</p>
        <div class="mt-3 grid gap-2.5">
          {#each style.desires as d}
            <span class="inline-flex items-center gap-2 text-sm font-medium text-ink/75">
              <span class="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-forest/10 text-forest"><Check size={12} strokeWidth={3} /></span>{d}
            </span>
          {/each}
        </div>
      </div>
      <div class="rounded-2xl border border-ink/10 bg-sand/30 p-6">
        <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-clay">What we plan around</p>
        <div class="mt-3 grid gap-2.5">
          {#each style.concerns as c}
            <span class="text-sm leading-6 text-ink/70">“{c}” — handled, honestly.</span>
          {/each}
        </div>
      </div>
    </div>

    {#if featured.length}
      <div class="mt-12">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <h2 class="text-2xl font-bold text-heading md:text-3xl">Trips to start from</h2>
          <a class="inline-flex items-center gap-1.5 text-sm font-semibold text-forest transition hover:text-heading" href={toursHref}>Browse all <ArrowRight size={16} /></a>
        </div>
        <div class="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {#each featured as tour (tour.slug)}
            <TourCard {tour} />
          {/each}
        </div>
      </div>
    {/if}

    <div class="mt-12">
      <h2 class="text-xl font-bold text-heading">Other travel styles</h2>
      <div class="mt-4 grid gap-4 sm:grid-cols-3">
        {#each others as o (o.slug)}
          <a class="group flex items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-surface p-5 transition hover:border-goldfinch-gold/40" href={`/travel-styles/${o.slug}`}>
            <span class="font-extrabold text-heading">{o.name}</span>
            <ArrowRight size={18} class="shrink-0 text-ink/30 transition group-hover:text-forest" />
          </a>
        {/each}
      </div>
    </div>
  </section>
{/if}
