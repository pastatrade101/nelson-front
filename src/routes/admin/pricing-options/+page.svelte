<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { CircleDollarSign, Edit, Plus, Save, Search, Trash2, X } from '@lucide/svelte';
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

  type Option = {
    label: string;
    value: string;
  };

  type PriceType = 'discount' | 'per_child' | 'per_group' | 'per_person' | 'single_supplement' | 'upgrade';

  type PricingOption = {
    created_at?: string;
    currency?: string | null;
    description?: string | null;
    id: string;
    label?: string | null;
    price: number | string;
    price_type: PriceType;
    sort_order?: number | string | null;
    title: string;
    tour_id: string;
  };

  type Toast = {
    id: string;
    message: string;
    type: 'error' | 'success';
  };

  type TourSummary = {
    currency?: string | null;
    destination?: string;
    duration_days?: number | string | null;
    duration_nights?: number | string | null;
    id: string;
    price_from?: number | string | null;
    slug: string;
    status?: string;
    title: string;
  };

  const priceTypeOptions: Option[] = [
    { label: 'Per person', value: 'per_person' },
    { label: 'Per group', value: 'per_group' },
    { label: 'Per child', value: 'per_child' },
    { label: 'Single supplement', value: 'single_supplement' },
    { label: 'Upgrade', value: 'upgrade' },
    { label: 'Discount', value: 'discount' }
  ];

  let loadingTours = true;
  let loadingOptions = false;
  let saving = false;
  let deleting = false;
  let error = '';
  let optionsError = '';
  let search = '';
  let selectedTourId = '';
  let tours: TourSummary[] = [];
  let tourOptions: Option[] = [{ label: 'Select a tour', value: '' }];
  let pricingOptions: PricingOption[] = [];
  let modalOpen = false;
  let confirmOpen = false;
  let editingOption: PricingOption | null = null;
  let optionToDelete: PricingOption | null = null;
  let toasts: Toast[] = [];
  let form = {
    currency: 'USD',
    description: '',
    price: '',
    price_type: 'per_person',
    sort_order: '0',
    title: '',
    tour_id: ''
  };

  $: filteredTours = tours.filter((tour) => {
    const value = `${tour.title} ${tour.slug} ${tour.destination ?? ''}`.toLowerCase();
    return value.includes(search.trim().toLowerCase());
  });

  $: selectedTour = tours.find((tour) => tour.id === selectedTourId);
  $: sortedOptions = [...pricingOptions].sort((first, second) => Number(first.sort_order ?? 0) - Number(second.sort_order ?? 0));

  const relationText = (value: unknown, key: string) => {
    if (Array.isArray(value)) return String((value[0] as Record<string, unknown> | undefined)?.[key] ?? '');
    if (value && typeof value === 'object') return String((value as Record<string, unknown>)[key] ?? '');
    return '';
  };

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

  const formatDuration = (tour: TourSummary) => `${tour.duration_days ?? '-'} days / ${tour.duration_nights ?? 0} nights`;

  const formatMoney = (amount?: number | string | null, currency = 'USD') => {
    if (amount === undefined || amount === null || amount === '') return '-';
    const value = Number(amount);
    return `${currency} ${Number.isFinite(value) ? value.toLocaleString() : '0'}`;
  };

  const priceTypeLabel = (value?: string | null) => {
    const option = priceTypeOptions.find((item) => item.value === value);
    return option?.label ?? 'Per person';
  };

  const priceTypeClass = (value: string) => {
    if (value === 'discount') return 'bg-red-50 text-red-700 ring-red-100';
    if (['upgrade', 'single_supplement'].includes(value)) return 'bg-goldfinch-gold/15 text-deep-green ring-goldfinch-gold/25';
    return 'bg-forest/10 text-forest ring-forest/20';
  };

  const normalizePricingOption = (value: Record<string, unknown>): PricingOption => ({
    created_at: String(value.created_at ?? ''),
    currency: String(value.currency ?? 'USD'),
    description: String(value.description ?? ''),
    id: String(value.id ?? ''),
    label: value.label ? String(value.label) : '',
    price: (value.price ?? 0) as number | string,
    price_type: String(value.price_type ?? 'per_person') as PriceType,
    sort_order: (value.sort_order ?? 0) as number | string,
    title: String(value.title ?? value.label ?? 'Untitled price option'),
    tour_id: String(value.tour_id ?? '')
  });

  const loadTours = async () => {
    loadingTours = true;
    error = '';

    try {
      const response = await api.tours.list({ limit: 100, status: 'all' });
      tours = response.data.items.map((tour) => ({
        currency: tour.currency,
        destination: relationText((tour as Record<string, unknown>).destinations, 'name'),
        duration_days: tour.duration_days,
        duration_nights: tour.duration_nights,
        id: tour.id,
        price_from: tour.price_from,
        slug: tour.slug,
        status: tour.status,
        title: tour.title
      }));
      tourOptions = [{ label: 'Select a tour', value: '' }, ...tours.map((tour) => ({ label: tour.title, value: tour.id }))];
    } catch (requestError) {
      error = requestError instanceof Error ? requestError.message : 'Unable to load tours.';
    } finally {
      loadingTours = false;
    }
  };

  const loadPricingOptions = async () => {
    pricingOptions = [];
    optionsError = '';
    if (!selectedTourId) return;

    loadingOptions = true;

    try {
      const response = await api.pricingOptions.byTour(selectedTourId);
      pricingOptions = response.data.map((item) => normalizePricingOption(item));
    } catch (requestError) {
      optionsError = requestError instanceof Error ? requestError.message : 'Unable to load pricing options.';
    } finally {
      loadingOptions = false;
    }
  };

  const handleTourSelection = async () => {
    await loadPricingOptions();
  };

  const selectTour = async (tourId: string) => {
    selectedTourId = tourId;
    await loadPricingOptions();
  };

  const nextSortOrder = () => {
    const maxOrder = sortedOptions.reduce((max, option) => Math.max(max, Number(option.sort_order ?? 0)), 0);
    return String(maxOrder + 10);
  };

  const resetForm = () => {
    form = {
      currency: selectedTour?.currency || 'USD',
      description: '',
      price: '',
      price_type: 'per_person',
      sort_order: nextSortOrder(),
      title: '',
      tour_id: selectedTourId
    };
  };

  const openCreateModal = () => {
    if (!selectedTourId) {
      showToast('Select a parent tour before adding pricing options.', 'error');
      return;
    }

    editingOption = null;
    resetForm();
    modalOpen = true;
  };

  const openEditModal = (option: PricingOption) => {
    editingOption = option;
    form = {
      currency: option.currency || selectedTour?.currency || 'USD',
      description: option.description ?? '',
      price: String(option.price ?? ''),
      price_type: option.price_type || 'per_person',
      sort_order: String(option.sort_order ?? 0),
      title: option.title,
      tour_id: option.tour_id
    };
    modalOpen = true;
  };

  const closeModal = () => {
    modalOpen = false;
    editingOption = null;
    resetForm();
  };

  const validateForm = () => {
    if (!selectedTourId) return 'Select a parent tour first.';
    if (!form.title.trim()) return 'Title is required.';
    if (form.price.trim() === '') return 'Price is required.';
    if (Number(form.price) < 0) return 'Price must be zero or positive.';
    if (form.sort_order.trim() && !Number.isInteger(Number(form.sort_order))) return 'Sort order must be a whole number.';
    return '';
  };

  const payload = () => ({
    currency: (form.currency || 'USD').trim().toUpperCase(),
    description: form.description.trim() || null,
    price: Number(form.price),
    price_type: form.price_type,
    sort_order: Number(form.sort_order || 0),
    title: form.title.trim(),
    tour_id: form.tour_id || selectedTourId
  });

  const savePricingOption = async () => {
    const validationError = validateForm();
    if (validationError) {
      showToast(validationError, 'error');
      return;
    }

    saving = true;

    try {
      if (editingOption) {
        await api.pricingOptions.update(editingOption.id, payload());
        showToast('Pricing option updated successfully.');
      } else {
        await api.pricingOptions.create(payload());
        showToast('Pricing option added successfully.');
      }

      closeModal();
      await loadPricingOptions();
    } catch (requestError) {
      showToast(requestError instanceof Error ? requestError.message : 'Unable to save pricing option.', 'error');
    } finally {
      saving = false;
    }
  };

  const openDeleteConfirm = (option: PricingOption) => {
    optionToDelete = option;
    confirmOpen = true;
  };

  const deletePricingOption = async () => {
    if (!optionToDelete) return;
    deleting = true;

    try {
      await api.pricingOptions.remove(optionToDelete.id);
      showToast('Pricing option deleted successfully.');
      confirmOpen = false;
      optionToDelete = null;
      await loadPricingOptions();
    } catch (requestError) {
      showToast(requestError instanceof Error ? requestError.message : 'Unable to delete pricing option.', 'error');
    } finally {
      deleting = false;
    }
  };

  onMount(loadTours);
</script>

<ToastStack {toasts} on:dismiss={dismissToast} />

<div class="mx-auto grid w-full max-w-[1500px] gap-6">
  <AdminPageHeader
    eyebrow="Tour Management"
    title="Pricing Options"
    description="Manage price variations such as per-person rates, group pricing, child rates, supplements, upgrades, and discounts for a selected tour."
    actionLabel="Add Pricing Option"
    actionIcon={Plus}
    on:action={openCreateModal}
  />

  <AdminToolbar className="grid gap-3 lg:grid-cols-[1fr_360px] lg:items-end">
    <label class="grid gap-2 text-sm font-medium text-ink">
      <span>Search tours</span>
      <span class="flex h-11 items-center gap-2 rounded-2xl border border-ink/10 bg-white px-3 shadow-sm transition focus-within:border-forest/45 focus-within:ring-2 focus-within:ring-forest/10">
        <Search size={16} class="text-ink/45" />
        <input class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink/35" bind:value={search} placeholder="Find a parent tour..." />
      </span>
    </label>

    <AdminSelect label="Parent tour" name="tour_id" bind:value={selectedTourId} options={tourOptions} on:change={handleTourSelection} />
  </AdminToolbar>

  {#if loadingTours}
    <LoadingState message="Loading tours..." />
  {:else if error}
    <ErrorState message={error} />
  {:else if tours.length === 0}
    <AdminEmptyState
      title="Create a tour first"
      message="Pricing options must belong to a parent tour. Create the tour package first, then return here to manage price variations."
      icon={CircleDollarSign}
    />
  {:else if !selectedTour}
    <div class="grid gap-4 rounded-[10px] border border-ink/10 bg-white p-5 shadow-[0_18px_50px_rgba(15,47,36,0.06)]">
      <div>
        <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Select a parent tour</p>
        <h2 class="mt-1 text-xl font-bold text-ink">Pricing options are child records</h2>
        <p class="mt-2 max-w-3xl text-sm leading-6 text-ink/62">
          Tours are the main travel products. Pricing options are separate price records linked by <span class="font-semibold text-ink">tour_price_options.tour_id</span>.
          Select a tour before adding price variations.
        </p>
      </div>

      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {#each filteredTours as tour}
          <button
            class="rounded-[8px] border border-ink/10 bg-sand/20 p-4 text-left transition hover:border-goldfinch-gold/45 hover:bg-sand/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/20"
            type="button"
            on:click={() => selectTour(tour.id)}
          >
            <p class="font-semibold text-ink">{tour.title}</p>
            <p class="mt-1 text-xs text-ink/55">{tour.destination || tour.slug}</p>
            <div class="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-forest">
              <span>{formatDuration(tour)}</span>
              <span>{formatMoney(tour.price_from, tour.currency || 'USD')}</span>
            </div>
          </button>
        {/each}
      </div>
    </div>
  {:else}
    <section class="rounded-[10px] border border-ink/10 bg-white p-5 shadow-[0_18px_50px_rgba(15,47,36,0.06)]">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Selected parent tour</p>
          <h2 class="mt-1 text-xl font-bold text-ink">{selectedTour.title}</h2>
          <div class="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-ink/58">
            <span class="rounded-full bg-sand/70 px-3 py-1">{selectedTour.destination || selectedTour.slug}</span>
            <span class="rounded-full bg-sand/70 px-3 py-1">{formatDuration(selectedTour)}</span>
            <span class="rounded-full bg-sand/70 px-3 py-1">{formatMoney(selectedTour.price_from, selectedTour.currency || 'USD')}</span>
            <StatusBadge status={selectedTour.status || 'draft'} />
          </div>
        </div>

        <AdminButton on:click={openCreateModal}>
          <Plus size={16} />
          Add Pricing Option
        </AdminButton>
      </div>
    </section>

    {#if loadingOptions}
      <LoadingState message="Loading pricing options..." />
    {:else if optionsError}
      <ErrorState message={optionsError} />
    {:else if sortedOptions.length === 0}
      <AdminEmptyState
        title="No pricing options added yet"
        message="Add the first price option for this tour."
        actionLabel="Add Pricing Option"
        icon={CircleDollarSign}
        on:action={openCreateModal}
      />
    {:else}
      <div class="overflow-hidden rounded-[8px] border border-ink/10 bg-white shadow-[0_18px_50px_rgba(15,47,36,0.06)]">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[980px] text-start text-sm">
            <thead class="bg-sand/70 text-xs uppercase tracking-[0.08em] text-ink/60">
              <tr>
                <th class="px-4 py-3 font-semibold">Pricing Option</th>
                <th class="px-4 py-3 font-semibold">Type</th>
                <th class="px-4 py-3 font-semibold">Price</th>
                <th class="px-4 py-3 font-semibold">Sort Order</th>
                <th class="px-4 py-3 font-semibold">Description</th>
                <th class="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-ink/10">
              {#each sortedOptions as option}
                <tr class="transition hover:bg-sand/25">
                  <td class="px-4 py-4">
                    <div class="flex items-center gap-3">
                      <span class="grid h-10 w-10 place-items-center rounded-2xl bg-forest/10 text-forest ring-1 ring-forest/15">
                        <CircleDollarSign size={17} />
                      </span>
                      <div>
                        <p class="font-semibold text-ink">{option.title}</p>
                        <p class="mt-1 text-xs text-ink/50">Price variation</p>
                      </div>
                    </div>
                  </td>
                  <td class="px-4 py-4">
                    <span class={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${priceTypeClass(option.price_type)}`}>
                      {priceTypeLabel(option.price_type)}
                    </span>
                  </td>
                  <td class="px-4 py-4 font-semibold text-ink">{formatMoney(option.price, option.currency || selectedTour.currency || 'USD')}</td>
                  <td class="px-4 py-4 text-ink/65">{option.sort_order ?? 0}</td>
                  <td class="max-w-xs px-4 py-4 text-ink/62">
                    <p class="line-clamp-2">{option.description || '-'}</p>
                  </td>
                  <td class="px-4 py-4">
                    <div class="flex justify-end gap-2">
                      <button class="inline-flex h-9 items-center gap-2 rounded-xl border border-ink/10 bg-white px-3 text-xs font-semibold text-ink shadow-sm transition hover:border-goldfinch-gold/35 hover:bg-sand/70" type="button" on:click={() => openEditModal(option)}>
                        <Edit size={14} />
                        Edit
                      </button>
                      <button class="inline-flex h-9 items-center gap-2 rounded-xl border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-50" type="button" on:click={() => openDeleteConfirm(option)}>
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
  {/if}
</div>

{#if modalOpen}
  <div class="fixed inset-0 z-50 grid place-items-center bg-ink/45 p-4 backdrop-blur-sm" transition:fade={{ duration: 140 }}>
    <form class="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[10px] border border-ink/10 bg-white p-5 shadow-[0_24px_80px_rgba(15,47,36,0.18)] sm:p-6" transition:scale={{ duration: 160, start: 0.98 }} on:submit|preventDefault={savePricingOption}>
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">{editingOption ? 'Edit pricing option' : 'New pricing option'}</p>
          <h2 class="mt-1 text-2xl font-bold text-ink">{editingOption ? editingOption.title : 'Add price variation'}</h2>
          <p class="mt-2 text-sm leading-6 text-ink/60">Save the price option for {selectedTour?.title ?? 'the selected tour'}.</p>
        </div>
        <button class="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-ink/10 bg-white text-ink shadow-sm transition hover:bg-sand" type="button" aria-label="Close pricing option form" on:click={closeModal}>
          <X size={18} />
        </button>
      </div>

      <div class="mt-6 grid gap-4 md:grid-cols-[1fr_180px]">
        <AdminFormInput label="Title" name="title" bind:value={form.title} placeholder="Adult rate, Private group, Single supplement..." required />
        <AdminFormInput label="Sort order" name="sort_order" type="number" bind:value={form.sort_order} />
      </div>

      <div class="mt-4 grid gap-4 md:grid-cols-3">
        <AdminFormInput label="Price" name="price" type="number" bind:value={form.price} placeholder="2500" required />
        <AdminFormInput label="Currency" name="currency" bind:value={form.currency} placeholder="USD" />
        <AdminSelect label="Price type" name="price_type" bind:value={form.price_type} options={priceTypeOptions} />
      </div>

      <div class="mt-4">
        <AdminTextArea label="Description" name="description" bind:value={form.description} rows={4} placeholder="Explain when this price applies..." />
      </div>

      <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <AdminButton variant="secondary" type="button" on:click={closeModal}>Cancel</AdminButton>
        <AdminButton type="submit" disabled={saving}>
          <Save size={16} />
          {saving ? 'Saving...' : editingOption ? 'Save Changes' : 'Add Pricing Option'}
        </AdminButton>
      </div>
    </form>
  </div>
{/if}

<ConfirmModal
  open={confirmOpen}
  title="Delete pricing option"
  message={`Delete "${optionToDelete?.title ?? 'this pricing option'}"?`}
  on:cancel={() => {
    confirmOpen = false;
    optionToDelete = null;
  }}
  on:confirm={deletePricingOption}
/>

{#if deleting}
  <div class="fixed bottom-4 right-4 z-[70] rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(15,47,36,0.18)]">
    Deleting pricing option...
  </div>
{/if}
