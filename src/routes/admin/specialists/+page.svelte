<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { Edit, MessageCircle, Plus, Search, Star, Trash2, UsersRound, X } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminEmptyState from '$lib/components/admin/AdminEmptyState.svelte';
  import AdminFormInput from '$lib/components/admin/AdminFormInput.svelte';
  import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
  import AdminSelect from '$lib/components/admin/AdminSelect.svelte';
  import AdminTextArea from '$lib/components/admin/AdminTextArea.svelte';
  import AdminToolbar from '$lib/components/admin/AdminToolbar.svelte';
  import MediaPicker from '$lib/components/admin/MediaPicker.svelte';
  import ConfirmModal from '$lib/components/admin/ConfirmModal.svelte';
  import StatusBadge from '$lib/components/admin/StatusBadge.svelte';
  import ToastStack from '$lib/components/admin/ToastStack.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';

  type Specialist = {
    blurb?: string | null;
    created_at?: string;
    id: string;
    is_featured: boolean;
    name: string;
    photo_url?: string | null;
    role: string;
    sort_order: number;
    status: 'archived' | 'draft' | 'published';
    whatsapp_number?: string | null;
  };

  type MediaItem = { file_name: string; file_url: string; id: string; thumbnail_url?: string | null };
  type Option = { label: string; value: string };
  type Toast = { id: string; message: string; type: 'error' | 'success' };

  const statusOptions: Option[] = [
    { label: 'Draft', value: 'draft' },
    { label: 'Published', value: 'published' },
    { label: 'Archived', value: 'archived' }
  ];

  const featuredFilterOptions: Option[] = [
    { label: 'All', value: 'all' },
    { label: 'Featured only', value: 'true' },
    { label: 'Not featured', value: 'false' }
  ];

  const emptyForm = () => ({
    blurb: '',
    is_featured: false,
    name: '',
    photo_url: '',
    role: '',
    sort_order: '0',
    status: 'draft' as Specialist['status'],
    whatsapp_number: ''
  });

  let rows: Specialist[] = [];
  let mediaItems: MediaItem[] = [];

  let loading = true;
  let loadingMedia = false;
  let saving = false;
  let deleting = false;
  let error = '';

  let search = '';
  let statusFilter = 'all';
  let featuredFilter = 'all';

  let modalOpen = false;
  let confirmOpen = false;
  let editing: Specialist | null = null;
  let toDelete: Specialist | null = null;
  let form = emptyForm();
  let toasts: Toast[] = [];

  const showToast = (message: string, type: Toast['type'] = 'success') => {
    const id = crypto.randomUUID();
    toasts = [{ id, message, type }, ...toasts].slice(0, 4);
    setTimeout(() => { toasts = toasts.filter((t) => t.id !== id); }, 3500);
  };

  const dismissToast = (e: CustomEvent<string>) => { toasts = toasts.filter((t) => t.id !== e.detail); };

  const initials = (name: string) =>
    name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';

  const load = async () => {
    loading = true;
    error = '';
    try {
      const res = await api.specialists.list({
        search,
        status: statusFilter,
        is_featured: featuredFilter === 'all' ? undefined : featuredFilter,
        limit: 200
      });
      rows = res.data.items as unknown as Specialist[];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to load specialists.';
    } finally {
      loading = false;
    }
  };

  const loadMedia = async () => {
    if (mediaItems.length || loadingMedia) return;
    loadingMedia = true;
    try {
      const res = await api.media.list({ file_type: 'image', limit: 200 });
      mediaItems = (res.data.items as unknown as MediaItem[]).filter((m) => m.file_url);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to load media library.', 'error');
    } finally {
      loadingMedia = false;
    }
  };

  const openCreate = () => {
    editing = null;
    form = emptyForm();
    void loadMedia();
    modalOpen = true;
  };

  const openEdit = (s: Specialist) => {
    editing = s;
    form = {
      blurb: s.blurb ?? '',
      is_featured: s.is_featured,
      name: s.name,
      photo_url: s.photo_url ?? '',
      role: s.role,
      sort_order: String(s.sort_order ?? 0),
      status: s.status,
      whatsapp_number: s.whatsapp_number ?? ''
    };
    void loadMedia();
    modalOpen = true;
  };

  const closeModal = () => { modalOpen = false; editing = null; form = emptyForm(); };

  const payload = () => ({
    blurb: form.blurb.trim() || null,
    is_featured: form.is_featured,
    name: form.name.trim(),
    photo_url: form.photo_url.trim() || null,
    role: form.role.trim(),
    sort_order: Number(form.sort_order || 0),
    status: form.status,
    whatsapp_number: form.whatsapp_number.trim() || null
  });

  const save = async () => {
    if (form.name.trim().length < 2) { showToast('Name is required.', 'error'); return; }
    if (form.role.trim().length < 2) { showToast('Role is required.', 'error'); return; }
    saving = true;
    try {
      if (editing) {
        await api.specialists.update(editing.id, payload());
        showToast('Specialist updated successfully.');
      } else {
        await api.specialists.create(payload());
        showToast('Specialist created successfully.');
      }
      closeModal();
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to save specialist.', 'error');
    } finally {
      saving = false;
    }
  };

  const toggleFeatured = async (s: Specialist) => {
    try {
      await api.specialists.update(s.id, { is_featured: !s.is_featured });
      showToast(s.is_featured ? 'Removed from featured.' : 'Marked as featured.');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to update featured state.', 'error');
    }
  };

  const openDelete = (s: Specialist) => { toDelete = s; confirmOpen = true; };

  const confirmDelete = async () => {
    if (!toDelete) return;
    deleting = true;
    try {
      await api.specialists.remove(toDelete.id);
      showToast('Specialist deleted successfully.');
      confirmOpen = false;
      toDelete = null;
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to delete specialist.', 'error');
    } finally {
      deleting = false;
    }
  };

  onMount(async () => {
    await load();
  });
</script>

<ToastStack {toasts} on:dismiss={dismissToast} />

<div class="mx-auto grid w-full max-w-[1500px] gap-6">
  <AdminPageHeader
    eyebrow="Content Management"
    title="Specialists"
    description="Manage the named travel specialists that appear on tour pages and after enquiry — the human face of the brand."
    actionLabel="New Specialist"
    actionIcon={Plus}
    on:action={openCreate}
  />

  <AdminToolbar className="grid gap-3 lg:grid-cols-[1fr_repeat(2,150px)_auto] lg:items-end">
    <label class="grid gap-2 text-sm font-medium text-ink">
      <span>Search</span>
      <span class="flex h-11 items-center gap-2 rounded-2xl border border-ink/10 bg-surface px-3 shadow-sm transition focus-within:border-forest/45 focus-within:ring-2 focus-within:ring-forest/10">
        <Search size={16} class="text-ink/45" />
        <input class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink/35" bind:value={search} placeholder="Name, role, blurb..." on:keydown={(e) => e.key === 'Enter' && load()} />
      </span>
    </label>
    <AdminSelect label="Status" name="status_filter" bind:value={statusFilter} options={[{ label: 'All statuses', value: 'all' }, ...statusOptions]} />
    <AdminSelect label="Featured" name="featured_filter" bind:value={featuredFilter} options={featuredFilterOptions} />
    <AdminButton variant="secondary" on:click={load}>Apply</AdminButton>
  </AdminToolbar>

  {#if loading}
    <LoadingState message="Loading specialists..." />
  {:else if error}
    <ErrorState message={error} />
  {:else if rows.length === 0}
    <AdminEmptyState
      title="No specialists yet"
      message="Add your first travel specialist to put a trusted, human face on tour pages and enquiry follow-ups."
      actionLabel="New Specialist"
      icon={UsersRound}
      on:action={openCreate}
    />
  {:else}
    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {#each rows as s (s.id)}
        <article class="flex flex-col gap-4 rounded-none border border-ink/10 bg-surface p-5 shadow-[0_14px_44px_rgba(28,26,22,0.06)]" transition:fade={{ duration: 120 }}>
          <div class="flex items-start gap-3">
            {#if s.photo_url}
              <img class="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-ink/10" src={s.photo_url} alt={s.name} />
            {:else}
              <div class="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-forest/10 text-sm font-bold text-forest ring-1 ring-forest/15">
                {initials(s.name)}
              </div>
            {/if}
            <div class="min-w-0 flex-1">
              <p class="truncate font-bold text-ink">{s.name}</p>
              <p class="truncate text-xs text-ink/55">{s.role}</p>
            </div>
            {#if s.is_featured}
              <span class="flex shrink-0 items-center gap-1 rounded-full bg-goldfinch-gold px-2 py-0.5 text-[11px] font-bold text-heading">
                <Star size={10} fill="currentColor" />Featured
              </span>
            {/if}
          </div>

          {#if s.blurb}
            <p class="line-clamp-4 text-sm leading-6 text-ink/70">{s.blurb}</p>
          {/if}

          <div class="flex flex-wrap items-center gap-2">
            <StatusBadge status={s.status} />
            <span class="rounded-full bg-sand/70 px-2 py-0.5 text-[11px] font-semibold text-ink/55">Sort {s.sort_order}</span>
            {#if s.whatsapp_number}
              <span class="inline-flex items-center gap-1 rounded-full bg-forest/10 px-2 py-0.5 text-[11px] font-semibold text-forest">
                <MessageCircle size={10} />{s.whatsapp_number}
              </span>
            {/if}
          </div>

          <div class="mt-auto flex flex-wrap gap-2 border-t border-ink/10 pt-3">
            <button class="inline-flex h-9 items-center gap-1.5 rounded-xl bg-goldfinch-gold/15 px-3 text-xs font-semibold text-heading transition hover:bg-goldfinch-gold/30" type="button" on:click={() => toggleFeatured(s)}>
              <Star size={13} fill={s.is_featured ? 'currentColor' : 'none'} />
              {s.is_featured ? 'Unfeature' : 'Feature'}
            </button>
            <button class="inline-flex h-9 items-center gap-1.5 rounded-xl border border-ink/10 bg-surface px-3 text-xs font-semibold text-ink shadow-sm transition hover:border-goldfinch-gold/35 hover:bg-sand/70" type="button" on:click={() => openEdit(s)}>
              <Edit size={13} />Edit
            </button>
            <button class="inline-flex h-9 items-center gap-1.5 rounded-xl border border-red-200 bg-surface px-3 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-50" type="button" on:click={() => openDelete(s)}>
              <Trash2 size={13} />Delete
            </button>
          </div>
        </article>
      {/each}
    </div>
  {/if}
</div>

{#if modalOpen}
  <div class="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4 backdrop-blur-sm" transition:fade={{ duration: 140 }}>
    <form
      class="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-none border border-ink/10 bg-surface p-6 shadow-[0_24px_80px_rgba(28,26,22,0.18)]"
      transition:scale={{ duration: 160, start: 0.98 }}
      on:submit|preventDefault={save}
    >
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">{editing ? 'Edit specialist' : 'New specialist'}</p>
          <h2 class="mt-1 text-2xl font-bold text-ink">{editing ? 'Update specialist' : 'Add specialist'}</h2>
        </div>
        <button class="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-ink/10 bg-surface text-ink shadow-sm transition hover:bg-sand" type="button" aria-label="Close" on:click={closeModal}>
          <X size={18} />
        </button>
      </div>

      <div class="mt-6 grid gap-4">
        <div class="grid gap-4 sm:grid-cols-2">
          <AdminFormInput label="Name" name="name" bind:value={form.name} placeholder="e.g. Amani Mushi" required />
          <AdminFormInput label="Role" name="role" bind:value={form.role} placeholder="e.g. Safari & Kilimanjaro Specialist" required />
        </div>

        <AdminTextArea label="Blurb" name="blurb" bind:value={form.blurb} rows={4} placeholder="Short bio shown to travellers on tour pages and after enquiry." />

        <!-- photo -->
        <div class="rounded-none border border-ink/10 bg-sand/25 p-4">
          <MediaPicker label="Photo" media={mediaItems} uploadFolder="specialists" aspect="aspect-square" bind:value={form.photo_url} />
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <AdminFormInput label="WhatsApp number" name="whatsapp_number" bind:value={form.whatsapp_number} placeholder="e.g. +255 712 345 678" />
          <AdminSelect label="Status" name="status" bind:value={form.status} options={statusOptions} />
        </div>

        <div class="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <AdminFormInput label="Sort order" name="sort_order" type="number" bind:value={form.sort_order} />
          <label class="flex h-11 cursor-pointer items-center gap-3 rounded-2xl border border-ink/10 bg-surface px-4 transition hover:bg-sand/30">
            <input class="h-4 w-4 accent-forest" type="checkbox" bind:checked={form.is_featured} />
            <span class="text-sm font-semibold text-ink">Featured specialist</span>
          </label>
        </div>
      </div>

      <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <AdminButton variant="secondary" type="button" on:click={closeModal}>Cancel</AdminButton>
        <AdminButton type="submit" disabled={saving}>
          {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Specialist'}
        </AdminButton>
      </div>
    </form>
  </div>
{/if}

<ConfirmModal
  open={confirmOpen}
  title="Delete specialist"
  message={`Delete "${toDelete?.name ?? 'this specialist'}"? This action soft-deletes the record.`}
  on:cancel={() => { confirmOpen = false; toDelete = null; }}
  on:confirm={confirmDelete}
/>

{#if deleting}
  <div class="fixed bottom-4 right-4 z-[70] rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(28,26,22,0.18)]">
    Deleting specialist...
  </div>
{/if}
