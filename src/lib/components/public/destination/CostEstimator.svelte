<script lang="ts">
  /**
   * What a private safari here costs: pick a comfort level, a length and a
   * group size, and read a starting budget. The figures are the guide's own
   * "starting from" prices per person per day, multiplied out, never more
   * precise than the guide is; the exact quote comes from the team. Below it,
   * the safaris here at the chosen level.
   */
  import { ArrowRight } from '@lucide/svelte';
  import { currency, formatUsdWhole } from '$lib/currency';
  import { TIER_LABELS, tierForTitle, tourTierKeys, type TierKey } from '$lib/tiers';
  import type { CostRow } from '$lib/guideLayout';
  import type { Tour } from '$lib/types';
  import { splitTourTitle } from './tourTitle';

  export let rows: CostRow[] = [];
  export let tours: Tour[] = [];
  export let adjName = '';
  export let toursHref = '/tours';
  export let planHref = '#plan';

  const LENGTHS = [5, 7, 10];
  const GROUPS = [1, 2, 4, 6];

  $: styles = rows
    .filter((row) => row.amount != null)
    .map((row) => {
      const tier = tierForTitle(row.style);
      return { ...row, tier, label: tier ? TIER_LABELS[tier] : row.style };
    });
  let picked = 0;
  let days = 5;
  let group = 2;
  $: style = styles[Math.min(picked, styles.length - 1)];
  $: perPerson = style ? (style.perDay != null ? style.perDay * days : style.amount ?? 0) : 0;
  $: groupTotal = perPerson * group;
  $: matching = style?.tier ? tours.filter((t) => tourTierKeys(t).includes(style.tier as TierKey)) : [];
  $: money = (n: number) => formatUsdWhole(n, $currency);
</script>

{#if style}
  <div class="grid border border-ink/10 md:grid-cols-2">
    <div class="bg-white p-6">
      <fieldset>
        <legend class="dest-label">Style</legend>
        <div class="mt-2.5 flex flex-wrap gap-2">
          {#each styles as option, i (option.style)}
            <button type="button" aria-pressed={picked === i} class={`h-10 border px-3.5 text-[13px] font-medium transition ${picked === i ? 'border-deep-green bg-deep-green text-white' : 'border-ink/15 text-heading hover:border-ink/40'}`} on:click={() => (picked = i)}>{option.label}</button>
          {/each}
        </div>
      </fieldset>
      {#if style.perDay != null}
        <fieldset class="mt-5">
          <legend class="dest-label">Length of safari</legend>
          <div class="mt-2.5 flex flex-wrap gap-2">
            {#each LENGTHS as n (n)}
              <button type="button" aria-pressed={days === n} class={`h-10 border px-3.5 text-[13px] font-medium transition ${days === n ? 'border-deep-green bg-deep-green text-white' : 'border-ink/15 text-heading hover:border-ink/40'}`} on:click={() => (days = n)}>{n} days</button>
            {/each}
          </div>
        </fieldset>
      {/if}
      <fieldset class="mt-5">
        <legend class="dest-label">Travellers</legend>
        <div class="mt-2.5 flex flex-wrap gap-2">
          {#each GROUPS as n (n)}
            <button type="button" aria-pressed={group === n} class={`h-10 min-w-[44px] border px-3 text-[13px] font-medium transition ${group === n ? 'border-deep-green bg-deep-green text-white' : 'border-ink/15 text-heading hover:border-ink/40'}`} on:click={() => (group = n)}>{n === 6 ? '6+' : n}</button>
          {/each}
        </div>
      </fieldset>
    </div>

    <div class="bg-deep-green p-6 text-white" aria-live="polite">
      <p class="dest-label-dark">{style.perDay != null ? `${days}-day ` : ''}{style.label} safari · {group === 6 ? '6+' : group} traveller{group === 1 ? '' : 's'}</p>
      <p class="mt-3 text-[14px] text-white/75">Budget from</p>
      <p class="mt-1 font-serif text-[40px] font-normal leading-none">{money(perPerson)}</p>
      <p class="mt-2 text-[14px] leading-[1.6] text-white/80">
        per person{#if group > 1} · from {money(groupTotal)} for {group === 6 ? 'six' : group} of you{/if}
      </p>
      <p class="mt-4 border-t border-white/10 pt-4 text-[12px] leading-[1.6] text-white/65">
        {#if style.perDay != null}Starting from {money(style.perDay)} per person per day at this level{:else}{style.text}{/if}{#if style.suits}: {style.suits.charAt(0).toLowerCase() + style.suits.slice(1)}{/if}. Your exact price depends on the season, the lodges and your group.
      </p>
      <a class="mt-5 inline-flex h-11 items-center bg-emnel-gold px-5 text-[14px] font-semibold text-deep-green transition hover:bg-savanna" href={planHref}>Get my exact quote</a>
    </div>
  </div>

  {#if matching.length}
    <div class="mt-8">
      <div class="flex flex-wrap items-baseline justify-between gap-3">
        <h3 class="text-[17px] font-semibold text-heading">{style.label} {adjName} itineraries</h3>
        <a class="group inline-flex items-center gap-1 text-[14px] font-semibold text-forest transition hover:text-heading" href={toursHref}>
          View all {adjName} safaris <ArrowRight size={15} class="transition group-hover:translate-x-0.5" />
        </a>
      </div>
      <ul class="mt-4 grid gap-3">
        {#each matching.slice(0, 3) as tour (tour.id)}
          {@const parts = splitTourTitle(tour.title)}
          <li class="border border-ink/10 bg-white p-5">
            <p class="dest-label">{style.label}{tour.duration_days ? ` · ${tour.duration_days} days` : ''}</p>
            <a class="mt-1.5 block font-serif text-[20px] leading-tight text-heading transition hover:text-forest" href={`/tours/${tour.slug}`}>{parts.name}</a>
            {#if parts.route}<p class="mt-1 text-[13px] text-ink/60">{parts.route}</p>{/if}
            {#if tour.price_from}
              <p class="mt-3 text-[14px] text-ink/75">From <span class="font-semibold text-heading">{money(Number(tour.price_from))}</span> pp · <a class="font-semibold text-forest hover:text-heading" href={`/tours/${tour.slug}`}>View →</a></p>
            {/if}
          </li>
        {/each}
      </ul>
    </div>
  {/if}
{/if}
