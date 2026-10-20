<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, scale, slide } from 'svelte/transition';
  import { ChevronDown, CircleHelp, Edit, ExternalLink, Plus, Search, Trash2, X } from '@lucide/svelte';
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
  import {
    FAQ_ANSWER_MAX,
    FAQ_ENTITY_TYPES,
    FAQ_QUESTION_MAX,
    faqEntityHref,
    faqEntityLabel,
    loadFaqEntityRecords,
    readAllPages
  } from '$lib/faqEntities';
  import type { FaqEntityType } from '$lib/types';

  type Faq = {
    answer: string;
    category?: string | null;
    created_at?: string;
    entity?: { id: string; label: string; slug: string | null; type: FaqEntityType } | null;
    entity_id?: string | null;
    entity_type?: FaqEntityType | null;
    id: string;
    question: string;
    sort_order: number;
    status: 'archived' | 'draft' | 'published';
    updated_at?: string;
  };

  type Option = { label: string; value: string };
  type Toast = { id: string; message: string; type: 'error' | 'success' };

  const recommendedCategories = [
    'Safari',
    'Kilimanjaro',
    'Zanzibar',
    'Family Travel',
    'Safety',
    'Payments',
    'Booking',
    'Visas',
    'Health',
    'General'
  ];

  const statusOptions: Option[] = [
    { label: 'Draft', value: 'draft' },
    { label: 'Published', value: 'published' },
    { label: 'Archived', value: 'archived' }
  ];

  // An FAQ either belongs to one record or is general. "General" is the default
  // and behaves exactly as every unattached FAQ did before attachments existed.
  const entityTypeFormOptions: Option[] = [
    { label: 'General — shown site-wide', value: '' },
    ...FAQ_ENTITY_TYPES.map((entry) => ({ label: entry.label, value: entry.value }))
  ];

  const attachmentFilterOptions: Option[] = [
    { label: 'All attachments', value: 'all' },
    { label: 'General only', value: 'null' },
    ...FAQ_ENTITY_TYPES.map((entry) => ({ label: entry.plural, value: entry.value }))
  ];

  const groupModes = [
    { label: 'Attached to', value: 'entity' },
    { label: 'Category', value: 'category' }
  ] as const;

  const emptyForm = () => ({
    answer: '',
    category: '',
    entity_id: '',
    entity_type: '',
    question: '',
    sort_order: '0',
    status: 'draft' as Faq['status']
  });

  let rows: Faq[] = [];
  let loading = true;
  let saving = false;
  let deleting = false;
  let error = '';
  let search = '';
  let statusFilter = 'all';
  let categoryFilter = 'all';
  let attachmentFilter = 'all';
  let groupMode: 'category' | 'entity' = 'entity';
  let modalOpen = false;
  let confirmOpen = false;
  let editingFaq: Faq | null = null;
  let faqToDelete: Faq | null = null;
  let form = emptyForm();
  let expanded = new Set<string>();
  let toasts: Toast[] = [];

  // category filter list = recommended ∪ categories actually present in data
  let seenCategories = new Set<string>(recommendedCategories);
  $: categoryFilterOptions = [
    { label: 'All categories', value: 'all' },
    ...[...seenCategories].sort((a, b) => a.localeCompare(b)).map((c) => ({ label: c, value: c }))
  ];

  // The form offers every category in use, not just the recommended ten, so
  // editing an imported FAQ never silently drops its category.
  $: categoryFormOptions = [
    { label: 'No category', value: '' },
    ...[...seenCategories, ...(form.category ? [form.category] : [])]
      .filter((c, i, all) => all.indexOf(c) === i)
      .sort((a, b) => a.localeCompare(b))
      .map((c) => ({ label: c, value: c }))
  ];

  // What a row is attached to, as an editor reads it. An attachment whose
  // target no longer exists says so rather than showing a bare uuid.
  const attachmentOf = (faq: Faq) => {
    if (!faq.entity_type) return { kind: 'General', name: '', href: '' };
    const kind = faqEntityLabel(faq.entity_type) || faq.entity_type;
    if (!faq.entity) return { kind, name: 'Missing record', href: '' };
    return { kind, name: faq.entity.label, href: faqEntityHref(faq.entity_type, faq.entity.slug) };
  };

  // Group by whichever axis is selected, then sort each group by sort_order.
  // "Attached to" is the default: it is the one view that answers "which
  // questions does this destination show?" at a glance.
  $: grouped = (() => {
    const map = new Map<string, { heading: string; href: string; items: Faq[]; label: string }>();

    for (const faq of rows) {
      const attachment = attachmentOf(faq);
      const key =
        groupMode === 'category'
          ? `c:${faq.category?.trim() || 'Uncategorized'}`
          : `e:${faq.entity_type ?? ''}:${faq.entity_id ?? ''}`;

      if (!map.has(key)) {
        map.set(
          key,
          groupMode === 'category'
            ? { heading: 'Category', label: faq.category?.trim() || 'Uncategorized', href: '', items: [] }
            : { heading: attachment.kind, label: attachment.name || 'Every page', href: attachment.href, items: [] }
        );
      }
      map.get(key)?.items.push(faq);
    }

    for (const group of map.values()) group.items.sort((a, b) => a.sort_order - b.sort_order);

    // General first when grouping by attachment — it is the fallback set, so it
    // reads best at the top; the rest by type, then alphabetically.
    return [...map.entries()].sort(([keyA, a], [keyB, b]) => {
      if (groupMode === 'entity') {
        const generalA = keyA === 'e::';
        const generalB = keyB === 'e::';
        if (generalA !== generalB) return generalA ? -1 : 1;
        if (a.heading !== b.heading) return a.heading.localeCompare(b.heading);
      }
      return a.label.localeCompare(b.label);
    });
  })();

  const showToast = (message: string, type: Toast['type'] = 'success') => {
    const id = crypto.randomUUID();
    toasts = [{ id, message, type }, ...toasts].slice(0, 4);
    setTimeout(() => { toasts = toasts.filter((t) => t.id !== id); }, 3500);
  };

  const dismissToast = (e: CustomEvent<string>) => { toasts = toasts.filter((t) => t.id !== e.detail); };

  const toggleExpand = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id); else next.add(id);
    expanded = next;
  };

  const load = async () => {
    loading = true;
    error = '';
    try {
      const items = await readAllPages((page) =>
        api.faqs.list({
          search,
          status: statusFilter,
          category: categoryFilter === 'all' ? undefined : categoryFilter,
          // "null" is the API's spelling for IS NULL — the general questions.
          entity_type: attachmentFilter === 'all' ? undefined : attachmentFilter,
          limit: 100,
          page
        })
      );
      rows = items as unknown as Faq[];
      // remember any categories present so the filter never hides them
      const next = new Set(seenCategories);
      for (const faq of rows) if (faq.category?.trim()) next.add(faq.category.trim());
      seenCategories = next;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to load FAQs.';
    } finally {
      loading = false;
    }
  };

  // Records available to attach to, for the type currently chosen in the form.
  // Cached per type so switching back and forth doesn't refetch, and loaded
  // only when a type is picked — a general FAQ never touches these endpoints.
  const entityCache = new Map<FaqEntityType, Array<{ id: string; label: string }>>();
  let entityRecords: Array<{ id: string; label: string }> = [];
  let entityLoading = false;
  let entityError = '';

  const loadEntityOptions = async (type: string) => {
    entityError = '';
    if (!type) { entityRecords = []; return; }

    const cached = entityCache.get(type as FaqEntityType);
    if (cached) { entityRecords = cached; return; }

    entityLoading = true;
    entityRecords = [];
    try {
      const list = await loadFaqEntityRecords(type as FaqEntityType);
      entityCache.set(type as FaqEntityType, list);
      // Guard against a slow response landing after the editor moved on.
      if (form.entity_type === type) entityRecords = list;
    } catch {
      if (form.entity_type === type) entityError = 'Unable to load records for this type.';
    } finally {
      entityLoading = false;
    }
  };

  // Changing the type invalidates whichever record was chosen under the old one.
  const onEntityTypeChange = () => {
    form.entity_id = '';
    void loadEntityOptions(form.entity_type);
  };

  $: entityRecordOptions = (() => {
    const list = entityRecords.map((record) => ({ label: record.label, value: record.id }));
    // Keep an existing attachment selectable even if the record falls outside
    // the fetched page — saving must never silently detach an FAQ.
    if (form.entity_id && !list.some((option) => option.value === form.entity_id)) {
      list.unshift({ label: editingFaq?.entity?.label ?? 'Currently attached record', value: form.entity_id });
    }
    return [
      { label: entityLoading ? 'Loading records...' : 'Select a record', value: '' },
      ...list
    ];
  })();

  const openCreate = () => {
    editingFaq = null;
    form = emptyForm();
    entityRecords = [];
    entityError = '';
    modalOpen = true;
  };

  const openEdit = (faq: Faq) => {
    editingFaq = faq;
    form = {
      answer: faq.answer,
      category: faq.category ?? '',
      entity_id: faq.entity_id ?? '',
      entity_type: faq.entity_type ?? '',
      question: faq.question,
      sort_order: String(faq.sort_order ?? 0),
      status: faq.status
    };
    entityRecords = [];
    entityError = '';
    modalOpen = true;
    void loadEntityOptions(form.entity_type);
  };

  const closeModal = () => { modalOpen = false; editingFaq = null; form = emptyForm(); entityRecords = []; };

  const save = async () => {
    const question = form.question.trim();
    const answer = form.answer.trim();
    if (question.length < 5) { showToast('Question must be at least 5 characters.', 'error'); return; }
    if (answer.length < 5) { showToast('Answer must be at least 5 characters.', 'error'); return; }
    // The inputs already stop typing at the limit; this catches text that got
    // past them (an older record, or a paste the browser didn't trim).
    if (question.length > FAQ_QUESTION_MAX) { showToast(`Keep the question to ${FAQ_QUESTION_MAX} characters.`, 'error'); return; }
    if (answer.length > FAQ_ANSWER_MAX) { showToast(`Keep the answer to ${FAQ_ANSWER_MAX} characters.`, 'error'); return; }
    // Half an attachment is worse than none: a type with no record would be
    // saved as a question that belongs nowhere and shows nowhere.
    if (form.entity_type && !form.entity_id) {
      showToast(`Choose which ${faqEntityLabel(form.entity_type).toLowerCase()} this FAQ belongs to.`, 'error');
      return;
    }
    saving = true;
    const payload = {
      answer,
      category: form.category.trim() || null,
      entity_type: form.entity_type || null,
      entity_id: form.entity_type ? form.entity_id : null,
      question,
      sort_order: Number(form.sort_order || 0),
      status: form.status
    };
    try {
      if (editingFaq) {
        await api.faqs.update(editingFaq.id, payload);
        showToast('FAQ updated successfully.');
      } else {
        await api.faqs.create(payload);
        showToast('FAQ created successfully.');
      }
      closeModal();
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to save FAQ.', 'error');
    } finally {
      saving = false;
    }
  };

  const openDelete = (faq: Faq) => { faqToDelete = faq; confirmOpen = true; };

  const confirmDelete = async () => {
    if (!faqToDelete) return;
    deleting = true;
    try {
      await api.faqs.remove(faqToDelete.id);
      showToast('FAQ deleted successfully.');
      confirmOpen = false;
      faqToDelete = null;
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to delete FAQ.', 'error');
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
    title="FAQs"
    description="One library for every question on the site. Attach each one to the page it answers, or leave it general to show site-wide."
    actionLabel="New FAQ"
    actionIcon={Plus}
    on:action={openCreate}
  />

  <!-- Four filters plus a button will not fit one row until the screen is very
       wide: stack, then two up, then three, then one row. -->
  <AdminToolbar className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-[minmax(200px,1fr)_minmax(150px,190px)_minmax(150px,190px)_minmax(140px,170px)_auto] 2xl:items-end">
    <label class="grid min-w-0 gap-2 text-sm font-medium text-ink">
      <span>Search</span>
      <span class="flex h-11 min-w-0 items-center gap-2 rounded-2xl border border-ink/10 bg-surface px-3 shadow-sm transition focus-within:border-forest/45 focus-within:ring-2 focus-within:ring-forest/10">
        <Search size={16} class="shrink-0 text-ink/45" />
        <input class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink/35" bind:value={search} placeholder="Search question, answer, or category..." on:keydown={(e) => e.key === 'Enter' && load()} />
      </span>
    </label>
    <AdminSelect label="Attached to" name="attachment_filter" bind:value={attachmentFilter} options={attachmentFilterOptions} />
    <AdminSelect label="Category" name="category_filter" bind:value={categoryFilter} options={categoryFilterOptions} />
    <AdminSelect label="Status" name="status_filter" bind:value={statusFilter} options={[{ label: 'All statuses', value: 'all' }, ...statusOptions]} />
    <AdminButton variant="secondary" on:click={load}>Apply</AdminButton>
  </AdminToolbar>

  {#if loading}
    <LoadingState message="Loading FAQs..." />
  {:else if error}
    <ErrorState message={error} />
  {:else if rows.length === 0}
    <AdminEmptyState
      title="No FAQs yet"
      message="Create your first FAQ to help travelers, improve SEO, and handle common objections before they reach support."
      actionLabel="New FAQ"
      icon={CircleHelp}
      on:action={openCreate}
    />
  {:else}
    <div class="grid gap-5">
      <!-- Two ways to read the same list: by what a question is attached to
           (the default — it answers "what shows on this page?") or by the
           editorial category the module has always grouped on. -->
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-[13px] font-semibold text-ink/60">Group by</span>
        <div class="inline-flex rounded-xl border border-ink/10 bg-surface p-1 shadow-sm">
          {#each groupModes as mode (mode.value)}
            <button
              class={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${groupMode === mode.value ? 'bg-forest text-white' : 'text-ink/60 hover:bg-sand/70'}`}
              type="button"
              on:click={() => (groupMode = mode.value)}
            >
              {mode.label}
            </button>
          {/each}
        </div>
      </div>

      {#each grouped as [key, group] (key)}
        <section class="overflow-hidden rounded-none border border-ink/10 bg-surface shadow-[0_18px_50px_rgba(28,26,22,0.06)]">
          <header class="flex items-center justify-between gap-3 border-b border-ink/10 bg-sand/40 px-5 py-3">
            <div class="flex min-w-0 flex-wrap items-center gap-2">
              <span class="text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">{group.heading}</span>
              <h2 class="min-w-0 text-base font-bold text-ink [overflow-wrap:anywhere]">{group.label}</h2>
              {#if group.href}
                <a
                  class="inline-flex items-center gap-1 text-[11px] font-bold text-forest underline-offset-2 hover:underline"
                  href={group.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View page<ExternalLink size={11} />
                </a>
              {/if}
            </div>
            <span class="shrink-0 rounded-full bg-forest/10 px-2.5 py-0.5 text-xs font-bold text-forest">{group.items.length}</span>
          </header>

          <div class="divide-y divide-ink/10">
            {#each group.items as faq (faq.id)}
              <article class="px-5 py-4">
                <div class="flex items-start gap-3">
                  <button
                    class="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-ink/10 bg-surface text-ink/55 transition hover:bg-sand/70"
                    type="button"
                    aria-label={expanded.has(faq.id) ? 'Collapse answer' : 'Expand answer'}
                    on:click={() => toggleExpand(faq.id)}
                  >
                    <ChevronDown size={15} class={`transition-transform ${expanded.has(faq.id) ? 'rotate-180' : ''}`} />
                  </button>

                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-start justify-between gap-3">
                      <button class="min-w-0 flex-[1_1_12rem] text-left" type="button" on:click={() => toggleExpand(faq.id)}>
                        <p class="font-semibold text-ink [overflow-wrap:anywhere]">{faq.question}</p>
                      </button>
                      <div class="flex min-w-0 max-w-full flex-wrap items-center justify-end gap-2">
                        <!-- Whichever axis the list is NOT grouped by, so a row
                             is never missing half its context. -->
                        {#if groupMode === 'entity'}
                          {#if faq.category?.trim()}
                            <span class="max-w-full rounded-full bg-sand/70 px-2 py-0.5 text-[11px] font-semibold text-ink/55 [overflow-wrap:anywhere]">{faq.category}</span>
                          {/if}
                        {:else}
                          {@const attachment = attachmentOf(faq)}
                          <span class="max-w-full rounded-full bg-forest/10 px-2 py-0.5 text-[11px] font-semibold text-forest [overflow-wrap:anywhere]">
                            {attachment.name ? `${attachment.kind}: ${attachment.name}` : attachment.kind}
                          </span>
                        {/if}
                        <span class="rounded-full bg-sand/70 px-2 py-0.5 text-[11px] font-semibold text-ink/55">Sort {faq.sort_order}</span>
                        <StatusBadge status={faq.status} />
                      </div>
                    </div>

                    {#if expanded.has(faq.id)}
                      <p class="mt-2 whitespace-pre-line text-sm leading-6 text-ink/65 [overflow-wrap:anywhere]" transition:slide={{ duration: 160 }}>{faq.answer}</p>
                    {:else}
                      <p class="mt-1 line-clamp-1 text-sm text-ink/45 [overflow-wrap:anywhere]">{faq.answer}</p>
                    {/if}

                    <div class="mt-3 flex gap-2">
                      <button class="inline-flex h-9 items-center gap-2 rounded-xl border border-ink/10 bg-surface px-3 text-xs font-semibold text-ink shadow-sm transition hover:border-goldfinch-gold/35 hover:bg-sand/70" type="button" on:click={() => openEdit(faq)}>
                        <Edit size={14} />Edit
                      </button>
                      <button class="inline-flex h-9 items-center gap-2 rounded-xl border border-red-200 bg-surface px-3 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-50" type="button" on:click={() => openDelete(faq)}>
                        <Trash2 size={14} />Delete
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            {/each}
          </div>
        </section>
      {/each}
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
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">{editingFaq ? 'Edit FAQ' : 'New FAQ'}</p>
          <h2 class="mt-1 text-2xl font-bold text-ink">{editingFaq ? 'Update question' : 'Add question'}</h2>
        </div>
        <button class="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-ink/10 bg-surface text-ink shadow-sm transition hover:bg-sand" type="button" aria-label="Close" on:click={closeModal}>
          <X size={18} />
        </button>
      </div>

      <div class="mt-6 grid gap-4">
        <!-- Hard caps, counted down as the editor types: the public accordion is
             designed around these lengths, and the API refuses anything longer. -->
        <AdminFormInput
          label="Question"
          name="question"
          bind:value={form.question}
          placeholder="e.g. What is the best time for a Serengeti safari?"
          maxLength={FAQ_QUESTION_MAX}
          counter={FAQ_QUESTION_MAX}
          required
        />
        <AdminTextArea
          label="Answer"
          name="answer"
          bind:value={form.answer}
          rows={6}
          maxLength={FAQ_ANSWER_MAX}
          counter={FAQ_ANSWER_MAX}
          placeholder="Answer in the first sentence, then add the detail. Plain text — search engines and AI assistants quote it as written."
        />

        <!-- Where this question belongs. Leaving it general is a real choice,
             not an unfinished one: general questions fill out every page that
             does not have enough of its own. -->
        <div class="rounded-none border border-ink/10 bg-sand/30 p-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <AdminSelect
              label="Attach to"
              name="entity_type"
              bind:value={form.entity_type}
              options={entityTypeFormOptions}
              on:change={onEntityTypeChange}
            />
            {#if form.entity_type}
              <AdminSelect label={faqEntityLabel(form.entity_type)} name="entity_id" bind:value={form.entity_id} options={entityRecordOptions} />
            {/if}
          </div>
          {#if entityError}
            <p class="mt-3 text-[13px] font-semibold text-red-700">{entityError}</p>
          {:else}
            <p class="mt-3 text-[13px] leading-5 text-ink/55">
              {#if form.entity_type}
                Shown first on that page, ahead of the general questions.
              {:else}
                Shown across the site wherever a page has room after its own questions.
              {/if}
            </p>
          {/if}
        </div>

        <div class="grid gap-4 sm:grid-cols-3">
          <AdminSelect label="Category" name="category" bind:value={form.category} options={categoryFormOptions} />
          <AdminSelect label="Status" name="status" bind:value={form.status} options={statusOptions} />
          <AdminFormInput label="Sort order" name="sort_order" type="number" min={0} bind:value={form.sort_order} />
        </div>
      </div>

      <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <AdminButton variant="secondary" type="button" on:click={closeModal}>Cancel</AdminButton>
        <AdminButton type="submit" disabled={saving}>
          {saving ? 'Saving...' : editingFaq ? 'Save Changes' : 'Create FAQ'}
        </AdminButton>
      </div>
    </form>
  </div>
{/if}

<ConfirmModal
  open={confirmOpen}
  title="Delete FAQ"
  message={`Delete "${faqToDelete?.question ?? 'this FAQ'}"? This action soft-deletes the record.`}
  on:cancel={() => { confirmOpen = false; faqToDelete = null; }}
  on:confirm={confirmDelete}
/>

{#if deleting}
  <div class="fixed bottom-4 right-4 z-[70] rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(28,26,22,0.18)]">
    Deleting FAQ...
  </div>
{/if}
