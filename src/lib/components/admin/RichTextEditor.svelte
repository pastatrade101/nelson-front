<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import {
    Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code, Braces,
    Heading1, Heading2, Heading3, Pilcrow, List, ListOrdered, Quote, Minus,
    Link as LinkIcon, Unlink, Image as ImageIcon, AlignLeft, AlignCenter, AlignRight,
    Table as TableIcon, Undo2, Redo2, RemoveFormatting, X, Upload, Search, Trash2, Plus
  } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import { imgUrl } from '$lib/img';

  type MediaItem = { id: string; file_name: string; file_url: string; thumbnail_url?: string | null };

  export let value = '';
  export let label = 'Content';
  export let placeholder = 'Write your article…';
  export let media: MediaItem[] = [];
  export let uploadFolder = 'blog';
  export let minHeight = '440px';

  const dispatch = createEventDispatcher<{ change: string }>();

  let element: HTMLDivElement; // TipTap mounts the editable surface here
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let editor: any = null;
  let internalHTML = ''; // last HTML synced to/from the editor (loop guard)
  let ready = false;

  // Reactive snapshot of the editor state, rebuilt on every transaction so the
  // toolbar can highlight active formatting and enable/disable undo-redo.
  let s = {
    bold: false, italic: false, underline: false, strike: false, code: false,
    h1: false, h2: false, h3: false, paragraph: true,
    bulletList: false, orderedList: false, blockquote: false, codeBlock: false,
    left: false, center: false, right: false,
    link: false, inTable: false, canUndo: false, canRedo: false
  };

  const refresh = () => {
    if (!editor) return;
    s = {
      bold: editor.isActive('bold'),
      italic: editor.isActive('italic'),
      underline: editor.isActive('underline'),
      strike: editor.isActive('strike'),
      code: editor.isActive('code'),
      h1: editor.isActive('heading', { level: 1 }),
      h2: editor.isActive('heading', { level: 2 }),
      h3: editor.isActive('heading', { level: 3 }),
      paragraph: editor.isActive('paragraph'),
      bulletList: editor.isActive('bulletList'),
      orderedList: editor.isActive('orderedList'),
      blockquote: editor.isActive('blockquote'),
      codeBlock: editor.isActive('codeBlock'),
      left: editor.isActive({ textAlign: 'left' }),
      center: editor.isActive({ textAlign: 'center' }),
      right: editor.isActive({ textAlign: 'right' }),
      link: editor.isActive('link'),
      inTable: editor.isActive('table'),
      canUndo: editor.can().undo(),
      canRedo: editor.can().redo()
    };
  };

  onMount(async () => {
    // Dynamic import keeps TipTap out of the SSR bundle (admin routes render on
    // the server, and ProseMirror touches the DOM).
    const [
      { Editor },
      { default: StarterKit },
      { default: Underline },
      { default: Link },
      { default: Image },
      { default: TextAlign },
      { default: Placeholder },
      { default: Table },
      { default: TableRow },
      { default: TableHeader },
      { default: TableCell }
    ] = await Promise.all([
      import('@tiptap/core'),
      import('@tiptap/starter-kit'),
      import('@tiptap/extension-underline'),
      import('@tiptap/extension-link'),
      import('@tiptap/extension-image'),
      import('@tiptap/extension-text-align'),
      import('@tiptap/extension-placeholder'),
      import('@tiptap/extension-table'),
      import('@tiptap/extension-table-row'),
      import('@tiptap/extension-table-header'),
      import('@tiptap/extension-table-cell')
    ]);

    editor = new Editor({
      element,
      extensions: [
        StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
        Underline,
        Link.configure({
          openOnClick: false,
          autolink: true,
          linkOnPaste: true,
          protocols: ['http', 'https', 'mailto', 'tel'],
          // No global target/rel. Internal links must stay followed + same-tab so
          // they pass SEO link equity; external links get target/rel per-link on
          // insert (see applyHref).
          HTMLAttributes: {}
        }),
        Image.configure({ inline: false, HTMLAttributes: { class: 'rich-img' } }),
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        Placeholder.configure({ placeholder }),
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell
      ],
      content: value || '',
      editorProps: { attributes: { class: 'rich-content pm-editor', spellcheck: 'true' } },
      onUpdate: () => {
        internalHTML = editor.getHTML();
        value = internalHTML;
        dispatch('change', value);
        refresh();
      },
      onSelectionUpdate: refresh,
      onTransaction: refresh
    });

    internalHTML = value || '';
    ready = true;
    refresh();
  });

  onDestroy(() => editor?.destroy());

  // Push external value changes (e.g. edit-mode load that resolves after mount)
  // into the editor. Guarded by internalHTML so typing never re-triggers this.
  $: if (ready && editor && value !== internalHTML) {
    internalHTML = value;
    editor.commands.setContent(value || '', false);
    refresh();
  }

  // ─── command helpers ────────────────────────────────────────────────────
  const chain = () => editor.chain().focus();
  const setParagraph = () => chain().setParagraph().run();
  const toggleHeading = (level: 1 | 2 | 3) => chain().toggleHeading({ level }).run();
  const insertTable = () => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();

  // ─── link modal (with internal-page picker for SEO) ─────────────────────
  type LinkTarget = { label: string; path: string; group: string };
  let showLink = false;
  let linkUrl = '';
  let linkSearch = '';
  let internalPages: LinkTarget[] = [];
  let internalLoading = false;
  let internalLoaded = false;

  const STATIC_PAGES: LinkTarget[] = [
    { label: 'Plan My Trip', path: '/plan-my-trip', group: 'Key pages' },
    { label: 'Contact', path: '/contact', group: 'Key pages' },
    { label: 'All safaris', path: '/tours', group: 'Key pages' },
    { label: 'All destinations', path: '/destinations', group: 'Key pages' },
    { label: 'Journal', path: '/blog', group: 'Key pages' },
    { label: 'About', path: '/about', group: 'Key pages' },
    { label: 'Gallery', path: '/gallery', group: 'Key pages' }
  ];

  // Fetch every internal page that has a public URL + slug, so writers can link
  // straight to itineraries/destinations/journal for internal-linking SEO.
  const loadInternalPages = async () => {
    if (internalLoaded || internalLoading) return;
    internalLoading = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pick = (r: PromiseSettledResult<any>, prefix: string, group: string): LinkTarget[] =>
      r.status === 'fulfilled'
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ((r.value?.data?.items ?? []) as any[])
            .filter((it) => it && it.slug)
            .map((it) => ({ label: String(it.title ?? it.name ?? it.slug), path: `${prefix}/${it.slug}`, group }))
        : [];
    try {
      const [tours, dests, styles, comps, posts] = await Promise.allSettled([
        api.tours.list({ status: 'published', limit: 200 }),
        api.destinations.list({ status: 'published', limit: 200 }),
        api.travelStyles.list({ limit: 200 }),
        api.comparisons.list({ limit: 200 }),
        api.blog.list({ status: 'published', limit: 200 })
      ]);
      internalPages = [
        ...pick(tours, '/tours', 'Itineraries'),
        ...pick(dests, '/destinations', 'Destinations'),
        ...pick(styles, '/travel-styles', 'Travel styles'),
        ...pick(comps, '/compare', 'Comparisons'),
        ...pick(posts, '/blog', 'Journal')
      ];
    } finally {
      internalPages = [...internalPages, ...STATIC_PAGES];
      internalLoaded = true;
      internalLoading = false;
    }
  };

  const openLink = () => {
    if (!editor) return;
    linkUrl = editor.getAttributes('link').href ?? '';
    linkSearch = '';
    showLink = true;
    void loadInternalPages();
  };

  // Apply a link: internal (starts with "/") stays clean; external opens in a
  // new tab with safe rel. When nothing is selected, inserts the text as a link.
  const applyHref = (rawUrl: string, textIfEmpty = '') => {
    if (!editor) return;
    const url = rawUrl.trim();
    if (!url) { chain().extendMarkRange('link').unsetLink().run(); showLink = false; return; }
    const external = /^https?:\/\//i.test(url);
    const attrs = external
      ? { href: url, target: '_blank', rel: 'noopener noreferrer nofollow' }
      : { href: url, target: null, rel: null };
    if (editor.state.selection.empty && textIfEmpty) {
      chain().insertContent({ type: 'text', text: textIfEmpty, marks: [{ type: 'link', attrs }] }).run();
    } else {
      chain().extendMarkRange('link').setLink(attrs).run();
    }
    showLink = false;
    linkSearch = '';
  };

  const applyLink = () => applyHref(linkUrl, linkUrl.replace(/^https?:\/\/(www\.)?/i, ''));
  const removeLink = () => { chain().extendMarkRange('link').unsetLink().run(); showLink = false; };

  // Group filtered internal pages for the picker list.
  $: linkResults = (() => {
    const q = linkSearch.trim().toLowerCase();
    const items = q
      ? internalPages.filter((p) => p.label.toLowerCase().includes(q) || p.path.toLowerCase().includes(q))
      : internalPages;
    const groups: Array<{ group: string; items: LinkTarget[] }> = [];
    for (const it of items.slice(0, 100)) {
      let g = groups.find((x) => x.group === it.group);
      if (!g) { g = { group: it.group, items: [] }; groups.push(g); }
      g.items.push(it);
    }
    return groups;
  })();

  // ─── image modal ────────────────────────────────────────────────────────
  let showImage = false;
  let imgSrc = '';
  let imgAlt = '';
  let imgSearch = '';
  let uploading = false;
  let uploadError = '';
  let fileInput: HTMLInputElement;
  $: filteredMedia = imgSearch.trim()
    ? media.filter((m) => m.file_name.toLowerCase().includes(imgSearch.trim().toLowerCase()))
    : media;

  const insertImage = (src: string, alt = '') => {
    const url = src.trim();
    if (!url) return;
    chain().setImage({ src: url, alt }).run();
    showImage = false;
    imgSrc = '';
    imgAlt = '';
    imgSearch = '';
  };

  const onImageFile = async (event: Event) => {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    uploading = true;
    uploadError = '';
    try {
      const res = await api.upload.image(file, uploadFolder);
      insertImage((res.data as { url: string }).url, file.name);
    } catch (err) {
      uploadError = err instanceof Error ? err.message : 'Upload failed.';
    } finally {
      uploading = false;
      if (fileInput) fileInput.value = '';
    }
  };

  // Render modals on <body> so the transformed admin shell can't clip fixed
  // positioning, and so their inputs live outside the parent <form>.
  const portal = (node: HTMLElement) => {
    document.body.appendChild(node);
    return { destroy: () => node.remove() };
  };

  const btn = (active: boolean) =>
    `grid h-8 min-w-[2rem] place-items-center px-1.5 text-ink/70 transition hover:bg-sand hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 ${active ? 'bg-forest/12 text-forest' : ''}`;
</script>

<div class="grid gap-2">
  <span class="text-sm font-medium text-ink">{label}</span>

  <div class="overflow-hidden border border-ink/12 bg-surface focus-within:border-forest focus-within:ring-2 focus-within:ring-forest/15">
    <!-- toolbar -->
    <div class="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b border-ink/10 bg-surface/95 px-2 py-1.5 backdrop-blur">
      <button type="button" class={btn(false)} disabled={!s.canUndo} on:click={() => chain().undo().run()} title="Undo" aria-label="Undo"><Undo2 size={16} /></button>
      <button type="button" class={btn(false)} disabled={!s.canRedo} on:click={() => chain().redo().run()} title="Redo" aria-label="Redo"><Redo2 size={16} /></button>

      <span class="mx-1 h-5 w-px bg-ink/10"></span>

      <button type="button" class={btn(s.paragraph && !s.h1 && !s.h2 && !s.h3)} on:click={setParagraph} title="Paragraph" aria-label="Paragraph"><Pilcrow size={16} /></button>
      <button type="button" class={btn(s.h1)} on:click={() => toggleHeading(1)} title="Heading 1" aria-label="Heading 1"><Heading1 size={17} /></button>
      <button type="button" class={btn(s.h2)} on:click={() => toggleHeading(2)} title="Heading 2" aria-label="Heading 2"><Heading2 size={17} /></button>
      <button type="button" class={btn(s.h3)} on:click={() => toggleHeading(3)} title="Heading 3" aria-label="Heading 3"><Heading3 size={17} /></button>

      <span class="mx-1 h-5 w-px bg-ink/10"></span>

      <button type="button" class={btn(s.bold)} on:click={() => chain().toggleBold().run()} title="Bold" aria-label="Bold"><Bold size={16} /></button>
      <button type="button" class={btn(s.italic)} on:click={() => chain().toggleItalic().run()} title="Italic" aria-label="Italic"><Italic size={16} /></button>
      <button type="button" class={btn(s.underline)} on:click={() => chain().toggleUnderline().run()} title="Underline" aria-label="Underline"><UnderlineIcon size={16} /></button>
      <button type="button" class={btn(s.strike)} on:click={() => chain().toggleStrike().run()} title="Strikethrough" aria-label="Strikethrough"><Strikethrough size={16} /></button>
      <button type="button" class={btn(s.code)} on:click={() => chain().toggleCode().run()} title="Inline code" aria-label="Inline code"><Code size={16} /></button>

      <span class="mx-1 h-5 w-px bg-ink/10"></span>

      <button type="button" class={btn(s.bulletList)} on:click={() => chain().toggleBulletList().run()} title="Bullet list" aria-label="Bullet list"><List size={16} /></button>
      <button type="button" class={btn(s.orderedList)} on:click={() => chain().toggleOrderedList().run()} title="Numbered list" aria-label="Numbered list"><ListOrdered size={16} /></button>
      <button type="button" class={btn(s.blockquote)} on:click={() => chain().toggleBlockquote().run()} title="Quote" aria-label="Quote"><Quote size={16} /></button>
      <button type="button" class={btn(s.codeBlock)} on:click={() => chain().toggleCodeBlock().run()} title="Code block" aria-label="Code block"><Braces size={16} /></button>
      <button type="button" class={btn(false)} on:click={() => chain().setHorizontalRule().run()} title="Divider" aria-label="Divider"><Minus size={16} /></button>

      <span class="mx-1 h-5 w-px bg-ink/10"></span>

      <button type="button" class={btn(s.left)} on:click={() => chain().setTextAlign('left').run()} title="Align left" aria-label="Align left"><AlignLeft size={16} /></button>
      <button type="button" class={btn(s.center)} on:click={() => chain().setTextAlign('center').run()} title="Align center" aria-label="Align center"><AlignCenter size={16} /></button>
      <button type="button" class={btn(s.right)} on:click={() => chain().setTextAlign('right').run()} title="Align right" aria-label="Align right"><AlignRight size={16} /></button>

      <span class="mx-1 h-5 w-px bg-ink/10"></span>

      <button type="button" class={btn(s.link)} on:click={openLink} title="Link" aria-label="Link"><LinkIcon size={16} /></button>
      <button type="button" class={btn(false)} on:click={() => (showImage = true)} title="Insert image" aria-label="Insert image"><ImageIcon size={16} /></button>
      <button type="button" class={btn(s.inTable)} on:click={insertTable} title="Insert table" aria-label="Insert table"><TableIcon size={16} /></button>
      <button type="button" class={btn(false)} on:click={() => chain().unsetAllMarks().clearNodes().run()} title="Clear formatting" aria-label="Clear formatting"><RemoveFormatting size={16} /></button>
    </div>

    <!-- contextual table controls -->
    {#if s.inTable}
      <div class="flex flex-wrap items-center gap-1.5 border-b border-ink/10 bg-sand/40 px-3 py-1.5 text-xs">
        <span class="font-semibold text-ink/50">Table:</span>
        <button type="button" class="inline-flex items-center gap-1 border border-ink/12 bg-surface px-2 py-1 font-medium text-ink/70 transition hover:bg-sand" on:click={() => chain().addColumnAfter().run()}><Plus size={12} /> Col</button>
        <button type="button" class="inline-flex items-center gap-1 border border-ink/12 bg-surface px-2 py-1 font-medium text-ink/70 transition hover:bg-sand" on:click={() => chain().addRowAfter().run()}><Plus size={12} /> Row</button>
        <button type="button" class="inline-flex items-center gap-1 border border-ink/12 bg-surface px-2 py-1 font-medium text-ink/70 transition hover:bg-sand" on:click={() => chain().toggleHeaderRow().run()}>Header row</button>
        <button type="button" class="inline-flex items-center gap-1 border border-ink/12 bg-surface px-2 py-1 font-medium text-ink/70 transition hover:bg-sand" on:click={() => chain().deleteColumn().run()}>Del col</button>
        <button type="button" class="inline-flex items-center gap-1 border border-ink/12 bg-surface px-2 py-1 font-medium text-ink/70 transition hover:bg-sand" on:click={() => chain().deleteRow().run()}>Del row</button>
        <button type="button" class="inline-flex items-center gap-1 border border-red-200 bg-surface px-2 py-1 font-medium text-red-600 transition hover:bg-red-50" on:click={() => chain().deleteTable().run()}><Trash2 size={12} /> Delete table</button>
      </div>
    {/if}

    <!-- editable surface -->
    <div bind:this={element} style={`min-height:${minHeight}`} class="max-h-[70vh] overflow-y-auto"></div>

    {#if !ready}
      <p class="px-4 py-3 text-sm text-ink/40">Loading editor…</p>
    {/if}
  </div>
  <p class="text-xs text-ink/45">Rich text — headings, lists, links, images, tables. Formatting shows exactly as published.</p>
</div>

<!-- link modal -->
{#if showLink}
  <div use:portal class="fixed inset-0 z-[80] grid place-items-center p-4" role="dialog" aria-modal="true">
    <button class="absolute inset-0 cursor-default bg-ink/55 backdrop-blur-sm" type="button" aria-label="Close" on:click={() => (showLink = false)}></button>
    <div class="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden border border-ink/10 bg-surface shadow-2xl">
      <div class="flex items-center justify-between border-b border-ink/10 p-4">
        <p class="text-sm font-bold text-ink">Insert link</p>
        <button type="button" class="grid h-8 w-8 place-items-center border border-ink/10 text-ink transition hover:bg-sand" on:click={() => (showLink = false)} aria-label="Close"><X size={16} /></button>
      </div>

      <!-- URL row (external or manual) -->
      <div class="border-b border-ink/10 p-4">
        <span class="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-ink/50">Link URL</span>
        <div class="flex items-center gap-2">
          <!-- svelte-ignore a11y-autofocus -->
          <input
            class="min-w-0 flex-1 border border-ink/15 bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-forest focus:ring-2 focus:ring-forest/15"
            placeholder="https://example.com  ·  or  /tours/serengeti-migration"
            bind:value={linkUrl}
            autofocus
            on:keydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyLink(); } }}
          />
          <button type="button" class="shrink-0 bg-forest px-3 py-2 text-xs font-bold text-white transition hover:bg-deep-green disabled:opacity-40" disabled={!linkUrl.trim()} on:click={applyLink}>Apply</button>
        </div>
        <div class="mt-2 flex items-center justify-between gap-3 text-[11px]">
          <span class="text-ink/45">Site links (starting with “/”) stay follow + same-tab for SEO.</span>
          <button type="button" class="shrink-0 font-semibold text-red-600 transition hover:underline" on:click={removeLink}>Remove link</button>
        </div>
      </div>

      <!-- internal page search -->
      <div class="flex items-center gap-2 border-b border-ink/10 px-4 py-2.5">
        <LinkIcon size={15} class="text-ink/40" />
        <input class="h-8 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink/40" placeholder="Search itineraries, destinations, journal…" bind:value={linkSearch} />
      </div>

      <!-- results -->
      <div class="min-h-[8rem] overflow-y-auto p-2" data-lenis-prevent>
        {#if internalLoading && !internalPages.length}
          <p class="py-10 text-center text-sm text-ink/45">Loading pages…</p>
        {:else if !linkResults.length}
          <p class="py-10 text-center text-sm text-ink/45">No matching pages.</p>
        {:else}
          {#each linkResults as grp (grp.group)}
            <p class="px-2 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wide text-forest/70">{grp.group}</p>
            {#each grp.items as it (it.path)}
              <button type="button" class="flex w-full items-center justify-between gap-3 px-2 py-1.5 text-left transition hover:bg-sand" on:click={() => applyHref(it.path, it.label)}>
                <span class="truncate text-sm text-ink/85">{it.label}</span>
                <span class="shrink-0 font-mono text-[11px] text-ink/40">{it.path}</span>
              </button>
            {/each}
          {/each}
        {/if}
      </div>
    </div>
  </div>
{/if}

<!-- image modal -->
{#if showImage}
  <div use:portal class="fixed inset-0 z-[80] grid place-items-center p-4" role="dialog" aria-modal="true">
    <button class="absolute inset-0 cursor-default bg-ink/55 backdrop-blur-sm" type="button" aria-label="Close" on:click={() => (showImage = false)}></button>
    <div class="relative flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden border border-ink/10 bg-surface shadow-2xl">
      <div class="flex items-center gap-3 border-b border-ink/10 p-4">
        <p class="hidden text-sm font-bold text-ink sm:block">Insert image</p>
        <div class="flex flex-1 items-center gap-2 border border-ink/12 bg-sand/20 px-3">
          <Search size={16} class="text-ink/40" />
          <input class="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink/40" placeholder="Search library…" bind:value={imgSearch} />
        </div>
        <button type="button" class="inline-flex h-9 shrink-0 items-center gap-1.5 bg-forest px-3 text-xs font-bold text-white transition hover:bg-deep-green disabled:opacity-60" on:click={() => fileInput.click()} disabled={uploading}>
          <Upload size={14} /> {uploading ? 'Uploading…' : 'Upload'}
        </button>
        <button type="button" class="grid h-9 w-9 shrink-0 place-items-center border border-ink/10 text-ink transition hover:bg-sand" on:click={() => (showImage = false)} aria-label="Close"><X size={18} /></button>
      </div>

      {#if uploadError}
        <p class="border-b border-ink/10 bg-red-50 px-4 py-2 text-xs font-medium text-red-600">{uploadError}</p>
      {/if}

      <div class="flex items-center gap-2 border-b border-ink/10 px-4 py-2.5">
        <input
          class="min-w-0 flex-1 border border-ink/15 bg-surface px-3 py-1.5 text-sm text-ink outline-none focus:border-forest focus:ring-2 focus:ring-forest/15"
          placeholder="…or paste an image URL"
          bind:value={imgSrc}
          on:keydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); insertImage(imgSrc, imgAlt); } }}
        />
        <button type="button" class="shrink-0 bg-forest px-3 py-1.5 text-xs font-bold text-white transition hover:bg-deep-green disabled:opacity-40" disabled={!imgSrc.trim()} on:click={() => insertImage(imgSrc, imgAlt)}>Insert URL</button>
      </div>

      <div class="grid grid-cols-2 gap-3 overflow-y-auto p-4 sm:grid-cols-3 md:grid-cols-4" data-lenis-prevent>
        {#if !filteredMedia.length}
          <p class="col-span-full py-12 text-center text-sm text-ink/45">No images found. Use <b>Upload</b> or paste a URL.</p>
        {:else}
          {#each filteredMedia as m (m.id)}
            <button type="button" class="group overflow-hidden border border-ink/10 text-left transition hover:-translate-y-0.5 hover:border-forest/40" on:click={() => insertImage(m.file_url, m.file_name)}>
              <img class="aspect-square w-full bg-sand/30 object-cover" src={imgUrl(m.thumbnail_url || m.file_url, 300)} alt={m.file_name} width="300" height="300" loading="lazy" decoding="async" />
              <span class="block truncate px-2 py-1.5 text-[11px] text-ink/60">{m.file_name}</span>
            </button>
          {/each}
        {/if}
      </div>
    </div>
  </div>
{/if}

<input class="hidden" type="file" accept="image/png,image/jpeg,image/webp,image/gif" bind:this={fileInput} on:change={onImageFile} />
