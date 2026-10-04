<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { beforeNavigate } from '$app/navigation';
  import { BookOpen, Check, ChevronRight, Edit, ExternalLink, FileText, Image, MapPin, Plus, Save, Search, Settings2, ShieldCheck, Trash2, X } from '@lucide/svelte';
  import { destinationChanges, validateDestination, type DestinationIssue } from '$lib/admin/destination-form';
  import { api } from '$lib/api/client';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminEmptyState from '$lib/components/admin/AdminEmptyState.svelte';
  import MediaPicker from '$lib/components/admin/MediaPicker.svelte';
  import DestinationGuideEditor from '$lib/components/admin/DestinationGuideEditor.svelte';
  import AdminFormInput from '$lib/components/admin/AdminFormInput.svelte';
  import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
  import AdminSelect from '$lib/components/admin/AdminSelect.svelte';
  import AdminTextArea from '$lib/components/admin/AdminTextArea.svelte';
  import RichTextEditor from '$lib/components/admin/RichTextEditor.svelte';
  import AdminToolbar from '$lib/components/admin/AdminToolbar.svelte';
  import ConfirmModal from '$lib/components/admin/ConfirmModal.svelte';
  import StatusBadge from '$lib/components/admin/StatusBadge.svelte';
  import ToastStack from '$lib/components/admin/ToastStack.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';

  type PublishStatus = 'draft' | 'published' | 'archived';
  type MediaItem = { file_name: string; file_url: string; id: string; thumbnail_url?: string | null };

  type Destination = {
    id: string;
    name: string;
    slug: string;
    country?: string | null;
    region?: string | null;
    location?: string | null;
    short_description?: string | null;
    description?: string | null;
    main_image_url?: string | null;
    image_url?: string | null;
    banner_image_url?: string | null;
    latitude?: number | string | null;
    longitude?: number | string | null;
    safety_overview?: string | null;
    health_vaccinations?: string | null;
    security_advice?: string | null;
    travel_insurance_note?: string | null;
    emergency_contacts?: string | null;
    score_wildlife?: number | string | null;
    score_luxury?: number | string | null;
    score_family?: number | string | null;
    score_photography?: number | string | null;
    score_adventure?: number | string | null;
    score_budget_from?: number | string | null;
    status: PublishStatus;
    is_featured?: boolean | null;
    meta_title?: string | null;
    meta_description?: string | null;
    og_image_url?: string | null;
    guide?: unknown[];
    guide_reviewed_at?: string | null;
    created_at?: string;
    updated_at?: string;
    deleted_at?: string | null;
  };

  type DestinationForm = {
    banner_image_url: string;
    country: string;
    description: string;
    emergency_contacts: string;
    health_vaccinations: string;
    score_wildlife: string;
    score_luxury: string;
    score_family: string;
    score_photography: string;
    score_adventure: string;
    score_budget_from: string;
    is_featured: boolean;
    latitude: string;
    location: string;
    longitude: string;
    main_image_url: string;
    meta_description: string;
    meta_title: string;
    name: string;
    og_image_url: string;
    region: string;
    safety_overview: string;
    security_advice: string;
    short_description: string;
    slug: string;
    status: PublishStatus;
    travel_insurance_note: string;
    guide: any[];
    guide_reviewed_at: string;
  };

  type Toast = {
    id: string;
    message: string;
    type: 'error' | 'success';
  };

  const emptyForm = (): DestinationForm => ({
    banner_image_url: '',
    country: 'Tanzania',
    description: '',
    emergency_contacts: '',
    health_vaccinations: '',
    score_wildlife: '',
    score_luxury: '',
    score_family: '',
    score_photography: '',
    score_adventure: '',
    score_budget_from: '',
    is_featured: false,
    latitude: '',
    location: '',
    longitude: '',
    main_image_url: '',
    meta_description: '',
    meta_title: '',
    name: '',
    og_image_url: '',
    region: '',
    safety_overview: '',
    security_advice: '',
    short_description: '',
    slug: '',
    status: 'draft',
    travel_insurance_note: '',
    guide: [],
    guide_reviewed_at: ''
  });

  const statusOptions = [
    { label: 'Draft', value: 'draft' },
    { label: 'Published', value: 'published' },
    { label: 'Archived', value: 'archived' }
  ];


  let rows: Destination[] = [];
  let loading = true;
  let saving = false;
  let deleting = false;
  let error = '';
  let search = '';
  let status = 'all';
  let modalOpen = false;
  let confirmOpen = false;
  let slugManuallyEdited = false;
  let editingDestination: Destination | null = null;
  let destinationToDelete: Destination | null = null;
  let form = emptyForm();
  let mediaItems: MediaItem[] = [];
  let loadingMedia = false;
  let toasts: Toast[] = [];
  const sections = [
    { id: 'overview', label: 'Overview', hint: 'Name, location & introduction', icon: FileText },
    { id: 'images', label: 'Photography', hint: 'Cards, banner & sharing', icon: Image },
    { id: 'guide', label: 'Travel guide', hint: 'Build the destination story', icon: BookOpen },
    { id: 'planning', label: 'Trip planning', hint: 'Ratings, budget & map', icon: MapPin },
    { id: 'safety', label: 'Health & safety', hint: 'Practical travel advice', icon: ShieldCheck },
    { id: 'publishing', label: 'Publishing & SEO', hint: 'Visibility & search results', icon: Settings2 }
  ];
  let activeSection = 'overview';
  let initialForm = '';
  let initialPayload: ReturnType<typeof payload> | null = null;
  let discardOpen = false;
  let saveError = '';
  let issues: DestinationIssue[] = [];
  let editorScroll: HTMLDivElement;
  let editorForm: HTMLFormElement;
  $: dirty = modalOpen && JSON.stringify(form) !== initialForm;
  $: currentSection = sections.find((section) => section.id === activeSection) ?? sections[0];

  const beginEditing = () => {
    activeSection = 'overview';
    discardOpen = false;
    saveError = '';
    issues = [];
    initialForm = JSON.stringify(form);
    // Nested guide blocks must not share references with the editable form.
    initialPayload = JSON.parse(JSON.stringify(payload()));
    modalOpen = true;
  };
  const selectSection = (id: string) => {
    activeSection = id;
    editorScroll?.scrollTo({ top: 0 });
  };
  const focusIssue = async (issue: DestinationIssue) => {
    selectSection(issue.section);
    await tick();
    editorForm?.querySelector<HTMLElement>(`[name="${issue.field}"]`)?.focus();
  };
  const requestClose = () => {
    if (saving) return;
    if (dirty) discardOpen = true;
    else closeModal();
  };
  const mountDialog = (node: HTMLDialogElement) => {
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    node.showModal();
    return { destroy() {
      node.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    } };
  };
  const protectUnload = (event: BeforeUnloadEvent) => {
    if (!dirty) return;
    event.preventDefault();
    event.returnValue = '';
  };
  beforeNavigate(({ cancel }) => {
    if (dirty) { cancel(); discardOpen = true; }
  });

  const slugify = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  $: if (modalOpen && !slugManuallyEdited) {
    form.slug = slugify(form.name);
  }

  const loadMedia = async () => {
    if (mediaItems.length || loadingMedia) return;
    loadingMedia = true;
    try {
      const res = await api.media.list({ file_type: 'image', limit: 200 });
      mediaItems = (res.data.items as unknown as MediaItem[]).filter((m) => m.file_url);
    } catch {
      /* non-fatal — the picker can still upload/paste a URL */
    } finally {
      loadingMedia = false;
    }
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

  const loadDestinations = async () => {
    loading = true;
    error = '';

    try {
      const response = await api.destinations.list({
        limit: 50,
        search,
        status
      });
      rows = response.data.items as Destination[];
    } catch (requestError) {
      error = requestError instanceof Error ? requestError.message : 'Unable to load destinations.';
    } finally {
      loading = false;
    }
  };

  const openCreateModal = () => {
    editingDestination = null;
    form = emptyForm();
    void loadMedia();
    slugManuallyEdited = false;
    beginEditing();
  };

  /** Row id whose full record is being fetched, so its button can show progress. */
  let loadingDestination: string | null = null;

  /**
   * Open the edit form for a destination.
   *
   * MUST re-fetch the full record first. The rows behind this table come from
   * the LIST endpoint, whose projection is deliberately lean — it omits `guide`
   * (a large jsonb) and the five health-and-safety columns, ~50KB/row that a
   * listing has no use for. Hydrating the form straight from a list row left
   * those seven fields blank, and because the save sends every field, the next
   * save overwrote real content with '' and []. That silently destroyed the
   * long-form guide on nine destinations on 2026-08-03.
   *
   * If the fetch fails we refuse to open rather than showing a blank form:
   * a form that cannot see the existing content is a form that will delete it.
   */
  const openEditModal = async (listRow: Destination) => {
    if (loadingDestination) return;
    loadingDestination = listRow.id;
    let destination: Destination;
    try {
      const res = await api.destinations.get(listRow.slug);
      // Same database row; the local type only narrows `status` and widens the
      // numeric columns the form binds as text.
      destination = res.data as unknown as Destination;
    } catch (error) {
      loadingDestination = null;
      showToast(
        error instanceof Error
          ? `Could not load ${listRow.name}: ${error.message}`
          : `Could not load ${listRow.name}.`,
        'error'
      );
      return;
    }
    loadingDestination = null;
    editingDestination = destination;
    form = {
      banner_image_url: destination.banner_image_url ?? '',
      country: destination.country ?? 'Tanzania',
      description: destination.description ?? '',
      emergency_contacts: destination.emergency_contacts ?? '',
      health_vaccinations: destination.health_vaccinations ?? '',
      score_wildlife: destination.score_wildlife == null ? '' : String(destination.score_wildlife),
      score_luxury: destination.score_luxury == null ? '' : String(destination.score_luxury),
      score_family: destination.score_family == null ? '' : String(destination.score_family),
      score_photography: destination.score_photography == null ? '' : String(destination.score_photography),
      score_adventure: destination.score_adventure == null ? '' : String(destination.score_adventure),
      score_budget_from: destination.score_budget_from == null ? '' : String(destination.score_budget_from),
      is_featured: Boolean(destination.is_featured),
      latitude: destination.latitude === null || destination.latitude === undefined ? '' : String(destination.latitude),
      location: destination.location ?? '',
      longitude: destination.longitude === null || destination.longitude === undefined ? '' : String(destination.longitude),
      main_image_url: destination.main_image_url || destination.image_url || '',
      meta_description: destination.meta_description ?? '',
      meta_title: destination.meta_title ?? '',
      name: destination.name,
      og_image_url: destination.og_image_url ?? '',
      region: destination.region ?? '',
      safety_overview: destination.safety_overview ?? '',
      security_advice: destination.security_advice ?? '',
      short_description: destination.short_description ?? '',
      slug: destination.slug,
      status: destination.status ?? 'draft',
      travel_insurance_note: destination.travel_insurance_note ?? '',
      guide: Array.isArray(destination.guide) ? JSON.parse(JSON.stringify(destination.guide)) : [],
      guide_reviewed_at: destination.guide_reviewed_at ?? ''
    };
    void loadMedia();
    slugManuallyEdited = true;
    beginEditing();
  };

  const closeModal = () => {
    modalOpen = false;
    editingDestination = null;
    slugManuallyEdited = false;
    form = emptyForm();
  };

  const numberOrNull = (value: unknown) => {
    const text = String(value ?? '').trim();
    return text === '' ? null : Number(text);
  };

  const payload = () => {
    const mainImage = form.main_image_url || null;

    return {
      banner_image_url: form.banner_image_url || null,
      country: form.country.trim() || 'Tanzania',
      description: form.description || null,
      emergency_contacts: form.emergency_contacts || null,
      health_vaccinations: form.health_vaccinations || null,
      score_wildlife: numberOrNull(form.score_wildlife),
      score_luxury: numberOrNull(form.score_luxury),
      score_family: numberOrNull(form.score_family),
      score_photography: numberOrNull(form.score_photography),
      score_adventure: numberOrNull(form.score_adventure),
      score_budget_from: numberOrNull(form.score_budget_from),
      // Keep the canonical `image_url` in sync with the main image so public
      // cards and detail pages (which read image_url) always have an image.
      image_url: mainImage,
      is_featured: form.is_featured,
      latitude: numberOrNull(form.latitude),
      location: form.location || null,
      longitude: numberOrNull(form.longitude),
      main_image_url: mainImage,
      meta_description: form.meta_description || null,
      meta_title: form.meta_title || null,
      name: form.name.trim(),
      og_image_url: form.og_image_url || null,
      region: form.region || null,
      safety_overview: form.safety_overview || null,
      security_advice: form.security_advice || null,
      short_description: form.short_description || null,
      slug: form.slug.trim(),
      status: form.status,
      travel_insurance_note: form.travel_insurance_note || null,
      guide: form.guide,
      guide_reviewed_at: form.guide_reviewed_at || null
    };
  };

  const saveDestination = async () => {
    if (saving) return;
    issues = validateDestination(form);
    saveError = '';
    if (issues.length) { await focusIssue(issues[0]); return; }
    saving = true;

    try {
      if (editingDestination) {
        const changes = destinationChanges(initialPayload!, payload());
        if (Object.keys(changes).length) {
          await api.destinations.update(editingDestination.id, changes);
        }
        showToast('Destination updated successfully.');
      } else {
        await api.destinations.create(payload());
        showToast('Destination created successfully.');
      }

      closeModal();
      await loadDestinations();
    } catch (requestError) {
      saveError = requestError instanceof Error ? requestError.message : 'Unable to save destination. Please try again.';
    } finally {
      saving = false;
    }
  };

  const openDeleteConfirm = (destination: Destination) => {
    destinationToDelete = destination;
    confirmOpen = true;
  };

  const deleteDestination = async () => {
    if (!destinationToDelete) return;
    deleting = true;

    try {
      await api.destinations.remove(destinationToDelete.id);
      showToast('Destination deleted successfully.');
      confirmOpen = false;
      destinationToDelete = null;
      await loadDestinations();
    } catch (requestError) {
      showToast(requestError instanceof Error ? requestError.message : 'Unable to delete destination.', 'error');
    } finally {
      deleting = false;
    }
  };

  const formatDate = (value?: string) => {
    if (!value) return '-';
    return new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
  };

  onMount(loadDestinations);
</script>

<svelte:window on:beforeunload={protectUnload} />

<ToastStack {toasts} on:dismiss={dismissToast} />

<div class="mx-auto grid w-full max-w-[1500px] gap-6">
<AdminPageHeader
  eyebrow="Tour Management"
  title="Destinations"
  description="Manage countries, regions, destination pages, featured states, image assets, and SEO metadata."
  actionLabel="New Destination"
  actionIcon={Plus}
  on:action={openCreateModal}
/>

<AdminToolbar className="grid gap-3 md:grid-cols-[1fr_190px_auto] md:items-end">
  <label class="grid gap-2 text-sm font-medium text-ink">
    <span>Search</span>
    <span class="flex h-11 items-center gap-2 rounded-2xl border border-ink/10 bg-surface px-3 shadow-sm transition focus-within:border-forest/45 focus-within:ring-2 focus-within:ring-forest/10">
      <Search size={16} class="text-ink/45" />
      <input class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink/35" bind:value={search} placeholder="Search destinations..." on:keydown={(event) => event.key === 'Enter' && loadDestinations()} />
    </span>
  </label>

  <AdminSelect label="Status" name="status_filter" bind:value={status} options={[{ label: 'All statuses', value: 'all' }, ...statusOptions]} />

  <AdminButton variant="secondary" on:click={loadDestinations}>Apply</AdminButton>
</AdminToolbar>

{#if loading}
  <LoadingState message="Loading destinations..." />
{:else if error}
  <ErrorState message={error} />
{:else if rows.length === 0}
  <AdminEmptyState
    title="No destinations found"
    message="Create your first Emnel destination to start building public destination pages and tour filters."
    actionLabel="Create destination"
    on:action={openCreateModal}
  />
{:else}
  <div class="overflow-hidden rounded-none border border-ink/10 bg-surface shadow-[0_18px_50px_rgba(28,26,22,0.06)]">
    <div class="overflow-x-auto">
      <table class="w-full min-w-[980px] text-start text-sm">
        <thead class="bg-sand/70 text-xs uppercase tracking-[0.08em] text-ink/60">
          <tr>
            <th class="px-4 py-3 font-semibold">Name</th>
            <th class="px-4 py-3 font-semibold">Country</th>
            <th class="px-4 py-3 font-semibold">Region</th>
            <th class="px-4 py-3 font-semibold">Status</th>
            <th class="px-4 py-3 font-semibold">Featured</th>
            <th class="px-4 py-3 font-semibold">Updated</th>
            <th class="px-4 py-3 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-ink/10">
          {#each rows as destination}
            <tr class="transition hover:bg-sand/25">
              <td class="px-4 py-4">
                <div class="font-semibold text-ink">{destination.name}</div>
                <p class="mt-1 line-clamp-1 text-xs text-ink/55">{destination.short_description || destination.location || destination.slug}</p>
              </td>
              <td class="px-4 py-4 text-ink/65">{destination.country || '-'}</td>
              <td class="px-4 py-4 text-ink/65">{destination.region || '-'}</td>
              <td class="px-4 py-4"><StatusBadge status={destination.status} /></td>
              <td class="px-4 py-4">
                {#if destination.is_featured}
                  <span class="inline-flex rounded-full bg-goldfinch-gold/15 px-2.5 py-1 text-xs font-semibold text-heading ring-1 ring-goldfinch-gold/30">Featured</span>
                {:else}
                  <span class="text-xs text-ink/45">No</span>
                {/if}
              </td>
              <td class="px-4 py-4 text-ink/65">{formatDate(destination.updated_at ?? destination.created_at)}</td>
              <td class="px-4 py-4">
                <div class="flex justify-end gap-2">
                  <button class="inline-flex h-9 items-center gap-2 rounded-xl border border-ink/10 bg-surface px-3 text-xs font-semibold text-ink shadow-sm transition hover:border-goldfinch-gold/35 hover:bg-sand/70" type="button" on:click={() => openEditModal(destination)} disabled={loadingDestination === destination.id}>
                    <Edit size={14} />
                    {loadingDestination === destination.id ? 'Loading…' : 'Edit'}
                  </button>
                  <button class="inline-flex h-9 items-center gap-2 rounded-xl border border-red-200 bg-surface px-3 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-50" type="button" on:click={() => openDeleteConfirm(destination)}>
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
  <dialog use:mountDialog on:cancel|preventDefault={requestClose} aria-labelledby="destination-editor-title" class="destination-editor">
    <header class="editor-header">
      <div class="min-w-0">
        <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-forest">Destination workspace</p>
        <h2 id="destination-editor-title" class="mt-1 truncate text-xl font-semibold text-ink">{editingDestination ? editingDestination.name : 'New destination'}</h2>
      </div>
      <div class="flex shrink-0 items-center gap-3">
        <span class="hidden sm:block"><StatusBadge status={form.status} /></span>
        {#if editingDestination?.status === 'published'}
          <a class="hidden items-center gap-1.5 text-sm font-semibold text-forest sm:inline-flex" href={`/destinations/${editingDestination.slug}`} target="_blank" rel="noreferrer">View live <ExternalLink size={15} /></a>
        {/if}
        <button class="grid h-10 w-10 place-items-center rounded-lg border border-ink/15 hover:bg-sand disabled:opacity-40" type="button" aria-label="Close destination editor" disabled={saving} on:click={requestClose}><X size={18} /></button>
      </div>
    </header>

    <form class="editor-form" bind:this={editorForm} novalidate on:submit|preventDefault={saveDestination}>
      <div class="editor-body">
        <nav class="editor-nav" aria-label="Destination editor sections">
          <p class="mb-3 hidden px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-ink/45 md:block">Edit destination</p>
          {#each sections as section, i}
            <button type="button" class:active={activeSection === section.id} aria-current={activeSection === section.id ? 'step' : undefined} aria-controls={`editor-${section.id}`} on:click={() => selectSection(section.id)}>
              <svelte:component this={section.icon} size={18} />
              <span class="min-w-0"><span class="block font-semibold">{section.label}</span><span class="mt-1 hidden text-[11px] font-normal opacity-65 md:block">{section.hint}</span></span>
              {#if issues.some((issue) => issue.section === section.id)}<span class="ml-auto text-red-600" aria-label="Needs attention">!</span>{/if}
            </button>
          {/each}
          <div class="mt-auto hidden border-t border-ink/10 px-3 pt-5 text-xs leading-6 text-ink/55 md:block">
            <p class="font-semibold text-ink">Make it easy to explore.</p>
            Start with an introduction and a strong photo. Add detail in the travel guide when you're ready.
          </div>
        </nav>

        <div class="editor-scroll" bind:this={editorScroll}>
          <fieldset disabled={saving} class="mx-auto min-w-0 max-w-[880px] border-0 p-0">
            <div class="mb-7 border-b border-ink/10 pb-5">
              <p class="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/45">Section {sections.findIndex((section) => section.id === activeSection) + 1} of {sections.length}</p>
              <h3 class="mt-1.5 text-2xl font-semibold text-heading">{currentSection.label}</h3>
              <p class="mt-1 text-sm text-ink/60">{currentSection.hint}. Changes are saved together.</p>
            </div>
            {#if issues.length}
              <div class="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
                <p class="font-semibold">Please check these details before saving</p>
                <ul class="mt-2 grid gap-1">
                  {#each issues as issue}<li><button class="text-left underline underline-offset-2" type="button" on:click={() => focusIssue(issue)}>{issue.message}</button></li>{/each}
                </ul>
              </div>
            {/if}

            <section id="editor-overview" hidden={activeSection !== 'overview'} class="editor-section">
              <div class="grid gap-5 sm:grid-cols-2">
                <AdminFormInput label="Destination name *" name="name" bind:value={form.name} required placeholder="e.g. Serengeti National Park" />
                <AdminFormInput label="Country *" name="country" bind:value={form.country} required />
                <AdminFormInput label="Region / circuit" name="region" bind:value={form.region} placeholder="e.g. Northern Circuit" />
                <AdminFormInput label="Location" name="location" bind:value={form.location} placeholder="e.g. Northern Tanzania" />
              </div>
              <label class="grid gap-2 text-[13px] font-semibold text-ink/65">
                Page address *
                <span class="flex min-w-0 items-center overflow-hidden rounded-md border border-ink/15 focus-within:ring-2 focus-within:ring-forest/20">
                  <span class="shrink-0 bg-sand/50 px-3 py-3 text-xs font-normal">/destinations/</span>
                  <input class="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm text-ink outline-none" name="slug" bind:value={form.slug} required on:input={() => (slugManuallyEdited = true)} />
                </span>
                <span class="text-xs font-normal text-ink/50">{editingDestination ? 'Changing this address may break existing links to this destination.' : 'Created automatically from the name. You can edit it if needed.'}</span>
              </label>
              <div>
                <AdminTextArea label="Short introduction" name="short_description" bind:value={form.short_description} rows={3} placeholder="What makes this place special? A few sentences for the banner and destination cards." />
                <p class="mt-2 text-xs text-ink/50">Keep it easy to scan. Around 160–240 characters works well.</p>
              </div>
              <div>
                <RichTextEditor label="Destination overview" allowPageHeading={false} bind:value={form.description} media={mediaItems} uploadFolder="destinations" minHeight="240px" placeholder="Introduce the destination. Add links using the toolbar." />
                <p class="mt-2 text-xs text-ink/50">Appears under “Why go”. Use the Travel guide section for your detailed destination story.</p>
              </div>
            </section>

            <section id="editor-images" hidden={activeSection !== 'images'} class="editor-section">
              <p class="section-note">Choose images from your library, upload a photograph, or paste its URL. Existing images stay in place until you change them.</p>
              <div class="grid items-start gap-5 sm:grid-cols-2">
                <div class="editor-card">
                  <h4>Destination card</h4><p>The image travellers see when browsing destinations. A landscape crop works best.</p>
                  <MediaPicker label="Card image" media={mediaItems} uploadFolder="destinations" bind:value={form.main_image_url} />
                </div>
                <div class="editor-card">
                  <h4>Page banner</h4><p>A wide photograph for the top of this destination's page. Falls back to the card image.</p>
                  <MediaPicker label="Banner image" media={mediaItems} uploadFolder="destinations" bind:value={form.banner_image_url} />
                </div>
              </div>
              <div class="editor-card">
                <h4>Social sharing image</h4><p>Optional. Used when someone shares the destination link.</p>
                <MediaPicker label="Social sharing image" media={mediaItems} uploadFolder="destinations" bind:value={form.og_image_url} />
              </div>
            </section>

            <section id="editor-guide" hidden={activeSection !== 'guide'} class="editor-section">
              <div class="flex flex-wrap items-start justify-between gap-4">
                <p class="max-w-lg text-sm leading-6 text-ink/60">Build your guide in the order travellers should read it. Open a block to edit, use the arrows to reorder, and add sections as needed.</p>
                <div class="w-44"><AdminFormInput label="Last reviewed" name="guide_reviewed_at" type="date" bind:value={form.guide_reviewed_at} /></div>
              </div>
              <DestinationGuideEditor bind:blocks={form.guide} media={mediaItems} />
            </section>

            <section id="editor-planning" hidden={activeSection !== 'planning'} class="editor-section">
              <div class="editor-card">
                <h4>Who is this destination best for?</h4><p>Rate each experience from 0 to 10. Leave a score empty if it has not been assessed.</p>
                <div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {#each [{ key: 'score_wildlife', label: 'Wildlife' }, { key: 'score_luxury', label: 'Luxury' }, { key: 'score_family', label: 'Families' }, { key: 'score_photography', label: 'Photography' }, { key: 'score_adventure', label: 'Adventure' }] as score}
                    <label class="grid gap-2 text-[13px] font-semibold text-ink/65">{score.label}<span class="flex items-center rounded-md border border-ink/15 bg-surface"><input class="h-11 w-full min-w-0 bg-transparent px-3 text-sm text-ink outline-none focus:ring-2 focus:ring-forest/20" type="number" min="0" max="10" step="any" name={score.key} bind:value={form[score.key as 'score_wildlife']} placeholder="Not rated" /><span class="shrink-0 pr-3 text-xs text-ink/40">/ 10</span></span></label>
                  {/each}
                  <AdminFormInput label="Budget from (USD / person)" name="score_budget_from" type="number" min={0} step="any" bind:value={form.score_budget_from} placeholder="Optional" />
                </div>
              </div>
              <div class="editor-card">
                <h4>Map location</h4><p>Optional decimal coordinates. Latitude: −90 to 90. Longitude: −180 to 180.</p>
                <div class="grid gap-5 sm:grid-cols-2">
                  <AdminFormInput label="Latitude" name="latitude" type="number" step="any" bind:value={form.latitude} placeholder="-2.333333" />
                  <AdminFormInput label="Longitude" name="longitude" type="number" step="any" bind:value={form.longitude} placeholder="34.833333" />
                </div>
              </div>
            </section>

            <section id="editor-safety" hidden={activeSection !== 'safety'} class="editor-section">
              <p class="section-note">Practical advice shown on this destination's page and the health &amp; safety hub. Empty fields are simply hidden from visitors.</p>
              <AdminTextArea label="Safety overview" name="safety_overview" bind:value={form.safety_overview} rows={4} placeholder="An honest, reassuring overview for travellers." />
              <AdminTextArea label="Health & vaccinations" name="health_vaccinations" bind:value={form.health_vaccinations} rows={4} />
              <AdminTextArea label="Security advice" name="security_advice" bind:value={form.security_advice} rows={4} />
              <AdminTextArea label="Travel insurance" name="travel_insurance_note" bind:value={form.travel_insurance_note} rows={3} />
              <AdminTextArea label="Emergency contacts" name="emergency_contacts" bind:value={form.emergency_contacts} rows={3} />
            </section>

            <section id="editor-publishing" hidden={activeSection !== 'publishing'} class="editor-section">
              <div class="editor-card">
                <h4>Visibility</h4><p>{form.status === 'published' ? 'Saving will update this destination on the public website.' : form.status === 'archived' ? 'Archived destinations are hidden from public listings.' : 'Drafts let you prepare this destination before publishing.'}</p>
                <div class="grid items-end gap-5 sm:grid-cols-2">
                  <AdminSelect label="Publication status" name="status" bind:value={form.status} options={statusOptions} />
                  <label class="flex min-h-11 items-center gap-3 rounded-md border border-ink/15 px-4 py-3 text-sm font-medium"><input class="h-4 w-4 accent-forest" type="checkbox" bind:checked={form.is_featured} />Featured destination</label>
                </div>
              </div>
              <AdminFormInput label="Search title" name="meta_title" bind:value={form.meta_title} counter={60} placeholder={form.name || 'Destination name'} />
              <AdminTextArea label="Search description" name="meta_description" bind:value={form.meta_description} rows={3} placeholder="Give travellers a clear reason to explore this destination." />
              <div class="editor-card">
                <p class="text-[10px] font-bold uppercase tracking-wider text-ink/45">Search preview</p>
                <p class="break-all text-xs text-ink/50">emneladventures.com / destinations / {form.slug || 'destination'}</p>
                <h4 class="text-lg text-forest">{form.meta_title || (form.name ? `${form.name} Safaris — Tanzania | Emnel Adventures` : 'Your destination title')}</h4>
                <p class="line-clamp-3">{form.meta_description || form.short_description || 'Your search description will appear here. Search engines may display a different excerpt.'}</p>
              </div>
            </section>
          </fieldset>
        </div>
      </div>

      <footer class="editor-footer">
        {#if saveError}<p role="alert" class="w-full rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{saveError} Your changes are still here.</p>{/if}
        {#if discardOpen}
          <div role="alert" class="flex w-full flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div><p class="text-sm font-semibold text-ink">Discard your unsaved changes?</p><p class="mt-1 text-xs text-ink/60">The saved destination will stay as it was.</p></div>
            <div class="flex gap-2"><AdminButton variant="secondary" on:click={() => (discardOpen = false)}>Keep editing</AdminButton><AdminButton variant="danger" on:click={closeModal}>Discard changes</AdminButton></div>
          </div>
        {:else}
          <p class="mr-auto flex items-center gap-2 text-xs text-ink/60" aria-live="polite">{#if dirty}<span class="h-2 w-2 rounded-full bg-amber-500"></span>Unsaved changes{:else}<Check size={15} class="text-forest" />{editingDestination ? 'No unsaved changes' : 'Ready to create a draft'}{/if}</p>
          <AdminButton variant="secondary" disabled={saving} on:click={requestClose}>Cancel</AdminButton>
          <AdminButton type="submit" disabled={saving || (!!editingDestination && !dirty)}><Save size={16} />{saving ? 'Saving…' : form.status === 'published' ? 'Save & publish' : form.status === 'draft' ? 'Save draft' : 'Save changes'}</AdminButton>
        {/if}
      </footer>
    </form>
  </dialog>
{/if}
<ConfirmModal
  open={confirmOpen}
  title="Delete destination"
  message={`Delete "${destinationToDelete?.name ?? 'this destination'}"? This will soft delete it when supported by the database.`}
  on:cancel={() => {
    confirmOpen = false;
    destinationToDelete = null;
  }}
  on:confirm={deleteDestination}
/>

{#if deleting}
  <div class="fixed bottom-4 right-4 z-[70] rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(28,26,22,0.18)]">
    Deleting destination...
  </div>
{/if}

<style>
  .destination-editor { width: min(1380px, calc(100vw - 40px)); height: min(920px, calc(100dvh - 40px)); max-width: none; max-height: none; margin: auto; padding: 0; overflow: hidden; border: 1px solid rgb(var(--c-ink) / .12); border-radius: 14px; background: rgb(var(--c-surface)); color: rgb(var(--c-ink)); box-shadow: 0 32px 100px #0004; }
  .destination-editor::backdrop { background: #131b16aa; backdrop-filter: blur(3px); }
  .editor-header { height: 88px; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px 28px; border-bottom: 1px solid rgb(var(--c-ink) / .1); }
  .editor-form { height: calc(100% - 88px); display: flex; flex-direction: column; }
  .editor-body { display: grid; grid-template-columns: 240px minmax(0, 1fr); flex: 1; min-height: 0; }
  .editor-nav { display: flex; flex-direction: column; gap: 5px; overflow-y: auto; background: rgb(var(--c-sand) / .22); padding: 24px 14px; border-right: 1px solid rgb(var(--c-ink) / .08); }
  .editor-nav button { display: flex; align-items: center; gap: 12px; padding: 13px 12px; border-radius: 8px; text-align: left; color: rgb(var(--c-ink) / .65); font-size: 13px; }
  .editor-nav button:hover { background: rgb(var(--c-sand) / .6); }
  .editor-nav button.active { background: rgb(var(--c-forest) / .09); color: rgb(var(--c-forest)); box-shadow: inset 3px 0 rgb(var(--c-forest)); }
  .editor-scroll { min-width: 0; overflow-y: auto; overscroll-behavior: contain; padding: 30px 36px 48px; }
  .editor-section:not([hidden]) { display: grid; gap: 24px; }
  .editor-card { display: grid; gap: 14px; border: 1px solid rgb(var(--c-ink) / .12); border-radius: 10px; padding: 20px; }
  .editor-card h4 { font-weight: 600; font-size: 15px; }
  .editor-card p { font-size: 13px; line-height: 1.65; color: rgb(var(--c-ink) / .6); }
  .section-note { background: rgb(var(--c-sand) / .3); border-left: 3px solid rgb(var(--c-goldfinch-gold)); padding: 12px 16px; font-size: 13px; line-height: 1.7; color: rgb(var(--c-ink) / .7); }
  .editor-footer { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; padding: 16px 28px; border-top: 1px solid rgb(var(--c-ink) / .1); background: rgb(var(--c-surface)); }
  @media (max-width: 767px) {
    .destination-editor { width: 100vw; height: 100dvh; border: 0; border-radius: 0; }
    .editor-header { height: 76px; padding: 12px 16px; }
    .editor-form { height: calc(100% - 76px); }
    .editor-body { display: flex; flex-direction: column; }
    .editor-nav { flex-direction: row; flex-shrink: 0; gap: 4px; overflow-x: auto; padding: 10px 12px; border-right: 0; border-bottom: 1px solid rgb(var(--c-ink) / .1); }
    .editor-nav button { flex-shrink: 0; gap: 7px; padding: 10px 12px; }
    .editor-nav button.active { box-shadow: inset 0 -2px rgb(var(--c-forest)); }
    .editor-scroll { padding: 24px 18px 36px; }
    .editor-footer { padding: 12px 16px max(12px, env(safe-area-inset-bottom)); gap: 8px; }
    .editor-footer > p { width: 100%; }
  }
</style>
