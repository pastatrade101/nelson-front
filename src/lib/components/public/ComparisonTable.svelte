<script lang="ts">
  // Generic N-column comparison table, driven by PLAIN DATA (strings only) so a
  // campaign / landing page can pass its own copy without a Tour or Destination
  // record. Extracted from the `table` content block in DestinationGuide.
  //
  //   columns — every header cell, INCLUDING the leading row-label column.
  //   rows    — one per body row: `label` fills the leading column, `cells` fill
  //             the remaining columns (i.e. columns[1..]).
  //   caption — optional heading rendered above the table.
  //
  // Desktop (md+) is a real <table> using the guide's table idiom. Mobile does
  // NOT scroll horizontally: each row reflows into a card that repeats its
  // column header inside every cell — the same reflow idiom as
  // routes/compare/[slug]/+page.svelte.
  export let columns: string[] = [];
  export let rows: Array<{ label: string; cells: string[] }> = [];
  export let caption = '';

  // columns[0] labels the row-label column; the rest line up with `row.cells`.
  $: labelHeader = columns[0] ?? '';
  $: cellHeaders = columns.slice(1);
</script>

{#if caption}
  <h3 class="mb-3 font-serif text-lg font-normal text-heading">{caption}</h3>
{/if}

<!-- desktop: the real table -->
<div class="hidden overflow-x-auto rounded-2xl border border-ink/10 bg-surface shadow-soft md:block">
  <table class="w-full min-w-[560px] text-left text-sm">
    <thead>
      <tr class="border-b border-ink/10 bg-sand/40">
        {#each columns as col}
          <th class="px-4 py-3 font-bold text-heading">{col}</th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each rows as row}
        <tr class="border-b border-ink/[0.06] last:border-0">
          <td class="px-4 py-3 align-top text-ink/75">{row.label}</td>
          {#each row.cells as cell}
            <td class="px-4 py-3 align-top text-ink/75">{cell}</td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<!-- mobile: one card per row, each cell carrying its own column header -->
<div class="grid gap-2.5 md:hidden">
  {#each rows as row}
    <div class="rounded-2xl border border-ink/10 bg-surface p-4 shadow-soft">
      {#if labelHeader}
        <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/40">{labelHeader}</p>
      {/if}
      <p class="text-sm font-bold text-heading">{row.label}</p>
      <dl class="mt-3 grid gap-2.5">
        {#each row.cells as cell, i}
          <div class="border-t border-ink/[0.06] pt-2.5 first:border-t-0 first:pt-0">
            <dt class="text-[11px] font-bold uppercase tracking-[0.12em] text-clay">{cellHeaders[i] ?? ''}</dt>
            <dd class="mt-1 text-sm leading-6 text-ink/75">{cell}</dd>
          </div>
        {/each}
      </dl>
    </div>
  {/each}
</div>
