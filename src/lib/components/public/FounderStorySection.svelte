<script lang="ts">
  import { ArrowRight } from '@lucide/svelte';
  import { fadeUpOnScroll } from '$lib/animations';
  import { imgUrl } from '$lib/img';

  export let eyebrow = "The Founder's Story";
  export let title = 'Built in Tanzania.';
  export let accentTitle = 'For Those Who Want Africa Properly.';
  export let content =
    "Emnel Adventures started in Arusha in 2016 with a name, a story, and $200. The name carries weight: Emily, Nelson's daughter, and Nelson Kambo himself - two people, one vision, and one extraordinary country to share.\n\nNelson started Emnel with a belief that there was a better way to show Tanzania than through a reseller or fixed-package operator. He wanted guests to experience the country the way he knows it - from the inside, with someone who grew up in its shadow, reads its seasons, and understands that a great safari is built on specific knowledge, not generic itineraries.\n\nToday, Nelson and our team of certified Tanzanian guides handle every safari personally - from the first message through the last day in the field. That has not changed. It will not.";
  export let quote =
    '"We are a living tribute to what is possible when you refuse to accept the limitations others place on you. Every safari we run honours that."';
  export let imageUrl = 'https://images.unsplash.com/photo-1523805009345-7448845a9e53';
  export let imageCaption =
    'Nelson Kambo - founder and head guide, Emnel Adventures, Arusha.';
  export let primaryCta = 'Read the Full Story';
  export let primaryHref = '/about';
  export let secondaryCta = 'Speak to Nelson';
  export let secondaryHref = '/contact';

  $: paragraphs = content
    .replace(/\\n/g, '\n')
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
</script>

<section class="bg-deep-green py-16 text-white md:py-24" use:fadeUpOnScroll={{ y: 14 }}>
  <div class="container-shell grid gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:gap-16">
    <figure class="relative min-h-[520px] overflow-hidden border border-white/[0.08] bg-midnight md:min-h-[680px]">
      <img class="absolute inset-0 h-full w-full object-cover" src={imgUrl(imageUrl, 1000, 78)} alt="Emnel Adventures founder story" loading="lazy" />
      <span class="absolute inset-0 bg-[linear-gradient(180deg,rgba(28,26,22,0.03)_0%,rgba(28,26,22,0.16)_52%,rgba(28,26,22,0.86)_100%)]"></span>
      <figcaption class="absolute inset-x-0 bottom-0 border-l-4 border-goldfinch-gold px-7 py-8 font-serif text-xl italic leading-8 text-white/82">
        {imageCaption}
      </figcaption>
    </figure>

    <div class="max-w-[760px] self-center">
      <p class="brand-eyebrow">{eyebrow}</p>
      <h2 class="mt-6 font-serif text-[42px] font-light leading-[1.08] tracking-normal text-white sm:text-[56px] lg:text-[68px]">
        {title}
        <span class="block italic text-goldfinch-gold">{accentTitle}</span>
      </h2>

      <div class="mt-8 space-y-6 text-[15px] font-medium leading-8 text-white/66 md:text-base">
        {#each paragraphs as paragraph}
          <p>{paragraph}</p>
        {/each}
      </div>

      <blockquote class="mt-8 border-l-2 border-goldfinch-gold pl-6 font-serif text-[23px] italic leading-[1.5] text-goldfinch-gold md:text-[28px]">
        {quote}
      </blockquote>

      <div class="mt-10 flex flex-col gap-4 sm:flex-row">
        <a class="inline-flex h-[52px] items-center justify-center gap-3 bg-goldfinch-gold px-8 text-[12px] font-bold uppercase tracking-[0.18em] text-deep-green transition hover:bg-savanna" href={primaryHref}>
          {primaryCta}
          <ArrowRight size={16} strokeWidth={2.5} />
        </a>
        <a class="inline-flex h-[52px] items-center justify-center border border-white/22 px-8 text-[12px] font-bold uppercase tracking-[0.18em] text-white transition hover:border-goldfinch-gold hover:text-goldfinch-gold" href={secondaryHref}>
          {secondaryCta}
        </a>
      </div>
    </div>
  </div>
</section>
