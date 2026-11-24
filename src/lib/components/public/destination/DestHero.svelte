<script lang="ts">
  /**
   * The top of a destination page: name, the short description and the two
   * ways to start (plan, or chat on WhatsApp) beside the photograph, then a
   * strip of the facts people ask first. Every fact comes from the
   * destination's own data and is left out when it isn't there.
   */
  import ResponsiveImage from '../ResponsiveImage.svelte';
  import WhatsAppCta from '../WhatsAppCta.svelte';
  import { origUrl, thumbUrl } from '$lib/img';
  import { publicSettings, settingText } from '$lib/settings';
  import type { Destination } from '$lib/types';

  export let destination: Destination;
  /** The place as headings name it without an article ("Serengeti"). */
  export let adjName = '';
  export let facts: { label: string; value: string }[] = [];
  export let planHref = '#plan';

  $: hasPhoto = Boolean(destination.banner_image_url || destination.main_image_url || destination.image_url);
  $: countryHub = destination.country ? `/${destination.country.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-safaris` : '';
  $: placeLine = [destination.region, destination.country].filter(Boolean).join(' · ');
  $: trustLine = settingText($publicSettings, 'trust_line');
</script>

<section class="bg-deep-green text-white">
  <div class="container-shell grid gap-0 lg:grid-cols-2 lg:gap-12 lg:py-14">
    <div class="order-2 py-10 lg:order-1 lg:py-4">
      <nav aria-label="Breadcrumb" class="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-white/75">
        <a class="underline decoration-white/30 underline-offset-2 transition hover:text-white" href="/destinations">Destinations</a>
        {#if destination.country}
          <span aria-hidden="true">›</span>
          <a class="underline decoration-white/30 underline-offset-2 transition hover:text-white" href={countryHub}>{destination.country}</a>
        {/if}
        <span aria-hidden="true">›</span>
        <span class="text-white" aria-current="page">{destination.name}</span>
      </nav>
      {#if placeLine}<p class="dest-label-dark mt-5">{placeLine}</p>{/if}
      <h1 class="type-h1 mt-3 max-w-[15ch]">{destination.name}</h1>
      {#if destination.short_description}
        <p class="mt-5 max-w-[46ch] text-[17px] leading-[1.65] text-white/85">{destination.short_description}</p>
      {/if}
      <div class="mt-8 hidden flex-wrap gap-3 sm:flex">
        <a class="inline-flex h-12 items-center bg-emnel-gold px-6 text-[15px] font-semibold text-deep-green transition hover:bg-savanna" href={planHref}>
          Plan my {adjName} safari
        </a>
        <WhatsAppCta
          variant="ghost"
          context="destination_hero"
          message={`Hello Emnel, I would like help planning a ${destination.name} safari.`}
          className="inline-flex h-12 items-center border border-white/30 px-6 text-[15px] font-semibold text-white transition hover:bg-white/10"
          label="Chat on WhatsApp"
        >Chat on WhatsApp</WhatsAppCta>
      </div>
      {#if trustLine}<p class="mt-6 max-w-[52ch] text-[13px] leading-[1.6] text-white/65">{trustLine}</p>{/if}
    </div>

    <div class="relative order-1 -mx-6 aspect-[4/3] overflow-hidden bg-white/5 sm:mx-0 lg:order-2 lg:aspect-auto lg:min-h-[360px]">
      {#if hasPhoto}
        <ResponsiveImage
          src={origUrl(destination, 'banner_image_url', 'main_image_url', 'image_url')}
          fallbackSrc={thumbUrl(destination, 'banner_image_url', 'main_image_url', 'image_url')}
          alt={destination.name}
          imgClass="absolute inset-0 h-full w-full object-cover"
          sizes="(min-width: 1024px) 50vw, 100vw"
          width={1400}
          eager
          priority
        />
      {/if}
    </div>
  </div>

  {#if facts.length}
    <div class="border-t border-white/10 bg-white/[0.04]">
      <dl class={`container-shell grid grid-cols-2 gap-x-5 pb-6 pt-1 lg:gap-8 lg:py-6 ${facts.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}>
        {#each facts as fact, i (fact.label)}
          <div class={`py-4 lg:border-0 lg:py-0 ${i >= 2 ? 'border-t border-white/10' : ''}`}>
            <dt class="dest-label-dark">{fact.label}</dt>
            <dd class="mt-1.5 text-[15px] leading-[1.5] text-white">{fact.value}</dd>
          </div>
        {/each}
      </dl>
    </div>
  {/if}
</section>
