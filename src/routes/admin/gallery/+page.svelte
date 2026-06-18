<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import {
    Edit,
    FileText,
    Film,
    Image as ImageIcon,
    Images,
    LayoutGrid,
    List,
    MapPin,
    Map as MapIcon,
    Plus,
    Search,
    Trash2,
    X
  } from '@lucide/svelte';
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

  type Relation = { id: string; name?: string; slug: string; title?: string } | null;

  type GalleryItem = {
    alt_text?: string | null;
    caption?: string | null;
    created_at?: string;
    destination_id?: string | null;
    destinations?: Relation;
    id: string;
    image_url: string;
    media_type: 'document' | 'image' | 'video';
    sort_order: number;
    status: 'archived' | 'draft' | 'published';
    title?: string | null;
    tour_id?: string | null;
    tours?: Relation;
  };

  type MediaItem = { file_name: string; file_url: string; id: string };
  type Option = { label: string; value: string };
  type Toast = { id: string; message: string; type: 'error' | 'success' };
  type ImageMode = 'media' | 'url';
  type ViewMode = 'grid' | 'list';

  const statusOptions: Option[] = [
    { label: 'Draft', value: 'draft' },
    { label: 'Published', value: 'published' },
    { label: 'Archived', value: 'archived' }
  ];

  const mediaTypeOptions: Option[] = [
    { label: 'Image', value: 'image' },
    { label: 'Video', value: 'video' },
    { label: 'Document', value: 'document' }
  ];

  const imageModeOptions: Option[] = [
    { label: 'Choose from Media Library', value: 'media' },
    { label: 'Manual URL', value: 'url' }
  ];

  const emptyForm = () => ({
    alt_text: '',
    caption: '',
    destination_id: '',
    image_url: '',
    media_type: 'image' as GalleryItem['media_type'],
    sort_order: '0',
    status: 'draft' as GalleryItem['status'],
    title: '',
    tour_id: ''
  });

  let rows: GalleryItem[] = [];
  let mediaItems: MediaItem[] = [];
  let mediaOptions: Option[] = [{ label: 'Select an image', value: '' }];
  let destinationOptions: Option[] = [{ label: 'No destination', value: '' }];
  let tourOptions: Option[] = [{ label: 'No tour', value: '' }];
  let destinationFilterOptions: Option[] = [{ label: 'All destinations', value: 'all' }];
  let tourFilterOptions: Option[] = [{ label: 'All tours', value: 'all' }];

  let loading = true;
  let loadingMedia = false;
  let saving = false;
  let deleting = false;
  let error = '';

  let search = '';
  let statusFilter = 'all';
  let mediaTypeFilter = 'all';
  let destinationFilter = 'all';
  let tourFilter = 'all';
  let viewMode: ViewMode = 'grid';

  let modalOpen = false;
  let confirmOpen = false;
  let editing: GalleryItem | null = null;
  let toDelete: GalleryItem | null = null;
  let form = emptyForm();
  let imageMode: ImageMode = 'media';
  let mediaId = '';
  let toasts: Toast[] = [];

  // backend orders by sort_order; apply stable secondary sort by created_at
  $: sorted = [...rows].sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return String(a.created_at ?? '').localeCompare(String(b.created_at ?? ''));
  });

  const showToast = (message: string, type: Toast['type'] = 'success') => {
    const id = crypto.randomUUID();
    toasts = [{ id, message, type }, ...toasts].slice(0, 4);
    setTimeout(() => { toasts = toasts.filter((t) => t.id !== id); }, 3500);
  };

  const dismissToast = (e: CustomEvent<string>) => { toasts = toasts.filter((t) => t.id !== e.detail); };

  const relationLabel = (rel: Relation | undefined, key: 'name' | 'title') => {
    if (rel && typeof rel === 'object') return String(rel[key] ?? '');
    return '';
  };

  const load = async () => {
    loading = true;
    error = '';
    try {
      const res = await api.gallery.list({
        search,
        status: statusFilter,
        media_type: mediaTypeFilter === 'all' ? undefined : mediaTypeFilter,
        destination_id: destinationFilter === 'all' ? undefined : destinationFilter,
        tour_id: tourFilter === 'all' ? undefined : tourFilter,
        limit: 200
      });
      rows = res.data.items as unknown as GalleryItem[];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to load gallery items.';
    } finally {
      loading = false;
    }
  };

  const loadRelations = async () => {
    try {
      const [dest, tour] = await Promise.all([
        api.destinations.list({ limit: 200, status: 'all' }),
        api.tours.list({ limit: 200, status: 'all' })
      ]);
      const destinations = dest.data.items.map((d) => ({ label: String(d.name ?? d.slug ?? 'Untitled'), value: String(d.id) }));
      const tours = tour.data.items.map((t) => ({ label: String(t.title ?? t.slug ?? 'Untitled'), value: String(t.id) }));
      destinationOptions = [{ label: 'No destination', value: '' }, ...destinations];
      tourOptions = [{ label: 'No tour', value: '' }, ...tours];
      destinationFilterOptions = [{ label: 'All destinations', value: 'all' }, ...destinations];
      tourFilterOptions = [{ label: 'All tours', value: 'all' }, ...tours];
    } catch {
      // non-critical
    }
  };

  const loadMedia = async () => {
    if (mediaItems.length || loadingMedia) return;
    loadingMedia = true;
    try {
      const res = await api.media.list({ file_type: 'image', limit: 200 });
      mediaItems = (res.data.items as unknown as MediaItem[]).filter((m) => m.file_url);
      mediaOptions = [{ label: 'Select an image', value: '' }, ...mediaItems.map((m) => ({ label: m.file_name, value: m.id }))];
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to load media library.', 'error');
    } finally {
      loadingMedia = false;
    }
  };

  const openCreate = async () => {
    editing = null;
    form = emptyForm();
    imageMode = 'media';
    mediaId = '';
    modalOpen = true;
    await loadMedia();
  };

  const openEdit = async (item: GalleryItem) => {
    editing = item;
    form = {
      alt_text: item.alt_text ?? '',
      caption: item.caption ?? '',
      destination_id: item.destination_id ?? '',
      image_url: item.image_url,
      media_type: item.media_type,
      sort_order: String(item.sort_order ?? 0),
      status: item.status,
      title: item.title ?? '',
      tour_id: item.tour_id ?? ''
    };
    imageMode = 'url';
    mediaId = '';
    modalOpen = true;
    await loadMedia();
  };

  const closeModal = () => { modalOpen = false; editing = null; form = emptyForm(); };

  const applyMediaSelection = () => {
    const found = mediaItems.find((m) => m.id === mediaId);
    form.image_url = found?.file_url ?? '';
  };

  const payload = () => ({
    alt_text: form.alt_text.trim() || null,
    caption: form.caption.trim() || null,
    destination_id: form.destination_id || null,
    image_url: form.image_url.trim(),
    media_type: form.media_type,
    sort_order: Number(form.sort_order || 0),
    status: form.status,
    title: form.title.trim() || null,
    tour_id: form.tour_id || null
  });

  const save = async () => {
    if (!form.image_url.trim()) { showToast('Image URL is required. Select from Media Library or paste a URL.', 'error'); return; }
    saving = true;
    try {
      if (editing) {
        await api.gallery.update(editing.id, payload());
        showToast('Gallery item updated successfully.');
      } else {
        await api.gallery.create(payload());
        showToast('Gallery item created successfully.');
      }
      closeModal();
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to save gallery item.', 'error');
    } finally {
      saving = false;
    }
  };

  const openDelete = (item: GalleryItem) => { toDelete = item; confirmOpen = true; };

  const confirmDelete = async () => {
    if (!toDelete) return;
    deleting = true;
    try {
      await api.gallery.remove(toDelete.id);
      showToast('Gallery item deleted successfully.');
      confirmOpen = false;
      toDelete = null;
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to delete gallery item.', 'error');
    } finally {
      deleting = false;
    }
  };

  const mediaTypeMeta = (type: GalleryItem['media_type']) => {
    if (type === 'video') return { icon: Film, classes: 'bg-purple-50 text-purple-600 ring-purple-200/60' };
    if (type === 'document') return { icon: FileText, classes: 'bg-slate-100 text-slate-600 ring-slate-200/70' };
    return { icon: ImageIcon, classes: 'bg-sky-50 text-sky-600 ring-sky-200/60' };
  };

  onMount(async () => {
    await Promise.all([load(), loadRelations()]);
  });
</script>

<ToastStack {toasts} on:dismiss={dismissToast} />

<div class="mx-auto grid w-full max-w-[1500px] gap-6">
  <AdminPageHeader
    eyebrow="Content Management"
    title="Gallery"
    description="Curate published images for the gallery page, destination pages, and tour pages — separate from the Media Library."
    actionLabel="New Gallery Item"
    actionIcon={Plus}
    on:action={openCreate}
  />

  <AdminToolbar className="grid gap-3 lg:grid-cols-[1fr_repeat(4,150px)_auto] lg:items-end">
    <label class="grid gap-2 text-sm font-medium text-ink">
      <span>Search</span>
      <span class="flex h-11 items-center gap-2 rounded-2xl border border-ink/10 bg-white px-3 shadow-sm transition focus-within:border-forest/45 focus-within:ring-2 focus-within:ring-forest/10">
        <Search size={16} class="text-ink/45" />
        <input class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink/35" bind:value={search} placeholder="Title, caption, alt text..." on:keydown={(e) => e.key === 'Enter' && load()} />
      </span>
    </label>
    <AdminSelect label="Status" name="status_filter" bind:value={statusFilter} options={[{ label: 'All statuses', value: 'all' }, ...statusOptions]} />
    <AdminSelect label="Type" name="media_type_filter" bind:value={mediaTypeFilter} options={[{ label: 'All types', value: 'all' }, ...mediaTypeOptions]} />
    <AdminSelect label="Destination" name="destination_filter" bind:value={destinationFilter} options={destinationFilterOptions} />
    <AdminSelect label="Tour" name="tour_filter" bind:value={tourFilter} options={tourFilterOptions} />
    <AdminButton variant="secondary" on:click={load}>Apply</AdminButton>
  </AdminToolbar>

  {#if !loading && !error && rows.length > 0}
    <div class="flex items-center justify-between">
      <p class="text-sm text-ink/55">{sorted.length} item{sorted.length === 1 ? '' : 's'}</p>
      <div class="flex gap-1 rounded-xl border border-ink/10 bg-white p-1 shadow-sm">
        <button class={`grid h-9 w-9 place-items-center rounded-lg transition ${viewMode === 'grid' ? 'bg-forest text-white' : 'text-ink/50 hover:bg-sand/60'}`} type="button" aria-label="Grid view" on:click={() => (viewMode = 'grid')}>
          <LayoutGrid size={16} />
        </button>
        <button class={`grid h-9 w-9 place-items-center rounded-lg transition ${viewMode === 'list' ? 'bg-forest text-white' : 'text-ink/50 hover:bg-sand/60'}`} type="button" aria-label="List view" on:click={() => (viewMode = 'list')}>
          <List size={16} />
        </button>
      </div>
    </div>
  {/if}

  {#if loading}
    <LoadingState message="Loading gallery..." />
  {:else if error}
    <ErrorState message={error} />
  {:else if rows.length === 0}
    <AdminEmptyState
      title="No gallery items yet"
      message="Publish your first gallery image. Pick from the Media Library or paste a URL, then link it to a destination or tour."
      actionLabel="New Gallery Item"
      icon={Images}
      on:action={openCreate}
    />
  {:else if viewMode === 'grid'}
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {#each sorted as item (item.id)}
        {@const meta = mediaTypeMeta(item.media_type)}
        <article class="group overflow-hidden rounded-[8px] border border-ink/10 bg-white shadow-[0_12px_36px_rgba(15,47,36,0.06)]" transition:fade={{ duration: 120 }}>
          <div class="relative aspect-[4/3] overflow-hidden bg-sand/40">
            <img class="h-full w-full object-cover transition duration-300 group-hover:scale-105" src={item.image_url} alt={item.alt_text || item.title || 'Gallery image'} loading="lazy" />
            <span class={`absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${meta.classes}`}>
              <svelte:component this={meta.icon} size={10} />{item.media_type}
            </span>
            <span class="absolute right-2.5 top-2.5"><StatusBadge status={item.status} /></span>
          </div>
          <div class="grid gap-2 p-4">
            <p class="truncate font-semibold text-ink">{item.title || 'Untitled'}</p>
            {#if item.caption}<p class="line-clamp-1 text-xs text-ink/55">{item.caption}</p>{/if}
            <div class="flex flex-wrap gap-1.5">
              <span class="rounded-full bg-sand/70 px-2 py-0.5 text-[11px] font-semibold text-ink/55">Sort {item.sort_order}</span>
              {#if relationLabel(item.destinations, 'name')}
                <span class="inline-flex items-center gap-1 rounded-full bg-forest/10 px-2 py-0.5 text-[11px] font-semibold text-forest"><MapPin size={10} />{relationLabel(item.destinations, 'name')}</span>
              {/if}
              {#if relationLabel(item.tours, 'title')}
                <span class="inline-flex items-center gap-1 rounded-full bg-goldfinch-gold/20 px-2 py-0.5 text-[11px] font-semibold text-deep-green"><MapIcon size={10} />{relationLabel(item.tours, 'title')}</span>
              {/if}
            </div>
            <div class="mt-1 flex gap-2">
              <button class="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-ink/10 bg-white px-3 text-xs font-semibold text-ink shadow-sm transition hover:border-goldfinch-gold/35 hover:bg-sand/70" type="button" on:click={() => openEdit(item)}>
                <Edit size={13} />Edit
              </button>
              <button class="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-50" type="button" on:click={() => openDelete(item)}>
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        </article>
      {/each}
    </div>
  {:else}
    <div class="overflow-hidden rounded-[8px] border border-ink/10 bg-white shadow-[0_18px_50px_rgba(15,47,36,0.06)]">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[900px] text-sm">
          <thead class="bg-sand/70 text-xs uppercase tracking-[0.08em] text-ink/60">
            <tr>
              <th class="px-4 py-3 text-left font-semibold">Preview</th>
              <th class="px-4 py-3 text-left font-semibold">Title</th>
              <th class="px-4 py-3 text-left font-semibold">Type</th>
              <th class="px-4 py-3 text-left font-semibold">Linked to</th>
              <th class="px-4 py-3 text-left font-semibold">Status</th>
              <th class="px-4 py-3 text-left font-semibold">Sort</th>
              <th class="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-ink/10">
            {#each sorted as item (item.id)}
              <tr class="transition hover:bg-sand/25">
                <td class="px-4 py-3">
                  <img class="h-12 w-16 rounded-lg object-cover ring-1 ring-ink/10" src={item.image_url} alt={item.alt_text || item.title || 'Gallery image'} loading="lazy" />
                </td>
                <td class="px-4 py-3">
                  <div class="font-semibold text-ink">{item.title || 'Untitled'}</div>
                  {#if item.caption}<p class="line-clamp-1 max-w-xs text-xs text-ink/50">{item.caption}</p>{/if}
                </td>
                <td class="px-4 py-3 capitalize text-ink/65">{item.media_type}</td>
                <td class="px-4 py-3 text-ink/65">
                  {#if relationLabel(item.destinations, 'name')}<div class="text-xs">{relationLabel(item.destinations, 'name')}</div>{/if}
                  {#if relationLabel(item.tours, 'title')}<div class="text-xs text-ink/50">{relationLabel(item.tours, 'title')}</div>{/if}
                  {#if !relationLabel(item.destinations, 'name') && !relationLabel(item.tours, 'title')}<span class="text-ink/35">—</span>{/if}
                </td>
                <td class="px-4 py-3"><StatusBadge status={item.status} /></td>
                <td class="px-4 py-3 text-ink/65">{item.sort_order}</td>
                <td class="px-4 py-3">
                  <div class="flex justify-end gap-2">
                    <button class="inline-flex h-9 items-center gap-2 rounded-xl border border-ink/10 bg-white px-3 text-xs font-semibold text-ink shadow-sm transition hover:border-goldfinch-gold/35 hover:bg-sand/70" type="button" on:click={() => openEdit(item)}>
                      <Edit size={14} />Edit
                    </button>
                    <button class="inline-flex h-9 items-center gap-2 rounded-xl border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-50" type="button" on:click={() => openDelete(item)}>
                      <Trash2 size={14} />Delete
                    </button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>

{#if modalOpen}
  <div class="fixed inset-0 z-50 grid place-items-center bg-ink/45 p-4 backdrop-blur-sm" transition:fade={{ duration: 140 }}>
    <form
      class="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[10px] border border-ink/10 bg-white p-6 shadow-[0_24px_80px_rgba(15,47,36,0.18)]"
      transition:scale={{ duration: 160, start: 0.98 }}
      on:submit|preventDefault={save}
    >
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">{editing ? 'Edit gallery item' : 'New gallery item'}</p>
          <h2 class="mt-1 text-2xl font-bold text-ink">{editing ? 'Update image' : 'Publish image'}</h2>
        </div>
        <button class="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-ink/10 bg-white text-ink shadow-sm transition hover:bg-sand" type="button" aria-label="Close" on:click={closeModal}>
          <X size={18} />
        </button>
      </div>

      <div class="mt-6 grid gap-4 lg:grid-cols-[300px_1fr]">
        <!-- image picker + preview -->
        <div class="grid content-start gap-3 rounded-[8px] border border-ink/10 bg-sand/25 p-4">
          <AdminSelect label="Image source" name="image_mode" bind:value={imageMode} options={imageModeOptions} />
          {#if imageMode === 'media'}
            <AdminSelect label={loadingMedia ? 'Loading...' : 'Media Library'} name="media_id" bind:value={mediaId} options={mediaOptions} on:change={applyMediaSelection} />
          {:else}
            <AdminFormInput label="Image URL" name="image_url" bind:value={form.image_url} placeholder="https://..." />
          {/if}

          <div class="aspect-[4/3] overflow-hidden rounded-2xl bg-white ring-1 ring-ink/10">
            {#if form.image_url}
              <img class="h-full w-full object-cover" src={form.image_url} alt="Preview" />
            {:else}
              <div class="grid h-full w-full place-items-center text-ink/25"><ImageIcon size={34} /></div>
            {/if}
          </div>
        </div>

        <!-- fields -->
        <div class="grid content-start gap-4">
          <AdminFormInput label="Title" name="title" bind:value={form.title} placeholder="e.g. Sunrise over the Serengeti" />
          <AdminFormInput label="Alt text" name="alt_text" bind:value={form.alt_text} placeholder="Describe the image for accessibility & SEO" />
          <AdminTextArea label="Caption" name="caption" bind:value={form.caption} rows={2} placeholder="Optional caption shown beneath the image" />

          <div class="grid gap-4 sm:grid-cols-2">
            <AdminSelect label="Media type" name="media_type" bind:value={form.media_type} options={mediaTypeOptions} />
            <AdminSelect label="Status" name="status" bind:value={form.status} options={statusOptions} />
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <AdminSelect label="Linked destination (optional)" name="destination_id" bind:value={form.destination_id} options={destinationOptions} />
            <AdminSelect label="Linked tour (optional)" name="tour_id" bind:value={form.tour_id} options={tourOptions} />
          </div>

          <AdminFormInput label="Sort order" name="sort_order" type="number" bind:value={form.sort_order} />
        </div>
      </div>

      <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <AdminButton variant="secondary" type="button" on:click={closeModal}>Cancel</AdminButton>
        <AdminButton type="submit" disabled={saving}>
          {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Gallery Item'}
        </AdminButton>
      </div>
    </form>
  </div>
{/if}

<ConfirmModal
  open={confirmOpen}
  title="Delete gallery item"
  message={`Delete "${toDelete?.title || 'this gallery item'}"? This action soft-deletes the record.`}
  on:cancel={() => { confirmOpen = false; toDelete = null; }}
  on:confirm={confirmDelete}
/>

{#if deleting}
  <div class="fixed bottom-4 right-4 z-[70] rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(15,47,36,0.18)]">
    Deleting gallery item...
  </div>
{/if}
