<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { ArrowRight, ChevronDown, MapPin, Star } from '@lucide/svelte';
  import { goto } from '$app/navigation';
  import { api } from '$lib/api/client';
  import { fadeUpOnScroll, revealHeading, tilt } from '$lib/animations';
  import type { Destination } from '$lib/types';

  const FALLBACK_PROMO = 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1200&q=80';

  let destinations: Destination[] = [];
  let promoImage = FALLBACK_PROMO;
  let dest = '';

  // ---- slider state ----
  let viewport: HTMLDivElement;
  let cards: HTMLElement[] = [];
  let page = 0;
  let visibleCount = 3;
  let paused = false;
  let timer: ReturnType<typeof setInterval> | undefined;

  $: pageCount = Math.max(Math.ceil(destinations.length / visibleCount), 1);

  const imgOf = (d: Destination) => d.main_image_url || d.banner_image_url || d.image_url || '';
  const ratingOf = (d: Destination) => {
    const s = [d.score_wildlife, d.score_luxury, d.score_family, d.score_photography, d.score_adventure]
      .map(Number)
      .filter((n) => n > 0);
    if (!s.length) return null;
    return Math.round((s.reduce((a, b) => a + b, 0) / s.length / 2) * 10) / 10; // 0–10 → /5
  };
  const taglineOf = (d: Destination) => d.region || d.short_description || 'Tailor-made safaris';

  const registerCard = (node: HTMLElement, index: number) => {
    cards[index] = node;
    return { destroy() { cards[index] = undefined as unknown as HTMLElement; } };
  };

  const syncVisibleCount = () => {
    const w = document.documentElement.clientWidth || window.innerWidth;
    visibleCount = w >= 1024 ? 3 : w >= 640 ? 2 : 1;
    page = Math.min(page, Math.max(Math.ceil(destinations.length / visibleCount) - 1, 0));
    requestAnimationFrame(() => goTo(page, false));
  };

  const goTo = (next: number, smooth = true) => {
    page = ((next % pageCount) + pageCount) % pageCount;
    const card = cards[page * visibleCount];
    if (!viewport || !card) return;
    viewport.scrollTo({ behavior: smooth ? 'smooth' : 'auto', left: Math.max(card.offsetLeft - viewport.offsetLeft, 0) });
  };

  const startAuto = () => {
    stop();
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) timer = setInterval(() => { if (!paused && destinations.length > visibleCount) goTo(page + 1); }, 4500);
  };
  const stop = () => { if (timer) clearInterval(timer); };
  onDestroy(() => {
    stop();
    if (typeof window !== 'undefined') window.removeEventListener('resize', syncVisibleCount);
  });

  const bookNow = () => goto(dest ? `/plan-my-trip?destination=${dest}` : '/plan-my-trip');

  onMount(async () => {
    try {
      const res = await api.destinations.list({ status: 'published', limit: 12 });
      destinations = ((res.data.items ?? []) as Destination[]).filter((d) => d.slug && imgOf(d));
      const tz = destinations.find((d) => d.slug === 'tanzania');
      promoImage = imgOf(tz ?? destinations[0]) || FALLBACK_PROMO;
    } catch {
      destinations = [];
    }
    syncVisibleCount();
    startAuto();
    window.addEventListener('resize', syncVisibleCount);
  });
</script>

{#if destinations.length}
  <section class="py-14 md:py-20" use:fadeUpOnScroll={{ y: 18 }}>
    <div class="container-shell">
      <div class="grid overflow-hidden rounded-none border border-ink/10 shadow-[0_18px_50px_rgba(28,26,22,0.10)] lg:grid-cols-[0.82fr_1.18fr]">
      <!-- ── left promo ─────────────────────────────────────────── -->
      <div class="relative flex flex-col justify-center overflow-hidden px-6 py-14 text-white md:px-10 md:py-20">
        <img class="absolute inset-0 h-full w-full object-cover" src={promoImage} alt="" aria-hidden="true" loading="lazy" />
        <div class="absolute inset-0 bg-gradient-to-br from-deep-green/90 via-deep-green/80 to-forest/70"></div>

        <div class="relative max-w-md">
          <p class="font-serif text-3xl italic text-savanna">discover</p>
          <p class="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-white/80">Limited green-season departures</p>
          <p class="mt-5 flex items-baseline gap-2 font-extrabold leading-none text-goldfinch-gold">
            <span class="text-6xl">20%</span><span class="text-xl text-white/85">better value</span>
          </p>
          <p class="mt-4 text-xl font-bold">New safari experiences in Tanzania</p>

          <div class="mt-7 flex h-14 items-center gap-2 rounded-lg bg-surface/95 px-3 shadow-lg">
            <MapPin size={18} class="shrink-0 text-forest" />
            <select class="h-12 w-full cursor-pointer appearance-none bg-transparent text-sm font-semibold text-ink outline-none" bind:value={dest} aria-label="Choose a destination">
              <option value="">Where do you want to go?</option>
              {#each destinations as d (d.slug)}
                <option value={d.slug}>{d.name}</option>
              {/each}
            </select>
            <ChevronDown size={18} class="pointer-events-none shrink-0 text-ink/40" />
          </div>

          <button
            class="mt-5 inline-flex h-12 items-center gap-2 rounded-lg bg-goldfinch-gold px-7 font-bold text-heading shadow-lg transition hover:-translate-y-0.5 hover:brightness-105"
            type="button"
            on:click={bookNow}
          >
            Book Now <ArrowRight size={18} strokeWidth={2.6} />
          </button>
        </div>
      </div>

      <!-- ── right: explore destinations ────────────────────────── -->
      <div class="relative bg-sand/30 px-6 py-14 md:px-10 md:py-20">
        <span class="pointer-events-none absolute inset-0 opacity-[0.04]" style="background-image: radial-gradient(circle, #1C1A16 1px, transparent 1.5px); background-size: 24px 24px;" aria-hidden="true"></span>
        <div class="relative">
          <p class="font-serif text-xl italic text-clay">Top Destinations</p>
          <h2 class="mt-2 text-3xl font-extrabold tracking-tight text-heading md:text-[40px]" use:revealHeading>Explore Popular Destinations</h2>
          <p class="mt-3 max-w-xl text-[15px] leading-7 text-ink/70">
            From the Serengeti's endless plains to Zanzibar's white-sand shores — handpicked places our local specialists know inside out.
          </p>

          <!-- auto-sliding cards (hover to reveal info) -->
          <div class="mt-8 overflow-hidden" role="group" aria-label="Popular destinations" bind:this={viewport} on:mouseenter={() => (paused = true)} on:mouseleave={() => (paused = false)}>
            <div class="dest-track">
              {#each destinations as d, i (d.slug)}
                {@const rating = ratingOf(d)}
                <a class="dest-card group relative block aspect-[3/4] overflow-hidden rounded-none shadow-soft" href={`/destinations/${d.slug}`} use:registerCard={i} use:tilt={{ max: 6 }}>
                  <img class="h-full w-full object-cover transition-transform duration-[600ms] ease-out group-hover:scale-105" src={imgOf(d)} alt={d.name} loading="lazy" />

                  {#if rating}
                    <span class="absolute left-3 top-3 inline-flex items-center gap-1 rounded-md bg-goldfinch-gold px-2.5 py-1 text-xs font-bold text-heading shadow">
                      <Star size={12} fill="currentColor" /> {rating.toFixed(1)}
                    </span>
                  {/if}

                  <!-- info panel: name peeks; full info on hover -->
                  <div class="absolute inset-x-0 bottom-0 translate-y-[calc(100%-4rem)] bg-gradient-to-t from-deep-green via-deep-green/85 to-deep-green/0 p-4 text-white transition-transform duration-300 ease-out group-hover:translate-y-0">
                    <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-savanna">Destination</p>
                    <h3 class="text-lg font-extrabold leading-tight">{d.name}</h3>
                    <p class="mt-1.5 line-clamp-2 text-sm leading-5 text-white/80">{taglineOf(d)}</p>
                    <span class="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-white/40 px-4 py-1.5 text-sm font-bold transition group-hover:bg-surface group-hover:text-heading">
                      Discover <ArrowRight size={14} strokeWidth={2.6} />
                    </span>
                  </div>
                </a>
              {/each}
            </div>
          </div>

          <!-- dots -->
          {#if pageCount > 1}
            <div class="mt-7 flex items-center gap-2">
              {#each Array(pageCount) as _, i}
                <button
                  class={`h-2.5 rounded-full transition-all ${i === page ? 'w-7 bg-forest' : 'w-2.5 bg-black/15 hover:bg-black/30'}`}
                  type="button"
                  aria-label={`Go to slide ${i + 1}`}
                  aria-current={i === page}
                  on:click={() => goTo(i)}
                ></button>
              {/each}
            </div>
          {/if}
        </div>
      </div>
      </div>
    </div>
  </section>
{/if}

<style>
  .dest-track {
    display: grid;
    gap: 18px;
    grid-auto-flow: column;
    grid-auto-columns: 100%;
  }
  @media (min-width: 640px) {
    .dest-track {
      grid-auto-columns: calc((100% - 18px) / 2);
    }
  }
  @media (min-width: 1024px) {
    .dest-track {
      gap: 20px;
      grid-auto-columns: calc((100% - 40px) / 3);
    }
  }
</style>
