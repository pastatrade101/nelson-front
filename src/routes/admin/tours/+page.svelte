<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Edit, Plus, Search, Trash2 } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminEmptyState from '$lib/components/admin/AdminEmptyState.svelte';
  import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
  import AdminSelect from '$lib/components/admin/AdminSelect.svelte';
  import AdminToolbar from '$lib/components/admin/AdminToolbar.svelte';
  import ConfirmModal from '$lib/components/admin/ConfirmModal.svelte';
  import StatusBadge from '$lib/components/admin/StatusBadge.svelte';
  import ToastStack from '$lib/components/admin/ToastStack.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';
  import type { Pagination } from '$lib/types';

  type Option = {
    label: string;
    value: string;
  };

  type Tour = {
    category_id?: string | null;
    created_at?: string;
    currency?: string | null;
    destination_id?: string | null;
    destinations?: unknown;
    duration_days?: number | string | null;
    duration_nights?: number | string | null;
    id: string;
    is_available?: boolean | null;
    is_featured?: boolean | null;
    is_popular?: boolean | null;
    price_from?: number | string | null;
    short_description?: string | null;
    slug: string;
    status: 'draft' | 'published' | 'archived';
    title: string;
    tour_categories?: unknown;
    updated_at?: string;
  };

  type Toast = {
    id: string;
    message: string;
    type: 'error' | 'success';
  };

  const statusOptions = [
    { label: 'All statuses', value: 'all' },
    { label: 'Draft', value: 'draft' },
    { label: 'Published', value: 'published' },
    { label: 'Archived', value: 'archived' }
  ];

  const booleanOptions = [
    { label: 'Any', value: 'all' },
    { label: 'Yes', value: 'true' },
    { label: 'No', value: 'false' }
  ];

  let rows: Tour[] = [];
  let destinationOptions: Option[] = [{ label: 'All destinations', value: 'all' }];
  let categoryOptions: Option[] = [{ label: 'All categories', value: 'all' }];
  let pagination: Pagination | null = null;
  let loading = true;
  let deleting = false;
  let error = '';
  let search = '';
  let status = 'all';
  let destination_id = 'all';
  let category_id = 'all';
  let is_featured = 'all';
  let is_popular = 'all';
  let is_available = 'all';
  let page = 1;
  let confirmOpen = false;
  let tourToDelete: Tour | null = null;
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

  const relationText = (value: unknown, key: string) => {
    if (Array.isArray(value)) return String((value[0] as Record<string, unknown> | undefined)?.[key] ?? '-');
    if (value && typeof value === 'object') return String((value as Record<string, unknown>)[key] ?? '-');
    return '-';
  };

  const formatDate = (value?: string) => {
    if (!value) return '-';
    return new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
  };

  const formatPrice = (tour: Tour) => {
    const amount = Number(tour.price_from ?? 0);
    const currency = tour.currency || 'USD';
    return `${currency} ${Number.isFinite(amount) ? amount.toLocaleString() : '0'}`;
  };

  const loadFilters = async () => {
    try {
      const [destinations, categories] = await Promise.all([
        api.destinations.list({ limit: 100, status: 'all' }),
        api.categories.list({ limit: 100, status: 'all' })
      ]);

      destinationOptions = [
        { label: 'All destinations', value: 'all' },
        ...destinations.data.items.map((destination) => ({
          label: String(destination.name ?? destination.slug ?? 'Untitled destination'),
          value: String(destination.id)
        }))
      ];

      categoryOptions = [
        { label: 'All categories', value: 'all' },
        ...categories.data.items.map((category) => ({
          label: String(category.name ?? category.slug ?? 'Untitled category'),
          value: String(category.id)
        }))
      ];
    } catch (requestError) {
      showToast(requestError instanceof Error ? requestError.message : 'Unable to load filters.', 'error');
    }
  };

  const loadTours = async () => {
    loading = true;
    error = '';

    try {
      const response = await api.tours.list({
        category_id,
        destination_id,
        is_available,
        is_featured,
        is_popular,
        limit: 20,
        page,
        search,
        status
      });
      rows = response.data.items as Tour[];
      pagination = response.data.pagination;
    } catch (requestError) {
      error = requestError instanceof Error ? requestError.message : 'Unable to load tours.';
    } finally {
      loading = false;
    }
  };

  const applyFilters = async () => {
    page = 1;
    await loadTours();
  };

  const goToPage = async (nextPage: number) => {
    page = nextPage;
    await loadTours();
  };

  const openDeleteConfirm = (tour: Tour) => {
    tourToDelete = tour;
    confirmOpen = true;
  };

  const deleteTour = async () => {
    if (!tourToDelete) return;
    deleting = true;

    try {
      await api.tours.remove(tourToDelete.id);
      showToast('Tour deleted successfully.');
      confirmOpen = false;
      tourToDelete = null;
      await loadTours();
    } catch (requestError) {
      showToast(requestError instanceof Error ? requestError.message : 'Unable to delete tour.', 'error');
    } finally {
      deleting = false;
    }
  };

  onMount(async () => {
    await loadFilters();
    await loadTours();
  });
</script>

<ToastStack {toasts} on:dismiss={dismissToast} />

<div class="mx-auto grid w-full max-w-[1500px] gap-6">
  <AdminPageHeader
    eyebrow="Tour Management"
    title="Tours"
    description="Manage tour packages, publishing status, AI matching data, pricing, image assets, and SEO metadata."
    actionLabel="New Tour"
    actionIcon={Plus}
    on:action={() => goto('/admin/tours/new')}
  />

  <AdminToolbar className="grid gap-3 xl:grid-cols-[1fr_170px_190px_170px_150px_150px_150px_auto] xl:items-end">
    <label class="grid gap-2 text-sm font-medium text-ink">
      <span>Search</span>
      <span class="flex h-11 items-center gap-2 rounded-2xl border border-ink/10 bg-surface px-3 shadow-sm transition focus-within:border-forest/45 focus-within:ring-2 focus-within:ring-forest/10">
        <Search size={16} class="text-ink/45" />
        <input class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink/35" bind:value={search} placeholder="Search tours..." on:keydown={(event) => event.key === 'Enter' && applyFilters()} />
      </span>
    </label>

    <AdminSelect label="Status" name="status_filter" bind:value={status} options={statusOptions} />
    <AdminSelect label="Destination" name="destination_filter" bind:value={destination_id} options={destinationOptions} />
    <AdminSelect label="Category" name="category_filter" bind:value={category_id} options={categoryOptions} />
    <AdminSelect label="Available" name="available_filter" bind:value={is_available} options={booleanOptions} />
    <AdminSelect label="Featured" name="featured_filter" bind:value={is_featured} options={booleanOptions} />
    <AdminSelect label="Popular" name="popular_filter" bind:value={is_popular} options={booleanOptions} />
    <AdminButton variant="secondary" on:click={applyFilters}>Apply</AdminButton>
  </AdminToolbar>

  {#if loading}
    <LoadingState message="Loading tours..." />
  {:else if error}
    <ErrorState message={error} />
  {:else if rows.length === 0}
    <AdminEmptyState
      title="No tours found"
      message="Create your first Goldfinch tour package with CMS publishing controls, images, AI matching fields, and SEO metadata."
      actionLabel="Create tour"
      on:action={() => goto('/admin/tours/new')}
    />
  {:else}
    <div class="overflow-hidden rounded-[8px] border border-ink/10 bg-surface shadow-[0_18px_50px_rgba(15,47,36,0.06)]">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[1180px] text-start text-sm">
          <thead class="bg-sand/70 text-xs uppercase tracking-[0.08em] text-ink/60">
            <tr>
              <th class="px-4 py-3 font-semibold">Tour</th>
              <th class="px-4 py-3 font-semibold">Destination</th>
              <th class="px-4 py-3 font-semibold">Category</th>
              <th class="px-4 py-3 font-semibold">Status</th>
              <th class="px-4 py-3 font-semibold">Flags</th>
              <th class="px-4 py-3 font-semibold">Duration</th>
              <th class="px-4 py-3 font-semibold">Price</th>
              <th class="px-4 py-3 font-semibold">Updated</th>
              <th class="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-ink/10">
            {#each rows as tour}
              <tr class="transition hover:bg-sand/25">
                <td class="px-4 py-4">
                  <div class="font-semibold text-ink">{tour.title}</div>
                  <p class="mt-1 line-clamp-1 text-xs text-ink/55">{tour.short_description || tour.slug}</p>
                </td>
                <td class="px-4 py-4 text-ink/65">{relationText(tour.destinations, 'name')}</td>
                <td class="px-4 py-4 text-ink/65">{relationText(tour.tour_categories, 'name')}</td>
                <td class="px-4 py-4"><StatusBadge status={tour.status} /></td>
                <td class="px-4 py-4">
                  <div class="flex flex-wrap gap-1.5">
                    <span class={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${tour.is_available ? 'bg-forest/10 text-forest ring-forest/20' : 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
                      {tour.is_available ? 'Available' : 'Unavailable'}
                    </span>
                    {#if tour.is_featured}
                      <span class="inline-flex rounded-full bg-goldfinch-gold/15 px-2.5 py-1 text-xs font-bold text-heading ring-1 ring-goldfinch-gold/25">Featured</span>
                    {/if}
                    {#if tour.is_popular}
                      <span class="inline-flex rounded-full bg-sand px-2.5 py-1 text-xs font-bold text-ink ring-1 ring-ink/10">Popular</span>
                    {/if}
                  </div>
                </td>
                <td class="px-4 py-4 text-ink/65">{tour.duration_days ?? '-'}d / {tour.duration_nights ?? 0}n</td>
                <td class="px-4 py-4 font-semibold text-ink">{formatPrice(tour)}</td>
                <td class="px-4 py-4 text-ink/65">{formatDate(tour.updated_at ?? tour.created_at)}</td>
                <td class="px-4 py-4">
                  <div class="flex justify-end gap-2">
                    <a class="inline-flex h-9 items-center gap-2 rounded-xl border border-ink/10 bg-surface px-3 text-xs font-semibold text-ink shadow-sm transition hover:border-goldfinch-gold/35 hover:bg-sand/70" href={`/admin/tours/${tour.id}/edit`}>
                      <Edit size={14} />
                      Edit
                    </a>
                    <button class="inline-flex h-9 items-center gap-2 rounded-xl border border-red-200 bg-surface px-3 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-50" type="button" on:click={() => openDeleteConfirm(tour)}>
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
    <div class="flex flex-col gap-3 rounded-[8px] border border-ink/10 bg-surface/90 p-4 text-sm text-ink/65 shadow-[0_14px_40px_rgba(15,47,36,0.05)] sm:flex-row sm:items-center sm:justify-between">
      <p>Page {pagination.page} of {pagination.totalPages} · {pagination.total} tours</p>
      <div class="flex gap-2">
        <AdminButton variant="secondary" size="sm" disabled={page <= 1} on:click={() => goToPage(page - 1)}>Previous</AdminButton>
        <AdminButton variant="secondary" size="sm" disabled={page >= pagination.totalPages} on:click={() => goToPage(page + 1)}>Next</AdminButton>
      </div>
    </div>
  {/if}
</div>

<ConfirmModal
  open={confirmOpen}
  title="Delete tour"
  message={`Delete "${tourToDelete?.title ?? 'this tour'}"? This will soft delete it when supported by the database.`}
  on:cancel={() => {
    confirmOpen = false;
    tourToDelete = null;
  }}
  on:confirm={deleteTour}
/>

{#if deleting}
  <div class="fixed bottom-4 right-4 z-[70] rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(15,47,36,0.18)]">
    Deleting tour...
  </div>
{/if}
