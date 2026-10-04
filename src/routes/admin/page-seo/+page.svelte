<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { Edit3, ExternalLink, Globe2, Plus, Search, Trash2, X } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import type { PageSeo } from '$lib/types';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminEmptyState from '$lib/components/admin/AdminEmptyState.svelte';
  import AdminFormInput from '$lib/components/admin/AdminFormInput.svelte';
  import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
  import AdminSelect from '$lib/components/admin/AdminSelect.svelte';
  import AdminTextArea from '$lib/components/admin/AdminTextArea.svelte';
  import AdminToolbar from '$lib/components/admin/AdminToolbar.svelte';
  import ConfirmModal from '$lib/components/admin/ConfirmModal.svelte';
  import MediaPicker from '$lib/components/admin/MediaPicker.svelte';
  import ToastStack from '$lib/components/admin/ToastStack.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';

  type Form = {
    canonical_url: string;
    meta_description: string;
    og_description: string;
    og_image_url: string;
    og_title: string;
    path: string;
    robots: string;
    structured_data: string;
    title: string;
    is_active: boolean;
  };
  type Toast = { id: string; message: string; type: 'error' | 'success' };

  const robotsOptions = [
    { label: 'Index, follow', value: 'index,follow' },
    { label: 'Noindex, follow', value: 'noindex,follow' },
    { label: 'Noindex, nofollow', value: 'noindex,nofollow' }
  ];
  const emptyForm = (): Form => ({
    canonical_url: '',
    meta_description: '',
    og_description: '',
    og_image_url: '',
    og_title: '',
    path: '',
    robots: 'index,follow',
    structured_data: '',
    title: '',
    is_active: true
  });

  let rows: PageSeo[] = [];
  let loading = true;
  let saving = false;
  let deleting = false;
  let error = '';
  let search = '';
  let modalOpen = false;
  let confirmOpen = false;
  let editing: PageSeo | null = null;
  let toDelete: PageSeo | null = null;
  let form = emptyForm();
  let toasts: Toast[] = [];

  const showToast = (message: string, type: Toast['type'] = 'success') => {
    const id = crypto.randomUUID();
    toasts = [{ id, message, type }, ...toasts].slice(0, 4);
    setTimeout(() => (toasts = toasts.filter((toast) => toast.id !== id)), 3600);
  };
  const dismissToast = (event: CustomEvent<string>) => (toasts = toasts.filter((toast) => toast.id !== event.detail));
  const blankToNull = (value: string) => value.trim() || null;
  const normalizePath = (value: string) => {
    const path = value.trim();
    return path === '/' ? '/' : path.replace(/\/+$/, '');
  };
  const isProtectedPath = (path: string) => /^\/(admin|api|booking|quote|trip|shortlist|enquiry|guest-details)(\/|$)/i.test(path);

  const load = async () => {
    loading = true;
    error = '';
    try {
      const response = await api.pageSeo.list({ limit: 100, search: search.trim() || undefined });
      rows = response.data.items;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to load page SEO.';
    } finally {
      loading = false;
    }
  };

  const openCreate = () => {
    editing = null;
    form = emptyForm();
    modalOpen = true;
  };
  const openEdit = (row: PageSeo) => {
    editing = row;
    form = {
      canonical_url: row.canonical_url ?? '',
      meta_description: row.meta_description ?? '',
      og_description: row.og_description ?? '',
      og_image_url: row.og_image_url ?? '',
      og_title: row.og_title ?? '',
      path: row.path,
      robots: row.robots || 'index,follow',
      structured_data: row.structured_data ? JSON.stringify(row.structured_data, null, 2) : '',
      title: row.title ?? '',
      is_active: row.is_active !== false
    };
    modalOpen = true;
  };
  const closeModal = () => {
    if (saving) return;
    modalOpen = false;
    editing = null;
  };

  const save = async () => {
    const path = normalizePath(form.path);
    if (!path.startsWith('/') || /[?#]/.test(path)) {
      showToast('Use a clean path beginning with / — no query string or hash.', 'error');
      return;
    }
    if (isProtectedPath(path)) {
      showToast('Private, admin and booking paths are always noindex and cannot have an override.', 'error');
      return;
    }

    let structuredData: Record<string, unknown> | unknown[] | null = null;
    if (form.structured_data.trim()) {
      try {
        const parsed: unknown = JSON.parse(form.structured_data);
        if (!parsed || typeof parsed !== 'object') throw new Error('not an object');
        structuredData = parsed as Record<string, unknown> | unknown[];
      } catch {
        showToast('Structured data must be valid JSON-LD (an object or array).', 'error');
        return;
      }
    }

    saving = true;
    try {
      const body = {
        path,
        title: blankToNull(form.title),
        meta_description: blankToNull(form.meta_description),
        og_title: blankToNull(form.og_title),
        og_description: blankToNull(form.og_description),
        og_image_url: blankToNull(form.og_image_url),
        canonical_url: blankToNull(form.canonical_url),
        robots: form.robots,
        structured_data: structuredData,
        is_active: form.is_active
      };
      if (editing) await api.pageSeo.update(editing.id, body);
      else await api.pageSeo.create(body);
      showToast(editing ? 'SEO override updated.' : 'SEO override created.');
      closeModal();
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to save the SEO override.', 'error');
    } finally {
      saving = false;
    }
  };

  const toggleActive = async (row: PageSeo) => {
    try {
      await api.pageSeo.update(row.id, { is_active: row.is_active === false });
      rows = rows.map((item) => item.id === row.id ? { ...item, is_active: item.is_active === false } : item);
      showToast(row.is_active === false ? 'SEO override activated.' : 'SEO override paused.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to update the override.', 'error');
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    deleting = true;
    try {
      await api.pageSeo.remove(toDelete.id);
      rows = rows.filter((row) => row.id !== toDelete?.id);
      showToast('SEO override deleted. The route now uses its editorial default.');
      confirmOpen = false;
      toDelete = null;
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to delete the override.', 'error');
    } finally {
      deleting = false;
    }
  };

  onMount(load);
</script>

<ToastStack {toasts} on:dismiss={dismissToast} />

<div class="mx-auto grid w-full max-w-[1280px] gap-5 sm:gap-6">
  <AdminPageHeader
    eyebrow="Search visibility"
    title="Page SEO"
    description="Override a public page’s title, snippet, share card, canonical URL or indexing rule. Routes without an override keep their CMS-aware defaults."
    actionLabel="New override"
    actionIcon={Plus}
    on:action={openCreate}
  />

  <AdminToolbar className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
    <label class="grid min-w-0 gap-2 text-sm font-medium text-ink">
      <span>Find a page</span>
      <span class="flex h-11 min-w-0 items-center gap-2 rounded-md border border-ink/10 bg-surface px-3 shadow-sm focus-within:border-forest/45 focus-within:ring-2 focus-within:ring-forest/10">
        <Search size={16} class="shrink-0 text-ink/45" />
        <input class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink/35" bind:value={search} placeholder="/tours, Serengeti, title..." on:keydown={(event) => event.key === 'Enter' && load()} />
      </span>
    </label>
    <AdminButton variant="secondary" on:click={load}>Apply</AdminButton>
  </AdminToolbar>

  {#if loading}
    <LoadingState message="Loading page SEO..." />
  {:else if error}
    <ErrorState message={error} />
  {:else if rows.length === 0}
    <AdminEmptyState
      icon={Globe2}
      title="No SEO overrides yet"
      message="Your tours, destinations and content pages already have thoughtful defaults. Add an override only where you need a deliberate change."
      actionLabel="Create an override"
      on:action={openCreate}
    />
  {:else}
    <section class="grid gap-3 sm:gap-4" aria-label="SEO overrides">
      {#each rows as row (row.id)}
        <article class="grid gap-4 rounded-md border border-ink/10 bg-surface p-4 shadow-card transition hover:border-forest/25 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <code class="break-all rounded bg-sand/70 px-2 py-1 text-xs font-semibold text-ink">{row.path}</code>
              <span class={`inline-flex items-center gap-1.5 text-xs font-semibold ${row.is_active !== false ? 'text-forest' : 'text-ink/45'}`}>
                <span class={`h-2 w-2 rounded-full ${row.is_active !== false ? 'bg-forest' : 'bg-ink/30'}`}></span>
                {row.is_active !== false ? 'Active' : 'Paused'}
              </span>
              <span class="rounded-full bg-sand px-2.5 py-1 text-[11px] font-semibold text-ink/60">{row.robots || 'index,follow'}</span>
            </div>
            <h2 class="mt-3 truncate text-base font-bold text-ink">{row.title || 'Uses the route’s editorial title'}</h2>
            <p class="mt-1 line-clamp-2 text-sm leading-6 text-ink/60">{row.meta_description || 'No custom meta description — the CMS-aware route default is active.'}</p>
          </div>
          <div class="flex flex-wrap gap-2 sm:justify-end">
            <a class="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-ink/10 px-3 text-xs font-semibold text-ink transition hover:bg-sand" href={row.path} target="_blank" rel="noreferrer" title="Open public page">
              <ExternalLink size={14} /> Preview
            </a>
            <button class="inline-flex h-9 items-center justify-center rounded-md border border-ink/10 px-3 text-xs font-semibold text-ink transition hover:bg-sand" type="button" on:click={() => toggleActive(row)}>
              {row.is_active !== false ? 'Pause' : 'Activate'}
            </button>
            <button class="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-ink/10 px-3 text-xs font-semibold text-ink transition hover:border-forest/35 hover:bg-sand" type="button" on:click={() => openEdit(row)}>
              <Edit3 size={14} /> Edit
            </button>
            <button class="inline-flex h-9 w-9 items-center justify-center rounded-md border border-red-200 text-red-700 transition hover:bg-red-50" type="button" aria-label={`Delete SEO override for ${row.path}`} on:click={() => { toDelete = row; confirmOpen = true; }}>
              <Trash2 size={14} />
            </button>
          </div>
        </article>
      {/each}
    </section>
  {/if}
</div>

{#if modalOpen}
  <div class="fixed inset-0 z-50 grid place-items-end bg-black/45 p-0 backdrop-blur-sm sm:place-items-center sm:p-5" transition:fade={{ duration: 140 }}>
    <form class="max-h-[94dvh] w-full max-w-3xl overflow-y-auto rounded-t-xl border border-ink/10 bg-surface p-5 shadow-[0_24px_80px_rgba(28,26,22,0.18)] sm:max-h-[92vh] sm:rounded-md sm:p-6" transition:scale={{ duration: 160, start: 0.98 }} on:submit|preventDefault={save}>
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">{editing ? 'Edit override' : 'New override'}</p>
          <h2 class="mt-1 text-xl font-bold text-ink sm:text-2xl">{editing ? `SEO for ${editing.path}` : 'Add page SEO'}</h2>
          <p class="mt-1 text-sm leading-6 text-ink/60">Only public, canonical routes belong here. Booking and private traveller flows stay noindex.</p>
        </div>
        <button class="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-ink/10 text-ink transition hover:bg-sand" type="button" aria-label="Close" on:click={closeModal}>
          <X size={18} />
        </button>
      </div>

      <div class="mt-6 grid gap-4">
        <AdminFormInput label="Path" name="path" bind:value={form.path} placeholder="/tours or /destinations/serengeti" required />
        <p class="-mt-2 text-xs leading-5 text-ink/50">Use the clean public path. Do not include the domain, UTM parameters or a trailing slash.</p>

        <div class="grid gap-4 sm:grid-cols-2">
          <AdminFormInput label="Page title" name="title" bind:value={form.title} placeholder="Leave blank to keep the route default" counter={60} />
          <AdminSelect label="Robots" name="robots" bind:value={form.robots} options={robotsOptions} />
        </div>
        <AdminTextArea label="Meta description" name="meta_description" bind:value={form.meta_description} rows={3} placeholder="A clear, human search snippet. Leave blank for the route default." counter={160} />

        <div class="rounded-md border border-ink/10 bg-sand/25 p-4">
          <p class="text-sm font-bold text-ink">Social share card</p>
          <p class="mt-1 text-xs leading-5 text-ink/55">If these are blank, social platforms use the page title, description and CMS default image.</p>
          <div class="mt-4 grid gap-4">
            <AdminFormInput label="Open Graph title" name="og_title" bind:value={form.og_title} placeholder="Optional share-card title" counter={70} />
            <AdminTextArea label="Open Graph description" name="og_description" bind:value={form.og_description} rows={2} placeholder="Optional share-card description" counter={200} />
            <MediaPicker label="Open Graph image" uploadFolder="seo" bind:value={form.og_image_url} aspect="aspect-[1.91/1]" />
          </div>
        </div>

        <AdminFormInput label="Canonical URL" name="canonical_url" type="url" bind:value={form.canonical_url} placeholder="https://www.emneladventures.com/... (leave blank for automatic)" />
        <AdminTextArea label="Structured data — JSON-LD (optional)" name="structured_data" bind:value={form.structured_data} rows={6} placeholder={'{\n  "@type": "TouristAttraction",\n  "name": "..."\n}'} />

        <label class="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-ink/10 px-3.5 transition hover:bg-sand/30">
          <input class="h-4 w-4 accent-forest" type="checkbox" bind:checked={form.is_active} />
          <span class="text-sm font-semibold text-ink">Override is active</span>
        </label>
      </div>

      <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <AdminButton type="button" variant="secondary" on:click={closeModal}>Cancel</AdminButton>
        <AdminButton type="submit" disabled={saving}>{saving ? 'Saving...' : editing ? 'Save changes' : 'Create override'}</AdminButton>
      </div>
    </form>
  </div>
{/if}

<ConfirmModal
  open={confirmOpen}
  title="Delete SEO override"
  message={`Delete the override for ${toDelete?.path ?? 'this page'}? The route will immediately return to its editorial default.`}
  on:cancel={() => { confirmOpen = false; toDelete = null; }}
  on:confirm={confirmDelete}
/>

{#if deleting}
  <div class="fixed bottom-4 right-4 z-[70] rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white shadow-lg">Deleting override…</div>
{/if}
