<script lang="ts">
  import { ArrowRight, Star } from '@lucide/svelte';
  import { origUrl, thumbUrl } from '$lib/img';
  import { bestForTags } from '$lib/destination-facts';
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
    const s = [
      destination.score_wildlife,
      destination.score_luxury,
      destination.score_family,
      destination.score_photography,
      destination.score_adventure
    ]
      .map(Number)
      .filter((n) => n > 0);
    return s.length ? Math.round((s.reduce((a, b) => a + b, 0) / s.length / 2) * 10) / 10 : null;
  })();
</script>

<a
  class="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden border border-ink/10 bg-deep-green text-white shadow-[0_14px_40px_rgba(28,26,22,0.10)] transition-shadow duration-300 hover:shadow-[0_26px_62px_rgba(28,26,22,0.20)]"
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
      imgClass="absolute inset-0 h-full w-full object-cover transition-transform duration-[800ms] ease-out group-hover:scale-105"
    />
  {:else}
    <!-- branded fallback until a real photo is added — never a blank box -->
    <div class="absolute inset-0 bg-[linear-gradient(150deg,#153733_0%,#0f2a2a_46%,rgba(74,55,40,0.96)_100%)]"></div>
    <span class="pointer-events-none absolute inset-0 opacity-[0.06]" style="background-image: radial-gradient(circle, #fff 1px, transparent 1.5px); background-size: 22px 22px;" aria-hidden="true"></span>
  {/if}
  <span class="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,26,24,0.05)_0%,rgba(15,26,24,0.42)_48%,rgba(13,22,20,0.94)_100%)]"></span>

  {#if rating}
    <span class="absolute right-3 top-3 z-10 inline-flex items-center gap-1 bg-goldfinch-gold px-2.5 py-1 text-xs font-bold text-deep-green shadow">
      <Star size={12} fill="currentColor" strokeWidth={0} /> {rating.toFixed(1)}
    </span>
  {/if}

  <div class="relative z-10 p-5 md:p-6">
    <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-goldfinch-gold">{region}</p>
    <h3 class="mt-1.5 font-serif text-[26px] font-light leading-[1.05] md:text-[30px]">{destination.name}</h3>
    {#if blurb}
      <p class="mt-2 line-clamp-2 text-[13.5px] leading-6 text-white/80">{blurb}</p>
    {/if}
    {#if tags.length}
      <div class="mt-3 flex flex-wrap gap-1.5">
        {#each tags as t}
          <span class="border border-white/25 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/90 backdrop-blur">{t}</span>
        {/each}
      </div>
    {/if}
    <span class="mt-4 inline-flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.14em] text-white transition group-hover:text-goldfinch-gold">
      Explore <ArrowRight size={14} strokeWidth={2.5} class="transition group-hover:translate-x-1" />
    </span>
  </div>
</a>
