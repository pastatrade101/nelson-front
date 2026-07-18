<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { Edit, Plane, Plus, Search, Trash2, X } from '@lucide/svelte';
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

  type TripPoint = {
    id: string;
    name: string;
    slug: string;
    destination_id?: string | null;
    destinations?: { name: string; slug: string } | null;
    role: 'start' | 'end' | 'both';
    gateway_type: 'airport' | 'city' | 'hotel' | 'border' | 'station';
    airport_code?: string | null;
    description?: string | null;
    transfer_info?: string | null;
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
  const roleOptions = [
    { label: 'Start & end', value: 'both' },
    { label: 'Start only', value: 'start' },
    { label: 'End only', value: 'end' }
  ];
  const gatewayOptions = [
    { label: 'Airport', value: 'airport' },
    { label: 'City', value: 'city' },
    { label: 'Hotel', value: 'hotel' },
    { label: 'Border', value: 'border' },
    { label: 'Station', value: 'station' }
  ];
  const roleLabel = (v: string) => roleOptions.find((o) => o.value === v)?.label ?? v;
  const gatewayLabel = (v: string) => gatewayOptions.find((o) => o.value === v)?.label ?? v;

  const emptyForm = () => ({
    name: '',
    slug: '',
    destination_id: '',
    role: 'both' as TripPoint['role'],
    gateway_type: 'airport' as TripPoint['gateway_type'],
    airport_code: '',
    description: '',
    transfer_info: '',
    hero_image_url: '',
    image_url: '',
    status: 'draft' as TripPoint['status'],
    is_featured: false,
    sort_order: '0',
    seo_title: '',
    meta_description: ''
  });

  let rows: TripPoint[] = [];
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
  let editing: TripPoint | null = null;
  let toDelete: TripPoint | null = null;
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
      const res = await api.tripPoints.list({ search, status: statusFilter, limit: 100 });
      rows = res.data.items as TripPoint[];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to load trip points.';
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

  const openEdit = (p: TripPoint) => {
    editing = p;
    form = {
      name: p.name,
      slug: p.slug,
      destination_id: p.destination_id ?? '',
      role: p.role,
      gateway_type: p.gateway_type,
      airport_code: p.airport_code ?? '',
      description: p.description ?? '',
      transfer_info: p.transfer_info ?? '',
      hero_image_url: p.hero_image_url ?? '',
      image_url: p.image_url ?? '',
      status: p.status,
      is_featured: Boolean(p.is_featured),
      sort_order: p.sort_order != null ? String(p.sort_order) : '0',
      seo_title: p.seo_title ?? '',
      meta_description: p.meta_description ?? ''
    };
    slugManuallyEdited = true;
    modalOpen = true;
  };

  const closeModal = () => { modalOpen = false; editing = null; form = emptyForm(); slugManuallyEdited = false; };

  const save = async () => {
    if (!form.name.trim()) { showToast('Name is required.', 'error'); return; }
    saving = true;
    const sort = Number(form.sort_order);
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      destination_id: form.destination_id || null,
      role: form.role,
      gateway_type: form.gateway_type,
      airport_code: form.airport_code.trim() || null,
      description: form.description.trim() || null,
      transfer_info: form.transfer_info.trim() || null,
      hero_image_url: form.hero_image_url.trim() || null,
      image_url: form.image_url.trim() || null,
      status: form.status,
      is_featured: form.is_featured,
      sort_order: Number.isFinite(sort) ? sort : 0,
      seo_title: form.seo_title.trim() || null,
      meta_description: form.meta_description.trim() || null
    };
    try {
      if (editing) {
        await api.tripPoints.update(editing.id, payload);
        showToast('Trip point updated.');
      } else {
        await api.tripPoints.create(payload);
        showToast('Trip point created.');
      }
      closeModal();
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to save trip point.', 'error');
    } finally {
      saving = false;
    }
  };

  const openDelete = (p: TripPoint) => { toDelete = p; confirmOpen = true; };
  const confirmDelete = async () => {
    if (!toDelete) return;
    deleting = true;
    try {
      await api.tripPoints.remove(toDelete.id);
      showToast('Trip point deleted.');
      confirmOpen = false;
      toDelete = null;
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to delete trip point.', 'error');
    } finally {
      deleting = false;
    }
  };

  const fmt = (v?: string) => v ? new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(v)) : '-';

  onMount(() => { load(); loadDestinations(); });
</script>

<ToastStack {toasts} on:dismiss={dismissToast} />

<div class="mx-auto grid w-full max-w-[1500px] gap-6">
  <AdminPageHeader
    eyebrow="Tour Management"
    title="Start & End Points"
    description="Trip gateways — airports and hub cities where trips begin and end. Shown as 'Getting there' on destination pages."
    actionLabel="New Point"
    actionIcon={Plus}
    on:action={openCreate}
  />

  <AdminToolbar className="grid gap-3 md:grid-cols-[1fr_190px_auto] md:items-end">
    <label class="grid gap-2 text-sm font-medium text-ink">
      <span>Search</span>
      <span class="flex h-11 items-center gap-2 rounded-2xl border border-ink/10 bg-surface px-3 shadow-sm transition focus-within:border-forest/45 focus-within:ring-2 focus-within:ring-forest/10">
        <Search size={16} class="text-ink/45" />
        <input class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink/35" bind:value={search} placeholder="Search points..." on:keydown={(e) => e.key === 'Enter' && load()} />
      </span>
    </label>
    <AdminSelect label="Status" name="status_filter" bind:value={statusFilter} options={[{ label: 'All statuses', value: 'all' }, ...statusOptions]} />
    <AdminButton variant="secondary" on:click={load}>Apply</AdminButton>
  </AdminToolbar>

  {#if loading}
    <LoadingState message="Loading trip points..." />
  {:else if error}
    <ErrorState message={error} />
  {:else if rows.length === 0}
    <AdminEmptyState title="No trip points yet" message="Add your first gateway airport or hub city." actionLabel="New Point" icon={Plane} on:action={openCreate} />
  {:else}
    <div class="overflow-hidden rounded-none border border-ink/10 bg-surface shadow-[0_18px_50px_rgba(28,26,22,0.06)]">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[860px] text-sm">
          <thead class="bg-sand/70 text-xs uppercase tracking-[0.08em] text-ink/60">
            <tr>
              <th class="px-4 py-3 text-left font-semibold">Name</th>
              <th class="px-4 py-3 text-left font-semibold">Destination</th>
              <th class="px-4 py-3 text-left font-semibold">Role</th>
              <th class="px-4 py-3 text-left font-semibold">Type</th>
              <th class="px-4 py-3 text-left font-semibold">Status</th>
              <th class="px-4 py-3 text-left font-semibold">Updated</th>
              <th class="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-ink/10">
            {#each rows as p (p.id)}
              <tr class="transition hover:bg-sand/25">
                <td class="px-4 py-4">
                  <div class="font-semibold text-ink">{p.name}{#if p.airport_code}<span class="ml-2 rounded-md bg-forest/10 px-1.5 py-0.5 font-mono text-[11px] font-bold text-forest">{p.airport_code}</span>{/if}</div>
                  <p class="mt-0.5 font-mono text-xs text-ink/50">{p.slug}</p>
                </td>
                <td class="px-4 py-4 text-ink/60">{p.destinations?.name ?? '-'}</td>
                <td class="px-4 py-4 text-ink/60">{roleLabel(p.role)}</td>
                <td class="px-4 py-4 text-ink/60">{gatewayLabel(p.gateway_type)}</td>
                <td class="px-4 py-4"><StatusBadge status={p.status} /></td>
                <td class="px-4 py-4 text-ink/60">{fmt(p.updated_at ?? p.created_at)}</td>
                <td class="px-4 py-4">
                  <div class="flex justify-end gap-2">
                    <button class="inline-flex h-9 items-center gap-2 rounded-xl border border-ink/10 bg-surface px-3 text-xs font-semibold text-ink shadow-sm transition hover:border-goldfinch-gold/35 hover:bg-sand/70" type="button" on:click={() => openEdit(p)}>
                      <Edit size={14} />Edit
                    </button>
                    <button class="inline-flex h-9 items-center gap-2 rounded-xl border border-red-200 bg-surface px-3 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-50" type="button" on:click={() => openDelete(p)}>
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
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">{editing ? 'Edit point' : 'New point'}</p>
          <h2 class="mt-1 text-2xl font-bold text-ink">{editing ? editing.name : 'Create Trip Point'}</h2>
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

        <AdminSelect label="Destination" name="destination_id" bind:value={form.destination_id} options={destinationOptions} />

        <div class="grid gap-4 sm:grid-cols-3">
          <AdminSelect label="Role" name="role" bind:value={form.role} options={roleOptions} />
          <AdminSelect label="Gateway type" name="gateway_type" bind:value={form.gateway_type} options={gatewayOptions} />
          <AdminFormInput label="Airport code (IATA)" name="airport_code" bind:value={form.airport_code} placeholder="JRO" />
        </div>

        <AdminTextArea label="Description" name="description" bind:value={form.description} rows={3} placeholder="What this gateway is and who uses it." />
        <AdminTextArea label="Getting there / transfers" name="transfer_info" bind:value={form.transfer_info} rows={3} placeholder="Transfer times and how trips connect from here." />

        <div class="grid gap-4 sm:grid-cols-2">
          <AdminFormInput label="Hero image URL" name="hero_image_url" bind:value={form.hero_image_url} placeholder="https://..." />
          <AdminFormInput label="Card image URL" name="image_url" bind:value={form.image_url} placeholder="https://..." />
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
        <AdminButton type="submit" disabled={saving}>
          {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Point'}
        </AdminButton>
      </div>
    </form>
  </div>
{/if}

<ConfirmModal
  open={confirmOpen}
  title="Delete trip point"
  message={`Delete "${toDelete?.name ?? 'this point'}"? This soft-deletes the record.`}
  on:cancel={() => { confirmOpen = false; toDelete = null; }}
  on:confirm={confirmDelete}
/>

{#if deleting}
  <div class="fixed bottom-4 right-4 z-[70] rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(28,26,22,0.18)]">
    Deleting trip point...
  </div>
{/if}
