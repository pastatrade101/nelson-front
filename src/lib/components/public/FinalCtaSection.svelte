<script lang="ts">
  // Full-bleed closing CTA band, lifted verbatim from the homepage so any page
  // (campaign / market landing pages included) can reuse the exact same
  // conversion markup. Driven by PLAIN props only — no CMS coupling: the call
  // site maps whatever record it has (homepage `sections.final_cta`, a landing
  // page's campaign copy, …) onto these strings.
  import { ArrowRight, Check, MessageCircle } from '@lucide/svelte';
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
  // Background media. Precedence: video > image > brand gradient.
  export let imageUrl = '';
  export let videoUrl = '';
  // Crop / focus (the admin "Crop / focus" control) applied as object-position.
  export let imagePosition = 'center';
  // Closing reassurance checklist (gold check circles).
  export let points: string[] = [];

  // Overlay — same knobs the homepage exposes through Admin → Homepage
  // (final_cta extra_data: overlay_color / overlay_opacity / overlay_gradient).
  export let overlayColor = '#1C1A16';
  export let overlayOpacity = 0.7;
  export let overlayGradient = true;

  const hexToRgba = (hex: string, alpha: number) => {
    const match = /^#?([0-9a-fA-F]{6})$/.exec(hex);
    if (!match) return `rgba(28,26,22,${alpha})`;
    const n = parseInt(match[1], 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
  };

  $: overlayStyle = overlayGradient
    ? `background:linear-gradient(135deg, ${hexToRgba(overlayColor, overlayOpacity)}, ${hexToRgba(overlayColor, overlayOpacity * 0.55)})`
    : `background:${hexToRgba(overlayColor, overlayOpacity)}`;

  $: hasPrimary = Boolean(primaryLabel && primaryHref);
  $: hasSecondary = Boolean(secondaryLabel && secondaryHref);
</script>

<section class="relative w-full overflow-hidden text-white" use:sectionReveal>
  <!-- background media layer (admin-configurable: video > image > brand gradient) -->
  {#if videoUrl}
    <!-- svelte-ignore a11y-media-has-caption -->
    <video class="absolute inset-0 h-full w-full object-cover" style={`object-position:${imagePosition}`} src={cdnUrl(videoUrl)} poster={cdnUrl(imageUrl)} autoplay muted loop playsinline></video>
  {:else if imageUrl}
    <ResponsiveImage src={imageUrl} imgClass="absolute inset-0 h-full w-full object-cover" imgStyle={`object-position:${imagePosition}`} sizes="100vw" width={1600} alt="" />
  {:else}
    <div class="absolute inset-0 bg-gradient-to-br from-deep-green via-forest to-deep-green"></div>
  {/if}

  <!-- green overlay so the photo shows through but the text stays crisp -->
  <div class="absolute inset-0" style={overlayStyle}></div>

  <!-- decorative depth -->
  <div class="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-goldfinch-gold/20 blur-3xl"></div>
  <div class="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-savanna/15 blur-3xl"></div>
  <div
    class="pointer-events-none absolute inset-0 opacity-[0.06]"
    style="background-image: radial-gradient(circle, #ffffff 1px, transparent 1.6px); background-size: 26px 26px;"
  ></div>

  <div class="container-shell relative py-16 text-center md:py-24" use:fadeUpOnScroll={{ y: 18 }}>
    <div class="mx-auto max-w-3xl">
      {#if eyebrow}
        <p class="brand-eyebrow">{eyebrow}</p>
      {/if}

      {#if title}
        <h2 class="mt-5 text-3xl font-normal leading-[1.12] tracking-normal md:text-[44px]">
          {title}
        </h2>
      {/if}

      {#if subtitle}
        <p class="mx-auto mt-4 max-w-xl text-[15px] font-medium leading-7 text-white/75 md:text-lg">
          {subtitle}
        </p>
      {/if}

      {#if hasPrimary || hasSecondary}
        <div class="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {#if hasPrimary}
            <a
              class="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-goldfinch-gold px-7 text-sm font-semibold text-goldfinch-gold transition hover:bg-goldfinch-gold hover:text-deep-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-deep-green sm:w-auto md:h-[52px] md:text-base"
              href={primaryHref}
            >
              {primaryLabel}
              <ArrowRight size={18} strokeWidth={2.6} class="transition-transform group-hover:translate-x-0.5" />
            </a>
          {/if}
          {#if hasSecondary}
            <a
              class="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/25 bg-surface/5 px-7 text-sm font-bold text-white backdrop-blur transition hover:bg-surface/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 sm:w-auto md:h-[52px] md:text-base"
              href={secondaryHref}
            >
              <MessageCircle size={17} strokeWidth={2.4} />
              {secondaryLabel}
            </a>
          {/if}
        </div>
      {/if}

      {#if points.length}
        <div class="mt-10 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-sm font-medium text-white/70">
          {#each points as point}
            <span class="inline-flex items-center gap-2">
              <span class="grid h-5 w-5 place-items-center rounded-full bg-goldfinch-gold/20 text-goldfinch-gold">
                <Check size={12} strokeWidth={3} />
              </span>
              {point}
            </span>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</section>
