<script lang="ts">
  import { fade, scale } from 'svelte/transition';
  import { browser } from '$app/environment';
  import { Edit, Image as ImageIcon, Plus, Route, Save, Sparkles, Trash2, X } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import AdminButton from './AdminButton.svelte';
  import AdminEmptyState from './AdminEmptyState.svelte';
  import AdminFormInput from './AdminFormInput.svelte';
  import AdminTextArea from './AdminTextArea.svelte';
  import MediaPicker from './MediaPicker.svelte';
  import ConfirmModal from './ConfirmModal.svelte';
  import ToastStack from './ToastStack.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';

  // Move the modal to <body> so its `fixed inset-0` is viewport-relative and not
  // trapped inside a transformed ancestor (Lenis / page transition), which would
  // otherwise push the popup off-screen until the user scrolls.
  const portal = (node: HTMLElement) => {
    document.body.appendChild(node);
    return { destroy: () => node.remove() };
  };

  // The single source of truth for a tour's day-by-day plan. Embedded in the
  // tour editor (edit everything in one place) and reused by the standalone
  // Itineraries page. Keyed on tourId; fetches its own tour context if the
  // caller doesn't supply it.
  export let tourId: string;
  export let tourTitle = '';
  export let destination = '';
  export let durationDays: number | string | null = null;

  type ItineraryDay = {
    accommodation?: string | null;
    activities?: string | null;
    day_number: number;
    description?: string | null;
    id: string;
    image_url?: string | null;
    meals?: string | null;
    title: string;
    tour_id: string;
  };
  type MediaItem = { file_name: string; file_url: string; id: string; thumbnail_url?: string | null };
  type Toast = { id: string; message: string; type: 'error' | 'success' };

  let loadingDays = false;
  let daysError = '';
  let days: ItineraryDay[] = [];
  let mediaItems: MediaItem[] = [];
  let loadingMedia = false;
  let saving = false;
  let deleting = false;
  let drafting = false;
  let modalOpen = false;
  let confirmOpen = false;
  let editingDay: ItineraryDay | null = null;
  let dayToDelete: ItineraryDay | null = null;
  let toasts: Toast[] = [];
  let form = { accommodation: '', activities: '', day_number: '1', description: '', image_url: '', meals: '', title: '' };

  $: sortedDays = [...days].sort((a, b) => Number(a.day_number) - Number(b.day_number));

  const relationText = (value: unknown, key: string) => {
    if (Array.isArray(value)) return String((value[0] as Record<string, unknown> | undefined)?.[key] ?? '');
    if (value && typeof value === 'object') return String((value as Record<string, unknown>)[key] ?? '');
    return '';
  };

  const showToast = (message: string, type: Toast['type'] = 'success') => {
    const id = crypto.randomUUID();
    toasts = [{ id, message, type }, ...toasts].slice(0, 4);
    setTimeout(() => (toasts = toasts.filter((t) => t.id !== id)), 3500);
  };
  const dismissToast = (e: CustomEvent<string>) => (toasts = toasts.filter((t) => t.id !== e.detail));

  const normalizeDay = (v: Record<string, unknown>): ItineraryDay => ({
    accommodation: String(v.accommodation ?? ''),
    activities: String(v.activities ?? ''),
    day_number: Number(v.day_number ?? 0),
    description: String(v.description ?? ''),
    id: String(v.id ?? ''),
    image_url: String(v.image_url ?? ''),
    meals: String(v.meals ?? ''),
    title: String(v.title ?? 'Untitled day'),
    tour_id: String(v.tour_id ?? '')
  });

  const loadContext = async () => {
    if (tourTitle) return; // caller provided it
    try {
      const res = await api.tours.get(tourId);
      const t = res.data as Record<string, unknown>;
      tourTitle = String(t.title ?? '');
      destination = relationText(t.destinations, 'name') || String(t.destination ?? '');
      durationDays = (t.duration_days as number) ?? null;
    } catch {
      /* header just stays minimal */
    }
  };

  const loadDays = async () => {
    days = [];
    daysError = '';
    if (!tourId) return;
    loadingDays = true;
    try {
      const res = await api.itineraries.byTour(tourId);
      days = res.data.map((d) => normalizeDay(d));
    } catch (err) {
      daysError = err instanceof Error ? err.message : 'Unable to load itinerary days.';
    } finally {
      loadingDays = false;
    }
  };

  const loadMedia = async () => {
    if (mediaItems.length || loadingMedia) return;
    loadingMedia = true;
    try {
      const res = await api.media.list({ file_type: 'image', limit: 100 });
      mediaItems = res.data.items
        .map((i) => ({
          file_name: String(i.file_name ?? 'Untitled image'),
          file_url: String(i.file_url ?? ''),
          id: String(i.id ?? ''),
          thumbnail_url: (i.thumbnail_url as string | null | undefined) ?? null
        }))
        .filter((i) => i.id && i.file_url);
    } catch {
      /* ignore — picker still allows upload/URL */
    } finally {
      loadingMedia = false;
    }
  };

  // (Re)load whenever the target tour changes.
  let loadedFor = '';
  $: if (browser && tourId && tourId !== loadedFor) {
    loadedFor = tourId;
    void loadContext();
    void loadDays();
  }

  const nextDayNumber = () => String(sortedDays.reduce((m, d) => Math.max(m, Number(d.day_number)), 0) + 1);

  const openCreateModal = () => {
    editingDay = null;
    form = { accommodation: '', activities: '', day_number: nextDayNumber(), description: '', image_url: '', meals: '', title: '' };
    void loadMedia();
    modalOpen = true;
  };
  const openEditModal = (day: ItineraryDay) => {
    editingDay = day;
    form = {
      accommodation: day.accommodation ?? '',
      activities: day.activities ?? '',
      day_number: String(day.day_number),
      description: day.description ?? '',
      image_url: day.image_url ?? '',
      meals: day.meals ?? '',
      title: day.title
    };
    void loadMedia();
    modalOpen = true;
  };
  const closeModal = () => {
    modalOpen = false;
    editingDay = null;
  };

  const duplicateDayExists = () =>
    sortedDays.some((d) => Number(d.day_number) === Number(form.day_number) && d.id !== editingDay?.id);

  const payload = () => ({
    accommodation: form.accommodation.trim() || null,
    activities: form.activities.trim() || null,
    day_number: Number(form.day_number),
    description: form.description.trim() || null,
    image_url: form.image_url.trim() || null,
    meals: form.meals.trim() || null,
    title: form.title.trim(),
    tour_id: tourId
  });

  const saveDay = async () => {
    if (!form.title.trim()) return showToast('Day title is required.', 'error');
    if (!Number.isInteger(Number(form.day_number)) || Number(form.day_number) < 1)
      return showToast('Day number must be a positive number.', 'error');
    if (duplicateDayExists()) return showToast('This tour already has a day with that number.', 'error');
    saving = true;
    try {
      if (editingDay) {
        await api.itineraries.update(editingDay.id, payload());
        showToast('Itinerary day updated.');
      } else {
        await api.itineraries.create(payload());
        showToast('Itinerary day added.');
      }
      closeModal();
      await loadDays();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to save itinerary day.', 'error');
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
      showToast('Itinerary day deleted.');
      confirmOpen = false;
      dayToDelete = null;
      await loadDays();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to delete itinerary day.', 'error');
    } finally {
      deleting = false;
    }
  };

  // ✨ AI co-pilot: draft the day-by-day plan from the tour context; only creates
  // day numbers that don't exist yet, so existing days are never overwritten.
  const draftItinerary = async () => {
    if (drafting || !tourId) return;
    if (sortedDays.length && !confirm('Generate AI-drafted days for any day numbers not already added? Existing days are kept.')) return;
    drafting = true;
    try {
      const res = await api.aiTravelAdvisor.assist({
        task: 'draft_itinerary',
        context: { title: tourTitle, destination, duration_days: Number(durationDays) || undefined }
      });
      const generated = (res.data.itinerary ?? []) as Array<Record<string, unknown>>;
      if (!generated.length) return showToast('The AI did not return any days. Please try again.', 'error');
      const existing = new Set(sortedDays.map((d) => Number(d.day_number)));
      let created = 0;
      for (const d of generated) {
        const n = Number(d.day_number);
        if (!n || existing.has(n)) continue;
        await api.itineraries.create({
          tour_id: tourId,
          day_number: n,
          title: String(d.title ?? `Day ${n}`),
          description: (d.description as string) ?? null,
          accommodation: (d.accommodation as string) ?? null,
          meals: (d.meals as string) ?? null,
          activities: (d.activities as string) ?? null
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
</script>

<ToastStack {toasts} on:dismiss={dismissToast} />

<div class="grid gap-4">
  <div class="flex flex-col gap-4 border-b border-ink/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Day-by-day itinerary</p>
      <h3 class="mt-1 text-lg font-bold text-ink">
        {sortedDays.length ? `${sortedDays.length} day${sortedDays.length === 1 ? '' : 's'} planned` : 'Build the day-by-day plan'}
        {#if durationDays}<span class="ml-1 text-sm font-medium text-ink/45">/ {durationDays} in this package</span>{/if}
      </h3>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <button
        type="button"
        on:click={draftItinerary}
        disabled={drafting}
        class="inline-flex h-10 items-center gap-2 rounded-lg border border-forest/30 bg-forest/5 px-4 text-sm font-bold text-forest transition hover:bg-forest hover:text-white disabled:opacity-50"
        title="Draft the day-by-day plan with AI"
      >
        <Sparkles size={16} strokeWidth={2.4} />{drafting ? 'Drafting…' : 'Draft with AI'}
      </button>
      <AdminButton on:click={openCreateModal}><Plus size={16} /> Add Day</AdminButton>
    </div>
  </div>

  {#if loadingDays}
    <LoadingState message="Loading itinerary days..." />
  {:else if daysError}
    <ErrorState message={daysError} />
  {:else if sortedDays.length === 0}
    <AdminEmptyState
      title="No itinerary days yet"
      message="Start with Day 1 — or let the AI co-pilot draft the whole plan for you, then edit."
      actionLabel="Add Day 1"
      icon={Route}
      on:action={openCreateModal}
    />
  {:else}
    <div class="grid gap-4">
      {#each sortedDays as day (day.id)}
        <article class="grid gap-4 rounded-none border border-ink/10 bg-surface p-4 shadow-[0_16px_44px_rgba(28,26,22,0.055)] lg:grid-cols-[auto_1fr_auto] lg:items-start">
          <div class="grid h-16 w-16 place-items-center rounded-2xl bg-forest text-center text-white shadow-sm shadow-forest/15">
            <span class="text-[10px] font-bold uppercase tracking-[0.16em] text-white/70">Day</span>
            <strong class="-mt-3 text-2xl">{day.day_number}</strong>
          </div>
          <div class="min-w-0">
            <h4 class="text-lg font-bold text-ink">{day.title}</h4>
            {#if day.description}<p class="mt-2 max-w-4xl text-sm leading-6 text-ink/62">{day.description}</p>{/if}
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
              <div class="grid h-16 w-24 place-items-center rounded-2xl bg-sand/50 text-ink/35 ring-1 ring-ink/10 lg:h-20 lg:w-28"><ImageIcon size={20} /></div>
            {/if}
            <div class="flex gap-2">
              <button class="inline-flex h-9 items-center gap-2 rounded-xl border border-ink/10 bg-surface px-3 text-xs font-semibold text-ink shadow-sm transition hover:border-goldfinch-gold/35 hover:bg-sand/70" type="button" on:click={() => openEditModal(day)}><Edit size={14} /> Edit</button>
              <button class="inline-flex h-9 items-center gap-2 rounded-xl border border-red-200 bg-surface px-3 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-50" type="button" on:click={() => openDeleteConfirm(day)}><Trash2 size={14} /> Delete</button>
            </div>
          </div>
        </article>
      {/each}
    </div>
  {/if}
</div>

{#if modalOpen}
  <div use:portal class="fixed inset-0 z-[60] grid place-items-center bg-black/45 p-4 backdrop-blur-sm" transition:fade={{ duration: 140 }}>
    <form class="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-none border border-ink/10 bg-surface p-5 shadow-[0_24px_80px_rgba(28,26,22,0.18)] sm:p-6" transition:scale={{ duration: 160, start: 0.98 }} on:submit|preventDefault={saveDay}>
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">{editingDay ? 'Edit itinerary day' : 'New itinerary day'}</p>
          <h2 class="mt-1 text-2xl font-bold text-ink">{editingDay ? `Day ${editingDay.day_number}` : 'Add day plan'}</h2>
          <p class="mt-2 text-sm leading-6 text-ink/60">Save the day-by-day plan for {tourTitle || 'this tour'}.</p>
        </div>
        <button class="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-ink/10 bg-surface text-ink shadow-sm transition hover:bg-sand" type="button" aria-label="Close" on:click={closeModal}><X size={18} /></button>
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
      <div class="mt-5 rounded-none border border-ink/10 bg-sand/25 p-4">
        <MediaPicker label="Day image" media={mediaItems} uploadFolder="itineraries" bind:value={form.image_url} />
      </div>
      <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <AdminButton variant="secondary" type="button" on:click={closeModal}>Cancel</AdminButton>
        <AdminButton type="submit" disabled={saving}><Save size={16} /> {saving ? 'Saving...' : editingDay ? 'Save Changes' : 'Add Day'}</AdminButton>
      </div>
    </form>
  </div>
{/if}

<ConfirmModal
  open={confirmOpen}
  title="Delete itinerary day"
  message={`Delete Day ${dayToDelete?.day_number ?? ''}: "${dayToDelete?.title ?? 'this itinerary day'}"?`}
  on:cancel={() => { confirmOpen = false; dayToDelete = null; }}
  on:confirm={deleteDay}
/>

{#if deleting}
  <div class="fixed bottom-4 right-4 z-[70] rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(28,26,22,0.18)]">Deleting itinerary day...</div>
{/if}
