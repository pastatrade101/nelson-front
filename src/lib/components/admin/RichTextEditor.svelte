<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import {
    Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code, Braces,
    Heading1, Heading2, Heading3, Pilcrow, List, ListOrdered, Quote, Minus,
    Link as LinkIcon, Image as ImageIcon, AlignLeft, AlignCenter, AlignRight,
    Table as TableIcon, Undo2, Redo2, RemoveFormatting, X, Upload, Search, Trash2, Plus,
    ChevronDown, ExternalLink, Sparkles
  } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import { mountAdminOverlay } from '$lib/admin/overlay';
  import {
    checkLink, cleanUrl, describeCheck, isInternal, loadLinkIndex, splitUrl, withPath,
    type LinkCheck, type LinkIndex, type LinkTarget
  } from '$lib/linkTargets';
  import {
    anchorAdvice, linkBudget, suggestLinks, wordCount,
    type LinkHint, type LinkSuggestion, type LinkType, type TextBlock
  } from '$lib/linkAssist';
  import { imgUrl } from '$lib/img';
  import type { InternalLinkTarget } from '$lib/types';

  type MediaItem = { id: string; file_name: string; file_url: string; thumbnail_url?: string | null };

  export let value = '';
  export let label = 'Content';
  export let placeholder = 'Write your article…';
  export let media: MediaItem[] = [];
  export let uploadFolder = 'blog';
  export let minHeight = '440px';
  export let allowPageHeading = true;
  /** The public page this text is published on, so it is never linked to itself. */
  export let selfPath = '';
  /** Related records worth a link when the text mentions them (the day's lodge, the tour's destination). */
  export let hints: LinkHint[] = [];
  /** Show the SEO link assistant under the editor. */
  export let assistant = true;

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

    // A link chosen from the page picker also remembers WHICH record it points
    // at (content type + id), beside the address visitors follow. The address
    // is what crawlers see; the reference is how the link is found and moved
    // when that page's slug changes, without touching the words it is on.
    const LinkWithRef = Link.extend({
      addAttributes() {
        return {
          ...this.parent?.(),
          'data-link-type': { default: null },
          'data-link-id': { default: null }
        };
      }
    });

    editor = new Editor({
      element,
      extensions: [
        StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
        Underline,
        LinkWithRef.configure({
          openOnClick: false,
          autolink: true,
          linkOnPaste: true,
          protocols: ['http', 'https', 'mailto', 'tel'],
          // No global target/rel. Internal links must stay followed + same-tab so
          // they pass SEO link equity; external links get target/rel per-link on
          // insert (see linkAttrs). Explicit nulls: configure() deep-merges, so
          // `{}` would keep TipTap's own `_blank` + `nofollow` defaults, and a
          // saved internal link would come back with them on the next edit.
          HTMLAttributes: { target: null, rel: null }
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
        scheduleScan();
      },
      onSelectionUpdate: refresh,
      onTransaction: refresh
    });

    internalHTML = value || '';
    ready = true;
    refresh();
    void loadLinkIndex().then((index) => {
      linkIndex = index;
      scanLinks();
    });
  });

  onDestroy(() => {
    clearTimeout(scanTimer);
    clearTimeout(searchTimer);
    searchAbort?.abort();
    editor?.destroy();
  });

  // Push external value changes (e.g. edit-mode load that resolves after mount)
  // into the editor. Guarded by internalHTML so typing never re-triggers this.
  $: if (ready && editor && value !== internalHTML) {
    internalHTML = value;
    editor.commands.setContent(value || '', false);
    refresh();
    scheduleScan();
  }
  // Hints arrive after the form loads its record; re-rank when they do.
  $: if (ready && hints) scheduleScan();

  // ─── command helpers ────────────────────────────────────────────────────
  const chain = () => editor.chain().focus();
  const setParagraph = () => chain().setParagraph().run();
  const toggleHeading = (level: 1 | 2 | 3) => chain().toggleHeading({ level }).run();
  const insertTable = () => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();

  // ─── links: attributes ──────────────────────────────────────────────────
  // Internal (starts with "/") stays followed and same-tab; external opens in a
  // new tab with a safe rel. A picked page adds its stable reference.
  const linkAttrs = (url: string, ref?: { type?: LinkType; id?: string } | null) =>
    /^https?:\/\//i.test(url)
      ? { href: url, target: '_blank', rel: 'noopener noreferrer nofollow', 'data-link-type': null, 'data-link-id': null }
      : { href: url, target: null, rel: null, 'data-link-type': ref?.type ?? null, 'data-link-id': ref?.id ?? null };

  /** The reference a site path implies, from the loaded page index. */
  const refForPath = (url: string): { type?: LinkType; id?: string } | null => {
    if (!linkIndex || !isInternal(url)) return null;
    const target = linkIndex.byPath.get(splitUrl(url).base.replace(/\/+$/, '') || '/');
    return target?.type && target.id ? { type: target.type, id: target.id } : null;
  };

  // ─── link dialog ────────────────────────────────────────────────────────
  // Search-first: an editor highlights words, opens the dialog, types a few
  // letters and picks a published page. Only published pages are offered, so
  // a picked link resolves by construction. The address row stays for external
  // sites; whatever is typed there is cleaned (tracking tags off, our own
  // domain made a site path) and checked against the real public pages.
  let showLink = false;
  let linkUrl = '';
  let linkAnyway = false;
  let linkIndex: LinkIndex | null = null;
  /** The words the link will sit on, or '' when the cursor is between words. */
  let selectionText = '';
  /** The link the cursor is in when the dialog opens, if any. */
  let currentLink: { href: string; type: string | null; id: string | null } | null = null;

  const TYPE_FILTERS: Array<{ value: LinkType | 'all'; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'tours', label: 'Itineraries' },
    { value: 'destinations', label: 'Destinations' },
    { value: 'lodges', label: 'Accommodation' },
    { value: 'tour_categories', label: 'Experiences' },
    { value: 'travel_styles', label: 'Travel styles' },
    { value: 'blog_posts', label: 'Journal' },
    { value: 'comparisons', label: 'Comparisons' },
    { value: 'safari_essentials', label: 'Essentials' }
  ];

  let linkSearch = '';
  let linkFilter: LinkType | 'all' = 'all';
  let searchResults: InternalLinkTarget[] = [];
  let searchTotal = 0;
  let searchPage = 1;
  let searching = false;
  let searchError = '';
  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  let searchAbort: AbortController | undefined;

  const runSearch = async (page = 1) => {
    searchAbort?.abort();
    const controller = new AbortController();
    searchAbort = controller;
    searching = true;
    searchError = '';
    try {
      const res = await api.internalLinks.search(
        { q: linkSearch.trim(), type: linkFilter === 'all' ? undefined : linkFilter, page, limit: 20 },
        controller.signal
      );
      if (controller.signal.aborted) return;
      searchResults = page === 1 ? res.data.items : [...searchResults, ...res.data.items];
      searchTotal = res.data.pagination.total;
      searchPage = page;
    } catch (err) {
      if (controller.signal.aborted) return;
      searchError = err instanceof Error ? err.message : 'Search failed.';
    } finally {
      if (!controller.signal.aborted) searching = false;
    }
  };

  // Debounced: a search per keystroke would race itself and hammer the API.
  const scheduleSearch = () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => void runSearch(1), 250);
  };
  $: if (showLink && (linkSearch !== undefined || linkFilter)) scheduleSearch();

  // Fixed pages (Plan My Trip, Contact…) are not records the API searches, so
  // they come from the page index, matched on the same words.
  $: staticMatches = (() => {
    if (linkFilter !== 'all' || !linkIndex) return [] as LinkTarget[];
    const q = linkSearch.trim().toLowerCase();
    return linkIndex.targets
      .filter((t) => !t.type && (!q || t.label.toLowerCase().includes(q) || t.path.toLowerCase().includes(q)))
      .slice(0, q ? 6 : 4);
  })();

  const openLink = () => {
    if (!editor) return;
    const attrs = editor.getAttributes('link');
    currentLink = attrs.href
      ? { href: attrs.href, type: attrs['data-link-type'] ?? null, id: attrs['data-link-id'] ?? null }
      : null;
    linkUrl = '';
    linkAnyway = false;
    linkSearch = '';
    linkFilter = 'all';
    searchResults = [];
    searchTotal = 0;
    const { from, to } = editor.state.selection;
    selectionText = editor.state.doc.textBetween(from, to, ' ').replace(/\s+/g, ' ').trim();
    showLink = true;
    void loadLinkIndex().then((index) => (linkIndex = index));
  };

  /** What the current link points at, read from the page index. */
  $: currentTarget = (() => {
    if (!currentLink || !linkIndex) return null;
    const byRef = currentLink.type && currentLink.id ? linkIndex.byRef.get(`${currentLink.type}:${currentLink.id}`) : undefined;
    return byRef ?? linkIndex.byPath.get(splitUrl(currentLink.href).base) ?? null;
  })();

  $: cleaned = cleanUrl(linkUrl);
  $: linkCheck = checkLink(cleaned.url, linkIndex) as LinkCheck;
  $: linkBlocked = linkCheck.kind === 'broken' && !linkAnyway;
  $: linkTone =
    linkCheck.kind === 'broken' ? 'text-red-700' : linkCheck.kind === 'ok' || linkCheck.kind === 'redirect' ? 'text-forest' : 'text-ink/50';
  // A new address needs a fresh decision about linking a missing page.
  $: if (linkUrl !== undefined) linkAnyway = false;
  $: selectionAdvice = anchorAdvice(selectionText);

  /** Paths already linked in this text, so the dialog can say "already linked". */
  let linkedPaths = new Set<string>();
  let linkedIds = new Set<string>();

  const pathOfUrl = (url: string) => {
    let path = splitUrl(url).base.replace(/\/{2,}/g, '/');
    if (path.length > 1) path = path.replace(/\/+$/, '');
    return path;
  };
  const isSelf = (path: string) => Boolean(selfPath) && pathOfUrl(path) === selfPath;

  // Apply a link to the selection; with nothing selected, insert `textIfEmpty`
  // as the link's words. Returns false when refused (a page linking to itself).
  const applyHref = (rawUrl: string, textIfEmpty = '', ref?: { type?: LinkType; id?: string } | null): boolean => {
    if (!editor) return false;
    const url = cleanUrl(rawUrl).url.trim();
    if (!url) { chain().extendMarkRange('link').unsetLink().run(); showLink = false; return true; }
    if (isSelf(url)) return false;
    const attrs = linkAttrs(url, ref ?? refForPath(url));
    if (editor.state.selection.empty && textIfEmpty) {
      chain().insertContent({ type: 'text', text: textIfEmpty, marks: [{ type: 'link', attrs }] }).run();
    } else {
      chain().extendMarkRange('link').setLink(attrs).run();
    }
    showLink = false;
    linkSearch = '';
    return true;
  };

  const applyLink = () => {
    if (linkBlocked) return;
    applyHref(cleaned.url, cleaned.url.replace(/^https?:\/\/(www\.)?/i, ''));
  };
  const pickPage = (target: { path: string; title?: string; label?: string; type?: LinkType; id?: string }) =>
    applyHref(target.path, target.title ?? target.label ?? target.path, target.type && target.id ? { type: target.type, id: target.id } : null);
  const useSuggestion = (target: LinkTarget) => (linkUrl = withPath(cleaned.url, target.path));
  const removeLink = () => { chain().extendMarkRange('link').unsetLink().run(); showLink = false; };

  // ─── link health: links already in the text ─────────────────────────────
  // Links typed straight into the text (autolink, paste) or saved before these
  // checks never went through the dialog, so the whole document is checked too.
  // Each problem gets a one-click fix that rewrites that address everywhere here.
  type LinkIssue = { href: string; message: string; fixes: Array<{ label: string; href?: string; unlink?: boolean }> };
  let linkIssues: LinkIssue[] = [];
  let scanTimer: ReturnType<typeof setTimeout> | undefined;
  let linkCount = 0;

  const scheduleScan = () => {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(scanLinks, 400);
  };

  type Mark = { type: { name: string }; attrs: Record<string, string | null | undefined> };
  type Run = { href: string; type: string | null; id: string | null; text: string };

  /** Each link in the document as one run of words (consecutive text nodes with the same href). */
  const linkRuns = (): Run[] => {
    const runs: Run[] = [];
    let last: Run | null = null;
    editor.state.doc.descendants((node: { isText?: boolean; text?: string; marks?: Mark[] }) => {
      const mark = node.isText ? (node.marks ?? []).find((m) => m.type.name === 'link') : undefined;
      if (!mark?.attrs.href) { last = null; return; }
      if (last && last.href === mark.attrs.href) { last.text += node.text ?? ''; return; }
      last = { href: mark.attrs.href, type: mark.attrs['data-link-type'] ?? null, id: mark.attrs['data-link-id'] ?? null, text: node.text ?? '' };
      runs.push(last);
    });
    return runs;
  };

  const scanLinks = () => {
    if (!editor) return;
    const runs = linkRuns();
    linkCount = runs.length;
    const paths = new Set<string>();
    const ids = new Set<string>();
    for (const run of runs) {
      if (isInternal(run.href)) paths.add(pathOfUrl(run.href));
      if (run.id) ids.add(run.id);
    }
    linkedPaths = paths;
    linkedIds = ids;
    refreshSuggestions();
    if (!linkIndex) return;

    const issues: LinkIssue[] = [];
    const seen = new Set<string>();
    const counts = new Map<string, number>();
    for (const run of runs) counts.set(run.href, (counts.get(run.href) ?? 0) + 1);

    for (const run of runs) {
      const advice = anchorAdvice(run.text);
      if (advice) issues.push({ href: run.href, message: advice, fixes: [] });
      if (seen.has(run.href)) continue;
      seen.add(run.href);

      const tidy = cleanUrl(run.href);
      if (isInternal(tidy.url) && isSelf(tidy.url)) {
        issues.push({ href: run.href, message: 'Links to this same page.', fixes: [{ label: 'Remove the link', unlink: true }] });
        continue;
      }
      if ((counts.get(run.href) ?? 0) > 1) {
        issues.push({ href: run.href, message: `Linked ${counts.get(run.href)}× in this text — once is enough.`, fixes: [] });
      }

      // A link that remembers its page is judged by where that page is NOW.
      const ref = run.type && run.id ? linkIndex.byRef.get(`${run.type}:${run.id}`) : undefined;
      if (ref) {
        if (ref.path !== pathOfUrl(tidy.url)) {
          issues.push({ href: run.href, message: `That page moved to ${ref.path}.`, fixes: [{ label: 'Update the address', href: withPath(tidy.url, ref.path) }] });
        }
        continue;
      }
      if (run.type && run.id && linkIndex.verified.size) {
        const stillThere = checkLink(tidy.url, linkIndex);
        issues.push({
          href: run.href,
          message: stillThere.kind === 'ok'
            ? 'The page this link was made for is gone, but another page now lives at this address.'
            : 'The page this link was made for is no longer published — visitors would get a 404.',
          fixes: stillThere.kind === 'broken' ? stillThere.suggestions.map((t) => ({ label: `Use ${t.label}`, href: withPath(tidy.url, t.path) })) : []
        });
        continue;
      }

      const check = checkLink(tidy.url, linkIndex);
      if (check.kind === 'broken') {
        issues.push({
          href: run.href,
          message: tidy.removedTracking.length ? `${check.reason} — and it carries tracking (${tidy.removedTracking.join(', ')})` : check.reason,
          fixes: check.suggestions.map((t) => ({ label: `Use ${t.label}`, href: withPath(tidy.url, t.path) }))
        });
      } else if (tidy.changed && isInternal(tidy.url)) {
        issues.push({ href: run.href, message: tidy.notice || 'Can be tidied', fixes: [{ label: 'Tidy it', href: tidy.url }] });
      } else if (tidy.removedTracking.length) {
        issues.push({ href: run.href, message: `Carries tracking (${tidy.removedTracking.join(', ')})`, fixes: [{ label: 'Remove tracking', href: tidy.url }] });
      }
    }
    linkIssues = issues;
  };

  /** Rewrite every link with `from` to point at `to`, as one undoable change. The words stay. */
  const replaceHref = (from: string, to: string) => {
    if (!editor) return;
    const { state } = editor;
    const linkType = state.schema.marks.link;
    const tr = state.tr;
    state.doc.descendants((node: { isText?: boolean; nodeSize: number; marks: Array<{ type: unknown; attrs: Record<string, unknown> }> }, pos: number) => {
      if (!node.isText) return;
      for (const mark of node.marks) {
        if (mark.type === linkType && mark.attrs.href === from) {
          const ref = { type: mark.attrs['data-link-type'] as LinkType | undefined, id: mark.attrs['data-link-id'] as string | undefined };
          tr.removeMark(pos, pos + node.nodeSize, mark as never);
          tr.addMark(pos, pos + node.nodeSize, linkType.create({ ...mark.attrs, ...linkAttrs(to, ref.type && ref.id ? ref : refForPath(to)) }));
        }
      }
    });
    if (tr.docChanged) editor.view.dispatch(tr);
  };

  /** Remove every link with this address; the words stay as plain text. */
  const unlinkHref = (href: string) => {
    if (!editor) return;
    const { state } = editor;
    const linkType = state.schema.marks.link;
    const tr = state.tr;
    state.doc.descendants((node: { isText?: boolean; nodeSize: number; marks: Array<{ type: unknown; attrs: Record<string, unknown> }> }, pos: number) => {
      if (!node.isText) return;
      for (const mark of node.marks) {
        if (mark.type === linkType && mark.attrs.href === href) tr.removeMark(pos, pos + node.nodeSize, mark as never);
      }
    });
    if (tr.docChanged) editor.view.dispatch(tr);
  };

  // ─── SEO link assistant ─────────────────────────────────────────────────
  // Pages the text already talks about but does not link to yet. Matching is
  // deterministic (see $lib/linkAssist) against the published-page index, so a
  // suggestion is always a real page; the editor still decides.
  let suggestions: LinkSuggestion[] = [];
  let blockStarts: number[] = [];
  let words = 0;
  let assistantOpen = true;

  /** The document as runs of text, with each run's start position and its linked ranges. */
  const textBlocks = (): { blocks: TextBlock[]; starts: number[] } => {
    const blocks: TextBlock[] = [];
    const starts: number[] = [];
    editor.state.doc.descendants((node: { isTextblock?: boolean; forEach: (fn: (child: { isText?: boolean; text?: string; nodeSize: number; marks: Mark[] }) => void) => void }, pos: number) => {
      if (!node.isTextblock) return true;
      let text = '';
      const linked: Array<[number, number]> = [];
      node.forEach((child) => {
        if (child.isText) {
          const start = text.length;
          text += child.text ?? '';
          if (child.marks.some((m) => m.type.name === 'link')) linked.push([start, text.length]);
        } else {
          // An inline atom (a hard break) takes one position and never matches.
          text += '\n'.repeat(child.nodeSize);
        }
      });
      blocks.push({ text, linked });
      starts.push(pos + 1);
      return false;
    });
    return { blocks, starts };
  };

  const refreshSuggestions = () => {
    if (!editor || !assistant) return;
    const { blocks, starts } = textBlocks();
    blockStarts = starts;
    words = wordCount(blocks);
    suggestions = linkIndex
      ? suggestLinks({ blocks, targets: linkIndex.targets, linkedPaths, linkedIds, selfPath, hints, max: 8 })
      : [];
  };

  const insertSuggestion = (sg: LinkSuggestion) => {
    if (!editor) return;
    const from = blockStarts[sg.block] + sg.start;
    const to = blockStarts[sg.block] + sg.end;
    // The text may have changed since the suggestion was computed; only link
    // the words the suggestion was made for.
    if (editor.state.doc.textBetween(from, to, ' ') !== sg.anchor) { scanLinks(); return; }
    const ref = sg.target.type && sg.target.id ? { type: sg.target.type, id: sg.target.id } : null;
    chain().setTextSelection({ from, to }).setLink(linkAttrs(sg.target.path, ref)).run();
    scanLinks();
  };

  $: budget = linkBudget(words);

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
    return mountAdminOverlay(node, () => { showLink = false; showImage = false; });
  };

  const btn = (active: boolean) =>
    `grid h-8 min-w-[2rem] place-items-center px-1.5 text-ink/70 transition hover:bg-sand hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 ${active ? 'bg-forest/12 text-forest' : ''}`;

  const typeLabel = (type?: string | null) => TYPE_FILTERS.find((f) => f.value === type)?.label ?? 'Page';
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
      {#if allowPageHeading}<button type="button" class={btn(s.h1)} on:click={() => toggleHeading(1)} title="Heading 1" aria-label="Heading 1"><Heading1 size={17} /></button>{/if}
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

      <button type="button" class={btn(s.link)} on:click={openLink} title="Link to a page" aria-label="Link to a page"><LinkIcon size={16} /></button>
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

  {#if linkIssues.length}
    <div class="border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs text-amber-950">
      <p class="font-semibold">{linkIssues.length === 1 ? '1 link needs attention' : `${linkIssues.length} links need attention`}</p>
      <ul class="mt-1.5 grid gap-2">
        {#each linkIssues as issue, i (`${issue.href}-${i}`)}
          <li class="grid gap-1">
            <span><span class="break-all font-mono">{issue.href}</span> — {issue.message}</span>
            {#if issue.fixes.length}
              <span class="flex flex-wrap gap-1.5">
                {#each issue.fixes as fix (fix.label + (fix.href ?? ''))}
                  <button
                    type="button"
                    class="border border-amber-400 bg-white px-2 py-0.5 font-semibold text-amber-900 transition hover:bg-amber-100"
                    on:click={() => (fix.unlink ? unlinkHref(issue.href) : fix.href && replaceHref(issue.href, fix.href))}
                  >
                    {fix.label}{#if fix.href} <span class="font-mono font-normal text-amber-900/60">{fix.href}</span>{/if}
                  </button>
                {/each}
              </span>
            {/if}
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  <!-- SEO link assistant -->
  {#if assistant && ready}
    <div class="border border-ink/10 bg-sand/25">
      <button
        type="button"
        class="flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
        aria-expanded={assistantOpen}
        on:click={() => (assistantOpen = !assistantOpen)}
      >
        <span class="inline-flex items-center gap-2 text-xs font-bold text-ink">
          <Sparkles size={14} class="text-forest" /> Link suggestions
          {#if suggestions.length}<span class="rounded-full bg-forest/10 px-2 py-0.5 text-[11px] text-forest">{suggestions.length}</span>{/if}
        </span>
        <span class="inline-flex items-center gap-2 text-[11px] text-ink/50">
          {linkCount} {linkCount === 1 ? 'link' : 'links'} · about {budget} suit{budget === 1 ? 's' : ''} {words} words
          <ChevronDown size={14} class={`transition-transform ${assistantOpen ? 'rotate-180' : ''}`} />
        </span>
      </button>
      {#if assistantOpen}
        <div class="border-t border-ink/10 px-3 py-2.5">
          {#if !linkIndex}
            <p class="text-xs text-ink/45">Loading the site's pages…</p>
          {:else if !suggestions.length}
            <p class="text-xs text-ink/50">
              {words ? 'Every page this text mentions is already linked, or it mentions none yet. Name a destination, property or experience and a suggestion appears here.' : 'Write a little and pages the text mentions will be suggested here.'}
            </p>
          {:else}
            {#if linkCount >= budget}
              <p class="mb-2 text-[11px] text-ink/50">This text already carries {linkCount} links — enough for its length. Add more only where they help a reader.</p>
            {/if}
            <ul class="grid gap-1.5">
              {#each suggestions as sg (sg.target.path)}
                <li class="flex flex-wrap items-center gap-x-3 gap-y-1 border border-ink/10 bg-surface px-3 py-2 text-xs">
                  <span class="min-w-0 flex-1">
                    <span class="font-semibold text-ink">“{sg.anchor}”</span>
                    <span class="text-ink/45"> → </span>
                    <span class="font-semibold text-forest">{sg.target.label}</span>
                    <span class="ml-1 rounded-full bg-sand px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink/50">{typeLabel(sg.target.type)}</span>
                    <span class="block truncate font-mono text-[11px] text-ink/45">{sg.target.path}</span>
                    <span class="block text-[11px] text-ink/55">{sg.reason}</span>
                  </span>
                  <span class="flex shrink-0 items-center gap-1.5">
                    <a class="grid h-7 w-7 place-items-center border border-ink/10 text-ink/50 transition hover:bg-sand" href={sg.target.path} target="_blank" rel="noopener noreferrer" title="Open the page" aria-label="Open the page"><ExternalLink size={12} /></a>
                    <button type="button" class="h-7 border border-forest/30 bg-forest/5 px-2.5 font-bold text-forest transition hover:bg-forest hover:text-white" on:click={() => insertSuggestion(sg)}>Insert link</button>
                  </span>
                </li>
              {/each}
            </ul>
          {/if}
        </div>
      {/if}
    </div>
  {/if}

  <p class="text-xs text-ink/45">Rich text — headings, lists, links, images, tables. Formatting shows exactly as published.</p>
</div>

<!-- link dialog -->
{#if showLink}
  <div use:portal class="fixed inset-0 z-[80] grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="Link to a page">
    <button class="absolute inset-0 cursor-default bg-ink/55 backdrop-blur-sm" type="button" aria-label="Close" on:click={() => (showLink = false)}></button>
    <div class="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden border border-ink/10 bg-surface shadow-2xl">
      <div class="flex items-center justify-between gap-3 border-b border-ink/10 p-4">
        <div class="min-w-0">
          <p class="text-sm font-bold text-ink">{currentLink ? 'Edit link' : 'Link to a page'}</p>
          {#if selectionText}
            <p class="mt-0.5 truncate text-xs text-ink/55">On the words <span class="font-semibold text-ink/80">“{selectionText}”</span></p>
          {:else if !currentLink}
            <p class="mt-0.5 text-xs text-ink/55">Nothing selected — the page's title will be inserted as the link.</p>
          {/if}
        </div>
        <button type="button" class="grid h-8 w-8 shrink-0 place-items-center border border-ink/10 text-ink transition hover:bg-sand" on:click={() => (showLink = false)} aria-label="Close"><X size={16} /></button>
      </div>

      {#if selectionAdvice}
        <p class="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">{selectionAdvice}</p>
      {/if}

      <!-- the link the cursor is in -->
      {#if currentLink}
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-ink/10 bg-sand/30 px-4 py-2.5 text-xs">
          <span class="min-w-0">
            <span class="text-ink/55">Currently links to</span>
            {#if currentTarget}
              <span class="font-semibold text-ink">{currentTarget.label}</span>
              <span class="ml-1 rounded-full bg-sand px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink/50">{typeLabel(currentTarget.type)}</span>
            {/if}
            <span class="block break-all font-mono text-[11px] text-ink/50">{currentLink.href}</span>
            {#if currentLink.id && linkIndex && !currentTarget}
              <span class="block font-semibold text-red-700">That page is no longer published.</span>
            {/if}
          </span>
          <span class="flex shrink-0 items-center gap-1.5">
            {#if isInternal(currentLink.href)}
              <a class="inline-flex h-7 items-center gap-1 border border-ink/10 px-2 font-semibold text-ink/70 transition hover:bg-sand" href={currentLink.href} target="_blank" rel="noopener noreferrer">Open <ExternalLink size={11} /></a>
            {/if}
            <button type="button" class="h-7 border border-red-200 px-2 font-semibold text-red-600 transition hover:bg-red-50" on:click={removeLink}>Remove link</button>
          </span>
        </div>
      {/if}

      <!-- page search -->
      <div class="border-b border-ink/10 px-4 pb-2.5 pt-3">
        <div class="flex items-center gap-2 border border-ink/15 bg-surface px-3 focus-within:border-forest focus-within:ring-2 focus-within:ring-forest/15">
          <Search size={15} class="shrink-0 text-ink/40" />
          <!-- svelte-ignore a11y-autofocus -->
          <input
            class="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink/40"
            placeholder="Search pages — e.g. Serengeti, Tarangire, honeymoon…"
            bind:value={linkSearch}
            autofocus
            on:keydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (searchResults[0]) pickPage(searchResults[0]); } }}
          />
          {#if searching}<span class="text-[11px] text-ink/40">Searching…</span>{/if}
        </div>
        <div class="mt-2 flex flex-wrap gap-1">
          {#each TYPE_FILTERS as f (f.value)}
            <button
              type="button"
              class={`rounded-full border px-2 py-0.5 text-[11px] font-semibold transition ${linkFilter === f.value ? 'border-forest bg-forest text-white' : 'border-ink/15 text-ink/60 hover:bg-sand'}`}
              on:click={() => (linkFilter = f.value)}
            >{f.label}</button>
          {/each}
        </div>
      </div>

      <!-- results -->
      <div class="min-h-[10rem] flex-1 overflow-y-auto p-2" data-lenis-prevent>
        {#if searchError}
          <div class="px-2 py-8 text-center text-sm">
            <p class="text-red-700">{searchError}</p>
            <button type="button" class="mt-2 border border-ink/15 px-3 py-1 text-xs font-semibold text-ink transition hover:bg-sand" on:click={() => runSearch(1)}>Try again</button>
          </div>
        {:else if searching && !searchResults.length}
          <p class="py-10 text-center text-sm text-ink/45">Searching pages…</p>
        {:else if !searchResults.length && !staticMatches.length}
          <p class="py-10 text-center text-sm text-ink/45">No published page matches “{linkSearch.trim()}”. Only published pages can be linked.</p>
        {:else}
          {#each searchResults as it (`${it.type}:${it.id}`)}
            {@const already = linkedIds.has(it.id) || linkedPaths.has(it.path)}
            {@const self = isSelf(it.path)}
            <button
              type="button"
              class="flex w-full items-start justify-between gap-3 px-2 py-2 text-left transition hover:bg-sand disabled:cursor-not-allowed disabled:opacity-50"
              disabled={self}
              title={self ? 'This is the page being edited' : ''}
              on:click={() => pickPage(it)}
            >
              <span class="min-w-0">
                <span class="block truncate text-sm text-ink/85">{it.title}</span>
                <span class="block truncate font-mono text-[11px] text-ink/40">{it.path}</span>
              </span>
              <span class="flex shrink-0 flex-col items-end gap-0.5">
                <span class="rounded-full bg-sand px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink/50">{it.label}</span>
                {#if self}<span class="text-[10px] font-semibold text-red-700">This page</span>
                {:else if already}<span class="text-[10px] font-semibold text-amber-700">Already linked here</span>{/if}
              </span>
            </button>
          {/each}
          {#if searchResults.length < searchTotal}
            <button type="button" class="mt-1 w-full border border-ink/10 py-1.5 text-xs font-semibold text-ink/70 transition hover:bg-sand" disabled={searching} on:click={() => runSearch(searchPage + 1)}>
              {searching ? 'Loading…' : `Show more (${searchTotal - searchResults.length} more)`}
            </button>
          {/if}
          {#if staticMatches.length}
            <p class="px-2 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wide text-forest/70">Site pages</p>
            {#each staticMatches as it (it.path)}
              <button type="button" class="flex w-full items-center justify-between gap-3 px-2 py-1.5 text-left transition hover:bg-sand disabled:opacity-50" disabled={isSelf(it.path)} on:click={() => pickPage(it)}>
                <span class="truncate text-sm text-ink/85">{it.label}</span>
                <span class="shrink-0 font-mono text-[11px] text-ink/40">{it.path}</span>
              </button>
            {/each}
          {/if}
        {/if}
      </div>

      <!-- any other address -->
      <details class="border-t border-ink/10">
        <summary class="cursor-pointer list-none px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-ink/50 hover:bg-sand/50">Link to another website or type an address</summary>
        <div class="px-4 pb-4">
          <div class="flex items-center gap-2">
            <input
              class="min-w-0 flex-1 border border-ink/15 bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-forest focus:ring-2 focus:ring-forest/15"
              placeholder="https://example.com  ·  or  /tours/serengeti-migration"
              bind:value={linkUrl}
              on:keydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyLink(); } }}
            />
            <button type="button" class="shrink-0 bg-forest px-3 py-2 text-xs font-bold text-white transition hover:bg-deep-green disabled:opacity-40" disabled={!linkUrl.trim() || linkBlocked || isSelf(cleaned.url)} on:click={applyLink}>Apply</button>
          </div>
          {#if linkUrl.trim()}
            <div class="mt-2 grid gap-1.5 text-[12px]">
              {#if cleaned.changed}
                <p class="text-ink/55">Will save as <span class="break-all font-mono text-ink/80">{cleaned.url}</span>{#if cleaned.notice} · {cleaned.notice}{/if}</p>
              {/if}
              {#if isSelf(cleaned.url)}
                <p class="font-semibold text-red-700">✗ That is this page — a page should not link to itself.</p>
              {:else}
                <p class={`font-semibold ${linkTone}`}>{linkCheck.kind === 'ok' ? '✓ ' : linkCheck.kind === 'broken' ? '✗ ' : ''}{describeCheck(linkCheck)}</p>
              {/if}
              {#if linkCheck.kind === 'broken'}
                {#if linkCheck.suggestions.length}
                  <div class="flex flex-wrap items-center gap-1.5">
                    <span class="text-ink/55">Did you mean:</span>
                    {#each linkCheck.suggestions as sug (sug.path)}
                      <button type="button" class="border border-forest/30 px-2 py-0.5 font-semibold text-forest transition hover:bg-forest/10" on:click={() => useSuggestion(sug)}>{sug.label}</button>
                    {/each}
                  </div>
                {/if}
                <label class="inline-flex items-center gap-2 text-ink/60">
                  <input type="checkbox" class="h-3.5 w-3.5 accent-forest" bind:checked={linkAnyway} /> Link anyway (the page will be published later)
                </label>
              {/if}
            </div>
          {/if}
          <p class="mt-2 text-[11px] text-ink/45">Site links (starting with “/”) stay follow + same-tab for SEO. Other websites open in a new tab.</p>
        </div>
      </details>
    </div>
  </div>
{/if}

<!-- image modal -->
{#if showImage}
  <div use:portal class="fixed inset-0 z-[80] grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="Insert image">
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
              <div class="relative aspect-square w-full overflow-hidden bg-sand/30">
                <img class="absolute inset-0 h-full w-full object-cover" src={imgUrl(m.thumbnail_url || m.file_url, 300)} alt={m.file_name} loading="lazy" decoding="async" />
              </div>
              <span class="block truncate px-2 py-1.5 text-[11px] text-ink/60">{m.file_name}</span>
            </button>
          {/each}
        {/if}
      </div>
    </div>
  </div>
{/if}

<input class="hidden" type="file" accept="image/png,image/jpeg,image/webp,image/gif" bind:this={fileInput} on:change={onImageFile} />
