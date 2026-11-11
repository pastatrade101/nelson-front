<script lang="ts">
  import { AlertTriangle, Bed, Compass, DoorOpen, ListChecks, Map as MapIcon, Route, ShieldAlert, Wallet } from '@lucide/svelte';
  import AnalyticsEmpty from '../AnalyticsEmpty.svelte';
  import BreakdownBars from '../ux/BreakdownBars.svelte';
  import { CHANNEL_ACCENT, prettyRows, type MainLeadsPlanner } from './types';

  // Plan My Trip — the 7-step planner. Per step: how many sessions reached it,
  // how many completed it, and the share that left there; the worst step is
  // flagged. Next to it: where visitors abandon and which fields they trip on,
  // then what the submitted plans asked for (from the saved enquiries).
  export let planner: MainLeadsPlanner;
  export let opened: number | null = null;
  export let leads = 0;

  const accent = CHANNEL_ACCENT.plan_my_trip;

  /** The site reports the planner as opened and sent only — steps, abandons and field errors are not measured. */
  $: stepsOff = planner?.stepsTracked === false;
  $: steps = planner?.steps ?? [];
  $: max = Math.max(1, ...steps.map((s) => Math.max(s.reached, s.completed)));
  $: hasSteps = steps.some((s) => s.reached > 0 || s.completed > 0);
  // Worst = the highest drop-off among steps anyone actually reached.
  $: worst = steps.filter((s) => s.reached > 0 && s.dropOffPct > 0).sort((a, b) => b.dropOffPct - a.dropOffPct)[0] ?? null;
  $: first = steps[0]?.reached ?? 0;
  $: submitted = steps.length ? steps[steps.length - 1].completed : 0;
  $: overall = first > 0 ? Math.round((submitted / first) * 1000) / 10 : null;
  $: abandoned = (planner?.abandonedAt ?? []).reduce((a, r) => a + r.value, 0);
  $: hasAsked = [planner?.byTripType, planner?.byStage, planner?.byComfort, planner?.byBudget].some((t) => (t ?? []).some((r) => r.value > 0));
</script>

<div class="grid grid-cols-1 gap-4">
  <div class="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
    <!-- 7-step drop-off -->
    <div class="rounded-2xl border border-ink/10 bg-surface p-4 shadow-[0_1px_2px_rgba(28,26,22,0.04)] sm:p-5">
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p class="flex items-center gap-1.5 text-[13px] font-bold text-ink/80"><Route size={15} class="text-ink/45" /> Step-by-step drop-off</p>
          <p class="mt-0.5 text-[11px] text-ink/45">Sessions that reached each step, and how many went on to complete it.</p>
        </div>
        {#if overall != null}
          <span class="rounded-full bg-forest/10 px-2.5 py-1 text-[11px] font-bold text-forest dark:text-emnel-gold" title="Submitted ÷ opened">
            {overall}% opened → submitted
          </span>
        {/if}
      </div>

      {#if hasSteps}
        <!-- legend (two series: reached / completed) -->
        <div class="mt-3 flex flex-wrap items-center gap-3 text-[10px] font-semibold text-ink/50">
          <span class="inline-flex items-center gap-1.5"><span class="h-2 w-3.5 rounded-sm" style={`background:${accent}40`}></span>Reached</span>
          <span class="inline-flex items-center gap-1.5"><span class="h-2 w-3.5 rounded-sm" style={`background:${accent}`}></span>Completed</span>
          <span class="inline-flex items-center gap-1.5"><AlertTriangle size={11} class="text-amber-600" />Biggest drop-off</span>
        </div>

        <ol class="mt-3 grid grid-cols-1 gap-2">
          {#each steps as s (s.index)}
            {@const isWorst = worst?.index === s.index}
            <li
              class={`rounded-xl border px-3 py-2.5 ${isWorst ? 'border-amber-300/70 bg-amber-50/50 dark:bg-amber-500/[0.08]' : 'border-ink/[0.07] bg-sand/20'}`}
              title={`${s.label}: ${s.reached.toLocaleString()} reached, ${s.completed.toLocaleString()} completed, ${s.dropOffPct}% left here`}
            >
              <!-- label + drop-off on top, the bar and its numbers underneath, so
                   long step names stay readable on a phone -->
              <div class="flex items-center justify-between gap-2">
                <p class="flex min-w-0 items-center gap-2 text-[12px] font-bold text-ink/80">
                  <span class="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ink/[0.06] text-[10px] font-extrabold text-ink/55">{s.index + 1}</span>
                  <span class="min-w-0 leading-4">{s.label}</span>
                </p>
                <span
                  class={`inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${isWorst ? 'bg-amber-500/15 text-amber-700' : 'bg-ink/[0.05] text-ink/55'}`}
                >
                  {#if isWorst}<AlertTriangle size={10} />{/if}{s.dropOffPct}% drop
                </span>
              </div>
              <div class="mt-1.5 flex items-center gap-2.5">
                <div class="relative h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-ink/[0.06]" aria-hidden="true">
                  <div class="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500" style={`width:${(s.reached / max) * 100}%;background:${accent}40`}></div>
                  <div class="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500" style={`width:${(s.completed / max) * 100}%;background:${accent}`}></div>
                </div>
                <span class="shrink-0 text-[11px] font-semibold text-ink/55 tabular-nums">{s.reached.toLocaleString()} → <span class="font-bold text-ink/80">{s.completed.toLocaleString()}</span></span>
              </div>
            </li>
          {/each}
        </ol>

        {#if worst}
          <p class="mt-3 flex items-start gap-2 rounded-xl border border-amber-300/60 bg-amber-50/40 px-3 py-2.5 text-[12px] leading-5 text-ink/70 dark:bg-amber-500/[0.06]">
            <AlertTriangle size={15} class="mt-0.5 shrink-0 text-amber-600" />
            <span><span class="font-bold text-ink/85">“{worst.label}” loses the most people</span> — {worst.dropOffPct}% of the {worst.reached.toLocaleString()} who reached it did not finish it. Watch those sessions in Clarity: filter recordings by the custom tag <code class="rounded bg-ink/[0.06] px-1 text-[11px]">form_name</code> = <code class="rounded bg-ink/[0.06] px-1 text-[11px]">plan_my_trip</code>.</span>
          </p>
        {/if}
      {:else}
        <div class="mt-3">
          {#if planner?.stepsTracked === false}
            <!-- The site reports the planner as opened and sent only — no per-step events. -->
            <AnalyticsEmpty icon={MapIcon} title="Step tracking isn't set up for Plan My Trip" minHeight={220}
              description={`The site records when the planner is opened and when a plan is sent — ${(opened ?? 0).toLocaleString()} opened and ${leads.toLocaleString()} sent in this range — but not each of the seven steps, so where people stop can't be shown yet.`}
              hint="Adding step events to the planner fills in this chart." />
          {:else if (opened ?? 0) > 0 || leads > 0}
            <AnalyticsEmpty icon={MapIcon} title="No step-by-step data for this range yet" minHeight={220}
              description={`${(opened ?? 0).toLocaleString()} visitors opened the planner and ${leads.toLocaleString()} sent a plan in this range, but none of those visits reported their steps.`} />
          {:else}
            <AnalyticsEmpty icon={MapIcon} title="No planner sessions in this range" minHeight={220}
              description="Each time someone opens Plan My Trip, the seven steps fill in here — reached, completed and where they leave." />
          {/if}
        </div>
      {/if}
    </div>

    <!-- where they leave + what blocks them -->
    <div class="grid grid-cols-1 content-start gap-4">
      <BreakdownBars title="Where visitors abandon" source="website" rows={planner?.abandonedAt ?? []} icon={DoorOpen} accent="#B45309"
        emptyText={stepsOff ? "Not tracked yet — the planner doesn't report where people leave." : 'No abandoned planners recorded in this period.'} />
      <BreakdownBars title="Top validation errors" source="website" rows={planner?.validationErrors ?? []} icon={ShieldAlert} accent="#AA3D1D"
        emptyText={stepsOff ? "Not tracked yet — the planner doesn't report field errors." : 'No field errors — visitors are getting through each step cleanly.'} />
      <div class="grid grid-cols-2 gap-3">
        <div class="rounded-2xl border border-ink/10 bg-surface p-4 shadow-[0_1px_2px_rgba(28,26,22,0.04)]">
          <p class="text-[11px] font-semibold text-ink/55">Abandoned</p>
          {#if stepsOff}
            <p class="mt-1 text-2xl font-extrabold text-ink/30 tabular-nums">—</p>
            <p class="mt-0.5 text-[10px] text-ink/40">not tracked yet</p>
          {:else}
            <p class="mt-1 text-2xl font-extrabold text-heading tabular-nums">{abandoned.toLocaleString()}</p>
            <p class="mt-0.5 text-[10px] text-ink/40">{opened != null ? `of ${opened.toLocaleString()} opened` : 'sessions'}</p>
          {/if}
        </div>
        <div class={`rounded-2xl border p-4 shadow-[0_1px_2px_rgba(28,26,22,0.04)] ${planner?.submitErrors ? 'border-red-300/60 bg-red-50/40 dark:bg-red-500/[0.06]' : 'border-ink/10 bg-surface'}`}>
          <p class="flex items-center gap-1 text-[11px] font-semibold text-ink/55">{#if planner?.submitErrors}<AlertTriangle size={11} class="text-red-500" />{/if}Submit errors</p>
          <p class="mt-1 text-2xl font-extrabold text-heading tabular-nums">{(planner?.submitErrors ?? 0).toLocaleString()}</p>
          <p class="mt-0.5 text-[10px] text-ink/40">{planner?.submitErrors ? 'sending failed — check the API' : `${leads.toLocaleString()} sent fine`}</p>
        </div>
      </div>
    </div>
  </div>

  <!-- what the submitted plans asked for -->
  <div>
    <p class="mb-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-ink/40">What planners asked for · submitted enquiries</p>
    {#if hasAsked}
      <div class="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-4">
        <BreakdownBars title="Trip types" source="website" rows={prettyRows(planner?.byTripType)} icon={Compass} {accent} emptyText="No trip types yet." />
        <BreakdownBars title="Stage" source="website" rows={prettyRows(planner?.byStage)} icon={ListChecks} {accent} emptyText="No planning stages yet." />
        <BreakdownBars title="Comfort" source="website" rows={prettyRows(planner?.byComfort)} icon={Bed} {accent} emptyText="No comfort choices yet." />
        <BreakdownBars title="Budget" source="website" rows={prettyRows(planner?.byBudget)} icon={Wallet} {accent} emptyText="No budgets yet." />
      </div>
    {:else}
      <p class="rounded-xl border border-dashed border-ink/10 bg-sand/20 px-4 py-5 text-center text-[12px] leading-5 text-ink/45">Trip types, planning stage, comfort and budget appear here once planners submit their trip.</p>
    {/if}
  </div>
</div>
