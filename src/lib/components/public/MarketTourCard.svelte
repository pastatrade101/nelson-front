<script lang="ts">
  // ---------------------------------------------------------------------------
  // MarketTourCard — the rich tour card used by the market landing pages
  // (/safaris/[slug]). Mirrors the client's mockup layout, but EVERY value comes
  // from the real Tour record — or from an override an admin typed for this card
  // on this page: nothing is invented. Each block is guarded, so a sparsely-filled
  // tour simply renders a shorter card rather than a placeholder.
  //
  // Deliberately NOT rendered (no real field behind them in the mockup): the park
  // list, seasons, airline routing, hotel names and testimonials.
  // ---------------------------------------------------------------------------
  import { ArrowRight, Clock } from '@lucide/svelte';
  import { origUrl, thumbUrl } from '$lib/img';
  import { currency, formatUsd } from '$lib/currency';
  import { tierLabel } from '$lib/tiers';
  import { trackEvent } from '$lib/analytics';
  import type { AnalyticsEventName } from '$lib/analytics';
  import ResponsiveImage from '$lib/components/public/ResponsiveImage.svelte';
  import type { Tour } from '$lib/types';

  export let tour: Tour;
  export let index = 0;
  export let flagship = false;
  /** Real per-person prices an admin typed, keyed by party size ('2'…'7'). */
  export let paxPricing: Record<string, number> | null = null;
  export let ctaLabel = 'View This Journey';
  export let ctaHref = '';
  export let className = '';

  // ── per-package overrides ──────────────────────────────────────────────────
  // Real values an admin typed for THIS tour on THIS market page. Each one wins
  // over exactly one piece of the tour's own data and changes nothing else.
  // Blank ALWAYS means "fall back, or render nothing" — never a placeholder.
  /** Replaces the `tour_categories.name` kicker. */
  export let kicker = '';
  /** Replaces the `start_location → end_location` route line. */
  export let routeStops: string[] = [];
  /** Replace the `duration_days` / `duration_nights` row; either may stand alone. */
  export let safariNights: number | null = null;
  export let zanzibarNights: number | null = null;
  /** Replaces the `persona_tags`-derived "Best for" strip. */
  export let bestFor = '';
  /** Replaces the tour's own card image. */
  export let imageUrl = '';

  const clean = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
  // An override counts as "set" only for a real, positive night count — 0 and
  // NaN mean the admin left it blank, so the fallback stands.
  const nightCount = (value: number | null) =>
    typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;

  // ── media ──────────────────────────────────────────────────────────────────
  // The override is fed through the same origUrl/thumbUrl pair as the tour's own
  // image, so the R2 CDN + AVIF variant pipeline still applies to it.
  $: imageOverride = clean(imageUrl);
  $: imageSrc = imageOverride
    ? origUrl({ image_url: imageOverride }, 'image_url')
    : origUrl(tour, 'main_image_url', 'banner_image_url');
  $: imageFallback = imageOverride
    ? thumbUrl({ image_url: imageOverride }, 'image_url')
    : thumbUrl(tour, 'main_image_url', 'banner_image_url');

  // ── header bits ────────────────────────────────────────────────────────────
  $: indexLabel = String(index + 1).padStart(2, '0');
  $: categoryLabel = tour.tour_categories?.name ?? '';
  $: kickerLabel = clean(kicker) || categoryLabel;
  // `is_featured` / `is_popular` are real admin flags — the signature badge only
  // ever appears when one of them is actually set.
  $: showSignature = flagship && Boolean(tour.is_featured || tour.is_popular);
  $: hasRoute = Boolean(tour.start_location && tour.end_location);

  // ── route — override stops, else the stored endpoints, else nothing ────────
  $: overrideStops = (routeStops ?? []).map(clean).filter(Boolean);
  $: routeLine = overrideStops.length
    ? overrideStops
    : hasRoute
      ? [tour.start_location, tour.end_location].map(clean).filter(Boolean)
      : [];

  // ── "Best for" — persona_tags, humanised for display only ──────────────────
  const humanise = (value: string) => String(value ?? '').replace(/[_-]+/g, ' ').trim();
  $: personas = (tour.persona_tags ?? []).map(humanise).filter(Boolean);
  // A written line is shown verbatim; only the humanised tags get `capitalize`.
  $: bestForOverride = clean(bestFor);
  $: bestForLabel = bestForOverride || personas.join(' · ');

  // ── duration / comfort ─────────────────────────────────────────────────────
  $: durationParts = [
    tour.duration_days ? `${tour.duration_days} ${tour.duration_days === 1 ? 'Day' : 'Days'}` : '',
    tour.duration_nights ? `${tour.duration_nights} ${tour.duration_nights === 1 ? 'Night' : 'Nights'}` : ''
  ].filter(Boolean);
  $: comfortLabel = tierLabel(tour.budget_tier);

  // A split-nights override replaces the Duration row — only the legs the admin
  // actually filled in appear; with neither set the stored duration stands.
  $: safariNightsValue = nightCount(safariNights);
  $: zanzibarNightsValue = nightCount(zanzibarNights);
  $: nightsParts = [
    safariNightsValue != null
      ? `Safari · ${safariNightsValue} ${safariNightsValue === 1 ? 'night' : 'nights'}`
      : '',
    zanzibarNightsValue != null
      ? `Zanzibar · ${zanzibarNightsValue} ${zanzibarNightsValue === 1 ? 'night' : 'nights'}`
      : ''
  ].filter(Boolean);

  // ── pricing ────────────────────────────────────────────────────────────────
  // formatUsd returns '' when the amount is missing or unconvertible — in that
  // case we say "Price on request" rather than showing a number we can't stand behind.
  $: priceLabel = tour.price_from != null ? formatUsd(tour.price_from, $currency) : '';

  // ── pax selector — only when an admin actually entered per-party prices ─────
  $: paxOptions = paxPricing
    ? Object.entries(paxPricing)
        .filter(([key, value]) => Number(key) > 0 && typeof value === 'number' && Number.isFinite(value) && value > 0)
        .map(([key]) => key)
        .sort((a, b) => Number(a) - Number(b))
    : [];

  // 'pricing_interaction' is not in $lib/analytics' AnalyticsEventName union, and
  // this card does not own that file — widening through `string` keeps the call
  // type-checking whether or not the name is added there later.
  const PRICING_EVENT = 'pricing_interaction' as string as AnalyticsEventName;

  let selectedPax = '';
  $: if (paxOptions.length && !paxOptions.includes(selectedPax)) selectedPax = paxOptions[0] ?? '';
  $: if (!paxOptions.length && selectedPax !== '') selectedPax = '';

  $: paxUnit = selectedPax && paxPricing ? (paxPricing[selectedPax] ?? null) : null;
  $: paxUnitLabel = paxUnit != null ? formatUsd(paxUnit, $currency) : '';
  $: paxTotalLabel = paxUnit != null && selectedPax ? formatUsd(paxUnit * Number(selectedPax), $currency) : '';

  const onPaxChange = (event: Event) => {
    const value = (event.currentTarget as HTMLSelectElement).value;
    const pax = Number(value);
    if (!Number.isFinite(pax)) return;
    trackEvent(PRICING_EVENT, { tour_id: tour.id, metadata: { pax } });
  };

  // ── CTA ────────────────────────────────────────────────────────────────────
  $: href = ctaHref || `/tours/${tour.slug}`;
  const onCardClick = () => trackEvent('tour_card_click', { tour_id: tour.id, tour_title: tour.title });
</script>

<article
  class={`group relative flex h-full flex-col overflow-hidden rounded-none bg-surface transition-shadow duration-300 ${
    flagship
      ? 'border-2 border-goldfinch-gold shadow-[0_28px_70px_rgba(28,26,22,0.20)]'
      : 'border border-ink/10 shadow-soft hover:shadow-[0_26px_60px_rgba(28,26,22,0.14)]'
  } ${className}`}
>
  <!-- media -->
  <a {href} on:click={onCardClick} class="relative block aspect-[4/3] overflow-hidden bg-deep-green">
    {#if imageSrc}
      <ResponsiveImage
        src={imageSrc}
        fallbackSrc={imageFallback}
        alt={tour.title}
        width={800}
        sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
        imgClass="h-full w-full object-cover transition-transform duration-[800ms] ease-out group-hover:scale-105"
      />
      <span class="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(15,26,24,0)_50%,rgba(13,22,20,0.62)_100%)]"></span>
    {:else}
      <span class="absolute inset-0 bg-[linear-gradient(135deg,rgb(var(--c-deep-green)),rgb(var(--c-forest)))]"></span>
    {/if}

    <!-- badges -->
    <span class="absolute left-3 top-3 flex flex-col items-start gap-1.5">
      {#if tour.duration_days}
        <span class="inline-flex items-center gap-1.5 rounded-none bg-surface/90 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-heading shadow backdrop-blur">
          <Clock size={12} strokeWidth={2.6} /> {tour.duration_days} Days
        </span>
      {/if}
      {#if showSignature}
        <span class="rounded-none bg-goldfinch-gold px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-deep-green shadow">
          Signature Journey
        </span>
      {/if}
    </span>
  </a>

  <!-- body -->
  <div class="flex flex-1 flex-col p-5">
    <!-- kicker -->
    <div class="flex items-baseline gap-3">
      <span class="font-serif text-[24px] font-light leading-none text-goldfinch-gold">{indexLabel}</span>
      {#if kickerLabel}
        <span class="text-[11px] font-semibold uppercase tracking-[0.16em] text-clay">{kickerLabel}</span>
      {/if}
    </div>

    <h3 class="mt-2 font-serif text-[22px] font-light leading-snug text-heading">
      <a {href} on:click={onCardClick} class="transition-colors hover:text-forest">{tour.title}</a>
    </h3>

    {#if tour.short_description}
      <p class="mt-2 line-clamp-2 text-[14px] leading-6 text-ink/70">{tour.short_description}</p>
    {/if}

    <!-- route — the override stops, else BOTH stored endpoints, else nothing -->
    {#if routeLine.length}
      <p class="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/60">
        {#each routeLine as stop, stopIndex (`${stopIndex}-${stop}`)}
          {#if stopIndex > 0}
            <span class="h-px w-6 shrink-0 bg-goldfinch-gold" aria-hidden="true"></span>
          {/if}
          <span>{stop}</span>
        {/each}
      </p>
    {/if}

    <!-- best for — the written override, else derived from persona_tags -->
    {#if bestForLabel}
      <div class="mt-4 border-l-2 border-goldfinch-gold bg-savanna/55 px-3 py-2">
        <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-clay">Best for</p>
        <p
          class={`mt-0.5 text-[13px] font-semibold leading-5 text-ink/75 ${bestForOverride ? '' : 'capitalize'}`}
        >{bestForLabel}</p>
      </div>
    {/if}

    <!-- duration + comfort -->
    {#if nightsParts.length || durationParts.length || comfortLabel}
      <dl class="mt-4 space-y-1.5 border-t border-ink/[0.08] pt-3 text-[12px]">
        {#if nightsParts.length}
          <div class="flex items-baseline justify-between gap-3">
            <dt class="font-semibold uppercase tracking-[0.12em] text-ink/50">Nights</dt>
            <dd class="text-right font-semibold text-heading">
              {#each nightsParts as part (part)}
                <span class="block">{part}</span>
              {/each}
            </dd>
          </div>
        {:else if durationParts.length}
          <div class="flex items-baseline justify-between gap-3">
            <dt class="font-semibold uppercase tracking-[0.12em] text-ink/50">Duration</dt>
            <dd class="font-semibold text-heading">{durationParts.join(' · ')}</dd>
          </div>
        {/if}
        {#if comfortLabel}
          <div class="flex items-baseline justify-between gap-3">
            <dt class="font-semibold uppercase tracking-[0.12em] text-ink/50">Comfort</dt>
            <dd class="font-semibold text-heading">{comfortLabel}</dd>
          </div>
        {/if}
      </dl>
    {/if}

    <!-- pricing — mt-auto keeps the footers of a row of cards aligned -->
    <div class="-mx-5 -mb-5 mt-auto pt-5">
      <div class="border-t border-ink/10 bg-savanna/45 p-4">
        {#if priceLabel}
          <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-ink/50">From</p>
          <p class="mt-0.5 font-serif text-[28px] font-light leading-none text-heading">{priceLabel}</p>
          <p class="mt-1 text-[11px] font-medium text-ink/55">per person</p>
        {:else}
          <p class="font-serif text-[22px] font-light leading-none text-heading">Price on request</p>
        {/if}

        <!-- pax selector — rendered ONLY when real per-party prices exist -->
        {#if paxOptions.length}
          <div class="mt-4 border-t border-ink/10 pt-3">
            <label class="block">
              <span class="text-[10px] font-bold uppercase tracking-[0.18em] text-ink/50">Travellers</span>
              <select
                bind:value={selectedPax}
                on:change={onPaxChange}
                class="mt-1.5 w-full rounded-none border border-ink/15 bg-surface px-3 py-2 text-[13px] font-semibold text-heading focus:border-goldfinch-gold focus:outline-none"
              >
                {#each paxOptions as key (key)}
                  <option value={key}>{key} {Number(key) === 1 ? 'traveller' : 'travellers'}</option>
                {/each}
              </select>
            </label>

            {#if paxUnitLabel}
              <div class="mt-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span class="text-[13px] text-ink/70">
                  <span class="font-bold text-heading">{paxUnitLabel}</span> per person
                </span>
                {#if paxTotalLabel}
                  <span class="text-[13px] text-ink/70">
                    Total <span class="font-bold text-heading">{paxTotalLabel}</span>
                  </span>
                {/if}
              </div>
            {/if}
          </div>
        {/if}

        <a
          {href}
          on:click={onCardClick}
          class="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-none bg-forest px-5 py-3 text-[12px] font-bold uppercase tracking-[0.14em] text-white transition hover:bg-deep-green"
        >
          {ctaLabel}
          <ArrowRight size={15} strokeWidth={2.6} class="transition-transform duration-300 group-hover:translate-x-0.5" />
        </a>
      </div>
    </div>
  </div>
</article>
