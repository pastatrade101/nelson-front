<script lang="ts">
  // Numbered feature grid — "Why Tanzania works so well", and reused for
  // "Why Emnel". Generic on purpose: `columns` controls the layout so one
  // component serves both blocks.
  // REAL DATA ONLY: every title/body is an admin-entered CMS field. Nothing is
  // defaulted or invented; an item with neither title nor body is dropped, and
  // the whole section disappears when there is nothing to show.
  export let title = '';
  export let eyebrow = '';
  export let items: { title?: string; body?: string }[] = [];
  export let columns = 4;

  $: shown = (items ?? []).filter((item) => item && (item.title || item.body));

  // Full literal class strings so Tailwind's scanner keeps them.
  const colsFor = (n: number): string =>
    n <= 1 ? '' : n === 2 ? 'sm:grid-cols-2' : n === 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-4';
  $: gridClass = colsFor(Math.min(columns, shown.length));

  const index = (i: number): string => String(i + 1).padStart(2, '0');
</script>

{#if shown.length}
  <section class="bg-canvas py-12 md:py-16">
    <div class="container-shell">
      {#if eyebrow || title}
        <div class="max-w-[820px]">
          {#if eyebrow}
            <p class="brand-eyebrow">{eyebrow}</p>
          {/if}
          {#if title}
            <h2 class="type-h2 mt-4 text-heading">{title}</h2>
          {/if}
        </div>
      {/if}

      <ol class={`mt-10 grid gap-px bg-ink/10 border border-ink/10 ${gridClass}`}>
        {#each shown as item, i}
          <li class="bg-surface p-7 md:p-8">
            <span class="block font-serif text-[40px] font-light leading-none text-goldfinch-gold md:text-[52px]" aria-hidden="true">
              {index(i)}
            </span>
            {#if item.title}
              <h3 class="type-card mt-5 text-heading">{item.title}</h3>
            {/if}
            {#if item.body}
              <p class="mt-3 text-base leading-[1.75] text-ink/70">{item.body}</p>
            {/if}
          </li>
        {/each}
      </ol>
    </div>
  </section>
{/if}
