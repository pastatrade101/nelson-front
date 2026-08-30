<script lang="ts">
  import {
    ArrowRight, Award, Building2, ChevronRight, Compass, ExternalLink,
    Heart, MapPin, MessageCircle, Sparkles, Star, Wallet
  } from '@lucide/svelte';
  import { fadeUpOnScroll, staggeredCardReveal } from '$lib/animations/motion';
  import { imgUrl, origUrl, thumbUrl } from '$lib/img';
  import { lodgeStars, levelLabel, lodgeBestForLabel, lodgeImage, lodgePriceLabel, lodgeRating, typeLabel } from '$lib/lodge';
  import LodgeCard from '$lib/components/public/LodgeCard.svelte';
  import LodgeGallery from '$lib/components/public/LodgeGallery.svelte';
  import TourCardRich from '$lib/components/public/TourCardRich.svelte';
  import ShortlistButton from '$lib/components/public/ShortlistButton.svelte';
  import ResponsiveImage from '$lib/components/public/ResponsiveImage.svelte';
  import type { PageData } from './$types';

  export let data: PageData;

  $: l = data.lodge;
  $: heroImg = lodgeImage(l);
  $: secondImg = l.image_url && l.image_url !== l.hero_image_url ? l.image_url : '';
  $: rating = lodgeRating(l);
  $: stars = lodgeStars(l);
  $: priceLabel = lodgePriceLabel(l);
  $: bestForLabel = lodgeBestForLabel(l);
  // The property's own photographs. Falls back to the hero and card images so a
  // lodge with no gallery yet still has something to show rather than an empty
  // section — the same rule the itinerary day uses.
  $: gallery = (() => {
    const rows = (l.lodge_images ?? []).filter((i) => (i.image_url ?? '').trim());
    if (rows.length) return rows;
    const seen = new Set<string>();
    return [l.hero_image_url, l.image_url]
      .map((url) => (url ?? '').trim())
      .filter((url) => url && !seen.has(url) && seen.add(url))
      .map((url, n) => ({ image_url: url, is_cover: n === 0 }));
  })();
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

<!-- ── hero: full-bleed, editorial, one clear action ───────────────────────── -->
<section class="relative flex min-h-[68svh] items-end overflow-hidden bg-deep-green text-white md:min-h-[76vh]">
  {#if heroImg}
    <ResponsiveImage
      src={origUrl(l, 'hero_image_url', 'image_url')}
      fallbackSrc={thumbUrl(l, 'hero_image_url', 'image_url')}
      alt=""
      width={1920}
      sizes="100vw"
      eager
      priority
      imgClass="absolute inset-0 h-full w-full object-cover"
    />
    <span class="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/50 to-ink/25" aria-hidden="true"></span>
  {:else}
    <span class="absolute inset-0 bg-gradient-to-br from-deep-green via-forest to-deep-green" aria-hidden="true"></span>
  {/if}
  <span class="pointer-events-none absolute inset-0 shadow-[inset_0_0_180px_60px_rgba(0,0,0,0.5)]" aria-hidden="true"></span>

  <div class="container-shell relative z-10 pb-14 pt-28 md:pb-20">
    <nav class="mb-8 hidden flex-wrap items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-white/55 sm:flex md:mb-12" aria-label="Breadcrumb">
      <a href="/" class="transition hover:text-goldfinch-gold">Home</a><ChevronRight size={13} />
      <a href="/accommodation" class="transition hover:text-goldfinch-gold">Accommodation</a><ChevronRight size={13} />
      <span class="text-goldfinch-gold">{l.name}</span>
    </nav>

    <div class="max-w-3xl" use:fadeUpOnScroll={{ y: 16 }}>
      <div class="flex flex-wrap items-center gap-2">
        {#if l.is_featured}
          <span class="inline-flex items-center gap-1 bg-goldfinch-gold px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-deep-green"><Sparkles size={11} /> Recommended</span>
        {/if}
        <span class="border border-white/25 bg-black/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white backdrop-blur">{typeLabel(l)}</span>
      </div>

      <h1 class="mt-4 font-serif text-4xl font-light leading-[1.05] md:text-[62px]">{l.name}</h1>

      {#if l.destinations?.name}
        <p class="mt-3 inline-flex items-center gap-1.5 text-sm text-white/80">
          <MapPin size={15} class="text-goldfinch-gold" />{l.destinations.name}
          <span> · {levelLabel(l)}</span>
        </p>
      {/if}

      {#if l.why_we_recommend}
        <p class="mt-5 max-w-2xl text-base leading-8 text-white/80 md:text-lg">{l.why_we_recommend}</p>
      {/if}

      {#if bestForLabel}
        <div class="mt-5 border-t border-white/15 pt-4 md:mt-6 md:pt-5">
          <p class="text-[9px] font-bold uppercase tracking-[0.16em] text-white/55">Best for</p>
          <p class="mt-2 text-xs font-semibold text-white/85">{bestForLabel}</p>
        </div>
      {/if}

      <div class="mt-7 flex flex-col gap-3 sm:flex-row">
        <a
          class="inline-flex h-12 w-full items-center justify-center gap-2 bg-goldfinch-gold px-7 text-sm font-semibold text-deep-green transition hover:brightness-95 sm:w-auto"
          href={data.staysHere?.length || data.safaris.length ? '#safari-itineraries' : '/tours'}
        >
          See safari itineraries <ArrowRight size={16} />
        </a>
        <a class="inline-flex h-12 w-full items-center justify-center border border-white/30 px-7 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/10 sm:w-auto" href={planHref}>
          Build a trip around this stay
        </a>
      </div>
    </div>
  </div>
</section>

<!-- ── fact strip: text on hairlines, not badges ───────────────────────────── -->
{#if facts.length}
  <section class="border-b border-ink/10 bg-sand/35">
    <div class="container-shell grid grid-cols-2 gap-5 py-7 md:flex md:flex-wrap md:justify-between md:py-8">
      {#each facts as fact}
        <div class="flex min-w-0 items-center gap-3">
          <span class="grid h-10 w-10 shrink-0 place-items-center bg-forest/10 text-forest"><svelte:component this={fact.icon} size={18} /></span>
          <div class="min-w-0">
            <p class="text-[9px] font-bold uppercase tracking-[0.14em] text-ink/40">{fact.label}</p>
            <p class="mt-0.5 truncate text-sm font-semibold text-heading">{fact.value}</p>
          </div>
        </div>
      {/each}
    </div>
  </section>
{/if}

<!-- ── body + sticky aside ─────────────────────────────────────────────────── -->
<section class="bg-canvas py-16 md:py-24">
  <div class="container-shell grid gap-14 lg:grid-cols-[1fr_320px] lg:items-start lg:gap-20">
    <div class="max-w-[68ch]">
      {#if l.why_we_recommend}
        <div use:fadeUpOnScroll={{ y: 14 }}>
          <span class="block h-px w-16 bg-goldfinch-gold" aria-hidden="true"></span>
          <p class="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-clay">Why we recommend it</p>
          <p class="mt-4 font-serif text-2xl font-light leading-[1.5] text-heading md:text-[30px] md:leading-[1.45]">{l.why_we_recommend}</p>
        </div>
      {/if}

      {#if l.description}
        <div use:fadeUpOnScroll={{ y: 14 }}>
          <p class="mt-12 text-base leading-8 text-ink/70">{l.description}</p>
        </div>
      {/if}

      {#if gallery.length}
        <div class="mt-12" use:fadeUpOnScroll={{ y: 14 }}>
          <span class="block h-px w-16 bg-goldfinch-gold" aria-hidden="true"></span>
          <p class="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-clay">The property</p>
          <div class="mt-5">
            <LodgeGallery images={gallery} propertyName={l.name} />
          </div>
        </div>
      {/if}

      {#if scores.length}
        <div class="mt-12" use:fadeUpOnScroll={{ y: 14 }}>
          <span class="block h-px w-16 bg-goldfinch-gold" aria-hidden="true"></span>
          <p class="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-clay">How it scores</p>
          <dl class="mt-5 grid gap-px border border-ink/10 bg-ink/10 sm:grid-cols-2">
            {#each scores as s}
              <div class="bg-surface p-5">
                <dt class="text-[10px] font-bold uppercase tracking-wider text-ink/45">{s.label}</dt>
                <dd class="mt-1 font-serif text-2xl font-light text-heading">{s.value}<span class="text-base text-ink/40"> / 10</span></dd>
              </div>
            {/each}
          </dl>
        </div>
      {/if}

      {#if l.destinations?.name}
        <div class="mt-12" use:fadeUpOnScroll={{ y: 14 }}>
          <span class="block h-px w-16 bg-goldfinch-gold" aria-hidden="true"></span>
          <p class="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-clay">Where it is</p>
          <p class="mt-4 text-base leading-8 text-ink/70">
            {l.name} sits in {l.destinations.name}. We pair it with the rest of a route so the driving works and the
            days are paced properly — that is usually what decides whether a stay is right, not the property alone.
          </p>
          {#if l.destinations.slug}
            <a class="mt-4 inline-flex items-center gap-2 text-sm font-medium text-deep-green transition hover:underline" href={`/destinations/${l.destinations.slug}`}>
              About {l.destinations.name} <ArrowRight size={15} />
            </a>
          {/if}
        </div>
      {/if}
    </div>

    <aside class="lg:sticky lg:top-28">
      <div class="bg-deep-green p-6 text-white shadow-[0_20px_50px_rgba(28,46,39,0.2)]">
        <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-goldfinch-gold">Build your safari</p>
        <p class="mt-2 font-serif text-2xl font-light leading-tight text-white">Stay at {l.name}</p>
        {#if l.destinations?.name}<p class="mt-1 text-sm text-white/55">{l.destinations.name}</p>{/if}
        {#if priceLabel}<p class="mt-4 text-sm text-white/70">From <span class="font-serif text-xl font-light text-white">{priceLabel}</span> / night</p>{/if}

        <p class="mt-5 text-sm leading-7 text-white/70">
          This stay works best as part of a well-paced route. Start with an itinerary and we will confirm the right
          room, dates and transfers.
        </p>

        <a
          class="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 bg-goldfinch-gold px-6 text-sm font-semibold text-deep-green transition hover:brightness-95"
          href={data.staysHere?.length || data.safaris.length ? '#safari-itineraries' : '/tours'}
        >
          View safari itineraries <ArrowRight size={16} />
        </a>
        <a class="mt-3 inline-flex h-12 w-full items-center justify-center border border-white/25 px-6 text-sm font-semibold text-white transition hover:border-goldfinch-gold hover:text-goldfinch-gold" href={planHref}>
          Ask us to include this stay
        </a>

        <div class="mt-4"><ShortlistButton item={shortlistItem} variant="full" /></div>

        {#if l.website_url}
          <a class="mt-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-white/60 transition hover:text-goldfinch-gold" href={l.website_url} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={13} /> Official property website
          </a>
        {/if}
      </div>
    </aside>
  </div>
</section>

<!-- ── itineraries ─────────────────────────────────────────────────────────
     Trips that actually stay here take precedence over ones that merely cross
     the same park; the fallback is worded honestly as the weaker claim. -->
{#if data.staysHere?.length || data.safaris.length}
  <section id="safari-itineraries" class="scroll-mt-28 border-t border-ink/10 bg-deep-green py-16 text-white md:py-20">
    <div class="container-shell" use:fadeUpOnScroll={{ y: 16 }}>
      <p class="text-[11px] uppercase tracking-[0.22em] text-goldfinch-gold">
        {data.staysHere?.length ? 'Stays here' : 'Safaris that visit here'}
      </p>
      <h2 class="mt-3 max-w-2xl font-serif text-3xl font-light leading-tight md:text-[42px]">
        {#if data.staysHere?.length}
          Itineraries that stay at {l.name}
        {:else}
          Itineraries through {l.destinations?.name ?? 'this region'}
        {/if}
      </h2>
      <p class="mt-3 max-w-2xl text-[15px] leading-7 text-white/70">
        {#if data.staysHere?.length}
          Private safaris with a night here already built in — each one can still be reshaped around your dates.
        {:else}
          Private safaris that explore this area — each one can be shaped to include {l.name}.
        {/if}
      </p>
      <div class="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 18, stagger: 0.06 }}>
        {#each (data.staysHere?.length ? data.staysHere : data.safaris) as tour (tour.id)}
          <TourCardRich {tour} ctaLabel="View itinerary" />
        {/each}
      </div>
    </div>
  </section>
{/if}

<!-- ── other stays ─────────────────────────────────────────────────────────── -->
{#if data.relatedLodges.length}
  <section class="border-t border-ink/10 bg-sand/25 py-16 md:py-20">
    <div class="container-shell" use:fadeUpOnScroll={{ y: 16 }}>
      <p class="text-[11px] uppercase tracking-[0.22em] text-clay">More places to stay</p>
      <h2 class="mt-3 font-serif text-2xl font-light leading-tight text-heading md:text-[32px]">
        Other properties in {l.destinations?.name ?? 'this area'}
      </h2>
      <div class="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 18, stagger: 0.06 }}>
        {#each data.relatedLodges as rl (rl.id)}<LodgeCard lodge={rl} />{/each}
      </div>
    </div>
  </section>
{/if}

<!-- ── closing band ────────────────────────────────────────────────────────── -->
<section class="relative overflow-hidden bg-deep-green text-white">
  <div class="container-shell relative py-16 text-center md:py-20">
    <p class="text-[11px] uppercase tracking-[0.22em] text-goldfinch-gold">Plan it properly</p>
    <h2 class="mx-auto mt-5 max-w-3xl font-serif text-3xl font-light leading-[1.12] md:text-[46px]">
      Tell us what you want, and we will tell you honestly whether {l.name} fits
    </h2>
    <p class="mx-auto mt-5 max-w-2xl text-[15px] leading-8 text-white/70">
      Dates, budget, who is travelling. We will come back with a route that works — including when a different
      property would serve you better.
    </p>
    <div class="mt-9 flex flex-wrap justify-center gap-4">
      <a class="inline-flex h-12 items-center bg-goldfinch-gold px-8 text-sm font-semibold text-deep-green transition hover:brightness-95" href={planHref}>Plan My Safari</a>
      <a class="inline-flex h-12 items-center gap-2 border border-white/25 px-8 text-sm font-semibold text-white transition hover:bg-white/10" href="/accommodation">
        Browse all stays <ArrowRight size={16} />
      </a>
    </div>
  </div>
</section>
