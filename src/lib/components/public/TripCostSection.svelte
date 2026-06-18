<script lang="ts">
  import { Check, ShieldCheck } from '@lucide/svelte';

  // Cost confidence for a single trip (spec §4.4 G / §6).
  export let priceFrom: number | undefined = undefined;
  export let currency = 'USD';
  export let tourSlug = '';

  const fmt = (n: number) => n.toLocaleString();
  $: low = priceFrom ?? 0;
  // A realistic upper guide for "trips like this" — clearly framed as typical.
  $: high = priceFrom ? Math.round((priceFrom * 1.75) / 100) * 100 : 0;

  const drivers = [
    { label: 'Season', note: 'Peak vs. green-season dates' },
    { label: 'Group size', note: 'Per-person cost drops with more travellers' },
    { label: 'Lodge / camp tier', note: 'Comfort to luxury' },
    { label: 'Activities & extras', note: 'Balloon, extensions, private guiding' }
  ];
  $: planHref = `/plan-my-trip${tourSlug ? `?tour=${tourSlug}` : ''}`;
</script>

<section class="rounded-[8px] border border-ink/10 bg-white p-6 shadow-soft md:p-7">
  <h2 class="text-xl font-bold tracking-normal text-deep-green md:text-2xl">What this trip costs</h2>

  {#if priceFrom}
    <div class="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span class="text-3xl font-extrabold text-deep-green">{currency} {fmt(low)}</span>
      <span class="text-sm font-medium text-ink/55">per person, from</span>
    </div>
    <p class="mt-2 text-sm leading-6 text-ink/65">
      Most travellers on a trip like this spend between
      <span class="font-semibold text-ink">{currency} {fmt(low)}</span> and roughly
      <span class="font-semibold text-ink">{currency} {fmt(high)}</span> per person — your exact price depends on the choices below.
    </p>
  {:else}
    <p class="mt-3 text-sm leading-6 text-ink/65">
      Pricing is tailored to your dates, group and travel style. Tell us what you have in mind and we'll give you an honest, itemised quote.
    </p>
  {/if}

  <p class="mt-5 text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">What changes your price</p>
  <div class="mt-3 grid gap-3 sm:grid-cols-2">
    {#each drivers as d}
      <div class="flex items-start gap-2.5 rounded-xl border border-ink/10 bg-sand/30 p-3">
        <span class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-forest/10 text-forest"><Check size={12} strokeWidth={3} /></span>
        <span>
          <span class="block text-sm font-semibold text-ink">{d.label}</span>
          <span class="block text-xs leading-5 text-ink/55">{d.note}</span>
        </span>
      </div>
    {/each}
  </div>

  <div class="mt-5 flex items-start gap-3 rounded-2xl border border-forest/20 bg-forest/[0.05] p-4">
    <ShieldCheck size={20} class="mt-0.5 shrink-0 text-forest" />
    <p class="text-sm leading-6 text-ink/75">
      <span class="font-semibold text-ink">No hidden costs.</span>
      We itemise everything — park fees, lodges, transfers and extras — and confirm the full price before you decide.
    </p>
  </div>

  <a
    class="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-deep-green px-6 font-bold text-white transition hover:bg-forest"
    href={planHref}
  >
    Get your exact price
  </a>
</section>
