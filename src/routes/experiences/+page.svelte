<script lang="ts">
  import { ArrowRight } from '@lucide/svelte';
  import { revealHeading, staggeredCardReveal, tilt } from '$lib/animations';
  import EmptyState from '$lib/components/public/EmptyState.svelte';
  import ResponsiveImage from '$lib/components/public/ResponsiveImage.svelte';
  import type { PageData } from './$types';

  export let data: PageData;

  type Experience = { name: string; slug: string; description: string; image_url: string };

  // SSR-loaded categories (in +page.ts) mapped into experience cards.
  $: experiences = ((data.categories ?? []) as Array<Record<string, unknown>>)
    .filter((c) => c.slug)
    .map((c) => ({
      name: String(c.name ?? c.slug),
      slug: String(c.slug),
      description: c.description ? String(c.description) : '',
      image_url: c.image_url ? String(c.image_url) : ''
    }));
</script>

<section class="relative overflow-hidden bg-gradient-to-br from-deep-green via-forest to-deep-green text-white">
  <div class="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-goldfinch-gold/20 blur-3xl"></div>
  <div class="container-shell relative py-16 text-center md:py-20">
    <p class="font-serif text-xl italic text-savanna">Experiences</p>
    <h1 class="mx-auto mt-5 max-w-3xl text-3xl font-serif font-light leading-[1.1] md:text-[44px]" use:revealHeading>What do you want to experience?</h1>
    <p class="mx-auto mt-4 max-w-2xl text-[15px] leading-7 text-white/75 md:text-lg">
      Safari, Kilimanjaro or Zanzibar beach — start from the experience and we'll match the right trip.
    </p>
  </div>
</section>

<section class="container-shell py-12 md:py-16">
  {#if experiences.length === 0}
    <EmptyState title="Experiences coming soon" message="Tell us what you'd love to do and we'll plan it." />
  {:else}
    <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 16, stagger: 0.05 }}>
      {#each experiences as exp (exp.slug)}
        <a class="group relative flex h-64 flex-col justify-end overflow-hidden rounded-none bg-deep-green shadow-[0_14px_40px_rgba(28,26,22,0.07)] transition-shadow duration-300 hover:shadow-[0_26px_60px_rgba(28,26,22,0.16)]" href={`/experiences/${exp.slug}`} use:tilt={{ max: 5 }}>
          {#if exp.image_url}
            <ResponsiveImage imgClass="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105" src={exp.image_url} alt={exp.name} sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" />
          {/if}
          <div class="absolute inset-0 bg-gradient-to-t from-deep-green via-deep-green/40 to-transparent"></div>
          <div class="relative p-5 text-white">
            <h2 class="text-xl font-serif font-normal">{exp.name}</h2>
            {#if exp.description}<p class="mt-1 line-clamp-2 text-sm text-white/80">{exp.description}</p>{/if}
            <span class="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-goldfinch-gold">Explore {exp.name} <ArrowRight size={15} /></span>
          </div>
        </a>
      {/each}
    </div>
  {/if}
</section>
