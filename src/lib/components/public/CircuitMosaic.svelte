<script lang="ts">
  import { ArrowRight } from '@lucide/svelte';
  import { imgUrl, thumbUrl } from '$lib/img';
  import { bestForTags } from '$lib/destination-facts';
  import type { Destination } from '$lib/types';

  export let destinations: Destination[] = [];
  export let eyebrow = 'Iconic safari parks';
  export let title = "Tanzania's iconic safari parks";
  export let intro = 'Each park offers something distinct. We help you decide which combination is right for your dates, interests, and how long you have.';

  const pad = (n: number) => String(n + 1).padStart(2, '0');
  const img = (d: Destination) => thumbUrl(d, 'banner_image_url', 'main_image_url', 'image_url');
</script>

<section class="container-shell py-14 md:py-20">
  <p class="text-[12px] font-bold uppercase tracking-[0.2em] text-clay">{eyebrow}</p>
  <h2 class="mt-3 max-w-3xl font-serif text-3xl font-light lowercase text-heading md:text-[44px]">{title}</h2>
  <p class="mt-4 max-w-2xl text-base leading-8 text-ink/70">{intro}</p>

  <div class="mt-10 grid gap-px overflow-hidden border border-ink/10 bg-ink/10">
    {#each destinations as d, i (d.id)}
      <div class="grid items-stretch bg-surface md:grid-cols-2">
        <!-- image -->
        <div class={`relative min-h-[300px] overflow-hidden bg-deep-green md:min-h-[420px] ${i % 2 ? 'md:order-2' : ''}`}>
          {#if img(d)}
            <img class="absolute inset-0 h-full w-full object-cover" src={imgUrl(img(d), 1200)} alt={d.name} loading="lazy" decoding="async" />
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
            <p class="mt-4 max-w-xl text-[15px] leading-7 text-ink/70 line-clamp-4">{d.short_description || d.description}</p>
          {/if}

          <div class="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-ink/10 pt-6">
            {#if bestForTags(d).length}
              <div>
                <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/40">Best for</p>
                <p class="mt-1 text-sm font-semibold text-ink">{bestForTags(d).join(', ')}</p>
              </div>
            {/if}
            {#if d.region}
              <div>
                <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/40">Circuit</p>
                <p class="mt-1 text-sm font-semibold text-ink">{d.region}</p>
              </div>
            {/if}
          </div>

          <a class="mt-7 inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.16em] text-goldfinch-gold transition hover:text-heading" href={`/destinations/${d.slug}`}>
            Explore {d.name} <ArrowRight size={15} strokeWidth={2.5} />
          </a>
        </div>
      </div>
    {/each}
  </div>
</section>
