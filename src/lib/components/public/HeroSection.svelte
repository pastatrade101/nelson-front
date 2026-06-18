<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { ArrowRight, ChevronDown, MapPin, Search, ShieldCheck, Star } from '@lucide/svelte';
  import { goto } from '$app/navigation';
  import { api } from '$lib/api/client';
  import { brand } from '$lib/brand';
  import type { Destination } from '$lib/types';

  export let title = 'Plan East Africa With Confidence';
  export let description = 'Honest safari, Kilimanjaro, gorilla trekking and beach advice from local experts.';
  export let imageUrl = '';
  export let primaryCta = brand.primaryCta;
  export let secondaryCta = brand.secondaryCta;
  export let secondaryCtaUrl = '/contact';

  type Slide = { url: string; label?: string };
  type Opt = { label: string; value: string };

  const FALLBACK_SLIDES: Slide[] = [
    { url: 'https://images.unsplash.com/photo-1516426122078-c23e76319801', label: 'Serengeti' },
    { url: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e', label: 'Gorilla trekking' },
    { url: 'https://images.unsplash.com/photo-1605731414532-6b26976cc153', label: 'Zanzibar' },
    { url: 'https://images.unsplash.com/photo-1535941339077-2dd1c7963098', label: 'Big game' }
  ];

  const quick = [
    { label: 'Safari', href: '/tours?category=safari' },
    { label: 'Kilimanjaro', href: '/tours?category=kilimanjaro' },
    { label: 'Gorilla Trekking', href: '/tours?category=gorilla-trekking' },
    { label: 'Zanzibar Beach', href: '/tours?category=zanzibar-beach' }
  ];

  let slides: Slide[] = [];
  let destinationOptions: Opt[] = [];
  let destination = '';
  let index = 0;
  let timer: ReturnType<typeof setInterval> | undefined;

  const startAuto = () => {
    stop();
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (slides.length > 1 && !reduce) timer = setInterval(() => { index = (index + 1) % slides.length; }, 6000);
  };
  const stop = () => { if (timer) clearInterval(timer); };
  const goSlide = (i: number) => { index = i; startAuto(); };
  onDestroy(stop);

  onMount(async () => {
    const seed: Slide[] = imageUrl && !imageUrl.startsWith('/images/') ? [{ url: imageUrl }] : [];
    try {
      const dest = await api.destinations.list({ status: 'published', limit: 12 });
      const items = (dest.data.items as Destination[]).filter((d) => d.slug);
      destinationOptions = items.map((d) => ({ label: d.name, value: d.slug }));
      const destSlides = items
        .map((d) => ({ url: d.banner_image_url || d.main_image_url || d.image_url || '', label: d.name }))
        .filter((s) => s.url);
      slides = [...seed, ...destSlides];
    } catch {
      slides = seed;
    }
    if (!slides.length) slides = FALLBACK_SLIDES;
    // de-dupe by url, cap to 6
    slides = slides.filter((s, i, a) => a.findIndex((x) => x.url === s.url) === i).slice(0, 6);
    startAuto();
  });

  const submit = () => void goto(destination ? `/tours?destination=${destination}` : '/tours');
</script>

<section class="relative overflow-hidden bg-deep-green">
  <!-- background slider -->
  {#each slides as slide, i (slide.url)}
    <img
      class={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms] ease-out ${i === index ? 'opacity-100' : 'opacity-0'}`}
      src={slide.url}
      alt={slide.label ?? 'East Africa'}
      loading={i === 0 ? 'eager' : 'lazy'}
      aria-hidden={i === index ? undefined : 'true'}
    />
  {/each}
  <div class="absolute inset-0 bg-gradient-to-t from-deep-green via-deep-green/55 to-deep-green/25"></div>
  <div class="absolute inset-0 bg-gradient-to-r from-deep-green/75 via-deep-green/25 to-transparent"></div>

  <!-- content -->
  <div class="relative z-10 mx-auto w-full max-w-[1500px] px-5 py-20 md:px-8 md:py-28 lg:py-32">
    <div class="max-w-2xl text-white">
      <span class="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-savanna backdrop-blur">
        <Star size={13} fill="currentColor" /> Rated 4.9/5 by travellers
      </span>

      <h1 class="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight drop-shadow-sm sm:text-5xl lg:text-[58px]">{title}</h1>
      <p class="mt-4 max-w-xl text-base font-medium leading-7 text-white/85 sm:text-lg">{description}</p>

      <!-- search on top -->
      <form class="mt-7 flex flex-col gap-2 rounded-lg bg-white p-2 shadow-[0_20px_50px_rgba(15,47,36,0.30)] sm:flex-row sm:items-center" on:submit|preventDefault={submit}>
        <label class="flex h-14 flex-1 items-center gap-2.5 rounded-md px-3">
          <MapPin class="shrink-0 text-forest" size={20} strokeWidth={2.4} />
          <select class="w-full cursor-pointer appearance-none bg-transparent text-[15px] font-semibold text-ink outline-none" bind:value={destination} aria-label="Choose a destination">
            <option value="">Where do you want to go?</option>
            {#each destinationOptions as opt (opt.value)}
              <option value={opt.value}>{opt.label}</option>
            {/each}
          </select>
          <ChevronDown class="pointer-events-none shrink-0 text-ink/40" size={18} />
        </label>
        <button class="flex h-14 items-center justify-center gap-2 rounded-md bg-forest px-7 text-[15px] font-bold text-white transition hover:bg-deep-green" type="submit">
          <Search size={18} strokeWidth={2.6} /> Explore
        </button>
      </form>

      <!-- popular shortcuts -->
      <div class="mt-4 flex flex-wrap items-center gap-2">
        <span class="text-sm font-medium text-white/70">Popular:</span>
        {#each quick as q}
          <a class="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20" href={q.href}>{q.label}</a>
        {/each}
      </div>

      <!-- conversion CTAs + reassurance -->
      <div class="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
        <a class="inline-flex h-12 items-center gap-2 rounded-lg bg-goldfinch-gold px-6 font-bold text-deep-green shadow-lg transition hover:brightness-105" href="/plan-my-trip">
          {primaryCta} <ArrowRight size={18} strokeWidth={2.6} />
        </a>
        <a class="text-sm font-semibold text-white underline-offset-4 transition hover:underline" href={secondaryCtaUrl}>{secondaryCta}</a>
        <span class="inline-flex items-center gap-1.5 text-sm text-white/75">
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
