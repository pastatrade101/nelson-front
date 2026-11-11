<script lang="ts">
  import { AlertTriangle, ClipboardList, Trophy } from '@lucide/svelte';
  import ChartCanvas from '../ChartCanvas.svelte';
  import AnalyticsEmpty from '../AnalyticsEmpty.svelte';
  import BreakdownBars from '../ux/BreakdownBars.svelte';
  import { funnelConfig } from '$lib/charts';
  import { CHANNEL_ACCENT, type MainLeadsItinerary } from './types';

  // Itinerary form on the tour pages: opened → started → details → submitted
  // (distinct sessions the tracker followed — each stage holds everyone who got
  // further, so it only narrows; the card's lead count is the database's), the hand-off rate
  // between each stage with the weakest one flagged, and which tours the
  // enquiries were for.
  export let itinerary: MainLeadsItinerary;
  /** Saved itinerary enquiries in the range (the card's figure). */
  export let leads = 0;

  const accent = CHANNEL_ACCENT.itinerary_form;

  $: stages = itinerary?.funnel ?? [];
  $: hasFunnel = stages.some((s) => s.value > 0);
  $: cfg = funnelConfig(stages.map((s) => ({ label: s.label, value: s.value })));
  // Stage-to-stage hand-off: what share of the previous stage made it here.
  $: handoffs = stages.slice(1).map((s, i) => {
    const prev = stages[i].value;
    return { key: s.key, from: stages[i].label, to: s.label, rate: prev > 0 ? Math.min(100, Math.round((s.value / prev) * 1000) / 10) : null };
  });
  $: weakest = handoffs.filter((h) => h.rate != null).sort((a, b) => (a.rate ?? 0) - (b.rate ?? 0))[0] ?? null;
  $: opened = stages[0]?.value ?? 0;
  $: submitted = stages.find((s) => s.key === 'submitted')?.value ?? 0;
</script>

<div class="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
  <div class="rounded-2xl border border-ink/10 bg-surface p-4 shadow-[0_1px_2px_rgba(28,26,22,0.04)] sm:p-5">
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div>
        <p class="flex items-center gap-1.5 text-[13px] font-bold text-ink/80"><ClipboardList size={15} class="text-ink/45" /> Itinerary form funnel</p>
        <p class="mt-0.5 text-[11px] text-ink/45">Visitors the tracker followed on tour and booking pages (those who declined analytics are counted as leads, not here).</p>
      </div>
      {#if opened > 0}
        <span class="rounded-full bg-forest/10 px-2.5 py-1 text-[11px] font-bold text-forest dark:text-emnel-gold" title="Submitted ÷ opened">
          {Math.min(100, Math.round((submitted / opened) * 1000) / 10)}% opened → submitted
        </span>
      {/if}
    </div>

    {#if hasFunnel}
      <div class="mt-3"><ChartCanvas {...cfg} height={200} /></div>
      <div class={`mt-3 grid grid-cols-1 gap-2 ${handoffs.length > 1 ? 'lg:grid-cols-3' : ''}`}>
        {#each handoffs as h (h.key)}
          {@const isWeak = handoffs.length > 1 && weakest?.key === h.key}
          <div class={`rounded-xl border p-3 ${isWeak ? 'border-amber-300/70 bg-amber-50/50 dark:bg-amber-500/[0.08]' : 'border-ink/[0.07] bg-sand/20'}`}>
            <p class="flex items-center gap-1 text-xl font-extrabold text-heading tabular-nums">
              {h.rate == null ? '—' : `${h.rate}%`}
              {#if isWeak}<AlertTriangle size={14} class="text-amber-600" />{/if}
            </p>
            <p class="mt-0.5 text-[11px] font-semibold text-ink/55">{h.from} → {h.to}</p>
            {#if isWeak}<p class="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">Weakest hand-off</p>{/if}
          </div>
        {/each}
      </div>
    {:else}
      <div class="mt-3">
        {#if leads > 0}
          <!-- The card counts these enquiries; the tracker saw none of these visits. -->
          <AnalyticsEmpty icon={ClipboardList} title="No tracked form visits in this range" minHeight={220}
            description={`${leads.toLocaleString()} itinerary enquir${leads === 1 ? 'y was' : 'ies were'} sent in this range from visits the tracker didn't follow (for example, visitors who declined analytics).`} />
        {:else}
          <AnalyticsEmpty icon={ClipboardList} title="No itinerary form activity yet" minHeight={220}
            description={itinerary?.stepsTracked === false
              ? 'When visitors see the “Request this trip” form on a tour page, how many saw it and how many sent it is counted here.'
              : 'When visitors open the “Request this trip” form on a tour page, each stage — opened, started, details, submitted — is counted here.'} />
        {/if}
      </div>
    {/if}
  </div>

  <div class="grid grid-cols-1 content-start gap-4">
    <BreakdownBars title="Top tours by itinerary leads" source="website" rows={itinerary?.topTours ?? []} icon={Trophy} {accent}
      emptyText="No tour enquiries in this period yet." />
    <div class={`rounded-2xl border p-4 shadow-[0_1px_2px_rgba(28,26,22,0.04)] ${itinerary?.submitErrors ? 'border-red-300/60 bg-red-50/40 dark:bg-red-500/[0.06]' : 'border-ink/10 bg-surface'}`}>
      <p class="flex items-center gap-1 text-[11px] font-semibold text-ink/55">{#if itinerary?.submitErrors}<AlertTriangle size={11} class="text-red-500" />{/if}Submit errors</p>
      <p class="mt-1 text-2xl font-extrabold text-heading tabular-nums">{(itinerary?.submitErrors ?? 0).toLocaleString()}</p>
      <p class="mt-0.5 text-[11px] leading-4 text-ink/45">
        {itinerary?.submitErrors ? 'Visitors pressed send and the request failed — they may have given up. Check the API logs for these times.' : 'No failed sends in this period.'}
      </p>
    </div>
  </div>
</div>
