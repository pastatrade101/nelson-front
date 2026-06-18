<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { ArrowRight, CalendarDays, MapPin, Moon, Sparkles } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import { fadeUpOnScroll } from '$lib/animations';
  import SectionHeader from './SectionHeader.svelte';
  import type { Tour } from '$lib/types';

  type Tab = { slug: string; name: string; tour: Tour };

  let tabs: Tab[] = [];
  let activeSlug = '';
  let loading = true;

  $: active = tabs.find((t) => t.slug === activeSlug) ?? tabs[0];

  // Best representative tour per destination: featured > popular > first.
  const rank = (t: Tour) => (t.is_featured ? 2 : 0) + (t.is_popular ? 1 : 0);

  const hashtags = (tour: Tour) =>
    (tour.highlights ?? [])
      .slice(0, 5)
      .map((h) => '#' + h.replace(/&/g, 'and').replace(/[^a-zA-Z0-9]+/g, ''))
      .filter((h) => h.length > 1);

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

{#if !loading && tabs.length}
  <section class="bg-sand/30 py-14 md:py-20" use:fadeUpOnScroll={{ y: 18 }}>
    <div class="container-shell">
      <SectionHeader
        eyebrow="Featured trips"
        title="Signature journeys our travellers love"
        description="Tailor-made trips, ready to make your own. Pick a destination to see a sample journey."
      />

      <!-- destination tabs -->
      <div class="mt-8 flex flex-wrap gap-2">
        {#each tabs as tab (tab.slug)}
          <button
            type="button"
            class={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              tab.slug === activeSlug
                ? 'border-forest bg-forest text-white shadow-sm'
                : 'border-ink/15 bg-white text-ink/70 hover:border-forest/40 hover:text-forest'
            }`}
            on:click={() => (activeSlug = tab.slug)}
          >
            {tab.name}
          </button>
        {/each}
      </div>

      {#if active}
        {#key active.slug}
          <div class="mt-8 grid gap-8 overflow-hidden rounded-[28px] border border-ink/10 bg-white shadow-soft lg:grid-cols-2" in:fade={{ duration: 220 }}>
            <!-- image -->
            <a href={`/tours/${active.tour.slug}`} class="relative block aspect-[4/3] bg-skywash lg:aspect-auto">
              {#if active.tour.main_image_url}
                <img class="h-full w-full object-cover" src={active.tour.main_image_url} alt={active.tour.title} loading="lazy" />
              {/if}
              <div class="absolute inset-0 bg-gradient-to-t from-deep-green/40 to-transparent lg:bg-gradient-to-r"></div>
              <span class="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-goldfinch-gold px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-deep-green shadow">
                <Sparkles size={12} /> {active.name}
              </span>
            </a>

            <!-- details -->
            <div class="flex flex-col justify-center p-6 md:p-9">
              <h3 class="text-2xl font-extrabold leading-tight text-deep-green md:text-3xl">{active.tour.title}</h3>
              {#if active.tour.short_description}
                <p class="mt-3 line-clamp-3 text-[15px] leading-7 text-ink/70">{active.tour.short_description}</p>
              {/if}

              <!-- trip facts -->
              <div class="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-ink/75">
                {#if active.tour.duration_days}
                  <span class="inline-flex items-center gap-1.5"><CalendarDays size={15} class="text-forest" /> {active.tour.duration_days} days</span>
                {/if}
                {#if active.tour.duration_nights}
                  <span class="inline-flex items-center gap-1.5"><Moon size={15} class="text-forest" /> {active.tour.duration_nights} nights</span>
                {/if}
                <span class="inline-flex items-center gap-1.5"><MapPin size={15} class="text-forest" /> Private &amp; tailor-made</span>
              </div>

              <!-- highlight hashtags -->
              {#if hashtags(active.tour).length}
                <div class="mt-4 flex flex-wrap gap-2">
                  {#each hashtags(active.tour) as tag}
                    <span class="rounded-full bg-sand px-2.5 py-1 text-xs font-semibold text-forest">{tag}</span>
                  {/each}
                </div>
              {/if}

              <div class="mt-7 flex flex-wrap gap-3">
                <a class="inline-flex h-12 items-center gap-2 rounded-xl bg-goldfinch-gold px-6 font-bold text-deep-green shadow-sm transition hover:brightness-105" href={`/plan-my-trip?destination=${active.slug}`}>
                  Plan your {active.name} trip <ArrowRight size={18} />
                </a>
                <a class="inline-flex h-12 items-center gap-2 rounded-xl border border-ink/15 px-6 font-semibold text-ink/75 transition hover:border-forest/40 hover:text-forest" href={`/tours?destination=${active.slug}`}>
                  See {active.name} tours
                </a>
              </div>
            </div>
          </div>
        {/key}
      {/if}
    </div>
  </section>
{/if}
