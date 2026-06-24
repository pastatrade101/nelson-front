<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { ArrowLeft, Save } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminFormInput from '$lib/components/admin/AdminFormInput.svelte';
  import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
  import AdminSelect from '$lib/components/admin/AdminSelect.svelte';
  import AdminTextArea from '$lib/components/admin/AdminTextArea.svelte';
  import AiAssistButton from '$lib/components/admin/AiAssistButton.svelte';
  import AdminToolbar from '$lib/components/admin/AdminToolbar.svelte';
  import MediaPicker from '$lib/components/admin/MediaPicker.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';
  import ToastStack from '$lib/components/admin/ToastStack.svelte';

  type Option = {
    label: string;
    value: string;
  };

  type MediaItem = {
    file_name: string;
    file_url: string;
    id: string;
  };

  type PublishStatus = 'draft' | 'published' | 'archived';

  type Toast = {
    id: string;
    message: string;
    type: 'error' | 'success';
  };

  export let mode: 'create' | 'edit' = 'create';
  export let tourId = '';

  const statusOptions = [
    { label: 'Draft', value: 'draft' },
    { label: 'Published', value: 'published' },
    { label: 'Archived', value: 'archived' }
  ];

  const budgetTierOptions = [
    { label: 'Not set', value: '' },
    { label: 'Budget', value: 'budget' },
    { label: 'Mid-range', value: 'mid_range' },
    { label: 'Luxury', value: 'luxury' },
    { label: 'Ultra luxury', value: 'ultra_luxury' }
  ];

  let loading = mode === 'edit';
  let loadingOptions = true;
  let saving = false;
  let error = '';
  let slugManuallyEdited = false;
  let toasts: Toast[] = [];

  let destinationOptions: Option[] = [{ label: 'No destination', value: '' }];
  let categoryOptions: Option[] = [{ label: 'No category', value: '' }];
  let mediaItems: MediaItem[] = [];

  let form = {
    banner_image_url: '',
    budget_tier: '',
    category_id: '',
    currency: 'USD',
    destination_id: '',
    difficulty_level: '',
    duration_days: '1',
    duration_nights: '0',
    end_location: '',
    experience_type: '',
    full_description: '',
    group_size_max: '',
    group_size_min: '',
    highlights: '',
    is_available: true,
    is_featured: false,
    is_popular: false,
    main_image_url: '',
    meta_description: '',
    minimum_age: '',
    og_image_url: '',
    persona_tags: '',
    price_from: '0',
    seo_title: '',
    short_description: '',
    slug: '',
    start_location: '',
    status: 'draft' as PublishStatus,
    title: ''
  };

  // Live context handed to the AI co-pilot so its drafts fit the trip.
  const aiContext = () => ({
    title: form.title || undefined,
    destination: destinationOptions.find((o) => o.value === form.destination_id)?.label,
    duration_days: Number(form.duration_days) || undefined,
    budget_tier: form.budget_tier || undefined,
    highlights: form.highlights || undefined,
    short_description: form.short_description || undefined,
    full_description: form.full_description || undefined
  });

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

  // Coerce to string first — number <input>s bind as numbers in Svelte, so these
  // helpers must tolerate non-string values (otherwise .trim() throws on save).
  const slugify = (value: unknown) =>
    String(value ?? '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const stringList = (value: unknown) =>
    String(value ?? '')
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);

  const lineList = (value: unknown) =>
    String(value ?? '')
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);

  const nullableNumber = (value: unknown) => {
    const text = String(value ?? '').trim();
    return text === '' ? null : Number(text);
  };

  $: if (!slugManuallyEdited) {
    form.slug = slugify(form.title);
  }

  const loadOptions = async () => {
    loadingOptions = true;

    try {
      const [destinations, categories, media] = await Promise.all([
        api.destinations.list({ limit: 100, status: 'all' }),
        api.categories.list({ limit: 100, status: 'all' }),
        api.media.list({ file_type: 'image', limit: 100 })
      ]);

      destinationOptions = [
        { label: 'No destination', value: '' },
        ...destinations.data.items.map((destination) => ({
          label: String(destination.name ?? destination.slug ?? 'Untitled destination'),
          value: String(destination.id)
        }))
      ];

      categoryOptions = [
        { label: 'No category', value: '' },
        ...categories.data.items.map((category) => ({
          label: String(category.name ?? category.slug ?? 'Untitled category'),
          value: String(category.id)
        }))
      ];

      mediaItems = media.data.items as MediaItem[];
    } catch (requestError) {
      showToast(requestError instanceof Error ? requestError.message : 'Unable to load form options.', 'error');
    } finally {
      loadingOptions = false;
    }
  };

  const loadTour = async () => {
    if (mode !== 'edit' || !tourId) return;
    loading = true;
    error = '';

    try {
      const response = await api.tours.get(tourId);
      const tour = response.data as Record<string, unknown>;

      form = {
        banner_image_url: String(tour.banner_image_url ?? ''),
        budget_tier: String(tour.budget_tier ?? ''),
        category_id: String(tour.category_id ?? ''),
        currency: String(tour.currency ?? 'USD'),
        destination_id: String(tour.destination_id ?? ''),
        difficulty_level: String(tour.difficulty_level ?? ''),
        duration_days: String(tour.duration_days ?? '1'),
        duration_nights: String(tour.duration_nights ?? '0'),
        end_location: String(tour.end_location ?? ''),
        experience_type: String(tour.experience_type ?? ''),
        full_description: String(tour.full_description ?? ''),
        group_size_max: tour.group_size_max === null || tour.group_size_max === undefined ? '' : String(tour.group_size_max),
        group_size_min: tour.group_size_min === null || tour.group_size_min === undefined ? '' : String(tour.group_size_min),
        highlights: Array.isArray(tour.highlights) ? tour.highlights.join('\n') : '',
        is_available: Boolean(tour.is_available ?? true),
        is_featured: Boolean(tour.is_featured),
        is_popular: Boolean(tour.is_popular),
        main_image_url: String(tour.main_image_url ?? ''),
        meta_description: String(tour.meta_description ?? ''),
        minimum_age: tour.minimum_age === null || tour.minimum_age === undefined ? '' : String(tour.minimum_age),
        og_image_url: String(tour.og_image_url ?? tour.og_image ?? ''),
        persona_tags: Array.isArray(tour.persona_tags) ? tour.persona_tags.join(', ') : '',
        price_from: String(tour.price_from ?? '0'),
        seo_title: String(tour.seo_title ?? tour.meta_title ?? ''),
        short_description: String(tour.short_description ?? ''),
        slug: String(tour.slug ?? ''),
        start_location: String(tour.start_location ?? ''),
        status: (tour.status ?? 'draft') as PublishStatus,
        title: String(tour.title ?? '')
      };

      slugManuallyEdited = true;
    } catch (requestError) {
      error = requestError instanceof Error ? requestError.message : 'Unable to load tour.';
    } finally {
      loading = false;
    }
  };

  const payload = () => ({
    banner_image_url: form.banner_image_url || null,
    budget_tier: form.budget_tier || null,
    category_id: form.category_id || null,
    currency: String(form.currency ?? '').trim().toUpperCase() || 'USD',
    destination_id: form.destination_id || null,
    difficulty_level: form.difficulty_level || null,
    duration_days: Number(form.duration_days || 1),
    duration_nights: Number(form.duration_nights || 0),
    end_location: form.end_location || null,
    experience_type: form.experience_type || null,
    full_description: form.full_description || null,
    group_size_max: nullableNumber(form.group_size_max),
    group_size_min: nullableNumber(form.group_size_min),
    highlights: lineList(form.highlights),
    is_available: form.is_available,
    is_featured: form.is_featured,
    is_popular: form.is_popular,
    main_image_url: form.main_image_url || null,
    meta_description: form.meta_description || null,
    minimum_age: nullableNumber(form.minimum_age),
    og_image_url: form.og_image_url || null,
    persona_tags: stringList(form.persona_tags),
    price_from: Number(form.price_from || 0),
    seo_title: form.seo_title || null,
    short_description: form.short_description || null,
    slug: String(form.slug ?? '').trim(),
    start_location: form.start_location || null,
    status: form.status,
    title: String(form.title ?? '').trim()
  });

  const saveTour = async () => {
    saving = true;

    try {
      if (mode === 'edit') {
        await api.tours.update(tourId, payload());
        showToast('Tour updated successfully.');
      } else {
        await api.tours.create(payload());
        showToast('Tour created successfully.');
      }

      await goto('/admin/tours');
    } catch (requestError) {
      showToast(requestError instanceof Error ? requestError.message : 'Unable to save tour.', 'error');
    } finally {
      saving = false;
    }
  };

  onMount(async () => {
    await loadOptions();
    await loadTour();
  });
</script>

<ToastStack {toasts} on:dismiss={dismissToast} />

<div class="mx-auto grid w-full max-w-[1500px] gap-6">
  <AdminPageHeader
    eyebrow="Tour Management"
    title={mode === 'edit' ? 'Edit Tour' : 'New Tour'}
    description={mode === 'edit'
      ? 'Update tour details, CMS publishing status, AI matching data, media, and SEO metadata.'
      : 'Create a CMS-ready tour package with publishing controls, AI matching data, image assets, and SEO metadata.'}
    secondaryLabel="Back to tours"
    actionLabel={mode === 'edit' ? 'Save Changes' : 'Create Tour'}
    actionIcon={Save}
    on:secondary={() => goto('/admin/tours')}
    on:action={saveTour}
  />

  {#if loading}
    <LoadingState message="Loading tour..." />
  {:else if error}
    <ErrorState message={error} />
  {:else}
    <form class="grid gap-6" on:submit|preventDefault={saveTour}>
      <section class="rounded-[10px] border border-ink/10 bg-surface p-5 shadow-[0_18px_50px_rgba(15,47,36,0.06)]">
        <div class="mb-5 flex items-start justify-between gap-4">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Core details</p>
            <h2 class="mt-1 text-xl font-bold text-ink">Tour information</h2>
          </div>
          <AdminButton variant="secondary" type="button" on:click={() => goto('/admin/tours')}>
            <ArrowLeft size={16} />
            Back
          </AdminButton>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <AdminFormInput label="Title" name="title" bind:value={form.title} required />
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

        <div class="mt-4 grid gap-4 md:grid-cols-3">
          <AdminSelect label="Status" name="status" bind:value={form.status} options={statusOptions} />
          <AdminSelect label="Destination" name="destination_id" bind:value={form.destination_id} options={destinationOptions} />
          <AdminSelect label="Category" name="category_id" bind:value={form.category_id} options={categoryOptions} />
        </div>

        <div class="mt-4 grid gap-4">
          <div class="grid gap-1.5">
            <div class="flex justify-end gap-1.5">
              <AiAssistButton task="write_short" label="Write" getContext={aiContext} on:apply={(e) => (form.short_description = e.detail.text ?? form.short_description)} />
              <AiAssistButton task="improve" label="Improve" getContext={aiContext} getText={() => form.short_description} on:apply={(e) => (form.short_description = e.detail.text ?? form.short_description)} />
            </div>
            <AdminTextArea label="Short description" name="short_description" bind:value={form.short_description} rows={3} />
          </div>
          <div class="grid gap-1.5">
            <div class="flex justify-end gap-1.5">
              <AiAssistButton task="write_description" label="Write" getContext={aiContext} on:apply={(e) => (form.full_description = e.detail.text ?? form.full_description)} />
              <AiAssistButton task="improve" label="Improve" getContext={aiContext} getText={() => form.full_description} on:apply={(e) => (form.full_description = e.detail.text ?? form.full_description)} />
              <AiAssistButton task="shorten" label="Shorten" getContext={aiContext} getText={() => form.full_description} on:apply={(e) => (form.full_description = e.detail.text ?? form.full_description)} />
            </div>
            <AdminTextArea label="Full description" name="full_description" bind:value={form.full_description} rows={6} />
          </div>
        </div>
      </section>

      <section class="rounded-[10px] border border-ink/10 bg-surface p-5 shadow-[0_18px_50px_rgba(15,47,36,0.06)]">
        <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Pricing and logistics</p>
        <div class="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminFormInput label="Duration days" name="duration_days" type="number" bind:value={form.duration_days} required />
          <AdminFormInput label="Duration nights" name="duration_nights" type="number" bind:value={form.duration_nights} />
          <AdminFormInput label="Price from" name="price_from" type="number" bind:value={form.price_from} />
          <AdminFormInput label="Currency" name="currency" bind:value={form.currency} />
        </div>

        <div class="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminFormInput label="Group size min" name="group_size_min" type="number" bind:value={form.group_size_min} />
          <AdminFormInput label="Group size max" name="group_size_max" type="number" bind:value={form.group_size_max} />
          <AdminFormInput label="Minimum age" name="minimum_age" type="number" bind:value={form.minimum_age} />
          <AdminFormInput label="Difficulty level" name="difficulty_level" bind:value={form.difficulty_level} placeholder="Easy, Moderate, Challenging" />
        </div>

        <div class="mt-4 grid gap-4 md:grid-cols-2">
          <AdminFormInput label="Start location" name="start_location" bind:value={form.start_location} />
          <AdminFormInput label="End location" name="end_location" bind:value={form.end_location} />
        </div>
      </section>

      <section class="rounded-[10px] border border-ink/10 bg-surface p-5 shadow-[0_18px_50px_rgba(15,47,36,0.06)]">
        <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">AI matching</p>
        <div class="mt-5 grid gap-4 md:grid-cols-3">
          <AdminFormInput label="Experience type" name="experience_type" bind:value={form.experience_type} placeholder="safari, beach, trekking" />
          <AdminSelect label="Budget tier" name="budget_tier" bind:value={form.budget_tier} options={budgetTierOptions} />
          <AdminFormInput label="Persona tags" name="persona_tags" bind:value={form.persona_tags} placeholder="family, luxury, adventure" />
        </div>

        <div class="mt-4 grid gap-1.5">
          <div class="flex justify-end">
            <AiAssistButton task="suggest_highlights" label="Suggest highlights" getContext={aiContext} on:apply={(e) => (form.highlights = (e.detail.items ?? []).join('\n') || form.highlights)} />
          </div>
          <AdminTextArea label="Highlights" name="highlights" bind:value={form.highlights} rows={4} placeholder="One highlight per line. Day-by-day itinerary is managed separately in Itineraries." />
        </div>
      </section>

      <section class="rounded-[10px] border border-ink/10 bg-surface p-5 shadow-[0_18px_50px_rgba(15,47,36,0.06)]">
        <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Media</p>
        <p class="mt-1 text-sm text-ink/60">Choose images from the Media Library or paste a URL manually.</p>

        {#if loadingOptions}
          <p class="mt-4 rounded-2xl bg-sand/45 px-4 py-3 text-sm text-ink/60">Loading image options...</p>
        {/if}

        <div class="mt-5 grid gap-4 lg:grid-cols-3">
          <div class="rounded-[8px] border border-ink/10 bg-sand/20 p-4">
            <MediaPicker label="Main image" media={mediaItems} bind:value={form.main_image_url} />
          </div>
          <div class="rounded-[8px] border border-ink/10 bg-sand/20 p-4">
            <MediaPicker label="Banner image" media={mediaItems} bind:value={form.banner_image_url} />
          </div>
          <div class="rounded-[8px] border border-ink/10 bg-sand/20 p-4">
            <MediaPicker label="Open Graph image" media={mediaItems} bind:value={form.og_image_url} />
          </div>
        </div>
      </section>

      <section class="rounded-[10px] border border-ink/10 bg-surface p-5 shadow-[0_18px_50px_rgba(15,47,36,0.06)]">
        <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Publishing flags</p>
        <div class="mt-5 grid gap-3 md:grid-cols-3">
          <label class="flex items-center gap-3 rounded-2xl border border-ink/10 bg-sand/20 px-4 py-3 text-sm font-semibold text-ink">
            <input class="h-4 w-4 rounded border-ink/20 text-forest focus:ring-forest" type="checkbox" bind:checked={form.is_available} />
            Available for booking
          </label>
          <label class="flex items-center gap-3 rounded-2xl border border-ink/10 bg-sand/20 px-4 py-3 text-sm font-semibold text-ink">
            <input class="h-4 w-4 rounded border-ink/20 text-forest focus:ring-forest" type="checkbox" bind:checked={form.is_featured} />
            Featured tour
          </label>
          <label class="flex items-center gap-3 rounded-2xl border border-ink/10 bg-sand/20 px-4 py-3 text-sm font-semibold text-ink">
            <input class="h-4 w-4 rounded border-ink/20 text-forest focus:ring-forest" type="checkbox" bind:checked={form.is_popular} />
            Popular tour
          </label>
        </div>
      </section>

      <section class="rounded-[10px] border border-ink/10 bg-surface p-5 shadow-[0_18px_50px_rgba(15,47,36,0.06)]">
        <div class="flex items-center justify-between">
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">SEO</p>
          <AiAssistButton task="seo_meta" label="Generate SEO" getContext={aiContext} on:apply={(e) => { form.seo_title = e.detail.seo_title || form.seo_title; form.meta_description = e.detail.meta_description || form.meta_description; }} />
        </div>
        <div class="mt-5 grid gap-4 md:grid-cols-2">
          <AdminFormInput label="SEO title" name="seo_title" bind:value={form.seo_title} />
          <AdminTextArea label="Meta description" name="meta_description" bind:value={form.meta_description} rows={3} />
        </div>
      </section>

      <AdminToolbar className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-sm text-ink/60">Save changes to make this tour available in the CMS.</p>
        <div class="flex gap-3">
          <AdminButton variant="secondary" type="button" on:click={() => goto('/admin/tours')}>Cancel</AdminButton>
          <AdminButton type="submit" disabled={saving}>
            <Save size={16} />
            {saving ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Create Tour'}
          </AdminButton>
        </div>
      </AdminToolbar>
    </form>
  {/if}
</div>
