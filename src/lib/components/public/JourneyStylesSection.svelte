<script lang="ts">
  // "Choose your journey": one card per published travel style, straight from
  // Admin › Travel Styles, so a new or renamed style appears here on its own.
  // The price is the lowest "from" price among the style's real itineraries
  // (see styleFromPrice); a style with none says so rather than inventing one.
  import { ArrowRight } from '@lucide/svelte';
  import { fadeUpOnScroll, staggeredCardReveal } from '$lib/animations';
  import { trackEvent } from '$lib/analytics';
  import { currency, formatUsd } from '$lib/currency';
  import { styleFromPrice } from '$lib/styleLinks';
  import ResponsiveImage from './ResponsiveImage.svelte';
  import type { Tour, TravelStyle } from '$lib/types';

  export let eyebrow = 'Travel Styles';
  export let title = 'Choose Your';
  export let accentTitle = 'Journey';
  export let subtitle = 'Start with the kind of trip you have in mind. Every journey is private and planned around your dates, pace and budget.';
  export let ctaLabel = 'Compare Travel Styles';
  export let ctaHref = '/travel-styles';
  export let styles: TravelStyle[] = [];
  /** Published tours, for each style's "from" price. */
  export let tours: Tour[] = [];
  /** Card images chosen in Admin › Homepage, by style slug; the style's own image otherwise. */
  export let cardImages: Record<string, string> = {};

  $: cards = styles
    .filter((style) => style.slug && style.name)
    .map((style) => ({
      slug: style.slug,
      name: style.name,
      line: style.emotional_promise?.trim() || '',
      image: cardImages[style.slug] || style.image_url || style.hero_image_url || '',
      from: styleFromPrice(style, tours)
    }));
</script>

{#if cards.length}
  <section class="bg-sand/40 py-16 md:py-24" use:fadeUpOnScroll={{ y: 12 }}>
    <div class="container-shell">
      <div class="flex flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-12">
        <div class="max-w-[720px]">
          <p class="brand-eyebrow">{eyebrow}</p>
          <h2 class="type-h2 mt-5 text-heading">
            {title}{#if accentTitle} <span class="italic text-emnel-gold">{accentTitle}</span>{/if}
          </h2>
          {#if subtitle}<p class="mt-5 text-base leading-[1.75] text-ink/70">{subtitle}</p>{/if}
        </div>
        <a class="inline-flex shrink-0 items-center gap-2 pb-1 text-[12px] font-bold uppercase tracking-[0.18em] text-emnel-gold transition hover:text-heading" href={ctaHref}>
          {ctaLabel} <ArrowRight size={15} strokeWidth={2.5} />
        </a>
      </div>

      <!-- A swipeable row on phones, a grid from tablet up. -->
      <ul
        class="hide-scroll -mx-5 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-1 md:mx-0 md:grid md:grid-cols-2 md:gap-5 md:overflow-visible md:px-0 lg:grid-cols-4"
        use:staggeredCardReveal={{ selector: '.journey-card', y: 16, stagger: 0.05 }}
      >
        {#each cards as card (card.slug)}
          <li class="journey-card w-[78%] max-w-[340px] shrink-0 snap-start md:w-auto md:max-w-none">
            <a
              class="group relative isolate flex aspect-[4/5] flex-col justify-end overflow-hidden bg-deep-green p-5 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emnel-gold focus-visible:ring-offset-2 lg:p-6"
              href={`/travel-styles/${card.slug}`}
              on:click={() => trackEvent('cta_click', { cta_name: `travel_style_${card.slug}`, cta_location: 'home_choose_journey' })}
            >
              {#if card.image}
                <ResponsiveImage
                  src={card.image}
                  alt=""
                  imgClass="absolute inset-0 -z-10 h-full w-full object-cover transition duration-[900ms] ease-out group-hover:scale-105"
                  sizes="(min-width:1024px) 25vw, (min-width:768px) 50vw, 78vw"
                  width={800}
                />
              {/if}
              <span class="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(28,26,22,0.05)_0%,rgba(28,26,22,0.35)_45%,rgba(28,26,22,0.92)_100%)]"></span>

              <h3 class="type-card text-white">{card.name}</h3>
              {#if card.line}<p class="mt-2 line-clamp-2 text-sm leading-[1.6] text-white/80">{card.line}</p>{/if}
              <div class="mt-4 flex items-center justify-between gap-3 border-t border-white/20 pt-4">
                <span class="text-[11px] font-bold uppercase tracking-[0.14em] text-emnel-gold">
                  {card.from ? `From ${formatUsd(card.from, $currency)} per person` : 'Price on request'}
                </span>
                <ArrowRight size={16} strokeWidth={2.4} class="shrink-0 text-white/80 transition group-hover:translate-x-1 group-hover:text-emnel-gold" />
              </div>
            </a>
          </li>
        {/each}
        <!-- Completes the grid with the way in for anyone still deciding. -->
        <li class="journey-card w-[78%] max-w-[340px] shrink-0 snap-start md:w-auto md:max-w-none">
          <a
            class="group flex aspect-[4/5] flex-col justify-between border border-ink/15 bg-surface p-5 transition hover:border-emnel-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emnel-gold lg:p-6"
            href="/plan-my-trip"
            on:click={() => trackEvent('cta_click', { cta_name: 'travel_style_unsure', cta_location: 'home_choose_journey' })}
          >
            <p class="eyebrow text-emnel-gold">Not sure yet?</p>
            <div>
              <h3 class="type-card text-heading">Tell us what you have in mind</h3>
              <p class="mt-2 text-sm leading-[1.6] text-ink/70">Share your dates, group and budget, and a local specialist will suggest the right journey.</p>
              <span class="mt-4 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-emnel-gold transition group-hover:text-heading">
                Plan My Safari <ArrowRight size={15} strokeWidth={2.5} class="transition group-hover:translate-x-1" />
              </span>
            </div>
          </a>
        </li>
      </ul>
    </div>
  </section>
{/if}
