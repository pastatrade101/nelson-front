<script lang="ts">
  /**
   * One image, served at a sensible size — Emnel's own media pipeline.
   *
   * Goldfinch's version of this component sits on a responsive-variant ladder this
   * codebase does not have, so this keeps the same props and resizes through
   * $lib/img's imgUrl() instead. Callers do not need to know the difference.
   */
  import { imgUrl } from '$lib/img';

  export let src: string | null | undefined = '';
  export let alt = '';
  export let width = 800;
  export let sizes = '100vw';
  export let className = '';
  export let eager = false;

  $: resolved = imgUrl(src, width);
</script>

{#if resolved}
  <img
    src={resolved}
    {alt}
    {sizes}
    class={className}
    loading={eager ? 'eager' : 'lazy'}
    decoding="async"
  />
{/if}
