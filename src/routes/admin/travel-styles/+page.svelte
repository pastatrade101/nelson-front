<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { Edit, Heart, Plus, Search, Trash2, X } from '@lucide/svelte';
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

  type TravelStyle = {
    id: string;
    name: string;
    slug: string;
    emotional_promise?: string | null;
    description?: string | null;
    desires?: string[] | null;
    concerns?: string[] | null;
    persona?: string | null;
    hero_image_url?: string | null;
    image_url?: string | null;
    status: 'archived' | 'draft' | 'published';
    is_featured?: boolean;
    sort_order?: number | null;
    seo_title?: string | null;
    meta_description?: string | null;
    created_at?: string;
    updated_at?: string;
  };

  type Toast = { id: string; message: string; type: 'error' | 'success' };

  const statusOptions = [
    { label: 'Draft', value: 'draft' },
    { label: 'Published', value: 'published' },
    { label: 'Archived', value: 'archived' }
  ];
  const personaOptions = [
    { label: 'None', value: '' },
    { label: 'Family', value: 'family' },
    { label: 'Couple', value: 'couple' },
    { label: 'Group', value: 'group' },
    { label: 'Solo', value: 'solo' }
  ];

  const emptyForm = () => ({
    name: '',
    slug: '',
    emotional_promise: '',
    description: '',
    desires: '',
    concerns: '',
    persona: '',
    hero_image_url: '',
    image_url: '',
    status: 'draft' as TravelStyle['status'],
    is_featured: false,
    sort_order: '0',
    seo_title: '',
    meta_description: ''
  });

  let rows: TravelStyle[] = [];
  let loading = true;
  let saving = false;
  let deleting = false;
  let error = '';
  let search = '';
  let statusFilter = 'all';
  let modalOpen = false;
  let confirmOpen = false;
  let slugManuallyEdited = false;
  let editing: TravelStyle | null = null;
  let toDelete: TravelStyle | null = null;
  let form = emptyForm();
  let toasts: Toast[] = [];

  const slugify = (v: string) => v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  $: if (modalOpen && !slugManuallyEdited) form.slug = slugify(form.name);

  const showToast = (message: string, type: Toast['type'] = 'success') => {
    const id = crypto.randomUUID();
    toasts = [{ id, message, type }, ...toasts].slice(0, 4);
    setTimeout(() => { toasts = toasts.filter((t) => t.id !== id); }, 3500);
  };
  const dismissToast = (e: CustomEvent<string>) => { toasts = toasts.filter((t) => t.id !== e.detail); };

  const load = async () => {
    loading = true;
    error = '';
    try {
      const res = await api.travelStyles.list({ search, status: statusFilter, limit: 100 });
      rows = res.data.items as TravelStyle[];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to load travel styles.';
    } finally {
      loading = false;
    }
  };

  const openCreate = () => { editing = null; form = emptyForm(); slugManuallyEdited = false; modalOpen = true; };

  const openEdit = (s: TravelStyle) => {
    editing = s;
    form = {
      name: s.name,
      slug: s.slug,
      emotional_promise: s.emotional_promise ?? '',
      description: s.description ?? '',
      desires: (s.desires ?? []).join('\n'),
      concerns: (s.concerns ?? []).join('\n'),
      persona: s.persona ?? '',
      hero_image_url: s.hero_image_url ?? '',
      image_url: s.image_url ?? '',
      status: s.status,
      is_featured: Boolean(s.is_featured),
      sort_order: s.sort_order != null ? String(s.sort_order) : '0',
      seo_title: s.seo_title ?? '',
      meta_description: s.meta_description ?? ''
    };
    slugManuallyEdited = true;
    modalOpen = true;
  };

  const closeModal = () => { modalOpen = false; editing = null; form = emptyForm(); slugManuallyEdited = false; };
  const lines = (v: string) => v.split('\n').map((x) => x.trim()).filter(Boolean);

  const save = async () => {
    if (!form.name.trim()) { showToast('Name is required.', 'error'); return; }
    saving = true;
    const sort = Number(form.sort_order);
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      emotional_promise: form.emotional_promise.trim() || null,
      description: form.description.trim() || null,
      desires: lines(form.desires),
      concerns: lines(form.concerns),
      persona: form.persona || null,
      hero_image_url: form.hero_image_url.trim() || null,
      image_url: form.image_url.trim() || null,
      status: form.status,
      is_featured: form.is_featured,
      sort_order: Number.isFinite(sort) ? sort : 0,
      seo_title: form.seo_title.trim() || null,
      meta_description: form.meta_description.trim() || null
    };
    try {
      if (editing) { await api.travelStyles.update(editing.id, payload); showToast('Travel style updated.'); }
      else { await api.travelStyles.create(payload); showToast('Travel style created.'); }
      closeModal();
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to save travel style.', 'error');
    } finally {
      saving = false;
    }
  };

  const openDelete = (s: TravelStyle) => { toDelete = s; confirmOpen = true; };
  const confirmDelete = async () => {
    if (!toDelete) return;
    deleting = true;
    try {
      await api.travelStyles.remove(toDelete.id);
      showToast('Travel style deleted.');
      confirmOpen = false; toDelete = null; await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to delete travel style.', 'error');
    } finally {
      deleting = false;
    }
  };

  const fmt = (v?: string) => v ? new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(v)) : '-';
  onMount(load);
</script>

<ToastStack {toasts} on:dismiss={dismissToast} />

<div class="mx-auto grid w-full max-w-[1500px] gap-6">
  <AdminPageHeader
    eyebrow="Content"
    title="Travel Styles"
    description="Persona-led landing pages (honeymoon, family, luxury…) shown at /travel-styles."
    actionLabel="New Style"
    actionIcon={Plus}
    on:action={openCreate}
  />

  <AdminToolbar className="grid gap-3 md:grid-cols-[1fr_190px_auto] md:items-end">
    <label class="grid gap-2 text-sm font-medium text-ink">
      <span>Search</span>
      <span class="flex h-11 items-center gap-2 rounded-2xl border border-ink/10 bg-surface px-3 shadow-sm transition focus-within:border-forest/45 focus-within:ring-2 focus-within:ring-forest/10">
        <Search size={16} class="text-ink/45" />
        <input class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink/35" bind:value={search} placeholder="Search styles..." on:keydown={(e) => e.key === 'Enter' && load()} />
      </span>
    </label>
    <AdminSelect label="Status" name="status_filter" bind:value={statusFilter} options={[{ label: 'All statuses', value: 'all' }, ...statusOptions]} />
    <AdminButton variant="secondary" on:click={load}>Apply</AdminButton>
  </AdminToolbar>

  {#if loading}
    <LoadingState message="Loading travel styles..." />
  {:else if error}
    <ErrorState message={error} />
  {:else if rows.length === 0}
    <AdminEmptyState title="No travel styles yet" message="Add your first travel style." actionLabel="New Style" icon={Heart} on:action={openCreate} />
  {:else}
    <div class="overflow-hidden rounded-none border border-ink/10 bg-surface shadow-[0_18px_50px_rgba(28,26,22,0.06)]">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[720px] text-sm">
          <thead class="bg-sand/70 text-xs uppercase tracking-[0.08em] text-ink/60">
            <tr>
              <th class="px-4 py-3 text-left font-semibold">Name</th>
              <th class="px-4 py-3 text-left font-semibold">Persona</th>
              <th class="px-4 py-3 text-left font-semibold">Order</th>
              <th class="px-4 py-3 text-left font-semibold">Status</th>
              <th class="px-4 py-3 text-left font-semibold">Updated</th>
              <th class="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-ink/10">
            {#each rows as s (s.id)}
              <tr class="transition hover:bg-sand/25">
                <td class="px-4 py-4">
                  <div class="font-semibold text-ink">{s.name}{#if s.is_featured}<span class="ml-2 rounded-full bg-goldfinch-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-goldfinch-gold">Featured</span>{/if}</div>
                  <p class="mt-0.5 font-mono text-xs text-ink/50">{s.slug}</p>
                </td>
                <td class="px-4 py-4 text-ink/60 capitalize">{s.persona ?? '-'}</td>
                <td class="px-4 py-4 text-ink/60">{s.sort_order ?? 0}</td>
                <td class="px-4 py-4"><StatusBadge status={s.status} /></td>
                <td class="px-4 py-4 text-ink/60">{fmt(s.updated_at ?? s.created_at)}</td>
                <td class="px-4 py-4">
                  <div class="flex justify-end gap-2">
                    <button class="inline-flex h-9 items-center gap-2 rounded-xl border border-ink/10 bg-surface px-3 text-xs font-semibold text-ink shadow-sm transition hover:border-goldfinch-gold/35 hover:bg-sand/70" type="button" on:click={() => openEdit(s)}>
                      <Edit size={14} />Edit
                    </button>
                    <button class="inline-flex h-9 items-center gap-2 rounded-xl border border-red-200 bg-surface px-3 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-50" type="button" on:click={() => openDelete(s)}>
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
  <div class="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4 backdrop-blur-sm" transition:fade={{ duration: 140 }}>
    <form
      class="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-none border border-ink/10 bg-surface p-6 shadow-[0_24px_80px_rgba(28,26,22,0.18)]"
      transition:scale={{ duration: 160, start: 0.98 }}
      on:submit|preventDefault={save}
    >
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">{editing ? 'Edit style' : 'New style'}</p>
          <h2 class="mt-1 text-2xl font-bold text-ink">{editing ? editing.name : 'Create Travel Style'}</h2>
        </div>
        <button class="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-ink/10 bg-surface text-ink shadow-sm transition hover:bg-sand" type="button" aria-label="Close" on:click={closeModal}>
          <X size={18} />
        </button>
      </div>

      <div class="mt-6 grid gap-4">
        <div class="grid gap-4 sm:grid-cols-2">
          <AdminFormInput label="Name" name="name" bind:value={form.name} required />
          <label class="grid gap-2 text-sm font-medium text-ink">
            <span>Slug</span>
            <input class="h-11 rounded-2xl border border-ink/10 bg-surface px-3 font-mono text-sm shadow-sm outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/15" name="slug" bind:value={form.slug} required on:input={() => (slugManuallyEdited = true)} />
          </label>
        </div>

        <AdminFormInput label="Emotional promise" name="emotional_promise" bind:value={form.emotional_promise} placeholder="The most romantic start to forever" />
        <AdminTextArea label="Description" name="description" bind:value={form.description} rows={3} />

        <div class="grid gap-4 sm:grid-cols-2">
          <AdminTextArea label="What they want (one per line)" name="desires" bind:value={form.desires} rows={4} />
          <AdminTextArea label="Concerns we plan around (one per line)" name="concerns" bind:value={form.concerns} rows={4} />
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <AdminSelect label="Linked persona" name="persona" bind:value={form.persona} options={personaOptions} />
          <AdminFormInput label="Hero image URL" name="hero_image_url" bind:value={form.hero_image_url} placeholder="https://..." />
        </div>

        <div class="grid gap-4 sm:grid-cols-3">
          <AdminSelect label="Status" name="status" bind:value={form.status} options={statusOptions} />
          <AdminFormInput label="Sort order" name="sort_order" type="number" bind:value={form.sort_order} />
          <label class="flex cursor-pointer items-center gap-3 self-end rounded-2xl border border-ink/10 bg-surface p-3">
            <input class="h-4 w-4 accent-forest" type="checkbox" bind:checked={form.is_featured} />
            <span class="text-sm font-semibold text-ink">Featured</span>
          </label>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <AdminFormInput label="SEO title" name="seo_title" bind:value={form.seo_title} />
          <AdminFormInput label="Meta description" name="meta_description" bind:value={form.meta_description} />
        </div>
      </div>

      <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <AdminButton variant="secondary" type="button" on:click={closeModal}>Cancel</AdminButton>
        <AdminButton type="submit" disabled={saving}>{saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Style'}</AdminButton>
      </div>
    </form>
  </div>
{/if}

<ConfirmModal
  open={confirmOpen}
  title="Delete travel style"
  message={`Delete "${toDelete?.name ?? 'this style'}"? This soft-deletes the record.`}
  on:cancel={() => { confirmOpen = false; toDelete = null; }}
  on:confirm={confirmDelete}
/>

{#if deleting}
  <div class="fixed bottom-4 right-4 z-[70] rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(28,26,22,0.18)]">Deleting travel style...</div>
{/if}
