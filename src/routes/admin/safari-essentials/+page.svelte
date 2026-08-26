<script lang="ts">
  import { onMount } from 'svelte';
  import { BookOpen, Edit, ExternalLink, Plus, Search, Trash2, X } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminEmptyState from '$lib/components/admin/AdminEmptyState.svelte';
  import AdminFormInput from '$lib/components/admin/AdminFormInput.svelte';
  import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
  import AdminSelect from '$lib/components/admin/AdminSelect.svelte';
  import AdminTextArea from '$lib/components/admin/AdminTextArea.svelte';
  import AdminToolbar from '$lib/components/admin/AdminToolbar.svelte';
  import ConfirmModal from '$lib/components/admin/ConfirmModal.svelte';
  import MediaPicker from '$lib/components/admin/MediaPicker.svelte';
  import RichTextEditor from '$lib/components/admin/RichTextEditor.svelte';
  import StatusBadge from '$lib/components/admin/StatusBadge.svelte';
  import ToastStack from '$lib/components/admin/ToastStack.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';
  import type { SafariEssential } from '$lib/types';

  // Matches the shape MediaPicker/RichTextEditor expect — declared locally, as
  // the other admin forms do, since it is not a $lib/types export.
  type MediaItem = { file_name: string; file_url: string; id: string; thumbnail_url?: string | null };

  type Toast = { id: string; message: string; type: 'error' | 'success' };
  type Option = { label: string; value: string };

  const statusOptions: Option[] = [
    { label: 'All statuses', value: 'all' },
    { label: 'Draft', value: 'draft' },
    { label: 'Published', value: 'published' },
    { label: 'Archived', value: 'archived' }
  ];

  const editorStatusOptions: Option[] = [
    { label: 'Draft — not visible on the site', value: 'draft' },
    { label: 'Published — live on /safari-essentials', value: 'published' },
    { label: 'Archived', value: 'archived' }
  ];

  let rows: SafariEssential[] = [];
  let mediaItems: MediaItem[] = [];
  let loading = true;
  let saving = false;
  let deleting = false;
  let error = '';
  let search = '';
  // Defaults to every status: the nine seeded topics are all drafts, so an
  // admin filtered to "published" would open on an empty screen.
  let statusFilter = 'all';
  let confirmOpen = false;
  let toDelete: SafariEssential | null = null;
  let toasts: Toast[] = [];

  // Inline editor — these are nine known topics that get rewritten in place, so
  // editing happens on this screen rather than via a separate new/edit route.
  let editing: SafariEssential | null = null;
  let editorOpen = false;
  let form = blankForm();

  function blankForm() {
    return {
      title: '',
      slug: '',
      summary: '',
      content: '',
      topic: '',
      country: 'Tanzania',
      hero_image_url: '',
      og_image_url: '',
      meta_title: '',
      meta_description: '',
      status: 'draft',
      sort_order: '0',
      noindex: false
    };
  }

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
      const res = await api.safariEssentials.list({ search, status: statusFilter, limit: 100 });
      rows = res.data.items as SafariEssential[];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to load Safari Essentials.';
    } finally {
      loading = false;
    }
  };

  const loadMedia = async () => {
    try {
      const res = await api.media.list({ file_type: 'image', limit: 200 });
      mediaItems = (res.data.items as MediaItem[]).filter((m) => m.file_url);
    } catch {
      // non-critical — the editor still works, just without the picker library
    }
  };

  const openEditor = (article: SafariEssential | null) => {
    editing = article;
    editorOpen = true;
    form = article
      ? {
          title: article.title ?? '',
          slug: article.slug ?? '',
          summary: article.summary ?? '',
          content: article.content ?? '',
          topic: article.topic ?? '',
          country: article.country ?? 'Tanzania',
          hero_image_url: article.hero_image_url ?? '',
          og_image_url: article.og_image_url ?? '',
          meta_title: article.meta_title ?? '',
          meta_description: article.meta_description ?? '',
          status: article.status ?? 'draft',
          sort_order: String(article.sort_order ?? 0),
          noindex: article.noindex ?? false
        }
      : blankForm();
  };

  const closeEditor = () => { editorOpen = false; editing = null; form = blankForm(); };

  const save = async () => {
    if (!form.title.trim()) {
      showToast('A title is required.', 'error');
      return;
    }
    // Publishing an article with no body would put an empty page on the site —
    // the one thing this hub is designed not to do.
    if (form.status === 'published' && !form.content.trim()) {
      showToast('Write the article before publishing it — a published guide with no body would be an empty page.', 'error');
      return;
    }

    saving = true;
    try {
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        summary: form.summary.trim() || null,
        content: form.content.trim() || null,
        topic: form.topic.trim() || null,
        country: form.country.trim() || 'Tanzania',
        hero_image_url: form.hero_image_url || null,
        og_image_url: form.og_image_url || null,
        meta_title: form.meta_title.trim() || null,
        meta_description: form.meta_description.trim() || null,
        status: form.status,
        sort_order: Number(form.sort_order) || 0,
        noindex: form.noindex
      };
      if (form.slug.trim()) payload.slug = form.slug.trim();

      if (editing?.id) await api.safariEssentials.update(editing.id, payload);
      else await api.safariEssentials.create(payload);

      showToast(editing?.id ? 'Guide saved.' : 'Guide created.');
      closeEditor();
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to save the guide.', 'error');
    } finally {
      saving = false;
    }
  };

  const openDelete = (article: SafariEssential) => { toDelete = article; confirmOpen = true; };

  const confirmDelete = async () => {
    if (!toDelete) return;
    deleting = true;
    try {
      await api.safariEssentials.remove(toDelete.id);
      showToast('Guide deleted.');
      confirmOpen = false;
      toDelete = null;
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to delete the guide.', 'error');
    } finally {
      deleting = false;
    }
  };

  const fmt = (v?: string | null) =>
    v ? new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(v)) : '—';

  const wordCount = (html?: string | null) => {
    if (!html) return 0;
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return text ? text.split(' ').length : 0;
  };

  $: publishedCount = rows.filter((r) => r.status === 'published').length;

  onMount(async () => {
    await Promise.all([load(), loadMedia()]);
  });
</script>

<ToastStack {toasts} on:dismiss={dismissToast} />

<div class="mx-auto grid w-full max-w-[1500px] gap-6">
  <AdminPageHeader
    eyebrow="Content Management"
    title="Safari Essentials"
    description="The evergreen planning guides at /safari-essentials. A guide stays invisible to visitors and to Google until it is published."
    actionLabel="New Guide"
    actionIcon={Plus}
    on:action={() => openEditor(null)}
  />

  {#if !loading && !error && rows.length > 0}
    <div class="rounded-none border border-ink/10 bg-surface px-5 py-4 text-sm shadow-sm">
      <span class="font-semibold text-ink">{publishedCount} of {rows.length}</span>
      <span class="text-ink/65">
        guides published.
        {#if publishedCount === 0}
          The hub is showing an empty state to visitors and is deliberately kept out of the sitemap until the first guide goes live.
        {/if}
      </span>
    </div>
  {/if}

  <AdminToolbar className="grid gap-3 md:grid-cols-[1fr_220px_auto] md:items-end">
    <label class="grid gap-2 text-sm font-medium text-ink">
      <span>Search</span>
      <span class="flex h-11 items-center gap-2 rounded-2xl border border-ink/10 bg-surface px-3 shadow-sm transition focus-within:border-forest/45 focus-within:ring-2 focus-within:ring-forest/10">
        <Search size={16} class="text-ink/45" />
        <input
          class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink/35"
          bind:value={search}
          placeholder="Search guides..."
          on:keydown={(e) => e.key === 'Enter' && load()}
        />
      </span>
    </label>
    <AdminSelect label="Status" name="status_filter" bind:value={statusFilter} options={statusOptions} />
    <AdminButton variant="secondary" on:click={load}>Apply</AdminButton>
  </AdminToolbar>

  {#if loading}
    <LoadingState message="Loading Safari Essentials..." />
  {:else if error}
    <ErrorState message={error} />
  {:else if rows.length === 0}
    <AdminEmptyState
      title="No guides yet"
      message="Safari Essentials are the evergreen answers travellers search for before they enquire — when to go, what it costs, what to pack."
      actionLabel="Write First Guide"
      icon={BookOpen}
      on:action={() => openEditor(null)}
    />
  {:else}
    <div class="overflow-hidden rounded-none border border-ink/10 bg-surface shadow-[0_18px_50px_rgba(28,26,22,0.06)]">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[900px] text-sm">
          <thead class="bg-sand/70 text-xs uppercase tracking-[0.08em] text-ink/60">
            <tr>
              <th class="px-4 py-3 text-left font-semibold">Order</th>
              <th class="px-4 py-3 text-left font-semibold">Guide</th>
              <th class="px-4 py-3 text-left font-semibold">Topic</th>
              <th class="px-4 py-3 text-left font-semibold">Words</th>
              <th class="px-4 py-3 text-left font-semibold">Status</th>
              <th class="px-4 py-3 text-left font-semibold">Updated</th>
              <th class="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-ink/10">
            {#each rows as article (article.id)}
              <tr class="transition hover:bg-sand/25">
                <td class="px-4 py-4 font-mono text-xs text-ink/45">{article.sort_order ?? 0}</td>
                <td class="px-4 py-4">
                  <div class="font-semibold text-ink">{article.title}</div>
                  {#if article.summary}
                    <p class="mt-0.5 line-clamp-1 max-w-sm text-xs text-ink/50">{article.summary}</p>
                  {/if}
                  <p class="mt-0.5 font-mono text-[11px] text-ink/35">/safari-essentials/{article.slug}</p>
                </td>
                <td class="px-4 py-4 text-ink/65">{article.topic || '—'}</td>
                <td class="px-4 py-4 text-ink/65">
                  {#if wordCount(article.content)}
                    {wordCount(article.content)}
                  {:else}
                    <span class="text-ink/35">not written</span>
                  {/if}
                </td>
                <td class="px-4 py-4"><StatusBadge status={article.status ?? 'draft'} /></td>
                <td class="px-4 py-4 text-ink/65">{fmt(article.updated_at ?? article.created_at)}</td>
                <td class="px-4 py-4">
                  <div class="flex justify-end gap-2">
                    {#if article.status === 'published'}
                      <a
                        class="inline-flex h-9 items-center gap-2 rounded-xl border border-ink/10 bg-surface px-3 text-xs font-semibold text-ink shadow-sm transition hover:border-goldfinch-gold/35 hover:bg-sand/70"
                        href={`/safari-essentials/${article.slug}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink size={14} />View
                      </a>
                    {/if}
                    <button
                      class="inline-flex h-9 items-center gap-2 rounded-xl border border-ink/10 bg-surface px-3 text-xs font-semibold text-ink shadow-sm transition hover:border-goldfinch-gold/35 hover:bg-sand/70"
                      type="button"
                      on:click={() => openEditor(article)}
                    >
                      <Edit size={14} />Edit
                    </button>
                    <button
                      class="inline-flex h-9 items-center gap-2 rounded-xl border border-red-200 bg-surface px-3 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-50"
                      type="button"
                      on:click={() => openDelete(article)}
                    >
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

{#if editorOpen}
  <div class="fixed inset-0 z-[60] overflow-y-auto bg-ink/40 p-4 md:p-8">
    <div class="mx-auto w-full max-w-[1100px] rounded-none border border-ink/10 bg-canvas shadow-[0_28px_80px_rgba(28,26,22,0.25)]">
      <div class="flex items-center justify-between border-b border-ink/10 bg-surface px-6 py-4">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Safari Essentials</p>
          <h2 class="text-lg font-semibold text-ink">{editing?.id ? 'Edit guide' : 'New guide'}</h2>
        </div>
        <button
          class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-ink/10 bg-surface text-ink/60 transition hover:bg-sand/70"
          type="button"
          aria-label="Close editor"
          on:click={closeEditor}
        >
          <X size={16} />
        </button>
      </div>

      <div class="grid gap-6 p-6">
        <div class="grid gap-5 md:grid-cols-2">
          <AdminFormInput label="Title" name="title" bind:value={form.title} required />
          <AdminFormInput
            label="Slug"
            name="slug"
            bind:value={form.slug}
            placeholder="Leave blank to generate from the title"
          />
        </div>

        <div class="grid gap-5 md:grid-cols-3">
          <AdminFormInput label="Topic" name="topic" bind:value={form.topic} placeholder="Planning, Wildlife, Practical…" />
          <AdminFormInput label="Country" name="country" bind:value={form.country} placeholder="Tanzania" />
          <AdminFormInput label="Sort order" name="sort_order" type="number" bind:value={form.sort_order} />
        </div>

        <AdminTextArea
          label="Summary"
          name="summary"
          bind:value={form.summary}
          rows={3}
          placeholder="One or two lines used on the hub card and as the fallback meta description."
        />

        <RichTextEditor
          label="Guide content"
          bind:value={form.content}
          media={mediaItems}
          uploadFolder="safari-essentials"
          placeholder="Write the guide here — headings, lists, links and images."
        />

        <div class="grid gap-6 xl:grid-cols-2">
          <MediaPicker label="Hero image" media={mediaItems} uploadFolder="safari-essentials" bind:value={form.hero_image_url} />
          <MediaPicker
            label="OG image (1200×630 recommended)"
            media={mediaItems}
            uploadFolder="safari-essentials"
            bind:value={form.og_image_url}
          />
        </div>

        <div class="grid gap-5 md:grid-cols-2">
          <AdminFormInput label="Meta title" name="meta_title" bind:value={form.meta_title} counter={60} />
          <AdminFormInput label="Meta description" name="meta_description" bind:value={form.meta_description} counter={160} />
        </div>

        <div class="grid gap-5 md:grid-cols-2 md:items-end">
          <AdminSelect label="Status" name="status" bind:value={form.status} options={editorStatusOptions} />
          <label class="flex items-center gap-3 text-sm text-ink">
            <input type="checkbox" bind:checked={form.noindex} class="h-4 w-4 accent-forest" />
            <span>
              Hide from search engines
              <span class="block text-xs text-ink/55">Adds a noindex tag and drops the guide from the sitemap.</span>
            </span>
          </label>
        </div>
      </div>

      <div class="flex flex-col-reverse gap-3 border-t border-ink/10 bg-surface px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
        <AdminButton variant="ghost" on:click={closeEditor}>Cancel</AdminButton>
        <AdminButton disabled={saving} on:click={save}>
          {saving ? 'Saving…' : editing?.id ? 'Save guide' : 'Create guide'}
        </AdminButton>
      </div>
    </div>
  </div>
{/if}

<ConfirmModal
  open={confirmOpen}
  title="Delete guide"
  message={`Delete "${toDelete?.title ?? 'this guide'}"? This action soft-deletes the record.`}
  on:cancel={() => { confirmOpen = false; toDelete = null; }}
  on:confirm={confirmDelete}
/>

{#if deleting}
  <div class="fixed bottom-4 right-4 z-[70] rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(28,26,22,0.18)]">
    Deleting guide...
  </div>
{/if}
