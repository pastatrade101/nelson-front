<script lang="ts">
  import { fly } from 'svelte/transition';
  import { ArrowRight, Star } from '@lucide/svelte';
  import { revealHeading } from '$lib/animations';
  import { brand } from '$lib/brand';
  import { imgUrl } from '$lib/img';

  export let title = 'Where the wild speaks, we know how to listen.';
  export let description = 'Private Tanzania safaris, Kilimanjaro climbs and Zanzibar extensions planned by local experts in Arusha.';
  export let eyebrow = 'Private Tanzania Safaris · Authentic Experience · Local Experts';
  const DEFAULT_HERO_IMAGE = 'https://images.unsplash.com/photo-1516426122078-c23e76319801';

  export let imageUrl = DEFAULT_HERO_IMAGE;
  export let primaryCta = brand.primaryCta;
  export let primaryCtaUrl = '/plan-my-trip';
  export let secondaryCta = brand.secondaryCta;
  export let secondaryCtaUrl = '/contact';
  export let trustLine = 'TripAdvisor · TLTO Certified · Private vehicles only · Tanzania-born team · Dedicated safari specialist';
  // Crop / focus — the admin "Crop / focus" control (extra_data.media_position),
  // applied as object-position so the chosen part of the image stays in frame.
  export let imagePosition = 'center';

  // Accept any real image reference the CMS/admin can produce — full URLs,
  // protocol- or root-relative paths, and data URIs — not just http(s). Only an
  // empty/blank value falls back to the default hero.
  $: resolvedImage =
    imageUrl && /^(https?:\/\/|\/\/|\/|data:)/i.test(imageUrl.trim()) ? imageUrl.trim() : DEFAULT_HERO_IMAGE;
</script>

<section class="relative min-h-[calc(100svh-70px)] overflow-hidden bg-deep-green text-white md:min-h-[760px]">
  <img
    class="absolute inset-0 h-full w-full object-cover"
    style={`object-position:${imagePosition}`}
    src={imgUrl(resolvedImage, 1800)}
    alt="Private Tanzania safari"
    loading="eager"
    decoding="async"
    fetchpriority="high"
  />
  <div class="absolute inset-0 bg-[linear-gradient(90deg,rgba(28,26,22,0.90)_0%,rgba(28,26,22,0.78)_32%,rgba(28,26,22,0.42)_58%,rgba(28,26,22,0.16)_100%)]"></div>
  <div class="absolute inset-0 bg-[linear-gradient(180deg,rgba(28,26,22,0.60)_0%,rgba(28,26,22,0.12)_28%,rgba(28,26,22,0.66)_100%)]"></div>

  <div class="relative z-10 mx-auto flex min-h-[calc(100svh-70px)] w-full max-w-[1500px] items-center px-5 pb-20 pt-20 md:min-h-[760px] md:px-8 md:pb-24 md:pt-28">
    <div class="max-w-[760px]">
      <p class="brand-eyebrow" in:fly={{ y: 12, duration: 420 }}>{eyebrow}</p>
      {#key title}
        <h1 class="mt-7 max-w-[760px] text-[42px] font-light leading-[1.14] tracking-normal sm:text-[56px] lg:text-[74px]" use:revealHeading={{ stagger: 0.018 }}>{title}</h1>
      {/key}
      <p class="mt-6 max-w-[600px] text-[15px] font-normal leading-8 text-white/86 md:text-[18px]" in:fly={{ y: 14, duration: 480, delay: 120 }}>{description}</p>

      <div class="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center">
        <a class="inline-flex h-12 items-center justify-center gap-3 bg-goldfinch-gold px-7 text-[13px] font-semibold tracking-[0.08em] text-deep-green transition hover:bg-savanna sm:min-w-[230px]" href={primaryCtaUrl}>
          {primaryCta} <ArrowRight size={17} strokeWidth={2.4} />
        </a>
        <a class="inline-flex h-12 items-center justify-center gap-3 border border-goldfinch-gold px-7 text-[13px] font-semibold tracking-[0.08em] text-white transition hover:bg-goldfinch-gold hover:text-deep-green sm:min-w-[250px]" href={secondaryCtaUrl}>
          {secondaryCta} <ArrowRight size={17} strokeWidth={2.4} />
        </a>
      </div>

      <div class="mt-12 flex max-w-[780px] flex-wrap items-center gap-x-3 gap-y-2 text-sm text-white/82">
        <span class="inline-flex items-center gap-0.5 text-goldfinch-gold" aria-label="Five star rating">
          {#each Array(5) as _}
            <Star size={17} fill="currentColor" strokeWidth={1.7} />
          {/each}
        </span>
        <span>{trustLine}</span>
      </div>
    </div>
  </div>
</section>
