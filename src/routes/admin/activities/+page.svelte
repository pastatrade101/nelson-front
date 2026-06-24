<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { Compass, Edit, Plus, Search, Trash2, X } from '@lucide/svelte';
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

  type Activity = {
    id: string;
    name: string;
    slug: string;
    destination_id?: string | null;
    destinations?: { name: string; slug: string } | null;
    location_label?: string | null;
    category: 'wildlife' | 'adventure' | 'cultural' | 'water' | 'trekking' | 'relaxation';
    difficulty?: 'easy' | 'moderate' | 'challenging' | 'strenuous' | null;
    description?: string | null;
    why_we_recommend?: string | null;
    highlights?: string[] | null;
    hero_image_url?: string | null;
    image_url?: string | null;
    duration_label?: string | null;
    price_from?: number | null;
    currency?: string | null;
    price_unit?: string | null;
    badge?: string | null;
    best_season?: string[] | null;
    status: 'archived' | 'draft' | 'published';
    is_featured?: boolean;
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
  const categoryOptions = [
    { label: 'Wildlife', value: 'wildlife' },
    { label: 'Adventure', value: 'adventure' },
    { label: 'Cultural', value: 'cultural' },
    { label: 'Water', value: 'water' },
    { label: 'Trekking', value: 'trekking' },
    { label: 'Relaxation', value: 'relaxation' }
  ];
  const difficultyOptions = [
    { label: 'Not set', value: '' },
    { label: 'Easy', value: 'easy' },
    { label: 'Moderate', value: 'moderate' },
    { label: 'Challenging', value: 'challenging' },
    { label: 'Strenuous', value: 'strenuous' }
  ];
  const catLabel = (v: string) => categoryOptions.find((o) => o.value === v)?.label ?? v;

  const emptyForm = () => ({
    name: '',
    slug: '',
    destination_id: '',
    location_label: '',
    category: 'wildlife' as Activity['category'],
    difficulty: '',
    description: '',
    why_we_recommend: '',
    highlights: '',
    hero_image_url: '',
    image_url: '',
    duration_label: '',
    price_from: '',
    currency: 'USD',
    price_unit: 'Per person',
    badge: '',
    best_season: '',
    status: 'draft' as Activity['status'],
    is_featured: false,
    seo_title: '',
    meta_description: ''
  });

  let rows: Activity[] = [];
  let destinationOptions: { label: string; value: string }[] = [{ label: 'No destination', value: '' }];
  let loading = true;
  let saving = false;
  let deleting = false;
  let error = '';
  let search = '';
  let statusFilter = 'all';
  let modalOpen = false;
  let confirmOpen = false;
  let slugManuallyEdited = false;
  let editing: Activity | null = null;
  let toDelete: Activity | null = null;
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

  const loadDestinations = async () => {
    try {
      const res = await api.destinations.list({ status: 'published', limit: 100 });
      const items = res.data.items as { id: string; name: string }[];
      destinationOptions = [{ label: 'No destination', value: '' }, ...items.map((d) => ({ label: d.name, value: d.id }))];
    } catch {
      destinationOptions = [{ label: 'No destination', value: '' }];
    }
  };

  const load = async () => {
    loading = true;
    error = '';
    try {
      const res = await api.activities.list({ search, status: statusFilter, limit: 100 });
      rows = res.data.items as Activity[];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to load activities.';
    } finally {
      loading = false;
    }
  };

  const openCreate = () => {
    editing = null;
    form = emptyForm();
    slugManuallyEdited = false;
    modalOpen = true;
  };

  const openEdit = (a: Activity) => {
    editing = a;
    form = {
      name: a.name,
      slug: a.slug,
      destination_id: a.destination_id ?? '',
      location_label: a.location_label ?? '',
      category: a.category,
      difficulty: a.difficulty ?? '',
      description: a.description ?? '',
      why_we_recommend: a.why_we_recommend ?? '',
      highlights: (a.highlights ?? []).join(', '),
      hero_image_url: a.hero_image_url ?? '',
      image_url: a.image_url ?? '',
      duration_label: a.duration_label ?? '',
      price_from: a.price_from != null ? String(a.price_from) : '',
      currency: a.currency ?? 'USD',
      price_unit: a.price_unit ?? 'Per person',
      badge: a.badge ?? '',
      best_season: (a.best_season ?? []).join(', '),
      status: a.status,
      is_featured: Boolean(a.is_featured),
      seo_title: a.seo_title ?? '',
      meta_description: a.meta_description ?? ''
    };
    slugManuallyEdited = true;
    modalOpen = true;
  };

  const closeModal = () => { modalOpen = false; editing = null; form = emptyForm(); slugManuallyEdited = false; };

  const numOrNull = (v: string) => { const n = Number(v); return v.trim() !== '' && Number.isFinite(n) ? n : null; };

  const save = async () => {
    if (!form.name.trim()) { showToast('Name is required.', 'error'); return; }
    saving = true;
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      destination_id: form.destination_id || null,
      location_label: form.location_label.trim() || null,
      category: form.category,
      difficulty: form.difficulty || null,
      description: form.description.trim() || null,
      why_we_recommend: form.why_we_recommend.trim() || null,
      highlights: form.highlights.split(',').map((s) => s.trim()).filter(Boolean),
      hero_image_url: form.hero_image_url.trim() || null,
      image_url: form.image_url.trim() || null,
      duration_label: form.duration_label.trim() || null,
      price_from: numOrNull(form.price_from),
      currency: form.currency.trim() || 'USD',
      price_unit: form.price_unit.trim() || null,
      badge: form.badge.trim() || null,
      best_season: form.best_season.split(',').map((s) => s.trim()).filter(Boolean),
      status: form.status,
      is_featured: form.is_featured,
      seo_title: form.seo_title.trim() || null,
      meta_description: form.meta_description.trim() || null
    };
    try {
      if (editing) {
        await api.activities.update(editing.id, payload);
        showToast('Activity updated.');
      } else {
        await api.activities.create(payload);
        showToast('Activity created.');
      }
      closeModal();
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to save activity.', 'error');
    } finally {
      saving = false;
    }
  };

  const openDelete = (a: Activity) => { toDelete = a; confirmOpen = true; };
  const confirmDelete = async () => {
    if (!toDelete) return;
    deleting = true;
    try {
      await api.activities.remove(toDelete.id);
      showToast('Activity deleted.');
      confirmOpen = false;
      toDelete = null;
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to delete activity.', 'error');
    } finally {
      deleting = false;
    }
  };

  const fmt = (v?: string) => v ? new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(v)) : '-';
  const price = (a: Activity) => a.price_from != null ? `${a.currency ?? 'USD'} ${Math.round(a.price_from).toLocaleString()}` : '-';

  onMount(() => { load(); loadDestinations(); });
</script>

<ToastStack {toasts} on:dismiss={dismissToast} />

<div class="mx-auto grid w-full max-w-[1500px] gap-6">
  <AdminPageHeader
    eyebrow="Tour Management"
    title="Activities"
    description="Things to do — surfaced as 'Top things to do' on destination pages and in the homepage Popular Activities slider."
    actionLabel="New Activity"
    actionIcon={Plus}
    on:action={openCreate}
  />

  <AdminToolbar className="grid gap-3 md:grid-cols-[1fr_190px_auto] md:items-end">
    <label class="grid gap-2 text-sm font-medium text-ink">
      <span>Search</span>
      <span class="flex h-11 items-center gap-2 rounded-2xl border border-ink/10 bg-surface px-3 shadow-sm transition focus-within:border-forest/45 focus-within:ring-2 focus-within:ring-forest/10">
        <Search size={16} class="text-ink/45" />
        <input class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink/35" bind:value={search} placeholder="Search activities..." on:keydown={(e) => e.key === 'Enter' && load()} />
      </span>
    </label>
    <AdminSelect label="Status" name="status_filter" bind:value={statusFilter} options={[{ label: 'All statuses', value: 'all' }, ...statusOptions]} />
    <AdminButton variant="secondary" on:click={load}>Apply</AdminButton>
  </AdminToolbar>

  {#if loading}
    <LoadingState message="Loading activities..." />
  {:else if error}
    <ErrorState message={error} />
  {:else if rows.length === 0}
    <AdminEmptyState title="No activities yet" message="Add your first thing to do." actionLabel="New Activity" icon={Compass} on:action={openCreate} />
  {:else}
    <div class="overflow-hidden rounded-[8px] border border-ink/10 bg-surface shadow-[0_18px_50px_rgba(15,47,36,0.06)]">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[860px] text-sm">
          <thead class="bg-sand/70 text-xs uppercase tracking-[0.08em] text-ink/60">
            <tr>
              <th class="px-4 py-3 text-left font-semibold">Name</th>
              <th class="px-4 py-3 text-left font-semibold">Location</th>
              <th class="px-4 py-3 text-left font-semibold">Category</th>
              <th class="px-4 py-3 text-left font-semibold">From</th>
              <th class="px-4 py-3 text-left font-semibold">Status</th>
              <th class="px-4 py-3 text-left font-semibold">Updated</th>
              <th class="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-ink/10">
            {#each rows as a (a.id)}
              <tr class="transition hover:bg-sand/25">
                <td class="px-4 py-4">
                  <div class="font-semibold text-ink">{a.name}{#if a.is_featured}<span class="ml-2 rounded-full bg-goldfinch-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-goldfinch-gold">Featured</span>{/if}</div>
                  <p class="mt-0.5 font-mono text-xs text-ink/50">{a.slug}</p>
                </td>
                <td class="px-4 py-4 text-ink/60">{a.location_label || a.destinations?.name || '-'}</td>
                <td class="px-4 py-4 text-ink/60">{catLabel(a.category)}</td>
                <td class="px-4 py-4 text-ink/60">{price(a)}</td>
                <td class="px-4 py-4"><StatusBadge status={a.status} /></td>
                <td class="px-4 py-4 text-ink/60">{fmt(a.updated_at ?? a.created_at)}</td>
                <td class="px-4 py-4">
                  <div class="flex justify-end gap-2">
                    <button class="inline-flex h-9 items-center gap-2 rounded-xl border border-ink/10 bg-surface px-3 text-xs font-semibold text-ink shadow-sm transition hover:border-goldfinch-gold/35 hover:bg-sand/70" type="button" on:click={() => openEdit(a)}>
                      <Edit size={14} />Edit
                    </button>
                    <button class="inline-flex h-9 items-center gap-2 rounded-xl border border-red-200 bg-surface px-3 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-50" type="button" on:click={() => openDelete(a)}>
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
      class="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[10px] border border-ink/10 bg-surface p-6 shadow-[0_24px_80px_rgba(15,47,36,0.18)]"
      transition:scale={{ duration: 160, start: 0.98 }}
      on:submit|preventDefault={save}
    >
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">{editing ? 'Edit activity' : 'New activity'}</p>
          <h2 class="mt-1 text-2xl font-bold text-ink">{editing ? editing.name : 'Create Activity'}</h2>
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

        <div class="grid gap-4 sm:grid-cols-2">
          <AdminSelect label="Destination" name="destination_id" bind:value={form.destination_id} options={destinationOptions} />
          <AdminFormInput label="Location label" name="location_label" bind:value={form.location_label} placeholder="Serengeti National Park" />
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <AdminSelect label="Category" name="category" bind:value={form.category} options={categoryOptions} />
          <AdminSelect label="Difficulty" name="difficulty" bind:value={form.difficulty} options={difficultyOptions} />
        </div>

        <AdminTextArea label="Description" name="description" bind:value={form.description} rows={3} placeholder="What the activity involves." />
        <AdminTextArea label="Why we recommend it" name="why_we_recommend" bind:value={form.why_we_recommend} rows={2} placeholder="Our honest take for travellers." />
        <AdminFormInput label="Highlights (comma-separated)" name="highlights" bind:value={form.highlights} placeholder="Big Five, Picnic lunch, Photography" />

        <div class="grid gap-4 sm:grid-cols-2">
          <AdminFormInput label="Hero image URL" name="hero_image_url" bind:value={form.hero_image_url} placeholder="https://..." />
          <AdminFormInput label="Card image URL" name="image_url" bind:value={form.image_url} placeholder="https://..." />
        </div>

        <div class="grid gap-4 sm:grid-cols-3">
          <AdminFormInput label="Duration label" name="duration_label" bind:value={form.duration_label} placeholder="Full day" />
          <AdminFormInput label="Price from" name="price_from" type="number" bind:value={form.price_from} placeholder="250" />
          <AdminFormInput label="Currency" name="currency" bind:value={form.currency} placeholder="USD" />
        </div>

        <div class="grid gap-4 sm:grid-cols-3">
          <AdminFormInput label="Price unit" name="price_unit" bind:value={form.price_unit} placeholder="Per person" />
          <AdminFormInput label="Badge" name="badge" bind:value={form.badge} placeholder="Popular" />
          <AdminFormInput label="Best season (comma-separated)" name="best_season" bind:value={form.best_season} placeholder="June, July, August" />
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <AdminSelect label="Status" name="status" bind:value={form.status} options={statusOptions} />
          <label class="flex cursor-pointer items-center gap-3 self-end rounded-2xl border border-ink/10 bg-surface p-3">
            <input class="h-4 w-4 accent-forest" type="checkbox" bind:checked={form.is_featured} />
            <span class="text-sm font-semibold text-ink">Featured (shows in homepage slider)</span>
          </label>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <AdminFormInput label="SEO title" name="seo_title" bind:value={form.seo_title} />
          <AdminFormInput label="Meta description" name="meta_description" bind:value={form.meta_description} />
        </div>
      </div>

      <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <AdminButton variant="secondary" type="button" on:click={closeModal}>Cancel</AdminButton>
        <AdminButton type="submit" disabled={saving}>
          {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Activity'}
        </AdminButton>
      </div>
    </form>
  </div>
{/if}

<ConfirmModal
  open={confirmOpen}
  title="Delete activity"
  message={`Delete "${toDelete?.name ?? 'this activity'}"? This soft-deletes the record.`}
  on:cancel={() => { confirmOpen = false; toDelete = null; }}
  on:confirm={confirmDelete}
/>

{#if deleting}
  <div class="fixed bottom-4 right-4 z-[70] rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(15,47,36,0.18)]">
    Deleting activity...
  </div>
{/if}
