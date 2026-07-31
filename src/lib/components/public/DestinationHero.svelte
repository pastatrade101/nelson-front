<script lang="ts">
  import { ArrowRight, Banknote, Compass, Globe } from '@lucide/svelte';
  import { imgUrl } from '$lib/img';
  import ScoreBars from '$lib/components/public/ScoreBars.svelte';
  import type { Destination } from '$lib/types';
  import type { DestinationScores } from '$lib/data/destination-scores';

  export let destination: Destination;

  // All computed from real destination fields; each section hides itself when the
  // client hasn't filled the data, so nothing ever renders empty or broken.
  $: heroImage = destination.banner_image_url || destination.main_image_url || destination.image_url || '';
  $: regionLine = [destination.region, destination.country].filter(Boolean).join(' · ') || 'Tanzania';
  $: budgetFrom = destination.score_budget_from ? `From USD ${destination.score_budget_from.toLocaleString()}` : '';

  $: destScores = ((): DestinationScores | undefined => {
    const raw = [
      destination.score_wildlife,
      destination.score_luxury,
      destination.score_family,
      destination.score_photography,
      destination.score_adventure
    ];
    if (raw.every((v) => v === null || v === undefined)) return undefined;
    return {
      wildlife: destination.score_wildlife ?? 0,
      luxury: destination.score_luxury ?? 0,
      family: destination.score_family ?? 0,
      photography: destination.score_photography ?? 0,
      adventure: destination.score_adventure ?? 0
    };
  })();

  // Headline chips from the strongest scores — only what the data supports.
  $: heroChips = [
    (destination.score_wildlife ?? 0) >= 8 && 'Exceptional wildlife',
    (destination.score_photography ?? 0) >= 8 && 'A photographer’s favourite',
    (destination.score_family ?? 0) >= 8 && 'Great for families',
    (destination.score_luxury ?? 0) >= 8 && 'Luxury lodges & camps',
    (destination.score_adventure ?? 0) >= 8 && 'Adventure & wild country'
  ]
    .filter((v): v is string => Boolean(v))
    .slice(0, 4);
</script>

<!-- Cinematic full-bleed hero -->
<section class="relative min-h-[60vh] overflow-hidden bg-deep-green text-white md:min-h-[64vh]">
  {#if heroImage}
    <img class="absolute inset-0 h-full w-full object-cover" src={imgUrl(heroImage, 2000)} alt={destination.name} />
  {:else}
    <!-- branded fallback so the hero looks intentional before a photo is added -->
    <div class="absolute inset-0 bg-[linear-gradient(135deg,rgba(28,26,22,1)_0%,rgba(74,55,40,0.92)_100%)]"></div>
  {/if}
  <div class="absolute inset-0 bg-[linear-gradient(180deg,rgba(28,26,22,0.55)_0%,rgba(28,26,22,0.18)_34%,rgba(28,26,22,0.92)_100%)]"></div>
  <div class="absolute inset-0 bg-[linear-gradient(90deg,rgba(28,26,22,0.72)_0%,rgba(28,26,22,0.20)_58%,transparent_100%)]"></div>

  <div class="container-shell relative flex min-h-[60vh] flex-col justify-end pb-12 pt-28 md:min-h-[64vh] md:pb-16">
    <nav class="mb-5 flex items-center gap-2 text-sm text-white/70">
      <a class="font-medium transition hover:text-white" href="/destinations">Destinations</a>
      <span class="text-white/40">/</span>
      <span class="font-medium text-white/90">{destination.name}</span>
    </nav>
    <p class="text-[12px] font-bold uppercase tracking-[0.2em] text-goldfinch-gold">{regionLine}</p>
    <h1 class="mt-4 max-w-3xl font-serif text-[40px] font-light leading-[1.05] sm:text-[56px] lg:text-[68px]">{destination.name}</h1>
    {#if destination.short_description}
      <p class="mt-5 max-w-2xl text-base leading-8 text-white/85 md:text-lg">{destination.short_description}</p>
    {/if}
    {#if heroChips.length}
      <div class="mt-6 flex flex-wrap gap-2">
        {#each heroChips as chip}
          <span class="border border-goldfinch-gold/40 bg-goldfinch-gold/10 px-3 py-1.5 text-[12px] font-semibold text-goldfinch-gold backdrop-blur">{chip}</span>
        {/each}
      </div>
    {/if}
    <div class="mt-8 flex flex-wrap gap-3">
      <a class="inline-flex h-12 items-center gap-2 bg-goldfinch-gold px-6 text-[13px] font-bold uppercase tracking-[0.08em] text-deep-green transition hover:bg-savanna" href={`/plan-my-trip?destination=${destination.slug}`}>
        Plan a trip to {destination.name} <ArrowRight size={17} strokeWidth={2.4} />
      </a>
      <a class="inline-flex h-12 items-center gap-2 border border-white/30 px-6 text-[13px] font-bold uppercase tracking-[0.08em] text-white transition hover:bg-white/10" href="/contact">
        Talk to a Specialist
      </a>
    </div>
  </div>
</section>

<!-- Overview & at-a-glance -->
<section class="container-shell py-12 md:py-16">
  <div class={destScores ? 'grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14' : ''}>
    <div>
      <p class="text-[12px] font-bold uppercase tracking-[0.2em] text-clay">Overview</p>
      <h2 class="mt-3 font-serif text-3xl font-light text-heading md:text-[40px]">Why go to {destination.name}</h2>
      {#if destination.description}
        <p class="mt-5 whitespace-pre-line text-base leading-8 text-ink/75">{destination.description}</p>
      {/if}
      <div class="mt-7 flex flex-wrap gap-3">
        {#if destination.country}
          <div class="flex items-center gap-3 border border-ink/10 bg-surface px-4 py-3 shadow-soft">
            <span class="grid h-9 w-9 place-items-center bg-forest/10 text-forest"><Globe size={17} /></span>
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-wide text-ink/45">Country</p>
              <p class="text-sm font-bold text-ink">{destination.country}</p>
            </div>
          </div>
        {/if}
        {#if destination.region}
          <div class="flex items-center gap-3 border border-ink/10 bg-surface px-4 py-3 shadow-soft">
            <span class="grid h-9 w-9 place-items-center bg-forest/10 text-forest"><Compass size={17} /></span>
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-wide text-ink/45">Circuit</p>
              <p class="text-sm font-bold text-ink">{destination.region}</p>
            </div>
          </div>
        {/if}
        {#if budgetFrom}
          <div class="flex items-center gap-3 border border-ink/10 bg-surface px-4 py-3 shadow-soft">
            <span class="grid h-9 w-9 place-items-center bg-goldfinch-gold/15 text-goldfinch-gold"><Banknote size={17} /></span>
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-wide text-ink/45">Guide price</p>
              <p class="text-sm font-bold text-ink">{budgetFrom}</p>
            </div>
          </div>
        {/if}
      </div>
    </div>

    {#if destScores}
      <div class="content-start">
        <div class="border border-ink/10 bg-surface p-6 shadow-soft">
          <div class="flex items-center justify-between gap-3">
            <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-clay">How {destination.name} scores</p>
            <a class="text-xs font-semibold text-forest transition hover:text-heading" href="/destination-scores">Compare all</a>
          </div>
          <div class="mt-4"><ScoreBars scores={destScores} /></div>
        </div>
      </div>
    {/if}
  </div>
</section>
