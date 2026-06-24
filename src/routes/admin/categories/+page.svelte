<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { Edit, Plus, Search, Trash2, X } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminEmptyState from '$lib/components/admin/AdminEmptyState.svelte';
  import AdminFormInput from '$lib/components/admin/AdminFormInput.svelte';
  import AdminFileUpload from '$lib/components/admin/AdminFileUpload.svelte';
  import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
  import AdminSelect from '$lib/components/admin/AdminSelect.svelte';
  import AdminTextArea from '$lib/components/admin/AdminTextArea.svelte';
  import AdminToolbar from '$lib/components/admin/AdminToolbar.svelte';
  import ConfirmModal from '$lib/components/admin/ConfirmModal.svelte';
  import StatusBadge from '$lib/components/admin/StatusBadge.svelte';
  import ToastStack from '$lib/components/admin/ToastStack.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';

  type Category = {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    who_its_for?: string | null;
    fitness?: string | null;
    highlights?: string[] | null;
    icon_url?: string | null;
    image_url?: string | null;
    lottie_url?: string | null;
    status: 'draft' | 'published' | 'archived';
    sort_order: number;
    meta_title?: string | null;
    meta_description?: string | null;
    created_at?: string;
    updated_at?: string;
  };

  type CategoryForm = {
    description: string;
    who_its_for: string;
    fitness: string;
    highlights: string;
    icon_url: string;
    image_url: string;
    lottie_url: string;
    meta_description: string;
    meta_title: string;
    name: string;
    slug: string;
    sort_order: string;
    status: 'draft' | 'published' | 'archived';
  };

  type IconAssetMode = 'none' | 'icon_url' | 'icon_upload' | 'lottie_url' | 'lottie_upload';
  type ImageAssetMode = 'none' | 'image_url' | 'image_upload';

  type Toast = {
    id: string;
    message: string;
    type: 'error' | 'success';
  };

  const emptyForm = (): CategoryForm => ({
    description: '',
    who_its_for: '',
    fitness: '',
    highlights: '',
    icon_url: '',
    image_url: '',
    lottie_url: '',
    meta_description: '',
    meta_title: '',
    name: '',
    slug: '',
    sort_order: '0',
    status: 'draft'
  });

  const statusOptions = [
    { label: 'Draft', value: 'draft' },
    { label: 'Published', value: 'published' },
    { label: 'Archived', value: 'archived' }
  ];

  const iconAssetOptions = [
    { label: 'No icon or animation', value: 'none' },
    { label: 'Paste icon URL', value: 'icon_url' },
    { label: 'Upload icon file', value: 'icon_upload' },
    { label: 'Paste Lottie URL', value: 'lottie_url' },
    { label: 'Upload Lottie file', value: 'lottie_upload' }
  ];

  const imageAssetOptions = [
    { label: 'No category image', value: 'none' },
    { label: 'Paste image URL', value: 'image_url' },
    { label: 'Upload image file', value: 'image_upload' }
  ];

  let rows: Category[] = [];
  let loading = true;
  let saving = false;
  let deleting = false;
  let error = '';
  let search = '';
  let status = 'all';
  let modalOpen = false;
  let confirmOpen = false;
  let slugManuallyEdited = false;
  let editingCategory: Category | null = null;
  let categoryToDelete: Category | null = null;
  let form = emptyForm();
  let iconAssetMode: IconAssetMode = 'none';
  let imageAssetMode: ImageAssetMode = 'none';
  let lastIconAssetMode: IconAssetMode = 'none';
  let lastImageAssetMode: ImageAssetMode = 'none';
  let toasts: Toast[] = [];

  const slugify = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  $: if (modalOpen && !slugManuallyEdited) {
    form.slug = slugify(form.name);
  }

  $: if (modalOpen && iconAssetMode !== lastIconAssetMode) {
    form.icon_url = '';
    form.lottie_url = '';
    lastIconAssetMode = iconAssetMode;
  }

  $: if (modalOpen && imageAssetMode !== lastImageAssetMode) {
    form.image_url = '';
    lastImageAssetMode = imageAssetMode;
  }

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

  const loadCategories = async () => {
    loading = true;
    error = '';

    try {
      const response = await api.categories.list({
        limit: 50,
        search,
        status
      });
      rows = response.data.items as Category[];
    } catch (requestError) {
      error = requestError instanceof Error ? requestError.message : 'Unable to load categories.';
    } finally {
      loading = false;
    }
  };

  const openCreateModal = () => {
    editingCategory = null;
    form = emptyForm();
    iconAssetMode = 'none';
    imageAssetMode = 'none';
    lastIconAssetMode = iconAssetMode;
    lastImageAssetMode = imageAssetMode;
    slugManuallyEdited = false;
    modalOpen = true;
  };

  const openEditModal = (category: Category) => {
    editingCategory = category;
    form = {
      description: category.description ?? '',
      who_its_for: category.who_its_for ?? '',
      fitness: category.fitness ?? '',
      highlights: Array.isArray(category.highlights) ? category.highlights.join('\n') : '',
      icon_url: category.icon_url ?? '',
      image_url: category.image_url ?? '',
      lottie_url: category.lottie_url ?? '',
      meta_description: category.meta_description ?? '',
      meta_title: category.meta_title ?? '',
      name: category.name,
      slug: category.slug,
      sort_order: String(category.sort_order ?? 0),
      status: category.status ?? 'draft'
    };
    iconAssetMode = category.lottie_url ? 'lottie_url' : category.icon_url ? 'icon_url' : 'none';
    imageAssetMode = category.image_url ? 'image_url' : 'none';
    lastIconAssetMode = iconAssetMode;
    lastImageAssetMode = imageAssetMode;
    slugManuallyEdited = true;
    modalOpen = true;
  };

  const closeModal = () => {
    modalOpen = false;
    editingCategory = null;
    slugManuallyEdited = false;
    form = emptyForm();
    iconAssetMode = 'none';
    imageAssetMode = 'none';
    lastIconAssetMode = iconAssetMode;
    lastImageAssetMode = imageAssetMode;
  };

  const payload = () => ({
    description: form.description || null,
    who_its_for: form.who_its_for || null,
    fitness: form.fitness || null,
    highlights: form.highlights.split('\n').map((s) => s.trim()).filter(Boolean),
    icon_url: iconAssetMode === 'icon_url' || iconAssetMode === 'icon_upload' ? form.icon_url || null : null,
    image_url: imageAssetMode === 'image_url' || imageAssetMode === 'image_upload' ? form.image_url || null : null,
    lottie_url: iconAssetMode === 'lottie_url' || iconAssetMode === 'lottie_upload' ? form.lottie_url || null : null,
    meta_description: form.meta_description || null,
    meta_title: form.meta_title || null,
    name: form.name.trim(),
    slug: form.slug.trim(),
    sort_order: Number(form.sort_order || 0),
    status: form.status
  });

  const saveCategory = async () => {
    saving = true;

    try {
      if (editingCategory) {
        await api.categories.update(editingCategory.id, payload());
        showToast('Category updated successfully.');
      } else {
        await api.categories.create(payload());
        showToast('Category created successfully.');
      }

      closeModal();
      await loadCategories();
    } catch (requestError) {
      showToast(requestError instanceof Error ? requestError.message : 'Unable to save category.', 'error');
    } finally {
      saving = false;
    }
  };

  const openDeleteConfirm = (category: Category) => {
    categoryToDelete = category;
    confirmOpen = true;
  };

  const deleteCategory = async () => {
    if (!categoryToDelete) return;
    deleting = true;

    try {
      await api.categories.remove(categoryToDelete.id);
      showToast('Category deleted successfully.');
      confirmOpen = false;
      categoryToDelete = null;
      await loadCategories();
    } catch (requestError) {
      showToast(requestError instanceof Error ? requestError.message : 'Unable to delete category.', 'error');
    } finally {
      deleting = false;
    }
  };

  const formatDate = (value?: string) => {
    if (!value) return '-';
    return new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
  };

  onMount(loadCategories);
</script>

<ToastStack {toasts} on:dismiss={dismissToast} />

<div class="mx-auto grid w-full max-w-[1500px] gap-6">
<AdminPageHeader
  eyebrow="Tour Management"
  title="Tour Categories"
  description="Manage tour package categories, visual badges, sort order, publishing status, and SEO metadata."
  actionLabel="New Category"
  actionIcon={Plus}
  on:action={openCreateModal}
/>

<AdminToolbar className="grid gap-3 md:grid-cols-[1fr_190px_auto] md:items-end">
  <label class="grid gap-2 text-sm font-medium text-ink">
    <span>Search</span>
    <span class="flex h-11 items-center gap-2 rounded-2xl border border-ink/10 bg-surface px-3 shadow-sm transition focus-within:border-forest/45 focus-within:ring-2 focus-within:ring-forest/10">
      <Search size={16} class="text-ink/45" />
      <input class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink/35" bind:value={search} placeholder="Search categories..." on:keydown={(event) => event.key === 'Enter' && loadCategories()} />
    </span>
  </label>

  <AdminSelect label="Status" name="status_filter" bind:value={status} options={[{ label: 'All statuses', value: 'all' }, ...statusOptions]} />

  <AdminButton variant="secondary" on:click={loadCategories}>Apply</AdminButton>
</AdminToolbar>

{#if loading}
  <LoadingState message="Loading categories..." />
{:else if error}
  <ErrorState message={error} />
{:else if rows.length === 0}
  <AdminEmptyState
    title="No categories found"
    message="Create your first tour category to organize Goldfinch tour packages and prepare reusable CMS navigation."
    actionLabel="Create category"
    on:action={openCreateModal}
  />
{:else}
  <div class="overflow-hidden rounded-[8px] border border-ink/10 bg-surface shadow-[0_18px_50px_rgba(15,47,36,0.06)]">
    <div class="overflow-x-auto">
      <table class="w-full min-w-[920px] text-start text-sm">
        <thead class="bg-sand/70 text-xs uppercase tracking-[0.08em] text-ink/60">
          <tr>
            <th class="px-4 py-3 font-semibold">Name</th>
            <th class="px-4 py-3 font-semibold">Slug</th>
            <th class="px-4 py-3 font-semibold">Status</th>
            <th class="px-4 py-3 font-semibold">Sort</th>
            <th class="px-4 py-3 font-semibold">Updated</th>
            <th class="px-4 py-3 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-ink/10">
          {#each rows as category}
            <tr class="transition hover:bg-sand/25">
              <td class="px-4 py-4">
                <div class="font-semibold text-ink">{category.name}</div>
                <p class="mt-1 line-clamp-1 text-xs text-ink/55">{category.description || 'No description yet.'}</p>
              </td>
              <td class="px-4 py-4 text-ink/65">{category.slug}</td>
              <td class="px-4 py-4"><StatusBadge status={category.status} /></td>
              <td class="px-4 py-4 text-ink/65">{category.sort_order ?? 0}</td>
              <td class="px-4 py-4 text-ink/65">{formatDate(category.updated_at ?? category.created_at)}</td>
              <td class="px-4 py-4">
                <div class="flex justify-end gap-2">
                  <button class="inline-flex h-9 items-center gap-2 rounded-xl border border-ink/10 bg-surface px-3 text-xs font-semibold text-ink shadow-sm transition hover:border-goldfinch-gold/35 hover:bg-sand/70" type="button" on:click={() => openEditModal(category)}>
                    <Edit size={14} />
                    Edit
                  </button>
                  <button class="inline-flex h-9 items-center gap-2 rounded-xl border border-red-200 bg-surface px-3 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-50" type="button" on:click={() => openDeleteConfirm(category)}>
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
</div>

{#if modalOpen}
  <div class="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4 backdrop-blur-sm" transition:fade={{ duration: 140 }}>
    <div class="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[10px] border border-ink/10 bg-surface p-6 shadow-[0_24px_80px_rgba(15,47,36,0.18)]" transition:scale={{ duration: 160, start: 0.98 }}>
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">{editingCategory ? 'Edit category' : 'New category'}</p>
          <h2 class="mt-2 text-2xl font-bold tracking-normal text-ink">{editingCategory ? editingCategory.name : 'Create Tour Category'}</h2>
        </div>
        <button class="grid h-10 w-10 place-items-center rounded-2xl border border-ink/10 bg-surface text-ink shadow-sm transition hover:bg-sand" type="button" aria-label="Close modal" on:click={closeModal}>
          <X size={18} />
        </button>
      </div>

      <form class="mt-6 grid gap-4" on:submit|preventDefault={saveCategory}>
        <div class="grid gap-4 md:grid-cols-2">
          <AdminFormInput label="Name" name="name" bind:value={form.name} required />

          <label class="grid gap-2 text-sm font-medium text-ink">
            <span>Slug</span>
            <input
              class="h-11 rounded-2xl border border-ink/10 bg-surface px-3 text-sm outline-none shadow-sm transition focus:border-forest focus:ring-2 focus:ring-forest/15"
              name="slug"
              bind:value={form.slug}
              required
              on:input={() => (slugManuallyEdited = true)}
            />
          </label>
        </div>

        <AdminTextArea label="Description" name="description" bind:value={form.description} rows={4} placeholder="Short category description for CMS and public pages." />

        <div class="rounded-2xl border border-ink/10 bg-sand/20 p-4">
          <p class="text-sm font-bold text-ink">Experience page enrichment</p>
          <p class="mt-0.5 text-xs text-ink/55">Shown on the public /experiences/{form.slug || 'slug'} page. Leave blank to hide.</p>
          <div class="mt-4 grid gap-4">
            <AdminTextArea label="Who it's for" name="who_its_for" bind:value={form.who_its_for} rows={2} placeholder="First-timers, families and photographers…" />
            <AdminFormInput label="Fitness" name="fitness" bind:value={form.fitness} placeholder="Easy — game drives, no walking required." />
            <AdminTextArea label="Highlights (one per line)" name="highlights" bind:value={form.highlights} rows={4} placeholder={'The Great Migration\nBig Five game viewing'} />
          </div>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <AdminSelect label="Status" name="status" bind:value={form.status} options={statusOptions} />
          <AdminFormInput label="Sort order" name="sort_order" type="number" bind:value={form.sort_order} />
        </div>

        <div class="grid gap-4 lg:grid-cols-2">
          <section class="grid gap-4 rounded-[8px] border border-ink/10 bg-sand/20 p-4">
            <div>
              <h3 class="text-base font-semibold text-ink">Icon or animation</h3>
              <p class="mt-1 text-sm text-ink/55">Choose one visual source for the category badge.</p>
            </div>

            <AdminSelect label="Source" name="icon_asset_mode" bind:value={iconAssetMode} options={iconAssetOptions} />

            {#if iconAssetMode === 'icon_url'}
              <AdminFormInput label="Icon URL" name="icon_url" bind:value={form.icon_url} placeholder="https://..." />
            {:else if iconAssetMode === 'icon_upload'}
              <AdminFileUpload
                label="Upload icon file"
                folder="categories/icons"
                value={form.icon_url}
                helper="Use a png, jpg, or webp icon file."
                on:uploaded={(event) => {
                  form.icon_url = event.detail.url;
                  showToast('Icon file uploaded successfully.');
                }}
                on:error={(event) => showToast(event.detail, 'error')}
              />
            {:else if iconAssetMode === 'lottie_url'}
              <AdminFormInput label="Lottie URL" name="lottie_url" bind:value={form.lottie_url} placeholder="https://..." />
            {:else if iconAssetMode === 'lottie_upload'}
              <AdminFileUpload
                label="Upload Lottie JSON"
                accept="application/json,text/json,.json"
                folder="categories/lottie"
                kind="lottie"
                value={form.lottie_url}
                helper="Use a valid Lottie .json file."
                on:uploaded={(event) => {
                  form.lottie_url = event.detail.url;
                  showToast('Lottie file uploaded successfully.');
                }}
                on:error={(event) => showToast(event.detail, 'error')}
              />
            {:else}
              <p class="rounded-2xl border border-dashed border-ink/15 bg-surface px-3 py-3 text-sm text-ink/55">No icon or animation will be saved.</p>
            {/if}
          </section>

          <section class="grid gap-4 rounded-[8px] border border-ink/10 bg-sand/20 p-4">
            <div>
              <h3 class="text-base font-semibold text-ink">Category image</h3>
              <p class="mt-1 text-sm text-ink/55">Choose one image source for category cards and headers.</p>
            </div>

            <AdminSelect label="Source" name="image_asset_mode" bind:value={imageAssetMode} options={imageAssetOptions} />

            {#if imageAssetMode === 'image_url'}
              <AdminFormInput label="Image URL" name="image_url" bind:value={form.image_url} placeholder="https://..." />
            {:else if imageAssetMode === 'image_upload'}
              <AdminFileUpload
                label="Upload image file"
                folder="categories/images"
                value={form.image_url}
                helper="Use a local png, jpg, or webp category image."
                on:uploaded={(event) => {
                  form.image_url = event.detail.url;
                  showToast('Category image uploaded successfully.');
                }}
                on:error={(event) => showToast(event.detail, 'error')}
              />
            {:else}
              <p class="rounded-2xl border border-dashed border-ink/15 bg-surface px-3 py-3 text-sm text-ink/55">No category image will be saved.</p>
            {/if}
          </section>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <AdminFormInput label="SEO title" name="meta_title" bind:value={form.meta_title} />
          <AdminTextArea label="SEO description" name="meta_description" bind:value={form.meta_description} rows={3} />
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <AdminButton variant="secondary" type="button" on:click={closeModal}>Cancel</AdminButton>
          <AdminButton type="submit" disabled={saving}>
            {saving ? 'Saving...' : editingCategory ? 'Save Changes' : 'Create Category'}
          </AdminButton>
        </div>
      </form>
    </div>
  </div>
{/if}

<ConfirmModal
  open={confirmOpen}
  title="Delete category"
  message={`Delete "${categoryToDelete?.name ?? 'this category'}"? This will soft delete it when supported by the database.`}
  on:cancel={() => {
    confirmOpen = false;
    categoryToDelete = null;
  }}
  on:confirm={deleteCategory}
/>

{#if deleting}
  <div class="fixed bottom-4 right-4 z-[70] rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(15,47,36,0.18)]">
    Deleting category...
  </div>
{/if}
