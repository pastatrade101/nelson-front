<script lang="ts">
  import { ArrowRight, Sparkles } from '@lucide/svelte';
  import { imgUrl, thumbUrl } from '$lib/img';
  import { bestForTags } from '$lib/destination-facts';
  import type { Destination } from '$lib/types';

  export let destination: Destination;

  $: image = thumbUrl(destination, 'banner_image_url', 'main_image_url', 'image_url');
  $: regionLine = [destination.region, destination.country].filter(Boolean).join(' · ') || 'Tanzania';
  $: tags = bestForTags(destination);

  // Top 3 non-empty scores, shown as a compact strength line.
  $: topScores = (
    [
      ['Wildlife', destination.score_wildlife],
      ['Photography', destination.score_photography],
      ['Family', destination.score_family],
      ['Luxury', destination.score_luxury],
      ['Adventure', destination.score_adventure]
    ] as [string, number | null | undefined][]
  )
    .filter(([, v]) => v != null)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .slice(0, 3);
</script>

<section class="container-shell pt-8 md:pt-10">
  <div class="grid overflow-hidden border border-ink/10 bg-surface shadow-soft md:grid-cols-[0.85fr_1.15fr]">
    <!-- media -->
    <div class="relative min-h-[200px] overflow-hidden bg-deep-green md:min-h-[300px]">
      {#if image}
        <img class="absolute inset-0 h-full w-full object-cover" src={imgUrl(image, 900)} alt={destination.name} loading="eager" decoding="async" />
      {:else}
        <div class="absolute inset-0 flex items-center justify-center bg-[linear-gradient(135deg,rgba(28,26,22,1),rgba(74,55,40,0.92))]">
          <span class="font-serif text-[64px] font-light lowercase text-white/12 md:text-[96px]">{destination.name.charAt(0)}</span>
        </div>
      {/if}
      <span class="absolute left-4 top-4 bg-deep-green/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white backdrop-blur">Spotlight</span>
    </div>

    <!-- content -->
    <div class="flex flex-col justify-center p-7 md:p-10">
      <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-goldfinch-gold">{regionLine}</p>
      <h2 class="mt-2 font-serif text-[30px] font-light lowercase leading-[1.05] text-heading md:text-[40px]">{destination.name}</h2>
      {#if destination.short_description}
        <p class="mt-3 max-w-xl text-[15px] leading-7 text-ink/70 line-clamp-3">{destination.short_description}</p>
      {/if}

      {#if tags.length}
        <div class="mt-5 flex flex-wrap gap-2">
          {#each tags as tag}
            <span class="border border-goldfinch-gold/40 bg-goldfinch-gold/10 px-2.5 py-1 text-[11px] font-semibold text-goldfinch-gold">{tag}</span>
          {/each}
        </div>
      {/if}

      {#if topScores.length}
        <div class="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          {#each topScores as [label, value]}
            <span class="inline-flex items-baseline gap-1.5 text-ink/60">
              <span class="text-[11px] font-semibold uppercase tracking-wide text-ink/45">{label}</span>
              <span class="font-bold text-heading">{value}</span>
            </span>
          {/each}
        </div>
      {/if}

      <div class="mt-7 flex flex-wrap gap-3">
        <a class="inline-flex h-11 items-center gap-2 bg-deep-green px-5 text-[12px] font-bold uppercase tracking-[0.12em] text-white transition hover:bg-forest" href={`/destinations/${destination.slug}`}>
          View the full {destination.name} guide <ArrowRight size={15} strokeWidth={2.5} />
        </a>
        <a class="inline-flex h-11 items-center gap-2 border border-ink/15 px-5 text-[12px] font-bold uppercase tracking-[0.12em] text-ink transition hover:bg-sand" href={`/plan-my-trip?destination=${destination.slug}`}>
          <Sparkles size={15} /> Plan a trip here
        </a>
      </div>
    </div>
  </div>
</section>
