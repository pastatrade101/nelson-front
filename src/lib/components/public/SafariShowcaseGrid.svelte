<script lang="ts">
  import { ArrowRight, CalendarDays, MapPin } from '@lucide/svelte';
  import { fadeUpOnScroll, staggeredCardReveal } from '$lib/animations';
  import { imgUrl } from '$lib/img';
  import type { Tour } from '$lib/types';

  type ShowcaseCard = {
    eyebrow: string;
    title: string;
    description: string;
    href: string;
    image: string;
    meta: string;
    price?: string;
    tags: string[];
  };

  export let eyebrow = "Tanzania's Greatest Safari Parks";
  export let title = 'The Best Safari Destinations';
  export let accentTitle = 'in Tanzania';
  export let content =
    'From the endless Serengeti plains to the crater floor of Ngorongoro, the elephant woodlands of Tarangire, and the Indian Ocean coast of Zanzibar - Tanzania holds more extraordinary wildlife experiences within a single country than anywhere else on Earth.';
  export let ctaLabel = 'View Safari Itineraries';
  export let ctaHref = '/tours';
  export let tours: Tour[] = [];

  const fallbackCards: ShowcaseCard[] = [
    {
      eyebrow: 'Northern Tanzania',
      title: 'Serengeti Migration Safari',
      description:
        "The world's most celebrated safari landscape, built around predator country, open plains, and seasonal migration timing.",
      href: '/tours',
      image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801',
      meta: '5-8 days',
      price: 'Private safari',
      tags: ['Great Migration', 'Big cats', 'Classic safari']
    },
    {
      eyebrow: 'Northern Tanzania',
      title: 'Ngorongoro Crater Safari',
      description:
        'A dense wildlife amphitheatre with exceptional Big Five viewing, crater-floor scenery, and a compact safari rhythm.',
      href: '/destinations/tanzania',
      image: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e',
      meta: '1-2 days',
      price: 'Big Five focus',
      tags: ['Black rhino', 'Crater floor']
    },
    {
      eyebrow: 'Northern Tanzania',
      title: 'Tarangire Elephant Route',
      description:
        'Baobab woodlands, large elephant herds, and quieter drives for travelers who want a slower private safari.',
      href: '/destinations/tanzania',
      image: 'https://images.unsplash.com/photo-1523805009345-7448845a9e53',
      meta: '2-3 days',
      price: 'Dry season',
      tags: ['Elephants', 'Baobabs']
    },
    {
      eyebrow: 'Kilimanjaro Region',
      title: 'Kilimanjaro Confidence Climb',
      description:
        'Route guidance, preparation support, and mountain crew coordination for a carefully paced Tanzania climb.',
      href: '/tours/kilimanjaro-confidence-climb',
      image: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5',
      meta: '6 days',
      price: 'From USD 2,150',
      tags: ['Mountain crew', 'Route advice']
    },
    {
      eyebrow: 'Indian Ocean',
      title: 'Zanzibar Safari Extension',
      description:
        'Stone Town, spice farms, reef-fringed beaches, and warm water after a private northern Tanzania safari.',
      href: '/tours',
      image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e',
      meta: '3-5 days',
      price: 'Beach finish',
      tags: ['Beach', 'Culture']
    },
    {
      eyebrow: 'Southern Tanzania',
      title: 'Nyerere and Ruaha Wild South',
      description:
        'Remote game drives, walking possibilities, river landscapes, and a more expedition-style safari pace.',
      href: '/destinations/tanzania',
      image: 'https://images.unsplash.com/photo-1549366021-9f761d450615',
      meta: '6-9 days',
      price: 'Remote route',
      tags: ['Wild south', 'Private guide']
    }
  ];

  const imageFallbacks = fallbackCards.map((card) => card.image);

  const money = (tour: Tour) => {
    if (!tour.price_from) return undefined;
    return `From ${tour.currency ?? 'USD'} ${tour.price_from.toLocaleString()}`;
  };

  const toCard = (tour: Tour, index: number): ShowcaseCard => {
    const destination = tour.destinations?.name ?? tour.tour_categories?.name ?? tour.experience_type ?? 'Private safari';
    const duration = tour.duration_days ? `${tour.duration_days} day${tour.duration_days === 1 ? '' : 's'}` : 'Tailor-made';
    const tags = [
      tour.experience_type,
      tour.budget_tier,
      ...(tour.highlights ?? [])
    ]
      .filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
      .slice(0, 3);

    return {
      eyebrow: destination,
      title: tour.title,
      description: tour.short_description || tour.full_description || 'A private Tanzania itinerary shaped around your dates, pace, and travel style.',
      href: `/tours/${tour.slug}`,
      image: tour.main_image_url || tour.banner_image_url || imageFallbacks[index % imageFallbacks.length],
      meta: duration,
      price: money(tour),
      tags: tags.length ? tags : ['Private safari', 'Local planning']
    };
  };

  $: tourCards = tours.map(toCard).filter((card) => card.title && card.href);
  $: cards = [...tourCards, ...fallbackCards].slice(0, 6);

  const layout = [
    'lg:col-span-2 lg:row-span-2',
    'lg:col-span-2',
    '',
    '',
    'lg:col-span-2',
    'lg:col-span-2'
  ];

  const isCompact = (index: number) => index === 2 || index === 3;
</script>

<section class="bg-canvas text-ink" use:fadeUpOnScroll={{ y: 12 }}>
  <div class="container-shell py-16 md:py-24">
    <div class="mb-10 flex flex-col gap-8 md:mb-12 md:flex-row md:items-end md:justify-between md:gap-12">
      <div class="max-w-[720px]">
        <p class="brand-eyebrow">{eyebrow}</p>
        <h2 class="mt-5 font-serif text-[36px] font-light leading-[1.08] tracking-normal text-heading sm:text-[48px] lg:text-[56px]">
          {title} <span class="italic text-goldfinch-gold">{accentTitle}</span>
        </h2>
        <p class="mt-6 text-[15px] font-medium leading-8 text-ink/70 md:text-base">{content}</p>
      </div>
      <a class="inline-flex shrink-0 items-center gap-2 pb-1 text-[12px] font-bold uppercase tracking-[0.18em] text-goldfinch-gold transition hover:text-heading" href={ctaHref}>
        {ctaLabel}
        <ArrowRight size={15} strokeWidth={2.5} />
      </a>
    </div>

    <div
      class="grid gap-px overflow-hidden border border-ink/10 bg-ink/10 md:grid-cols-2 lg:auto-rows-[320px] lg:grid-cols-4 xl:auto-rows-[340px]"
      use:staggeredCardReveal={{ selector: '.showcase-card', y: 18, stagger: 0.05 }}
    >
      {#each cards as card, i}
        <a
          class={`showcase-card group relative isolate min-h-[360px] overflow-hidden bg-midnight md:min-h-[320px] lg:min-h-0 ${layout[i] ?? ''}`}
          href={card.href}
          aria-label={`View ${card.title}`}
        >
          <img
            class="absolute inset-0 h-full w-full object-cover transition duration-[900ms] ease-out group-hover:scale-105"
            src={imgUrl(card.image, i === 0 ? 1500 : 900, 78)}
            alt={card.title}
            loading={i < 2 ? 'eager' : 'lazy'}
          />
          <span class="absolute inset-0 bg-[linear-gradient(180deg,rgba(28,26,22,0.38)_0%,rgba(28,26,22,0.62)_44%,rgba(28,26,22,0.95)_100%)]"></span>
          <span class="absolute inset-0 bg-[linear-gradient(90deg,rgba(28,26,22,0.66)_0%,rgba(28,26,22,0.18)_60%,rgba(28,26,22,0.30)_100%)]"></span>

          <div class={`relative z-10 flex h-full min-h-[inherit] flex-col justify-end p-5 sm:p-6 ${isCompact(i) ? 'lg:p-5 xl:p-6' : 'lg:p-7'}`}>
            <div class="mb-auto flex flex-wrap gap-2">
              <span class="inline-flex items-center gap-1.5 bg-deep-green/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur xl:text-[11px]">
                <MapPin size={12} strokeWidth={2.4} class="text-goldfinch-gold" /> {card.eyebrow}
              </span>
              <span class="inline-flex items-center gap-1.5 bg-goldfinch-gold/18 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-goldfinch-gold backdrop-blur xl:text-[11px]">
                <CalendarDays size={12} strokeWidth={2.4} /> {card.meta}
              </span>
            </div>

            <div>
              <h3
                class={`font-serif font-light leading-[1.05] tracking-normal text-white ${
                  i === 0 ? 'text-[38px] sm:text-[48px] lg:text-[58px]' : isCompact(i) ? 'text-[24px] sm:text-[27px]' : 'text-[27px] sm:text-[31px]'
                }`}
              >
                {card.title}
              </h3>
              {#if !isCompact(i)}
                <p class={`mt-3 max-w-[900px] font-medium leading-7 text-white/85 ${i === 0 ? 'line-clamp-3 text-[15px] md:text-base' : 'line-clamp-2 text-[14px]'}`}>
                  {card.description}
                </p>
              {/if}

              <div class={`${isCompact(i) ? 'mt-3' : 'mt-4'} flex flex-wrap items-center gap-2`}>
                {#each card.tags.slice(0, isCompact(i) ? 2 : 3) as tag}
                  <span class="border border-goldfinch-gold/40 bg-goldfinch-gold/10 px-2.5 py-1 text-[11px] font-semibold text-goldfinch-gold">
                    {tag}
                  </span>
                {/each}
              </div>

              <div class={`${isCompact(i) ? 'mt-4' : 'mt-5'} flex flex-wrap items-center justify-between gap-3`}>
                {#if card.price}
                  <span class="text-[11px] font-bold uppercase tracking-[0.14em] text-white/85 xl:text-[12px]">{card.price}</span>
                {/if}
                <span class="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-goldfinch-gold transition group-hover:text-white xl:text-[12px]">
                  View itinerary
                  <ArrowRight size={15} strokeWidth={2.5} class="transition group-hover:translate-x-1" />
                </span>
              </div>
            </div>
          </div>
        </a>
      {/each}
    </div>
  </div>
</section>
