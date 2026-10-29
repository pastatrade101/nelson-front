<script lang="ts">
  import { onMount } from 'svelte';
  import type { FAQ } from '$lib/types';

  export let faqs: FAQ[] = [];
  /**
   * Heading level for each question, one below the section heading it sits
   * under — h3 beneath a section's h2 (the default), h4 beneath a guide block's
   * h3. Questions as real headings give search engines and AI assistants the
   * page's question-and-answer structure without running any script.
   */
  export let headingLevel: 3 | 4 = 3;

  /**
   * A readable, stable anchor per question (#faq-when-is-the-best-time-...),
   * so an answer can be linked to — and cited — directly. Built from the
   * question so it survives re-ordering; numbered on the rare repeat.
   */
  const slugify = (value: string) =>
    value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 72)
      .replace(/-+$/g, '');

  $: anchors = (() => {
    const used = new Map<string, number>();
    return faqs.map((faq, i) => {
      const base = `faq-${slugify(faq.question ?? '') || i + 1}`;
      const count = (used.get(base) ?? 0) + 1;
      used.set(base, count);
      return count > 1 ? `${base}-${count}` : base;
    });
  })();

  // Arriving on #faq-... opens that answer: an anchor that scrolled to a
  // closed question would hide exactly the text the link pointed at.
  onMount(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id.startsWith('faq-')) return;
    const target = document.getElementById(id);
    if (target instanceof HTMLDetailsElement) target.open = true;
  });
</script>

<!--
  Native <details>: every answer is in the server HTML from the start and only
  visually collapsed. It used to be inserted on click ({#if open}), so search
  and AI crawlers saw the questions and none of the answers.
-->
<div class="min-w-0 divide-y divide-ink/10 rounded-lg border border-ink/10 bg-surface">
  {#each faqs as faq, i (faq.id || i)}
    <details class="faq-item group scroll-mt-28" id={anchors[i]}>
      <summary class="flex w-full cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-start font-semibold text-ink">
        <svelte:element this={`h${headingLevel}`} class="type-card min-w-0 text-ink [overflow-wrap:anywhere]">{faq.question}</svelte:element>
        <span class="shrink-0" aria-hidden="true"><span class="group-open:hidden">+</span><span class="hidden group-open:inline">-</span></span>
      </summary>
      <p class="whitespace-pre-line px-5 pb-5 text-base leading-[1.75] text-ink/70 [overflow-wrap:anywhere]">{faq.answer}</p>
    </details>
  {/each}
</div>

<style>
  /* Safari draws its own disclosure triangle unless told not to. */
  .faq-item > summary::-webkit-details-marker { display: none; }
</style>
