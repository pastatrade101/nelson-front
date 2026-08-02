<script lang="ts">
  import { fly } from 'svelte/transition';
  import { ArrowRight, ChevronDown, Star } from '@lucide/svelte';
  import { revealHeading } from '$lib/animations';
  import { brand } from '$lib/brand';
  import { imgUrl } from '$lib/img';

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
  export let secondaryCta = brand.secondaryCta;
  export let secondaryCtaUrl = '/contact';
  export let trustLine = 'TripAdvisor · TLTO Certified · Private vehicles only · Tanzania-born team · Dedicated safari specialist';
  // Crop / focus — the admin "Crop / focus" control (extra_data.media_position),
  // applied as object-position so the chosen part of the image stays in frame.
  export let imagePosition = 'center';

  // Accept any real image reference the CMS/admin can produce — full URLs,
  // protocol- or root-relative paths, and data URIs — not just http(s). An
  // empty/blank value means "no image": the hero renders on the dark brand
  // background rather than any stock/placeholder photo. The video POSTER also
  // only ever uses this real image, so a stock image can't flash before a
  // client's video plays.
  $: providedImage =
    imageUrl && /^(https?:\/\/|\/\/|\/|data:)/i.test(imageUrl.trim()) ? imageUrl.trim() : '';
  $: resolvedVideo =
    videoUrl && /^(https?:\/\/|\/\/|\/)/i.test(videoUrl.trim()) ? videoUrl.trim() : '';
  $: posterImage = providedImage ? imgUrl(providedImage, 1800) : '';

  // Scroll roughly one viewport down when the "scroll" cue is tapped.
  const scrollDown = () => {
    if (typeof window !== 'undefined') window.scrollTo({ top: window.innerHeight - 64, behavior: 'smooth' });
  };
</script>

<section class="relative min-h-[100svh] overflow-hidden bg-deep-green text-white">
  {#if resolvedVideo}
    <!-- svelte-ignore a11y-media-has-caption -->
    <video
      class="absolute inset-0 h-full w-full object-cover"
      style={`object-position:${imagePosition}`}
      src={resolvedVideo}
      poster={posterImage || undefined}
      autoplay
      muted
      loop
      playsinline
    ></video>
  {:else if providedImage}
    <img
      class="absolute inset-0 h-full w-full object-cover"
      style={`object-position:${imagePosition}`}
      src={imgUrl(providedImage, 1800)}
      alt="Private Tanzania safari"
      loading="eager"
      decoding="async"
      fetchpriority="high"
    />
  {/if}
  <div class="absolute inset-0 bg-[linear-gradient(90deg,rgba(28,26,22,0.90)_0%,rgba(28,26,22,0.78)_32%,rgba(28,26,22,0.42)_58%,rgba(28,26,22,0.16)_100%)]"></div>
  <div class="absolute inset-0 bg-[linear-gradient(180deg,rgba(28,26,22,0.60)_0%,rgba(28,26,22,0.12)_28%,rgba(28,26,22,0.66)_100%)]"></div>

  <div class="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-[1500px] items-end px-5 pb-20 pt-28 md:px-8 md:pb-24 md:pt-36">
    <div class="max-w-[620px]">
      <p class="brand-eyebrow" in:fly={{ y: 12, duration: 420 }}>{eyebrow}</p>
      {#key title}
        <h1 class="mt-6 max-w-[600px] text-[32px] font-light leading-[1.12] tracking-normal sm:text-[40px] lg:text-[50px] xl:text-[56px]" use:revealHeading={{ stagger: 0.018 }}>{title}</h1>
      {/key}
      <p class="mt-5 max-w-[520px] text-[15px] font-normal leading-7 text-white/86 md:text-[17px]" in:fly={{ y: 14, duration: 480, delay: 120 }}>{description}</p>

      <div class="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
        <a class="inline-flex h-12 items-center justify-center gap-3 bg-goldfinch-gold px-7 text-[13px] font-semibold tracking-[0.08em] text-deep-green transition hover:bg-savanna sm:min-w-[230px]" href={primaryCtaUrl}>
          {primaryCta} <ArrowRight size={17} strokeWidth={2.4} />
        </a>
        <a class="inline-flex h-12 items-center justify-center gap-3 border border-goldfinch-gold px-7 text-[13px] font-semibold tracking-[0.08em] text-white transition hover:bg-goldfinch-gold hover:text-deep-green sm:min-w-[250px]" href={secondaryCtaUrl}>
          {secondaryCta} <ArrowRight size={17} strokeWidth={2.4} />
        </a>
      </div>

      <div class="mt-10 flex max-w-[620px] flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-white/82">
        <span class="inline-flex items-center gap-0.5 text-goldfinch-gold" aria-label="Five star rating">
          {#each Array(5) as _}
            <Star size={17} fill="currentColor" strokeWidth={1.7} />
          {/each}
        </span>
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
