<script lang="ts">
  // Drop-in <img> replacement that serves the backend's responsive AVIF/WebP
  // ladder when available, and degrades gracefully to the existing optimized
  // URL otherwise (external images, or before the backfill has run). Adds
  // width/height, decoding, loading and fetchpriority, plus a dominant-colour
  // placeholder to avoid a flash of empty space.
  import { imgUrl } from '$lib/img';
  import { imageMeta, requestImageMeta, variantBase, srcsetFor } from '$lib/responsiveImage';

  export let src: string | null | undefined = ''; // the ORIGINAL upload URL (variants derive from it)
  export let fallbackSrc: string | null | undefined = undefined; // small fallback (e.g. thumbnail) for the <img>
  export let alt = '';
  export let sizes = '100vw';
  export let eager = false; // above-the-fold → loading="eager"
  export let priority = false; // LCP candidate → fetchpriority="high"
  export let imgClass = '';
  export let imgStyle = ''; // extra inline style forwarded to the <img> (e.g. object-position)
  export let width = 1280; // render width for the fallback <img>

  $: base = variantBase(src);
  $: if (src) requestImageMeta(src); // batched + cached; no-op on server / non-uploads
  $: meta = src ? $imageMeta[src] : null;
  $: widths = meta?.widths?.length ? meta.widths : null;
  // The <img> is the fallback: a small thumbnail when given, else the (sized) src.
  // Responsive AVIF/WebP <source>s always derive from the original `src`.
  $: fallback = imgUrl((fallbackSrc || src) ?? '', width);
  $: bg = meta?.dominantColor ?? undefined;
  // Merge the dominant-colour placeholder with any caller-supplied inline style
  // (e.g. object-position for a hero focal point) into one style attribute.
  $: combinedStyle = [bg ? `background-color:${bg}` : '', imgStyle].filter(Boolean).join(';') || undefined;
</script>

<picture class="contents">
  {#if base && widths}
    {#if meta?.hasAvif}
      <source type="image/avif" srcset={srcsetFor(base, widths, 'avif')} {sizes} />
    {/if}
    <source type="image/webp" srcset={srcsetFor(base, widths, 'webp')} {sizes} />
  {/if}
  <img
    src={fallback}
    {alt}
    class={imgClass}
    loading={eager ? 'eager' : 'lazy'}
    decoding="async"
    fetchpriority={priority ? 'high' : undefined}
    width={meta?.width ?? undefined}
    height={meta?.height ?? undefined}
    style={combinedStyle}
  />
</picture>
