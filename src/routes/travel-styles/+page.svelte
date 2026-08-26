<script lang="ts">
  import { ArrowUpRight } from '@lucide/svelte';
  import { revealHeading, staggeredCardReveal } from '$lib/animations';
  import EmptyState from '$lib/components/public/EmptyState.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import ResponsiveImage from '$lib/components/public/ResponsiveImage.svelte';
  import type { TravelStyle } from '$lib/types';
  import type { PageData } from './$types';

  export let data: PageData;

  $: styles = (data.styles ?? []) as TravelStyle[];
  $: loadFailed = data.loadFailed;

  const title = 'Travel Styles | Emnel Adventures';
  const description =
    'Honeymoon, family, luxury, photography, group and solo — we shape a Tanzania safari around how you travel, not only where you go.';
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
</svelte:head>

<section class="bg-deep-green text-white">
  <div class="container-shell py-20 md:py-28">
    <nav class="text-[11px] uppercase tracking-[0.24em] text-white/55" aria-label="Breadcrumb">
      <a class="transition hover:text-goldfinch-gold" href="/">Home</a>
      <span class="px-2 text-white/25">/</span>
      <span class="text-goldfinch-gold">Travel Styles</span>
    </nav>
    <h1 class="mt-9 max-w-3xl font-serif text-[38px] font-light leading-[1.06] md:text-[64px]" use:revealHeading>
      How do you want to travel?
    </h1>
    <p class="mt-7 max-w-2xl text-[15px] leading-8 text-white/80 md:text-[17px]">{description}</p>
  </div>
</section>

<section class="bg-canvas py-16 md:py-24">
  <div class="container-shell">
    {#if loadFailed}
      <ErrorState message="We couldn't load travel styles right now. Please refresh in a moment." />
    {:else if styles.length === 0}
      <EmptyState title="No travel styles yet" message="Our travel styles are being prepared. Please check back soon." />
    {:else}
      <div class="grid gap-8 md:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 18, stagger: 0.05 }}>
        {#each styles as style (style.slug)}
          <a class="group flex flex-col bg-surface shadow-soft transition duration-300 hover:shadow-lg" href={`/travel-styles/${style.slug}`}>
            {#if style.hero_image_url}
              <div class="aspect-[4/3] overflow-hidden bg-linen">
                <ResponsiveImage
                  src={style.hero_image_url}
                  alt={style.name}
                  imgClass="h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.04]"
                  sizes="(min-width:1024px) 33vw, (min-width:768px) 50vw, 100vw"
                  width={760}
                />
              </div>
            {/if}
            <div class="flex flex-1 flex-col p-7">
              <h2 class="font-serif text-[26px] font-light leading-tight text-heading">{style.name}</h2>
              {#if style.emotional_promise}
                <p class="mt-3 font-serif text-[17px] font-light italic leading-snug text-clay">{style.emotional_promise}</p>
              {/if}
              {#if style.description}
                <p class="mt-4 flex-1 text-[14px] leading-7 text-ink/70">{style.description}</p>
              {/if}
              <span class="mt-7 inline-flex items-center gap-2 border-t border-ink/10 pt-5 text-sm font-medium text-deep-green">
                Explore {style.name}
                <ArrowUpRight class="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </div>
          </a>
        {/each}
      </div>
    {/if}
  </div>
</section>
