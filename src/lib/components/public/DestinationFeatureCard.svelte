<script lang="ts">
  import { ArrowRight, Calendar, Clock, PawPrint, Sparkles, Star } from '@lucide/svelte';
  import { origUrl, thumbUrl } from '$lib/img';
  import { bestForTags, destinationFacts } from '$lib/destination-facts';
  import ResponsiveImage from '$lib/components/public/ResponsiveImage.svelte';
  import type { Destination } from '$lib/types';

  export let destination: Destination;

  $: image = thumbUrl(destination, 'main_image_url', 'banner_image_url', 'image_url');
  $: original = origUrl(destination, 'main_image_url', 'banner_image_url', 'image_url');
  $: region = destination.region || destination.country || 'Tanzania';
  $: blurb = destination.short_description || destination.description || '';
  $: tags = bestForTags(destination).slice(0, 2);

  // Average the curated 0–10 scores into a /5 rating (shown only when scored).
  $: rating = (() => {
    const s = [destination.score_wildlife, destination.score_luxury, destination.score_family, destination.score_photography, destination.score_adventure]
      .map(Number)
      .filter((n) => n > 0);
    return s.length ? Math.round((s.reduce((a, b) => a + b, 0) / s.length / 2) * 10) / 10 : null;
  })();

  // ── Quick facts revealed on hover — REAL data only; each row renders only when
  // its value exists. Best time / ideal length come from the destination guide's
  // facts block (populated for some destinations); "best for" + wildlife from the
  // 0–10 scores; price from score_budget_from. Nothing is ever fabricated.
  const clip = (s: string, n = 26) => (s.length > n ? `${s.slice(0, n).trimEnd()}…` : s);
  $: facts = destinationFacts(destination);
  $: strengths = [
    { label: 'Wildlife', v: Number(destination.score_wildlife) || 0 },
    { label: 'Photography', v: Number(destination.score_photography) || 0 },
    { label: 'Family', v: Number(destination.score_family) || 0 },
    { label: 'Adventure', v: Number(destination.score_adventure) || 0 }
  ]
    .filter((s) => s.v > 0)
    .sort((a, b) => b.v - a.v);
  $: bestFor = strengths.slice(0, 2).map((s) => s.label).join(' · ');
  $: wildlifeScore = Number(destination.score_wildlife) || 0;

  type Fact = { icon: typeof Star; label: string; value: string };
  $: quickFacts = [
    facts.bestTime && { icon: Calendar, label: 'Best time', value: clip(facts.bestTime) },
    facts.stay && { icon: Clock, label: 'Ideal length', value: clip(facts.stay) },
    wildlifeScore >= 8 && { icon: PawPrint, label: 'Wildlife', value: `${wildlifeScore}/10` },
    bestFor && { icon: Sparkles, label: 'Best for', value: bestFor }
  ].filter(Boolean).slice(0, 4) as Fact[];
</script>

<a
  class="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden border border-ink/10 bg-deep-green text-white shadow-[0_14px_40px_rgba(28,26,22,0.10)] transition-shadow duration-300 hover:shadow-[0_26px_62px_rgba(28,26,22,0.22)]"
  href={`/destinations/${destination.slug}`}
  aria-label={`Explore ${destination.name}`}
>
  {#if image}
    <ResponsiveImage
      src={original}
      fallbackSrc={image}
      alt={destination.name}
      width={900}
      sizes="(min-width:1024px) 400px, (min-width:640px) 50vw, 100vw"
      imgClass="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.07]"
    />
  {:else}
    <!-- branded fallback until a real photo is added — never a blank box -->
    <div class="absolute inset-0 bg-[linear-gradient(150deg,#153733_0%,#0f2a2a_46%,rgba(74,55,40,0.96)_100%)]"></div>
    <span class="pointer-events-none absolute inset-0 opacity-[0.06]" style="background-image: radial-gradient(circle, #fff 1px, transparent 1.5px); background-size: 22px 22px;" aria-hidden="true"></span>
  {/if}
  <!-- gradient deepens on hover so the revealed facts stay legible -->
  <span class="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,26,24,0.02)_0%,rgba(15,26,24,0.34)_46%,rgba(13,22,20,0.92)_100%)] transition-opacity duration-500 md:opacity-90 md:group-hover:opacity-100"></span>

  {#if rating}
    <span class="absolute right-3 top-3 z-10 inline-flex items-center gap-1 bg-goldfinch-gold px-2.5 py-1 text-xs font-bold text-deep-green shadow">
      <Star size={12} fill="currentColor" strokeWidth={0} /> {rating.toFixed(1)}
    </span>
  {/if}

  <!-- Content: on desktop it sits low (region + name visible) and slides up on
       hover to reveal the facts; on mobile it's always fully shown (no hover). -->
  <div
    class="relative z-10 translate-y-0 p-5 transition-transform duration-[520ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform md:translate-y-[calc(100%_-_5.4rem)] md:p-6 md:group-hover:translate-y-0"
  >
    <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-goldfinch-gold">{region}</p>
    <h3 class="mt-1.5 font-serif text-[26px] font-light leading-[1.05] md:text-[30px]">{destination.name}</h3>

    <!-- revealed block (visible on mobile; fades in on desktop hover) -->
    <div class="opacity-100 transition-opacity duration-300 md:opacity-0 md:group-hover:opacity-100 md:group-hover:delay-100">
      {#if blurb}
        <p class="mt-2.5 line-clamp-2 text-[13.5px] leading-6 text-white/80">{blurb}</p>
      {/if}

      {#if quickFacts.length}
        <div class="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-white/15 pt-3">
          {#each quickFacts as f}
            {@const FI = f.icon}
            <div class="flex min-w-0 items-center gap-2">
              <span class="grid h-7 w-7 shrink-0 place-items-center bg-white/10 text-goldfinch-gold"><FI size={13} strokeWidth={2} /></span>
              <span class="min-w-0">
                <span class="block text-[9px] font-bold uppercase tracking-[0.1em] text-white/45">{f.label}</span>
                <span class="block truncate text-[12px] font-semibold text-white/90">{f.value}</span>
              </span>
            </div>
          {/each}
        </div>
      {/if}

      {#if tags.length}
        <div class="mt-3 flex flex-wrap gap-1.5">
          {#each tags as t}
            <span class="border border-white/25 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/90 backdrop-blur">{t}</span>
          {/each}
        </div>
      {/if}
    </div>

    <span class="mt-4 inline-flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.14em] text-white transition group-hover:text-goldfinch-gold">
      Explore <ArrowRight size={14} strokeWidth={2.5} class="transition group-hover:translate-x-1" />
    </span>
  </div>
</a>
