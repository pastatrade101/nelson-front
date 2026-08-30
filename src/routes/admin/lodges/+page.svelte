<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { Edit, Hotel, Plus, Search, Trash2, X } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import { mediaLibrary } from '$lib/mediaLibrary';
  import { TIER_OPTIONS, tierLabel } from '$lib/tiers';
  import MediaPicker from '$lib/components/admin/MediaPicker.svelte';
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

  type Lodge = {
    id: string;
    name: string;
    slug: string;
    destination_id?: string | null;
    destinations?: { name: string; slug: string } | null;
    accommodation_level: string;
    lodge_type: 'tented_camp' | 'lodge' | 'hotel' | 'mobile_camp' | 'treehouse';
    description?: string | null;
    why_we_recommend?: string | null;
    hero_image_url?: string | null;
    image_url?: string | null;
    price_per_night_from?: number | null;
    currency?: string | null;
    best_for?: string[] | null;
    romantic_rating?: number | null;
    family_rating?: number | null;
    website_url?: string | null;
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
  const levelOptions = TIER_OPTIONS;
  const typeOptions = [
    { label: 'Tented camp', value: 'tented_camp' },
    { label: 'Lodge', value: 'lodge' },
    { label: 'Hotel', value: 'hotel' },
    { label: 'Mobile camp', value: 'mobile_camp' },
    { label: 'Treehouse', value: 'treehouse' }
  ];
  const levelLabel = (v: string) => tierLabel(v);
  const typeLabel = (v: string) => typeOptions.find((o) => o.value === v)?.label ?? v;

  const emptyForm = () => ({
    name: '',
    slug: '',
    destination_id: '',
    accommodation_level: 'classic',
    lodge_type: 'lodge' as Lodge['lodge_type'],
    description: '',
    why_we_recommend: '',
    hero_image_url: '',
    image_url: '',
    price_per_night_from: '',
    currency: 'USD',
    best_for: '',
    romantic_rating: '',
    family_rating: '',
    website_url: '',
    status: 'draft' as Lodge['status'],
    is_featured: false,
    seo_title: '',
    meta_description: ''
  });

  let rows: Lodge[] = [];
  let destinationOptions: { label: string; value: string }[] = [{ label: 'No destination', value: '' }];
  let loading = true;
  let saving = false;
  let deleting = false;
  let error = '';
  let search = '';
  let statusFilter = 'all';
  let modalOpen = false;
  let confirmOpen = false;
  let slugManuallyEdited = false;
  let editing: Lodge | null = null;
  let toDelete: Lodge | null = null;
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

  const loadDestinations = async () => {
    try {
      const res = await api.destinations.list({ status: 'published', limit: 100 });
      const items = res.data.items as { id: string; name: string }[];
      destinationOptions = [{ label: 'No destination', value: '' }, ...items.map((d) => ({ label: d.name, value: d.id }))];
    } catch {
      destinationOptions = [{ label: 'No destination', value: '' }];
    }
  };

  const load = async () => {
    loading = true;
    error = '';
    try {
      const res = await api.lodges.list({ search, status: statusFilter, limit: 100 });
      rows = res.data.items as Lodge[];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to load lodges.';
    } finally {
      loading = false;
    }
  };

  // The property's photo gallery. Held separately from `form` because it is its
  // own table, saved right after the lodge so a new lodge has an id to attach to.
  let gallery: { image_url: string; alt_text: string }[] = [];

  const loadGallery = async (lodgeId: string) => {
    try {
      const res = await api.lodgeImages.list(lodgeId);
      gallery = (res.data.items ?? []).map((i) => ({
        image_url: String(i.image_url ?? ''),
        alt_text: String(i.alt_text ?? '')
      }));
    } catch {
      gallery = [];
    }
  };

  const addGalleryImage = () => { gallery = [...gallery, { image_url: '', alt_text: '' }]; };
  const removeGalleryImage = (i: number) => { gallery = gallery.filter((_, n) => n !== i); };
  const moveGalleryImage = (i: number, delta: number) => {
    const j = i + delta;
    if (j < 0 || j >= gallery.length) return;
    const next = [...gallery];
    [next[i], next[j]] = [next[j], next[i]];
    gallery = next;
  };
  const setGalleryUrl = (i: number, url: string) => {
    gallery = gallery.map((g, n) => (n === i ? { ...g, image_url: url } : g));
  };

  const openCreate = () => {
    editing = null;
    form = emptyForm();
    gallery = [];
    slugManuallyEdited = false;
    modalOpen = true;
  };

  const openEdit = (l: Lodge) => {
    editing = l;
    gallery = [];
    void loadGallery(l.id);
    form = {
      name: l.name,
      slug: l.slug,
      destination_id: l.destination_id ?? '',
      accommodation_level: l.accommodation_level,
      lodge_type: l.lodge_type,
      description: l.description ?? '',
      why_we_recommend: l.why_we_recommend ?? '',
      hero_image_url: l.hero_image_url ?? '',
      image_url: l.image_url ?? '',
      price_per_night_from: l.price_per_night_from != null ? String(l.price_per_night_from) : '',
      currency: l.currency ?? 'USD',
      best_for: (l.best_for ?? []).join(', '),
      romantic_rating: l.romantic_rating != null ? String(l.romantic_rating) : '',
      family_rating: l.family_rating != null ? String(l.family_rating) : '',
      website_url: l.website_url ?? '',
      status: l.status,
      is_featured: Boolean(l.is_featured),
      seo_title: l.seo_title ?? '',
      meta_description: l.meta_description ?? ''
    };
    slugManuallyEdited = true;
    modalOpen = true;
  };

  const closeModal = () => { modalOpen = false; editing = null; form = emptyForm(); slugManuallyEdited = false; };

  const numOrNull = (v: string) => { const n = Number(v); return v.trim() !== '' && Number.isFinite(n) ? n : null; };

  const save = async () => {
    if (!form.name.trim()) { showToast('Name is required.', 'error'); return; }
    saving = true;
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      destination_id: form.destination_id || null,
      accommodation_level: form.accommodation_level,
      lodge_type: form.lodge_type,
      description: form.description.trim() || null,
      why_we_recommend: form.why_we_recommend.trim() || null,
      hero_image_url: form.hero_image_url.trim() || null,
      image_url: form.image_url.trim() || null,
      price_per_night_from: numOrNull(form.price_per_night_from),
      currency: form.currency.trim() || 'USD',
      best_for: form.best_for.split(',').map((s) => s.trim()).filter(Boolean),
      romantic_rating: numOrNull(form.romantic_rating),
      family_rating: numOrNull(form.family_rating),
      website_url: form.website_url.trim() || null,
      status: form.status,
      is_featured: form.is_featured,
      seo_title: form.seo_title.trim() || null,
      meta_description: form.meta_description.trim() || null
    };
    try {
      // The gallery is a separate table, so it is written after the lodge — and a
      // new lodge has no id until the create returns.
      let lodgeId = editing?.id ?? '';
      if (editing) {
        await api.lodges.update(editing.id, payload);
        showToast('Lodge updated.');
      } else {
        const created = await api.lodges.create(payload);
        lodgeId = String((created.data as { id?: string })?.id ?? '');
        showToast('Lodge created.');
      }

      if (lodgeId) {
        const images = gallery.filter((g) => g.image_url.trim());
        try {
          await api.lodgeImages.replace(lodgeId, images);
        } catch {
          // The lodge itself saved; say so rather than implying nothing happened.
          showToast('Lodge saved, but its gallery could not be updated.', 'error');
        }
      }
      closeModal();
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to save lodge.', 'error');
    } finally {
      saving = false;
    }
  };

  const openDelete = (l: Lodge) => { toDelete = l; confirmOpen = true; };
  const confirmDelete = async () => {
    if (!toDelete) return;
    deleting = true;
    try {
      await api.lodges.remove(toDelete.id);
      showToast('Lodge deleted.');
      confirmOpen = false;
      toDelete = null;
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to delete lodge.', 'error');
    } finally {
      deleting = false;
    }
  };

  const fmt = (v?: string) => v ? new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(v)) : '-';
  const price = (l: Lodge) => l.price_per_night_from != null ? `${l.currency ?? 'USD'} ${Math.round(l.price_per_night_from).toLocaleString()}/night` : '-';

  onMount(() => { load(); loadDestinations(); });
</script>

<ToastStack {toasts} on:dismiss={dismissToast} />

<div class="mx-auto grid w-full max-w-[1500px] gap-6">
  <AdminPageHeader
    eyebrow="Tour Management"
    title="Lodges & Camps"
    description="Recommended accommodation — surfaced as 'Where to stay' on destination pages and used to plan itineraries."
    actionLabel="New Lodge"
    actionIcon={Plus}
    on:action={openCreate}
  />

  <AdminToolbar className="grid gap-3 md:grid-cols-[1fr_190px_auto] md:items-end">
    <label class="grid gap-2 text-sm font-medium text-ink">
      <span>Search</span>
      <span class="flex h-11 items-center gap-2 rounded-2xl border border-ink/10 bg-surface px-3 shadow-sm transition focus-within:border-forest/45 focus-within:ring-2 focus-within:ring-forest/10">
        <Search size={16} class="text-ink/45" />
        <input class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink/35" bind:value={search} placeholder="Search lodges..." on:keydown={(e) => e.key === 'Enter' && load()} />
      </span>
    </label>
    <AdminSelect label="Status" name="status_filter" bind:value={statusFilter} options={[{ label: 'All statuses', value: 'all' }, ...statusOptions]} />
    <AdminButton variant="secondary" on:click={load}>Apply</AdminButton>
  </AdminToolbar>

  {#if loading}
    <LoadingState message="Loading lodges..." />
  {:else if error}
    <ErrorState message={error} />
  {:else if rows.length === 0}
    <AdminEmptyState title="No lodges yet" message="Add your first recommended lodge or camp." actionLabel="New Lodge" icon={Hotel} on:action={openCreate} />
  {:else}
    <div class="overflow-hidden rounded-none border border-ink/10 bg-surface shadow-[0_18px_50px_rgba(28,26,22,0.06)]">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[860px] text-sm">
          <thead class="bg-sand/70 text-xs uppercase tracking-[0.08em] text-ink/60">
            <tr>
              <th class="px-4 py-3 text-left font-semibold">Name</th>
              <th class="px-4 py-3 text-left font-semibold">Destination</th>
              <th class="px-4 py-3 text-left font-semibold">Level / Type</th>
              <th class="px-4 py-3 text-left font-semibold">From</th>
              <th class="px-4 py-3 text-left font-semibold">Status</th>
              <th class="px-4 py-3 text-left font-semibold">Updated</th>
              <th class="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-ink/10">
            {#each rows as l (l.id)}
              <tr class="transition hover:bg-sand/25">
                <td class="px-4 py-4">
                  <div class="font-semibold text-ink">{l.name}{#if l.is_featured}<span class="ml-2 rounded-full bg-goldfinch-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-goldfinch-gold">Featured</span>{/if}</div>
                  <p class="mt-0.5 font-mono text-xs text-ink/50">{l.slug}</p>
                </td>
                <td class="px-4 py-4 text-ink/60">{l.destinations?.name ?? '-'}</td>
                <td class="px-4 py-4 text-ink/60">{levelLabel(l.accommodation_level)} · {typeLabel(l.lodge_type)}</td>
                <td class="px-4 py-4 text-ink/60">{price(l)}</td>
                <td class="px-4 py-4"><StatusBadge status={l.status} /></td>
                <td class="px-4 py-4 text-ink/60">{fmt(l.updated_at ?? l.created_at)}</td>
                <td class="px-4 py-4">
                  <div class="flex justify-end gap-2">
                    <button class="inline-flex h-9 items-center gap-2 rounded-xl border border-ink/10 bg-surface px-3 text-xs font-semibold text-ink shadow-sm transition hover:border-goldfinch-gold/35 hover:bg-sand/70" type="button" on:click={() => openEdit(l)}>
                      <Edit size={14} />Edit
                    </button>
                    <button class="inline-flex h-9 items-center gap-2 rounded-xl border border-red-200 bg-surface px-3 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-50" type="button" on:click={() => openDelete(l)}>
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
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">{editing ? 'Edit lodge' : 'New lodge'}</p>
          <h2 class="mt-1 text-2xl font-bold text-ink">{editing ? editing.name : 'Create Lodge'}</h2>
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

        <AdminSelect label="Destination" name="destination_id" bind:value={form.destination_id} options={destinationOptions} />

        <div class="grid gap-4 sm:grid-cols-2">
          <AdminSelect label="Accommodation level" name="accommodation_level" bind:value={form.accommodation_level} options={levelOptions} />
          <AdminSelect label="Lodge type" name="lodge_type" bind:value={form.lodge_type} options={typeOptions} />
        </div>

        <AdminTextArea label="Description" name="description" bind:value={form.description} rows={3} placeholder="What this lodge is like." />
        <AdminTextArea label="Why we recommend it" name="why_we_recommend" bind:value={form.why_we_recommend} rows={2} placeholder="Our honest take for travellers." />

        <div class="grid gap-4 sm:grid-cols-2">
          <MediaPicker label="Hero image" media={$mediaLibrary} uploadFolder="lodges" bind:value={form.hero_image_url} />

          <div class="grid gap-3 border border-ink/10 bg-sand/20 p-4 md:col-span-2">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 class="text-base font-semibold text-ink">Photo gallery</h3>
                <p class="mt-1 text-sm text-ink/55">
                  Shown as a row on every itinerary day that stays here — the first four appear.
                  The first image is the cover.
                </p>
              </div>
              <button
                class="inline-flex h-10 items-center gap-2 bg-forest px-4 text-sm font-semibold text-white transition hover:brightness-110"
                type="button"
                on:click={addGalleryImage}
              >
                Add image
              </button>
            </div>

            {#if !gallery.length}
              <p class="border border-dashed border-ink/20 px-4 py-6 text-center text-sm text-ink/55">
                No gallery yet. Itinerary days will fall back to the hero and card images above.
              </p>
            {/if}

            <div class="grid gap-4 sm:grid-cols-2">
              {#each gallery as image, i (i)}
                <div class="grid gap-2 border border-ink/10 bg-surface p-3">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-semibold uppercase tracking-wide text-ink/45">
                      {i === 0 ? 'Cover' : `Image ${i + 1}`}
                    </span>
                    <div class="flex items-center gap-1">
                      <button class="p-1 text-ink/40 transition hover:text-ink disabled:opacity-30" type="button" disabled={i === 0} on:click={() => moveGalleryImage(i, -1)} aria-label="Move earlier">↑</button>
                      <button class="p-1 text-ink/40 transition hover:text-ink disabled:opacity-30" type="button" disabled={i === gallery.length - 1} on:click={() => moveGalleryImage(i, 1)} aria-label="Move later">↓</button>
                      <button class="p-1 text-red-500 transition hover:text-red-700" type="button" on:click={() => removeGalleryImage(i)} aria-label="Remove">✕</button>
                    </div>
                  </div>
                  <MediaPicker
                    label=""
                    media={$mediaLibrary}
                    uploadFolder="lodges"
                    aspect="aspect-[4/3]"
                    value={image.image_url}
                    on:change={(e) => setGalleryUrl(i, (e as CustomEvent<string>).detail)}
                  />
                  <AdminFormInput
                    label="Alt text"
                    name={`gallery_alt_${i}`}
                    bind:value={image.alt_text}
                    placeholder="What the photograph shows"
                  />
                </div>
              {/each}
            </div>
          </div>
          <MediaPicker label="Card image" media={$mediaLibrary} uploadFolder="lodges" bind:value={form.image_url} />
        </div>

        <div class="grid gap-4 sm:grid-cols-3">
          <AdminFormInput label="Price/night from" name="price_per_night_from" type="number" bind:value={form.price_per_night_from} placeholder="650" />
          <AdminFormInput label="Currency" name="currency" bind:value={form.currency} placeholder="USD" />
          <AdminFormInput label="Best for (comma-separated)" name="best_for" bind:value={form.best_for} placeholder="Couples, Families" />
        </div>

        <div class="grid gap-4 sm:grid-cols-3">
          <AdminFormInput label="Romantic rating (0-10)" name="romantic_rating" type="number" bind:value={form.romantic_rating} placeholder="9" />
          <AdminFormInput label="Family rating (0-10)" name="family_rating" type="number" bind:value={form.family_rating} placeholder="7" />
          <AdminFormInput label="Website URL" name="website_url" bind:value={form.website_url} placeholder="https://..." />
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <AdminSelect label="Status" name="status" bind:value={form.status} options={statusOptions} />
          <label class="flex cursor-pointer items-center gap-3 self-end rounded-2xl border border-ink/10 bg-surface p-3">
            <input class="h-4 w-4 accent-forest" type="checkbox" bind:checked={form.is_featured} />
            <span class="text-sm font-semibold text-ink">Featured lodge</span>
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
          {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Lodge'}
        </AdminButton>
      </div>
    </form>
  </div>
{/if}

<ConfirmModal
  open={confirmOpen}
  title="Delete lodge"
  message={`Delete "${toDelete?.name ?? 'this lodge'}"? This soft-deletes the record.`}
  on:cancel={() => { confirmOpen = false; toDelete = null; }}
  on:confirm={confirmDelete}
/>

{#if deleting}
  <div class="fixed bottom-4 right-4 z-[70] rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(28,26,22,0.18)]">
    Deleting lodge...
  </div>
{/if}
