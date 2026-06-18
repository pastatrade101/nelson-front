<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import {
    ArrowDown,
    ArrowUp,
    Edit,
    Image as ImageIcon,
    LayoutTemplate,
    Plus,
    Save,
    Trash2,
    X
  } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminEmptyState from '$lib/components/admin/AdminEmptyState.svelte';
  import AdminFormInput from '$lib/components/admin/AdminFormInput.svelte';
  import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
  import AdminSelect from '$lib/components/admin/AdminSelect.svelte';
  import AdminTextArea from '$lib/components/admin/AdminTextArea.svelte';
  import ConfirmModal from '$lib/components/admin/ConfirmModal.svelte';
  import ToastStack from '$lib/components/admin/ToastStack.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';

  type Section = {
    button_text?: string | null;
    button_url?: string | null;
    content?: string | null;
    extra_data?: Record<string, unknown> | unknown[] | null;
    id: string;
    image_url?: string | null;
    is_active: boolean;
    section_key: string;
    sort_order: number;
    subtitle?: string | null;
    title?: string | null;
  };

  type MediaItem = { file_name: string; file_url: string; id: string };
  type Option = { label: string; value: string };
  type Toast = { id: string; message: string; type: 'error' | 'success' };
  type ImageMode = 'media' | 'none' | 'url';

  const recommendedKeys = [
    'hero',
    'featured_tours',
    'featured_destinations',
    'why_choose_us',
    'testimonials',
    'gallery_preview',
    'faq_preview',
    'blog_preview',
    'ai_advisor_cta',
    'final_cta',
    'partners',
    'login_slider',
    'cost_ranges'
  ];

  const imageModeOptions: Option[] = [
    { label: 'No image', value: 'none' },
    { label: 'Manual URL', value: 'url' },
    { label: 'Choose from Media Library', value: 'media' }
  ];

  const emptyForm = () => ({
    button_text: '',
    button_url: '',
    content: '',
    image_url: '',
    is_active: true,
    section_key: '',
    sort_order: '0',
    subtitle: '',
    title: ''
  });

  let rows: Section[] = [];
  let mediaItems: MediaItem[] = [];
  let mediaOptions: Option[] = [{ label: 'Select an image', value: '' }];

  let loading = true;
  let loadingMedia = false;
  let saving = false;
  let deleting = false;
  let reordering = false;
  let error = '';

  let modalOpen = false;
  let confirmOpen = false;
  let editing: Section | null = null;
  let toDelete: Section | null = null;
  let form = emptyForm();
  let extraDataText = '{}';
  let imageMode: ImageMode = 'none';
  let mediaId = '';
  let toasts: Toast[] = [];

  // ── background & overlay (stored inside extra_data) ───────────────────────
  const positionOptions = [
    { label: 'Center', value: 'center' },
    { label: 'Top', value: 'center top' },
    { label: 'Bottom', value: 'center bottom' },
    { label: 'Left', value: 'left center' },
    { label: 'Right', value: 'right center' },
    { label: 'Top left', value: 'left top' },
    { label: 'Top right', value: 'right top' },
    { label: 'Bottom left', value: 'left bottom' },
    { label: 'Bottom right', value: 'right bottom' }
  ];
  const BG_KEYS = ['background_video', 'overlay_color', 'overlay_opacity', 'overlay_gradient', 'media_position'];
  const emptyBg = () => ({ video: '', overlay_color: '#0F2F24', overlay_opacity: '60', overlay_gradient: true, media_position: 'center' });
  let bg = emptyBg();

  const hexToRgba = (hex: string, alpha: number) => {
    const match = /^#?([0-9a-fA-F]{6})$/.exec(hex);
    if (!match) return `rgba(15,47,36,${alpha})`;
    const n = parseInt(match[1], 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
  };

  $: bgHasMedia = Boolean(form.image_url.trim() || bg.video.trim());
  $: overlayAlpha = Math.max(0, Math.min(100, Number(bg.overlay_opacity) || 0)) / 100;
  $: overlayStyle = bg.overlay_gradient
    ? `background:linear-gradient(135deg, ${hexToRgba(bg.overlay_color, overlayAlpha)}, ${hexToRgba(bg.overlay_color, overlayAlpha * 0.55)})`
    : `background:${hexToRgba(bg.overlay_color, overlayAlpha)}`;

  const extraToBg = (ed: Record<string, unknown>) => ({
    video: typeof ed.background_video === 'string' ? ed.background_video : '',
    overlay_color: typeof ed.overlay_color === 'string' ? ed.overlay_color : '#0F2F24',
    overlay_opacity: ed.overlay_opacity != null ? String(Math.round(Number(ed.overlay_opacity) * 100)) : '60',
    overlay_gradient: ed.overlay_gradient !== false,
    media_position: typeof ed.media_position === 'string' ? ed.media_position : 'center'
  });

  const bgToExtra = (): Record<string, unknown> => ({
    ...(bg.video.trim() ? { background_video: bg.video.trim() } : {}),
    overlay_color: bg.overlay_color || '#0F2F24',
    overlay_opacity: overlayAlpha,
    overlay_gradient: bg.overlay_gradient,
    media_position: bg.media_position || 'center'
  });

  // ── repeaters stored inside extra_data (partner logos + login slides) ──────
  type LogoRow = { image_url: string; name: string; url: string };
  type SlideRow = { image_url: string; title: string; subtitle: string };
  let logos: LogoRow[] = [];
  let slides: SlideRow[] = [];

  // Shared media-library picker — targets either a logo row or a slide row.
  let mediaPicker: { list: 'logos' | 'slides'; index: number } | null = null;

  const MANAGED_KEYS = [...BG_KEYS, 'logos', 'slides', 'ranges'];

  const openMediaPicker = async (list: 'logos' | 'slides', index: number) => {
    mediaPicker = { list, index };
    await loadMedia();
  };
  const pickMedia = (url: string) => {
    if (mediaPicker?.list === 'logos' && logos[mediaPicker.index]) {
      logos[mediaPicker.index].image_url = url;
      logos = logos;
    } else if (mediaPicker?.list === 'slides' && slides[mediaPicker.index]) {
      slides[mediaPicker.index].image_url = url;
      slides = slides;
    }
    mediaPicker = null;
  };

  const addLogo = () => {
    logos = [...logos, { name: '', image_url: '', url: '' }];
  };
  const removeLogo = (index: number) => {
    logos = logos.filter((_, i) => i !== index);
  };
  const extraToLogos = (ed: Record<string, unknown>): LogoRow[] =>
    Array.isArray(ed.logos)
      ? (ed.logos as Array<Record<string, unknown>>).map((l) => ({
          name: String(l?.name ?? ''),
          image_url: String(l?.image_url ?? ''),
          url: String(l?.url ?? '')
        }))
      : [];
  const logosToExtra = () =>
    logos
      .filter((l) => l.image_url.trim())
      .map((l) => ({
        name: l.name.trim() || undefined,
        image_url: l.image_url.trim(),
        ...(l.url.trim() ? { url: l.url.trim() } : {})
      }));

  const addSlide = () => {
    slides = [...slides, { image_url: '', title: '', subtitle: '' }];
  };
  const removeSlide = (index: number) => {
    slides = slides.filter((_, i) => i !== index);
  };
  const extraToSlides = (ed: Record<string, unknown>): SlideRow[] =>
    Array.isArray(ed.slides)
      ? (ed.slides as Array<Record<string, unknown>>).map((s) => ({
          image_url: String(s?.image_url ?? ''),
          title: String(s?.title ?? ''),
          subtitle: String(s?.subtitle ?? '')
        }))
      : [];
  const slidesToExtra = () =>
    slides
      .filter((s) => s.image_url.trim())
      .map((s) => ({
        image_url: s.image_url.trim(),
        ...(s.title.trim() ? { title: s.title.trim() } : {}),
        ...(s.subtitle.trim() ? { subtitle: s.subtitle.trim() } : {})
      }));

  // ── cost ranges repeater (stored in extra_data.ranges) ────────────────────
  type CostRow = { label: string; from: string; note: string };
  let costRanges: CostRow[] = [];
  const addCostRange = () => {
    costRanges = [...costRanges, { label: '', from: '', note: '' }];
  };
  const removeCostRange = (index: number) => {
    costRanges = costRanges.filter((_, i) => i !== index);
  };
  const extraToCostRanges = (ed: Record<string, unknown>): CostRow[] =>
    Array.isArray(ed.ranges)
      ? (ed.ranges as Array<Record<string, unknown>>).map((r) => ({
          label: String(r?.label ?? ''),
          from: String(r?.from ?? ''),
          note: String(r?.note ?? '')
        }))
      : [];
  const costRangesToExtra = () =>
    costRanges
      .filter((r) => r.label.trim() && r.from.trim())
      .map((r) => ({
        label: r.label.trim(),
        from: r.from.trim(),
        ...(r.note.trim() ? { note: r.note.trim() } : {})
      }));

  $: sorted = [...rows].sort((a, b) => a.sort_order - b.sort_order || a.section_key.localeCompare(b.section_key));

  const showToast = (message: string, type: Toast['type'] = 'success') => {
    const id = crypto.randomUUID();
    toasts = [{ id, message, type }, ...toasts].slice(0, 4);
    setTimeout(() => { toasts = toasts.filter((t) => t.id !== id); }, 3500);
  };

  const dismissToast = (e: CustomEvent<string>) => { toasts = toasts.filter((t) => t.id !== e.detail); };

  const prettyKey = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const load = async () => {
    loading = true;
    error = '';
    try {
      const res = await api.homepage.get({ all: true });
      rows = res.data as unknown as Section[];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to load homepage sections.';
    } finally {
      loading = false;
    }
  };

  const loadMedia = async () => {
    if (mediaItems.length || loadingMedia) return;
    loadingMedia = true;
    try {
      const res = await api.media.list({ file_type: 'image', limit: 200 });
      mediaItems = (res.data.items as unknown as MediaItem[]).filter((m) => m.file_url);
      mediaOptions = [{ label: 'Select an image', value: '' }, ...mediaItems.map((m) => ({ label: m.file_name, value: m.id }))];
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to load media library.', 'error');
    } finally {
      loadingMedia = false;
    }
  };

  const nextOrder = () => (sorted.length ? Math.max(...sorted.map((s) => s.sort_order)) + 1 : 0);

  const openCreate = () => {
    editing = null;
    form = { ...emptyForm(), sort_order: String(nextOrder()) };
    extraDataText = '{}';
    bg = emptyBg();
    logos = [];
    slides = [];
    costRanges = [];
    imageMode = 'none';
    mediaId = '';
    modalOpen = true;
  };

  const openEdit = (section: Section) => {
    editing = section;
    form = {
      button_text: section.button_text ?? '',
      button_url: section.button_url ?? '',
      content: section.content ?? '',
      image_url: section.image_url ?? '',
      is_active: section.is_active,
      section_key: section.section_key,
      sort_order: String(section.sort_order ?? 0),
      subtitle: section.subtitle ?? '',
      title: section.title ?? ''
    };
    const ed = (section.extra_data ?? {}) as Record<string, unknown>;
    bg = extraToBg(ed);
    logos = extraToLogos(ed);
    slides = extraToSlides(ed);
    costRanges = extraToCostRanges(ed);
    const rest = Object.fromEntries(Object.entries(ed).filter(([key]) => !MANAGED_KEYS.includes(key)));
    extraDataText = Object.keys(rest).length ? JSON.stringify(rest, null, 2) : '{}';
    imageMode = section.image_url ? 'url' : 'none';
    mediaId = '';
    modalOpen = true;
  };

  const closeModal = () => { modalOpen = false; editing = null; form = emptyForm(); extraDataText = '{}'; bg = emptyBg(); logos = []; slides = []; costRanges = []; mediaPicker = null; };

  const applyImageMode = async () => {
    if (imageMode === 'none') { form.image_url = ''; mediaId = ''; }
    if (imageMode === 'media') await loadMedia();
  };

  const applyMediaSelection = () => {
    const found = mediaItems.find((m) => m.id === mediaId);
    form.image_url = found?.file_url ?? '';
  };

  const save = async () => {
    if (!/^[a-z0-9_]{2,}$/.test(form.section_key.trim())) {
      showToast('Section key is required (lowercase letters, numbers, underscores).', 'error');
      return;
    }

    let extra: Record<string, unknown> = {};
    try {
      extra = extraDataText.trim() ? JSON.parse(extraDataText) : {};
    } catch {
      showToast('Extra data must be valid JSON.', 'error');
      return;
    }

    // Merge the friendly background/overlay controls back into extra_data when
    // this section actually has a background image or video.
    if (form.image_url.trim() || bg.video.trim()) {
      extra = { ...extra, ...bgToExtra() };
    }

    // Merge partner logos when this is a logo-strip section.
    if (form.section_key.trim() === 'partners' || logos.some((l) => l.image_url.trim())) {
      extra = { ...extra, logos: logosToExtra() };
    }

    // Merge login slides when this is the login slider section.
    if (form.section_key.trim() === 'login_slider' || slides.some((s) => s.image_url.trim())) {
      extra = { ...extra, slides: slidesToExtra() };
    }

    // Merge cost ranges for the typical-cost band.
    if (form.section_key.trim() === 'cost_ranges' || costRanges.some((r) => r.label.trim())) {
      extra = { ...extra, ranges: costRangesToExtra() };
    }

    saving = true;
    const payload = {
      button_text: form.button_text.trim() || null,
      button_url: form.button_url.trim() || null,
      content: form.content.trim() || null,
      extra_data: extra,
      image_url: form.image_url.trim() || null,
      is_active: form.is_active,
      section_key: form.section_key.trim(),
      sort_order: Number(form.sort_order || 0),
      subtitle: form.subtitle.trim() || null,
      title: form.title.trim() || null
    };

    try {
      if (editing) {
        await api.homepage.updateSection(editing.id, payload);
        showToast('Section updated successfully.');
      } else {
        await api.homepage.createSection(payload);
        showToast('Section created successfully.');
      }
      closeModal();
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to save section.', 'error');
    } finally {
      saving = false;
    }
  };

  const toggleActive = async (section: Section) => {
    try {
      await api.homepage.updateSection(section.id, { is_active: !section.is_active });
      showToast(section.is_active ? 'Section deactivated.' : 'Section activated.');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to toggle section.', 'error');
    }
  };

  const move = async (section: Section, direction: 'down' | 'up') => {
    const idx = sorted.findIndex((s) => s.id === section.id);
    const swapWith = direction === 'up' ? sorted[idx - 1] : sorted[idx + 1];
    if (!swapWith) return;
    reordering = true;
    try {
      await Promise.all([
        api.homepage.updateSection(section.id, { sort_order: swapWith.sort_order }),
        api.homepage.updateSection(swapWith.id, { sort_order: section.sort_order })
      ]);
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to reorder sections.', 'error');
    } finally {
      reordering = false;
    }
  };

  const openDelete = (section: Section) => { toDelete = section; confirmOpen = true; };

  const confirmDelete = async () => {
    if (!toDelete) return;
    deleting = true;
    try {
      await api.homepage.removeSection(toDelete.id);
      showToast('Section deleted successfully.');
      confirmOpen = false;
      toDelete = null;
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to delete section.', 'error');
    } finally {
      deleting = false;
    }
  };

  onMount(load);
</script>

<ToastStack {toasts} on:dismiss={dismissToast} />

<div class="mx-auto grid w-full max-w-[1500px] gap-6">
  <AdminPageHeader
    eyebrow="Content Management"
    title="Homepage Sections"
    description="Manage homepage content blocks without editing code. Reorder, activate, and edit each section."
    actionLabel="New Section"
    actionIcon={Plus}
    on:action={openCreate}
  />

  {#if loading}
    <LoadingState message="Loading homepage sections..." />
  {:else if error}
    <ErrorState message={error} />
  {:else if rows.length === 0}
    <AdminEmptyState
      title="No homepage sections yet"
      message="Create your first homepage section. Use recommended keys like hero, featured_tours, or final_cta."
      actionLabel="New Section"
      icon={LayoutTemplate}
      on:action={openCreate}
    />
  {:else}
    <div class="grid gap-4">
      {#each sorted as section, index (section.id)}
        <article class={`grid gap-4 rounded-[8px] border bg-white p-5 shadow-[0_14px_44px_rgba(15,47,36,0.06)] lg:grid-cols-[auto_140px_1fr_auto] lg:items-center ${section.is_active ? 'border-ink/10' : 'border-dashed border-ink/20 opacity-75'}`} transition:fade={{ duration: 120 }}>
          <!-- reorder -->
          <div class="flex flex-row gap-1 lg:flex-col">
            <button class="grid h-8 w-8 place-items-center rounded-lg border border-ink/10 bg-white text-ink/55 transition hover:bg-sand/70 disabled:opacity-30" type="button" aria-label="Move up" disabled={index === 0 || reordering} on:click={() => move(section, 'up')}>
              <ArrowUp size={15} />
            </button>
            <button class="grid h-8 w-8 place-items-center rounded-lg border border-ink/10 bg-white text-ink/55 transition hover:bg-sand/70 disabled:opacity-30" type="button" aria-label="Move down" disabled={index === sorted.length - 1 || reordering} on:click={() => move(section, 'down')}>
              <ArrowDown size={15} />
            </button>
          </div>

          <!-- thumb -->
          <div class="aspect-video overflow-hidden rounded-xl bg-sand/40 ring-1 ring-ink/10">
            {#if section.image_url}
              <img class="h-full w-full object-cover" src={section.image_url} alt={section.title || section.section_key} />
            {:else}
              <div class="grid h-full w-full place-items-center text-ink/25"><ImageIcon size={22} /></div>
            {/if}
          </div>

          <!-- details -->
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <span class="rounded-full bg-forest/10 px-2.5 py-0.5 font-mono text-[11px] font-bold text-forest">{section.section_key}</span>
              <span class="rounded-full bg-sand/70 px-2 py-0.5 text-[11px] font-semibold text-ink/55">Sort {section.sort_order}</span>
              {#if section.is_active}
                <span class="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-600 ring-1 ring-emerald-200/60">Active</span>
              {:else}
                <span class="rounded-full bg-ink/5 px-2 py-0.5 text-[11px] font-bold text-ink/45">Inactive</span>
              {/if}
            </div>
            <h3 class="mt-2 truncate text-lg font-bold text-ink">{section.title || prettyKey(section.section_key)}</h3>
            {#if section.subtitle}<p class="mt-0.5 line-clamp-1 text-sm text-ink/60">{section.subtitle}</p>{/if}
            {#if section.button_text}
              <span class="mt-2 inline-flex items-center gap-1 rounded-lg bg-goldfinch-gold/20 px-2 py-0.5 text-[11px] font-semibold text-deep-green">Button: {section.button_text}</span>
            {/if}
          </div>

          <!-- actions -->
          <div class="flex flex-wrap items-center gap-2 lg:justify-end">
            <label class="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-ink/10 bg-white px-3 py-2 text-xs font-semibold text-ink shadow-sm">
              <input class="h-4 w-4 accent-forest" type="checkbox" checked={section.is_active} on:change={() => toggleActive(section)} />
              {section.is_active ? 'Active' : 'Inactive'}
            </label>
            <button class="inline-flex h-9 items-center gap-1.5 rounded-xl border border-ink/10 bg-white px-3 text-xs font-semibold text-ink shadow-sm transition hover:border-goldfinch-gold/35 hover:bg-sand/70" type="button" on:click={() => openEdit(section)}>
              <Edit size={14} />Edit
            </button>
            <button class="inline-flex h-9 items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-50" type="button" on:click={() => openDelete(section)}>
              <Trash2 size={14} />Delete
            </button>
          </div>
        </article>
      {/each}
    </div>
  {/if}
</div>

{#if modalOpen}
  <div class="fixed inset-0 z-50 grid place-items-center bg-ink/45 p-4 backdrop-blur-sm" transition:fade={{ duration: 140 }}>
    <form
      class="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[10px] border border-ink/10 bg-white p-6 shadow-[0_24px_80px_rgba(15,47,36,0.18)]"
      transition:scale={{ duration: 160, start: 0.98 }}
      on:submit|preventDefault={save}
    >
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">{editing ? 'Edit section' : 'New section'}</p>
          <h2 class="mt-1 text-2xl font-bold text-ink">{editing ? prettyKey(editing.section_key) : 'Create homepage section'}</h2>
        </div>
        <button class="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-ink/10 bg-white text-ink shadow-sm transition hover:bg-sand" type="button" aria-label="Close" on:click={closeModal}>
          <X size={18} />
        </button>
      </div>

      <div class="mt-6 grid gap-4">
        <div>
          <AdminFormInput label="Section key" name="section_key" bind:value={form.section_key} placeholder="e.g. hero" required />
          {#if !editing}
            <div class="mt-2 flex flex-wrap gap-1.5">
              {#each recommendedKeys as key}
                <button class="rounded-full border border-ink/10 bg-sand/40 px-2.5 py-1 font-mono text-[11px] font-semibold text-ink/60 transition hover:border-forest/40 hover:bg-sand/70" type="button" on:click={() => (form.section_key = key)}>{key}</button>
              {/each}
            </div>
          {/if}
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <AdminFormInput label="Title" name="title" bind:value={form.title} placeholder="Section heading" />
          <AdminFormInput label="Subtitle" name="subtitle" bind:value={form.subtitle} placeholder="Supporting line" />
        </div>

        <AdminTextArea label="Content" name="content" bind:value={form.content} rows={3} placeholder="Optional body text for this section." />

        <!-- image -->
        <div class="rounded-[8px] border border-ink/10 bg-sand/25 p-4">
          <div class="grid gap-4 sm:grid-cols-[220px_1fr]">
            <AdminSelect label="Image source" name="image_mode" bind:value={imageMode} options={imageModeOptions} on:change={applyImageMode} />
            {#if imageMode === 'media'}
              <AdminSelect label={loadingMedia ? 'Loading...' : 'Media Library'} name="media_id" bind:value={mediaId} options={mediaOptions} on:change={applyMediaSelection} />
            {:else if imageMode === 'url'}
              <AdminFormInput label="Image URL" name="image_url" bind:value={form.image_url} placeholder="https://..." />
            {:else}
              <div class="grid place-items-center rounded-2xl border border-dashed border-ink/15 bg-white/70 p-3 text-sm text-ink/50">No image.</div>
            {/if}
          </div>
          {#if form.image_url && imageMode !== 'none'}
            <img class="mt-4 h-28 w-full rounded-2xl object-cover ring-1 ring-ink/10" src={form.image_url} alt="Section preview" />
          {/if}
        </div>

        <!-- background video + overlay -->
        <div class="grid gap-4 rounded-[8px] border border-ink/10 bg-sand/25 p-4">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">Background &amp; overlay</p>
            <p class="mt-1 text-xs text-ink/50">Used by full-width sections (e.g. final CTA, hero). A video takes priority over the image. The overlay keeps text readable.</p>
          </div>
          <AdminFormInput label="Background video URL (optional · mp4/webm)" name="bg_video" bind:value={bg.video} placeholder="https://...mp4" />
          <div class="grid gap-4 sm:grid-cols-3">
            <label class="grid gap-2 text-sm font-medium text-ink">
              <span>Overlay color</span>
              <span class="flex h-11 items-center gap-2 rounded-2xl border border-ink/10 bg-white px-2 shadow-sm">
                <input class="h-8 w-10 shrink-0 cursor-pointer rounded-lg border border-ink/10 bg-white p-0.5" type="color" bind:value={bg.overlay_color} aria-label="Overlay color" />
                <input class="min-w-0 flex-1 bg-transparent font-mono text-sm uppercase outline-none" bind:value={bg.overlay_color} spellcheck="false" />
              </span>
            </label>
            <label class="grid gap-2 text-sm font-medium text-ink">
              <span>Overlay opacity · {bg.overlay_opacity}%</span>
              <input class="mt-3 w-full accent-forest" type="range" min="0" max="100" step="5" bind:value={bg.overlay_opacity} aria-label="Overlay opacity" />
            </label>
            <AdminSelect label="Crop / focus" name="media_position" bind:value={bg.media_position} options={positionOptions} />
          </div>
          <label class="flex cursor-pointer items-center gap-3 rounded-2xl border border-ink/10 bg-white p-3">
            <input class="h-4 w-4 accent-forest" type="checkbox" bind:checked={bg.overlay_gradient} />
            <span class="text-sm font-semibold text-ink">Gradient overlay <span class="font-normal text-ink/50">(fades diagonally for depth)</span></span>
          </label>
        </div>

        <!-- partner logos repeater -->
        {#if form.section_key.trim() === 'partners'}
          <div class="grid gap-3 rounded-[8px] border border-ink/10 bg-sand/25 p-4">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">Partner logos</p>
                <p class="mt-1 text-xs text-ink/50">Shown as an auto-scrolling strip. Transparent PNG or SVG works best.</p>
              </div>
              <button type="button" class="inline-flex h-9 items-center gap-1.5 rounded-xl border border-ink/10 bg-white px-3 text-xs font-semibold text-ink shadow-sm transition hover:border-goldfinch-gold/35 hover:bg-sand/70" on:click={addLogo}>
                <Plus size={14} />Add logo
              </button>
            </div>

            {#if logos.length === 0}
              <p class="rounded-xl border border-dashed border-ink/15 bg-white/60 py-4 text-center text-xs text-ink/45">No logos yet — add your first partner.</p>
            {/if}

            {#each logos as logo, i (i)}
              <div class="grid gap-2 rounded-xl border border-ink/10 bg-white p-3 sm:grid-cols-[64px_1fr_auto] sm:items-start">
                <div class="grid h-12 w-16 place-items-center overflow-hidden rounded-lg bg-sand/40 ring-1 ring-ink/10">
                  {#if logo.image_url}
                    <img class="max-h-10 max-w-[56px] object-contain" src={logo.image_url} alt={logo.name || 'Logo'} />
                  {:else}
                    <ImageIcon size={16} class="text-ink/30" />
                  {/if}
                </div>
                <div class="grid gap-2">
                  <input class="h-9 rounded-lg border border-ink/10 bg-white px-3 text-sm outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/15" placeholder="Partner name" bind:value={logo.name} />
                  <div class="flex gap-2">
                    <input class="h-9 min-w-0 flex-1 rounded-lg border border-ink/10 bg-white px-3 text-sm outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/15" placeholder="Logo image URL" bind:value={logo.image_url} />
                    <button type="button" class="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border border-ink/10 bg-white px-2.5 text-xs font-semibold text-ink shadow-sm transition hover:bg-sand/60" on:click={() => openMediaPicker('logos', i)}><ImageIcon size={13} />Media</button>
                  </div>
                  <input class="h-9 rounded-lg border border-ink/10 bg-white px-3 text-sm outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/15" placeholder="Link URL (optional)" bind:value={logo.url} />
                </div>
                <button type="button" class="grid h-9 w-9 place-items-center justify-self-end rounded-lg border border-red-200 bg-white text-red-600 shadow-sm transition hover:bg-red-50" aria-label="Remove logo" on:click={() => removeLogo(i)}><Trash2 size={15} /></button>
              </div>
            {/each}
          </div>
        {/if}

        <!-- login page slider repeater -->
        {#if form.section_key.trim() === 'login_slider'}
          <div class="grid gap-3 rounded-[8px] border border-ink/10 bg-sand/25 p-4">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">Login page slides</p>
                <p class="mt-1 text-xs text-ink/50">Shown on the admin login screen — each slide has an image, a heading and a short line. Rotates automatically.</p>
              </div>
              <button type="button" class="inline-flex h-9 items-center gap-1.5 rounded-xl border border-ink/10 bg-white px-3 text-xs font-semibold text-ink shadow-sm transition hover:border-goldfinch-gold/35 hover:bg-sand/70" on:click={addSlide}>
                <Plus size={14} />Add slide
              </button>
            </div>

            {#if slides.length === 0}
              <p class="rounded-xl border border-dashed border-ink/15 bg-white/60 py-4 text-center text-xs text-ink/45">No slides yet — add your first slide.</p>
            {/if}

            {#each slides as slide, i (i)}
              <div class="grid gap-2 rounded-xl border border-ink/10 bg-white p-3 sm:grid-cols-[96px_1fr_auto] sm:items-start">
                <div class="grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-lg bg-sand/40 ring-1 ring-ink/10 sm:w-24">
                  {#if slide.image_url}
                    <img class="h-full w-full object-cover" src={slide.image_url} alt={slide.title || 'Slide'} />
                  {:else}
                    <ImageIcon size={16} class="text-ink/30" />
                  {/if}
                </div>
                <div class="grid gap-2">
                  <div class="flex gap-2">
                    <input class="h-9 min-w-0 flex-1 rounded-lg border border-ink/10 bg-white px-3 text-sm outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/15" placeholder="Image URL" bind:value={slide.image_url} />
                    <button type="button" class="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border border-ink/10 bg-white px-2.5 text-xs font-semibold text-ink shadow-sm transition hover:bg-sand/60" on:click={() => openMediaPicker('slides', i)}><ImageIcon size={13} />Media</button>
                  </div>
                  <input class="h-9 rounded-lg border border-ink/10 bg-white px-3 text-sm outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/15" placeholder="Heading (e.g. Plan East Africa with confidence)" bind:value={slide.title} />
                  <input class="h-9 rounded-lg border border-ink/10 bg-white px-3 text-sm outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/15" placeholder="Short line (optional)" bind:value={slide.subtitle} />
                </div>
                <button type="button" class="grid h-9 w-9 place-items-center justify-self-end rounded-lg border border-red-200 bg-white text-red-600 shadow-sm transition hover:bg-red-50" aria-label="Remove slide" on:click={() => removeSlide(i)}><Trash2 size={15} /></button>
              </div>
            {/each}
          </div>
        {/if}

        <!-- typical cost ranges repeater -->
        {#if form.section_key.trim() === 'cost_ranges'}
          <div class="grid gap-3 rounded-[8px] border border-ink/10 bg-sand/25 p-4">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">Typical cost ranges</p>
                <p class="mt-1 text-xs text-ink/50">The "What trips typically cost" band on the homepage. Each row: trip type, a "from" price, and an optional note. (Built-in defaults show until you add rows.)</p>
              </div>
              <button type="button" class="inline-flex h-9 items-center gap-1.5 rounded-xl border border-ink/10 bg-white px-3 text-xs font-semibold text-ink shadow-sm transition hover:border-goldfinch-gold/35 hover:bg-sand/70" on:click={addCostRange}>
                <Plus size={14} />Add row
              </button>
            </div>

            {#if costRanges.length === 0}
              <p class="rounded-xl border border-dashed border-ink/15 bg-white/60 py-4 text-center text-xs text-ink/45">No rows yet — add your first trip type.</p>
            {/if}

            {#each costRanges as row, i (i)}
              <div class="grid gap-2 rounded-xl border border-ink/10 bg-white p-3 sm:grid-cols-[1fr_1fr_1.4fr_auto] sm:items-center">
                <input class="h-9 rounded-lg border border-ink/10 bg-white px-3 text-sm outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/15" placeholder="Trip type (e.g. Safari)" bind:value={row.label} />
                <input class="h-9 rounded-lg border border-ink/10 bg-white px-3 text-sm outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/15" placeholder="from $1,500" bind:value={row.from} />
                <input class="h-9 rounded-lg border border-ink/10 bg-white px-3 text-sm outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/15" placeholder="Note (e.g. Guiding &amp; park fees)" bind:value={row.note} />
                <button type="button" class="grid h-9 w-9 place-items-center justify-self-end rounded-lg border border-red-200 bg-white text-red-600 shadow-sm transition hover:bg-red-50" aria-label="Remove row" on:click={() => removeCostRange(i)}><Trash2 size={15} /></button>
              </div>
            {/each}
          </div>
        {/if}

        <div class="grid gap-4 sm:grid-cols-2">
          <AdminFormInput label="Button text" name="button_text" bind:value={form.button_text} placeholder="e.g. Plan My Trip" />
          <AdminFormInput label="Button URL" name="button_url" bind:value={form.button_url} placeholder="e.g. /plan-my-trip" />
        </div>

        <label class="grid gap-2 text-sm font-medium text-ink">
          <span>Extra data (JSON)</span>
          <textarea class="min-h-[120px] rounded-2xl border border-ink/10 bg-white px-3 py-2 font-mono text-xs shadow-sm outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/15" bind:value={extraDataText} spellcheck="false" placeholder={'{\n  "secondary_cta_text": "Talk to a Travel Advisor"\n}'}></textarea>
          <span class="text-xs text-ink/45">Advanced configuration stored as JSON (e.g. secondary CTA, feature lists).</span>
        </label>

        <div class="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <AdminFormInput label="Sort order" name="sort_order" type="number" bind:value={form.sort_order} />
          <label class="flex h-11 cursor-pointer items-center gap-3 rounded-2xl border border-ink/10 bg-white px-4 transition hover:bg-sand/30">
            <input class="h-4 w-4 accent-forest" type="checkbox" bind:checked={form.is_active} />
            <span class="text-sm font-semibold text-ink">Active (visible on site)</span>
          </label>
        </div>

        <!-- live preview -->
        <div class="overflow-hidden rounded-[8px] border border-ink/10">
          <div class="border-b border-ink/10 bg-sand/40 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">Live preview</div>
          <div class="relative grid min-h-[180px] place-items-center overflow-hidden bg-gradient-to-br from-deep-green via-forest to-deep-green p-6 text-center text-white">
            {#if bg.video}
              <!-- svelte-ignore a11y-media-has-caption -->
              <video class="absolute inset-0 h-full w-full object-cover" style={`object-position:${bg.media_position}`} src={bg.video} autoplay muted loop playsinline></video>
            {:else if form.image_url && imageMode !== 'none'}
              <img class="absolute inset-0 h-full w-full object-cover" style={`object-position:${bg.media_position}`} src={form.image_url} alt="" />
            {/if}
            {#if bgHasMedia}
              <div class="absolute inset-0" style={overlayStyle}></div>
            {/if}
            <div class="relative z-10">
              <h3 class="text-xl font-extrabold">{form.title || prettyKey(form.section_key || 'section')}</h3>
              {#if form.subtitle}<p class="mx-auto mt-2 max-w-md text-sm text-white/80">{form.subtitle}</p>{/if}
              {#if form.button_text}
                <span class="mt-4 inline-flex h-10 items-center rounded-xl bg-goldfinch-gold px-5 text-sm font-bold text-deep-green">{form.button_text}</span>
              {/if}
            </div>
          </div>
        </div>
      </div>

      <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <AdminButton variant="secondary" type="button" on:click={closeModal}>Cancel</AdminButton>
        <AdminButton type="submit" disabled={saving}>
          <Save size={16} />
          {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Section'}
        </AdminButton>
      </div>
    </form>
  </div>
{/if}

<ConfirmModal
  open={confirmOpen}
  title="Delete homepage section"
  message={`Delete the "${toDelete?.section_key ?? 'this'}" section? This action soft-deletes the record.`}
  on:cancel={() => { confirmOpen = false; toDelete = null; }}
  on:confirm={confirmDelete}
/>

{#if deleting}
  <div class="fixed bottom-4 right-4 z-[70] rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(15,47,36,0.18)]">
    Deleting section...
  </div>
{/if}

{#if mediaPicker}
  <div
    class="fixed inset-0 z-[60] grid place-items-center bg-ink/45 p-4 backdrop-blur-sm"
    transition:fade={{ duration: 140 }}
  >
    <div
      class="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-[10px] border border-ink/10 bg-white shadow-[0_24px_80px_rgba(15,47,36,0.18)]"
      transition:scale={{ duration: 160, start: 0.98 }}
    >
      <div class="flex items-center justify-between border-b border-ink/10 bg-sand/30 p-4">
        <h3 class="text-base font-bold text-ink">Choose an image</h3>
        <button
          class="grid h-9 w-9 place-items-center rounded-xl border border-ink/10 bg-white text-ink shadow-sm transition hover:bg-sand"
          type="button"
          aria-label="Close"
          on:click={() => (mediaPicker = null)}
        >
          <X size={16} />
        </button>
      </div>
      <div class="overflow-y-auto p-4">
        {#if loadingMedia}
          <p class="py-8 text-center text-sm text-ink/50">Loading media...</p>
        {:else if mediaItems.length === 0}
          <p class="py-8 text-center text-sm text-ink/50">No images in the Media Library yet.</p>
        {:else}
          <div class="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {#each mediaItems as m (m.id)}
              <button
                class="group grid aspect-square place-items-center overflow-hidden rounded-xl border border-ink/10 bg-sand/30 p-2 transition hover:border-goldfinch-gold/50 hover:bg-sand/60"
                type="button"
                title={m.file_name}
                on:click={() => pickMedia(m.file_url)}
              >
                <img class="max-h-full max-w-full object-contain" src={m.file_url} alt={m.file_name} loading="lazy" />
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
