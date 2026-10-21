<script lang="ts">
  import { revealHeading } from '$lib/animations';
  export let eyebrow = '';
  export let title = '';
  export let description = '';
  /** The heading level: h1 when this header is the page's own title, h2 for a section. */
  export let as: 'h1' | 'h2' = 'h2';
</script>

<div class="max-w-2xl">
  {#if eyebrow}
    <p class="brand-eyebrow">{eyebrow}</p>
  {/if}
  {#key title}
    <svelte:element this={as} class="mt-2 text-3xl font-normal tracking-normal text-heading md:text-[40px]" use:revealHeading>{title}</svelte:element>
  {/key}
  {#if description}
    <p class="mt-3 max-w-[660px] text-base leading-8 text-ink/70">{description}</p>
  {/if}
</div>
