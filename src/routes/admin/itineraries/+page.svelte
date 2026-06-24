<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { Edit, Image as ImageIcon, Plus, Route, Save, Search, Sparkles, Trash2, X } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminEmptyState from '$lib/components/admin/AdminEmptyState.svelte';
  import AdminFormInput from '$lib/components/admin/AdminFormInput.svelte';
  import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
  import AdminSelect from '$lib/components/admin/AdminSelect.svelte';
  import AdminTextArea from '$lib/components/admin/AdminTextArea.svelte';
  import AdminToolbar from '$lib/components/admin/AdminToolbar.svelte';
  import ConfirmModal from '$lib/components/admin/ConfirmModal.svelte';
  import StatusBadge from '$lib/components/admin/StatusBadge.svelte';
  import ToastStack from '$lib/components/admin/ToastStack.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';

  type ImageMode = 'media' | 'none' | 'url';

  type ItineraryDay = {
    accommodation?: string | null;
    activities?: string | null;
    created_at?: string;
    day_number: number;
    description?: string | null;
    id: string;
    image_url?: string | null;
    meals?: string | null;
    title: string;
    tour_id: string;
    updated_at?: string;
  };

  type MediaItem = {
    file_name: string;
    file_url: string;
    id: string;
  };

  type Option = {
    label: string;
    value: string;
  };

  type Toast = {
    id: string;
    message: string;
    type: 'error' | 'success';
  };

  type TourSummary = {
    destination?: string;
    duration_days?: number | string | null;
    duration_nights?: number | string | null;
    id: string;
    slug: string;
    status?: string;
    title: string;
  };

  const imageModeOptions: Option[] = [
    { label: 'No image', value: 'none' },
    { label: 'Choose from Media Library', value: 'media' },
    { label: 'Use manual URL', value: 'url' }
  ];

  let loadingTours = true;
  let loadingDays = false;
  let loadingMedia = false;
  let saving = false;
  let deleting = false;
  let error = '';
  let daysError = '';
  let search = '';
  let selectedTourId = '';
  let tours: TourSummary[] = [];
  let tourOptions: Option[] = [{ label: 'Select a tour', value: '' }];
  let days: ItineraryDay[] = [];
  let mediaItems: MediaItem[] = [];
  let mediaOptions: Option[] = [{ label: 'Select an image', value: '' }];
  let modalOpen = false;
  let confirmOpen = false;
  let editingDay: ItineraryDay | null = null;
  let dayToDelete: ItineraryDay | null = null;
  let imageMode: ImageMode = 'none';
  let mediaId = '';
  let toasts: Toast[] = [];
  let form = {
    accommodation: '',
    activities: '',
    day_number: '1',
    description: '',
    image_url: '',
    meals: '',
    title: '',
    tour_id: ''
  };

  $: filteredTours = tours.filter((tour) => {
    const value = `${tour.title} ${tour.slug} ${tour.destination ?? ''}`.toLowerCase();
    return value.includes(search.trim().toLowerCase());
  });

  $: selectedTour = tours.find((tour) => tour.id === selectedTourId);
  $: sortedDays = [...days].sort((first, second) => Number(first.day_number) - Number(second.day_number));

  const relationText = (value: unknown, key: string) => {
    if (Array.isArray(value)) return String((value[0] as Record<string, unknown> | undefined)?.[key] ?? '');
    if (value && typeof value === 'object') return String((value as Record<string, unknown>)[key] ?? '');
    return '';
  };

  const showToast = (message: string, type: Toast['type'] = 'success') => {
    const id = crypto.randomUUID();
    toasts = [{ id, message, type }, ...toasts].slice(0, 4);
    setTimeout(() => {
      toasts = toasts.filter((toast) => toast.id !== id);
    }, 3500);
  };

  const dismissToast = (event: CustomEvent<string>) => {
    toasts = toasts.filter((toast) => toast.id !== event.detail);
  };

  const formatDuration = (tour: TourSummary) => {
    const daysValue = tour.duration_days ?? '-';
    const nightsValue = tour.duration_nights ?? 0;
    return `${daysValue} days / ${nightsValue} nights`;
  };

  const normalizeDay = (value: Record<string, unknown>): ItineraryDay => ({
    accommodation: String(value.accommodation ?? ''),
    activities: String(value.activities ?? ''),
    created_at: String(value.created_at ?? ''),
    day_number: Number(value.day_number ?? 0),
    description: String(value.description ?? ''),
    id: String(value.id ?? ''),
    image_url: String(value.image_url ?? ''),
    meals: String(value.meals ?? ''),
    title: String(value.title ?? 'Untitled day'),
    tour_id: String(value.tour_id ?? '')
  });

  const loadTours = async () => {
    loadingTours = true;
    error = '';

    try {
      const response = await api.tours.list({ limit: 100, status: 'all' });
      tours = response.data.items.map((tour) => ({
        destination: relationText((tour as Record<string, unknown>).destinations, 'name'),
        duration_days: tour.duration_days,
        duration_nights: tour.duration_nights,
        id: tour.id,
        slug: tour.slug,
        status: tour.status,
        title: tour.title
      }));
      tourOptions = [{ label: 'Select a tour', value: '' }, ...tours.map((tour) => ({ label: tour.title, value: tour.id }))];
    } catch (requestError) {
      error = requestError instanceof Error ? requestError.message : 'Unable to load tours.';
    } finally {
      loadingTours = false;
    }
  };

  const loadMedia = async () => {
    if (mediaItems.length || loadingMedia) return;
    loadingMedia = true;

    try {
      const response = await api.media.list({ file_type: 'image', limit: 100 });
      mediaItems = response.data.items.map((item) => ({
        file_name: String(item.file_name ?? 'Untitled image'),
        file_url: String(item.file_url ?? ''),
        id: String(item.id ?? '')
      })).filter((item) => item.id && item.file_url);
      mediaOptions = [
        { label: 'Select an image', value: '' },
        ...mediaItems.map((item) => ({ label: item.file_name, value: item.id }))
      ];
    } catch (requestError) {
      showToast(requestError instanceof Error ? requestError.message : 'Unable to load media images.', 'error');
    } finally {
      loadingMedia = false;
    }
  };

  const loadDays = async () => {
    days = [];
    daysError = '';
    if (!selectedTourId) return;

    loadingDays = true;

    try {
      const response = await api.itineraries.byTour(selectedTourId);
      days = response.data.map((item) => normalizeDay(item));
    } catch (requestError) {
      daysError = requestError instanceof Error ? requestError.message : 'Unable to load itinerary days.';
    } finally {
      loadingDays = false;
    }
  };

  const handleTourSelection = async () => {
    await loadDays();
  };

  const selectTour = async (tourId: string) => {
    selectedTourId = tourId;
    await loadDays();
  };

  const nextDayNumber = () => {
    const maxDay = sortedDays.reduce((max, day) => Math.max(max, Number(day.day_number)), 0);
    return String(maxDay + 1);
  };

  const resetForm = () => {
    form = {
      accommodation: '',
      activities: '',
      day_number: nextDayNumber(),
      description: '',
      image_url: '',
      meals: '',
      title: '',
      tour_id: selectedTourId
    };
    imageMode = 'none';
    mediaId = '';
  };

  const openCreateModal = async () => {
    if (!selectedTourId) {
      showToast('Select a parent tour before adding itinerary days.', 'error');
      return;
    }

    editingDay = null;
    resetForm();
    modalOpen = true;
  };

  const openEditModal = async (day: ItineraryDay) => {
    editingDay = day;
    form = {
      accommodation: day.accommodation ?? '',
      activities: day.activities ?? '',
      day_number: String(day.day_number),
      description: day.description ?? '',
      image_url: day.image_url ?? '',
      meals: day.meals ?? '',
      title: day.title,
      tour_id: day.tour_id
    };
    imageMode = day.image_url ? 'url' : 'none';
    mediaId = '';
    modalOpen = true;
  };

  const closeModal = () => {
    modalOpen = false;
    editingDay = null;
    resetForm();
  };

  const applyImageMode = async () => {
    if (imageMode === 'none') {
      form.image_url = '';
      mediaId = '';
    }

    if (imageMode === 'media') await loadMedia();
  };

  const applyMediaSelection = () => {
    const selectedMedia = mediaItems.find((item) => item.id === mediaId);
    form.image_url = selectedMedia?.file_url ?? '';
  };

  const duplicateDayExists = () => {
    const dayNumber = Number(form.day_number);
    return sortedDays.some((day) => Number(day.day_number) === dayNumber && day.id !== editingDay?.id);
  };

  const payload = () => ({
    accommodation: form.accommodation.trim() || null,
    activities: form.activities.trim() || null,
    day_number: Number(form.day_number),
    description: form.description.trim() || null,
    image_url: form.image_url.trim() || null,
    meals: form.meals.trim() || null,
    title: form.title.trim(),
    tour_id: form.tour_id || selectedTourId
  });

  // ✨ AI co-pilot: draft the whole day-by-day itinerary from the tour context
  // and create the days that don't exist yet (review/edit afterwards).
  let drafting = false;
  const draftItinerary = async () => {
    if (!selectedTour || drafting) return;
    if (sortedDays.length && !confirm('Generate AI-drafted days for any day numbers not already added? Existing days are kept.')) return;
    drafting = true;
    try {
      const res = await api.aiTravelAdvisor.assist({
        task: 'draft_itinerary',
        context: {
          title: selectedTour.title,
          destination: selectedTour.destination,
          duration_days: Number(selectedTour.duration_days) || undefined
        }
      });
      const generated = (res.data.itinerary ?? []) as Array<Record<string, unknown>>;
      if (!generated.length) {
        showToast('The AI did not return any days. Please try again.', 'error');
        return;
      }
      const existing = new Set(sortedDays.map((day) => Number(day.day_number)));
      let created = 0;
      for (const day of generated) {
        const dayNumber = Number(day.day_number);
        if (!dayNumber || existing.has(dayNumber)) continue;
        await api.itineraries.create({
          tour_id: selectedTourId,
          day_number: dayNumber,
          title: String(day.title ?? `Day ${dayNumber}`),
          description: (day.description as string) ?? null,
          accommodation: (day.accommodation as string) ?? null,
          meals: (day.meals as string) ?? null,
          activities: (day.activities as string) ?? null
        });
        created += 1;
      }
      await loadDays();
      showToast(created ? `Drafted ${created} day${created === 1 ? '' : 's'} — review and edit as needed.` : 'All day numbers already exist; nothing added.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'AI draft failed.', 'error');
    } finally {
      drafting = false;
    }
  };

  const saveDay = async () => {
    if (!selectedTourId) {
      showToast('Select a parent tour first.', 'error');
      return;
    }

    if (!form.title.trim()) {
      showToast('Day title is required.', 'error');
      return;
    }

    if (!Number.isInteger(Number(form.day_number)) || Number(form.day_number) < 1) {
      showToast('Day number must be a positive number.', 'error');
      return;
    }

    if (duplicateDayExists()) {
      showToast('This tour already has an itinerary day with that day number.', 'error');
      return;
    }

    saving = true;

    try {
      if (editingDay) {
        await api.itineraries.update(editingDay.id, payload());
        showToast('Itinerary day updated successfully.');
      } else {
        await api.itineraries.create(payload());
        showToast('Itinerary day added successfully.');
      }

      closeModal();
      await loadDays();
    } catch (requestError) {
      showToast(requestError instanceof Error ? requestError.message : 'Unable to save itinerary day.', 'error');
    } finally {
      saving = false;
    }
  };

  const openDeleteConfirm = (day: ItineraryDay) => {
    dayToDelete = day;
    confirmOpen = true;
  };

  const deleteDay = async () => {
    if (!dayToDelete) return;
    deleting = true;

    try {
      await api.itineraries.remove(dayToDelete.id);
      showToast('Itinerary day deleted successfully.');
      confirmOpen = false;
      dayToDelete = null;
      await loadDays();
    } catch (requestError) {
      showToast(requestError instanceof Error ? requestError.message : 'Unable to delete itinerary day.', 'error');
    } finally {
      deleting = false;
    }
  };

  onMount(loadTours);
</script>

<ToastStack {toasts} on:dismiss={dismissToast} />

<div class="mx-auto grid w-full max-w-[1500px] gap-6">
  <AdminPageHeader
    eyebrow="Tour Management"
    title="Itineraries"
    description="Build day-by-day plans as child records attached to a selected parent tour package."
    actionLabel="Add Day"
    actionIcon={Plus}
    on:action={openCreateModal}
  />

  <AdminToolbar className="grid gap-3 lg:grid-cols-[1fr_360px] lg:items-end">
    <label class="grid gap-2 text-sm font-medium text-ink">
      <span>Search tours</span>
      <span class="flex h-11 items-center gap-2 rounded-2xl border border-ink/10 bg-surface px-3 shadow-sm transition focus-within:border-forest/45 focus-within:ring-2 focus-within:ring-forest/10">
        <Search size={16} class="text-ink/45" />
        <input class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink/35" bind:value={search} placeholder="Find a parent tour..." />
      </span>
    </label>

    <AdminSelect label="Parent tour" name="tour_id" bind:value={selectedTourId} options={tourOptions} on:change={handleTourSelection} />
  </AdminToolbar>

  {#if loadingTours}
    <LoadingState message="Loading tours..." />
  {:else if error}
    <ErrorState message={error} />
  {:else if tours.length === 0}
    <AdminEmptyState
      title="Create a tour first"
      message="Itinerary days must belong to a parent tour. Create the tour package first, then return here to manage day-by-day plans."
      icon={Route}
    />
  {:else if !selectedTour}
    <div class="grid gap-4 rounded-[10px] border border-ink/10 bg-surface p-5 shadow-[0_18px_50px_rgba(15,47,36,0.06)]">
      <div>
        <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Select a parent tour</p>
        <h2 class="mt-1 text-xl font-bold text-ink">Itinerary days are child records</h2>
        <p class="mt-2 max-w-3xl text-sm leading-6 text-ink/62">
          Tours are the main travel package records. Itinerary days are separate records linked by <span class="font-semibold text-ink">itinerary_days.tour_id</span>.
          Select a tour before adding day-by-day items.
        </p>
      </div>

      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {#each filteredTours as tour}
          <button
            class="rounded-[8px] border border-ink/10 bg-sand/20 p-4 text-left transition hover:border-goldfinch-gold/45 hover:bg-sand/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/20"
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
    <section class="rounded-[10px] border border-ink/10 bg-surface p-5 shadow-[0_18px_50px_rgba(15,47,36,0.06)]">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Selected parent tour</p>
          <h2 class="mt-1 text-xl font-bold text-ink">{selectedTour.title}</h2>
          <div class="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-ink/58">
            <span class="rounded-full bg-sand/70 px-3 py-1">{selectedTour.destination || selectedTour.slug}</span>
            <span class="rounded-full bg-sand/70 px-3 py-1">{formatDuration(selectedTour)}</span>
            <StatusBadge status={selectedTour.status || 'draft'} />
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            on:click={draftItinerary}
            disabled={drafting}
            class="inline-flex h-10 items-center gap-2 rounded-lg border border-forest/30 bg-forest/5 px-4 text-sm font-bold text-forest transition hover:bg-forest hover:text-white disabled:opacity-50"
            title="Draft the day-by-day plan with AI"
          >
            <Sparkles size={16} strokeWidth={2.4} />
            {drafting ? 'Drafting…' : 'Draft with AI'}
          </button>
          <AdminButton on:click={openCreateModal}>
            <Plus size={16} />
            Add Day
          </AdminButton>
        </div>
      </div>
    </section>

    {#if loadingDays}
      <LoadingState message="Loading itinerary days..." />
    {:else if daysError}
      <ErrorState message={daysError} />
    {:else if sortedDays.length === 0}
      <AdminEmptyState
        title="No itinerary days added yet"
        message="Start by adding Day 1. Each itinerary record stays linked to this selected tour."
        actionLabel="Add Day 1"
        icon={Route}
        on:action={openCreateModal}
      />
    {:else}
      <div class="grid gap-4">
        {#each sortedDays as day}
          <article class="grid gap-4 rounded-[8px] border border-ink/10 bg-surface p-4 shadow-[0_16px_44px_rgba(15,47,36,0.055)] lg:grid-cols-[auto_1fr_auto] lg:items-start">
            <div class="grid h-16 w-16 place-items-center rounded-2xl bg-forest text-center text-white shadow-sm shadow-forest/15">
              <span class="text-[10px] font-bold uppercase tracking-[0.16em] text-white/70">Day</span>
              <strong class="-mt-3 text-2xl">{day.day_number}</strong>
            </div>

            <div class="min-w-0">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 class="text-lg font-bold text-ink">{day.title}</h3>
                  {#if day.description}
                    <p class="mt-2 max-w-4xl text-sm leading-6 text-ink/62">{day.description}</p>
                  {/if}
                </div>
              </div>

              <div class="mt-4 grid gap-3 md:grid-cols-3">
                <div class="rounded-2xl bg-sand/35 p-3">
                  <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-forest/70">Accommodation</p>
                  <p class="mt-1 text-sm text-ink/70">{day.accommodation || 'Not specified'}</p>
                </div>
                <div class="rounded-2xl bg-sand/35 p-3">
                  <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-forest/70">Meals</p>
                  <p class="mt-1 text-sm text-ink/70">{day.meals || 'Not specified'}</p>
                </div>
                <div class="rounded-2xl bg-sand/35 p-3">
                  <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-forest/70">Activities</p>
                  <p class="mt-1 line-clamp-2 text-sm text-ink/70">{day.activities || 'Not specified'}</p>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-2 lg:flex-col lg:items-end">
              {#if day.image_url}
                <img class="h-16 w-24 rounded-2xl object-cover ring-1 ring-ink/10 lg:h-20 lg:w-28" src={day.image_url} alt={day.title} />
              {:else}
                <div class="grid h-16 w-24 place-items-center rounded-2xl bg-sand/50 text-ink/35 ring-1 ring-ink/10 lg:h-20 lg:w-28">
                  <ImageIcon size={20} />
                </div>
              {/if}

              <div class="flex gap-2">
                <button class="inline-flex h-9 items-center gap-2 rounded-xl border border-ink/10 bg-surface px-3 text-xs font-semibold text-ink shadow-sm transition hover:border-goldfinch-gold/35 hover:bg-sand/70" type="button" on:click={() => openEditModal(day)}>
                  <Edit size={14} />
                  Edit
                </button>
                <button class="inline-flex h-9 items-center gap-2 rounded-xl border border-red-200 bg-surface px-3 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-50" type="button" on:click={() => openDeleteConfirm(day)}>
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </div>
          </article>
        {/each}
      </div>
    {/if}
  {/if}
</div>

{#if modalOpen}
  <div class="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4 backdrop-blur-sm" transition:fade={{ duration: 140 }}>
    <form class="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[10px] border border-ink/10 bg-surface p-5 shadow-[0_24px_80px_rgba(15,47,36,0.18)] sm:p-6" transition:scale={{ duration: 160, start: 0.98 }} on:submit|preventDefault={saveDay}>
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">{editingDay ? 'Edit itinerary day' : 'New itinerary day'}</p>
          <h2 class="mt-1 text-2xl font-bold text-ink">{editingDay ? `Day ${editingDay.day_number}` : 'Add day plan'}</h2>
          <p class="mt-2 text-sm leading-6 text-ink/60">Save the day-by-day plan for {selectedTour?.title ?? 'the selected tour'}.</p>
        </div>
        <button class="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-ink/10 bg-surface text-ink shadow-sm transition hover:bg-sand" type="button" aria-label="Close itinerary form" on:click={closeModal}>
          <X size={18} />
        </button>
      </div>

      <div class="mt-6 grid gap-4 sm:grid-cols-[160px_1fr]">
        <AdminFormInput label="Day number" name="day_number" type="number" bind:value={form.day_number} required />
        <AdminFormInput label="Day title" name="title" bind:value={form.title} placeholder="Arrival in Arusha" required />
      </div>

      <div class="mt-4 grid gap-4">
        <AdminTextArea label="Description" name="description" bind:value={form.description} rows={4} placeholder="Describe what happens on this day..." />
      </div>

      <div class="mt-4 grid gap-4 md:grid-cols-3">
        <AdminFormInput label="Accommodation" name="accommodation" bind:value={form.accommodation} placeholder="Safari lodge, hotel..." />
        <AdminFormInput label="Meals" name="meals" bind:value={form.meals} placeholder="Breakfast, lunch, dinner" />
        <AdminTextArea label="Activities" name="activities" bind:value={form.activities} rows={3} placeholder="Game drive, transfer..." />
      </div>

      <div class="mt-5 rounded-[8px] border border-ink/10 bg-sand/25 p-4">
        <div class="grid gap-4 md:grid-cols-[260px_1fr]">
          <AdminSelect label="Image source" name="image_mode" bind:value={imageMode} options={imageModeOptions} on:change={applyImageMode} />

          {#if imageMode === 'media'}
            <AdminSelect label={loadingMedia ? 'Loading media...' : 'Media Library image'} name="media_id" bind:value={mediaId} options={mediaOptions} on:change={applyMediaSelection} />
          {:else if imageMode === 'url'}
            <AdminFormInput label="Image URL" name="image_url" bind:value={form.image_url} placeholder="https://..." />
          {:else}
            <div class="rounded-2xl border border-dashed border-ink/15 bg-surface/70 p-4 text-sm leading-6 text-ink/58">
              No image will be attached to this itinerary day.
            </div>
          {/if}
        </div>

        {#if form.image_url}
          <div class="mt-4 flex items-center gap-3 rounded-2xl bg-surface p-3 ring-1 ring-ink/10">
            <img class="h-16 w-24 rounded-xl object-cover" src={form.image_url} alt="Selected itinerary visual" />
            <div class="min-w-0">
              <p class="text-sm font-semibold text-ink">Selected image</p>
              <p class="truncate text-xs text-ink/50">{form.image_url}</p>
            </div>
          </div>
        {/if}
      </div>

      <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <AdminButton variant="secondary" type="button" on:click={closeModal}>Cancel</AdminButton>
        <AdminButton type="submit" disabled={saving}>
          <Save size={16} />
          {saving ? 'Saving...' : editingDay ? 'Save Changes' : 'Add Day'}
        </AdminButton>
      </div>
    </form>
  </div>
{/if}

<ConfirmModal
  open={confirmOpen}
  title="Delete itinerary day"
  message={`Delete Day ${dayToDelete?.day_number ?? ''}: "${dayToDelete?.title ?? 'this itinerary day'}"?`}
  on:cancel={() => {
    confirmOpen = false;
    dayToDelete = null;
  }}
  on:confirm={deleteDay}
/>

{#if deleting}
  <div class="fixed bottom-4 right-4 z-[70] rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(15,47,36,0.18)]">
    Deleting itinerary day...
  </div>
{/if}
