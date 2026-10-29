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
    <svelte:element this={as} class="mt-2 text-heading {as === 'h1' ? 'type-h1' : 'type-h2'}" use:revealHeading>{title}</svelte:element>
  {/key}
  {#if description}
    <!-- Under a page H1 the description is the hero standfirst (lead); under a section H2 it is body copy. -->
    <p class="mt-3 max-w-[660px] text-ink/70 {as === 'h1' ? 'type-lead' : 'text-base leading-[1.75]'}">{description}</p>
  {/if}
</div>
