<script lang="ts">
  import { onMount } from 'svelte';
  import { Award, Compass, MapPin, Star } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import { fadeUpOnScroll } from '$lib/animations';

  type Stat = { value: number; decimals?: number; suffix?: string; label: string; icon: typeof Award };

  // Sensible defaults; trip/destination counts are filled from the API.
  let stats: Stat[] = [
    { value: 9, suffix: '+', label: 'Years in Tanzania', icon: Award },
    { value: 20, suffix: '+', label: 'Tailor-made safaris designed', icon: Compass },
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

<section class="container-shell py-14 md:py-20" use:fadeUpOnScroll={{ y: 18 }}>
  <div bind:this={el} class="rounded-none border border-ink/10 bg-surface px-6 py-10 shadow-soft md:px-10 md:py-12">
    <div class="grid grid-cols-2 gap-x-6 gap-y-9 lg:grid-cols-4">
      {#each stats as stat, i (stat.label)}
        {@const Icon = stat.icon}
        <div class="text-center">
          <span class="mx-auto grid h-11 w-11 place-items-center rounded-full bg-goldfinch-gold/10 text-goldfinch-gold">
            <Icon size={20} />
          </span>
          <p class="mt-3 text-4xl font-extrabold leading-none tracking-tight text-heading md:text-5xl">
            {fmt(displays[i] ?? 0, stat)}<span class="text-2xl text-goldfinch-gold md:text-3xl">{stat.suffix}</span>
          </p>
          <p class="mt-2 text-sm font-medium leading-5 text-ink/60">{stat.label}</p>
        </div>
      {/each}
    </div>
  </div>
</section>
