<script lang="ts">
  import { ArrowRight } from '@lucide/svelte';
  import ResponsiveImage from './ResponsiveImage.svelte';
  import { origUrl, thumbUrl } from '$lib/img';
  import { destinationChips } from '$lib/destination-facts';
  import type { Destination, Tour } from '$lib/types';

  export let destinations: Destination[] = [];
  export let stats: Record<string, { count: number; from: number; currency: string; tours: Tour[] }> = {};
  export let eyebrow = 'The islands';
  export let title = "Tanzania's islands";
  export let intro = 'Every northern-circuit safari can end on the Indian Ocean. Tanzania has three distinct islands — each with a different character, a different pace.';

  const img = (d: Destination) => thumbUrl(d, 'banner_image_url', 'main_image_url', 'image_url');
  // Zanzibar (or the first island) takes the large tile; the rest stack beside it.
  $: lead = destinations[0];
  $: rest = destinations.slice(1, 3);
</script>

{#if lead}
  <section class="container-shell py-14 md:py-20">
    <p class="text-[12px] font-bold uppercase tracking-[0.2em] text-clay">{eyebrow}</p>
    <h2 class="mt-3 max-w-3xl font-serif text-3xl font-light lowercase text-heading md:text-[44px]">{title}</h2>
    <p class="mt-4 max-w-2xl text-base leading-8 text-ink/70">{intro}</p>

    <div class="mt-10 grid gap-4 lg:grid-cols-2 lg:grid-rows-2">
      {#each [lead, ...rest] as d, i (d.id)}
        {@const chips = destinationChips(d)}
        {@const s = stats[d.id]}
        <a
          class={`group relative isolate flex min-h-[280px] flex-col justify-end overflow-hidden bg-deep-green p-6 text-white md:p-8 ${i === 0 ? 'lg:row-span-2 lg:min-h-[560px]' : ''}`}
          href={`/destinations/${d.slug}`}
        >
          {#if img(d)}
            <ResponsiveImage
              src={origUrl(d, 'banner_image_url', 'main_image_url', 'image_url')}
              fallbackSrc={img(d)}
              alt={d.name}
              sizes="(min-width:1024px) 50vw, 100vw"
              width={i === 0 ? 1400 : 800}
              imgClass="absolute inset-0 h-full w-full object-cover transition duration-[800ms] group-hover:scale-105"
            />
          {:else}
            <div class="absolute inset-0 bg-[linear-gradient(135deg,#0f3b3a_0%,#0b2e3a_100%)]"></div>
          {/if}
          <span class="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,32,40,0.15)_0%,rgba(11,26,32,0.55)_55%,rgba(11,22,28,0.92)_100%)]"></span>

          <div class="relative z-10">
            <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-goldfinch-gold">{d.region || 'Indian Ocean'}</p>
            <h3 class={`mt-2 font-serif font-light lowercase leading-[1.05] ${i === 0 ? 'text-[34px] md:text-[46px]' : 'text-[26px]'}`}>{d.name}</h3>
            {#if d.short_description}
              <p class={`mt-2 max-w-lg leading-6 text-white/80 ${i === 0 ? 'text-[14px] md:text-[15px]' : 'text-[13px] line-clamp-2'}`}>{d.short_description}</p>
            {/if}
            {#if chips.length}
              <div class="mt-3 flex flex-wrap gap-1.5">
                {#each chips.slice(0, i === 0 ? 4 : 2) as chip}
                  <span class="border border-white/25 bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur">{chip}</span>
                {/each}
              </div>
            {/if}
            <span class="mt-4 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white transition group-hover:text-goldfinch-gold">
              Explore {d.name} <ArrowRight size={14} strokeWidth={2.5} class="transition group-hover:translate-x-1" />
            </span>
            {#if s?.count}
              <span class="mt-2 block text-[11px] text-white/60">{s.count} itinerar{s.count === 1 ? 'y' : 'ies'}{#if s.from} · from {s.currency} {s.from.toLocaleString()}{/if}</span>
            {/if}
          </div>
        </a>
      {/each}
    </div>
  </section>
{/if}
