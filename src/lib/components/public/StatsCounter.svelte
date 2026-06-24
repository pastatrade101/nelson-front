<script lang="ts">
  import { onMount } from 'svelte';
  import { Award, Compass, MapPin, Star } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import { fadeUpOnScroll } from '$lib/animations';

  type Stat = { value: number; decimals?: number; suffix?: string; label: string; icon: typeof Award };

  // Sensible defaults; trip/destination counts are filled from the API.
  let stats: Stat[] = [
    { value: 12, suffix: '+', label: 'Years of local expertise', icon: Award },
    { value: 20, suffix: '+', label: 'Tailor-made trips designed', icon: Compass },
    { value: 5, suffix: '', label: 'Destinations covered', icon: MapPin },
    { value: 4.9, decimals: 1, suffix: '★', label: 'Average traveller rating', icon: Star }
  ];

  let displays: number[] = stats.map(() => 0);
  let el: HTMLElement;
  let started = false;

  const fmt = (v: number, s: Stat) => (s.decimals ? v.toFixed(s.decimals) : Math.round(v).toLocaleString());

  const run = () => {
    if (started) return;
    started = true;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      displays = stats.map((s) => s.value);
      return;
    }
    const duration = 1600;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const e = 1 - Math.pow(1 - t, 3); // easeOutCubic
      displays = stats.map((s) => s.value * e);
      if (t < 1) requestAnimationFrame(tick);
      else displays = stats.map((s) => s.value);
    };
    requestAnimationFrame(tick);
  };

  onMount(() => {
    // Fill real trip + destination counts (best-effort).
    (async () => {
      try {
        const [t, d] = await Promise.all([
          api.tours.list({ status: 'published', limit: 1 }),
          api.destinations.list({ status: 'published', limit: 1 })
        ]);
        const tours = Number(t.data.pagination?.total ?? 0);
        const dests = Number(d.data.pagination?.total ?? 0);
        if (tours) stats[1] = { ...stats[1], value: tours };
        if (dests) stats[2] = { ...stats[2], value: dests };
        stats = stats;
        if (started) displays = stats.map((s) => s.value);
      } catch {
        /* keep defaults */
      }
    })();

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          run();
          io.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    if (el) io.observe(el);
    return () => io.disconnect();
  });
</script>

<section class="container-shell py-12 md:py-16" use:fadeUpOnScroll={{ y: 18 }}>
  <div bind:this={el} class="relative overflow-hidden rounded-[12px] bg-gradient-to-br from-deep-green via-forest to-deep-green px-6 py-10 text-white md:px-10 md:py-12">
    <span class="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-goldfinch-gold/20 blur-3xl" aria-hidden="true"></span>
    <span class="pointer-events-none absolute inset-0 opacity-[0.06]" style="background-image: radial-gradient(circle, #E9D8A6 1px, transparent 1.5px); background-size: 24px 24px;" aria-hidden="true"></span>

    <div class="relative grid grid-cols-2 gap-x-6 gap-y-9 lg:grid-cols-4">
      {#each stats as stat, i (stat.label)}
        {@const Icon = stat.icon}
        <div class="text-center">
          <span class="mx-auto grid h-11 w-11 place-items-center rounded-full bg-surface/10 text-goldfinch-gold">
            <Icon size={20} />
          </span>
          <p class="mt-3 text-4xl font-extrabold leading-none tracking-tight text-goldfinch-gold md:text-5xl">
            {fmt(displays[i] ?? 0, stat)}<span class="text-2xl md:text-3xl">{stat.suffix}</span>
          </p>
          <p class="mt-2 text-sm font-medium leading-5 text-white/75">{stat.label}</p>
        </div>
      {/each}
    </div>
  </div>
</section>
