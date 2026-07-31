<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { ArrowLeft, ExternalLink, Route, Search } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import AdminEmptyState from '$lib/components/admin/AdminEmptyState.svelte';
  import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
  import AdminSelect from '$lib/components/admin/AdminSelect.svelte';
  import AdminToolbar from '$lib/components/admin/AdminToolbar.svelte';
  import StatusBadge from '$lib/components/admin/StatusBadge.svelte';
  import ItineraryDaysManager from '$lib/components/admin/ItineraryDaysManager.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';

  type Option = { label: string; value: string };
  type TourSummary = {
    destination?: string;
    duration_days?: number | string | null;
    duration_nights?: number | string | null;
    id: string;
    slug: string;
    status?: string;
    title: string;
  };

  let loadingTours = true;
  let error = '';
  let search = '';
  let selectedTourId = '';
  let tours: TourSummary[] = [];
  let tourOptions: Option[] = [{ label: 'Select a tour…', value: '' }];

  $: filteredTours = tours.filter((t) =>
    `${t.title} ${t.slug} ${t.destination ?? ''}`.toLowerCase().includes(search.trim().toLowerCase())
  );
  $: selectedTour = tours.find((t) => t.id === selectedTourId);

  const relationText = (value: unknown, key: string) => {
    if (Array.isArray(value)) return String((value[0] as Record<string, unknown> | undefined)?.[key] ?? '');
    if (value && typeof value === 'object') return String((value as Record<string, unknown>)[key] ?? '');
    return '';
  };
  const formatDuration = (t: TourSummary) => `${t.duration_days ?? '-'} days / ${t.duration_nights ?? 0} nights`;

  const loadTours = async () => {
    loadingTours = true;
    error = '';
    try {
      const res = await api.tours.list({ limit: 100, status: 'all' });
      tours = res.data.items.map((t) => ({
        destination: relationText((t as Record<string, unknown>).destinations, 'name'),
        duration_days: t.duration_days,
        duration_nights: t.duration_nights,
        id: t.id,
        slug: t.slug,
        status: t.status,
        title: t.title
      }));
      tourOptions = [{ label: 'Select a tour…', value: '' }, ...tours.map((t) => ({ label: t.title, value: t.id }))];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to load tours.';
    } finally {
      loadingTours = false;
    }
  };

  // Selecting a tour keeps the URL in sync so the view is deep-linkable and the
  // tour editor can hand off straight to a specific tour's itinerary.
  const selectTour = (id: string) => {
    selectedTourId = id;
    void goto(id ? `/admin/itineraries?tour=${id}` : '/admin/itineraries', {
      replaceState: true,
      noScroll: true,
      keepFocus: true
    });
  };

  onMount(async () => {
    await loadTours();
    const t = $page.url.searchParams.get('tour');
    if (t && tours.some((x) => x.id === t)) selectedTourId = t;
  });
</script>

<div class="mx-auto grid w-full max-w-[1500px] gap-6">
  <AdminPageHeader
    eyebrow="Tour Management"
    title="Itineraries"
    description="Pick a tour to build its day-by-day plan — or edit it inside the full tour editor."
  />

  {#if loadingTours}
    <LoadingState message="Loading tours..." />
  {:else if error}
    <ErrorState message={error} />
  {:else if tours.length === 0}
    <AdminEmptyState
      title="Create a tour first"
      message="Itinerary days belong to a tour. Create the tour package first, then return here to plan the days."
      icon={Route}
    />
  {:else}
    <AdminToolbar className="grid gap-3 lg:grid-cols-[1fr_360px] lg:items-end">
      <label class="grid gap-2 text-sm font-medium text-ink">
        <span>Search tours</span>
        <span class="flex h-11 items-center gap-2 rounded-2xl border border-ink/10 bg-surface px-3 shadow-sm transition focus-within:border-forest/45 focus-within:ring-2 focus-within:ring-forest/10">
          <Search size={16} class="text-ink/45" />
          <input class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink/35" bind:value={search} placeholder="Find a tour..." />
        </span>
      </label>
      <AdminSelect label="Tour" name="tour_id" bind:value={selectedTourId} options={tourOptions} on:change={() => selectTour(selectedTourId)} />
    </AdminToolbar>

    {#if !selectedTour}
      <!-- Guided picker: no dead-ends, just choose a tour -->
      <div class="grid gap-4 rounded-none border border-ink/10 bg-surface p-5 shadow-[0_18px_50px_rgba(28,26,22,0.06)]">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Choose a tour</p>
          <h2 class="mt-1 text-xl font-bold text-ink">Which trip's itinerary do you want to plan?</h2>
          <p class="mt-2 max-w-3xl text-sm leading-6 text-ink/62">Pick a tour below to add and edit its day-by-day plan. You can also manage the itinerary directly inside each tour from <span class="font-semibold text-ink">Tours → Edit</span>.</p>
        </div>
        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {#each filteredTours as tour (tour.id)}
            <button
              class="rounded-none border border-ink/10 bg-sand/20 p-4 text-left transition hover:border-goldfinch-gold/45 hover:bg-sand/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/20"
              type="button"
              on:click={() => selectTour(tour.id)}
            >
              <p class="font-semibold text-ink">{tour.title}</p>
              <p class="mt-1 text-xs text-ink/55">{tour.destination || tour.slug}</p>
              <p class="mt-3 text-xs font-semibold text-forest">{formatDuration(tour)}</p>
            </button>
          {/each}
        </div>
      </div>
    {:else}
      <!-- Selected tour: context header + the shared day manager -->
      <section class="grid gap-5 rounded-none border border-ink/10 bg-surface p-5 shadow-[0_18px_50px_rgba(28,26,22,0.06)] md:p-6">
        <div class="flex flex-col gap-4 border-b border-ink/10 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <button type="button" class="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-ink/55 transition hover:text-ink" on:click={() => selectTour('')}>
              <ArrowLeft size={14} /> All tours
            </button>
            <h2 class="text-xl font-bold text-ink">{selectedTour.title}</h2>
            <div class="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-ink/58">
              <span class="rounded-full bg-sand/70 px-3 py-1">{selectedTour.destination || selectedTour.slug}</span>
              <span class="rounded-full bg-sand/70 px-3 py-1">{formatDuration(selectedTour)}</span>
              <StatusBadge status={selectedTour.status || 'draft'} />
            </div>
          </div>
          <a
            class="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-ink/15 bg-surface px-4 text-sm font-semibold text-ink transition hover:border-goldfinch-gold/40 hover:bg-sand"
            href={`/admin/tours/${selectedTour.id}/edit#itinerary`}
          >
            <ExternalLink size={15} /> Open full tour editor
          </a>
        </div>

        <ItineraryDaysManager
          tourId={selectedTourId}
          tourTitle={selectedTour.title}
          destination={selectedTour.destination ?? ''}
          durationDays={selectedTour.duration_days ?? null}
        />
      </section>
    {/if}
  {/if}
</div>
