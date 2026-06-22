<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowRight, Clock, Compass, MapPin } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import type { Destination } from '$lib/types';

  // Fallbacks (shown until live images load, or if the API is empty).
  const FB_HERO = 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1200&q=80';
  const FB_KILI = 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=80';
  const FB_ZNZ = 'https://images.unsplash.com/photo-1605731414532-6b26976cc153?auto=format&fit=crop&w=400&q=80';

  let heroImage = FB_HERO;
  let previews: { src: string; label: string }[] = [
    { src: FB_KILI, label: 'Kilimanjaro' },
    { src: FB_ZNZ, label: 'Zanzibar' }
  ];

  onMount(async () => {
    const [destRes, catRes] = await Promise.allSettled([
      api.destinations.list({ status: 'published', limit: 50 }),
      api.categories.list({ status: 'published', limit: 50 })
    ]);
    const dests = destRes.status === 'fulfilled' ? ((destRes.value.data.items ?? []) as Destination[]) : [];
    const cats = catRes.status === 'fulfilled' ? ((catRes.value.data.items ?? []) as Array<Record<string, unknown>>) : [];

    const destImg = (slug: string) => {
      const d = dests.find((x) => x.slug === slug);
      return d ? d.banner_image_url || d.main_image_url || d.image_url || '' : '';
    };
    const catImg = (slug: string) => {
      const c = cats.find((x) => x.slug === slug);
      return c?.image_url ? String(c.image_url) : '';
    };

    heroImage = destImg('tanzania') || (dests[0]?.banner_image_url || dests[0]?.main_image_url || dests[0]?.image_url) || FB_HERO;
    previews = [
      { src: catImg('kilimanjaro') || FB_KILI, label: 'Kilimanjaro' },
      { src: destImg('zanzibar') || catImg('zanzibar-beach') || FB_ZNZ, label: 'Zanzibar' }
    ];
  });
</script>

<section class="container-shell py-14 md:py-20">
  <div class="group relative grid overflow-hidden rounded-[14px] shadow-[0_18px_50px_rgba(15,47,36,0.12)] transition-shadow duration-500 hover:shadow-[0_30px_70px_rgba(15,47,36,0.20)] lg:grid-cols-[1.05fr_0.95fr]">
    <!-- ── content panel ─────────────────────────────────────────── -->
    <div class="relative flex flex-col justify-center gap-6 bg-deep-green p-8 sm:p-10 md:p-12">
      <!-- map-dot texture -->
      <span
        class="pointer-events-none absolute inset-0 opacity-[0.07]"
        style="background-image: radial-gradient(circle, #E9D8A6 1px, transparent 1.5px); background-size: 22px 22px;"
        aria-hidden="true"
      ></span>
      <!-- warm gold glow -->
      <span class="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full bg-goldfinch-gold/25 blur-3xl" aria-hidden="true"></span>
      <!-- faint compass watermark -->
      <Compass class="pointer-events-none absolute -bottom-8 right-6 text-white/[0.06]" size={150} strokeWidth={1.1} aria-hidden="true" />

      <div class="relative">
        <div class="flex flex-wrap items-center gap-3">
          <p class="font-serif text-xl italic text-savanna">Not sure where to start?</p>
          <span class="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-savanna backdrop-blur">
            <Clock size={12} strokeWidth={2.6} /> ~60 seconds
          </span>
        </div>

        <h2 class="mt-4 font-serif text-3xl font-extrabold leading-[1.08] tracking-normal text-white sm:text-4xl lg:text-[42px]">
          Find your perfect Tanzania trip in <span class="text-goldfinch-gold">60 seconds</span>.
        </h2>

        <p class="mt-4 max-w-lg text-[15px] leading-7 text-white/75 md:text-base">
          Answer a few quick questions and we'll match you with the best safari, beach, Kilimanjaro,
          or culture experience for your travel style.
        </p>

        <div class="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <a
            href="/trip-finder"
            class="inline-flex h-14 items-center gap-2.5 rounded-[10px] bg-goldfinch-gold px-7 text-[15px] font-bold text-deep-green shadow-[0_10px_28px_rgba(217,164,65,0.45)] transition duration-300 hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            Start Trip Finder
            <ArrowRight size={18} strokeWidth={2.6} class="transition-transform duration-300 group-hover:translate-x-0.5" />
          </a>
          <p class="text-sm font-medium text-white/55">No pressure. Just simple guidance.</p>
        </div>
      </div>
    </div>

    <!-- ── visual collage ────────────────────────────────────────── -->
    <div class="relative min-h-[280px] overflow-hidden bg-forest lg:min-h-full">
      <img
        class="absolute inset-0 h-full w-full object-cover transition-transform duration-[800ms] ease-out group-hover:scale-105"
        src={heroImage}
        alt="Tanzania safari"
        loading="lazy"
      />
      <!-- blend toward the green panel + bottom depth -->
      <span class="pointer-events-none absolute inset-0 bg-gradient-to-r from-deep-green/70 via-deep-green/10 to-transparent" aria-hidden="true"></span>
      <span class="pointer-events-none absolute inset-0 bg-gradient-to-t from-deep-green/45 to-transparent" aria-hidden="true"></span>

      <!-- main location pill -->
      <span class="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-deep-green shadow-md backdrop-blur">
        <MapPin size={13} strokeWidth={2.6} class="text-clay" /> Tanzania
      </span>

      <!-- floating destination previews (hidden on the smallest screens) -->
      <div class="absolute bottom-4 right-4 hidden w-36 flex-col gap-3 sm:flex">
        {#each previews as p (p.label)}
          <div class="overflow-hidden rounded-[10px] border border-white/50 bg-white/90 p-1.5 shadow-[0_10px_26px_rgba(15,47,36,0.28)] backdrop-blur transition-transform duration-300 hover:-translate-y-0.5">
            <div class="relative h-20 overflow-hidden rounded-[7px]">
              <img class="h-full w-full object-cover" src={p.src} alt={p.label} loading="lazy" />
              <span class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-deep-green/80 to-transparent px-2 py-1 text-[11px] font-bold text-white">
                {p.label}
              </span>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</section>
