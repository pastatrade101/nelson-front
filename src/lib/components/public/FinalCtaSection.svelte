<script lang="ts">
  // The site's one call-to-action band. Every page that asks the visitor to
  // start planning uses this, so they all read the same: left-aligned copy over
  // a real trip photograph, darkened only behind the text so the image stays
  // visible on the right. Driven by PLAIN props only — no CMS coupling: the call
  // site maps whatever record it has onto these strings.
  import { ArrowRight, Check, MessageCircle } from '@lucide/svelte';
  import { page } from '$app/stores';
  import { fadeUpOnScroll, sectionReveal } from '$lib/animations';
  import ResponsiveImage from '$lib/components/public/ResponsiveImage.svelte';
  import { cdnUrl } from '$lib/img';

  export let eyebrow = '';
  export let title = '';
  export let subtitle = '';
  export let primaryLabel = '';
  export let primaryHref = '';
  export let secondaryLabel = '';
  export let secondaryHref = '';
  // Background media. Precedence: video > explicit image > a featured tour photo > brand gradient.
  export let imageUrl = '';
  export let videoUrl = '';
  // Crop / focus (the admin "Crop / focus" control) applied as object-position.
  export let imagePosition = 'center';
  // Closing reassurance points (gold checks).
  export let points: string[] = [];
  /** Varies which featured-tour photo is used when one page has two bands. */
  export let seed = '';

  // Overlay — the knobs the homepage exposes through Admin → Homepage
  // (final_cta extra_data). Applied as a left-to-right fade so the copy side is
  // dark enough to read and the photo side stays bright.
  export let overlayColor = '#1C1A16';
  export let overlayOpacity = 0.7;
  export let overlayGradient = true;

  const hexToRgba = (hex: string, alpha: number) => {
    const match = /^#?([0-9a-fA-F]{6})$/.exec(hex);
    const a = Math.max(0, Math.min(1, alpha));
    if (!match) return `rgba(28,26,22,${a})`;
    const n = parseInt(match[1], 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  };

  /** Same page → same photo on server and client; different pages → different photos. */
  const pick = (list: string[], key: string) => {
    if (!list.length) return '';
    let h = 0;
    for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return list[h % list.length];
  };

  $: tourPhotos = (($page.data as { ctaImages?: string[] })?.ctaImages ?? []).filter(Boolean);
  $: bgImage = imageUrl || pick(tourPhotos, `${$page.url.pathname}|${seed}`);

  $: overlayStyle = overlayGradient
    ? `background:linear-gradient(90deg, ${hexToRgba(overlayColor, overlayOpacity + 0.2)} 0%, ${hexToRgba(overlayColor, overlayOpacity * 0.95)} 48%, ${hexToRgba(overlayColor, overlayOpacity * 0.15)} 100%)`
    : `background:${hexToRgba(overlayColor, overlayOpacity)}`;

  $: hasPrimary = Boolean(primaryLabel && primaryHref);
  $: hasSecondary = Boolean(secondaryLabel && secondaryHref);
</script>

<section class="relative isolate w-full overflow-hidden bg-deep-green text-white" use:sectionReveal>
  {#if videoUrl}
    <!-- svelte-ignore a11y-media-has-caption -->
    <video class="absolute inset-0 -z-10 h-full w-full object-cover" style={`object-position:${imagePosition}`} src={cdnUrl(videoUrl)} poster={cdnUrl(bgImage)} autoplay muted loop playsinline></video>
  {:else if bgImage}
    <ResponsiveImage src={bgImage} imgClass="absolute inset-0 -z-10 h-full w-full object-cover" imgStyle={`object-position:${imagePosition}`} sizes="100vw" width={1920} alt="" />
  {:else}
    <div class="absolute inset-0 -z-10 bg-gradient-to-br from-deep-green via-forest to-deep-green"></div>
  {/if}

  {#if videoUrl || bgImage}
    <div class="absolute inset-0 -z-10" style={overlayStyle}></div>
    <!-- a little weight at the foot, so the points row reads over any photo -->
    <div class="absolute inset-x-0 bottom-0 -z-10 h-1/3 bg-gradient-to-t from-black/35 to-transparent"></div>
  {/if}

  <div class="container-shell py-20 md:py-28 lg:py-32" use:fadeUpOnScroll={{ y: 18 }}>
    <div class="max-w-2xl">
      {#if eyebrow}
        <p class="text-[11px] font-bold uppercase tracking-[0.24em] text-goldfinch-gold">{eyebrow}</p>
      {/if}

      {#if title}
        <h2 class={`font-serif text-[34px] font-light leading-[1.08] md:text-[50px] ${eyebrow ? 'mt-5' : ''}`}>
          {title}
        </h2>
      {/if}

      {#if subtitle}
        <p class="mt-5 max-w-xl text-[16px] leading-8 text-white/80">
          {subtitle}
        </p>
      {/if}

      {#if hasPrimary || hasSecondary || $$slots.default}
        <div class="mt-9 flex flex-col gap-3 sm:flex-row">
          <!-- Extra actions that aren't plain links (e.g. a button that opens a dialog). -->
          <slot />
          {#if hasPrimary}
            <a
              class="group inline-flex h-12 w-full items-center justify-center gap-2 bg-goldfinch-gold px-8 text-sm font-semibold text-deep-green transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-deep-green sm:w-auto"
              href={primaryHref}
            >
              {primaryLabel}
              <ArrowRight size={16} class="transition-transform group-hover:translate-x-0.5" />
            </a>
          {/if}
          {#if hasSecondary}
            <a
              class="inline-flex h-12 w-full items-center justify-center gap-2 border border-white/35 px-8 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 sm:w-auto"
              href={secondaryHref}
            >
              {#if /whatsapp|wa\.me/i.test(secondaryHref)}<MessageCircle size={16} />{/if}
              {secondaryLabel}
            </a>
          {/if}
        </div>
      {/if}
    </div>

    {#if points.length}
      <ul class="mt-12 flex max-w-3xl flex-wrap gap-x-7 gap-y-3 border-t border-white/20 pt-6">
        {#each points as point}
          <li class="inline-flex items-center gap-2 text-[13px] font-medium text-white/80">
            <Check size={14} strokeWidth={2.6} class="text-goldfinch-gold" />
            {point}
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</section>
