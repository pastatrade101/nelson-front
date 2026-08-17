<script lang="ts">
  /**
   * Renders a long-form CMS field, whether it holds rich text (TipTap HTML) or
   * the plain text that predates the editor. HTML is sanitised down to an
   * allowlist before injection; plain text goes down the escaped paragraph path.
   * Typography lives here so every long-form field on the site reads the same —
   * pass size/colour through `className` and children inherit it.
   */
  import { hasRichContent, looksLikeHtml, sanitizeRichText } from '$lib/richtext';

  export let value: string | null | undefined = '';
  /** Extra classes on the wrapper — children inherit size and colour from it. */
  export let className = '';
  /** Renders nothing at all when the field is empty, so callers can gate on it. */
  export let element: 'div' | 'article' = 'div';

  $: raw = String(value ?? '');
  $: isRich = looksLikeHtml(raw);
  $: html = isRich ? sanitizeRichText(raw) : '';
  $: paragraphs = isRich
    ? []
    : raw
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean);
  $: visible = hasRichContent(raw);
</script>

{#if visible}
  <svelte:element this={element} class={`rich ${className}`}>
    {#if isRich}
      {@html html}
    {:else}
      {#each paragraphs as paragraph}
        <p>{paragraph}</p>
      {/each}
    {/if}
  </svelte:element>
{/if}

<style>
  /* {@html} output is not scoped by Svelte, so these are :global — kept nested
     under .rich so they stay off the rest of the page. */
  .rich > :global(* + *) {
    margin-top: 1.15em;
  }

  .rich :global(h2),
  .rich :global(h3),
  .rich :global(h4) {
    font-family: 'Cormorant Garamond', Georgia, 'Times New Roman', serif;
    font-weight: 500;
    line-height: 1.2;
    color: rgb(var(--c-heading));
  }

  .rich :global(h2) {
    font-size: 1.6em;
    margin-top: 1.9em;
  }

  .rich :global(h3) {
    font-size: 1.32em;
    margin-top: 1.7em;
  }

  .rich :global(h4) {
    font-size: 1.12em;
    margin-top: 1.5em;
  }

  .rich :global(h2:first-child),
  .rich :global(h3:first-child),
  .rich :global(h4:first-child) {
    margin-top: 0;
  }

  .rich :global(ul),
  .rich :global(ol) {
    padding-left: 1.3em;
  }

  .rich :global(ul) {
    list-style: disc;
  }

  .rich :global(ol) {
    list-style: decimal;
  }

  .rich :global(li) {
    padding-left: 0.25em;
  }

  .rich :global(li + li) {
    margin-top: 0.5em;
  }

  .rich :global(li::marker) {
    color: rgb(var(--c-goldfinch-gold));
  }

  /* A quote is set off by a gold rule rather than a box, matching the editorial
     styling used across the site. */
  .rich :global(blockquote) {
    border-left: 2px solid rgb(var(--c-goldfinch-gold));
    padding-left: 1.15em;
    font-style: italic;
    color: rgb(var(--c-heading));
  }

  .rich :global(strong) {
    font-weight: 700;
    color: rgb(var(--c-heading));
  }

  .rich :global(a) {
    color: rgb(var(--c-forest));
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 3px;
    text-decoration-color: rgb(var(--c-goldfinch-gold));
    transition: color 0.15s ease;
  }

  .rich :global(a:hover) {
    color: rgb(var(--c-deep-green));
  }

  .rich :global(a:focus-visible) {
    outline: 2px solid rgb(var(--c-goldfinch-gold));
    outline-offset: 2px;
  }

  /* On dark sections, inherit the surrounding light text colour and switch link
     colour to gold. */
  .rich.rich-on-dark :global(h2),
  .rich.rich-on-dark :global(h3),
  .rich.rich-on-dark :global(h4),
  .rich.rich-on-dark :global(strong) {
    color: inherit;
  }

  .rich.rich-on-dark :global(a) {
    color: rgb(var(--c-goldfinch-gold));
  }
</style>
