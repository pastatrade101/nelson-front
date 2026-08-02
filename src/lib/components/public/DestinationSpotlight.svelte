<script lang="ts">
  import { ArrowRight, Award, Calendar, Clock, Maximize2, MapPin, Sparkles, Star } from '@lucide/svelte';
  import { imgUrl, thumbUrl } from '$lib/img';
  import { destinationChips, destinationFacts, luxuryStars } from '$lib/destination-facts';
  import type { Destination, Tour } from '$lib/types';

  export let destination: Destination;
  export let stat: { count: number; from: number; currency: string; tours: Tour[] } | undefined = undefined;

  $: image = thumbUrl(destination, 'banner_image_url', 'main_image_url', 'image_url');
  $: regionLine = [destination.region, destination.country].filter(Boolean).join(' · ') || 'Tanzania';
  $: chips = destinationChips(destination);
  $: facts = destinationFacts(destination);
  $: stars = luxuryStars(destination);
  $: currency = stat?.currency || 'USD';

  const clip = (s: string, n = 46) => (s.length > n ? s.slice(0, n - 1).replace(/[\s,;–-]+\S*$/, '') + '…' : s);

  type Fact = { icon: typeof Calendar; label: string; value: string };
  $: quickFacts = [
    facts.bestTime ? { icon: Calendar, label: 'Best time', value: clip(facts.bestTime) } : null,
    facts.stay ? { icon: Clock, label: 'Ideal stay', value: clip(facts.stay) } : null,
    facts.size ? { icon: Maximize2, label: 'Size', value: clip(facts.size, 28) } : null,
    facts.region ? { icon: MapPin, label: 'Region', value: clip(facts.region, 28) } : null
  ].filter(Boolean) as Fact[];
</script>

<section class="container-shell pt-8 md:pt-10">
  <div class="grid overflow-hidden border border-ink/10 bg-surface shadow-soft lg:grid-cols-[0.9fr_1.1fr]">
    <!-- media -->
    <div class="group relative min-h-[260px] overflow-hidden bg-deep-green lg:min-h-[440px]">
      {#if image}
        <img class="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]" src={imgUrl(image, 1100)} alt={destination.name} loading="eager" decoding="async" />
      {:else}
        <div class="absolute inset-0 flex items-center justify-center bg-[linear-gradient(135deg,rgba(28,26,22,1),rgba(74,55,40,0.92))]">
          <span class="font-serif text-[96px] font-light lowercase text-white/10 md:text-[130px]">{destination.name.charAt(0)}</span>
        </div>
      {/if}
      <span class="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,26,32,0)_45%,rgba(11,22,28,0.55)_100%)]"></span>
      <div class="absolute left-4 top-4 flex flex-wrap gap-2">
        <span class="bg-deep-green/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white backdrop-blur">Spotlight</span>
        {#if facts.unesco}
          <span class="inline-flex items-center gap-1 bg-goldfinch-gold px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-deep-green"><Award size={12} strokeWidth={2.6} /> UNESCO</span>
        {/if}
      </div>
    </div>

    <!-- content -->
    <div class="flex flex-col justify-center p-7 md:p-10">
      <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-goldfinch-gold">{regionLine}</p>
      <h2 class="mt-2 font-serif text-[30px] font-light lowercase leading-[1.05] text-heading md:text-[42px]">{destination.name}</h2>
      {#if destination.short_description}
        <p class="mt-3 max-w-xl text-[15px] leading-7 text-ink/70">{destination.short_description}</p>
      {/if}

      {#if chips.length}
        <div class="mt-5 flex flex-wrap gap-2">
          {#each chips as chip}
            <span class="border border-goldfinch-gold/40 bg-goldfinch-gold/10 px-2.5 py-1 text-[11px] font-semibold text-clay">{chip}</span>
          {/each}
        </div>
      {/if}

      {#if quickFacts.length}
        <div class="mt-6 grid grid-cols-2 gap-px overflow-hidden border border-ink/[0.08] bg-ink/[0.06]">
          {#each quickFacts as f}
            <div class="flex items-start gap-2.5 bg-surface p-3.5">
              <svelte:component this={f.icon} size={16} class="mt-0.5 shrink-0 text-forest/70" strokeWidth={2} />
              <div class="min-w-0">
                <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/40">{f.label}</p>
                <p class="mt-0.5 text-[13px] font-semibold leading-snug text-heading">{f.value}</p>
              </div>
            </div>
          {/each}
        </div>
      {/if}

      <!-- luxury + itinerary stats -->
      {#if stars || (stat && stat.count)}
        <div class="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2">
          {#if stars}
            <span class="inline-flex items-center gap-1.5">
              <span class="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/40">Luxury</span>
              <span class="inline-flex text-goldfinch-gold">
                {#each Array(5) as _, i}<Star size={13} fill={i < stars ? 'currentColor' : 'none'} strokeWidth={1.6} class={i < stars ? '' : 'text-ink/20'} />{/each}
              </span>
            </span>
          {/if}
          {#if stat && stat.count}
            <span class="text-sm text-ink/70">
              <span class="font-bold text-heading">{stat.count}</span> safari itinerar{stat.count === 1 ? 'y' : 'ies'}
              {#if stat.from}<span class="text-ink/40"> · </span>from <span class="font-bold text-heading">{currency} {stat.from.toLocaleString()}</span> pp{/if}
            </span>
          {/if}
        </div>
      {/if}

      <div class="mt-7 flex flex-wrap gap-3">
        <a class="inline-flex h-11 items-center gap-2 bg-deep-green px-5 text-[12px] font-bold uppercase tracking-[0.12em] text-white transition hover:bg-forest" href={`/destinations/${destination.slug}`}>
          Explore {destination.name} <ArrowRight size={15} strokeWidth={2.5} />
        </a>
        {#if stat && stat.count}
          <a class="inline-flex h-11 items-center gap-2 border border-goldfinch-gold/40 px-5 text-[12px] font-bold uppercase tracking-[0.12em] text-clay transition hover:bg-goldfinch-gold/10" href={`/tours?destination=${destination.slug}`}>
            See itineraries
          </a>
        {/if}
        <a class="inline-flex h-11 items-center gap-2 border border-ink/15 px-5 text-[12px] font-bold uppercase tracking-[0.12em] text-ink transition hover:bg-sand" href={`/plan-my-trip?destination=${destination.slug}`}>
          <Sparkles size={15} /> Plan this trip
        </a>
      </div>
    </div>
  </div>

  <!-- related itineraries (real tours that visit this destination) -->
  {#if stat && stat.tours.length}
    <div class="mt-4 border border-ink/10 bg-sand/30 p-5 md:p-6">
      <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-clay">Safaris that visit {destination.name}</p>
      <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {#each stat.tours.slice(0, 3) as tour (tour.slug)}
          <a class="group flex items-center justify-between gap-3 border border-ink/10 bg-surface px-4 py-3 shadow-soft transition hover:border-goldfinch-gold/40 hover:shadow-md" href={`/tours/${tour.slug}`}>
            <span class="min-w-0">
              <span class="block truncate font-serif text-[16px] font-normal text-heading">{tour.title}</span>
              <span class="mt-0.5 block text-[12px] text-ink/55">
                {#if tour.duration_days}{tour.duration_days}-day{/if}{#if tour.price_from} · from {currency} {tour.price_from.toLocaleString()}{/if}
              </span>
            </span>
            <ArrowRight size={15} strokeWidth={2.4} class="shrink-0 text-forest transition group-hover:translate-x-0.5" />
          </a>
        {/each}
      </div>
    </div>
  {/if}
</section>
