<script lang="ts">
  import { createEventDispatcher, onDestroy } from 'svelte';
  import { ChevronLeft, ChevronRight, Film, Image as ImageIcon, Link as LinkIcon, Search, Trash2, Upload, X } from '@lucide/svelte';
  import { imgUrl } from '$lib/img';
  import { api } from '$lib/api/client';
  import type { Pagination } from '$lib/types';

  type MediaItem = {
    id: string;
    file_name: string;
    file_url: string;
    thumbnail_url?: string | null;
    title?: string | null;
    alt_text?: string | null;
    caption?: string | null;
  };

  export let value = '';
  export let label = 'Image';
  export let media: MediaItem[] = [];
  export let aspect = 'aspect-[16/9]';
  export let uploadFolder = 'uploads';
  export let fit = 'object-cover'; // use 'object-contain' for logos/favicons
  export let kind: 'image' | 'video' = 'image';

  const dispatch = createEventDispatcher<{ change: string }>();
  $: isVideo = kind === 'video';
  $: noun = isVideo ? 'video' : 'image';

  let open = false; // library modal
  let urlMode = false; // paste-url input
  let search = '';
  let uploaded: MediaItem[] = []; // files uploaded in this session
  let library: MediaItem[] = [];
  let libraryPagination: Pagination | null = null;
  let libraryLoaded = false;
  let libraryLoading = false;
  let libraryError = '';
  let libraryPage = 1;
  let uploading = false;
  let uploadError = '';
  let fileInput: HTMLInputElement;
  let searchTimer: ReturnType<typeof setTimeout> | undefined;

  const pageLimit = 40;
  const searchText = (m: MediaItem) => `${m.title ?? ''} ${m.file_name} ${m.alt_text ?? ''} ${m.caption ?? ''}`;

  const uniqueMedia = (items: MediaItem[]) => {
    const seen = new Set<string>();
    return items.filter((item) => {
      const key = item.id || item.file_url;
      if (!item.file_url || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const labelOf = (m: MediaItem) =>
    m.title?.trim() || m.alt_text?.trim() || m.caption?.trim() || m.file_name.replace(/\.[^./\\]+$/, '').replace(/[-_]+/g, ' ').trim();

  const mediaFromRecord = (record: Record<string, unknown>): MediaItem | null => {
    const fileUrl = typeof record.file_url === 'string' ? record.file_url : '';
    if (!fileUrl) return null;
    const title = typeof record.title === 'string' ? record.title : null;
    const fileName =
      typeof record.file_name === 'string' && record.file_name.trim()
        ? record.file_name
        : title?.trim() || noun;
    return {
      id: String(record.id ?? fileUrl),
      file_name: fileName,
      file_url: fileUrl,
      thumbnail_url: typeof record.thumbnail_url === 'string' ? record.thumbnail_url : null,
      title,
      alt_text: typeof record.alt_text === 'string' ? record.alt_text : null,
      caption: typeof record.caption === 'string' ? record.caption : null
    };
  };

  const loadLibrary = async (page = libraryPage) => {
    if (libraryLoading) return;
    libraryLoading = true;
    libraryError = '';
    try {
      const res = await api.media.list({
        file_type: kind,
        limit: pageLimit,
        page,
        search: search.trim() || undefined
      });
      library = (res.data.items as Record<string, unknown>[])
        .map(mediaFromRecord)
        .filter((item): item is MediaItem => Boolean(item));
      libraryPagination = res.data.pagination;
      libraryPage = res.data.pagination.page;
      libraryLoaded = true;
    } catch (err) {
      libraryError = err instanceof Error ? err.message : `Unable to load ${noun}s.`;
      if (!libraryLoaded) library = [];
    } finally {
      libraryLoading = false;
    }
  };
  const openLibrary = () => {
    open = true;
    if (!libraryLoaded) void loadLibrary(1);
  };

  const queueSearch = () => {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      void loadLibrary(1);
    }, 300);
  };

  const submitSearch = () => {
    if (searchTimer) clearTimeout(searchTimer);
    void loadLibrary(1);
  };

  const clearSearch = () => {
    search = '';
    submitSearch();
  };

  $: sourceMedia = libraryLoaded ? library : media;
  $: allMedia = uniqueMedia([...uploaded, ...sourceMedia]);
  $: filtered = search.trim()
    ? allMedia.filter((m) => searchText(m).toLowerCase().includes(search.trim().toLowerCase()))
    : allMedia;
  $: totalItems = libraryPagination?.total ?? allMedia.length;
  $: totalPages = Math.max(libraryPagination?.totalPages ?? 1, 1);
  $: currentPage = libraryPagination?.page ?? libraryPage;
  $: fromItem = totalItems ? (currentPage - 1) * pageLimit + 1 : 0;
  $: toItem = totalItems ? Math.min(currentPage * pageLimit, totalItems) : 0;

  const goToPage = (page: number) => {
    if (libraryLoading || page < 1 || page > totalPages) return;
    void loadLibrary(page);
  };

  const select = (url: string) => { value = url; open = false; dispatch('change', url); };
  const clear = () => { value = ''; urlMode = false; dispatch('change', ''); };

  const onFileChange = async (event: Event) => {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    uploading = true;
    uploadError = '';
    try {
      const res = isVideo ? await api.upload.video(file, uploadFolder) : await api.upload.image(file, uploadFolder);
      const data = res.data as { url: string; media?: { id?: string; thumbnail_url?: string | null } };
      const item: MediaItem = {
        id: data.media?.id ?? data.url,
        file_name: file.name,
        file_url: data.url,
        thumbnail_url: data.media?.thumbnail_url ?? null
      };
      uploaded = [item, ...uploaded];
      select(data.url);
    } catch (err) {
      uploadError = err instanceof Error ? err.message : 'Upload failed.';
    } finally {
      uploading = false;
      if (fileInput) fileInput.value = '';
    }
  };

  // Render the modal on <body> so a transformed admin ancestor can't break
  // position:fixed (which would push the dialog out of the viewport).
  const portal = (node: HTMLElement) => {
    document.body.appendChild(node);
    return { destroy: () => node.remove() };
  };

  onDestroy(() => {
    if (searchTimer) clearTimeout(searchTimer);
  });
</script>

<div class="grid gap-3">
  <p class="text-sm font-medium text-ink">{label}</p>

  {#if value}
    <div class={`relative overflow-hidden rounded-[8px] border border-ink/10 bg-sand/30 ${aspect}`}>
      {#if isVideo}
        <!-- svelte-ignore a11y-media-has-caption -->
        <video class={`absolute inset-0 h-full w-full ${fit}`} src={value} muted playsinline preload="metadata"></video>
      {:else}
        <img class={`absolute inset-0 h-full w-full ${fit}`} src={imgUrl(value, 800)} alt={label} loading="lazy" decoding="async" />
      {/if}
      <button type="button" class="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-[8px] bg-ink/65 text-white backdrop-blur transition hover:bg-ink/85" on:click={clear} aria-label={`Remove ${noun}`}>
        <Trash2 size={15} />
      </button>
    </div>
  {:else}
    <div class={`grid place-items-center rounded-[8px] border border-dashed border-ink/20 bg-sand/20 text-ink/35 ${aspect}`}>
      {#if isVideo}<Film size={26} />{:else}<ImageIcon size={26} />{/if}
    </div>
  {/if}

  <div class="flex flex-wrap gap-2">
    <button type="button" class="inline-flex items-center gap-1.5 rounded-lg bg-forest px-3 py-1.5 text-xs font-bold text-white transition hover:bg-deep-green" on:click={openLibrary}>
      {#if isVideo}<Film size={14} />{:else}<ImageIcon size={14} />{/if} {value ? 'Change' : 'Choose from library'}
    </button>
    <button type="button" class="inline-flex items-center gap-1.5 rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-semibold text-ink/70 transition hover:bg-sand" on:click={() => (urlMode = !urlMode)}>
      <LinkIcon size={14} /> Paste URL
    </button>
  </div>

  {#if urlMode}
    <input
      class="w-full rounded-md border border-ink/15 bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-forest focus:ring-2 focus:ring-forest/15"
      placeholder="https://…"
      bind:value
      on:input={() => dispatch('change', value)}
    />
  {/if}
</div>

<!-- library picker modal -->
{#if open}
  <div use:portal class="fixed inset-0 z-[70] grid place-items-center p-3 sm:p-4" role="dialog" aria-modal="true">
    <button class="absolute inset-0 cursor-default bg-ink/55 backdrop-blur-sm" type="button" aria-label="Close" on:click={() => (open = false)}></button>
    <div class="relative flex h-[88vh] max-h-[920px] w-full max-w-7xl flex-col overflow-hidden rounded-[10px] border border-ink/10 bg-surface shadow-[0_28px_90px_rgba(57,61,50,0.22)]">
      <div class="flex flex-col gap-4 border-b border-ink/10 bg-sand/25 p-4 lg:flex-row lg:items-center">
        <div class="min-w-0 lg:w-60">
          <p class="text-base font-extrabold tracking-tight text-heading">Media Library</p>
          <p class="mt-0.5 text-xs text-ink/50">
            {#if libraryLoading && !libraryLoaded}
              Loading {noun}s...
            {:else if totalItems}
              {fromItem}-{toItem} of {totalItems} {noun}{totalItems === 1 ? '' : 's'}
            {:else}
              No {noun}s available
            {/if}
          </p>
        </div>
        <div class="flex h-11 flex-1 items-center gap-2 rounded-[8px] border border-ink/12 bg-surface px-3 shadow-sm transition focus-within:border-forest/45 focus-within:ring-2 focus-within:ring-forest/10">
          <Search size={16} class="text-ink/40" />
          <input
            class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink/40"
            placeholder={`Search by title, file name, alt text or caption...`}
            bind:value={search}
            on:input={queueSearch}
            on:keydown={(event) => event.key === 'Enter' && submitSearch()}
          />
          {#if search.trim()}
            <button type="button" class="grid h-7 w-7 shrink-0 place-items-center rounded-md text-ink/40 transition hover:bg-sand hover:text-ink" aria-label="Clear search" on:click={clearSearch}>
              <X size={14} />
            </button>
          {/if}
        </div>
        <div class="flex shrink-0 gap-2">
          <button
            type="button"
            class="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-[8px] bg-forest px-4 text-sm font-bold text-white shadow-sm transition hover:bg-deep-green disabled:opacity-60"
            on:click={() => fileInput.click()}
            disabled={uploading}
          >
            <Upload size={15} /> {uploading ? 'Uploading...' : 'Upload'}
          </button>
          <button type="button" class="grid h-11 w-11 shrink-0 place-items-center rounded-[8px] border border-ink/10 bg-surface text-ink shadow-sm transition hover:bg-sand" on:click={() => (open = false)} aria-label="Close"><X size={18} /></button>
        </div>
      </div>
      {#if uploadError}
        <p class="border-b border-ink/10 bg-red-50 px-4 py-2 text-xs font-medium text-red-600">{uploadError}</p>
      {/if}
      {#if libraryError}
        <div class="flex flex-col gap-2 border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
          <span>{libraryError}</span>
          <button type="button" class="w-fit rounded-[8px] bg-white px-3 py-1.5 text-xs font-bold text-red-700 ring-1 ring-red-200 transition hover:bg-red-100" on:click={() => loadLibrary(currentPage)}>Retry</button>
        </div>
      {/if}
      <div class="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5" data-lenis-prevent>
        {#if libraryLoading && !libraryLoaded}
          <div class="grid min-h-full place-items-center rounded-[10px] border border-ink/10 bg-sand/15 p-8 text-center">
            <div>
              <span class="mx-auto block h-9 w-9 animate-spin rounded-full border-2 border-forest/20 border-t-forest"></span>
              <p class="mt-3 text-sm font-bold text-ink">Loading media library</p>
              <p class="mt-1 text-xs text-ink/50">Fetching {noun} records from the CMS.</p>
            </div>
          </div>
        {:else if !filtered.length}
          <div class="grid min-h-full place-items-center rounded-[10px] border border-dashed border-ink/15 bg-sand/20 p-8 text-center">
            <div>
              <span class="mx-auto grid h-12 w-12 place-items-center rounded-[10px] bg-surface text-ink/35 ring-1 ring-ink/10">
                {#if isVideo}<Film size={24} />{:else}<ImageIcon size={24} />{/if}
              </span>
              <p class="mt-3 text-sm font-bold text-ink">No {noun}s found</p>
              <p class="mt-1 text-xs text-ink/50">Try another search or upload a new {noun}.</p>
            </div>
          </div>
        {:else}
          <div class="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4">
            {#each filtered as m (m.id)}
              <button
                type="button"
                class={`group overflow-hidden rounded-[10px] border bg-surface text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(57,61,50,0.11)] ${value === m.file_url ? 'border-goldfinch-gold ring-2 ring-goldfinch-gold/45' : 'border-ink/10 hover:border-forest/35'}`}
                on:click={() => select(m.file_url)}
              >
                <span class="relative block aspect-[4/3] w-full overflow-hidden bg-sand/35">
                  {#if isVideo}
                    <!-- svelte-ignore a11y-media-has-caption -->
                    <video class="absolute inset-0 h-full w-full object-cover" src={m.file_url} muted playsinline preload="metadata"></video>
                  {:else}
                    <img
                      class="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-300 group-hover:scale-105"
                      src={imgUrl(m.thumbnail_url || m.file_url, 420)}
                      alt={labelOf(m)}
                      loading="lazy"
                      decoding="async"
                      on:load={(e) => ((e.currentTarget as HTMLImageElement).style.opacity = '1')}
                    />
                  {/if}
                  {#if value === m.file_url}
                    <span class="absolute right-2 top-2 rounded-[8px] bg-goldfinch-gold px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-heading shadow-sm">Selected</span>
                  {/if}
                </span>
                <span class="block min-h-11 px-3 py-2">
                  <span class="line-clamp-2 break-words text-xs font-semibold leading-snug text-ink/70" title={labelOf(m)}>{labelOf(m)}</span>
                </span>
              </button>
            {/each}
          </div>
        {/if}
      </div>
      <div class="flex flex-col gap-3 border-t border-ink/10 bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-xs font-medium text-ink/50">
          {#if search.trim()}
            Search: <span class="font-bold text-ink/70">{search.trim()}</span>
          {:else}
            Showing all {noun} uploads
          {/if}
        </p>
        <div class="flex items-center justify-between gap-2 sm:justify-end">
          <button
            type="button"
            class="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-ink/12 bg-surface px-3 text-xs font-bold text-ink/70 shadow-sm transition hover:bg-sand disabled:pointer-events-none disabled:opacity-45"
            disabled={libraryLoading || currentPage <= 1}
            on:click={() => goToPage(currentPage - 1)}
          >
            <ChevronLeft size={14} /> Previous
          </button>
          <span class="min-w-24 text-center text-xs font-bold text-ink/60">Page {currentPage} of {totalPages}</span>
          <button
            type="button"
            class="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-ink/12 bg-surface px-3 text-xs font-bold text-ink/70 shadow-sm transition hover:bg-sand disabled:pointer-events-none disabled:opacity-45"
            disabled={libraryLoading || currentPage >= totalPages}
            on:click={() => goToPage(currentPage + 1)}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<input class="hidden" type="file" accept={isVideo ? 'video/mp4,video/webm,video/quicktime' : 'image/png,image/jpeg,image/webp'} bind:this={fileInput} on:change={onFileChange} />
