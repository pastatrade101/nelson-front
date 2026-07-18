<script lang="ts">
  import { ArrowRight, Sparkle } from '@lucide/svelte';
  import { fadeUpOnScroll, staggeredCardReveal } from '$lib/animations';

  type Metric = {
    value: string;
    label: string;
    description: string;
  };

  type Park = {
    title: string;
    description: string;
    href?: string;
  };

  export let eyebrow = "Tanzania's Greatest Safari Parks";
  export let title = 'The Best Safari Destinations';
  export let accentTitle = 'in Tanzania';
  export let content =
    'From the endless Serengeti plains to the crater floor of Ngorongoro, the elephant woodlands of Tarangire, and the Indian Ocean coast of Zanzibar - Tanzania holds more extraordinary wildlife experiences within a single country than anywhere else on Earth.';
  export let quote = '"One country. Endless safari worlds - each one shaped around your season, pace, and reason for travel."';
  export let closing =
    'We design private routes across northern Tanzania, southern Tanzania, and the coast so every park has a reason to be in your itinerary.';
  export let ctaLabel = 'Explore Destinations';
  export let ctaHref = '/destinations';
  export let stats: unknown[] | undefined = undefined;
  export let parks: unknown[] | undefined = undefined;

  const fallbackStats: Metric[] = [
    { value: '4', label: 'Signature regions', description: 'Serengeti, Ngorongoro, Tarangire, and Zanzibar' },
    { value: '1', label: 'Safari country', description: 'Wildlife, mountains, culture, and coast in one route' },
    { value: '12', label: 'Travel months', description: 'Season-led planning for every time of year' },
    { value: '100%', label: 'Private routes', description: 'Built around your pace, dates, and priorities' }
  ];

  const fallbackParks: Park[] = [
    {
      title: 'Serengeti National Park',
      description: 'Endless plains, predator country, and the Great Migration. Best for classic big-game safaris and wide open wilderness.',
      href: '/destinations/tanzania'
    },
    {
      title: 'Ngorongoro Crater',
      description: 'A wildlife-rich volcanic caldera with exceptional Big Five viewing in a compact, scenic safari day.',
      href: '/destinations/tanzania'
    },
    {
      title: 'Tarangire National Park',
      description: 'Baobab woodlands, ancient elephant herds, and quieter game drives with a slower private rhythm.',
      href: '/destinations/tanzania'
    },
    {
      title: 'Zanzibar Coast',
      description: 'Indian Ocean beaches, Stone Town, spice farms, and warm water after a northern Tanzania safari.',
      href: '/destinations/tanzania'
    }
  ];

  const metricFrom = (item: unknown): Metric | null => {
    if (!item || typeof item !== 'object') return null;
    const source = item as Record<string, unknown>;
    if (typeof source.value !== 'string' || typeof source.label !== 'string' || typeof source.description !== 'string') return null;
    return { value: source.value, label: source.label, description: source.description };
  };

  const parkFrom = (item: unknown): Park | null => {
    if (!item || typeof item !== 'object') return null;
    const source = item as Record<string, unknown>;
    if (typeof source.title !== 'string' || typeof source.description !== 'string') return null;
    return { title: source.title, description: source.description, href: typeof source.href === 'string' ? source.href : undefined };
  };

  $: displayStats = (stats ?? []).map(metricFrom).filter(Boolean) as Metric[];
  $: if (!displayStats.length) displayStats = fallbackStats;

  $: displayParks = (parks ?? []).map(parkFrom).filter(Boolean) as Park[];
  $: if (!displayParks.length) displayParks = fallbackParks;
</script>

<section class="border-y border-white/10 bg-deep-green text-white" use:fadeUpOnScroll={{ y: 12 }}>
  <div class="mx-auto grid max-w-[1500px] border-b border-white/[0.07] md:grid-cols-2 xl:grid-cols-4">
    {#each displayStats as stat}
      <article class="grid min-h-[116px] gap-4 border-b border-white/[0.07] px-5 py-6 sm:grid-cols-[auto_1fr] md:border-r md:border-white/[0.07] xl:border-b-0 xl:px-8">
        <p class="font-serif text-[36px] font-light leading-none text-goldfinch-gold md:text-[42px]">{stat.value}</p>
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[0.26em] text-white/40">{stat.label}</p>
          <p class="mt-2 max-w-[230px] text-sm font-medium leading-6 text-white/68">{stat.description}</p>
        </div>
      </article>
    {/each}
  </div>

  <div class="container-shell grid gap-12 py-16 md:py-24 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16 xl:py-28">
    <div class="max-w-[700px]">
      <p class="brand-eyebrow">{eyebrow}</p>
      <h2 class="mt-6 font-serif text-[40px] font-light leading-[1.08] tracking-normal text-white sm:text-[54px] lg:text-[62px]">
        {title}
        <span class="block italic text-goldfinch-gold">{accentTitle}</span>
      </h2>

      <p class="mt-8 text-[15px] font-medium leading-8 text-white/68 md:text-base">{content}</p>

      <blockquote class="mt-8 border-l-2 border-goldfinch-gold pl-6 font-serif text-2xl italic leading-[1.45] text-goldfinch-gold md:text-[28px]">
        {quote}
      </blockquote>

      <p class="mt-8 max-w-[640px] text-[15px] font-medium leading-8 text-white/68 md:text-base">{closing}</p>

      <a
        class="mt-10 inline-flex h-[52px] min-h-[52px] items-center justify-center gap-3 bg-goldfinch-gold px-8 text-[12px] font-bold uppercase tracking-[0.18em] text-deep-green transition hover:bg-savanna"
        href={ctaHref}
      >
        {ctaLabel}
        <ArrowRight size={16} strokeWidth={2.5} />
      </a>
    </div>

    <div class="border-l border-goldfinch-gold/45" use:staggeredCardReveal={{ selector: '.park-card', y: 16, stagger: 0.06 }}>
      {#each displayParks as park}
        <article class="park-card grid gap-5 border-b border-white/[0.06] bg-white/[0.025] p-6 sm:grid-cols-[34px_1fr] md:p-8">
          <span class="flex h-9 w-9 items-center justify-center text-goldfinch-gold" aria-hidden="true">
            <Sparkle size={27} fill="currentColor" strokeWidth={1.5} />
          </span>
          <div>
            <h3 class="font-serif text-[22px] font-normal leading-snug text-white md:text-[25px]">{park.title}</h3>
            <p class="mt-3 text-[14px] font-semibold leading-7 text-white/58">{park.description}</p>
            {#if park.href}
              <a class="mt-4 inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.16em] text-goldfinch-gold transition hover:text-white" href={park.href}>
                View park <ArrowRight size={14} strokeWidth={2.5} />
              </a>
            {/if}
          </div>
        </article>
      {/each}
    </div>
  </div>
</section>
