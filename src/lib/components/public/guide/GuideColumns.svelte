<script lang="ts">
  /**
   * A short guide table shown as columns side by side: one column per row of
   * the table, its first cell as the column's title. A month-by-month table
   * (`months` given) also gets a twelve-month bar above each column, so the
   * year reads at a glance.
   *
   * Wide screens lay the columns out in one ruled grid; phones swipe through
   * them, one column at a time.
   */
  import { MONTH_INITIALS, MONTH_NAMES, type CleanTable } from '$lib/guideLayout';

  export let table: CleanTable;
  /** Month indexes (0 = January) per row, for a season strip. */
  export let months: number[][] | null = null;
  /** The column holding the season's name, shown under the months. */
  export let seasonCol = -1;

  $: count = table.rows.length;
  // Six fits as two rows of three; up to five sit in one row.
  $: perRow = count === 6 ? 3 : count;

  const span = (list: number[]) =>
    list.length === 1 ? MONTH_NAMES[list[0]] : `${MONTH_NAMES[list[0]]} to ${MONTH_NAMES[list[list.length - 1]]}`;
</script>

<div>
  {#if table.title}
    <h3 class="type-h3 text-heading">{table.title}</h3>
  {/if}
  <div
    class="guide-columns -mx-6 mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-3 lg:mx-0 lg:grid lg:gap-px lg:overflow-visible lg:border lg:border-ink/10 lg:bg-ink/10 lg:px-0 lg:pb-0"
    style={`grid-template-columns: repeat(${perRow}, minmax(0, 1fr));`}
  >
    {#each table.rows as row, r (r)}
      <article class="w-[82%] max-w-[340px] shrink-0 snap-center border border-ink/10 bg-surface p-5 sm:w-[46%] lg:w-auto lg:max-w-none lg:border-0 lg:p-6">
        {#if months?.[r]}
          {@const on = months[r]}
          <div role="img" aria-label={span(on)}>
            <div class="grid grid-cols-12 gap-[3px]">
              {#each MONTH_INITIALS as _, m (m)}
                <span class={`h-1.5 ${on.includes(m) ? 'bg-emnel-gold' : 'bg-ink/10'}`}></span>
              {/each}
            </div>
            <div class="mt-1.5 grid grid-cols-12 gap-[3px] text-center text-[10px] leading-none" aria-hidden="true">
              {#each MONTH_INITIALS as letter, m (m)}
                <span class={on.includes(m) ? 'font-semibold text-heading' : 'text-ink/35'}>{letter}</span>
              {/each}
            </div>
          </div>
        {/if}
        <h4 class={`font-serif text-[22px] font-normal leading-tight text-heading ${months?.[r] ? 'mt-5' : ''}`}>{row[0]}</h4>
        {#if seasonCol > 0 && row[seasonCol]}
          <p class="mt-1 text-sm font-semibold text-clay">{row[seasonCol]}</p>
        {/if}
        <dl class="mt-4 grid gap-3.5">
          {#each table.columns as column, c (c)}
            {#if c > 0 && c !== seasonCol && row[c]}
              <div>
                {#if column}<dt class="text-[13px] text-ink/55">{column}</dt>{/if}
                <dd class="mt-0.5 text-[15px] leading-[1.6] text-ink/80">{row[c]}</dd>
              </div>
            {/if}
          {/each}
        </dl>
      </article>
    {/each}
  </div>
</div>

<style>
  /* The phone rail scrolls sideways without showing a bar. */
  .guide-columns {
    scrollbar-width: none;
  }
  .guide-columns::-webkit-scrollbar {
    display: none;
  }
</style>
