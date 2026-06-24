<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fly } from 'svelte/transition';
  import { ArrowRight, ChevronDown, MapPin, Search, ShieldCheck, Star } from '@lucide/svelte';
  import { goto } from '$app/navigation';
  import { api } from '$lib/api/client';
  import { revealHeading } from '$lib/animations';
  import { brand } from '$lib/brand';
  import { imgUrl } from '$lib/img';
  import type { Destination } from '$lib/types';

  export let title = 'Plan East Africa With Confidence';
  export let description = 'Honest safari, Kilimanjaro, gorilla trekking and beach advice from local experts.';
  export let imageUrl = '';
  export let primaryCta = brand.primaryCta;
  export let secondaryCta = brand.secondaryCta;
  export let secondaryCtaUrl = '/contact';

  type Slide = { url: string; label?: string; eyebrow: string; title: string; subtitle: string };
  type Opt = { label: string; value: string };

  const U = '?auto=format&fit=crop&w=1600&q=70'; // size + compress Unsplash fallbacks
  const FALLBACK_SLIDES: Slide[] = [
    { url: `https://images.unsplash.com/photo-1516426122078-c23e76319801${U}`, label: 'Serengeti', eyebrow: 'Tanzania · Safari', title: 'The Great Serengeti', subtitle: 'Endless plains, the Great Migration and unforgettable Big Five game viewing.' },
    { url: `https://images.unsplash.com/photo-1547471080-7cc2caa01a7e${U}`, label: 'Gorilla trekking', eyebrow: 'Rwanda · Gorillas', title: 'Gorilla Trekking', subtitle: 'A once-in-a-lifetime hour with mountain gorillas in the misty Virungas.' },
    { url: `https://images.unsplash.com/photo-1605731414532-6b26976cc153${U}`, label: 'Zanzibar', eyebrow: 'Zanzibar · Coast', title: 'Zanzibar Beaches', subtitle: 'White-sand shores, Stone Town spice and the perfect safari finale.' },
    { url: `https://images.unsplash.com/photo-1535941339077-2dd1c7963098${U}`, label: 'Big game', eyebrow: 'East Africa · Wildlife', title: 'Into the Wild', subtitle: 'Elephant herds, big cats and dramatic landscapes across East Africa.' }
  ];

  const quick = [
    { label: 'Safari', href: '/tours?category=safari' },
    { label: 'Kilimanjaro', href: '/tours?category=kilimanjaro' },
    { label: 'Gorilla Trekking', href: '/tours?category=gorilla-trekking' },
    { label: 'Zanzibar Beach', href: '/tours?category=zanzibar-beach' }
  ];

  // Start with one lightweight (sized) slide so an image paints on first render
  // for a fast LCP, instead of waiting for the destinations API in onMount.
  let slides: Slide[] = [{ ...FALLBACK_SLIDES[0], eyebrow: 'Rated 4.9/5 by travellers', title, subtitle: description }];
  let destinationOptions: Opt[] = [];
  let destination = '';
  let index = 0;
  let timer: ReturnType<typeof setInterval> | undefined;

  // The brand pitch (slide 0 / pre-load fallback). The hero copy below reads from
  // `current`, which changes with the slider so each slide has its own headline.
  $: brandSlide = { url: '', eyebrow: 'Rated 4.9/5 by travellers', title, subtitle: description } as Slide;
  $: current = slides[index] ?? brandSlide;

  // Only download a slide image once it's the active (or next) slide — the
  // slider stacks all slides on top of each other, so without this every slide
  // image loads up-front (the 18MB / 46s-LCP problem). This keeps it to ~1–2.
  let loaded = new Set<number>([0]);
  $: {
    loaded.add(index);
    if (slides.length > 1) loaded.add((index + 1) % slides.length);
    loaded = loaded;
  }

  const startAuto = () => {
    stop();
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (slides.length > 1 && !reduce) timer = setInterval(() => { index = (index + 1) % slides.length; }, 6000);
  };
  const stop = () => { if (timer) clearInterval(timer); };
  const goSlide = (i: number) => { index = i; startAuto(); };
  onDestroy(stop);

  onMount(async () => {
    const brandImage = imageUrl && !imageUrl.startsWith('/images/') ? imageUrl : FALLBACK_SLIDES[0].url;
    // First slide keeps the brand pitch (CMS title/description); the rest are
    // destination-specific with their own copy.
    const brand0: Slide = { url: brandImage, eyebrow: 'Rated 4.9/5 by travellers', title, subtitle: description };
    try {
      const dest = await api.destinations.list({ status: 'published', limit: 12 });
      const items = (dest.data.items as Destination[]).filter((d) => d.slug);
      destinationOptions = items.map((d) => ({ label: d.name, value: d.slug }));
      const destSlides: Slide[] = items
        .map((d) => ({
          url: d.banner_image_url || d.main_image_url || d.image_url || '',
          label: d.name,
          eyebrow: d.region || d.country || 'East Africa',
          title: d.name,
          subtitle: d.short_description || `Tailor-made ${d.name} journeys, planned around you by local specialists.`
        }))
        .filter((s) => s.url)
        .filter((s, i, a) => a.findIndex((x) => x.url === s.url) === i)
        .slice(0, 5);
      slides = [brand0, ...destSlides];
    } catch {
      slides = [brand0, ...FALLBACK_SLIDES];
    }
    // Always give the slider something to cycle through.
    if (slides.length <= 1) slides = [brand0, ...FALLBACK_SLIDES];
    startAuto();
  });

  const submit = () => void goto(destination ? `/tours?destination=${destination}` : '/tours');
</script>

<section class="relative overflow-hidden bg-deep-green dark:bg-[#0b100e]">
  <!-- background slider -->
  {#each slides as slide, i (slide.url)}
    <div
      class={`absolute inset-0 transition-opacity duration-[1200ms] ease-out ${i === index ? 'opacity-100' : 'opacity-0'}`}
      aria-hidden={i === index ? undefined : 'true'}
    >
      {#if loaded.has(i)}
        <img
          class="h-full w-full object-cover"
          src={imgUrl(slide.url, 1280)}
          alt={slide.label ?? 'East Africa'}
          loading={i === 0 ? 'eager' : 'lazy'}
          decoding="async"
          fetchpriority={i === 0 ? 'high' : 'auto'}
        />
      {/if}
    </div>
  {/each}
  <div class="absolute inset-0 bg-gradient-to-t from-deep-green via-deep-green/55 to-deep-green/25 dark:from-[#0b100e] dark:via-[#0b100e]/75 dark:to-[#0b100e]/35"></div>
  <div class="absolute inset-0 bg-gradient-to-r from-deep-green/75 via-deep-green/25 to-transparent dark:from-[#0b100e]/90 dark:via-[#0b100e]/40 dark:to-transparent"></div>

  <!-- content -->
  <div class="relative z-10 mx-auto w-full max-w-[1500px] px-5 pb-16 pt-12 md:px-8 md:py-28 lg:py-32">
    <div class="max-w-2xl text-white">
      <!-- per-slide copy: changes with the slider and re-animates on each change -->
      {#key index}
        <div class="min-h-[132px] sm:min-h-[230px] lg:min-h-[256px]">
          <span
            class="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-savanna backdrop-blur"
            in:fly={{ y: 12, duration: 450 }}
          >
            <Star size={13} fill="currentColor" /> {current.eyebrow}
          </span>
          <h1 class="mt-4 text-4xl font-extrabold leading-[1.05] tracking-tight drop-shadow-sm sm:mt-5 sm:text-5xl lg:text-[58px]" use:revealHeading={{ stagger: 0.02 }}>{current.title}</h1>
          <p class="mt-3 line-clamp-2 max-w-xl text-base font-medium leading-7 text-white/85 sm:mt-4 sm:line-clamp-none sm:text-lg" in:fly={{ y: 14, duration: 500, delay: 120 }}>{current.subtitle}</p>
        </div>
      {/key}

      <!-- search on top -->
      <form class="mt-5 flex items-center gap-2 rounded-lg bg-surface p-2 shadow-[0_20px_50px_rgba(15,47,36,0.30)] sm:mt-7" on:submit|preventDefault={submit}>
        <label class="flex h-14 flex-1 items-center gap-2.5 rounded-md border border-ink/15 bg-black/[0.03] px-3">
          <MapPin class="shrink-0 text-forest" size={20} strokeWidth={2.4} />
          <select class="w-full cursor-pointer appearance-none bg-transparent text-[15px] font-semibold text-ink outline-none" bind:value={destination} aria-label="Choose a destination">
            <option value="">Where do you want to go?</option>
            {#each destinationOptions as opt (opt.value)}
              <option value={opt.value}>{opt.label}</option>
            {/each}
          </select>
          <ChevronDown class="pointer-events-none shrink-0 text-ink/40" size={18} />
        </label>
        <button class="flex h-14 shrink-0 items-center justify-center gap-2 rounded-md bg-forest px-4 text-[15px] font-bold text-white transition hover:bg-deep-green sm:px-7" type="submit" aria-label="Explore tours">
          <Search size={18} strokeWidth={2.6} /> <span class="hidden sm:inline">Explore</span>
        </button>
      </form>

      <!-- popular shortcuts (hidden on mobile to declutter — nav + search cover it) -->
      <div class="mt-4 hidden flex-wrap items-center gap-2 sm:flex">
        <span class="text-sm font-medium text-white/70">Popular:</span>
        {#each quick as q}
          <a class="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20" href={q.href}>{q.label}</a>
        {/each}
      </div>

      <!-- conversion CTAs + reassurance -->
      <div class="mt-5 flex flex-col gap-3 sm:mt-7 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-3">
        <a class="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-goldfinch-gold px-6 font-bold text-heading shadow-lg transition hover:brightness-105 sm:w-auto" href="/plan-my-trip">
          {primaryCta} <ArrowRight size={18} strokeWidth={2.6} />
        </a>
        <a class="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-white/35 px-6 font-semibold text-white transition hover:bg-white/10 sm:w-auto" href={secondaryCtaUrl}>{secondaryCta}</a>
        <span class="hidden items-center gap-1.5 text-sm text-white/75 sm:inline-flex">
          <ShieldCheck size={15} class="text-savanna" /> Free, no-obligation planning · No hidden costs
        </span>
      </div>
    </div>
  </div>

  <!-- slider dots -->
  {#if slides.length > 1}
    <div class="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 gap-2" role="tablist" aria-label="Hero slides">
      {#each slides as slide, i (slide.url)}
        <button
          class={`h-2 rounded-full transition-all ${i === index ? 'w-7 bg-goldfinch-gold' : 'w-2 bg-white/50 hover:bg-white/80'}`}
          type="button"
          aria-label={`Show slide ${i + 1}${slide.label ? ` — ${slide.label}` : ''}`}
          aria-selected={i === index}
          role="tab"
          on:click={() => goSlide(i)}
        ></button>
      {/each}
    </div>
  {/if}
</section>
