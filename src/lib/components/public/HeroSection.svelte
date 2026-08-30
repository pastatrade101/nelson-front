<script lang="ts">
  import { fly } from 'svelte/transition';
  import { ArrowRight, BadgeCheck, ChevronDown } from '@lucide/svelte';
  import { revealHeading } from '$lib/animations';
  import { brand } from '$lib/brand';
  import ResponsiveImage from '$lib/components/public/ResponsiveImage.svelte';
  import { cdnUrl } from '$lib/img';

  export let title = 'Where the wild speaks, we know how to listen.';
  export let description = 'Private Tanzania safaris, Kilimanjaro climbs and Zanzibar extensions planned by local experts in Arusha.';
  export let eyebrow = 'Private Tanzania Safaris · Authentic Experience · Local Experts';

  // No stock/placeholder fallback. When the CMS provides no image (and no video),
  // the hero shows the dark brand background — never a random stock photo.
  export let imageUrl = '';
  // Optional background video (mp4/webm URL). When set it plays behind the hero
  // with the image as poster/fallback. Sourced from the hero section's
  // extra_data.background_video (Admin → Homepage → Background video URL).
  export let videoUrl = '';
  export let primaryCta = brand.primaryCta;
  export let primaryCtaUrl = '/plan-my-trip';
  export let secondaryCta = 'Explore Safaris & Prices';
  export let secondaryCtaUrl = '/tours';
  export let trustLine = 'Real itineraries · Clear durations and starting prices · Planned in Arusha';
  // Crop / focus — the admin "Crop / focus" control (extra_data.media_position),
  // applied as object-position so the chosen part of the image stays in frame.
  export let imagePosition = 'center';

  // Overlay — fully controlled from Admin → Homepage → Background & overlay
  // (hero section). There is NO hardcoded overlay: at opacity 0 the image shows
  // with full clarity. Text stays legible via a text-shadow, not a dark scrim.
  export let overlayColor = '#1C1A16';
  export let overlayOpacity = 0.3; // 0–1; 0 = no overlay
  export let overlayGradient = true;

  const hexToRgba = (hex: string, a: number): string => {
    const h = (hex || '').replace('#', '');
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const n = parseInt(full || '1c1a16', 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  };
  // Bottom-weighted so the (bottom-left) text keeps contrast while the rest of
  // the photo stays clear. Empty string → no overlay element at all.
  $: heroAlpha = Math.max(0, Math.min(1, Number(overlayOpacity) || 0));
  $: overlayStyle =
    heroAlpha <= 0
      ? ''
      : overlayGradient
        ? `background:linear-gradient(180deg, ${hexToRgba(overlayColor, heroAlpha * 0.22)} 0%, ${hexToRgba(overlayColor, heroAlpha * 0.1)} 40%, ${hexToRgba(overlayColor, heroAlpha)} 100%)`
        : `background:${hexToRgba(overlayColor, heroAlpha)}`;

  // Accept any real image reference the CMS/admin can produce — full URLs,
  // protocol- or root-relative paths, and data URIs — not just http(s). An
  // empty/blank value means "no image": the hero renders on the dark brand
  // background rather than any stock/placeholder photo. The video POSTER also
  // only ever uses this real image, so a stock image can't flash before a
  // client's video plays.
  $: providedImage =
    imageUrl && /^(https?:\/\/|\/\/|\/|data:)/i.test(imageUrl.trim()) ? imageUrl.trim() : '';
  $: posterImage = providedImage;

  // Background video can be either a direct, browser-playable file OR a
  // YouTube/Vimeo link. A raw <video> element can only play a file — pasting a
  // YouTube page URL into it renders nothing (NO_SOURCE) and used to hide the
  // hero image. So we split the two: files play in <video>, YouTube/Vimeo embed
  // in a background <iframe>, and the image always renders beneath as a fallback.
  $: rawVideo = (videoUrl ?? '').trim();
  $: fileVideo = /^(https?:\/\/|\/\/|\/).+\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(rawVideo) ? rawVideo : '';
  $: ytId = (rawVideo.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/) || [])[1] || '';
  $: vimeoId = (rawVideo.match(/vimeo\.com\/(?:video\/)?(\d+)/) || [])[1] || '';
  $: embedVideo = ytId
    ? `https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&controls=0&modestbranding=1&rel=0&playsinline=1&disablekb=1&fs=0&iv_load_policy=3`
    : vimeoId
      ? `https://player.vimeo.com/video/${vimeoId}?autoplay=1&muted=1&loop=1&background=1`
      : '';

  // Scroll roughly one viewport down when the "scroll" cue is tapped.
  const scrollDown = () => {
    if (typeof window !== 'undefined') window.scrollTo({ top: window.innerHeight - 64, behavior: 'smooth' });
  };
</script>

<section class="relative min-h-[100svh] overflow-hidden bg-deep-green text-white">
  <!-- Base layer: the image always renders (and is the fallback for any video). -->
  {#if providedImage}
    <ResponsiveImage
      src={providedImage}
      imgClass="absolute inset-0 h-full w-full object-cover"
      imgStyle={`object-position:${imagePosition}`}
      alt="Private Tanzania safari"
      sizes="100vw"
      width={1900}
      eager
      priority
    />
  {/if}
  <!-- A direct video file plays over the image. -->
  {#if fileVideo}
    <!-- svelte-ignore a11y-media-has-caption -->
    <video
      class="absolute inset-0 h-full w-full object-cover"
      style={`object-position:${imagePosition}`}
      src={cdnUrl(fileVideo)}
      poster={cdnUrl(posterImage) || undefined}
      autoplay
      muted
      loop
      playsinline
    ></video>
  {:else if embedVideo}
    <!-- A YouTube/Vimeo link embeds as a background iframe, scaled to cover. -->
    <div class="pointer-events-none absolute inset-0 overflow-hidden">
      <iframe
        class="hero-bg-video absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        src={embedVideo}
        title="Background video"
        frameborder="0"
        allow="autoplay; encrypted-media; picture-in-picture"
        tabindex="-1"
        aria-hidden="true"
      ></iframe>
    </div>
  {/if}
  <!-- Controllable overlay (Admin → Homepage → Background & overlay). At opacity
       0 nothing renders, so the hero image shows with full clarity. -->
  {#if overlayStyle}
    <div class="pointer-events-none absolute inset-0" style={overlayStyle}></div>
  {/if}

  <div class="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-[1500px] items-end px-5 pb-20 pt-28 md:px-8 md:pb-24 md:pt-36">
    <!-- text-shadow keeps copy legible on a bright, un-overlaid photo (buttons reset it) -->
    <div class="max-w-[620px] [text-shadow:0_2px_18px_rgba(0,0,0,0.45)]">
      <p class="brand-eyebrow" in:fly={{ y: 12, duration: 420 }}>{eyebrow}</p>
      {#key title}
        <h1 class="mt-6 max-w-[600px] text-[32px] font-light leading-[1.12] tracking-normal sm:text-[40px] lg:text-[50px] xl:text-[56px]" use:revealHeading={{ stagger: 0.018 }}>{title}</h1>
      {/key}
      <p class="mt-5 max-w-[520px] text-[15px] font-normal leading-7 text-white/90 md:text-[17px]" in:fly={{ y: 14, duration: 480, delay: 120 }}>{description}</p>

      <div class="mt-8 flex flex-col gap-4 [text-shadow:none] sm:flex-row sm:items-center">
        <a class="inline-flex h-12 items-center justify-center gap-3 bg-goldfinch-gold px-7 text-[13px] font-semibold tracking-[0.08em] text-deep-green transition hover:bg-savanna sm:min-w-[230px]" href={primaryCtaUrl}>
          {primaryCta} <ArrowRight size={17} strokeWidth={2.4} />
        </a>
        <a class="inline-flex h-12 items-center justify-center gap-3 border border-goldfinch-gold px-7 text-[13px] font-semibold tracking-[0.08em] text-white transition hover:bg-goldfinch-gold hover:text-deep-green sm:min-w-[250px]" href={secondaryCtaUrl}>
          {secondaryCta} <ArrowRight size={17} strokeWidth={2.4} />
        </a>
      </div>

      <div class="mt-10 flex max-w-[620px] items-start gap-2.5 text-[13px] leading-5 text-white/82">
        <BadgeCheck size={18} class="mt-px shrink-0 text-goldfinch-gold" strokeWidth={2.1} aria-hidden="true" />
        <span>{trustLine}</span>
      </div>
    </div>
  </div>

  <!-- scroll-down cue -->
  <button
    type="button"
    on:click={scrollDown}
    class="absolute bottom-6 right-5 z-10 flex flex-col items-center gap-1 text-white/70 transition hover:text-white md:right-8"
    aria-label="Scroll down"
  >
    <span class="text-[10px] font-semibold uppercase tracking-[0.2em]">Scroll</span>
    <ChevronDown size={22} strokeWidth={2.2} class="animate-bounce" />
  </button>
</section>

<style>
  /* Scale a 16:9 YouTube/Vimeo embed up so it fully covers the full-bleed hero
     (like object-fit: cover) regardless of the viewport's aspect ratio. */
  .hero-bg-video {
    width: 100vw;
    height: 56.25vw; /* 16:9 of the width */
    min-height: 100%;
    min-width: 177.78vh; /* 16:9 of the height */
    border: 0;
  }
</style>
