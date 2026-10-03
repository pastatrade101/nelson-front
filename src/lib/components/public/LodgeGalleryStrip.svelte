<script lang="ts">
  /**
   * A night's property on the itinerary: its gallery as one scrolling row, and
   * a property card that floats beside whichever photo is hovered or focused.
   *
   * The card is portalled to <body> and positioned with fixed coordinates, so
   * no overflow-hidden ancestor (the day accordion, the scrolling row itself)
   * can clip it. It opens only for a fine pointer; on touch the row simply
   * scrolls and each photo links to the property page.
   *
   * Every fact is shown only when the property actually has it — nothing is
   * inferred or filled in.
   */
  import { onDestroy } from 'svelte';
  import { cubicOut } from 'svelte/easing';
  import { fade } from 'svelte/transition';
  import { ArrowRight, BedDouble, Baby, Heart, MapPin, Plane, Star, Trees, Wifi, Car } from '@lucide/svelte';
  import ResponsiveImage from '$lib/components/public/ResponsiveImage.svelte';
  import { lodgeBestForLabel, lodgePlaceLine, lodgeRating, levelLabel, settingLabels, typeLabel, wifiLabel } from '$lib/lodge';
  import type { Lodge } from '$lib/types';

  type Img = { url: string; alt: string };

  /** The day's embedded property — a subset of a Lodge, with nulls for missing facts. */
  export let lodge: { name: string; slug?: string | null };
  export let images: Img[] = [];

  $: full = lodge as unknown as Lodge;
  $: href = lodge.slug ? `/accommodation/${lodge.slug}` : '';
  $: eyebrow = [full.accommodation_level ? levelLabel(full) : '', full.lodge_type ? typeLabel(full) : ''].filter(Boolean).join(' · ');
  $: place = lodgePlaceLine(full);
  $: rating = lodgeRating(full);
  $: bestFor = lodgeBestForLabel(full);
  $: price =
    full.show_rates_publicly && full.price_per_night_from != null
      ? `${full.currency ?? 'USD'} ${Math.round(full.price_per_night_from).toLocaleString()}`
      : '';

  type Feature = { icon: typeof Star; text: string };
  $: features = [
    full.children_allowed === false
      ? { icon: Heart, text: 'Adults only' }
      : full.minimum_child_age
        ? { icon: Baby, text: `Children ${full.minimum_child_age}+` }
        : full.family_friendly
          ? { icon: Baby, text: 'Family friendly' }
          : null,
    full.honeymoon_friendly ? { icon: Heart, text: 'Honeymoon friendly' } : null,
    ...settingLabels(full).slice(0, 2).map((t) => ({ icon: Trees, text: t })),
    full.wifi_availability && wifiLabel(full) ? { icon: Wifi, text: `Wi-Fi: ${wifiLabel(full)}` } : null,
    full.fly_in_available ? { icon: Plane, text: 'Fly-in access' } : null,
    full.transfer_available ? { icon: Car, text: 'Transfers available' } : null,
    full.recommended_nights ? { icon: BedDouble, text: `Stay ${full.recommended_nights}+ nights` } : null
  ].filter(Boolean).slice(0, 6) as Feature[];

  // ── hover card ──────────────────────────────────────────────────────────
  const CARD_W = 340;
  let open = false;
  let active: Img | null = null;
  let pos = { left: 0, top: null as number | null, bottom: null as number | null };
  let hideTimer: ReturnType<typeof setTimeout> | undefined;

  const portal = (node: HTMLElement) => {
    document.body.appendChild(node);
    return { destroy: () => node.remove() };
  };

  const canHover = () => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const show = (event: Event, img: Img) => {
    if (event.type === 'mouseenter' && !canHover()) return;
    clearTimeout(hideTimer);
    const r = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const left = Math.min(Math.max(r.left + r.width / 2 - CARD_W / 2, 12), window.innerWidth - CARD_W - 12);
    // Open on whichever side has more room.
    pos = r.top > window.innerHeight - r.bottom
      ? { left, top: null, bottom: window.innerHeight - r.top + 10 }
      : { left, top: r.bottom + 10, bottom: null };
    active = img;
    open = true;
  };
  const hide = (delay = 140) => {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => (open = false), delay);
  };
  const keep = () => clearTimeout(hideTimer);
  const closeNow = () => {
    clearTimeout(hideTimer);
    open = false;
  };

  onDestroy(() => clearTimeout(hideTimer));

  // ── motion ──────────────────────────────────────────────────────────────
  const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  $: below = pos.top != null;

  /** Grows out of the edge nearest the photo, rising (or dropping) toward it. */
  const pop = (_node: Element, { dir = 1 }: { dir?: number }) =>
    reduced()
      ? { duration: 120, css: (t: number) => `opacity:${t}` }
      : {
          duration: 280,
          easing: cubicOut,
          css: (t: number, u: number) =>
            `opacity:${t};transform:translateY(${u * 10 * dir}px) scale(${0.94 + 0.06 * t});`
        };
</script>

<svelte:window on:scroll|passive={closeNow} on:resize={closeNow} on:keydown={(e) => e.key === 'Escape' && closeNow()} />

<figure class="mt-5">
  <figcaption class="flex flex-wrap items-baseline justify-between gap-3">
    <span class="text-[11px] uppercase tracking-[0.2em] text-clay">{lodge.name}</span>
    {#if href}
      <a class="text-[12.5px] font-medium text-deep-green transition hover:underline" {href}>About this property</a>
    {/if}
  </figcaption>

  <!-- One row: scrolls sideways when the gallery is longer than the column. -->
  <div class="strip -mx-1 mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1">
    {#each images as img (img.url)}
      <a
        href={href || undefined}
        class="group relative block h-24 shrink-0 snap-start overflow-hidden bg-ink/5 outline-none ring-goldfinch-gold ring-offset-2 focus-visible:ring-2 sm:h-28"
        style="aspect-ratio: 4 / 3"
        aria-label={`${img.alt} — ${lodge.name}`}
        on:mouseenter={(e) => show(e, img)}
        on:mouseleave={() => hide()}
        on:focus={(e) => show(e, img)}
        on:blur={() => hide(0)}
      >
        <ResponsiveImage
          src={img.url}
          alt={img.alt}
          width={360}
          sizes="160px"
          imgClass="h-full w-full object-cover transition duration-500 group-hover:scale-[1.06]"
        />
      </a>
    {/each}
  </div>
</figure>

{#if open && active}
  <div
    use:portal
    role="tooltip"
    class="lodge-pop fixed z-[80] overflow-hidden bg-surface text-left shadow-[0_24px_70px_rgba(28,26,22,0.28)] ring-1 ring-ink/10"
    style={`width:${CARD_W}px;left:${pos.left}px;${below ? `top:${pos.top}px` : `bottom:${pos.bottom}px`};transform-origin:${below ? 'top' : 'bottom'} center`}
    in:pop={{ dir: below ? -1 : 1 }}
    out:fade={{ duration: 140 }}
    on:mouseenter={keep}
    on:mouseleave={() => hide()}
  >
    <div class="relative h-36 overflow-hidden bg-deep-green">
      <!-- Cross-fades (with a slow settle) as the pointer moves between photos. -->
      {#key active.url}
        <div class="banner absolute inset-0" in:fade={{ duration: 260 }} out:fade={{ duration: 260 }}>
          <ResponsiveImage src={active.url} alt="" width={720} sizes={`${CARD_W}px`} imgClass="h-full w-full object-cover" />
        </div>
      {/key}
      <span class="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/10 to-transparent"></span>
      {#if rating}
        <span class="absolute right-3 top-3 inline-flex items-center gap-1 bg-surface/95 px-2 py-1 text-[11px] font-bold text-heading">
          <Star size={11} class="fill-goldfinch-gold text-goldfinch-gold" /> {rating.toFixed(1)}<span class="font-medium text-ink/45">/10</span>
        </span>
      {/if}
      <div class="rise absolute inset-x-4 bottom-3" style="--d:60ms">
        {#if eyebrow}<p class="text-[10px] font-bold uppercase tracking-[0.18em] text-goldfinch-gold">{eyebrow}</p>{/if}
        <p class="mt-1 font-serif text-[22px] leading-tight text-white">{lodge.name}</p>
      </div>
    </div>

    <div class="rise p-4" style="--d:120ms">
      {#if place}
        <p class="flex items-center gap-1.5 text-[12px] text-ink/60"><MapPin size={13} class="shrink-0 text-clay" />{place}</p>
      {/if}
      {#if bestFor}
        <p class="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-clay">{bestFor}</p>
      {/if}
      {#if full.short_description}
        <p class="mt-2 line-clamp-3 text-[13px] leading-[1.6] text-ink/70">{full.short_description}</p>
      {/if}

      {#if features.length}
        <ul class="rise mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-ink/10 pt-3" style="--d:200ms">
          {#each features as f}
            {@const FI = f.icon}
            <li class="flex min-w-0 items-start gap-1.5 text-[12px] leading-snug text-ink/75">
              <FI size={13} class="mt-px shrink-0 text-deep-green" />
              <span>{f.text}</span>
            </li>
          {/each}
        </ul>
      {/if}

      <div class="mt-4 flex items-end justify-between gap-3 border-t border-ink/10 pt-3">
        {#if price}
          <p class="leading-tight">
            <span class="block text-[10px] uppercase tracking-[0.14em] text-ink/45">From</span>
            <span class="font-serif text-[20px] text-heading">{price}</span><span class="text-[11px] text-ink/50"> / night</span>
          </p>
        {:else}
          <span></span>
        {/if}
        {#if href}
          <a class="inline-flex items-center gap-1 text-[12px] font-bold uppercase tracking-[0.12em] text-deep-green hover:text-clay" {href}>
            View property <ArrowRight size={13} />
          </a>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .strip {
    scrollbar-width: none;
  }
  .strip::-webkit-scrollbar {
    display: none;
  }
  /* Glide to the next photo instead of jumping. */
  .lodge-pop {
    transition:
      left 300ms cubic-bezier(0.22, 1, 0.36, 1),
      top 300ms cubic-bezier(0.22, 1, 0.36, 1),
      bottom 300ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  .banner :global(img) {
    animation: settle 900ms cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  .rise {
    animation: rise 420ms cubic-bezier(0.22, 1, 0.36, 1) both;
    animation-delay: var(--d, 0ms);
  }
  @keyframes settle {
    from {
      transform: scale(1.08);
    }
  }
  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .lodge-pop,
    .banner :global(img),
    .rise {
      transition: none;
      animation: none;
    }
  }
</style>
