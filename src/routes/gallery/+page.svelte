<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { ArrowRight, Camera, ChevronLeft, ChevronRight, ImageOff, MapPin, X } from '@lucide/svelte';
  import { origUrl, thumbUrl } from '$lib/img';
  import { fadeUpOnScroll, staggeredCardReveal } from '$lib/animations';
  import ResponsiveImage from '$lib/components/public/ResponsiveImage.svelte';
  import type { PageData } from './$types';

  export let data: PageData;

  // Only real, published images with a usable URL — never invented placeholders.
  $: images = ((data.images ?? []) as Record<string, unknown>[]).filter((im) => typeof im.image_url === 'string' && im.image_url);

  const destOf = (im: Record<string, unknown>) => (im.destinations as { name?: string; slug?: string } | null) ?? null;
  const tourOf = (im: Record<string, unknown>) => (im.tours as { title?: string; slug?: string } | null) ?? null;
  const cap = (im: Record<string, unknown>) =>
    (typeof im.title === 'string' && im.title.trim()) || (typeof im.caption === 'string' && im.caption.trim()) || '';

  // Explore by destination, built from the real links on each image.
  $: destinations = Array.from(
    new Set(images.map((im) => destOf(im)?.name).filter((n): n is string => Boolean(n)))
  ).sort();
  let activeDest = 'All';
  $: filtered = activeDest === 'All' ? images : images.filter((im) => destOf(im)?.name === activeDest);
  const setDest = (d: string) => { activeDest = d; index = -1; };

  // Lightbox
  let index = -1;
  $: active = index >= 0 && index < filtered.length ? filtered[index] : null;
  const open = (i: number) => (index = i);
  const close = () => (index = -1);
  const prev = () => (index = (index - 1 + filtered.length) % filtered.length);
  const next = () => (index = (index + 1) % filtered.length);

  onMount(() => {
    const onKey = (e: KeyboardEvent) => {
      if (index < 0) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const chip = (on: boolean) =>
    `shrink-0 border px-4 py-2 text-[12px] font-bold uppercase tracking-[0.12em] transition ${
      on ? 'border-forest bg-forest text-white' : 'border-ink/12 bg-surface text-ink/60 hover:border-goldfinch-gold/50'
    }`;
</script>

<svelte:head>
  <title>Safari Gallery — Real Moments from Tanzania | Emnel Adventures</title>
  <meta name="description" content="A gallery of real moments from Emnel Adventures safaris — Serengeti, Ngorongoro, the Great Migration and Zanzibar, captured in the field." />
</svelte:head>

<!-- header -->
<section class="relative isolate overflow-hidden bg-deep-green text-white">
  {#if images[0]}
    <img class="absolute inset-0 h-full w-full object-cover opacity-25" src={origUrl(images[0], 'image_url')} alt="" aria-hidden="true" />
  {/if}
  <div class="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,18,15,0.7)_0%,rgba(20,18,15,0.55)_50%,rgba(20,18,15,0.9)_100%)]"></div>
  <div class="container-shell relative py-16 md:py-20">
    <nav class="mb-6 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-white/55">
      <a class="transition hover:text-goldfinch-gold" href="/">Home</a><span>/</span><span class="text-white/80">Gallery</span>
    </nav>
    <p class="brand-eyebrow text-goldfinch-gold">Recent Safari Gallery</p>
    <h1 class="mt-3 max-w-2xl font-serif text-[34px] font-light leading-[1.05] md:text-[52px]">Safari moments, unedited</h1>
    <p class="mt-4 max-w-xl text-[15px] font-medium leading-7 text-white/75 md:text-base">
      Real photographs from Emnel journeys across the Serengeti, Ngorongoro, Tarangire and Zanzibar. Click any frame to explore it full-screen.
    </p>
    {#if images.length}
      <p class="mt-5 inline-flex items-center gap-2 border border-white/20 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white/80">
        <Camera size={13} /> {images.length} photo{images.length === 1 ? '' : 's'}
      </p>
    {/if}
  </div>
</section>

<section class="container-shell py-12 md:py-16">
  {#if images.length}
    {#if destinations.length > 1}
      <div class="hide-scroll -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" use:fadeUpOnScroll={{ y: 10 }}>
        <button type="button" class={chip(activeDest === 'All')} on:click={() => setDest('All')}>All</button>
        {#each destinations as d}
          <button type="button" class={chip(activeDest === d)} on:click={() => setDest(d)}>{d}</button>
        {/each}
      </div>
    {/if}

    {#key activeDest}
      <div class="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" use:staggeredCardReveal>
        {#each filtered as im, i (im.id ?? i)}
          {@const c = cap(im)}
          {@const d = destOf(im)}
          <button
            type="button"
            class="group relative aspect-square overflow-hidden bg-deep-green"
            on:click={() => open(i)}
            aria-label={c || 'View photo'}
          >
            <ResponsiveImage
              src={origUrl(im, 'image_url')}
              fallbackSrc={thumbUrl(im, 'image_url')}
              alt={String(im.alt_text ?? im.title ?? 'Safari gallery image')}
              width={560}
              sizes="(min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw"
              imgClass="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-110"
            />
            <span class="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgba(15,26,24,0.82))] opacity-80 transition group-hover:opacity-100"></span>
            {#if d?.name}
              <span class="absolute left-2.5 top-2.5 inline-flex items-center gap-1 bg-black/40 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-white backdrop-blur">
                <MapPin size={9} strokeWidth={2.6} /> {d.name}
              </span>
            {/if}
            {#if c}
              <p class="absolute inset-x-0 bottom-0 translate-y-1 p-3 text-left text-[13px] font-semibold leading-tight text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">{c}</p>
            {/if}
          </button>
        {/each}
      </div>
    {/key}
  {:else}
    <div class="grid place-items-center gap-3 border border-dashed border-ink/15 bg-sand/20 px-6 py-20 text-center">
      <span class="grid h-14 w-14 place-items-center rounded-full bg-forest/10 text-forest"><ImageOff size={26} strokeWidth={1.6} /></span>
      <p class="text-lg font-bold text-heading">The gallery is being curated</p>
      <p class="max-w-md text-sm leading-6 text-ink/60">
        We're selecting our finest recent safari photography. In the meantime, explore our journeys and destinations.
      </p>
      <div class="mt-2 flex flex-wrap justify-center gap-2">
        <a class="inline-flex items-center gap-1.5 bg-deep-green px-5 py-2.5 text-[12px] font-bold uppercase tracking-[0.14em] text-white transition hover:bg-forest" href="/tours">Browse safaris <ArrowRight size={14} /></a>
        <a class="inline-flex items-center gap-1.5 border border-forest px-5 py-2.5 text-[12px] font-bold uppercase tracking-[0.14em] text-forest transition hover:bg-forest hover:text-white" href="/destinations">See destinations <ArrowRight size={14} /></a>
      </div>
    </div>
  {/if}
</section>

<!-- lightbox -->
{#if active}
  {@const c = cap(active)}
  {@const d = destOf(active)}
  {@const t = tourOf(active)}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div class="fixed inset-0 z-[100] flex flex-col bg-black/92 backdrop-blur-sm" transition:fade={{ duration: 160 }} on:click={close}>
    <div class="flex items-center justify-between px-4 py-3 text-white/80 sm:px-6">
      <span class="text-xs font-bold uppercase tracking-[0.14em]">{index + 1} / {filtered.length}</span>
      <button type="button" class="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20" on:click|stopPropagation={close} aria-label="Close">
        <X size={20} />
      </button>
    </div>

    <div class="relative flex min-h-0 flex-1 items-center justify-center px-4 sm:px-16">
      {#if filtered.length > 1}
        <button type="button" class="absolute left-2 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:left-4" on:click|stopPropagation={prev} aria-label="Previous">
          <ChevronLeft size={22} />
        </button>
      {/if}
      {#key index}
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <img
          class="max-h-full max-w-full object-contain"
          src={origUrl(active, 'image_url')}
          alt={String(active.alt_text ?? active.title ?? 'Safari gallery image')}
          on:click|stopPropagation
          transition:scale={{ duration: 180, start: 0.98 }}
        />
      {/key}
      {#if filtered.length > 1}
        <button type="button" class="absolute right-2 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:right-4" on:click|stopPropagation={next} aria-label="Next">
          <ChevronRight size={22} />
        </button>
      {/if}
    </div>

    {#if c || d?.name || t?.slug}
      <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
      <div class="px-5 py-4 text-center text-white sm:px-6" on:click|stopPropagation>
        {#if c}<p class="font-serif text-lg font-light md:text-xl">{c}</p>{/if}
        <div class="mt-1.5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[12px] font-semibold text-white/70">
          {#if d?.name}
            <a class="inline-flex items-center gap-1 transition hover:text-goldfinch-gold" href={d.slug ? `/destinations/${d.slug}` : '/destinations'}><MapPin size={13} /> {d.name}</a>
          {/if}
          {#if t?.slug}
            <a class="inline-flex items-center gap-1 transition hover:text-goldfinch-gold" href={`/tours/${t.slug}`}><Camera size={13} /> {t.title ?? 'View safari'}</a>
          {/if}
        </div>
      </div>
    {/if}
  </div>
{/if}
