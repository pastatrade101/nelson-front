<script lang="ts">
  import { ArrowRight } from '@lucide/svelte';
  import RichText from './RichText.svelte';
  import { origUrl, thumbUrl } from '$lib/img';
  import ScoreBars from '$lib/components/public/ScoreBars.svelte';
  import ResponsiveImage from './ResponsiveImage.svelte';
  import { currency, formatUsdWhole } from '$lib/currency';
  import type { Destination } from '$lib/types';
  import type { DestinationScores } from '$lib/data/destination-scores';

  export let destination: Destination;
  /** The guide's quick facts (best time, how long to stay…), shown beside the overview. */
  export let facts: { label: string; value: string }[] = [];

  // The guide's facts first; country, circuit and guide price only where the
  // facts don't already say them.
  $: glance = (() => {
    const list = facts.filter((f) => f?.label?.trim() && f?.value?.trim());
    const has = (re: RegExp) => list.some((f) => re.test(f.label));
    return [
      ...list,
      ...(destination.country && !has(/country|location/i) ? [{ label: 'Country', value: destination.country }] : []),
      ...(destination.region && !has(/circuit|region|location/i) ? [{ label: 'Circuit', value: destination.region }] : []),
      ...(budgetFrom && !has(/price|cost|budget/i) ? [{ label: 'Guide price', value: budgetFrom }] : [])
    ];
  })();

  // All computed from real destination fields; each section hides itself when the
  // client hasn't filled the data, so nothing ever renders empty or broken.
  $: heroImage = destination.banner_image_url || destination.main_image_url || destination.image_url || '';
  $: regionLine = [destination.region, destination.country].filter(Boolean).join(' · ') || 'Tanzania';
  $: budgetFrom = destination.score_budget_from ? `From ${formatUsdWhole(destination.score_budget_from, $currency)}` : '';

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
<section class="relative overflow-hidden bg-deep-green text-white">
  {#if heroImage}
    <ResponsiveImage
      src={origUrl(destination, 'banner_image_url', 'main_image_url', 'image_url')}
      fallbackSrc={thumbUrl(destination, 'banner_image_url', 'main_image_url', 'image_url')}
      alt={destination.name}
      imgClass="absolute inset-0 h-full w-full object-cover"
      sizes="100vw"
      width={2000}
      eager
      priority
    />
  {:else}
    <!-- branded fallback so the hero looks intentional before a photo is added -->
    <div class="absolute inset-0 bg-[linear-gradient(135deg,rgba(28,26,22,1)_0%,rgba(74,55,40,0.92)_100%)]"></div>
  {/if}
  <div class="absolute inset-0 bg-[linear-gradient(180deg,rgba(28,26,22,0.28)_0%,transparent_38%,rgba(28,26,22,0.78)_100%)]"></div>
  <div class="absolute inset-0 bg-[linear-gradient(90deg,rgba(28,26,22,0.32)_0%,transparent_55%)]"></div>

  <div class="container-shell relative flex min-h-[420px] flex-col justify-end py-12 [text-shadow:0_2px_18px_rgba(0,0,0,0.5)] md:min-h-[500px] md:py-16">
    <nav aria-label="Breadcrumb" class="mb-5 flex flex-wrap items-center gap-2 text-sm text-white/80">
      <a class="font-medium transition hover:text-white" href="/destinations">Destinations</a>
      <span class="text-white/40">/</span>
      <span class="font-medium text-white/90">{destination.name}</span>
    </nav>
    <p class="text-[15px] font-medium text-white/80">{regionLine}</p>
    <h1 class="type-h1 mt-3 max-w-4xl">{destination.name}</h1>
    {#if destination.short_description}
      <p class="type-lead mt-5 max-w-2xl text-white/85">{destination.short_description}</p>
    {/if}
    <div class="mt-8 flex flex-wrap gap-3">
      <a class="inline-flex h-12 items-center gap-2 bg-emnel-gold px-6 text-[15px] font-semibold text-deep-green transition hover:bg-savanna" href={`/plan-my-trip?destination=${destination.slug}`}>
        Plan a trip here <ArrowRight size={17} strokeWidth={2.2} />
      </a>
      <a class="inline-flex h-12 items-center gap-2 border border-white/30 px-6 text-[15px] font-semibold text-white transition hover:bg-white/10" href="/contact">
        Talk to a specialist
      </a>
    </div>
  </div>
</section>

<slot />

<!-- Overview: why go, with the facts and scores at a glance beside it. -->
<section id="overview" class="scroll-mt-[calc(var(--nav-h)+64px)] bg-canvas py-16 md:py-24">
  <div class="container-shell">
    <div class={glance.length || destScores ? 'grid gap-12 lg:grid-cols-12 lg:gap-14' : ''}>
      <div class="min-w-0 lg:col-span-7">
        <h2 class="type-h2 text-heading">Why go to {destination.name}</h2>
        <!-- RichText, so links written in the CMS render as real anchors. It
             also handles the plain text that predates the editor, so existing
             descriptions keep working unchanged. -->
        <RichText value={destination.description} className="mt-6 max-w-[68ch] text-base leading-[1.8] text-ink/75" />
        {#if heroChips.length}
          <p class="mt-6 text-[15px] font-semibold leading-[1.6] text-forest">{heroChips.join(' · ')}</p>
        {/if}
      </div>

      {#if glance.length || destScores}
        <aside class="grid content-start gap-10 lg:col-span-5 lg:pl-4">
          {#if glance.length}
            <div>
              <h3 class="type-card text-heading">{destination.name} at a glance</h3>
              <dl class="mt-4 border-t border-ink/15">
                {#each glance as item (item.label)}
                  <div class="grid gap-1 border-b border-ink/10 py-3.5 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-5">
                    <dt class="text-[13px] leading-[1.6] text-ink/55">{item.label}</dt>
                    <dd class="text-[15px] leading-[1.6] text-heading">{item.value}</dd>
                  </div>
                {/each}
              </dl>
            </div>
          {/if}
          {#if destScores}
            <div>
              <div class="flex items-baseline justify-between gap-3">
                <h3 class="type-card text-heading">How it scores</h3>
                <a class="group inline-flex items-center gap-1 text-sm font-semibold text-deep-green transition hover:text-clay" href="/destination-scores">
                  Compare destinations <ArrowRight size={14} class="transition group-hover:translate-x-0.5" />
                </a>
              </div>
              <div class="mt-4 border-t border-ink/15 pt-4"><ScoreBars scores={destScores} /></div>
            </div>
          {/if}
        </aside>
      {/if}
    </div>
  </div>
</section>
