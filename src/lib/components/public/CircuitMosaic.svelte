<script lang="ts">
  import { ArrowRight } from '@lucide/svelte';
  import { origUrl, thumbUrl } from '$lib/img';
  import ResponsiveImage from './ResponsiveImage.svelte';
  import { destinationChips, destinationFacts } from '$lib/destination-facts';
  import type { Destination, Tour } from '$lib/types';

  export let destinations: Destination[] = [];
  export let stats: Record<string, { count: number; from: number; currency: string; tours: Tour[] }> = {};
  export let eyebrow = 'Iconic safari parks';
  export let title = "Tanzania's iconic safari parks";
  export let intro = 'Each park offers something distinct. We help you decide which combination is right for your dates, interests, and how long you have.';

  const pad = (n: number) => String(n + 1).padStart(2, '0');
  const img = (d: Destination) => thumbUrl(d, 'banner_image_url', 'main_image_url', 'image_url');
  const clip = (s: string, n = 22) => (s.length > n ? s.slice(0, n - 1).replace(/[\s,;–-]+\S*$/, '') + '…' : s);
  const quickFacts = (d: Destination) => {
    const f = destinationFacts(d);
    return [
      f.bestTime ? { label: 'Best time', value: clip(f.bestTime) } : null,
      f.stay ? { label: 'Ideal stay', value: clip(f.stay) } : null,
      f.size ? { label: 'Size', value: clip(f.size, 18) } : null,
      f.region ? { label: 'Region', value: clip(f.region, 18) } : null
    ].filter(Boolean) as { label: string; value: string }[];
  };
</script>

<section class="container-shell py-14 md:py-20">
  <p class="text-[12px] font-bold uppercase tracking-[0.2em] text-clay">{eyebrow}</p>
  <h2 class="mt-3 max-w-3xl font-serif text-3xl font-light lowercase text-heading md:text-[44px]">{title}</h2>
  <p class="mt-4 max-w-2xl text-base leading-8 text-ink/70">{intro}</p>

  <div class="mt-10 grid gap-px overflow-hidden border border-ink/10 bg-ink/10">
    {#each destinations as d, i (d.id)}
      {@const chips = destinationChips(d)}
      {@const qf = quickFacts(d)}
      {@const s = stats[d.id]}
      <div class="grid items-stretch bg-surface md:grid-cols-2">
        <!-- image -->
        <div class={`group relative min-h-[300px] overflow-hidden bg-deep-green md:min-h-[420px] ${i % 2 ? 'md:order-2' : ''}`}>
          {#if img(d)}
            <ResponsiveImage src={origUrl(d, 'banner_image_url', 'main_image_url', 'image_url')} fallbackSrc={img(d)} width={1200} alt={d.name} imgClass="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]" sizes="(min-width:768px) 50vw, 100vw" />
            <span class="absolute inset-0 bg-[linear-gradient(180deg,transparent_50%,rgba(28,26,22,0.55)_100%)]"></span>
          {:else}
            <div class="absolute inset-0 flex items-center justify-center bg-[linear-gradient(135deg,rgba(28,26,22,1),rgba(74,55,40,0.92))]">
              <span class="font-serif text-[80px] font-light text-white/12 md:text-[120px]">{pad(i)}</span>
            </div>
          {/if}
          <span class="absolute left-5 top-5 bg-deep-green/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white backdrop-blur">{d.region ?? 'Tanzania'}</span>
        </div>

        <!-- facts -->
        <div class={`flex flex-col justify-center p-7 md:p-11 ${i % 2 ? 'md:order-1' : ''}`}>
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-goldfinch-gold">{[d.region, d.country].filter(Boolean).join(' · ') || 'Tanzania'}</p>
          <h3 class="mt-3 font-serif text-[30px] font-light lowercase leading-[1.08] text-heading md:text-[38px]">{d.name}</h3>
          {#if d.short_description || d.description}
            <p class="mt-4 max-w-xl text-[15px] leading-7 text-ink/70 line-clamp-3">{d.short_description || d.description}</p>
          {/if}

          {#if chips.length}
            <div class="mt-5 flex flex-wrap gap-2">
              {#each chips as chip}
                <span class="border border-goldfinch-gold/40 bg-goldfinch-gold/10 px-2.5 py-1 text-[11px] font-semibold text-clay">{chip}</span>
              {/each}
            </div>
          {/if}

          {#if qf.length}
            <div class="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-ink/10 pt-6">
              {#each qf as f}
                <div>
                  <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/40">{f.label}</p>
                  <p class="mt-1 truncate text-sm font-semibold text-ink">{f.value}</p>
                </div>
              {/each}
            </div>
          {/if}

          <div class="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2">
            <a class="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.16em] text-goldfinch-gold transition hover:text-heading" href={`/destinations/${d.slug}`}>
              Explore {d.name} <ArrowRight size={15} strokeWidth={2.5} />
            </a>
            {#if s?.count}
              <span class="text-sm text-ink/55"><span class="font-bold text-heading">{s.count}</span> itinerar{s.count === 1 ? 'y' : 'ies'}{#if s.from} · from <span class="font-bold text-heading">{s.currency} {s.from.toLocaleString()}</span>{/if}</span>
            {/if}
          </div>
        </div>
      </div>
    {/each}
  </div>
</section>
