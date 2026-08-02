<script lang="ts">
  import {
    ArrowRight, Award, Building2, ChevronRight, Compass, ExternalLink,
    Heart, MapPin, MessageCircle, Sparkles, Star, Wallet
  } from '@lucide/svelte';
  import { fadeUpOnScroll, staggeredCardReveal } from '$lib/animations/motion';
  import { imgUrl } from '$lib/img';
  import { LEVEL_STARS, levelLabel, lodgeBestForLabel, lodgeImage, lodgePriceLabel, lodgeRating, typeLabel } from '$lib/lodge';
  import LodgeCard from '$lib/components/public/LodgeCard.svelte';
  import TourCard from '$lib/components/public/TourCard.svelte';
  import ShortlistButton from '$lib/components/public/ShortlistButton.svelte';
  import type { PageData } from './$types';

  export let data: PageData;

  $: l = data.lodge;
  $: heroImg = lodgeImage(l);
  $: secondImg = l.image_url && l.image_url !== l.hero_image_url ? l.image_url : '';
  $: rating = lodgeRating(l);
  $: stars = LEVEL_STARS[l.accommodation_level] ?? 4;
  $: priceLabel = lodgePriceLabel(l);
  $: bestForLabel = lodgeBestForLabel(l);
  $: planHref = `/plan-my-trip?lodge=${encodeURIComponent(l.slug)}`;
  $: shortlistItem = {
    slug: l.slug, title: l.name, image_url: heroImg,
    destination: l.destinations?.name, price_from: l.price_per_night_from ?? undefined, currency: l.currency
  };

  // Quick facts — every entry maps to a real, populated field (nulls are dropped).
  $: facts = [
    l.destinations?.name ? { icon: MapPin, label: 'Destination', value: l.destinations.name } : null,
    { icon: Building2, label: 'Property type', value: typeLabel(l) },
    { icon: Award, label: 'Comfort tier', value: levelLabel(l) },
    priceLabel ? { icon: Wallet, label: 'From', value: `${priceLabel} / night` } : null,
    rating != null ? { icon: Star, label: 'Emnel score', value: `${rating.toFixed(1)} / 10` } : null
  ].filter(Boolean) as { icon: typeof MapPin; label: string; value: string }[];

  $: scores = [
    l.romantic_rating != null ? { label: 'Romance & couples', value: l.romantic_rating } : null,
    l.family_rating != null ? { label: 'Family & children', value: l.family_rating } : null
  ].filter(Boolean) as { label: string; value: number }[];

  $: title = l.seo_title || l.meta_title || `${l.name} — ${l.destinations?.name ?? 'Tanzania'} | Emnel Adventures`;
  $: metaDesc = l.meta_description || l.why_we_recommend || l.description || `${l.name}, a hand-picked ${typeLabel(l).toLowerCase()} in ${l.destinations?.name ?? 'Tanzania'}, chosen and booked by Emnel Adventures.`;
  $: canonical = `https://emneladventures.com/accommodation/${l.slug}`;
  $: schema = {
    '@context': 'https://schema.org',
    '@type': 'LodgingBusiness',
    name: l.name,
    description: metaDesc,
    ...(heroImg ? { image: imgUrl(heroImg, 1600) } : {}),
    url: canonical,
    ...(l.destinations?.name ? { address: { '@type': 'PostalAddress', addressRegion: l.destinations.name, addressCountry: 'TZ' } } : {}),
    ...(l.price_per_night_from ? { priceRange: `${l.currency ?? 'USD'} ${Math.round(l.price_per_night_from)}+ per night` } : {})
  };
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={metaDesc} />
  <link rel="canonical" href={canonical} />
  <meta property="og:type" content="website" />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={metaDesc} />
  {#if heroImg}<meta property="og:image" content={imgUrl(heroImg, 1600)} />{/if}
  {@html `<script type="application/ld+json">${JSON.stringify(schema)}<\/script>`}
</svelte:head>

<!-- ── hero ───────────────────────────────────────────────────────────────── -->
<section class="relative overflow-hidden bg-deep-green text-white">
  {#if heroImg}
    <img src={imgUrl(heroImg, 1920)} alt={l.name} class="absolute inset-0 h-full w-full object-cover object-center" decoding="async" />
    <div class="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,25,22,0.5)_0%,rgba(20,25,22,0.35)_40%,rgba(15,22,20,0.9)_100%)]"></div>
  {:else}
    <div class="absolute inset-0 bg-[linear-gradient(150deg,#153733,rgba(74,55,40,0.95))]"></div>
  {/if}

  <div class="container-shell relative">
    <!-- breadcrumb -->
    <nav class="flex flex-wrap items-center gap-1.5 pt-8 text-[12px] font-semibold text-white/60" aria-label="Breadcrumb">
      <a href="/" class="hover:text-goldfinch-gold">Home</a><ChevronRight size={13} />
      <a href="/accommodation" class="hover:text-goldfinch-gold">Accommodation</a>
      {#if l.destinations?.slug}<ChevronRight size={13} /><a href={`/destinations/${l.destinations.slug}`} class="hover:text-goldfinch-gold">{l.destinations.name}</a>{/if}
      <ChevronRight size={13} /><span class="text-white/85">{l.name}</span>
    </nav>

    <div class="max-w-3xl pb-14 pt-24 md:pb-20 md:pt-40">
      <div class="flex flex-wrap items-center gap-2">
        {#if l.is_featured}<span class="inline-flex items-center gap-1 bg-goldfinch-gold px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-deep-green"><Sparkles size={11} strokeWidth={2.6} /> Recommended</span>{/if}
        <span class="border border-white/25 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/85 backdrop-blur">{typeLabel(l)}</span>
        <span class="inline-flex items-center gap-0.5">
          {#each Array(5) as _, i}<Star size={13} fill={i < stars ? 'currentColor' : 'none'} class={i < stars ? 'text-goldfinch-gold' : 'text-white/30'} />{/each}
        </span>
      </div>
      <h1 class="mt-4 font-serif text-4xl font-light leading-[1.05] md:text-6xl">{l.name}</h1>
      {#if l.destinations?.name}
        <p class="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-white/80"><MapPin size={15} class="text-goldfinch-gold" /> {l.destinations.name} · {levelLabel(l)}</p>
      {/if}
      {#if l.why_we_recommend}
        <p class="mt-5 max-w-2xl text-base leading-8 text-white/85 md:text-lg">{l.why_we_recommend}</p>
      {/if}

      <div class="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
        {#if priceLabel}<span class="text-sm text-white/75">From <span class="font-serif text-2xl font-light text-white">{priceLabel}</span> / night</span>{/if}
        {#if rating != null}<span class="inline-flex items-center gap-1.5 text-sm text-white/75"><Star size={15} fill="currentColor" class="text-goldfinch-gold" /> <span class="font-bold text-white">{rating.toFixed(1)}</span>/10 Emnel score</span>{/if}
      </div>

      <div class="mt-8 flex flex-wrap items-center gap-3">
        <a href={planHref} class="group inline-flex h-12 items-center gap-2 bg-goldfinch-gold px-7 text-[12px] font-bold uppercase tracking-[0.14em] text-deep-green transition hover:bg-savanna">
          Include in My Safari <ArrowRight size={16} strokeWidth={2.5} class="transition-transform group-hover:translate-x-0.5" />
        </a>
        <a href="/contact" class="inline-flex h-12 items-center gap-2 border border-white/30 px-7 text-[12px] font-bold uppercase tracking-[0.14em] text-white transition hover:border-goldfinch-gold hover:text-goldfinch-gold">
          <MessageCircle size={15} /> Talk to an Advisor
        </a>
        <div class="[&_button]:!border-white/30 [&_button]:!bg-white/10 [&_button]:!text-white [&_button]:!backdrop-blur">
          <ShortlistButton item={shortlistItem} variant="full" />
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ── quick facts ────────────────────────────────────────────────────────── -->
<section class="border-b border-ink/[0.06] bg-sand/40">
  <div class="container-shell grid grid-cols-2 gap-x-6 gap-y-6 py-8 md:flex md:flex-wrap md:justify-between md:py-9">
    {#each facts as f}
      <div class="flex items-center gap-3">
        <span class="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-forest/10 text-forest"><svelte:component this={f.icon} size={18} strokeWidth={2} /></span>
        <div class="min-w-0">
          <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/40">{f.label}</p>
          <p class="truncate text-sm font-semibold text-heading">{f.value}</p>
        </div>
      </div>
    {/each}
  </div>
</section>

<!-- ── overview + gallery ─────────────────────────────────────────────────── -->
<section class="container-shell py-14 md:py-20" use:fadeUpOnScroll={{ y: 16 }}>
  <div class="grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
    <div>
      <p class="brand-eyebrow">The property</p>
      <h2 class="mt-3 font-serif text-3xl font-light leading-[1.12] text-heading md:text-[38px]">Why we send guests here</h2>
      {#if l.description}
        <div class="mt-6 space-y-4 text-[15px] leading-8 text-ink/75">
          {#each l.description.split(/\n{2,}|\r\n\r\n/).filter(Boolean) as para}<p>{para}</p>{/each}
        </div>
      {/if}
      {#if l.why_we_recommend && l.description}
        <div class="mt-8 border-l-2 border-goldfinch-gold/50 bg-sand/40 p-5">
          <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-clay">Emnel's take</p>
          <p class="mt-2 text-[15px] leading-7 text-ink/80">{l.why_we_recommend}</p>
        </div>
      {/if}
      {#if !l.description && !l.why_we_recommend}
        <p class="mt-6 text-[15px] leading-8 text-ink/70">A hand-picked {typeLabel(l).toLowerCase()} in {l.destinations?.name ?? 'Tanzania'}, chosen for its location and character. Talk to a specialist for the full picture and current availability.</p>
      {/if}

      {#if bestForLabel || l.best_for?.length}
        <div class="mt-8">
          <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-ink/40">Best for</p>
          <div class="mt-3 flex flex-wrap gap-2">
            {#if bestForLabel}<span class="border border-goldfinch-gold/40 bg-goldfinch-gold/10 px-3 py-1.5 text-[12px] font-semibold text-clay">{bestForLabel}</span>{/if}
            {#each l.best_for ?? [] as tag}<span class="border border-ink/12 bg-surface px-3 py-1.5 text-[12px] font-semibold text-ink/70">{tag}</span>{/each}
          </div>
        </div>
      {/if}
    </div>

    <aside class="space-y-5">
      {#if secondImg}
        <div class="overflow-hidden">
          <img src={imgUrl(secondImg, 900)} alt={`${l.name} — view`} loading="lazy" class="aspect-[4/3] w-full object-cover" />
        </div>
      {:else if heroImg}
        <div class="overflow-hidden">
          <img src={imgUrl(heroImg, 900)} alt={l.name} loading="lazy" class="aspect-[4/3] w-full object-cover" />
        </div>
      {/if}

      {#if scores.length}
        <div class="border border-ink/10 bg-surface p-6 shadow-soft">
          <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-ink/40">How it rates</p>
          <div class="mt-4 space-y-4">
            {#each scores as s}
              <div>
                <div class="flex items-center justify-between text-sm">
                  <span class="font-semibold text-heading">{s.label}</span>
                  <span class="font-bold text-forest">{s.value.toFixed(1)}<span class="font-medium text-ink/40">/10</span></span>
                </div>
                <div class="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-sand">
                  <div class="h-full rounded-full bg-goldfinch-gold" style={`width:${Math.min(100, (s.value / 10) * 100)}%`}></div>
                </div>
              </div>
            {/each}
          </div>
          <p class="mt-4 text-[11px] leading-5 text-ink/45">Emnel's own editorial scoring, based on how the property suits each kind of traveller.</p>
        </div>
      {/if}

      <div class="border border-ink/10 bg-deep-green p-6 text-white">
        <p class="font-serif text-xl font-light">Stay here on your safari</p>
        <p class="mt-2 text-sm leading-6 text-white/75">We'll weave {l.name} into a private, tailor-made itinerary and handle every booking.</p>
        <a href={planHref} class="mt-4 inline-flex h-11 items-center gap-2 bg-goldfinch-gold px-5 text-[12px] font-bold uppercase tracking-[0.14em] text-deep-green transition hover:bg-savanna">Include in My Safari <ArrowRight size={15} strokeWidth={2.5} /></a>
        {#if l.website_url}
          <a href={l.website_url} target="_blank" rel="noopener" class="mt-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-white/70 transition hover:text-goldfinch-gold"><ExternalLink size={13} /> Official property website</a>
        {/if}
      </div>
    </aside>
  </div>
</section>

<!-- ── location ───────────────────────────────────────────────────────────── -->
{#if l.destinations?.slug}
  <section class="border-y border-ink/[0.06] bg-sand/30">
    <div class="container-shell flex flex-col items-start justify-between gap-5 py-10 sm:flex-row sm:items-center">
      <div class="flex items-start gap-4">
        <span class="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-forest/10 text-forest"><Compass size={20} strokeWidth={2} /></span>
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-ink/40">Location</p>
          <p class="mt-1 font-serif text-xl text-heading">In the heart of {l.destinations.name}</p>
          <p class="mt-1 max-w-xl text-sm text-ink/65">Read our full guide to the wildlife, timing and character of this destination.</p>
        </div>
      </div>
      <a href={`/destinations/${l.destinations.slug}`} class="inline-flex h-11 shrink-0 items-center gap-2 border border-deep-green/20 px-5 text-[12px] font-bold uppercase tracking-[0.14em] text-heading transition hover:bg-sand/60">
        Explore {l.destinations.name} <ArrowRight size={15} strokeWidth={2.5} />
      </a>
    </div>
  </section>
{/if}

<!-- ── related safaris ────────────────────────────────────────────────────── -->
{#if data.safaris.length}
  <section class="container-shell py-14 md:py-20" use:fadeUpOnScroll={{ y: 16 }}>
    <p class="brand-eyebrow">Safaris that visit here</p>
    <h2 class="mt-3 max-w-2xl font-serif text-3xl font-light leading-[1.12] text-heading md:text-[38px]">Itineraries through {l.destinations?.name ?? 'this region'}</h2>
    <p class="mt-3 max-w-2xl text-[15px] leading-7 text-ink/65">Private safaris that explore this area — each one can be shaped to include {l.name}.</p>
    <div class="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 18, stagger: 0.06 }}>
      {#each data.safaris as tour (tour.id)}<TourCard {tour} />{/each}
    </div>
  </section>
{/if}

<!-- ── related stays ──────────────────────────────────────────────────────── -->
{#if data.relatedLodges.length}
  <section class={`${data.safaris.length ? 'border-t border-ink/[0.06] bg-sand/30' : ''}`}>
    <div class="container-shell py-14 md:py-20" use:fadeUpOnScroll={{ y: 16 }}>
      <p class="brand-eyebrow">More places to stay</p>
      <h2 class="mt-3 font-serif text-3xl font-light leading-[1.12] text-heading md:text-[38px]">Other stays in {l.destinations?.name ?? 'the area'}</h2>
      <div class="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 18, stagger: 0.06 }}>
        {#each data.relatedLodges as rl (rl.id)}<LodgeCard lodge={rl} />{/each}
      </div>
    </div>
  </section>
{/if}

<!-- ── planning CTA ───────────────────────────────────────────────────────── -->
<section class="container-shell py-16 md:py-20">
  <div class="relative overflow-hidden bg-deep-green px-6 py-14 text-center text-white md:px-12 md:py-20">
    {#if heroImg}<img src={imgUrl(heroImg, 1600)} alt="" class="absolute inset-0 h-full w-full object-cover object-center opacity-25" decoding="async" />{/if}
    <div class="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-goldfinch-gold/20 blur-3xl"></div>
    <div class="relative mx-auto max-w-2xl">
      <p class="brand-eyebrow justify-center text-goldfinch-gold">Ready when you are</p>
      <h2 class="mt-3 font-serif text-3xl font-light leading-[1.1] md:text-[42px]">Stay at {l.name} during your safari</h2>
      <p class="mx-auto mt-4 max-w-xl text-white/75">Include this property in a tailor-made itinerary designed by our local experts — no payment needed to start.</p>
      <div class="mt-8 flex flex-wrap justify-center gap-3">
        <a href={planHref} class="inline-flex h-12 items-center gap-2 bg-goldfinch-gold px-7 text-[12px] font-bold uppercase tracking-[0.14em] text-deep-green transition hover:bg-savanna">Include in My Safari <ArrowRight size={16} strokeWidth={2.5} /></a>
        <a href="/contact" class="inline-flex h-12 items-center gap-2 border border-white/30 px-7 text-[12px] font-bold uppercase tracking-[0.14em] text-white transition hover:border-goldfinch-gold hover:text-goldfinch-gold"><MessageCircle size={15} /> Talk to a Safari Expert</a>
      </div>
      <div class="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 border-t border-white/15 pt-6 text-[12px] font-medium text-white/70">
        {#each ['Private & tailor-made', 'Every booking handled', 'No obligation to book'] as t}
          <span class="inline-flex items-center gap-1.5"><Heart size={13} class="text-goldfinch-gold" />{t}</span>
        {/each}
      </div>
    </div>
  </div>
</section>
