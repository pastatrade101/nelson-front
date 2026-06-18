<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowRight, BarChart3 } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import { DESTINATION_SCORES, getDestinationScores, topDimension, type DestinationScores } from '$lib/data/destination-scores';
  import ScoreBars from '$lib/components/public/ScoreBars.svelte';
  import type { Destination } from '$lib/types';

  type Row = { slug: string; name: string; image: string; scores: DestinationScores };
  let rows: Row[] = [];

  // Build scores from the destination's own fields; fall back to static config.
  const scoresFor = (d: Destination): DestinationScores | undefined => {
    const has =
      d.score_wildlife != null || d.score_luxury != null || d.score_family != null ||
      d.score_photography != null || d.score_adventure != null;
    if (has) {
      return {
        wildlife: Number(d.score_wildlife ?? 0),
        luxury: Number(d.score_luxury ?? 0),
        family: Number(d.score_family ?? 0),
        photography: Number(d.score_photography ?? 0),
        adventure: Number(d.score_adventure ?? 0),
        budgetFromUsd: d.score_budget_from != null ? Number(d.score_budget_from) : undefined
      };
    }
    return getDestinationScores(d.slug);
  };

  onMount(async () => {
    try {
      const res = await api.destinations.list({ status: 'published', limit: 100 });
      rows = (res.data.items as Destination[])
        .map((d) => ({ d, scores: scoresFor(d) }))
        .filter((x): x is { d: Destination; scores: DestinationScores } => Boolean(x.d.slug && x.scores))
        .map(({ d, scores }) => ({ slug: d.slug, name: d.name, image: d.main_image_url || d.image_url || d.banner_image_url || '', scores }));
    } catch {
      rows = [];
    }
    // Fallback to the config keys if the API returned nothing scored.
    if (!rows.length) {
      rows = Object.entries(DESTINATION_SCORES).map(([slug, scores]) => ({
        slug,
        name: slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        image: '',
        scores
      }));
    }
  });
</script>

<section class="relative overflow-hidden bg-gradient-to-br from-deep-green via-forest to-deep-green text-white">
  <div class="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-goldfinch-gold/20 blur-3xl"></div>
  <div class="container-shell relative py-16 text-center md:py-20">
    <span class="inline-flex items-center gap-2 rounded-full border border-goldfinch-gold/30 bg-goldfinch-gold/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-goldfinch-gold">
      <BarChart3 size={14} strokeWidth={2.4} /> Destination Scores
    </span>
    <h1 class="mx-auto mt-5 max-w-3xl text-3xl font-extrabold leading-[1.1] tracking-tight md:text-[44px]">How East Africa's destinations really score</h1>
    <p class="mx-auto mt-4 max-w-2xl text-[15px] leading-7 text-white/75 md:text-lg">
      Our honest 1–10 ratings across wildlife, luxury, family, photography and adventure — so you can match the place to what matters to you.
    </p>
  </div>
</section>

<section class="container-shell py-12 md:py-16">
  <div class="grid gap-6 lg:grid-cols-2">
    {#each rows as row (row.slug)}
      <article class="flex flex-col overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-soft">
        <div class="flex items-center gap-4 border-b border-ink/10 p-5">
          <div class="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-skywash">
            {#if row.image}<img class="h-full w-full object-cover" src={row.image} alt={row.name} loading="lazy" />{/if}
          </div>
          <div>
            <h2 class="text-lg font-extrabold text-deep-green">{row.name}</h2>
            <p class="text-sm font-semibold text-clay">Best for {topDimension(row.scores)}{row.scores.budgetFromUsd ? ` · from $${row.scores.budgetFromUsd.toLocaleString()}pp` : ''}</p>
          </div>
        </div>
        <div class="p-5">
          <ScoreBars scores={row.scores} />
          <a class="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-forest transition hover:text-deep-green" href={`/destinations?d=${row.slug}`}>
            Explore {row.name} <ArrowRight size={15} />
          </a>
        </div>
      </article>
    {/each}
  </div>

  <div class="mt-12 overflow-hidden rounded-[10px] bg-gradient-to-br from-deep-green via-forest to-deep-green p-8 text-center text-white md:p-12">
    <h2 class="text-2xl font-extrabold md:text-3xl">Not sure which scores matter most for you?</h2>
    <p class="mx-auto mt-3 max-w-xl text-white/75">Tell us how you like to travel and we'll match the right destination — honestly.</p>
    <a class="mt-6 inline-flex h-12 items-center gap-2 rounded-xl bg-goldfinch-gold px-7 font-bold text-deep-green transition hover:brightness-105" href="/plan-my-trip">Plan My Trip <ArrowRight size={18} /></a>
  </div>
</section>
