<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowRight, BadgeCheck, ChevronDown, Star } from '@lucide/svelte';
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
  /** Published guest reviews, summarised; the score line shows only when there are some. */
  export let reviewScore: { average: number; count: number } | null = null;
  export let reviewsHref = '#guest-reviews';

  // Overlay — controlled from Admin → Homepage → Background & overlay (hero
  // section); at opacity 0 none is drawn. Legibility does not depend on it: a
  // fixed scrim sits behind the menu and the text block only (see markup), so the
  // headline, buttons and menu read at full contrast from the first frame over
  // any photo or video, and the rest of the image stays clear.
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
  // The embed is added after hydration (it is decoration, not content) so the
  // player can be told this page's origin and report its progress.
  let origin = '';
  $: embedVideo = !origin
    ? ''
    : ytId
      ? `https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&controls=0&modestbranding=1&rel=0&playsinline=1&disablekb=1&fs=0&iv_load_policy=3&cc_load_policy=0&enablejsapi=1&origin=${encodeURIComponent(origin)}`
      : vimeoId
        ? `https://player.vimeo.com/video/${vimeoId}?autoplay=1&muted=1&loop=1&background=1`
        : '';

  // YouTube draws its own title bar, a pause button and "More videos" over the
  // first seconds of playback, whatever the embed parameters say — that was the
  // haze over the headline and menu — and again whenever playback stops and
  // restarts (buffering, a pause, the loop). The player is only visible after it
  // has played that long without a break; until then the poster image shows.
  const YT_CHROME_SECONDS = 3.5;
  let videoFrame: HTMLIFrameElement;
  let videoShown = false;
  let revealTimer: ReturnType<typeof setTimeout> | undefined;
  let heard = false;
  /** Video time at which the current uninterrupted run of playback began. */
  let playingFrom: number | null = null;
  const onVideoLoad = () => {
    if (!ytId) { videoShown = true; return; }
    // Ask the player to report its state (the protocol its own IFrame API uses),
    // and to say when it loads a module — captions arrive that way, sometimes
    // well after playback starts and again when the video loops.
    videoFrame?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), 'https://www.youtube.com');
    playerCommand('addEventListener', ['onApiChange']);
    playerCommand('addEventListener', ['onStateChange']);
    // A player that never reports (scripts blocked) is shown once its chrome has surely gone.
    revealTimer = setTimeout(() => { if (!heard) videoShown = true; }, 9000);
  };
  // It also shows the video's captions over the hero ("as the sun rises in
  // Tanzania you…"); a background video has no use for them.
  const playerCommand = (func: string, args: unknown[] = []) =>
    videoFrame?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args, id: 1, channel: 'widget' }), 'https://www.youtube.com');
  const hideCaptions = () => {
    playerCommand('unloadModule', ['captions']);
    playerCommand('unloadModule', ['cc']);
  };
  let lastCaptionCheck = -Infinity;
  const onPlayerMessage = (event: MessageEvent) => {
    if (event.origin !== 'https://www.youtube.com' || typeof event.data !== 'string') return;
    try {
      const message = JSON.parse(event.data) as { event?: string; info?: unknown };
      heard = true;
      // A module (re)loaded: if it was the captions, take them straight off.
      if (message.event === 'onApiChange') { hideCaptions(); return; }
      // Anything but playing (paused, buffering, ended for the loop) brings the
      // chrome back: fade to the poster until a fresh run has played past it.
      if (message.event === 'onStateChange') {
        if (message.info !== 1) { videoShown = false; playingFrom = null; }
        return;
      }
      if (message.event !== 'infoDelivery') return;
      const time = Number((message.info as { currentTime?: number } | null)?.currentTime);
      if (!Number.isFinite(time)) return;
      // Safety net in case a load event is missed: re-check every couple of seconds of playback.
      if (time > 0 && Math.abs(time - lastCaptionCheck) >= 2) { lastCaptionCheck = time; hideCaptions(); }
      // A jump backwards is the loop starting over.
      if (playingFrom === null || time < playingFrom) playingFrom = time;
      if (!videoShown && time - playingFrom >= YT_CHROME_SECONDS) videoShown = true;
    } catch { /* not the player's message */ }
  };
  onMount(() => {
    origin = window.location.origin;
    window.addEventListener('message', onPlayerMessage);
    return () => { window.removeEventListener('message', onPlayerMessage); clearTimeout(revealTimer); };
  });

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
    <!-- A YouTube/Vimeo link embeds as a background iframe, scaled to cover — and
         a quarter larger again, so the bands where YouTube can still flash its
         title bar (top) and "More videos" (bottom) fall outside the hero. -->
    <div class={`pointer-events-none absolute inset-0 overflow-hidden transition-opacity duration-1000 ${videoShown ? 'opacity-100' : 'opacity-0'}`}>
      <iframe
        bind:this={videoFrame}
        on:load={onVideoLoad}
        class="hero-bg-video absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 scale-125"
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
  <!-- Fixed legibility scrims: behind the menu, and behind the text block
       (bottom, weighted left where the copy sits). Not CMS-controlled on purpose. -->
  <div class="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/50 to-transparent"></div>
  <div class="pointer-events-none absolute inset-0 bg-[linear-gradient(0deg,rgba(0,0,0,0.66)_0%,rgba(0,0,0,0.48)_45%,rgba(0,0,0,0.3)_62%,rgba(0,0,0,0)_85%)] md:bg-[linear-gradient(0deg,rgba(0,0,0,0.5)_0%,rgba(0,0,0,0.2)_45%,rgba(0,0,0,0)_75%),linear-gradient(90deg,rgba(0,0,0,0.42)_0%,rgba(0,0,0,0.16)_45%,rgba(0,0,0,0)_68%)]"></div>

  <div class="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-[1500px] items-end px-5 pb-20 pt-28 md:px-8 md:pb-24 md:pt-36">
    <!-- text-shadow keeps copy crisp on a bright photo (buttons reset it) -->
    <div class="max-w-[620px] [text-shadow:0_2px_18px_rgba(0,0,0,0.45)]">
      <p class="brand-eyebrow">{eyebrow}</p>
      <h1 class="type-h1 mt-6 max-w-[600px]">{title}</h1>
      <p class="type-lead mt-5 max-w-[520px] text-white/90">{description}</p>

      <div class="mt-8 flex flex-col gap-4 [text-shadow:none] sm:flex-row sm:items-center">
        <a class="inline-flex h-12 items-center justify-center gap-3 bg-goldfinch-gold px-7 text-[13px] font-semibold tracking-[0.08em] text-deep-green transition hover:bg-savanna sm:min-w-[230px]" href={primaryCtaUrl}>
          {primaryCta} <ArrowRight size={17} strokeWidth={2.4} />
        </a>
        <a class="inline-flex h-12 items-center justify-center gap-3 border border-goldfinch-gold px-7 text-[13px] font-semibold tracking-[0.08em] text-white transition hover:bg-goldfinch-gold hover:text-deep-green sm:min-w-[250px]" href={secondaryCtaUrl}>
          {secondaryCta} <ArrowRight size={17} strokeWidth={2.4} />
        </a>
      </div>

      {#if reviewScore && reviewScore.count > 0}
        <a class="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-white transition hover:text-goldfinch-gold" href={reviewsHref}>
          <Star size={16} fill="currentColor" strokeWidth={0} class="text-goldfinch-gold" aria-hidden="true" />
          {reviewScore.average.toFixed(1)}/5 from {reviewScore.count} guest review{reviewScore.count === 1 ? '' : 's'}
        </a>
      {/if}

      <div class="mt-10 flex max-w-[620px] items-start gap-2.5 text-sm leading-[1.6] text-white/82">
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
  }</style>
