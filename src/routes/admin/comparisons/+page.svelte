<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { Edit, GitCompare, Plus, Search, Trash2, X } from '@lucide/svelte';
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

  type Dim = { label: string; a: string; b: string };
  type Faq = { q: string; a: string };
  type Comparison = {
    id: string;
    title: string;
    slug: string;
    eyebrow?: string | null;
    intro?: string | null;
    a_name: string;
    a_image_url?: string | null;
    b_name: string;
    b_image_url?: string | null;
    dimensions?: Dim[] | null;
    verdict?: string | null;
    cta_label?: string | null;
    cta_href?: string | null;
    faqs?: Faq[] | null;
    status: 'archived' | 'draft' | 'published';
    is_featured?: boolean;
    sort_order?: number | null;
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

  const emptyForm = () => ({
    title: '',
    slug: '',
    eyebrow: '',
    intro: '',
    a_name: '',
    a_image_url: '',
    b_name: '',
    b_image_url: '',
    dimensions: '',
    verdict: '',
    cta_label: '',
    cta_href: '',
    faqs: '',
    status: 'draft' as Comparison['status'],
    is_featured: false,
    sort_order: '0',
    meta_description: ''
  });

  let rows: Comparison[] = [];
  let loading = true;
  let saving = false;
  let deleting = false;
  let error = '';
  let search = '';
  let statusFilter = 'all';
  let modalOpen = false;
  let confirmOpen = false;
  let slugManuallyEdited = false;
  let editing: Comparison | null = null;
  let toDelete: Comparison | null = null;
  let form = emptyForm();
  let toasts: Toast[] = [];

  const slugify = (v: string) => v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  $: if (modalOpen && !slugManuallyEdited) form.slug = slugify(form.title);

  const showToast = (message: string, type: Toast['type'] = 'success') => {
    const id = crypto.randomUUID();
    toasts = [{ id, message, type }, ...toasts].slice(0, 4);
    setTimeout(() => { toasts = toasts.filter((t) => t.id !== id); }, 3500);
  };
  const dismissToast = (e: CustomEvent<string>) => { toasts = toasts.filter((t) => t.id !== e.detail); };

  // dimensions <-> "label :: a :: b" lines
  const dimsToText = (d: Dim[]) => d.map((x) => `${x.label} :: ${x.a} :: ${x.b}`).join('\n');
  const textToDims = (v: string): Dim[] =>
    v.split('\n').map((l) => l.split('::').map((p) => p.trim())).filter((p) => p[0]).map((p) => ({ label: p[0] ?? '', a: p[1] ?? '', b: p[2] ?? '' }));
  // faqs <-> "q :: a" lines
  const faqsToText = (f: Faq[]) => f.map((x) => `${x.q} :: ${x.a}`).join('\n');
  const textToFaqs = (v: string): Faq[] =>
    v.split('\n').map((l) => l.split('::').map((p) => p.trim())).filter((p) => p[0]).map((p) => ({ q: p[0] ?? '', a: p[1] ?? '' }));

  const load = async () => {
    loading = true;
    error = '';
    try {
      const res = await api.comparisons.list({ search, status: statusFilter, limit: 100 });
      rows = res.data.items as Comparison[];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to load comparisons.';
    } finally {
      loading = false;
    }
  };

  const openCreate = () => { editing = null; form = emptyForm(); slugManuallyEdited = false; modalOpen = true; };

  const openEdit = (c: Comparison) => {
    editing = c;
    form = {
      title: c.title,
      slug: c.slug,
      eyebrow: c.eyebrow ?? '',
      intro: c.intro ?? '',
      a_name: c.a_name,
      a_image_url: c.a_image_url ?? '',
      b_name: c.b_name,
      b_image_url: c.b_image_url ?? '',
      dimensions: dimsToText(c.dimensions ?? []),
      verdict: c.verdict ?? '',
      cta_label: c.cta_label ?? '',
      cta_href: c.cta_href ?? '',
      faqs: faqsToText(c.faqs ?? []),
      status: c.status,
      is_featured: Boolean(c.is_featured),
      sort_order: c.sort_order != null ? String(c.sort_order) : '0',
      meta_description: c.meta_description ?? ''
    };
    slugManuallyEdited = true;
    modalOpen = true;
  };

  const closeModal = () => { modalOpen = false; editing = null; form = emptyForm(); slugManuallyEdited = false; };

  const save = async () => {
    if (!form.title.trim()) { showToast('Title is required.', 'error'); return; }
    if (!form.a_name.trim() || !form.b_name.trim()) { showToast('Both option names are required.', 'error'); return; }
    saving = true;
    const sort = Number(form.sort_order);
    const payload = {
      title: form.title.trim(),
      slug: form.slug.trim(),
      eyebrow: form.eyebrow.trim() || null,
      intro: form.intro.trim() || null,
      a_name: form.a_name.trim(),
      a_image_url: form.a_image_url.trim() || null,
      b_name: form.b_name.trim(),
      b_image_url: form.b_image_url.trim() || null,
      dimensions: textToDims(form.dimensions),
      verdict: form.verdict.trim() || null,
      cta_label: form.cta_label.trim() || null,
      cta_href: form.cta_href.trim() || null,
      faqs: textToFaqs(form.faqs),
      status: form.status,
      is_featured: form.is_featured,
      sort_order: Number.isFinite(sort) ? sort : 0,
      meta_description: form.meta_description.trim() || null
    };
    try {
      if (editing) { await api.comparisons.update(editing.id, payload); showToast('Comparison updated.'); }
      else { await api.comparisons.create(payload); showToast('Comparison created.'); }
      closeModal();
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to save comparison.', 'error');
    } finally {
      saving = false;
    }
  };

  const openDelete = (c: Comparison) => { toDelete = c; confirmOpen = true; };
  const confirmDelete = async () => {
    if (!toDelete) return;
    deleting = true;
    try {
      await api.comparisons.remove(toDelete.id);
      showToast('Comparison deleted.');
      confirmOpen = false; toDelete = null; await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to delete comparison.', 'error');
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
    title="Comparisons"
    description="Decision-stage 'X vs Y' pages shown at /compare."
    actionLabel="New Comparison"
    actionIcon={Plus}
    on:action={openCreate}
  />

  <AdminToolbar className="grid gap-3 md:grid-cols-[1fr_190px_auto] md:items-end">
    <label class="grid gap-2 text-sm font-medium text-ink">
      <span>Search</span>
      <span class="flex h-11 items-center gap-2 rounded-2xl border border-ink/10 bg-surface px-3 shadow-sm transition focus-within:border-forest/45 focus-within:ring-2 focus-within:ring-forest/10">
        <Search size={16} class="text-ink/45" />
        <input class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink/35" bind:value={search} placeholder="Search comparisons..." on:keydown={(e) => e.key === 'Enter' && load()} />
      </span>
    </label>
    <AdminSelect label="Status" name="status_filter" bind:value={statusFilter} options={[{ label: 'All statuses', value: 'all' }, ...statusOptions]} />
    <AdminButton variant="secondary" on:click={load}>Apply</AdminButton>
  </AdminToolbar>

  {#if loading}
    <LoadingState message="Loading comparisons..." />
  {:else if error}
    <ErrorState message={error} />
  {:else if rows.length === 0}
    <AdminEmptyState title="No comparisons yet" message="Add your first X vs Y comparison." actionLabel="New Comparison" icon={GitCompare} on:action={openCreate} />
  {:else}
    <div class="overflow-hidden rounded-none border border-ink/10 bg-surface shadow-[0_18px_50px_rgba(28,26,22,0.06)]">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[760px] text-sm">
          <thead class="bg-sand/70 text-xs uppercase tracking-[0.08em] text-ink/60">
            <tr>
              <th class="px-4 py-3 text-left font-semibold">Title</th>
              <th class="px-4 py-3 text-left font-semibold">A vs B</th>
              <th class="px-4 py-3 text-left font-semibold">Status</th>
              <th class="px-4 py-3 text-left font-semibold">Updated</th>
              <th class="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-ink/10">
            {#each rows as c (c.id)}
              <tr class="transition hover:bg-sand/25">
                <td class="px-4 py-4">
                  <div class="font-semibold text-ink">{c.title}</div>
                  <p class="mt-0.5 font-mono text-xs text-ink/50">{c.slug}</p>
                </td>
                <td class="px-4 py-4 text-ink/60">{c.a_name} vs {c.b_name}</td>
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
      class="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-none border border-ink/10 bg-surface p-6 shadow-[0_24px_80px_rgba(28,26,22,0.18)]"
      transition:scale={{ duration: 160, start: 0.98 }}
      on:submit|preventDefault={save}
    >
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">{editing ? 'Edit comparison' : 'New comparison'}</p>
          <h2 class="mt-1 text-2xl font-bold text-ink">{editing ? editing.title : 'Create Comparison'}</h2>
        </div>
        <button class="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-ink/10 bg-surface text-ink shadow-sm transition hover:bg-sand" type="button" aria-label="Close" on:click={closeModal}>
          <X size={18} />
        </button>
      </div>

      <div class="mt-6 grid gap-4">
        <div class="grid gap-4 sm:grid-cols-2">
          <AdminFormInput label="Title" name="title" bind:value={form.title} required />
          <label class="grid gap-2 text-sm font-medium text-ink">
            <span>Slug</span>
            <input class="h-11 rounded-2xl border border-ink/10 bg-surface px-3 font-mono text-sm shadow-sm outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/15" name="slug" bind:value={form.slug} required on:input={() => (slugManuallyEdited = true)} />
          </label>
        </div>

        <AdminFormInput label="Eyebrow" name="eyebrow" bind:value={form.eyebrow} placeholder="Safari comparison" />
        <AdminTextArea label="Intro" name="intro" bind:value={form.intro} rows={2} />

        <div class="grid gap-4 sm:grid-cols-2">
          <AdminFormInput label="Option A name" name="a_name" bind:value={form.a_name} required />
          <AdminFormInput label="Option B name" name="b_name" bind:value={form.b_name} required />
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <AdminFormInput label="Option A image URL" name="a_image_url" bind:value={form.a_image_url} placeholder="https://..." />
          <AdminFormInput label="Option B image URL" name="b_image_url" bind:value={form.b_image_url} placeholder="https://..." />
        </div>

        <AdminTextArea label="Dimensions — one per line as: Label :: A side :: B side" name="dimensions" bind:value={form.dimensions} rows={5} placeholder={'Cost :: Higher park fees :: Often better value'} />
        <AdminTextArea label="Verdict" name="verdict" bind:value={form.verdict} rows={3} />

        <div class="grid gap-4 sm:grid-cols-2">
          <AdminFormInput label="CTA label" name="cta_label" bind:value={form.cta_label} placeholder="Plan a safari" />
          <AdminFormInput label="CTA link" name="cta_href" bind:value={form.cta_href} placeholder="/plan-my-trip" />
        </div>

        <AdminTextArea label="FAQs — one per line as: Question :: Answer" name="faqs" bind:value={form.faqs} rows={4} placeholder={'Which is safer? :: Both are well-established destinations.'} />

        <div class="grid gap-4 sm:grid-cols-3">
          <AdminSelect label="Status" name="status" bind:value={form.status} options={statusOptions} />
          <AdminFormInput label="Sort order" name="sort_order" type="number" bind:value={form.sort_order} />
          <label class="flex cursor-pointer items-center gap-3 self-end rounded-2xl border border-ink/10 bg-surface p-3">
            <input class="h-4 w-4 accent-forest" type="checkbox" bind:checked={form.is_featured} />
            <span class="text-sm font-semibold text-ink">Featured</span>
          </label>
        </div>

        <AdminFormInput label="Meta description" name="meta_description" bind:value={form.meta_description} />
      </div>

      <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <AdminButton variant="secondary" type="button" on:click={closeModal}>Cancel</AdminButton>
        <AdminButton type="submit" disabled={saving}>{saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Comparison'}</AdminButton>
      </div>
    </form>
  </div>
{/if}

<ConfirmModal
  open={confirmOpen}
  title="Delete comparison"
  message={`Delete "${toDelete?.title ?? 'this comparison'}"? This soft-deletes the record.`}
  on:cancel={() => { confirmOpen = false; toDelete = null; }}
  on:confirm={confirmDelete}
/>

{#if deleting}
  <div class="fixed bottom-4 right-4 z-[70] rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(28,26,22,0.18)]">Deleting comparison...</div>
{/if}
