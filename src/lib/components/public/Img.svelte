<script lang="ts">
  /**
   * One image, served at a sensible size — Emnel's own media pipeline.
   *
   * Resizes through $lib/img's imgUrl(), so callers only pass a URL and a size.
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
