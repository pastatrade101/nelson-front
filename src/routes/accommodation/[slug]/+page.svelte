<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { SITE_URL } from '$lib/config/env';
  import { accommodationSeo, accommodationStructuredData } from '$lib/accommodation-seo';
  import { breadcrumbLd } from '$lib/seo';
  import { toMetaText } from '$lib/richtext';
  import JsonLd from '$lib/components/public/JsonLd.svelte';
  import RichText from '$lib/components/public/RichText.svelte';
  import FinalCtaSection from '$lib/components/public/FinalCtaSection.svelte';
  import { ArrowRight, Check, ChevronRight, ExternalLink, MapPin, Minus, Sparkles } from '@lucide/svelte';
  import { fadeUpOnScroll, staggeredCardReveal } from '$lib/animations/motion';
  import { imgUrl, origUrl, thumbUrl } from '$lib/img';
  import {
    accessibilityLabel, electricityLabel, humaniseValue, levelLabel, lodgePlaceLine, lodgePriceLabel,
    roadAccessLabel, settingDisplayLabels, typeLabel, wifiLabel
  } from '$lib/lodge';
  import LodgeCard from '$lib/components/public/LodgeCard.svelte';
  import LodgeGallery from '$lib/components/public/LodgeGallery.svelte';
  import TourCardRich from '$lib/components/public/TourCardRich.svelte';
  import ShortlistButton from '$lib/components/public/ShortlistButton.svelte';
  import ResponsiveImage from '$lib/components/public/ResponsiveImage.svelte';
  import type { LodgeImage } from '$lib/types';
  import type { PageData } from './$types';

  export let data: PageData;

  type Row = { label: string; value: string };
  const rows = (list: Array<Row | null | false>) => list.filter(Boolean) as Row[];
  const sortByOrder = <T extends { sort_order?: number | null }>(list: T[]) =>
    [...list].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

  $: l = data.lodge;

  // ── Photographs ─────────────────────────────────────────────────────────
  // The gallery in its saved order with the cover first, never repeating a
  // photograph. The hero is the hero image, else the gallery cover, else the
  // card image; the gallery section then shows everything except the hero, so
  // a one-photo property does not show the same picture twice.
  $: galleryRows = (() => {
    const seen = new Set<string>();
    return [...(l.lodge_images ?? [])]
      .filter((i) => (i.image_url ?? '').trim())
      .sort((a, b) => Number(b.is_cover ?? false) - Number(a.is_cover ?? false) || (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .filter((i) => {
        const url = (i.image_url ?? '').trim();
        return !seen.has(url) && Boolean(seen.add(url));
      });
  })();
  $: heroUrl = (l.hero_image_url ?? '').trim() || (galleryRows[0]?.image_url ?? '').trim() || (l.image_url ?? '').trim();
  $: heroFromRecord = Boolean((l.hero_image_url ?? '').trim() || (!galleryRows.length && (l.image_url ?? '').trim()));
  $: mobileHero = (l.mobile_hero_image_url ?? '').trim();
  $: galleryImages = (() => {
    const list: LodgeImage[] = galleryRows.filter((i) => (i.image_url ?? '').trim() !== heroUrl);
    const card = (l.image_url ?? '').trim();
    if (card && card !== heroUrl && !list.some((i) => i.image_url === card)) list.push({ image_url: card });
    return list;
  })();

  // ── The property's own collections, each sorted and gated on content ────
  $: highlights = sortByOrder(l.lodge_highlights ?? []).filter((h) => (h.title ?? '').trim());
  $: inclusions = sortByOrder(l.lodge_inclusions ?? []).filter((i) => (i.title ?? '').trim());
  $: included = inclusions.filter((i) => i.is_included !== false).map((i) => i.title);
  $: excluded = inclusions.filter((i) => i.is_included === false).map((i) => i.title);

  $: rooms = sortByOrder(l.lodge_rooms ?? [])
    .filter((r) => (r.name ?? '').trim())
    .map((r) => {
      const images = [...(r.lodge_room_images ?? [])]
        .filter((i) => (i.image_url ?? '').trim())
        .sort((a, b) => Number(b.is_cover ?? false) - Number(a.is_cover ?? false) || (a.sort_order ?? 0) - (b.sort_order ?? 0));
      const sleeps =
        r.max_guests ? plural(r.max_guests, 'guest')
          : r.max_adults ? [plural(r.max_adults, 'adult'), r.max_children ? plural(r.max_children, 'child').replace('childs', 'children') : ''].filter(Boolean).join(' + ')
            : '';
      return {
        id: r.id ?? r.name,
        name: r.name,
        type: r.room_type ? humaniseValue(r.room_type) : '',
        description: (r.short_description ?? '').trim(),
        image: images[0] ?? null,
        facts: rows([
          sleeps ? { label: 'Sleeps', value: sleeps } : null,
          (r.bed_types ?? []).length ? { label: 'Beds', value: (r.bed_types ?? []).join(' · ') } : null,
          (r.views ?? []).length ? { label: 'Views', value: (r.views ?? []).join(' · ') } : null,
          (r.amenities ?? []).length ? { label: 'In the room', value: (r.amenities ?? []).join(' · ') } : null,
          r.unit_count ? { label: 'Rooms like this', value: String(r.unit_count) } : null
        ])
      };
    });

  // Rates only reach the page when the property opts in (the API strips them otherwise).
  const shortDate = (v?: string | null) => {
    if (!v) return '';
    const d = new Date(`${v}T00:00:00`);
    return Number.isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
  };
  const money = (currency: string | null | undefined, n?: number | null) =>
    n != null ? `${currency ?? 'USD'} ${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '';
  $: rates = sortByOrder(l.show_rates_publicly === true ? l.lodge_seasonal_rates ?? [] : []).map((r) => ({
    season: (r.season_name ?? '').trim() || (r.season_type ? humaniseValue(r.season_type) : 'Season'),
    dates: [shortDate(r.valid_from), shortDate(r.valid_until)].filter(Boolean).join(' – '),
    prices: [
      r.double_rate != null ? `${money(r.currency, r.double_rate)} sharing` : '',
      r.single_rate != null ? `${money(r.currency, r.single_rate)} single` : '',
      r.child_rate != null ? `${money(r.currency, r.child_rate)} child` : ''
    ].filter(Boolean).join(' · ') || money(r.currency, r.rack_rate),
    terms: [r.pricing_basis ? humaniseValue(r.pricing_basis) : '', r.meal_plan ? humaniseValue(r.meal_plan) : ''].filter(Boolean).join(' · ')
  }));

  // ── Facts, each stated once ─────────────────────────────────────────────
  $: priceLabel = l.show_rates_publicly === true ? lodgePriceLabel(l) : '';
  $: placeLine = lodgePlaceLine(l);
  $: settingTags = settingDisplayLabels(l);
  $: bestFor = (l.best_for ?? []).map((v) => String(v ?? '').trim()).filter(Boolean).map((v) => (/[\sA-Z]/.test(v) ? v : humaniseValue(v)));
  $: bestMonths = (l.best_months ?? []).map((v) => String(v ?? '').trim()).filter(Boolean);

  // 'Adults only' is stated outright: it is what a traveller needs in order to rule the property out.
  $: childPolicy =
    l.children_allowed === false
      ? 'Adults only'
      : l.minimum_child_age
        ? `Children welcome from age ${l.minimum_child_age}`
        : l.children_allowed === true || l.family_friendly === true
          ? 'Children welcome'
          : '';

  $: heroFacts = rows([
    priceLabel ? { label: 'From', value: `${priceLabel} / night` } : null,
    l.recommended_nights ? { label: 'Suggested stay', value: plural(l.recommended_nights, 'night') } : null,
    childPolicy ? { label: 'Children', value: childPolicy } : null,
    settingTags.length ? { label: 'Setting', value: settingTags.slice(0, 2).join(' · ') } : null
  ]);

  $: arrivalModes = [l.fly_in_available === true ? 'Fly-in' : '', l.transfer_available === true ? 'Road transfer' : '']
    .filter(Boolean)
    .join(' · ');
  $: whereRows = rows([
    l.nearest_airport ? { label: 'Nearest airport', value: l.nearest_airport } : null,
    l.distance_airstrip ? { label: 'From the airport', value: l.distance_airstrip } : null,
    l.transfer_time ? { label: 'Transfer time', value: l.transfer_time } : null,
    l.distance_park_gate ? { label: 'From the park gate', value: l.distance_park_gate } : null,
    roadAccessLabel(l) ? { label: 'Road access', value: roadAccessLabel(l) } : null,
    arrivalModes ? { label: 'Getting in', value: arrivalModes } : null
  ]);
  $: mapHref =
    (l.google_maps_url ?? '').trim() ||
    (l.latitude != null && l.longitude != null ? `https://www.google.com/maps?q=${l.latitude},${l.longitude}` : '');

  $: scoreLine = [
    l.romantic_rating != null ? `Couples ${l.romantic_rating}/10` : '',
    l.family_rating != null ? `Families ${l.family_rating}/10` : ''
  ].filter(Boolean).join(' · ');
  $: accessText =
    accessibilityLabel(l) || (l.wheelchair_accessible === true ? 'Step-free access available' : '');
  $: suitsRows = rows([
    bestFor.length ? { label: 'Best for', value: bestFor.join(' · ') } : null,
    childPolicy ? { label: 'Children', value: childPolicy } : null,
    settingTags.length ? { label: 'Setting', value: settingTags.join(' · ') } : null,
    bestMonths.length ? { label: 'When to go', value: bestMonths.join(' · ') } : null,
    accessText ? { label: 'Accessibility', value: accessText } : null,
    scoreLine ? { label: 'Our scores', value: scoreLine } : null
  ]);

  // 'Not available' and 'No reliable power' render on purpose — saying so plainly is the point.
  $: practicalRows = rows([
    electricityLabel(l) ? { label: 'Power', value: electricityLabel(l) } : null,
    wifiLabel(l) ? { label: 'Wi-Fi', value: wifiLabel(l) } : null,
    (l.mobile_networks ?? []).length ? { label: 'Mobile signal', value: (l.mobile_networks ?? []).join(' · ') } : null
  ]);

  $: hasOverview = Boolean((l.description ?? '').trim() || (l.why_we_recommend ?? '').trim() || highlights.length);
  $: hasWhere = Boolean(placeLine || whereRows.length || (l.arrival_instructions ?? '').trim() || mapHref || (l.website_url ?? '').trim());
  $: hasPractical = Boolean(practicalRows.length || (l.traveler_notes ?? '').trim());
  $: stays = data.staysHere ?? [];
  $: nearby = data.safaris ?? [];
  $: destinationName = l.destinations?.name ?? '';

  $: planHref = `/plan-my-trip?lodge=${encodeURIComponent(l.slug)}`;
  $: shortlistItem = {
    kind: 'lodge' as const,
    slug: l.slug, title: l.name, image_url: heroUrl,
    destination: destinationName || undefined, price_from: l.show_rates_publicly === true ? l.price_per_night_from ?? undefined : undefined, currency: l.currency
  };

  // ── Section bar ─────────────────────────────────────────────────────────
  $: nav = [
    hasOverview && { id: 'overview', label: 'Overview' },
    galleryImages.length && { id: 'photos', label: 'Photos' },
    rooms.length && { id: 'rooms', label: 'Rooms' },
    hasWhere && { id: 'location', label: 'Location' },
    suitsRows.length && { id: 'suits', label: 'Who it suits' },
    hasPractical && { id: 'good-to-know', label: 'Good to know' },
    inclusions.length && { id: 'included', label: "What's included" },
    rates.length && { id: 'rates', label: 'Rates' },
    { id: 'safari-itineraries', label: 'Itineraries' }
  ].filter(Boolean) as { id: string; label: string }[];

  let active = '';
  let navBar: HTMLElement;
  onMount(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.33;
      let current = '';
      for (const n of nav) {
        const el = document.getElementById(n.id);
        if (el && el.getBoundingClientRect().top <= line) current = n.id;
      }
      if (current === active) return;
      active = current;
      const link = navBar?.querySelector<HTMLElement>(`[data-nav="${active}"]`);
      if (link && navBar) navBar.scrollTo({ left: link.offsetLeft - navBar.clientWidth / 2 + link.clientWidth / 2, behavior: 'smooth' });
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  });

  $: seo = accommodationSeo(l);
  $: origin = (SITE_URL || $page.url.origin).replace(/\/$/, '');
  $: schema = accommodationStructuredData(l, origin);
</script>

<JsonLd data={schema} />
<JsonLd data={breadcrumbLd(origin, [{ name: 'Home', path: '/' }, { name: 'Accommodation', path: '/accommodation' }, { name: l.name, path: '/accommodation/' + l.slug }])} />

{#snippet heading(eyebrow: string, title: string, dark = false)}
  <p class={`text-[11px] font-medium uppercase tracking-[0.26em] ${dark ? 'text-goldfinch-gold' : 'text-clay'}`}>{eyebrow}</p>
  <h2 class={`mt-4 font-serif text-[28px] font-light leading-[1.12] md:text-[36px] ${dark ? 'text-white' : 'text-heading'}`}>{title}</h2>
{/snippet}

{#snippet factList(list: Row[])}
  <dl class="divide-y divide-ink/10 border-y border-ink/10">
    {#each list as row (row.label)}
      <div class="grid gap-1 py-4 sm:grid-cols-[180px_1fr] sm:gap-8">
        <dt class="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/45 sm:pt-1">{row.label}</dt>
        <dd class="text-[15px] leading-7 text-ink/80">{row.value}</dd>
      </div>
    {/each}
  </dl>
{/snippet}

<section class="bg-deep-green text-white">
  <div class="container-shell pb-10 pt-24 md:pb-14 md:pt-28">
    <nav class="mb-7 flex flex-wrap items-center gap-2 text-xs text-white/65" aria-label="Breadcrumb">
      <a href="/">Home</a><ChevronRight size={12} /><a href="/accommodation">Accommodation</a><ChevronRight size={12} /><span aria-current="page" class="text-white">{l.name}</span>
    </nav>
    <div class="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
      <div>
        <p class="text-[10px] font-semibold uppercase tracking-[.18em] text-goldfinch-gold">{typeLabel(l)} · {levelLabel(l)}</p>
        <h1 class="mt-4 break-words font-serif text-[40px] font-light leading-[1.06] md:text-[56px]">{l.name}</h1>
        {#if placeLine}<p class="mt-4 flex items-start gap-2 text-sm text-white/70"><MapPin size={16} class="shrink-0 text-goldfinch-gold" />{placeLine}</p>{/if}
        {#if l.short_description}<p class="mt-5 max-w-xl text-base leading-7 text-white/80">{toMetaText(l.short_description, 500)}</p>{/if}
        <div class="mt-7 flex flex-wrap items-center gap-3">
          <a class="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-goldfinch-gold px-5 text-sm font-semibold text-deep-green" href={planHref}>Plan a stay here <ArrowRight size={16} /></a>
          <ShortlistButton item={shortlistItem} variant="full" />
        </div>
        <a href="#safari-itineraries" class="mt-5 inline-block text-xs font-semibold text-white/75 underline underline-offset-4">Explore safari itineraries</a>
      </div>
      {#if heroUrl}
        <div class="relative aspect-[4/3] overflow-hidden rounded-lg">
          {#if mobileHero}<div class="md:hidden"><ResponsiveImage src={mobileHero} alt={l.name} width={900} sizes="100vw" eager priority imgClass="absolute inset-0 h-full w-full object-cover" /></div>{/if}
          <div class={mobileHero ? 'hidden h-full md:block' : 'h-full'}><ResponsiveImage src={heroFromRecord ? origUrl(l, 'hero_image_url', 'image_url') : heroUrl} fallbackSrc={heroUrl} alt={l.name} width={1200} sizes="(min-width:1024px) 50vw, 100vw" eager priority imgClass="h-full w-full object-cover" /></div>
          {#if galleryImages.length}<a class="absolute bottom-4 right-4 rounded-md bg-surface px-4 py-2.5 text-xs font-semibold text-forest" href="#photos">View all {galleryImages.length + 1} photos</a>{/if}
        </div>
      {/if}
    </div>
    {#if heroFacts.length}<dl class="mt-8 grid grid-cols-2 gap-5 border-t border-white/15 pt-6 lg:grid-cols-4">{#each heroFacts as fact}<div><dt class="text-[10px] font-semibold uppercase tracking-widest text-white/50">{fact.label}</dt><dd class="mt-2 text-sm leading-6 text-white/90">{fact.value}</dd></div>{/each}</dl>{/if}
  </div>
</section>

<!-- ── section bar ─────────────────────────────────────────────────────────── -->
{#if nav.length > 2}
  <div class="sticky top-[var(--nav-h,70px)] z-30 border-b border-ink/10 bg-canvas/90 backdrop-blur-md">
    <div class="container-shell flex items-center gap-4">
      <nav bind:this={navBar} class="no-scrollbar -mx-3.5 flex min-w-0 flex-1 overflow-x-auto" aria-label="On this page">
        {#each nav as item (item.id)}
          <a
            data-nav={item.id}
            aria-current={active === item.id ? 'location' : undefined}
            href={`#${item.id}`}
            class={`relative shrink-0 whitespace-nowrap px-3.5 py-4 text-[13px] font-medium transition ${active === item.id ? 'text-heading' : 'text-ink/50 hover:text-heading'}`}
          >
            {item.label}
            <span class={`absolute inset-x-3.5 bottom-0 h-0.5 bg-goldfinch-gold transition-opacity ${active === item.id ? 'opacity-100' : 'opacity-0'}`}></span>
          </a>
        {/each}
      </nav>
      <a class="hidden h-9 shrink-0 items-center gap-1.5 whitespace-nowrap bg-deep-green px-4 text-[12px] font-semibold text-white transition hover:bg-forest lg:inline-flex" href={planHref}>
        Plan this stay <ArrowRight size={14} />
      </a>
    </div>
  </div>
{/if}

<!-- ── overview ────────────────────────────────────────────────────────────── -->
{#if hasOverview}
  <section id="overview" class="scroll-mt-[calc(var(--nav-h,70px)+56px)] bg-canvas py-12 md:py-16">
    <div class="container-shell grid gap-10 lg:grid-cols-12 lg:gap-16" use:fadeUpOnScroll={{ y: 14 }}>
      <div class="lg:col-span-5">
        {@render heading('The property', 'What it is like')}
        {#if (l.why_we_recommend ?? '').trim()}
          <p class="mt-10 border-l-2 border-goldfinch-gold pl-6 font-serif text-[22px] font-light italic leading-[1.45] text-heading md:text-[26px]">
            {toMetaText(l.why_we_recommend, 5000)}
          </p>
          <p class="mt-3 pl-6 text-[11px] font-medium uppercase tracking-[0.2em] text-ink/45">Why we recommend it</p>
        {/if}
      </div>
      <div class="lg:col-span-7 lg:pt-2">
        {#if (l.description ?? '').trim()}
          <RichText value={l.description} className="max-w-[68ch] text-base leading-[1.85] text-ink/75" />
        {/if}
        {#if highlights.length}
          <p class={`text-[11px] font-semibold uppercase tracking-[0.2em] text-heading ${(l.description ?? '').trim() ? 'mt-10' : ''}`}>What stands out</p>
          <ul class="mt-4 divide-y divide-ink/10 border-y border-ink/10">
            {#each highlights as h (h.id ?? h.title)}
              <li class="flex gap-3 py-3.5 text-[15px] leading-7 text-ink/80"><Check class="mt-1.5 h-4 w-4 shrink-0 text-clay" strokeWidth={2.4} />{h.title}</li>
            {/each}
          </ul>
        {/if}
      </div>
    </div>
  </section>
{/if}

<!-- ── photographs ─────────────────────────────────────────────────────────── -->
{#if galleryImages.length}
  <section id="photos" class="scroll-mt-[calc(var(--nav-h,70px)+56px)] border-t border-ink/10 bg-canvas py-12 md:py-16">
    <div class="container-shell" use:fadeUpOnScroll={{ y: 14 }}>
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div class="max-w-3xl">{@render heading('Photographs', `Inside ${l.name}`)}</div>
        <p class="text-[13px] text-ink/50">{plural(galleryImages.length + (heroUrl ? 1 : 0), 'photo')}</p>
      </div>
      <div class="mt-7 md:mt-9">
        <LodgeGallery images={galleryImages} propertyName={l.name} />
      </div>
    </div>
  </section>
{/if}

<!-- ── rooms ───────────────────────────────────────────────────────────────── -->
{#if rooms.length}
  <section id="rooms" class="scroll-mt-[calc(var(--nav-h,70px)+56px)] border-t border-ink/10 bg-canvas py-12 md:py-16">
    <div class="container-shell" use:fadeUpOnScroll={{ y: 14 }}>
      <div class="max-w-3xl">{@render heading('Where you sleep', rooms.length === 1 ? 'The room' : 'The rooms')}</div>
      <div class="mt-8 grid gap-10 md:mt-10 md:gap-14">
        {#each rooms as room, n (room.id)}
          <article class="grid items-start gap-8 lg:grid-cols-12 lg:gap-14">
            {#if room.image}
              <div class={`aspect-[4/3] overflow-hidden bg-ink/5 lg:col-span-6 ${n % 2 ? 'lg:order-2' : ''}`}>
                <ResponsiveImage
                  src={room.image.image_url ?? ''}
                  alt={room.image.alt_text || room.image.caption || room.name}
                  sizes="(min-width:1024px) 50vw, 100vw"
                  width={1100}
                  imgClass="h-full w-full object-cover"
                />
              </div>
            {/if}
            <div class={room.image ? 'lg:col-span-6' : 'lg:col-span-12'}>
              {#if room.type}<p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-clay">{room.type}</p>{/if}
              <h3 class="mt-2 font-serif text-[30px] font-light leading-tight text-heading md:text-[36px]">{room.name}</h3>
              {#if room.description}<p class="mt-4 max-w-[62ch] text-[15px] leading-7 text-ink/70">{room.description}</p>{/if}
              {#if room.facts.length}
                <dl class="mt-8 divide-y divide-ink/10 border-y border-ink/10">
                  {#each room.facts as fact (fact.label)}
                    <div class="grid gap-1 py-3.5 sm:grid-cols-[130px_1fr] sm:gap-6">
                      <dt class="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/45 sm:pt-1">{fact.label}</dt>
                      <dd class="text-[14px] leading-6 text-ink/75">{fact.value}</dd>
                    </div>
                  {/each}
                </dl>
              {/if}
            </div>
          </article>
        {/each}
      </div>
    </div>
  </section>
{/if}

<!-- ── where it is & getting there ────────────────────────────────────────── -->
{#if hasWhere}
  <section id="location" class="scroll-mt-[calc(var(--nav-h,70px)+56px)] bg-linen/45 py-12 md:py-16">
    <div class="container-shell grid gap-10 lg:grid-cols-12 lg:gap-16" use:fadeUpOnScroll={{ y: 14 }}>
      <div class="lg:col-span-4">
        {@render heading('Location', 'Where it is and how you arrive')}
        {#if placeLine}
          <p class="mt-6 flex items-start gap-2 text-[15px] leading-7 text-ink/70"><MapPin size={16} class="mt-1 shrink-0 text-clay" />{placeLine}</p>
        {/if}
        <div class="mt-6 flex flex-col items-start gap-3">
          {#if mapHref}
            <!-- A link, never an iframe: no third-party map embed on this page. -->
            <a class="inline-flex items-center gap-2 border-b border-deep-green/30 pb-1 text-sm font-semibold text-deep-green transition hover:border-deep-green" href={mapHref} target="_blank" rel="noopener noreferrer">
              Open in Google Maps <ExternalLink size={14} />
            </a>
          {/if}
          {#if (l.website_url ?? '').trim()}
            <a class="inline-flex items-center gap-2 border-b border-deep-green/30 pb-1 text-sm font-semibold text-deep-green transition hover:border-deep-green" href={l.website_url} target="_blank" rel="noopener noreferrer">
              Official property website <ExternalLink size={14} />
            </a>
          {/if}
          {#if data.destinationLive && l.destinations?.slug}
            <a class="inline-flex items-center gap-2 border-b border-deep-green/30 pb-1 text-sm font-semibold text-deep-green transition hover:border-deep-green" href={`/destinations/${l.destinations.slug}`}>
              About {destinationName} <ArrowRight size={14} />
            </a>
          {/if}
        </div>
      </div>
      <div class="lg:col-span-8">
        {#if whereRows.length}{@render factList(whereRows)}{/if}
        {#if (l.arrival_instructions ?? '').trim()}
          <div class={whereRows.length ? 'mt-8' : ''}>
            <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-heading">Arriving</p>
            <p class="mt-3 max-w-[68ch] whitespace-pre-line text-[15px] leading-[1.8] text-ink/70">{l.arrival_instructions}</p>
          </div>
        {/if}
      </div>
    </div>
  </section>
{/if}

<!-- ── who it suits ────────────────────────────────────────────────────────── -->
{#if suitsRows.length}
  <section id="suits" class="scroll-mt-[calc(var(--nav-h,70px)+56px)] bg-canvas py-12 md:py-16">
    <div class="container-shell grid gap-10 lg:grid-cols-12 lg:gap-16" use:fadeUpOnScroll={{ y: 14 }}>
      <div class="lg:col-span-4">{@render heading('Who it suits', 'Is it right for you?')}</div>
      <div class="lg:col-span-8">{@render factList(suitsRows)}</div>
    </div>
  </section>
{/if}

<!-- ── good to know ────────────────────────────────────────────────────────── -->
{#if hasPractical}
  <section id="good-to-know" class={`scroll-mt-[calc(var(--nav-h,70px)+56px)] bg-canvas py-12 md:py-16 ${suitsRows.length ? 'border-t border-ink/10' : ''}`}>
    <div class="container-shell grid gap-10 lg:grid-cols-12 lg:gap-16" use:fadeUpOnScroll={{ y: 14 }}>
      <div class="lg:col-span-4">
        {@render heading('Good to know', 'The practical detail')}
        <p class="mt-6 max-w-[34ch] text-[15px] leading-7 text-ink/60">What we would tell you on the phone first, including the parts that are not flattering.</p>
      </div>
      <div class="lg:col-span-8">
        {#if practicalRows.length}{@render factList(practicalRows)}{/if}
        {#if (l.traveler_notes ?? '').trim()}
          <div class={practicalRows.length ? 'mt-8' : ''}>
            <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-heading">Before you go</p>
            <p class="mt-3 max-w-[68ch] whitespace-pre-line text-[15px] leading-[1.8] text-ink/70">{l.traveler_notes}</p>
          </div>
        {/if}
      </div>
    </div>
  </section>
{/if}

<!-- ── what is included ────────────────────────────────────────────────────── -->
{#if inclusions.length}
  <section id="included" class="scroll-mt-[calc(var(--nav-h,70px)+56px)] border-t border-ink/10 bg-canvas py-12 md:py-16">
    <div class="container-shell grid gap-10 lg:grid-cols-12 lg:gap-16" use:fadeUpOnScroll={{ y: 14 }}>
      <div class="lg:col-span-4">{@render heading('A night here', "What's included")}</div>
      <div class="grid gap-10 sm:grid-cols-2 lg:col-span-8">
        {#if included.length}
          <div>
            <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-heading">Included</p>
            <ul class="mt-5 divide-y divide-ink/10 border-t border-ink/10">
              {#each included as item, k (k)}
                <li class="flex gap-3 py-3 text-[15px] leading-6 text-ink/75"><Check class="mt-1 h-4 w-4 shrink-0 text-clay" strokeWidth={2.4} />{item}</li>
              {/each}
            </ul>
          </div>
        {/if}
        {#if excluded.length}
          <div>
            <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink/50">Not included</p>
            <ul class="mt-5 divide-y divide-ink/10 border-t border-ink/10">
              {#each excluded as item, k (k)}
                <li class="flex gap-3 py-3 text-[15px] leading-6 text-ink/55"><Minus class="mt-1 h-4 w-4 shrink-0 text-ink/30" strokeWidth={2.4} />{item}</li>
              {/each}
            </ul>
          </div>
        {/if}
      </div>
    </div>
  </section>
{/if}

<!-- ── rates (only when the property publishes them) ──────────────────────── -->
{#if rates.length}
  <section id="rates" class="scroll-mt-[calc(var(--nav-h,70px)+56px)] bg-linen/45 py-12 md:py-16">
    <div class="container-shell grid gap-10 lg:grid-cols-12 lg:gap-16" use:fadeUpOnScroll={{ y: 14 }}>
      <div class="lg:col-span-4">
        {@render heading('Rates', 'What a night costs')}
        <p class="mt-6 max-w-[34ch] text-[15px] leading-7 text-ink/60">Indicative rates. Check the dates, meal plan and pricing basis below; we confirm your final quote before booking.</p>
      </div>
      <div class="lg:col-span-8">
        <div class="divide-y divide-ink/10 border-y border-ink/10">
          {#each rates as rate, k (k)}
            <div class="grid gap-2 py-5 sm:grid-cols-[200px_1fr] sm:gap-8">
              <div>
                <p class="font-serif text-[20px] leading-snug text-heading">{rate.season}</p>
                {#if rate.dates}<p class="mt-1 text-[13px] text-ink/50">{rate.dates}</p>{/if}
              </div>
              <div>
                {#if rate.prices}<p class="text-[15px] leading-7 text-ink/80">{rate.prices}</p>{/if}
                {#if rate.terms}<p class="text-[13px] leading-6 text-ink/55">{rate.terms}</p>{/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </section>
{/if}

<!-- ── itineraries ──────────────────────────────────────────────────────────
     Always here, so "See safari itineraries" never leaves the page. Trips that
     sleep here (an itinerary day picked this property) come first; trips whose
     destination is this property's destination follow; otherwise an honest
     note and a way to have one built. -->
<section id="safari-itineraries" class="scroll-mt-[calc(var(--nav-h,70px)+56px)] bg-linen/45 py-12 md:py-16">
  <div class="container-shell" use:fadeUpOnScroll={{ y: 14 }}>
    <div class="max-w-3xl">
      {@render heading('Itineraries', stays.length ? `Safaris that stay at ${l.name}` : nearby.length ? `Safaris through ${destinationName || 'this area'}` : `Safaris with ${l.name}`)}
    </div>

    {#if stays.length}
      <p class="mt-5 max-w-[60ch] text-[15px] leading-7 text-ink/65">A night here is already built into these routes. Each one can still be reshaped around your dates.</p>
      <div class="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 18, stagger: 0.06 }}>
        {#each stays as tour (tour.id)}<TourCardRich {tour} ctaLabel="View itinerary" />{/each}
      </div>
    {/if}

    {#if nearby.length}
      {#if stays.length}
        <p class="mt-16 text-[11px] font-semibold uppercase tracking-[0.2em] text-heading">Also through {destinationName || 'this area'}</p>
      {:else}
        <p class="mt-5 max-w-[60ch] text-[15px] leading-7 text-ink/65">These routes explore {destinationName || 'the same area'}. Any of them can be shaped to include a night at {l.name}.</p>
      {/if}
      <div class={`grid gap-6 md:grid-cols-2 lg:grid-cols-3 ${stays.length ? 'mt-6' : 'mt-10'}`} use:staggeredCardReveal={{ y: 18, stagger: 0.06 }}>
        {#each nearby as tour (tour.id)}<TourCardRich {tour} ctaLabel="View itinerary" />{/each}
      </div>
    {/if}

    {#if !stays.length && !nearby.length}
      <div class="mt-10 flex flex-col gap-6 border-y border-goldfinch-gold/40 py-8 md:flex-row md:items-center md:justify-between md:gap-12">
        <div class="max-w-2xl">
          <p class="font-serif text-[24px] font-light leading-tight text-heading md:text-[28px]">No published itinerary includes this stay yet.</p>
          <p class="mt-2 text-[15px] leading-7 text-ink/65">We can build one around it: tell us your dates and who is travelling, and we will send a route with {l.name} in it.</p>
        </div>
        <a class="inline-flex h-12 shrink-0 items-center justify-center gap-2 bg-deep-green px-7 text-sm font-semibold text-white transition hover:bg-forest" href={planHref}>
          Plan a trip around this stay <ArrowRight size={16} />
        </a>
      </div>
    {/if}
  </div>
</section>

<!-- ── other stays ─────────────────────────────────────────────────────────── -->
{#if data.relatedLodges.length}
  <section class="bg-canvas py-12 md:py-16">
    <div class="container-shell" use:fadeUpOnScroll={{ y: 14 }}>
      <div class="flex flex-wrap items-end justify-between gap-6">
        <div class="max-w-3xl">{@render heading('More places to stay', `Other stays in ${destinationName || 'this area'}`)}</div>
        <a class="inline-flex items-center gap-2 border-b border-deep-green/30 pb-1 text-sm font-semibold text-deep-green transition hover:border-deep-green" href="/accommodation">
          All accommodation <ArrowRight size={14} />
        </a>
      </div>
      <div class="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 18, stagger: 0.06 }}>
        {#each data.relatedLodges as rl (rl.id)}<LodgeCard lodge={rl} />{/each}
      </div>
    </div>
  </section>
{/if}

<!-- ── closing band ────────────────────────────────────────────────────────── -->
<FinalCtaSection
  eyebrow="Plan it properly"
  title="Make this stay part of your journey."
  subtitle="Dates, budget, who is travelling. We will come back with a route that works — including when a different property would serve you better."
  primaryLabel="Plan My Safari"
  primaryHref={planHref}
  secondaryLabel="Browse all stays"
  secondaryHref="/accommodation"
/>

<style>
  .no-scrollbar {
    scrollbar-width: none;
  }
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
</style>
