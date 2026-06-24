<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { Edit, MapPin, Plus, Search, Trash2, X } from '@lucide/svelte';
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

  type Country = {
    id: string;
    name: string;
    slug: string;
    hero_image_url?: string | null;
    intro_text?: string | null;
    best_months?: string[] | null;
    visa_info?: string | null;
    health_info?: string | null;
    currency?: string | null;
    capital?: string | null;
    phase: string;
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
  const phaseOptions = [
    { label: 'Live', value: 'live' },
    { label: 'Planned', value: 'planned' },
    { label: 'Future', value: 'future' }
  ];

  const emptyForm = () => ({
    name: '',
    slug: '',
    hero_image_url: '',
    intro_text: '',
    best_months: '',
    visa_info: '',
    health_info: '',
    currency: '',
    capital: '',
    phase: 'live',
    status: 'draft' as Country['status'],
    is_featured: false,
    seo_title: '',
    meta_description: ''
  });

  let rows: Country[] = [];
  let loading = true;
  let saving = false;
  let deleting = false;
  let error = '';
  let search = '';
  let statusFilter = 'all';
  let modalOpen = false;
  let confirmOpen = false;
  let slugManuallyEdited = false;
  let editing: Country | null = null;
  let toDelete: Country | null = null;
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
      const res = await api.countries.list({ search, status: statusFilter, limit: 100 });
      rows = res.data.items as Country[];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to load countries.';
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

  const openEdit = (c: Country) => {
    editing = c;
    form = {
      name: c.name,
      slug: c.slug,
      hero_image_url: c.hero_image_url ?? '',
      intro_text: c.intro_text ?? '',
      best_months: (c.best_months ?? []).join(', '),
      visa_info: c.visa_info ?? '',
      health_info: c.health_info ?? '',
      currency: c.currency ?? '',
      capital: c.capital ?? '',
      phase: c.phase ?? 'live',
      status: c.status,
      is_featured: Boolean(c.is_featured),
      seo_title: c.seo_title ?? '',
      meta_description: c.meta_description ?? ''
    };
    slugManuallyEdited = true;
    modalOpen = true;
  };

  const closeModal = () => { modalOpen = false; editing = null; form = emptyForm(); slugManuallyEdited = false; };

  const save = async () => {
    if (!form.name.trim()) { showToast('Name is required.', 'error'); return; }
    saving = true;
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      hero_image_url: form.hero_image_url.trim() || null,
      intro_text: form.intro_text.trim() || null,
      best_months: form.best_months.split(',').map((s) => s.trim()).filter(Boolean),
      visa_info: form.visa_info.trim() || null,
      health_info: form.health_info.trim() || null,
      currency: form.currency.trim() || null,
      capital: form.capital.trim() || null,
      phase: form.phase,
      status: form.status,
      is_featured: form.is_featured,
      seo_title: form.seo_title.trim() || null,
      meta_description: form.meta_description.trim() || null
    };
    try {
      if (editing) {
        await api.countries.update(editing.id, payload);
        showToast('Country updated.');
      } else {
        await api.countries.create(payload);
        showToast('Country created.');
      }
      closeModal();
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to save country.', 'error');
    } finally {
      saving = false;
    }
  };

  const openDelete = (c: Country) => { toDelete = c; confirmOpen = true; };
  const confirmDelete = async () => {
    if (!toDelete) return;
    deleting = true;
    try {
      await api.countries.remove(toDelete.id);
      showToast('Country deleted.');
      confirmOpen = false;
      toDelete = null;
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to delete country.', 'error');
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
    eyebrow="Tour Management"
    title="Countries"
    description="Country hub pages — intro, best time to visit, visa and health guidance for the public country pages."
    actionLabel="New Country"
    actionIcon={Plus}
    on:action={openCreate}
  />

  <AdminToolbar className="grid gap-3 md:grid-cols-[1fr_190px_auto] md:items-end">
    <label class="grid gap-2 text-sm font-medium text-ink">
      <span>Search</span>
      <span class="flex h-11 items-center gap-2 rounded-2xl border border-ink/10 bg-surface px-3 shadow-sm transition focus-within:border-forest/45 focus-within:ring-2 focus-within:ring-forest/10">
        <Search size={16} class="text-ink/45" />
        <input class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink/35" bind:value={search} placeholder="Search countries..." on:keydown={(e) => e.key === 'Enter' && load()} />
      </span>
    </label>
    <AdminSelect label="Status" name="status_filter" bind:value={statusFilter} options={[{ label: 'All statuses', value: 'all' }, ...statusOptions]} />
    <AdminButton variant="secondary" on:click={load}>Apply</AdminButton>
  </AdminToolbar>

  {#if loading}
    <LoadingState message="Loading countries..." />
  {:else if error}
    <ErrorState message={error} />
  {:else if rows.length === 0}
    <AdminEmptyState title="No countries yet" message="Create your first country hub page." actionLabel="New Country" icon={MapPin} on:action={openCreate} />
  {:else}
    <div class="overflow-hidden rounded-[8px] border border-ink/10 bg-surface shadow-[0_18px_50px_rgba(15,47,36,0.06)]">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[760px] text-sm">
          <thead class="bg-sand/70 text-xs uppercase tracking-[0.08em] text-ink/60">
            <tr>
              <th class="px-4 py-3 text-left font-semibold">Name</th>
              <th class="px-4 py-3 text-left font-semibold">Slug</th>
              <th class="px-4 py-3 text-left font-semibold">Phase</th>
              <th class="px-4 py-3 text-left font-semibold">Status</th>
              <th class="px-4 py-3 text-left font-semibold">Updated</th>
              <th class="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-ink/10">
            {#each rows as c (c.id)}
              <tr class="transition hover:bg-sand/25">
                <td class="px-4 py-4">
                  <div class="font-semibold text-ink">{c.name}</div>
                  {#if c.capital}<p class="mt-0.5 text-xs text-ink/50">{c.capital}{c.currency ? ` · ${c.currency}` : ''}</p>{/if}
                </td>
                <td class="px-4 py-4 font-mono text-xs text-ink/60">{c.slug}</td>
                <td class="px-4 py-4 text-ink/60 capitalize">{c.phase}</td>
                <td class="px-4 py-4"><StatusBadge status={c.status} /></td>
                <td class="px-4 py-4 text-ink/60">{fmt(c.updated_at ?? c.created_at)}</td>
                <td class="px-4 py-4">
                  <div class="flex justify-end gap-2">
                    <button class="inline-flex h-9 items-center gap-2 rounded-xl border border-ink/10 bg-surface px-3 text-xs font-semibold text-ink shadow-sm transition hover:border-goldfinch-gold/35 hover:bg-sand/70" type="button" on:click={() => openEdit(c)}>
                      <Edit size={14} />Edit
                    </button>
                    <button class="inline-flex h-9 items-center gap-2 rounded-xl border border-red-200 bg-surface px-3 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-50" type="button" on:click={() => openDelete(c)}>
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
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">{editing ? 'Edit country' : 'New country'}</p>
          <h2 class="mt-1 text-2xl font-bold text-ink">{editing ? editing.name : 'Create Country'}</h2>
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

        <AdminFormInput label="Hero image URL" name="hero_image_url" bind:value={form.hero_image_url} placeholder="https://..." />
        <AdminTextArea label="Intro" name="intro_text" bind:value={form.intro_text} rows={3} placeholder="Honest overview of the country." />
        <AdminFormInput label="Best months (comma-separated)" name="best_months" bind:value={form.best_months} placeholder="June, July, August" />

        <div class="grid gap-4 sm:grid-cols-2">
          <AdminTextArea label="Visa & entry" name="visa_info" bind:value={form.visa_info} rows={3} />
          <AdminTextArea label="Health" name="health_info" bind:value={form.health_info} rows={3} />
        </div>

        <div class="grid gap-4 sm:grid-cols-3">
          <AdminFormInput label="Capital" name="capital" bind:value={form.capital} />
          <AdminFormInput label="Currency" name="currency" bind:value={form.currency} placeholder="TZS" />
          <AdminSelect label="Phase" name="phase" bind:value={form.phase} options={phaseOptions} />
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <AdminSelect label="Status" name="status" bind:value={form.status} options={statusOptions} />
          <label class="flex cursor-pointer items-center gap-3 self-end rounded-2xl border border-ink/10 bg-surface p-3">
            <input class="h-4 w-4 accent-forest" type="checkbox" bind:checked={form.is_featured} />
            <span class="text-sm font-semibold text-ink">Featured country</span>
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
          {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Country'}
        </AdminButton>
      </div>
    </form>
  </div>
{/if}

<ConfirmModal
  open={confirmOpen}
  title="Delete country"
  message={`Delete "${toDelete?.name ?? 'this country'}"? This soft-deletes the record.`}
  on:cancel={() => { confirmOpen = false; toDelete = null; }}
  on:confirm={confirmDelete}
/>

{#if deleting}
  <div class="fixed bottom-4 right-4 z-[70] rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(15,47,36,0.18)]">
    Deleting country...
  </div>
{/if}
