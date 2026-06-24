<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Image as ImageIcon, Link as LinkIcon, Search, Trash2, X } from '@lucide/svelte';
  import { imgUrl } from '$lib/img';

  type MediaItem = { id: string; file_name: string; file_url: string };

  export let value = '';
  export let label = 'Image';
  export let media: MediaItem[] = [];
  export let aspect = 'aspect-[16/9]';

  const dispatch = createEventDispatcher<{ change: string }>();

  let open = false; // library modal
  let urlMode = false; // paste-url input
  let search = '';

  $: filtered = search.trim()
    ? media.filter((m) => m.file_name.toLowerCase().includes(search.trim().toLowerCase()))
    : media;

  const select = (url: string) => { value = url; open = false; dispatch('change', url); };
  const clear = () => { value = ''; urlMode = false; dispatch('change', ''); };

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
      <img class={`w-full object-cover ${aspect}`} src={value} alt={label} />
      <button type="button" class="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-ink/60 text-white backdrop-blur transition hover:bg-ink/80" on:click={clear} aria-label="Remove image">
        <Trash2 size={15} />
      </button>
    </div>
  {:else}
    <div class={`grid place-items-center rounded-xl border border-dashed border-ink/20 bg-sand/20 text-ink/35 ${aspect}`}>
      <ImageIcon size={26} />
    </div>
  {/if}

  <div class="flex flex-wrap gap-2">
    <button type="button" class="inline-flex items-center gap-1.5 rounded-lg bg-forest px-3 py-1.5 text-xs font-bold text-white transition hover:bg-deep-green" on:click={() => (open = true)}>
      <ImageIcon size={14} /> {value ? 'Change' : 'Choose from library'}
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
        <p class="text-sm font-bold text-ink">Media Library</p>
        <div class="flex flex-1 items-center gap-2 rounded-lg border border-ink/12 bg-sand/20 px-3">
          <Search size={16} class="text-ink/40" />
          <input class="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink/40" placeholder="Search images…" bind:value={search} />
        </div>
        <button type="button" class="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-ink/10 text-ink transition hover:bg-sand" on:click={() => (open = false)} aria-label="Close"><X size={18} /></button>
      </div>
      <div class="grid grid-cols-2 gap-3 overflow-y-auto p-4 sm:grid-cols-3 md:grid-cols-4" data-lenis-prevent>
        {#if !filtered.length}
          <p class="col-span-full py-12 text-center text-sm text-ink/45">No images found.</p>
        {:else}
          {#each filtered as m (m.id)}
            <button
              type="button"
              class={`group overflow-hidden rounded-xl border text-left transition hover:-translate-y-0.5 ${value === m.file_url ? 'border-goldfinch-gold ring-2 ring-goldfinch-gold/40' : 'border-ink/10 hover:border-forest/40'}`}
              on:click={() => select(m.file_url)}
            >
              <img class="aspect-square w-full bg-sand/30 object-cover" src={imgUrl(m.file_url, 300)} alt={m.file_name} loading="lazy" decoding="async" />
              <span class="block truncate px-2 py-1.5 text-[11px] text-ink/60">{m.file_name}</span>
            </button>
          {/each}
        {/if}
      </div>
    </div>
  </div>
{/if}
