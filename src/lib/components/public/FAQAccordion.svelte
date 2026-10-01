<script lang="ts">
  import type { FAQ } from '$lib/types';

  export let faqs: FAQ[] = [];
</script>

<!--
  Native <details>: every answer is in the server HTML from the start and only
  visually collapsed. It used to be inserted on click ({#if open}), so search
  and AI crawlers saw the questions and none of the answers.
-->
<div class="divide-y divide-ink/10 rounded-lg border border-ink/10 bg-surface">
  {#each faqs as faq, i (faq.id || i)}
    <details class="faq-item group">
      <summary class="flex w-full cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-start font-semibold text-ink">
        <span>{faq.question}</span>
        <span class="shrink-0" aria-hidden="true"><span class="group-open:hidden">+</span><span class="hidden group-open:inline">-</span></span>
      </summary>
      <p class="px-5 pb-5 text-sm leading-6 text-ink/70">{faq.answer}</p>
    </details>
  {/each}
</div>

<style>
  /* Safari draws its own disclosure triangle unless told not to. */
  .faq-item > summary::-webkit-details-marker { display: none; }
</style>
