<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { ArrowRight, CalendarDays, Camera, ChevronLeft, ChevronRight, Compass, Film, ImageOff, MapPin, Quote, Route, X } from '@lucide/svelte';
  import { cdnUrl, origUrl, thumbUrl } from '$lib/img';
  import { fadeUpOnScroll, staggeredCardReveal } from '$lib/animations';
  import ResponsiveImage from '$lib/components/public/ResponsiveImage.svelte';
  import type { GalleryItem } from '$lib/types';
  import type { PageData } from './$types';

  export let data: PageData;

  // Only real, published images with a usable URL — never invented placeholders.
  // Ordered by sort_order, so images[0] (the lowest) is the "hero" set in admin.
  $: images = ((data.images ?? []) as GalleryItem[])
    .filter((im) => typeof im.image_url === 'string' && im.image_url)
    .sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0));

  const destOf = (im: GalleryItem) => im.destinations ?? null;
  const tourOf = (im: GalleryItem) => im.tours ?? null;
  const cap = (im: GalleryItem) => im.title?.trim() || im.caption?.trim() || '';
  const quoteOf = (im: GalleryItem) => im.guest_quote?.trim() || '';
  const monthOf = (im: GalleryItem) => im.travel_month?.trim() || '';

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
    {#if images[0].media_type === 'video'}
      <!-- svelte-ignore a11y-media-has-caption -->
      <video class="absolute inset-0 h-full w-full object-cover opacity-60" src={cdnUrl(images[0].image_url)} autoplay muted loop playsinline preload="metadata" aria-hidden="true"></video>
    {:else}
      <img class="absolute inset-0 h-full w-full object-cover opacity-60" src={thumbUrl(images[0] as unknown as Record<string, unknown>, 'image_url')} alt="" aria-hidden="true" loading="eager" />
    {/if}
  {/if}
  <div class="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,18,15,0.35)_0%,transparent_45%,rgba(20,18,15,0.72)_100%)]"></div>
  <div class="container-shell relative py-16 [text-shadow:0_2px_16px_rgba(0,0,0,0.5)] md:py-20">
    <nav class="mb-6 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-white/55">
      <a class="transition hover:text-goldfinch-gold" href="/">Home</a><span>/</span><span class="text-white/80">Gallery</span>
    </nav>
    <p class="brand-eyebrow text-goldfinch-gold">Travel Journal</p>
    <h1 class="mt-3 max-w-2xl font-serif text-[34px] font-light leading-[1.05] md:text-[52px]">Safari Moments,<br />Unedited.</h1>
    <p class="mt-4 max-w-xl text-[15px] font-medium leading-7 text-white/75 md:text-base">
      Every image tells the story of a real journey across Tanzania—from sunrise game drives in the Serengeti to quiet evenings overlooking the Ngorongoro Crater.
    </p>
    {#if images.length}
      <div class="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2.5">
        <span class="inline-flex items-center gap-2 text-sm font-bold text-white/90">
          <Camera size={16} strokeWidth={2.2} class="text-goldfinch-gold" /> {images.length} Safari moment{images.length === 1 ? '' : 's'}
        </span>
        {#if destinations.length}
          <span class="h-3.5 w-px bg-white/25" aria-hidden="true"></span>
          <span class="inline-flex items-center gap-2 text-sm font-bold text-white/90">
            <MapPin size={16} strokeWidth={2.2} class="text-goldfinch-gold" /> {destinations.length} Destination{destinations.length === 1 ? '' : 's'}
          </span>
          <span class="h-3.5 w-px bg-white/25" aria-hidden="true"></span>
          <span class="inline-flex min-w-0 items-center gap-2 text-[13px] font-semibold text-white/70">
            <Compass size={16} strokeWidth={2.2} class="shrink-0 text-goldfinch-gold" />
            <span class="truncate">{destinations.slice(0, 4).join(' • ')}{destinations.length > 4 ? ' …' : ''}</span>
          </span>
        {/if}
      </div>
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
          {@const q = quoteOf(im)}
          {@const month = monthOf(im)}
          {@const d = destOf(im)}
          {@const t = tourOf(im)}
          <button
            type="button"
            class="group relative aspect-square overflow-hidden bg-deep-green"
            on:click={() => open(i)}
            aria-label={c || q || 'View safari moment'}
          >
            {#if im.media_type === 'video'}
              <!-- svelte-ignore a11y-media-has-caption -->
              <video class="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-110" src={cdnUrl(im.image_url)} muted playsinline preload="metadata" aria-hidden="true"></video>
              <span class="absolute right-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-full bg-goldfinch-gold text-deep-green"><Film size={13} /></span>
            {:else}
              <ResponsiveImage
                src={origUrl(im as unknown as Record<string, unknown>, 'image_url')}
                fallbackSrc={thumbUrl(im as unknown as Record<string, unknown>, 'image_url')}
                alt={String(im.alt_text ?? im.title ?? 'Safari gallery image')}
                width={560}
                sizes="(min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw"
                imgClass="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-110"
              />
            {/if}
            <span class="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgba(15,26,24,0.82))] opacity-80 transition group-hover:opacity-100"></span>
            {#if d?.name}
              <span class="absolute left-2.5 top-2.5 inline-flex items-center gap-1 bg-black/40 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-white backdrop-blur">
                <MapPin size={9} strokeWidth={2.6} /> {d.name}
              </span>
            {/if}
            {#if month}
              <span class={`absolute top-2.5 inline-flex items-center gap-1 bg-black/40 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-white backdrop-blur ${d?.name ? 'left-2.5 mt-7' : 'left-2.5'}`}>
                <CalendarDays size={9} strokeWidth={2.4} /> {month}
              </span>
            {/if}
            <!-- hover detail: caption + destination + itinerary the image belongs to -->
            {#if c || q || d?.name || t?.title}
              <div class="absolute inset-x-0 bottom-0 translate-y-2 p-3 text-left opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100">
                {#if q}<p class="line-clamp-2 font-serif text-[13px] italic leading-snug text-white">“{q}”</p>{/if}
                {#if c}<p class="line-clamp-2 text-[13px] font-bold leading-tight text-white">{c}</p>{/if}
                <div class="mt-1.5 flex flex-col gap-0.5">
                  {#if d?.name}<span class="inline-flex items-center gap-1 text-[11px] font-semibold text-white/75"><MapPin size={11} strokeWidth={2.4} /> {d.name}</span>{/if}
                  {#if t?.title}<span class="inline-flex items-center gap-1 text-[11px] font-semibold text-goldfinch-gold/90"><Route size={11} strokeWidth={2.4} /> <span class="truncate">{t.title}</span></span>{/if}
                </div>
              </div>
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
  {@const q = quoteOf(active)}
  {@const month = monthOf(active)}
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
        <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
        <div transition:scale={{ duration: 180, start: 0.98 }} on:click|stopPropagation class="flex max-h-full max-w-full items-center justify-center">
          {#if active.media_type === 'video'}
            <!-- svelte-ignore a11y-media-has-caption -->
            <video class="max-h-full max-w-full object-contain" src={cdnUrl(active.image_url)} controls autoplay playsinline preload="metadata"></video>
          {:else}
            <ResponsiveImage
              src={origUrl(active as unknown as Record<string, unknown>, 'image_url')}
              fallbackSrc={thumbUrl(active as unknown as Record<string, unknown>, 'image_url')}
              alt={String(active.alt_text ?? active.title ?? 'Safari gallery image')}
              width={1600}
              sizes="100vw"
              imgClass="max-h-full max-w-full object-contain"
              eager
            />
          {/if}
        </div>
      {/key}
      {#if filtered.length > 1}
        <button type="button" class="absolute right-2 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:right-4" on:click|stopPropagation={next} aria-label="Next">
          <ChevronRight size={22} />
        </button>
      {/if}
    </div>

    {#if c || q || month || d?.name || t?.slug}
      <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
      <div class="px-5 py-4 text-center text-white sm:px-6" on:click|stopPropagation>
        {#if q}<p class="mx-auto max-w-2xl font-serif text-lg italic font-light md:text-xl"><Quote class="mr-1 inline text-goldfinch-gold" size={17} />{q}</p>{/if}
        {#if c}<p class="mt-1 text-sm font-semibold text-white/80">{c}</p>{/if}
        <div class="mt-1.5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[12px] font-semibold text-white/70">
          {#if month}<span class="inline-flex items-center gap-1"><CalendarDays size={13} /> {month}</span>{/if}
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
