<script lang="ts">
  /**
   * The tour's price grid, edited as it appears on the tour page: one block per
   * comfort level with its lodges, child price and an adult price for each
   * group size (1, 2, 3–4, 5–6 travellers).
   *
   * Saved in one request (PUT /tours/:id/price-grid), which stores each level
   * as one pricing option per group size. Older single options (Essential,
   * Signature, Prestige…) are left alone; once a tour has a grid, the tour page
   * shows the grid instead of them. Kept outside the tour <form>, with its own
   * save button, like the FAQs below it.
   */
  import { onMount } from 'svelte';
  import { Save } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import { GRID_BANDS, TIER_KEYS, TIER_LABELS, isGridOption, normalizeTier, tourTierKeys, type TierKey } from '$lib/tiers';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import type { TourPriceOption } from '$lib/types';

  export let tourId: string;

  type TierRow = { tier: TierKey; lodges: string; child: string; prices: Record<string, string> };

  let rows: TierRow[] = [];
  let saved = '';
  let ticked: TierKey[] = [];
  let tickedAny = false;
  let budgetTier: TierKey | '' = '';
  let priceFrom = 0;
  let oldOptions = 0;
  let loading = true;
  let saving = false;
  let loadError = '';
  let message = '';
  let messageTone: 'ok' | 'error' = 'ok';

  const blankRow = (tier: TierKey): TierRow => ({
    tier,
    lodges: '',
    child: '',
    prices: Object.fromEntries(GRID_BANDS.map((band) => [band.key, '']))
  });

  const amount = (value: unknown) => {
    const n = Number(value);
    return value != null && value !== '' && Number.isFinite(n) && n > 0 ? String(n) : '';
  };

  const snapshot = (list: TierRow[]) => JSON.stringify(list.map((r) => [r.tier, r.lodges.trim(), r.child.trim(), GRID_BANDS.map((b) => r.prices[b.key].trim())]));

  const load = async () => {
    loading = true;
    loadError = '';
    try {
      const [optionsRes, tourRes] = await Promise.all([api.pricingOptions.byTour(tourId), api.tours.get(tourId)]);
      const options = (optionsRes.data ?? []) as unknown as TourPriceOption[];
      const tour = (tourRes.data ?? {}) as { comfort_tiers?: unknown; budget_tier?: string | null; price_from?: number | null };
      tickedAny = Array.isArray(tour.comfort_tiers) && tour.comfort_tiers.length > 0;
      ticked = tourTierKeys(tour);
      budgetTier = normalizeTier(tour.budget_tier);
      priceFrom = Number(tour.price_from ?? 0);

      const grid = options.filter(isGridOption);
      oldOptions = options.length - grid.length;
      rows = TIER_KEYS.map((tier) => {
        const row = blankRow(tier);
        const own = grid.filter((o) => normalizeTier(o.comfort_tier) === tier);
        for (const band of GRID_BANDS) {
          const match = own.find((o) => o.travellers_from === band.from && o.travellers_to === band.to);
          row.prices[band.key] = amount(match?.price);
        }
        const pair = own.find((o) => o.travellers_from === 2 && o.travellers_to === 2) ?? own[0];
        row.lodges = (pair?.lodges ?? own.find((o) => o.lodges)?.lodges ?? '').trim();
        row.child = amount(pair?.child_price ?? own.find((o) => o.child_price)?.child_price);
        return row;
      });
      saved = snapshot(rows);
    } catch (err) {
      loadError = err instanceof Error ? err.message : 'Unable to load the price grid.';
    } finally {
      loading = false;
    }
  };

  $: dirty = !loading && snapshot(rows) !== saved;
  $: filledTiers = rows.filter((r) => r.lodges.trim() || r.child.trim() || Object.values(r.prices).some((p) => p.trim()));
  $: hiddenTiers = tickedAny ? filledTiers.filter((r) => !ticked.includes(r.tier)) : [];
  $: budgetLowest = (() => {
    const row = rows.find((r) => r.tier === budgetTier);
    const prices = row ? Object.values(row.prices).map(Number).filter((n) => n > 0) : [];
    return prices.length ? Math.min(...prices) : 0;
  })();

  const invalid = () => {
    for (const row of rows) {
      for (const value of [row.child, ...Object.values(row.prices)]) {
        const v = value.trim();
        if (v && !(Number(v) >= 0 && Number(v) <= 1_000_000)) return `${TIER_LABELS[row.tier]}: “${v}” is not a price. Use digits only, e.g. 3500.`;
      }
      if (row.lodges.length > 500) return `${TIER_LABELS[row.tier]}: keep the lodges to 500 characters.`;
    }
    return '';
  };

  const save = async () => {
    message = '';
    const problem = invalid();
    if (problem) {
      messageTone = 'error';
      message = problem;
      return;
    }
    saving = true;
    try {
      await api.pricingOptions.saveGrid(tourId, {
        currency: 'USD',
        tiers: rows.map((row) => ({
          comfort_tier: row.tier,
          lodges: row.lodges.trim() || null,
          child_price: row.child.trim() === '' ? null : Number(row.child),
          bands: GRID_BANDS.map((band) => ({
            travellers_from: band.from,
            travellers_to: band.to,
            price: row.prices[band.key].trim() === '' ? null : Number(row.prices[band.key])
          }))
        }))
      });
      await load();
      messageTone = 'ok';
      message = 'Price grid saved. The tour page shows it within about 10 minutes.';
    } catch (err) {
      messageTone = 'error';
      message = err instanceof Error ? err.message : 'Unable to save the price grid.';
    } finally {
      saving = false;
    }
  };

  const usd = (n: number) => `US$${Math.round(n).toLocaleString('en-US')}`;

  onMount(load);

  const fieldClass =
    'w-full rounded-md border border-ink/15 bg-surface px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink/35 hover:border-ink/25 focus:border-forest focus:ring-2 focus:ring-forest/20';
</script>

<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
  <div>
    <h2 class="text-xl font-bold text-ink">Price grid</h2>
    <p class="mt-1 max-w-[78ch] text-sm leading-6 text-ink/60">
      Adult price per person in US$, by comfort level and group size, exactly as the tour page shows it. A guest who clicks a price gets the request form with that level and group size filled in. An empty price shows as “On request”; a level left completely empty is not shown.
    </p>
  </div>
</div>

{#if loading}
  <p class="mt-5 text-sm text-ink/55">Loading the price grid…</p>
{:else if loadError}
  <p class="mt-5 text-sm text-clay">{loadError}</p>
{:else}
  <div class="mt-5 grid gap-3">
    {#each rows as row (row.tier)}
      {@const shown = !tickedAny || ticked.includes(row.tier)}
      <section class="border border-ink/10 bg-savanna/20 p-4">
        <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 class="text-base font-bold text-ink">{TIER_LABELS[row.tier]}</h3>
          <span class="text-xs text-ink/55">
            {#if !shown}Not ticked under “Available comfort tiers”, so hidden on the site{:else if row.tier === budgetTier}The tour’s budget tier: the level the “From” price is for{/if}
          </span>
        </div>
        <label class="mt-3 grid gap-1.5">
          <span class="text-[13px] font-semibold text-ink/65">Lodges</span>
          <input class={fieldClass} bind:value={row.lodges} maxlength="500" placeholder="The lodges at this level, separated by commas" />
        </label>
        <div class="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
          {#each GRID_BANDS as band (band.key)}
            <label class="grid content-end gap-1.5" title={band.note ? `Shown as “${band.label}, ${band.note}”` : undefined}>
              <span class="text-[13px] font-semibold text-ink/65">{band.label}</span>
              <input class={`${fieldClass} [font-variant-numeric:tabular-nums]`} type="text" inputmode="decimal" autocomplete="off" bind:value={row.prices[band.key]} placeholder="On request" />
            </label>
          {/each}
          <label class="grid content-end gap-1.5">
            <span class="text-[13px] font-semibold text-ink/65">Child under 11</span>
            <input class={`${fieldClass} [font-variant-numeric:tabular-nums]`} type="text" inputmode="decimal" autocomplete="off" bind:value={row.child} placeholder="On request" />
          </label>
        </div>
      </section>
    {/each}
  </div>

  <div class="mt-4 grid gap-1.5 text-xs leading-5 text-ink/55">
    {#if hiddenTiers.length}
      <p class="text-clay">{hiddenTiers.map((r) => TIER_LABELS[r.tier]).join(', ')} {hiddenTiers.length === 1 ? 'has' : 'have'} prices but {hiddenTiers.length === 1 ? 'is' : 'are'} not ticked under “Available comfort tiers” above, so the tour page leaves {hiddenTiers.length === 1 ? 'it' : 'them'} out. Tick {hiddenTiers.length === 1 ? 'it' : 'them'} and save the tour to show {hiddenTiers.length === 1 ? 'it' : 'them'}.</p>
    {/if}
    {#if budgetTier && budgetLowest && priceFrom && Math.round(budgetLowest) !== Math.round(priceFrom)}
      <p>The “From” price is {usd(priceFrom)}; the lowest adult price at {TIER_LABELS[budgetTier]} here is {usd(budgetLowest)}. Cards show the “From” price, so you may want them to match.</p>
    {/if}
    {#if oldOptions && filledTiers.length}
      <p>This tour also has {oldOptions} older pricing {oldOptions === 1 ? 'option' : 'options'} (CMS › Pricing Options). With a grid saved, the tour page shows the grid instead of them.</p>
    {/if}
  </div>

  <div class="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <p class={`text-sm ${messageTone === 'error' ? 'text-clay' : 'text-ink/60'}`} role="status">
      {message || (dirty ? 'Unsaved changes. The grid saves separately from the tour.' : 'The grid saves separately from the tour.')}
    </p>
    <AdminButton on:click={save} disabled={saving || !dirty}>
      <Save size={16} />
      {saving ? 'Saving…' : 'Save price grid'}
    </AdminButton>
  </div>
{/if}
