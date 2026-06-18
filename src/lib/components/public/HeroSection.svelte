<script lang="ts">
  import { onMount } from 'svelte';
  import { CalendarDays, ChevronDown, ListFilter, Luggage, MapPin, Search, Sparkles } from '@lucide/svelte';
  import { goto } from '$app/navigation';
  import { api } from '$lib/api/client';
  import { fadeUpOnScroll, heroImageParallax } from '$lib/animations';
  import { brand } from '$lib/brand';
  import type { Destination } from '$lib/types';

  export let title = 'Plan East Africa With Confidence';
  export let description = 'Honest safari, Kilimanjaro, gorilla trekking and beach advice from local experts.';
  export let imageUrl = '/images/surf-hero.jpg';
  // Kept for backwards-compatible props from the homepage; the button label is now scope-aware.
  export let primaryCta = brand.primaryCta;
  export let secondaryCta = brand.secondaryCta;
  export let secondaryCtaUrl = '/contact';

  type Scope = 'tours' | 'destinations' | 'departures' | 'advisor';
  type Opt = { label: string; value: string };

  const scopes: { id: Scope; label: string; icon: typeof MapPin }[] = [
    { id: 'tours', label: 'Tours', icon: Luggage },
    { id: 'destinations', label: 'Destinations', icon: MapPin },
    { id: 'departures', label: 'Departures', icon: CalendarDays },
    { id: 'advisor', label: 'Advisor', icon: Sparkles }
  ];

  let scope: Scope = 'tours';
  let destination = '';
  let category = '';
  let date = '';

  let destinationOptions: Opt[] = [];
  let categoryOptions: Opt[] = [];

  const todayStr = new Date().toISOString().slice(0, 10);

  // Which controls are meaningful for each scope (dates only exist on departures).
  $: showDestination = scope !== 'advisor';
  $: showDate = scope === 'departures';
  $: showCategory = scope === 'tours';
  $: ctaLabel =
    scope === 'tours'
      ? 'Search tours'
      : scope === 'destinations'
        ? 'Explore'
        : scope === 'departures'
          ? 'Find dates'
          : primaryCta; // advisor scope routes to /plan-my-trip, so use the brand CTA label

  onMount(async () => {
    try {
      const [dest, cat] = await Promise.all([
        api.destinations.list({ status: 'published', limit: 100 }),
        api.categories.list({ status: 'published', limit: 100 })
      ]);
      destinationOptions = (dest.data.items as Destination[])
        .filter((d) => d.slug)
        .map((d) => ({ label: d.name, value: d.slug }));
      categoryOptions = (cat.data.items as Array<Record<string, unknown>>)
        .filter((c) => c.slug)
        .map((c) => ({ label: String(c.name ?? c.slug), value: String(c.slug) }));
    } catch {
      // Selects stay empty; the search button still routes to the right page.
    }
  });

  const submit = () => {
    if (scope === 'tours') {
      const params = new URLSearchParams();
      if (destination) params.set('destination', destination);
      if (category) params.set('category', category);
      void goto(`/tours${params.toString() ? `?${params}` : ''}`);
    } else if (scope === 'destinations') {
      void goto(destination ? `/destinations/${destination}` : '/destinations');
    } else if (scope === 'departures') {
      const params = new URLSearchParams();
      if (destination) params.set('destination', destination);
      if (date) params.set('month', date.slice(0, 7));
      void goto(`/departures${params.toString() ? `?${params}` : ''}`);
    } else {
      void goto('/plan-my-trip');
    }
  };
</script>

<section class="relative bg-white">
  <div class="relative h-[410px] overflow-hidden sm:h-[440px] md:h-[500px]">
    <img class="absolute inset-0 h-full w-full object-cover object-center" src={imageUrl} alt="East Africa landscape" use:heroImageParallax={{ amount: 4 }} />
    <div class="absolute inset-0 bg-deep-green/35"></div>

    <div class="relative z-10 mx-auto flex h-full w-full max-w-[1500px] items-center justify-center px-5 pb-20 pt-10 text-center md:pb-20">
      <div class="mt-2 max-w-[880px] text-white" use:fadeUpOnScroll={{ y: 14, start: 'top 95%', duration: 0.65 }}>
        <h1 class="text-[32px] font-extrabold leading-[1.08] tracking-normal drop-shadow-sm sm:text-[42px] lg:text-[56px]">{title}</h1>
        <p class="mx-auto mt-4 max-w-[820px] text-[15px] font-semibold leading-6 drop-shadow-sm sm:text-lg lg:text-xl">{description}</p>
      </div>
    </div>
  </div>

  <div class="relative z-20 mx-auto -mt-[86px] w-full max-w-[1500px] px-5 pb-14 md:-mt-[92px] md:px-4 md:pb-18">
    <div class="relative rounded-[6px] bg-white px-4 pb-6 pt-5 shadow-[0_18px_42px_rgba(20,20,20,0.09)] md:rounded-[8px] md:px-10 md:pb-8 md:pt-14" use:fadeUpOnScroll={{ y: 18, start: 'top 96%', duration: 0.7 }}>
      <!-- scope tabs: in-flow + scrollable on mobile, floating on the card edge on desktop -->
      <div class="hide-scroll layout-ltr z-10 mb-4 flex gap-1.5 overflow-x-auto md:absolute md:right-10 md:top-0 md:mb-0 md:w-auto md:-translate-y-1/2 md:gap-2 md:overflow-visible">
        {#each scopes as s (s.id)}
          <button
            class={`inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full border px-3.5 text-[13px] font-semibold shadow-sm transition md:h-12 md:px-5 md:text-[15px] ${
              scope === s.id
                ? 'border-forest bg-forest text-white'
                : 'border-[#e8e8e8] bg-white text-[#151515] hover:border-forest/40'
            }`}
            type="button"
            aria-pressed={scope === s.id}
            on:click={() => (scope = s.id)}
          >
            {s.label}
            <span class="grid h-[19px] w-[19px] shrink-0 place-items-center rounded-full bg-goldfinch-gold text-white md:h-6 md:w-6">
              <svelte:component this={s.icon} size={12} strokeWidth={2.6} />
            </span>
          </button>
        {/each}
      </div>

      <form class="layout-ltr flex flex-col gap-3 lg:flex-row lg:items-stretch lg:gap-4" on:submit|preventDefault={submit}>
        {#if showDestination}
          <label class="relative flex h-[62px] items-center lg:flex-1 gap-3 rounded-xl border border-[#e5e5e5] bg-white px-4 transition focus-within:border-forest focus-within:ring-2 focus-within:ring-forest/15 md:h-16">
            <MapPin class="shrink-0 text-[#686868]" size={21} strokeWidth={2.5} />
            <select
              class="w-full cursor-pointer appearance-none bg-transparent text-[15px] font-semibold text-[#222222] outline-none md:text-lg"
              bind:value={destination}
              aria-label="Destination"
            >
              <option value="">{scope === 'destinations' ? 'Choose a destination' : 'Anywhere'}</option>
              {#each destinationOptions as opt (opt.value)}
                <option value={opt.value}>{opt.label}</option>
              {/each}
            </select>
            <ChevronDown class="pointer-events-none shrink-0 text-[#9a9a9a]" size={18} />
          </label>
        {/if}

        {#if showDate}
          <label class="flex h-[62px] items-center lg:flex-1 gap-3 rounded-xl border border-[#e5e5e5] bg-white px-4 transition focus-within:border-forest focus-within:ring-2 focus-within:ring-forest/15 md:h-16">
            <CalendarDays class="shrink-0 text-[#686868]" size={20} strokeWidth={2.4} />
            <input
              class="w-full cursor-pointer bg-transparent text-[15px] font-medium text-[#3f3f3f] outline-none md:text-base"
              type="date"
              min={todayStr}
              bind:value={date}
              aria-label="Travel month"
            />
          </label>
        {/if}

        {#if showCategory}
          <label class="relative flex h-[62px] items-center lg:flex-1 gap-3 rounded-xl border border-[#e5e5e5] bg-white px-4 transition focus-within:border-forest focus-within:ring-2 focus-within:ring-forest/15 md:h-16">
            <ListFilter class="shrink-0 text-[#686868]" size={21} strokeWidth={2.5} />
            <select
              class="w-full cursor-pointer appearance-none bg-transparent text-[15px] font-semibold text-[#222222] outline-none md:text-lg"
              bind:value={category}
              aria-label="Experience"
            >
              <option value="">Any experience</option>
              {#each categoryOptions as opt (opt.value)}
                <option value={opt.value}>{opt.label}</option>
              {/each}
            </select>
            <ChevronDown class="pointer-events-none shrink-0 text-[#9a9a9a]" size={18} />
          </label>
        {/if}

        {#if scope === 'advisor'}
          <div class="flex items-center rounded-xl border border-dashed border-[#e0e0e0] bg-sand/30 px-4 py-4 text-[14px] font-medium text-[#5f5f5f] md:text-[15px] lg:flex-1">
            Tell us your dream trip and a local expert will craft a tailored plan — free to start.
          </div>
        {/if}

        <button
          class="flex h-[62px] items-center justify-center gap-2.5 rounded-xl bg-forest px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-deep-green md:h-16 md:text-base lg:w-[200px]"
          type="submit"
        >
          {#if scope === 'advisor'}
            <Sparkles size={20} strokeWidth={2.4} />
          {:else}
            <Search size={20} strokeWidth={2.4} />
          {/if}
          {ctaLabel}
        </button>
      </form>

      <p class="mt-4 text-center text-sm font-medium text-[#444444] md:text-left md:text-[15px]">
        Not sure what fits?
        <a class="font-semibold text-forest" href={secondaryCtaUrl}>{secondaryCta}</a>
      </p>
    </div>
  </div>
</section>

<style>
  .hide-scroll {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .hide-scroll::-webkit-scrollbar {
    display: none;
  }
</style>
