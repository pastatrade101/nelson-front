<script lang="ts">
  /**
   * Question-and-answer pairs for one tour, edited inside the tour editor.
   *
   * They are rows of the central FAQ library attached to this tour
   * (entity_type 'tours', entity_id = the tour), so nothing new is stored: the
   * tour page already shows them under "Good to Know" and marks them up as
   * FAQPage structured data, and they also appear in CMS › FAQs. This block
   * just lets an editor write them where they think of them.
   *
   * Saved on its own button, separately from the tour form, and kept outside
   * that <form> so its buttons never submit the tour.
   */
  import { onMount } from 'svelte';
  import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import { FAQ_ANSWER_MAX, FAQ_QUESTION_MAX, readAllPages } from '$lib/faqEntities';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import ConfirmModal from '$lib/components/admin/ConfirmModal.svelte';
  import type { FAQ } from '$lib/types';

  export let tourId: string;

  type Row = {
    key: string;
    id?: string;
    question: string;
    answer: string;
    published: boolean;
    /** What was last saved, to tell edited rows from untouched ones. */
    saved: string;
  };

  let rows: Row[] = [];
  let loading = true;
  let saving = false;
  let loadError = '';
  let message = '';
  let messageTone: 'ok' | 'error' = 'ok';
  let pendingDelete: Row | null = null;

  const snapshot = (row: Pick<Row, 'question' | 'answer' | 'published'>, index: number) =>
    JSON.stringify([row.question.trim(), row.answer.trim(), row.published, index]);

  const load = async () => {
    loading = true;
    loadError = '';
    try {
      const items = await readAllPages((page) =>
        api.faqs.list({ entity_type: 'tours', entity_id: tourId, status: 'all', limit: 100, page })
      );
      rows = (items as FAQ[])
        .filter((faq) => faq.entity_type === 'tours' && faq.entity_id === tourId && faq.status !== 'archived')
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((faq, index) => {
          const row = { key: faq.id, id: faq.id, question: faq.question ?? '', answer: faq.answer ?? '', published: faq.status === 'published', saved: '' };
          row.saved = snapshot(row, index);
          return row;
        });
    } catch (err) {
      loadError = err instanceof Error ? err.message : 'Unable to load this tour’s questions.';
    } finally {
      loading = false;
    }
  };

  const addRow = () => {
    rows = [...rows, { key: crypto.randomUUID(), question: '', answer: '', published: true, saved: '' }];
  };

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    rows = next;
  };

  $: dirtyCount = rows.filter((row, index) => snapshot(row, index) !== row.saved).length;

  const problemFor = (row: Row) => {
    const q = row.question.trim();
    const a = row.answer.trim();
    if (!q && !a) return 'empty';
    if (q.length < 5) return 'Write a question of at least 5 characters.';
    if (a.length < 5) return 'Write an answer of at least 5 characters.';
    if (q.length > FAQ_QUESTION_MAX) return `Keep the question to ${FAQ_QUESTION_MAX} characters.`;
    if (a.length > FAQ_ANSWER_MAX) return `Keep the answer to ${FAQ_ANSWER_MAX} characters.`;
    return '';
  };

  const saveAll = async () => {
    message = '';
    // A blank new row is simply dropped; any other problem stops the save.
    rows = rows.filter((row) => row.id || problemFor(row) !== 'empty');
    const problem = rows.map(problemFor).find((p) => p && p !== 'empty');
    if (problem) {
      messageTone = 'error';
      message = problem;
      return;
    }

    saving = true;
    try {
      for (const [index, row] of rows.entries()) {
        if (snapshot(row, index) === row.saved) continue;
        const body = {
          question: row.question.trim(),
          answer: row.answer.trim(),
          status: row.published ? 'published' : 'draft',
          sort_order: index * 10,
          entity_type: 'tours',
          entity_id: tourId
        };
        if (row.id) {
          await api.faqs.update(row.id, body);
        } else {
          const res = (await api.faqs.create(body)) as { data?: { id?: string } };
          row.id = res?.data?.id;
        }
        row.saved = snapshot(row, index);
      }
      rows = rows;
      messageTone = 'ok';
      message = 'Questions saved. The tour page shows them within about 10 minutes.';
    } catch (err) {
      messageTone = 'error';
      message = err instanceof Error ? err.message : 'Unable to save the questions.';
    } finally {
      saving = false;
    }
  };

  const confirmDelete = async () => {
    const row = pendingDelete;
    pendingDelete = null;
    if (!row) return;
    if (!row.id) {
      rows = rows.filter((r) => r.key !== row.key);
      return;
    }
    try {
      await api.faqs.remove(row.id);
      rows = rows.filter((r) => r.key !== row.key);
      messageTone = 'ok';
      message = 'Question deleted.';
    } catch (err) {
      messageTone = 'error';
      message = err instanceof Error ? err.message : 'Unable to delete the question.';
    }
  };

  onMount(load);
</script>

<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
  <div>
    <h2 class="text-xl font-bold text-ink">Frequently asked questions</h2>
    <p class="mt-1 max-w-[70ch] text-sm leading-6 text-ink/60">
      Questions about this safari. They appear under “Good to Know” on the tour page and are marked up as FAQ schema for Google. They are also listed in CMS › FAQs, attached to this tour.
    </p>
  </div>
  <AdminButton variant="secondary" on:click={addRow}>
    <Plus size={16} />
    Add question
  </AdminButton>
</div>

{#if loading}
  <p class="mt-5 text-sm text-ink/55">Loading questions…</p>
{:else if loadError}
  <p class="mt-5 text-sm text-clay">{loadError}</p>
{:else}
  {#if rows.length === 0}
    <p class="mt-5 border border-dashed border-ink/15 px-4 py-6 text-center text-sm text-ink/55">
      No questions yet. Add the ones travellers ask about this trip.
    </p>
  {:else}
    <ol class="mt-5 grid gap-3">
      {#each rows as row, index (row.key)}
        <li class="border border-ink/10 bg-sand/15 p-4">
          <div class="flex items-center justify-between gap-3">
            <span class="text-[13px] font-semibold text-ink/55">Question {index + 1}</span>
            <div class="flex items-center gap-1">
              <button class="grid h-9 w-9 place-items-center text-ink/55 transition hover:bg-sand hover:text-ink disabled:opacity-30" type="button" aria-label="Move question up" disabled={index === 0} on:click={() => move(index, -1)}><ArrowUp size={15} /></button>
              <button class="grid h-9 w-9 place-items-center text-ink/55 transition hover:bg-sand hover:text-ink disabled:opacity-30" type="button" aria-label="Move question down" disabled={index === rows.length - 1} on:click={() => move(index, 1)}><ArrowDown size={15} /></button>
              <button class="grid h-9 w-9 place-items-center text-red-700/70 transition hover:bg-red-50 hover:text-red-700" type="button" aria-label="Delete question" on:click={() => (pendingDelete = row)}><Trash2 size={15} /></button>
            </div>
          </div>
          <label class="mt-2 grid gap-1.5">
            <span class="sr-only">Question</span>
            <input
              class="rounded-md border border-ink/15 bg-surface px-3.5 py-2.5 text-sm font-semibold text-ink outline-none transition placeholder:font-normal placeholder:text-ink/35 hover:border-ink/25 focus:border-forest focus:ring-2 focus:ring-forest/20"
              bind:value={row.question}
              placeholder="Is this safari suitable for young children?"
              maxlength={FAQ_QUESTION_MAX}
            />
          </label>
          <label class="mt-2 grid gap-1.5">
            <span class="sr-only">Answer</span>
            <textarea
              class="rounded-md border border-ink/15 bg-surface px-3.5 py-2.5 text-sm leading-6 text-ink outline-none transition placeholder:text-ink/35 hover:border-ink/25 focus:border-forest focus:ring-2 focus:ring-forest/20"
              bind:value={row.answer}
              rows="3"
              placeholder="The answer, in a few plain sentences."
              maxlength={FAQ_ANSWER_MAX}
            ></textarea>
            <span class={`justify-self-end text-[11px] font-semibold ${row.answer.length > FAQ_ANSWER_MAX - 40 ? 'text-clay' : 'text-ink/40'}`}>{row.answer.length}/{FAQ_ANSWER_MAX}</span>
          </label>
          <label class="mt-1 inline-flex cursor-pointer items-center gap-2 text-sm text-ink/70">
            <input class="h-4 w-4 accent-forest" type="checkbox" bind:checked={row.published} />
            Show on the tour page
          </label>
        </li>
      {/each}
    </ol>
  {/if}

  <div class="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <p class={`text-sm ${messageTone === 'error' ? 'text-clay' : 'text-ink/60'}`} role="status">
      {message || (dirtyCount ? `${dirtyCount} unsaved ${dirtyCount === 1 ? 'change' : 'changes'}. Questions save separately from the tour.` : 'Questions save separately from the tour.')}
    </p>
    <AdminButton on:click={saveAll} disabled={saving || dirtyCount === 0}>
      <Save size={16} />
      {saving ? 'Saving…' : 'Save questions'}
    </AdminButton>
  </div>
{/if}

<ConfirmModal
  open={Boolean(pendingDelete)}
  title="Delete this question?"
  message="It is removed from the tour page and from the FAQ library. This cannot be undone."
  on:confirm={confirmDelete}
  on:cancel={() => (pendingDelete = null)}
/>
