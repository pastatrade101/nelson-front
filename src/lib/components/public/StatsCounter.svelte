<script lang="ts">
  import { onMount } from 'svelte';
  import { Award, Compass, MapPin, Star } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import { fadeUpOnScroll } from '$lib/animations';

  // Values + labels are CMS-overridable via the `stats` prop; icons stay in
  // code (positional) since they are a design detail, not editable content.
  type StatInput = { value: number; decimals?: number; suffix?: string; label: string };
  type Stat = StatInput & { icon: typeof Award };

  // Sensible defaults; trip/destination counts are still filled from the API.
  export let stats: StatInput[] = [
    { value: 9, suffix: '+', label: 'Years in Tanzania' },
    { value: 20, suffix: '+', label: 'Tailor-made safaris designed' },
    { value: 5, suffix: '', label: 'Destinations covered' },
    { value: 4.9, decimals: 1, suffix: '★', label: 'Average traveller rating' }
  ];

  const icons = [Award, Compass, MapPin, Star];

  // Live API totals (best-effort); null means "use the value from the prop".
  let apiTours: number | null = null;
  let apiDests: number | null = null;

  // Resolve the display list: prop values + positional icons, with the safaris
  // (index 1) and destinations (index 2) counts overridden by API totals.
  const resolve = (base: StatInput[], t: number | null, d: number | null): Stat[] =>
    base.map((s, i) => ({
      ...s,
      value: i === 1 && t ? t : i === 2 && d ? d : s.value,
      icon: icons[i % icons.length]
    }));

  $: items = resolve(stats, apiTours, apiDests);

  let displays: number[] = [];
  let el: HTMLElement;
  let started = false;

  const fmt = (v: number, s: Stat) => (s.decimals ? v.toFixed(s.decimals) : Math.round(v).toLocaleString());

  const run = () => {
    if (started) return;
    started = true;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      displays = items.map((s) => s.value);
      return;
    }
    const duration = 1600;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const e = 1 - Math.pow(1 - t, 3); // easeOutCubic
      displays = items.map((s) => s.value * e);
      if (t < 1) requestAnimationFrame(tick);
      else displays = items.map((s) => s.value);
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
        if (tours) apiTours = tours;
        if (dests) apiDests = dests;
        if (started) displays = resolve(stats, apiTours, apiDests).map((s) => s.value);
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
      {#each items as stat, i (stat.label)}
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
