<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import {
    BedDouble,
    Binoculars,
    Car,
    Footprints,
    MapPin,
    PawPrint,
    Plane,
    Sparkles,
    Tent,
    Users,
    Utensils
  } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import { fadeUpOnScroll } from '$lib/animations';
  import { brand } from '$lib/brand';
  import { defaultSpecialist } from '$lib/data/specialists';
  import type { Tour } from '$lib/types';

  type Tab = { slug: string; name: string; tour: Tour };
  type Tile = { url: string; caption: string };

  let tabs: Tab[] = [];
  let activeSlug = '';
  let loading = true;
  let tiles: Tile[] = [];
  const galleryCache: Record<string, Tile[]> = {};

  $: active = tabs.find((t) => t.slug === activeSlug) ?? tabs[0];

  const rank = (t: Tour) => (t.is_featured ? 2 : 0) + (t.is_popular ? 1 : 0);
  const hashtag = (h: string) => '#' + h.replace(/&/g, 'and').replace(/[^a-zA-Z0-9]+/g, '');

  // Map a highlight phrase to a representative icon for the feature chips.
  const iconFor = (text: string) => {
    const s = text.toLowerCase();
    if (/(lodge|camp|hotel|farmhouse|stay|tent|suite)/.test(s)) return /tent|camp/.test(s) ? Tent : BedDouble;
    if (/(walk|trek|hike|climb|gondola|canoe|kayak|foot|summit)/.test(s)) return Footprints;
    if (/(drive|transfer|vehicle|jeep|vespa|road|car|game drive)/.test(s)) return Car;
    if (/(food|produce|cuisine|dining|spice|taste|wine|coffee|dinner|meal)/.test(s)) return Utensils;
    if (/(flight|fly|stopover|airport|plane)/.test(s)) return Plane;
    if (/(wildlife|big five|game|gorilla|migration|safari|cat|lion|elephant)/.test(s)) return /gorilla|primate/.test(s) ? PawPrint : Binoculars;
    if (/(family|couple|group|private|honeymoon)/.test(s)) return Users;
    return MapPin;
  };

  $: facts = active
    ? [
        active.tour.duration_nights ? `${active.tour.duration_nights} nights` : '',
        active.tour.duration_days ? `${active.tour.duration_days} days` : '',
        'Private & tailor-made'
      ].filter(Boolean)
    : [];
  $: chips = (active?.tour.highlights ?? []).slice(0, 6);
  $: initials = defaultSpecialist.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();

  const buildTiles = async (tab: Tab) => {
    const tour = tab.tour;
    if (galleryCache[tour.id]) { tiles = galleryCache[tour.id]; return; }
    let imgs: Tile[] = [];
    try {
      const res = await api.tourImages.list({ tour_id: tour.id, limit: 8 });
      const items = (res.data.items ?? []) as Array<Record<string, unknown>>;
      imgs = items
        .map((x) => ({ url: String(x.image_url ?? ''), caption: x.caption ? String(x.caption) : '' }))
        .filter((t) => t.url);
    } catch {
      imgs = [];
    }
    for (const u of [tour.main_image_url, tour.banner_image_url]) {
      if (u && !imgs.some((t) => t.url === u)) imgs.push({ url: u, caption: '' });
    }
    // Fill missing captions from the trip highlights as #hashtags.
    const hl = tour.highlights ?? [];
    imgs = imgs.map((t, i) => ({ url: t.url, caption: t.caption || (hl[i] ? hashtag(hl[i]) : '') }));
    tiles = imgs.slice(0, 4);
    galleryCache[tour.id] = tiles;
  };

  $: if (active) void buildTiles(active);

  // mosaic layout adapts to how many images the trip has
  $: gridClass =
    tiles.length >= 4 ? 'grid-cols-3 grid-rows-2'
    : tiles.length === 3 ? 'grid-cols-2 grid-rows-2'
    : tiles.length === 2 ? 'grid-cols-2 grid-rows-1'
    : 'grid-cols-1 grid-rows-1';
  const spanClass = (i: number, count: number) => {
    if (count >= 4) return i === 0 ? 'row-span-2' : i === 1 ? 'col-span-2' : '';
    if (count === 3) return i === 0 ? 'row-span-2' : '';
    return '';
  };

  onMount(async () => {
    try {
      const res = await api.tours.list({ status: 'published', limit: 60 });
      const tours = (res.data.items ?? []) as Tour[];
      const byDest = new Map<string, Tab>();
      for (const tour of tours) {
        const slug = tour.destinations?.slug;
        const name = tour.destinations?.name;
        if (!slug || !name) continue;
        const existing = byDest.get(slug);
        if (!existing || rank(tour) > rank(existing.tour)) byDest.set(slug, { slug, name, tour });
      }
      tabs = [...byDest.values()].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 6);
      activeSlug = tabs[0]?.slug ?? '';
    } catch {
      tabs = [];
    } finally {
      loading = false;
    }
  });
</script>

{#if !loading && tabs.length && active}
  <section class="bg-sand/40 py-14 md:py-20" use:fadeUpOnScroll={{ y: 18 }}>
    <div class="container-shell">
      <h2 class="text-center font-serif text-3xl font-bold tracking-tight text-deep-green md:text-[40px]">
        What a trip with {brand.name.split(' ')[0]} can look like
      </h2>

      <!-- destination tabs (underlined) -->
      <div class="mt-7 flex flex-wrap justify-center gap-x-7 gap-y-2 border-b border-ink/10">
        {#each tabs as tab (tab.slug)}
          <button
            type="button"
            class={`-mb-px border-b-2 px-1 pb-3 text-[15px] font-semibold transition ${
              tab.slug === activeSlug ? 'border-forest text-forest' : 'border-transparent text-ink/55 hover:text-ink'
            }`}
            on:click={() => (activeSlug = tab.slug)}
          >
            {tab.name}
          </button>
        {/each}
      </div>

      {#key active.slug}
        <div class="mt-9 grid items-stretch gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]" in:fade={{ duration: 220 }}>
          <!-- details card -->
          <div class="flex flex-col rounded-[24px] bg-sand p-7 md:p-8">
            <h3 class="text-2xl font-extrabold leading-tight text-ink md:text-3xl">{active.tour.title}</h3>

            {#if facts.length}
              <div class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium text-ink/60">
                {#each facts as f, i}
                  {#if i > 0}<span class="text-ink/25">|</span>{/if}<span>{f}</span>
                {/each}
              </div>
            {/if}

            {#if chips.length}
              <div class="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {#each chips as chip}
                  {@const Icon = iconFor(chip)}
                  <span class="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-sm font-semibold text-ink/75 shadow-sm">
                    <Icon size={16} class="shrink-0 text-forest" /> <span class="truncate">{chip}</span>
                  </span>
                {/each}
              </div>
            {/if}

            <div class="mt-auto flex items-center gap-3 pt-8">
              <span class="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-forest/10 text-sm font-bold text-forest">
                {#if defaultSpecialist.photo}
                  <img class="h-full w-full object-cover" src={defaultSpecialist.photo} alt={defaultSpecialist.name} />
                {:else}{initials}{/if}
              </span>
              <div class="leading-tight">
                <p class="text-xs font-medium text-ink/50">Designed by</p>
                <p class="text-sm font-bold text-ink">{defaultSpecialist.name}</p>
              </div>
            </div>
          </div>

          <!-- image mosaic -->
          {#if tiles.length}
            <div class={`grid aspect-[5/4] gap-3 ${gridClass}`}>
              {#each tiles as tile, i (tile.url)}
                <a href={`/tours/${active.tour.slug}`} class={`group relative overflow-hidden rounded-2xl bg-skywash ${spanClass(i, tiles.length)}`}>
                  <img class="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" src={tile.url} alt={tile.caption || active.tour.title} loading="lazy" />
                  {#if tile.caption}
                    <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-3">
                      <span class="text-sm font-semibold text-white drop-shadow">{tile.caption}</span>
                    </div>
                  {/if}
                </a>
              {/each}
            </div>
          {:else}
            <div class="aspect-[5/4] overflow-hidden rounded-2xl bg-skywash">
              {#if active.tour.main_image_url}
                <img class="h-full w-full object-cover" src={active.tour.main_image_url} alt={active.tour.title} loading="lazy" />
              {/if}
            </div>
          {/if}
        </div>
      {/key}

      <div class="mt-10 flex justify-center">
        <a
          class="inline-flex h-12 items-center gap-2 rounded-full bg-forest px-7 font-bold text-white shadow-sm transition hover:bg-deep-green"
          href={`/plan-my-trip?destination=${active.slug}`}
        >
          <Sparkles size={18} /> Plan your {active.name} trip for free
        </a>
      </div>
    </div>
  </section>
{/if}
