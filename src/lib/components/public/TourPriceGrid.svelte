<script lang="ts">
  /**
   * "Prices for this safari": comfort level x group size (Nelson's brief,
   * 16 Nov 2026). Every adult price opens the request form at step 2 with that
   * level and group size filled in; an empty cell says "On request" and opens
   * it too. Below the grid, "Plan this trip" opens the form at step 1.
   *
   * Wide screens get a table; phones get one card per comfort level, each
   * listing the traveller rows, with every price at least 44px tall.
   */
  import { createEventDispatcher } from 'svelte';
  import { ArrowRight, MessageCircle } from '@lucide/svelte';
  import { currency, formatUsdWhole } from '$lib/currency';
  import type { GridBand, GridColumn, TierKey } from '$lib/tiers';

  export let columns: GridColumn[] = [];
  /** The first sentence under the heading; the site adds the call to choose. */
  export let note = '';
  export let waHref = '';

  const dispatch = createEventDispatcher<{ cell: { tier: TierKey; band: GridBand }; plan: void; whatsapp: void }>();

  $: intro = `${(note || '').trim() || 'Per person, sharing.'} Choose your comfort level and group size to request this safari.`;
  // Four levels need more room than three before the table fits beside its labels.
  $: wide = columns.length >= 4 ? 'lg' : 'md';
  $: bands = columns[0]?.cells.map((cell) => cell.band) ?? [];

  const price = (amount: number | null) => (amount ? formatUsdWhole(amount, $currency) : '');
</script>

<h2 class="type-h2 mt-4 text-heading">Prices for this safari</h2>
<p class="mt-4 max-w-[680px] text-base leading-[1.75] text-ink/70">{intro}</p>

<!-- Table: wide screens -->
<div class={`mt-8 hidden border border-ink/10 bg-surface ${wide === 'lg' ? 'lg:block' : 'md:block'}`}>
  <div class="grid" style={`grid-template-columns: minmax(150px, 0.8fr) repeat(${columns.length}, minmax(0, 1fr));`} role="table" aria-label="Prices per person by comfort level and group size">
    <div class="contents" role="row">
      <div class="flex items-end border-b border-ink/10 px-5 pb-4 pt-6 text-[13px] text-ink/60" role="columnheader">Travellers</div>
      {#each columns as column (column.tier)}
        <div class="border-b border-l border-ink/10 px-4 pb-4 pt-6" role="columnheader">
          <h3 class="font-serif text-[24px] font-normal leading-tight text-heading">{column.label}</h3>
          {#if column.lodges}
            <p class="mt-2 text-[12.5px] leading-[1.55] text-ink/60">{column.lodges}</p>
          {/if}
        </div>
      {/each}
    </div>

    {#each bands as band, row (band.key)}
      <div class="contents" role="row">
        <div class="flex flex-col justify-center border-b border-ink/[0.07] px-5 py-3" role="rowheader">
          <span class="text-[15px] font-semibold text-heading">{band.label}</span>
          {#if band.note}<span class="text-[12.5px] text-ink/55">{band.note}</span>{/if}
        </div>
        {#each columns as column (column.tier)}
          {@const amount = column.cells[row]?.price ?? null}
          <div class="border-b border-l border-ink/[0.07] p-2.5" role="cell">
            <button
              class="price-cell group flex min-h-[64px] w-full flex-col justify-center border border-ink/15 bg-surface px-4 py-2.5 text-left transition hover:border-clay hover:bg-savanna/45 focus-visible:border-clay focus-visible:bg-savanna/45 focus-visible:outline-none"
              type="button"
              aria-label={`Request ${column.label}, ${band.label}: ${amount ? `${price(amount)} per person` : 'price on request'}`}
              on:click={() => dispatch('cell', { tier: column.tier, band })}
            >
              {#if amount}
                <span class="text-[17px] font-bold leading-tight text-heading [font-variant-numeric:tabular-nums]">{price(amount)}</span>
              {:else}
                <span class="text-[15px] font-semibold leading-tight text-heading">On request</span>
              {/if}
              <span class="mt-0.5 text-[12px] text-ink/55 group-hover:text-clay group-focus-visible:text-clay">
                {amount ? 'per person' : 'ask for a price'}<span class="cell-cta">&nbsp;· Request this <ArrowRight size={11} class="inline -translate-y-px" /></span>
              </span>
            </button>
          </div>
        {/each}
      </div>
    {/each}

    <div class="contents" role="row">
      <div class="flex flex-col justify-center bg-savanna/25 px-5 py-4" role="rowheader">
        <span class="text-[15px] font-semibold text-heading">Child under 11</span>
        <span class="text-[12.5px] text-ink/55">sharing with adults</span>
      </div>
      {#each columns as column (column.tier)}
        <div class="flex items-center border-l border-ink/[0.07] bg-savanna/25 px-6 py-4" role="cell">
          <span class="text-[15px] font-semibold text-heading [font-variant-numeric:tabular-nums]">{column.child ? price(column.child) : 'On request'}</span>
        </div>
      {/each}
    </div>
  </div>
</div>

<!-- Cards: phones and small tablets -->
<div class={`mt-7 grid gap-4 ${wide === 'lg' ? 'lg:hidden' : 'md:hidden'}`}>
  {#each columns as column (column.tier)}
    <article class="border border-ink/10 bg-surface">
      <header class="border-b border-ink/10 px-4 pb-3.5 pt-4">
        <h3 class="font-serif text-[24px] font-normal leading-tight text-heading">{column.label}</h3>
        {#if column.lodges}<p class="mt-1.5 text-[13px] leading-[1.55] text-ink/60">{column.lodges}</p>{/if}
      </header>
      <ul>
        {#each column.cells as cell (cell.band.key)}
          <li class="flex items-center justify-between gap-3 border-b border-ink/[0.07] px-4 py-2">
            <span class="min-w-0">
              <span class="block text-[15px] font-semibold text-heading">{cell.band.label}</span>
              {#if cell.band.note}<span class="block text-[12.5px] text-ink/55">{cell.band.note}</span>{/if}
            </span>
            <button
              class="flex min-h-11 min-w-[132px] shrink-0 flex-col items-end justify-center border border-ink/15 px-3 py-1.5 text-right transition hover:border-clay hover:bg-savanna/45"
              type="button"
              aria-label={`Request ${column.label}, ${cell.band.label}: ${cell.price ? `${price(cell.price)} per person` : 'price on request'}`}
              on:click={() => dispatch('cell', { tier: column.tier, band: cell.band })}
            >
              <span class="text-[16px] font-bold leading-tight text-heading [font-variant-numeric:tabular-nums]">{cell.price ? price(cell.price) : 'On request'}</span>
              <span class="text-[11.5px] text-ink/55">{cell.price ? 'per person' : 'ask for a price'}</span>
            </button>
          </li>
        {/each}
        <li class="flex items-center justify-between gap-3 bg-savanna/25 px-4 py-3">
          <span>
            <span class="block text-[15px] font-semibold text-heading">Child under 11</span>
            <span class="block text-[12.5px] text-ink/55">sharing with adults</span>
          </span>
          <span class="pr-3 text-[15px] font-semibold text-heading [font-variant-numeric:tabular-nums]">{column.child ? price(column.child) : 'On request'}</span>
        </li>
      </ul>
    </article>
  {/each}
</div>

<div class="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
  <p class="max-w-[60ch] text-sm leading-[1.6] text-ink/65">
    Indicative prices. Nelson confirms your exact route and quote within 24 hours. No payment needed to ask.
  </p>
  <div class="flex shrink-0 flex-col gap-2.5 sm:flex-row">
    <button class="inline-flex min-h-12 items-center justify-center gap-2 bg-deep-green px-6 text-[14px] font-semibold text-white transition hover:bg-forest" type="button" on:click={() => dispatch('plan')}>
      Plan this trip <ArrowRight size={15} />
    </button>
    {#if waHref}
      <a class="inline-flex min-h-12 items-center justify-center gap-2 border border-ink/20 bg-surface px-6 text-[14px] font-semibold text-heading transition hover:border-deep-green" href={waHref} target="_blank" rel="noopener noreferrer" on:click={() => dispatch('whatsapp')}>
        <MessageCircle size={16} /> Ask on WhatsApp
      </a>
    {/if}
  </div>
</div>

<style>
  /* "Request this" shows on hover and keyboard focus only, as in the layout. */
  .cell-cta {
    display: none;
  }
  .price-cell:hover .cell-cta,
  .price-cell:focus-visible .cell-cta {
    display: inline;
  }
  @media (hover: none) {
    .price-cell:hover .cell-cta {
      display: none;
    }
  }
</style>
