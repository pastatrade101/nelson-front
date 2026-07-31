<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Film, Image as ImageIcon, Link as LinkIcon, Search, Trash2, Upload, X } from '@lucide/svelte';
  import { imgUrl } from '$lib/img';
  import { api } from '$lib/api/client';

  type MediaItem = { id: string; file_name: string; file_url: string; thumbnail_url?: string | null };

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
  let uploading = false;
  let uploadError = '';
  let fileInput: HTMLInputElement;

  // Videos aren't passed via the `media` prop, so the picker fetches them itself
  // (filtered by kind) the first time the library modal is opened.
  let library: MediaItem[] = [];
  let loadingLibrary = false;
  const loadLibrary = async () => {
    if (loadingLibrary) return;
    loadingLibrary = true;
    try {
      const res = await api.media.list({ file_type: kind, limit: 200 });
      library = (res.data.items as unknown as MediaItem[]).filter((m) => m.file_url);
    } catch {
      /* keep whatever we already have */
    } finally {
      loadingLibrary = false;
    }
  };
  const openLibrary = () => {
    open = true;
    if (isVideo && !library.length) void loadLibrary();
  };

  $: allMedia = [...uploaded, ...(isVideo ? library : media)];
  $: filtered = search.trim()
    ? allMedia.filter((m) => m.file_name.toLowerCase().includes(search.trim().toLowerCase()))
    : allMedia;

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
</script>

<div class="grid gap-3">
  <p class="text-sm font-medium text-ink">{label}</p>

  {#if value}
    <div class="relative overflow-hidden rounded-xl border border-ink/10 bg-surface">
      {#if isVideo}
        <!-- svelte-ignore a11y-media-has-caption -->
        <video class={`w-full ${fit} ${aspect}`} src={value} muted playsinline preload="metadata"></video>
      {:else}
        <img class={`w-full ${fit} ${aspect}`} src={imgUrl(value, 800)} alt={label} loading="lazy" decoding="async" />
      {/if}
      <button type="button" class="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-ink/60 text-white backdrop-blur transition hover:bg-ink/80" on:click={clear} aria-label={`Remove ${noun}`}>
        <Trash2 size={15} />
      </button>
    </div>
  {:else}
    <div class={`grid place-items-center rounded-xl border border-dashed border-ink/20 bg-sand/20 text-ink/35 ${aspect}`}>
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
  <div use:portal class="fixed inset-0 z-[70] grid place-items-center p-4" role="dialog" aria-modal="true">
    <button class="absolute inset-0 cursor-default bg-ink/55 backdrop-blur-sm" type="button" aria-label="Close" on:click={() => (open = false)}></button>
    <div class="relative flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-ink/10 bg-surface shadow-2xl">
      <div class="flex items-center gap-3 border-b border-ink/10 p-4">
        <p class="hidden text-sm font-bold text-ink sm:block">Media Library</p>
        <div class="flex flex-1 items-center gap-2 rounded-lg border border-ink/12 bg-sand/20 px-3">
          <Search size={16} class="text-ink/40" />
          <input class="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink/40" placeholder={`Search ${noun}s…`} bind:value={search} />
        </div>
        <button
          type="button"
          class="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-forest px-3 text-xs font-bold text-white transition hover:bg-deep-green disabled:opacity-60"
          on:click={() => fileInput.click()}
          disabled={uploading}
        >
          <Upload size={14} /> {uploading ? 'Uploading…' : 'Upload'}
        </button>
        <button type="button" class="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-ink/10 text-ink transition hover:bg-sand" on:click={() => (open = false)} aria-label="Close"><X size={18} /></button>
      </div>
      {#if uploadError}
        <p class="border-b border-ink/10 bg-red-50 px-4 py-2 text-xs font-medium text-red-600">{uploadError}</p>
      {/if}
      <div class="grid grid-cols-2 gap-3 overflow-y-auto p-4 sm:grid-cols-3 md:grid-cols-4" data-lenis-prevent>
        {#if loadingLibrary}
          <p class="col-span-full py-12 text-center text-sm text-ink/45">Loading {noun}s…</p>
        {:else if !filtered.length}
          <p class="col-span-full py-12 text-center text-sm text-ink/45">No {noun}s found. Use <b>Upload</b> to add one.</p>
        {:else}
          {#each filtered as m (m.id)}
            <button
              type="button"
              class={`group overflow-hidden rounded-xl border text-left transition hover:-translate-y-0.5 ${value === m.file_url ? 'border-goldfinch-gold ring-2 ring-goldfinch-gold/40' : 'border-ink/10 hover:border-forest/40'}`}
              on:click={() => select(m.file_url)}
            >
              {#if isVideo}
                <!-- svelte-ignore a11y-media-has-caption -->
                <video class="aspect-square w-full bg-sand/30 object-cover" src={m.file_url} muted playsinline preload="metadata"></video>
              {:else}
                <img
                  class="aspect-square w-full bg-sand/30 object-cover opacity-0 transition-opacity duration-300"
                  src={imgUrl(m.thumbnail_url || m.file_url, 300)}
                  alt={m.file_name}
                  width="300"
                  height="300"
                  loading="lazy"
                  decoding="async"
                  on:load={(e) => ((e.currentTarget as HTMLImageElement).style.opacity = '1')}
                />
              {/if}
              <span class="block truncate px-2 py-1.5 text-[11px] text-ink/60">{m.file_name}</span>
            </button>
          {/each}
        {/if}
      </div>
    </div>
  </div>
{/if}

<input class="hidden" type="file" accept={isVideo ? 'video/mp4,video/webm,video/quicktime' : 'image/png,image/jpeg,image/webp'} bind:this={fileInput} on:change={onFileChange} />
