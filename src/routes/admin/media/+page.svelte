<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { Copy, Edit, Grid2X2, Image as ImageIcon, List, Plus, Search, Trash2, Upload, X } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminEmptyState from '$lib/components/admin/AdminEmptyState.svelte';
  import AdminFormInput from '$lib/components/admin/AdminFormInput.svelte';
  import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
  import AdminSelect from '$lib/components/admin/AdminSelect.svelte';
  import AdminTextArea from '$lib/components/admin/AdminTextArea.svelte';
  import AdminToolbar from '$lib/components/admin/AdminToolbar.svelte';
  import ConfirmModal from '$lib/components/admin/ConfirmModal.svelte';
  import ToastStack from '$lib/components/admin/ToastStack.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';
  import type { Pagination } from '$lib/types';

  type MediaItem = {
    id: string;
    file_name: string;
    file_url: string;
    file_path: string;
    file_type: 'image' | 'video' | 'document';
    mime_type?: string | null;
    file_size?: number | string | null;
    alt_text?: string | null;
    caption?: string | null;
    uploaded_by?: string | null;
    created_at?: string;
    deleted_at?: string | null;
  };

  type Toast = {
    id: string;
    message: string;
    type: 'error' | 'success';
  };

  type ViewMode = 'grid' | 'list';

  const fileTypeOptions = [
    { label: 'All file types', value: 'all' },
    { label: 'Images', value: 'image' },
    { label: 'Videos', value: 'video' },
    { label: 'Documents', value: 'document' }
  ];

  let rows: MediaItem[] = [];
  let pagination: Pagination | null = null;
  let loading = true;
  let uploading = false;
  let saving = false;
  let deleting = false;
  let error = '';
  let search = '';
  let fileType = 'all';
  let page = 1;
  let viewMode: ViewMode = 'grid';
  let uploadModalOpen = false;
  let editModalOpen = false;
  let confirmOpen = false;
  let mediaToEdit: MediaItem | null = null;
  let mediaToDelete: MediaItem | null = null;
  let uploadFiles: FileList | null = null;
  let uploadFileName = '';
  let uploadAltText = '';
  let uploadCaption = '';
  let uploadProgress = '';
  $: uploadCount = uploadFiles?.length ?? 0;
  let editAltText = '';
  let editCaption = '';
  let toasts: Toast[] = [];

  const showToast = (message: string, type: Toast['type'] = 'success') => {
    const id = crypto.randomUUID();
    toasts = [{ id, message, type }, ...toasts].slice(0, 4);
    setTimeout(() => {
      toasts = toasts.filter((toast) => toast.id !== id);
    }, 3500);
  };

  const dismissToast = (event: CustomEvent<string>) => {
    toasts = toasts.filter((toast) => toast.id !== event.detail);
  };

  const loadMedia = async () => {
    loading = true;
    error = '';

    try {
      const response = await api.media.list({
        file_type: fileType,
        limit: 24,
        page,
        search
      });
      rows = response.data.items as MediaItem[];
      pagination = response.data.pagination;
    } catch (requestError) {
      error = requestError instanceof Error ? requestError.message : 'Unable to load media library.';
    } finally {
      loading = false;
    }
  };

  const applyFilters = async () => {
    page = 1;
    await loadMedia();
  };

  const formatDate = (value?: string) => {
    if (!value) return '-';
    return new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
  };

  const formatFileSize = (value?: number | string | null) => {
    const bytes = Number(value ?? 0);
    if (!Number.isFinite(bytes) || bytes <= 0) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const handleUploadFileChange = (event: Event) => {
    uploadFiles = (event.currentTarget as HTMLInputElement).files;
    const n = uploadFiles?.length ?? 0;
    uploadFileName = n > 1 ? `${n} files selected` : (uploadFiles?.[0]?.name ?? '');
  };

  const resetUpload = () => {
    uploadFiles = null;
    uploadFileName = '';
    uploadAltText = '';
    uploadCaption = '';
    uploadProgress = '';
  };

  const openUploadModal = () => {
    resetUpload();
    uploadModalOpen = true;
  };

  const closeUploadModal = () => {
    uploadModalOpen = false;
    resetUpload();
  };

  const uploadMedia = async () => {
    const files = uploadFiles ? Array.from(uploadFiles) : [];
    if (!files.length) {
      showToast('Choose at least one image file first.', 'error');
      return;
    }

    const valid = files.filter((f) => f.size <= 5 * 1024 * 1024);
    const skipped = files.length - valid.length;
    if (!valid.length) {
      showToast('Each image must be 5MB or smaller.', 'error');
      return;
    }

    // Alt text is per-image, so only apply it for a single upload; a caption can
    // reasonably be shared across a batch. Edit each image afterwards to refine.
    const single = valid.length === 1;
    uploading = true;
    let done = 0;
    const failed: string[] = [];

    try {
      for (const file of valid) {
        uploadProgress = `Uploading ${done + 1} of ${valid.length}…`;
        try {
          await api.upload.image(file, 'media', {
            alt_text: single ? uploadAltText : '',
            caption: uploadCaption
          });
          done++;
        } catch (err) {
          failed.push(`${file.name}: ${err instanceof Error ? err.message : 'failed'}`);
        }
      }

      const parts: string[] = [];
      if (done) parts.push(`${done} uploaded`);
      if (failed.length) parts.push(`${failed.length} failed`);
      if (skipped) parts.push(`${skipped} skipped (over 5MB)`);
      showToast(parts.join(' · ') || 'Nothing uploaded.', failed.length || skipped ? 'error' : 'success');

      if (done) {
        closeUploadModal();
        page = 1;
        await loadMedia();
      }
    } finally {
      uploading = false;
      uploadProgress = '';
    }
  };

  const openEditModal = (media: MediaItem) => {
    mediaToEdit = media;
    editAltText = media.alt_text ?? '';
    editCaption = media.caption ?? '';
    editModalOpen = true;
  };

  const closeEditModal = () => {
    editModalOpen = false;
    mediaToEdit = null;
    editAltText = '';
    editCaption = '';
  };

  const saveMetadata = async () => {
    if (!mediaToEdit) return;
    saving = true;

    try {
      await api.media.update(mediaToEdit.id, {
        alt_text: editAltText || null,
        caption: editCaption || null
      });
      showToast('Media metadata updated successfully.');
      closeEditModal();
      await loadMedia();
    } catch (requestError) {
      showToast(requestError instanceof Error ? requestError.message : 'Unable to update media metadata.', 'error');
    } finally {
      saving = false;
    }
  };

  const copyUrl = async (media: MediaItem) => {
    try {
      await navigator.clipboard.writeText(media.file_url);
      showToast('Image URL copied.');
    } catch {
      showToast('Unable to copy image URL.', 'error');
    }
  };

  const openDeleteConfirm = (media: MediaItem) => {
    mediaToDelete = media;
    confirmOpen = true;
  };

  const deleteMedia = async () => {
    if (!mediaToDelete) return;
    deleting = true;

    try {
      await api.media.remove(mediaToDelete.id);
      showToast('Media deleted successfully.');
      confirmOpen = false;
      mediaToDelete = null;
      await loadMedia();
    } catch (requestError) {
      showToast(requestError instanceof Error ? requestError.message : 'Unable to delete media.', 'error');
    } finally {
      deleting = false;
    }
  };

  const goToPage = async (nextPage: number) => {
    page = nextPage;
    await loadMedia();
  };

  onMount(loadMedia);
</script>

<ToastStack {toasts} on:dismiss={dismissToast} />

<div class="mx-auto grid w-full max-w-[1500px] gap-6">
<AdminPageHeader
  eyebrow="Admin CMS"
  title="Media Library"
  description="Upload and reuse images across tours, destinations, blogs, gallery, testimonials, and homepage content."
  actionLabel="Upload Media"
  actionIcon={Plus}
  on:action={openUploadModal}
/>

<AdminToolbar className="grid gap-3 lg:grid-cols-[1fr_190px_auto_auto] lg:items-end">
  <label class="grid gap-2 text-sm font-medium text-ink">
    <span>Search</span>
    <span class="flex h-11 items-center gap-2 rounded-2xl border border-ink/10 bg-surface px-3 shadow-sm transition focus-within:border-forest/45 focus-within:ring-2 focus-within:ring-forest/10">
      <Search size={16} class="text-ink/45" />
      <input class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink/35" bind:value={search} placeholder="Search file name, alt text, or caption..." on:keydown={(event) => event.key === 'Enter' && applyFilters()} />
    </span>
  </label>

  <AdminSelect label="File type" name="file_type_filter" bind:value={fileType} options={fileTypeOptions} />

  <AdminButton variant="secondary" on:click={applyFilters}>Apply</AdminButton>

  <div class="flex h-11 rounded-2xl border border-ink/10 bg-surface p-1 shadow-sm">
    <button class={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition ${viewMode === 'grid' ? 'bg-forest text-white shadow-sm' : 'text-ink/60 hover:bg-sand/70 hover:text-heading'}`} type="button" on:click={() => (viewMode = 'grid')} aria-label="Show media grid">
      <Grid2X2 size={15} />
      Grid
    </button>
    <button class={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition ${viewMode === 'list' ? 'bg-forest text-white shadow-sm' : 'text-ink/60 hover:bg-sand/70 hover:text-heading'}`} type="button" on:click={() => (viewMode = 'list')} aria-label="Show media list">
      <List size={15} />
      List
    </button>
  </div>
</AdminToolbar>

{#if loading}
  <LoadingState message="Loading media library..." />
{:else if error}
  <ErrorState message={error} />
{:else if rows.length === 0}
  <AdminEmptyState
    title="No media uploaded yet"
    message="Upload images once and reuse them across tours, destinations, blogs, gallery, testimonials, and homepage sections."
    actionLabel="Upload first image"
    icon={ImageIcon}
    on:action={openUploadModal}
  />
{:else if viewMode === 'grid'}
  <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    {#each rows as media}
      <article class="overflow-hidden rounded-none border border-ink/10 bg-surface shadow-[0_18px_50px_rgba(28,26,22,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(28,26,22,0.1)]">
        <div class="aspect-[4/3] bg-sand/60">
          {#if media.file_type === 'image'}
            <img class="h-full w-full object-cover" src={media.file_url} alt={media.alt_text || media.file_name} />
          {:else}
            <div class="grid h-full place-items-center text-ink/40">
              <ImageIcon size={34} />
            </div>
          {/if}
        </div>

        <div class="grid gap-3 p-4">
          <div>
            <h2 class="truncate text-sm font-semibold text-ink" title={media.file_name}>{media.file_name}</h2>
            <p class="mt-1 truncate text-xs text-ink/55">{media.mime_type || '-'} · {formatFileSize(media.file_size)}</p>
          </div>

          <div class="grid gap-1 text-xs text-ink/60">
            <p class="line-clamp-1"><span class="font-semibold text-ink/70">Alt:</span> {media.alt_text || '-'}</p>
            <p class="line-clamp-1"><span class="font-semibold text-ink/70">Caption:</span> {media.caption || '-'}</p>
            <p><span class="font-semibold text-ink/70">Uploaded:</span> {formatDate(media.created_at)}</p>
          </div>

          <div class="flex flex-wrap justify-end gap-2">
            <button class="inline-flex h-9 items-center gap-2 rounded-xl border border-ink/10 bg-surface px-3 text-xs font-semibold text-ink shadow-sm transition hover:border-goldfinch-gold/35 hover:bg-sand/70" type="button" on:click={() => copyUrl(media)}>
              <Copy size={14} />
              Copy URL
            </button>
            <button class="inline-flex h-9 items-center gap-2 rounded-xl border border-ink/10 bg-surface px-3 text-xs font-semibold text-ink shadow-sm transition hover:border-goldfinch-gold/35 hover:bg-sand/70" type="button" on:click={() => openEditModal(media)}>
              <Edit size={14} />
              Edit
            </button>
            <button class="inline-flex h-9 items-center gap-2 rounded-xl border border-red-200 bg-surface px-3 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-50" type="button" on:click={() => openDeleteConfirm(media)}>
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </div>
      </article>
    {/each}
  </div>
{:else}
  <div class="overflow-hidden rounded-none border border-ink/10 bg-surface shadow-[0_18px_50px_rgba(28,26,22,0.06)]">
    <div class="overflow-x-auto">
      <table class="w-full min-w-[980px] text-start text-sm">
        <thead class="bg-sand/70 text-xs uppercase tracking-[0.08em] text-ink/60">
          <tr>
            <th class="px-4 py-3 font-semibold">Preview</th>
            <th class="px-4 py-3 font-semibold">File</th>
            <th class="px-4 py-3 font-semibold">Type</th>
            <th class="px-4 py-3 font-semibold">Alt text</th>
            <th class="px-4 py-3 font-semibold">Caption</th>
            <th class="px-4 py-3 font-semibold">Uploaded</th>
            <th class="px-4 py-3 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-ink/10">
          {#each rows as media}
            <tr class="transition hover:bg-sand/25">
              <td class="px-4 py-3">
                <div class="h-12 w-16 overflow-hidden rounded-md bg-sand/60">
                  {#if media.file_type === 'image'}
                    <img class="h-full w-full object-cover" src={media.file_url} alt={media.alt_text || media.file_name} />
                  {:else}
                    <div class="grid h-full place-items-center text-ink/35"><ImageIcon size={18} /></div>
                  {/if}
                </div>
              </td>
              <td class="px-4 py-3">
                <div class="max-w-[220px] truncate font-semibold text-ink" title={media.file_name}>{media.file_name}</div>
                <p class="mt-1 text-xs text-ink/55">{media.mime_type || '-'} · {formatFileSize(media.file_size)}</p>
              </td>
              <td class="px-4 py-3 text-ink/65">{media.file_type}</td>
              <td class="px-4 py-3 text-ink/65">{media.alt_text || '-'}</td>
              <td class="px-4 py-3 text-ink/65">{media.caption || '-'}</td>
              <td class="px-4 py-3 text-ink/65">{formatDate(media.created_at)}</td>
              <td class="px-4 py-3">
                <div class="flex justify-end gap-2">
                  <button class="inline-flex h-9 items-center gap-2 rounded-xl border border-ink/10 bg-surface px-3 text-xs font-semibold text-ink shadow-sm transition hover:border-goldfinch-gold/35 hover:bg-sand/70" type="button" on:click={() => copyUrl(media)}>
                    <Copy size={14} />
                    Copy
                  </button>
                  <button class="inline-flex h-9 items-center gap-2 rounded-xl border border-ink/10 bg-surface px-3 text-xs font-semibold text-ink shadow-sm transition hover:border-goldfinch-gold/35 hover:bg-sand/70" type="button" on:click={() => openEditModal(media)}>
                    <Edit size={14} />
                    Edit
                  </button>
                  <button class="inline-flex h-9 items-center gap-2 rounded-xl border border-red-200 bg-surface px-3 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-50" type="button" on:click={() => openDeleteConfirm(media)}>
                    <Trash2 size={14} />
                    Delete
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

{#if pagination && pagination.totalPages > 1}
  <div class="flex flex-col gap-3 rounded-none border border-ink/10 bg-surface/90 p-4 text-sm text-ink/65 shadow-[0_14px_40px_rgba(28,26,22,0.05)] sm:flex-row sm:items-center sm:justify-between">
    <p>Page {pagination.page} of {pagination.totalPages} · {pagination.total} files</p>
    <div class="flex gap-2">
      <AdminButton variant="secondary" size="sm" disabled={page <= 1} on:click={() => goToPage(page - 1)}>Previous</AdminButton>
      <AdminButton variant="secondary" size="sm" disabled={page >= pagination.totalPages} on:click={() => goToPage(page + 1)}>Next</AdminButton>
    </div>
  </div>
{/if}
</div>

{#if uploadModalOpen}
  <div class="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4 backdrop-blur-sm" transition:fade={{ duration: 140 }}>
    <div class="w-full max-w-xl rounded-none border border-ink/10 bg-surface p-6 shadow-[0_24px_80px_rgba(28,26,22,0.18)]" transition:scale={{ duration: 160, start: 0.98 }}>
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Upload media</p>
          <h2 class="mt-2 text-2xl font-bold tracking-normal text-ink">{uploadCount > 1 ? `Add ${uploadCount} Images` : 'Add Images'}</h2>
        </div>
        <button class="grid h-10 w-10 place-items-center rounded-2xl border border-ink/10 bg-surface text-ink shadow-sm transition hover:bg-sand" type="button" aria-label="Close modal" on:click={closeUploadModal}>
          <X size={18} />
        </button>
      </div>

      <form class="mt-6 grid gap-4" on:submit|preventDefault={uploadMedia}>
        <label class="grid gap-2 text-sm font-medium text-ink">
          <span>Image file{uploadCount > 1 ? 's' : ''}</span>
          <input class="rounded-2xl border border-dashed border-forest/25 bg-sand/25 px-4 py-4 text-sm text-ink file:mr-3 file:rounded-xl file:border-0 file:bg-forest file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white hover:border-goldfinch-gold/45" type="file" accept="image/jpeg,image/png,image/webp" multiple on:change={handleUploadFileChange} />
          <span class="text-xs text-ink/55">{uploadFileName || 'JPG, PNG, or WebP. Up to 5MB each. Select multiple to upload at once.'}</span>
        </label>

        {#if uploadCount > 1}
          <p class="rounded-xl bg-sand/60 px-3 py-2 text-xs text-ink/65">
            Uploading {uploadCount} images. Alt text is set per image — add it to each afterwards from the library. The caption below applies to all.
          </p>
        {:else}
          <AdminFormInput label="Alt text" name="upload_alt_text" bind:value={uploadAltText} placeholder="Describe the image for accessibility" />
        {/if}
        <AdminTextArea label="Caption" name="upload_caption" bind:value={uploadCaption} rows={3} placeholder="Optional CMS caption." />

        <div class="flex justify-end gap-3 pt-2">
          <AdminButton variant="secondary" type="button" on:click={closeUploadModal}>Cancel</AdminButton>
          <AdminButton type="submit" disabled={uploading}>
            <Upload size={15} />
            {uploading ? uploadProgress || 'Uploading…' : uploadCount > 1 ? `Upload ${uploadCount} Images` : 'Upload Image'}
          </AdminButton>
        </div>
      </form>
    </div>
  </div>
{/if}

{#if editModalOpen && mediaToEdit}
  <div class="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4 backdrop-blur-sm" transition:fade={{ duration: 140 }}>
    <div class="w-full max-w-xl rounded-none border border-ink/10 bg-surface p-6 shadow-[0_24px_80px_rgba(28,26,22,0.18)]" transition:scale={{ duration: 160, start: 0.98 }}>
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Edit metadata</p>
          <h2 class="mt-2 text-xl font-bold tracking-normal text-ink">{mediaToEdit.file_name}</h2>
        </div>
        <button class="grid h-10 w-10 place-items-center rounded-2xl border border-ink/10 bg-surface text-ink shadow-sm transition hover:bg-sand" type="button" aria-label="Close modal" on:click={closeEditModal}>
          <X size={18} />
        </button>
      </div>

      <form class="mt-6 grid gap-4" on:submit|preventDefault={saveMetadata}>
        <AdminFormInput label="Alt text" name="edit_alt_text" bind:value={editAltText} placeholder="Describe the image for accessibility" />
        <AdminTextArea label="Caption" name="edit_caption" bind:value={editCaption} rows={3} placeholder="Optional CMS caption." />

        <div class="flex justify-end gap-3 pt-2">
          <AdminButton variant="secondary" type="button" on:click={closeEditModal}>Cancel</AdminButton>
          <AdminButton type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Metadata'}
          </AdminButton>
        </div>
      </form>
    </div>
  </div>
{/if}

<ConfirmModal
  open={confirmOpen}
  title="Delete media"
  message={`Remove "${mediaToDelete?.file_name ?? 'this media file'}" from the media library? The database record will be soft deleted.`}
  on:cancel={() => {
    confirmOpen = false;
    mediaToDelete = null;
  }}
  on:confirm={deleteMedia}
/>

{#if deleting}
  <div class="fixed bottom-4 right-4 z-[70] rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(28,26,22,0.18)]">
    Deleting media...
  </div>
{/if}
