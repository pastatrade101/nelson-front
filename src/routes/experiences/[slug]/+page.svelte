<script lang="ts">
  import { ArrowRight, Check, Sparkles } from '@lucide/svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { api } from '$lib/api/client';
  import { getExperienceInfo } from '$lib/data/experiences';
  import LoadingState from '$lib/components/public/LoadingState.svelte';
  import TourCard from '$lib/components/public/TourCard.svelte';
  import type { Tour } from '$lib/types';

  let exp: Record<string, unknown> | null = null;
  let tours: Tour[] = [];
  let loading = true;

  const load = async (slug: string) => {
    loading = true;
    exp = null;
    tours = [];
    try {
      const res = await api.categories.get(slug);
      exp = res.data;
      if (exp?.id) {
        const t = await api.tours.list({ category_id: String(exp.id), status: 'published', limit: 6 });
        tours = t.data.items ?? [];
      }
    } catch {
      exp = null;
    } finally {
      loading = false;
    }
  };

  $: slug = $page.params.slug ?? '';
  $: if (browser && slug) void load(slug);
  $: info = getExperienceInfo(slug);
  $: name = exp ? String(exp.name ?? slug) : slug;
  $: image = exp ? String(exp.image_url ?? '') : '';
</script>

{#if loading}
  <section class="container-shell py-20"><LoadingState message="Loading experience..." /></section>
{:else if exp}
  <section class="relative overflow-hidden bg-deep-green text-white">
    {#if image}
      <img class="absolute inset-0 h-full w-full object-cover opacity-45" src={image} alt={name} />
    {/if}
    <div class="absolute inset-0 bg-gradient-to-t from-deep-green via-deep-green/80 to-deep-green/40"></div>
    <div class="container-shell relative py-14 md:py-20">
      <nav class="mb-5 flex items-center gap-2 text-sm text-white/70">
        <a class="font-medium transition hover:text-white" href="/experiences">Experiences</a>
        <span class="text-white/30">/</span>
        <span class="font-medium text-white">{name}</span>
      </nav>
      <h1 class="max-w-3xl text-3xl font-extrabold leading-[1.08] tracking-tight md:text-5xl">{name}</h1>
      {#if exp.description}<p class="mt-4 max-w-2xl text-[15px] leading-7 text-white/85 md:text-base">{String(exp.description)}</p>{/if}
      <div class="mt-6 flex flex-wrap gap-3">
        <a class="inline-flex h-12 items-center gap-2 rounded-xl bg-goldfinch-gold px-6 font-bold text-deep-green transition hover:brightness-105" href={`/plan-my-trip?experience=${slug}`}>
          <Sparkles size={18} /> Plan a {name} trip
        </a>
        <a class="inline-flex h-12 items-center gap-2 rounded-xl border border-white/30 px-6 font-semibold text-white transition hover:bg-white/10" href={`/tours?experience=${slug}`}>
          See {name} tours <ArrowRight size={18} />
        </a>
      </div>
    </div>
  </section>

  <section class="container-shell py-12 md:py-16">
    {#if info}
      <div class="grid gap-6 md:grid-cols-[1fr_1fr]">
        <div class="rounded-2xl border border-ink/10 bg-white p-6 shadow-soft">
          <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-clay">Who it's for</p>
          <p class="mt-2 text-base leading-7 text-ink/75">{info.whoItsFor}</p>
          {#if info.fitness}
            <p class="mt-4 inline-flex items-center gap-2 rounded-full bg-sand/60 px-3 py-1.5 text-sm font-semibold text-deep-green">Fitness: {info.fitness}</p>
          {/if}
        </div>
        <div class="rounded-2xl border border-ink/10 bg-white p-6 shadow-soft">
          <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-clay">Highlights</p>
          <div class="mt-3 grid gap-2.5">
            {#each info.highlights as h}
              <span class="inline-flex items-center gap-2 text-sm font-medium text-ink/75">
                <span class="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-forest/10 text-forest"><Check size={12} strokeWidth={3} /></span>{h}
              </span>
            {/each}
          </div>
        </div>
      </div>
    {/if}

    {#if tours.length}
      <div class="mt-12">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <h2 class="text-2xl font-bold text-deep-green md:text-3xl">{name} trips</h2>
          <a class="inline-flex items-center gap-1.5 text-sm font-semibold text-forest transition hover:text-deep-green" href={`/tours?experience=${slug}`}>
            See all <ArrowRight size={16} />
          </a>
        </div>
        <div class="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {#each tours as tour (tour.slug)}
            <TourCard {tour} />
          {/each}
        </div>
      </div>
    {/if}
  </section>
{:else}
  <section class="container-shell py-20 text-center">
    <h1 class="text-2xl font-bold text-deep-green">Experience not found</h1>
    <a class="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-forest hover:text-deep-green" href="/experiences">All experiences <ArrowRight size={16} /></a>
  </section>
{/if}
