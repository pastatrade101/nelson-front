<script lang="ts">
  import { ArrowRight, CalendarDays, Check, ShieldCheck, Sparkles } from '@lucide/svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { api } from '$lib/api/client';
  import { breadcrumbLd } from '$lib/seo';
  import DestinationCard from '$lib/components/public/DestinationCard.svelte';
  import JsonLd from '$lib/components/public/JsonLd.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';
  import type { Country, Destination } from '$lib/types';

  let country: Country | null = null;
  let destinations: Destination[] = [];
  let loading = true;

  const load = async (slug: string) => {
    loading = true;
    country = null;
    destinations = [];
    try {
      const res = await api.countries.get(slug);
      country = res.data;
      if (country?.name) {
        const d = await api.destinations.list({ status: 'published', limit: 100 });
        destinations = (d.data.items ?? []).filter((x) => x.country === country?.name);
      }
    } catch {
      country = null;
    } finally {
      loading = false;
    }
  };

  $: slug = $page.params.slug ?? '';
  $: if (browser && slug) void load(slug);
  $: origin = $page.url.origin;
</script>

<svelte:head>
  {#if country}
    <title>{country.seo_title || country.meta_title || country.name}</title>
    {#if country.meta_description}<meta name="description" content={country.meta_description} />{/if}
  {/if}
</svelte:head>

{#if loading}
  <section class="container-shell py-20"><LoadingState message="Loading country..." /></section>
{:else if country}
  <JsonLd data={breadcrumbLd(origin, [{ name: 'Home', path: '/' }, { name: 'Countries', path: '/countries' }, { name: country.name, path: `/countries/${country.slug}` }])} />

  <!-- hero -->
  <section class="relative overflow-hidden bg-deep-green text-white">
    {#if country.hero_image_url}
      <img class="absolute inset-0 h-full w-full object-cover opacity-45" src={country.hero_image_url} alt={country.name} />
    {/if}
    <div class="absolute inset-0 bg-gradient-to-t from-deep-green via-deep-green/80 to-deep-green/40"></div>
    <div class="container-shell relative py-16 md:py-24">
      <nav class="mb-5 flex items-center gap-2 text-sm text-white/70">
        <a class="font-medium transition hover:text-white" href="/countries">Countries</a>
        <span class="text-white/30">/</span>
        <span class="font-medium text-white">{country.name}</span>
      </nav>
      <h1 class="max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">{country.name}</h1>
      {#if country.intro_text}<p class="mt-4 max-w-2xl text-[15px] leading-7 text-white/85 md:text-base">{country.intro_text}</p>{/if}
      <div class="mt-6 flex flex-wrap gap-3">
        <a class="inline-flex h-12 items-center gap-2 rounded-xl bg-goldfinch-gold px-6 font-bold text-heading transition hover:brightness-105" href={`/plan-my-trip?destination=${country.slug}`}>
          <Sparkles size={18} /> Plan a trip to {country.name}
        </a>
        <a class="inline-flex h-12 items-center gap-2 rounded-xl border border-white/30 px-6 font-semibold text-white transition hover:bg-surface/10" href="/tours">
          Browse tours <ArrowRight size={18} />
        </a>
      </div>
    </div>
  </section>

  <section class="container-shell py-12 md:py-16">
    <!-- quick facts -->
    <div class="grid gap-4 md:grid-cols-3">
      <div class="rounded-2xl border border-ink/10 bg-surface p-5 shadow-soft">
        <p class="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-clay"><CalendarDays size={14} /> Best time to visit</p>
        {#if country.best_months?.length}
          <div class="mt-3 flex flex-wrap gap-1.5">
            {#each country.best_months as m}<span class="rounded-full bg-sand/60 px-2.5 py-1 text-xs font-semibold text-heading">{m}</span>{/each}
          </div>
        {:else}
          <p class="mt-2 text-sm text-ink/70">Year-round — we'll advise on the best window for your plans.</p>
        {/if}
        {#if country.currency || country.capital}
          <p class="mt-3 text-xs text-ink/70">{country.capital ? `Capital: ${country.capital}` : ''}{country.capital && country.currency ? ' · ' : ''}{country.currency ? `Currency: ${country.currency}` : ''}</p>
        {/if}
      </div>
      <div class="rounded-2xl border border-ink/10 bg-surface p-5 shadow-soft">
        <p class="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-clay"><ShieldCheck size={14} /> Visa & entry</p>
        <p class="mt-2 text-sm leading-6 text-ink/70">{country.visa_info || 'We\'ll guide you through entry requirements for your nationality.'}</p>
      </div>
      <div class="rounded-2xl border border-ink/10 bg-surface p-5 shadow-soft">
        <p class="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-clay"><Check size={14} /> Health</p>
        <p class="mt-2 text-sm leading-6 text-ink/70">{country.health_info || 'We\'ll share honest, up-to-date health and vaccination guidance.'}</p>
      </div>
    </div>

    {#if destinations.length}
      <div class="mt-12">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <h2 class="text-2xl font-bold text-heading md:text-3xl">Where to go in {country.name}</h2>
          <a class="inline-flex items-center gap-1.5 text-sm font-semibold text-forest transition hover:text-heading" href="/destinations">All destinations <ArrowRight size={16} /></a>
        </div>
        <div class="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {#each destinations as d (d.slug)}
            <DestinationCard destination={d} />
          {/each}
        </div>
      </div>
    {/if}

    <div class="mt-12 overflow-hidden rounded-none bg-gradient-to-br from-deep-green via-forest to-deep-green p-8 text-center text-white md:p-12">
      <h2 class="text-2xl font-extrabold md:text-3xl">Ready to plan {country.name}?</h2>
      <p class="mx-auto mt-3 max-w-xl text-white/75">Tell us what you have in mind and a local expert will tailor an honest plan — no pressure.</p>
      <a class="mt-6 inline-flex h-12 items-center gap-2 rounded-xl bg-goldfinch-gold px-7 font-bold text-heading transition hover:brightness-105" href={`/plan-my-trip?destination=${country.slug}`}>Plan My Safari <ArrowRight size={18} /></a>
    </div>
  </section>
{:else}
  <section class="container-shell py-20 text-center">
    <h1 class="text-2xl font-bold text-heading">Country not found</h1>
    <a class="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-forest hover:text-heading" href="/countries">All countries <ArrowRight size={16} /></a>
  </section>
{/if}
