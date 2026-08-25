<script lang="ts">
  import { Check, Minus } from '@lucide/svelte';

  // Two-card "What's included / Not included" block, extracted verbatim from the
  // tour detail page. Driven by PLAIN STRING ARRAYS so campaign/landing pages can
  // pass their own copy — call sites holding records map them to titles themselves.
  export let included: string[] = [];
  export let excluded: string[] = [];
  export let includedTitle = 'Included';
  export let excludedTitle = 'Not included';
  export let includedEmpty = 'Inclusions are confirmed with your final quote.';
  export let excludedEmpty = 'Ask us what falls outside the quoted price.';
</script>

<div class="mt-8 grid gap-4 md:grid-cols-2">
  <div class="border border-ink/10 bg-surface p-5">
    <h3 class="font-serif text-[18px] font-light text-heading">{includedTitle}</h3>
    {#if included.length}
      <ul class="mt-5 grid gap-3.5">
        {#each included as inc}
          <li class="flex gap-3 text-[14.5px] leading-6 text-heading">
            <Check size={17} class="mt-0.5 shrink-0 text-clay" strokeWidth={2.4} />
            {inc}
          </li>
        {/each}
      </ul>
    {:else}
      <p class="mt-4 text-[14px] text-ink/55">{includedEmpty}</p>
    {/if}
  </div>
  <div class="border border-ink/10 bg-savanna/45 p-5">
    <h3 class="font-serif text-[18px] font-light text-heading">{excludedTitle}</h3>
    {#if excluded.length}
      <ul class="mt-5 grid gap-3.5">
        {#each excluded as exc}
          <li class="flex gap-3 text-[14.5px] leading-6 text-ink/70">
            <Minus size={17} class="mt-0.5 shrink-0 text-ink/40" strokeWidth={2.4} />
            {exc}
          </li>
        {/each}
      </ul>
    {:else}
      <p class="mt-4 text-[14px] text-ink/55">{excludedEmpty}</p>
    {/if}
  </div>
</div>
