<script lang="ts">
  import type { FAQ } from '$lib/types';
  import { slide } from 'svelte/transition';

  export let faqs: FAQ[] = [];
  let openId = '';
</script>

<div class="divide-y divide-ink/10 rounded-lg border border-ink/10 bg-surface">
  {#each faqs as faq}
    <div>
      <button class="flex w-full items-center justify-between gap-4 px-5 py-4 text-start font-semibold text-ink" type="button" on:click={() => (openId = openId === faq.id ? '' : faq.id)}>
        <span>{faq.question}</span>
        <span>{openId === faq.id ? '-' : '+'}</span>
      </button>
      {#if openId === faq.id}
        <p class="px-5 pb-5 text-sm leading-6 text-ink/70" transition:slide={{ duration: 180 }}>{faq.answer}</p>
      {/if}
    </div>
  {/each}
</div>
