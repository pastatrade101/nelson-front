<script lang="ts">
  import { ArrowDownRight, ArrowRight, ArrowUpRight, CircleCheck, Lightbulb, OctagonAlert, Target, TrendingUp } from '@lucide/svelte';
  import type { MainLeadsData } from './types';
  import { readingFailed, type Interpretation } from './interpretation';

  // The overview deliberately uses only figures already present in the
  // main-leads report and the deterministic interpretation. It answers three
  // owner questions without inventing a score: how much demand arrived, where
  // it came from, and the next evidence-backed thing to review.
  export let data: MainLeadsData | null = null;
  export let interpretation: Interpretation | null = null;
  export let loading = false;
  export let rangeLabel = '';
  export let onNavigate: (anchor: string) => void = () => {};

  type Tone = 'problem' | 'watch' | 'opportunity' | 'win';
  $: report = data && data.ok !== false ? data : null;
  $: channels = report?.channels ?? [];
  $: totalLeads = channels.reduce((total, channel) => total + channel.leads, 0);
  $: previousLeads = channels.reduce((total, channel) => total + channel.previous, 0);
  $: leadDifference = totalLeads - previousLeads;
  $: leadChange = previousLeads > 0 ? Math.round((leadDifference / previousLeads) * 100) : null;
  $: tinyComparison = previousLeads > 0 && previousLeads < 5;
  $: leadChangeText = previousLeads === 0
    ? totalLeads > 0 ? 'No main leads in the previous period' : 'No comparison data yet'
    : tinyComparison
      ? `${leadDifference >= 0 ? '+' : ''}${leadDifference.toLocaleString()} vs ${previousLeads.toLocaleString()} before`
      : `${leadChange != null && leadChange >= 0 ? '+' : ''}${leadChange ?? 0}% vs previous period`;
  $: rankedChannels = [...channels].sort((a, b) => b.leads - a.leads);
  $: leadChannel = rankedChannels[0] ?? null;
  $: bestChannelText = leadChannel
    ? `${leadChannel.label} accounts for ${totalLeads > 0 ? Math.round((leadChannel.leads / totalLeads) * 100) : 0}% of main leads`
    : 'Lead channels will appear once activity arrives';

  $: safeInterpretation = !readingFailed(interpretation) ? interpretation : null;
  // Problems and watches are more urgent than opportunities and wins. The
  // server has already ranked findings within that order, so keep its order.
  $: nextMove = (safeInterpretation?.findings ?? []).find((finding) => Boolean(finding.action)) ?? null;
  $: nextTone = (nextMove?.kind ?? 'win') as Tone;
  $: nextAnchor = nextMove?.anchor || '#sec-interpretation';
  $: nextLabel = nextTone === 'problem' ? 'Fix first' : nextTone === 'watch' ? 'Watch closely' : nextTone === 'opportunity' ? 'Best opportunity' : 'Working well';

  const toneClass: Record<Tone, string> = {
    problem: 'bg-red-500/[0.14] text-red-100 ring-red-300/25',
    watch: 'bg-amber-400/[0.16] text-amber-50 ring-amber-200/25',
    opportunity: 'bg-emnel-gold/[0.16] text-emnel-gold ring-emnel-gold/25',
    win: 'bg-emerald-400/[0.16] text-emerald-50 ring-emerald-200/25'
  };
  const toneBar: Record<Tone, string> = {
    problem: 'bg-red-400', watch: 'bg-amber-300', opportunity: 'bg-emnel-gold', win: 'bg-emerald-400'
  };
  const toneIcon: Record<Tone, typeof Target> = {
    problem: OctagonAlert, watch: TrendingUp, opportunity: Lightbulb, win: CircleCheck
  };

  const go = (anchor: string) => onNavigate(anchor);
</script>

<section class="overflow-hidden rounded-2xl border border-deep-green/20 bg-deep-green text-white shadow-[0_18px_45px_-28px_rgba(17,48,44,0.75)]" aria-labelledby="decision-deck-title" aria-busy={loading} aria-live="polite">
  <div class="relative overflow-hidden px-4 py-4 sm:px-5 sm:py-5">
    <div class="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-emnel-gold/[0.13] blur-3xl" aria-hidden="true"></div>
    <div class="pointer-events-none absolute -bottom-24 left-[32%] h-48 w-48 rounded-full bg-emerald-300/[0.08] blur-3xl" aria-hidden="true"></div>

    <div class="relative">
      <div class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-emnel-gold">Performance snapshot</p>
          <h3 id="decision-deck-title" class="mt-1 text-lg font-bold leading-tight text-white sm:text-xl">Lead activity at a glance</h3>
          <p class="mt-1 text-xs leading-5 text-white/60">{rangeLabel} · first-party tracking and lead records</p>
        </div>
        <p class="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">Updates with the selected range</p>
      </div>

      <div class="mt-4 grid min-w-0 divide-y divide-white/10 xl:grid-cols-[minmax(0,0.82fr)_minmax(0,1.1fr)_minmax(0,1.15fr)] xl:divide-x xl:divide-y-0">
      <div class="flex min-w-0 flex-col justify-between py-4 first:pt-0 xl:py-0 xl:pr-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">Main lead activity</p>
        {#if loading && !report}
          <div class="mt-3 h-12 w-36 animate-pulse rounded-xl bg-white/10"></div>
        {:else if report}
          <div class="mt-3 flex items-end gap-3">
            <p class="text-4xl font-extrabold tracking-tight tabular-nums text-white sm:text-5xl">{totalLeads.toLocaleString()}</p>
            <div class="pb-1">
              <p class="text-xs font-bold text-white/85">main lead{totalLeads === 1 ? '' : 's'}</p>
              <p class={`mt-0.5 flex items-center gap-1 text-[11px] font-semibold ${leadDifference < 0 ? 'text-red-200' : 'text-emerald-200'}`}>
                {#if previousLeads > 0}
                  {#if leadDifference >= 0}<ArrowUpRight size={13} />{:else}<ArrowDownRight size={13} />{/if}
                {/if}
                {leadChangeText}
              </p>
            </div>
          </div>
        {:else}
          <p class="mt-3 text-sm text-white/60">Lead data could not be read for this period.</p>
        {/if}
      </div>

      <div class="min-w-0 py-4 xl:px-5 xl:py-0">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">Leading channel</p>
            <p class="mt-1 text-sm font-bold text-white">{bestChannelText}</p>
          </div>
          <button type="button" on:click={() => go('#sec-main-leads')} class="shrink-0 rounded-lg border border-white/15 bg-white/[0.07] px-2.5 py-1.5 text-[11px] font-bold text-white/80 transition hover:bg-white/[0.14] focus:outline-none focus-visible:ring-2 focus-visible:ring-emnel-gold">
            Lead report <ArrowRight size={12} class="ml-1 inline" />
          </button>
        </div>

        {#if loading && !report}
          <div class="mt-4 grid gap-2.5">{#each Array(3) as _}<div class="h-7 animate-pulse rounded-lg bg-white/[0.08]"></div>{/each}</div>
        {:else if channels.length}
          <div class="mt-4 grid gap-2.5">
            {#each rankedChannels as channel (channel.key)}
              {@const share = totalLeads > 0 ? Math.round((channel.leads / totalLeads) * 100) : 0}
              <div class="min-w-0">
                <div class="flex items-center justify-between gap-3 text-[11px]">
                  <span class="truncate font-semibold text-white/75">{channel.label}</span>
                  <span class="shrink-0 font-bold tabular-nums text-white">{channel.leads.toLocaleString()} <span class="font-medium text-white/45">· {share}%</span></span>
                </div>
                <div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div class="h-full rounded-full bg-gradient-to-r from-emnel-gold to-emerald-300 transition-[width] duration-500" style={`width:${share}%`}></div>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <p class="mt-4 text-xs leading-5 text-white/55">Channel detail will appear after the first lead is captured.</p>
        {/if}
      </div>

      <div class="min-w-0 py-4 last:pb-0 xl:py-0 xl:pl-5">
        {#if loading && !safeInterpretation}
          <div class="h-28 animate-pulse rounded-xl bg-white/[0.08]"></div>
        {:else if nextMove}
          {@const NextIcon = toneIcon[nextTone]}
          <button type="button" on:click={() => go(nextAnchor)} class="group relative flex h-full w-full min-w-0 flex-col overflow-hidden rounded-xl border border-white/12 bg-white/[0.07] p-3.5 text-left transition hover:bg-white/[0.12] focus:outline-none focus-visible:ring-2 focus-visible:ring-emnel-gold">
            <span class={`absolute inset-y-0 left-0 w-1 ${toneBar[nextTone]}`} aria-hidden="true"></span>
            <div class="flex flex-wrap items-center gap-2 pl-1">
              <span class={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${toneClass[nextTone]}`}><NextIcon size={11} /> {nextLabel}</span>
              <span class="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">From your data</span>
            </div>
            <p class="mt-2 pl-1 text-sm font-bold leading-snug text-white [overflow-wrap:anywhere]">{nextMove.title}</p>
            <p class="mt-1 pl-1 text-[11px] leading-4 text-white/60 [overflow-wrap:anywhere]">{nextMove.action}</p>
            <span class="mt-auto flex items-center gap-1 pl-1 pt-3 text-[11px] font-bold text-emnel-gold">Open evidence <ArrowRight size={12} class="transition-transform group-hover:translate-x-0.5" /></span>
          </button>
        {:else}
          <div class="flex h-full min-h-[120px] flex-col justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.04] p-3.5">
            <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">Next move</p>
            <p class="mt-2 text-sm font-bold text-white">No priority has been confirmed yet.</p>
            <p class="mt-1 text-[11px] leading-5 text-white/55">Once there is enough activity, this space highlights the most useful evidence-backed action for the selected period.</p>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>
</section>
