<script lang="ts">
  import { ArrowRight } from '@lucide/svelte';
  import { origUrl, thumbUrl } from '$lib/img';
  import ResponsiveImage from './ResponsiveImage.svelte';
  import { destinationChips } from '$lib/destination-facts';
  import type { Destination, Tour } from '$lib/types';

  export let destinations: Destination[] = [];
  export let stats: Record<string, { count: number; from: number; currency: string; tours: Tour[] }> = {};
  export let eyebrow = 'Beyond the north';
  export let title = 'The southern & western circuits';
  export let intro = "Tanzania's wilder, less-visited parks — for travellers who want the full picture, with fewer vehicles and a more expedition-style pace.";
  export let ctaLabel = 'Plan a wild-south safari';
  export let ctaHref = '/plan-my-trip';

  const img = (d: Destination) => thumbUrl(d, 'main_image_url', 'image_url', 'banner_image_url');
</script>

<section class="border-y border-ink/[0.06] bg-sand/30 py-14 md:py-20">
  <div class="container-shell">
    <p class="text-[12px] font-bold uppercase tracking-[0.2em] text-clay">{eyebrow}</p>
    <h2 class="mt-3 max-w-3xl font-serif text-3xl font-light lowercase text-heading md:text-[40px]">{title}</h2>
    <p class="mt-4 max-w-2xl text-base leading-8 text-ink/70">{intro}</p>

    <!-- column header (desktop) -->
    <div class="mt-10 hidden grid-cols-[2.2fr_1.4fr_auto] gap-6 border-b border-ink/10 pb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-ink/40 lg:grid">
      <span>Park &amp; description</span>
      <span>Best for</span>
      <span class="text-right">Explore</span>
    </div>

    <div class="divide-y divide-ink/10 border-b border-ink/10">
      {#each destinations as d (d.id)}
        {@const s = stats[d.id]}
        <div class="grid items-center gap-5 py-6 lg:grid-cols-[2.2fr_1.4fr_auto] lg:gap-6">
          <div class="flex items-center gap-4">
            <div class="hidden h-16 w-24 shrink-0 overflow-hidden bg-deep-green sm:block">
              {#if img(d)}
                <ResponsiveImage src={origUrl(d, 'main_image_url', 'image_url', 'banner_image_url')} fallbackSrc={img(d)} width={240} alt={d.name} imgClass="h-full w-full object-cover" sizes="96px" />
              {:else}
                <div class="h-full w-full bg-[linear-gradient(135deg,rgba(28,26,22,1),rgba(74,55,40,0.9))]"></div>
              {/if}
            </div>
            <div class="min-w-0">
              <h3 class="font-serif text-xl font-normal lowercase text-heading">{d.name}</h3>
              {#if d.short_description || d.description}
                <p class="mt-1 line-clamp-2 text-sm leading-6 text-ink/65">{d.short_description || d.description}</p>
              {/if}
              {#if s?.count}
                <p class="mt-1.5 text-[12px] font-semibold text-clay">{s.count} itinerar{s.count === 1 ? 'y' : 'ies'}{#if s.from} · from {s.currency} {s.from.toLocaleString()}{/if}</p>
              {/if}
            </div>
          </div>

          <div class="flex flex-wrap gap-1.5">
            {#each destinationChips(d).slice(0, 3) as tag}
              <span class="border border-goldfinch-gold/30 bg-goldfinch-gold/10 px-2.5 py-1 text-[11px] font-semibold text-clay">{tag}</span>
            {/each}
          </div>

          <a class="inline-flex shrink-0 items-center gap-2 justify-self-start text-[12px] font-bold uppercase tracking-[0.14em] text-forest transition hover:text-heading lg:justify-self-end" href={`/destinations/${d.slug}`}>
            Explore <ArrowRight size={14} strokeWidth={2.5} />
          </a>
        </div>
      {/each}
    </div>

    <div class="mt-8 flex flex-wrap items-center justify-between gap-4">
      <p class="max-w-xl text-sm text-ink/60">The south rewards the curious traveller — fewer camps, fewer vehicles, and a quality of encounter the north rarely matches at peak season.</p>
      <a class="inline-flex h-11 shrink-0 items-center gap-2 bg-deep-green px-6 text-[12px] font-bold uppercase tracking-[0.14em] text-white transition hover:bg-forest" href={ctaHref}>
        {ctaLabel} <ArrowRight size={15} strokeWidth={2.5} />
      </a>
    </div>
  </div>
</section>
