<script lang="ts">
  import { onMount } from 'svelte';
  import {
    ArrowRight, CircleCheck, Eye, Lightbulb, OctagonAlert, RefreshCw, ScanSearch, Sprout
  } from '@lucide/svelte';
  import AnalyticsEmpty from '../AnalyticsEmpty.svelte';
  import SourceBadge from '../ux/SourceBadge.svelte';
  import { shortDate } from './types';
  import {
    AREA_LABEL, KIND_ORDER, readingFailed, type Interpretation, type InterpretationFinding, type InterpretationKind
  } from './interpretation';

  // "What this period tells you" — the built-in reading of the selected range,
  // straight under the Main leads. It only renders what the server worked out
  // (fixed rules over the lead records, the in-house tracker, GA4 and Clarity):
  // one headline sentence, then findings grouped from "fix this" to "going
  // well". Each finding carries the figures behind it, a next step when there
  // is one, its source, and a link down to the section with the detail.
  export let interpretation: Interpretation | null = null;
  export let loading = false;
  /** The website-intelligence request failed (no reading to show at all). */
  export let error = false;
  /** Name of the selected range ("30 days", "This month"…), used until the reading arrives. */
  export let rangeLabel = '';
  export let onRetry: () => void = () => {};

  // One colour and one icon per kind, used for the bar, chips, group heading
  // and the next-step arrow: problem = red, watch = amber, opportunity = gold,
  // win = green. The icon travels with the colour so amber "watch" and gold
  // "opportunity" never rely on hue alone to tell apart.
  const KIND: Record<InterpretationKind, {
    chip: string; group: string; tally: (n: number) => string; icon: typeof ArrowRight;
    card: string; bar: string; ink: string; badge: string; arrow: string;
  }> = {
    problem: {
      chip: 'Problem', group: 'Needs attention', tally: () => 'to fix', icon: OctagonAlert,
      card: 'border-red-300/60 bg-red-50/40 dark:border-red-500/30 dark:bg-red-500/[0.06]',
      bar: 'bg-red-500', ink: 'text-red-600 dark:text-red-400',
      badge: 'bg-red-500/[0.12] text-red-700 dark:text-red-300', arrow: 'text-red-600 dark:text-red-400'
    },
    watch: {
      chip: 'Watch', group: 'Keep an eye on', tally: () => 'to watch', icon: Eye,
      card: 'border-amber-300/60 bg-amber-50/40 dark:border-amber-500/30 dark:bg-amber-500/[0.06]',
      bar: 'bg-amber-500', ink: 'text-amber-600 dark:text-amber-400',
      badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300', arrow: 'text-amber-600 dark:text-amber-400'
    },
    opportunity: {
      chip: 'Opportunity', group: 'Opportunities', tally: (n) => (n === 1 ? 'opportunity' : 'opportunities'), icon: Lightbulb,
      card: 'border-emnel-gold/45 bg-surface',
      bar: 'bg-emnel-gold', ink: 'text-clay',
      badge: 'bg-emnel-gold/15 text-clay', arrow: 'text-clay'
    },
    win: {
      chip: 'Win', group: 'Going well', tally: () => 'going well', icon: CircleCheck,
      card: 'border-emerald-300/60 bg-emerald-50/40 dark:border-emerald-500/30 dark:bg-emerald-500/[0.05]',
      bar: 'bg-emerald-500', ink: 'text-emerald-600 dark:text-emerald-400',
      badge: 'bg-emerald-500/[0.12] text-emerald-700 dark:text-emerald-300', arrow: 'text-emerald-600 dark:text-emerald-400'
    }
  };

  // The server answered but could not read the period (ok false): its zeros
  // are placeholders, so the panel shows the retry state, not "nothing to read".
  $: failed = readingFailed(interpretation);
  $: findings = (failed ? [] : interpretation?.findings ?? []) as InterpretationFinding[];
  // Grouped in reading order; the server's order is kept inside each group.
  $: groups = KIND_ORDER
    .map((kind) => ({ kind, items: findings.filter((f) => f.kind === kind) }))
    .filter((g) => g.items.length > 0);
  $: headline = failed ? null : interpretation?.headline ?? null;
  $: isEmpty = !headline && groups.length === 0;

  // "1 Sep – 30 Sep 2026 · 21 main leads · 1,240 visitors" — the same date span
  // the Main leads header shows (from + days, so an inclusive or exclusive `to` reads the same).
  $: basisLine = (() => {
    const b = interpretation?.basis;
    if (!b?.from) return rangeLabel;
    const start = new Date(b.from.length === 10 ? `${b.from}T00:00:00Z` : b.from);
    if (Number.isNaN(start.getTime())) return rangeLabel;
    const days = Math.max(1, b.days || 1);
    const end = new Date(start.getTime() + (days - 1) * 86_400_000);
    const year = end.toLocaleDateString('en-GB', { year: 'numeric', timeZone: 'UTC' });
    const span = days === 1 ? `${shortDate(start.toISOString())} ${year}` : `${shortDate(start.toISOString())} – ${shortDate(end.toISOString())} ${year}`;
    // A reading that could not be made has no counts to show, only its dates.
    if (failed || b.leads == null) return span;
    const parts = [span, `${b.leads.toLocaleString()} main lead${b.leads === 1 ? '' : 's'}`];
    if (b.visitors != null) {
      const from = b.visitorsSource === 'ga4' ? ' (GA4)' : b.visitorsSource === 'website' ? ' (in-house)' : '';
      parts.push(`${b.visitors.toLocaleString()} visitor${b.visitors === 1 ? '' : 's'}${from}`);
    }
    return parts.join(' · ');
  })();

  // "See details" only shows when its section is on the page right now — the
  // sections below appear after their own figures load (and the GA4 one only
  // when GA4 answers), so the page is watched and the check re-run on change.
  let present = new Set<string>();
  const anchorId = (anchor: string | null) => (anchor && anchor.startsWith('#') ? anchor.slice(1) : '');
  const scan = () => {
    if (typeof document === 'undefined') return;
    const next = new Set<string>();
    for (const f of findings) {
      const id = anchorId(f.anchor);
      if (id && document.getElementById(id)) next.add(id);
    }
    if (next.size !== present.size || [...next].some((id) => !present.has(id))) present = next;
  };
  onMount(() => {
    let frame = 0;
    const queue = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(scan); };
    const watcher = new MutationObserver(queue);
    watcher.observe(document.body, { childList: true, subtree: true });
    queue();
    return () => { watcher.disconnect(); cancelAnimationFrame(frame); };
  });
  $: findings, scan();

  // Scrolls within the page instead of jumping, and leaves the URL alone. When
  // the section has gone in the meantime the browser follows the link as usual.
  const jump = (e: MouseEvent, anchor: string) => {
    if (typeof document === 'undefined') return;
    const el = document.getElementById(anchorId(anchor));
    if (!el) return;
    e.preventDefault();
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };
</script>

<section id="sec-interpretation" class="scroll-mt-24 overflow-hidden rounded-none border border-ink/10 bg-surface shadow-card" aria-labelledby="interpretation-title" aria-busy={loading}>
  <!-- header: label · title · basis · tally + refresh -->
  <div class="flex flex-col gap-3 border-b border-ink/[0.07] bg-gradient-to-br from-emnel-gold/[0.07] to-transparent p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
    <div class="flex min-w-0 items-center gap-3">
      <span class="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-forest text-white"><ScanSearch size={20} /></span>
      <div class="min-w-0">
        <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70 dark:text-emnel-gold">Built-in intelligence</p>
        <h3 id="interpretation-title" class="text-lg font-bold leading-tight text-ink sm:text-xl">What this period tells you</h3>
        {#if basisLine}<p class="mt-0.5 text-xs text-ink/50 [overflow-wrap:anywhere]">{basisLine}</p>{/if}
      </div>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      {#each groups as g (g.kind)}
        <span class="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-[11px] font-bold text-ink/70 ring-1 ring-ink/10">
          <svelte:component this={KIND[g.kind].icon} size={12} strokeWidth={2.4} class={KIND[g.kind].ink} />{g.items.length} {KIND[g.kind].tally(g.items.length)}
        </span>
      {/each}
      <button type="button" on:click={onRetry} disabled={loading} class="inline-flex items-center gap-1.5 rounded-lg border border-ink/10 bg-surface px-3 py-1.5 text-xs font-bold text-ink/65 transition hover:border-emnel-gold/40 disabled:opacity-50" aria-label="Refresh this period's reading">
        <RefreshCw size={13} class={loading ? 'animate-spin' : ''} /> Refresh
      </button>
    </div>
  </div>

  <div class="grid grid-cols-1 gap-5 p-4 sm:p-5">
    {#if loading && !interpretation}
      <!-- skeleton -->
      <div class="grid gap-2.5" aria-hidden="true">
        <div class="h-6 w-11/12 animate-pulse rounded bg-ink/[0.07]"></div>
        <div class="h-6 w-2/3 animate-pulse rounded bg-ink/[0.05]"></div>
      </div>
      <div class="grid grid-cols-1 gap-3 lg:grid-cols-2" aria-hidden="true">
        {#each Array(4) as _}<div class="h-36 animate-pulse rounded-2xl border border-ink/10 bg-sand/30"></div>{/each}
      </div>
    {:else if (!interpretation && error) || failed}
      <div class="grid grid-cols-1 gap-3">
        <AnalyticsEmpty icon={ScanSearch} title="Couldn't read this period" minHeight={160}
          description={failed
            ? "One of the reads behind this reading failed, so it would be incomplete and isn't shown — try again. Nothing is lost: your forms and buttons keep recording."
            : "The figures didn't come back this time. Nothing is lost — the numbers below are unaffected, and this reading fills in again on the next try."} />
        <div class="flex justify-center">
          <button type="button" on:click={onRetry} disabled={loading} class="inline-flex items-center gap-1.5 rounded-lg bg-forest px-4 py-2 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-50">
            <RefreshCw size={13} /> Try again
          </button>
        </div>
      </div>
    {:else if isEmpty}
      <AnalyticsEmpty icon={ScanSearch} title="Nothing to read yet for this period" minHeight={160}
        description="Once visitors use Plan My Trip, the itinerary form or the WhatsApp buttons, this panel says in plain words what changed, what needs attention and what to do next — with the numbers behind every point." />
    {:else}
      <div class={`grid grid-cols-1 gap-5 transition-opacity ${loading ? 'pointer-events-none opacity-60' : ''}`}>
        {#if headline}
          <p class="border-l-4 border-emnel-gold pl-4 text-lg font-semibold leading-snug text-heading [overflow-wrap:anywhere] sm:text-xl">{headline}</p>
        {/if}

        {#if groups.length}
          {#each groups as g (g.kind)}
            {@const k = KIND[g.kind]}
            <div class="min-w-0">
              <p class="mb-2.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-ink/45">
                <svelte:component this={k.icon} size={13} strokeWidth={2.4} class={k.ink} aria-hidden="true" />{k.group} · {g.items.length}
              </p>
              <ul class="grid grid-cols-1 gap-3 md:grid-cols-2">
                {#each g.items as f (f.id)}
                  {@const linked = Boolean(f.anchor) && present.has(anchorId(f.anchor))}
                  <li class={`relative flex min-w-0 flex-col overflow-hidden rounded-2xl border p-4 pl-5 shadow-[0_1px_2px_rgba(28,26,22,0.04)] ${k.card}`}>
                    <span class={`absolute inset-y-0 left-0 w-1 ${k.bar}`} aria-hidden="true"></span>
                    <div class="flex flex-wrap items-center gap-1.5">
                      <span class={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${k.badge}`}>
                        <svelte:component this={k.icon} size={12} strokeWidth={2.4} />{k.chip}
                      </span>
                      <span class="rounded-full bg-ink/[0.05] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink/50">{AREA_LABEL[f.area] ?? f.area}</span>
                      <span class="ml-auto"><SourceBadge source={f.source} /></span>
                    </div>
                    <p class="mt-2 text-[14px] font-bold leading-snug text-heading [overflow-wrap:anywhere]">{f.title}</p>
                    <p class="mt-1 text-[12px] leading-5 text-ink/55 [overflow-wrap:anywhere]">{f.evidence}</p>
                    {#if f.action}
                      <p class="mt-2.5 flex items-start gap-2 rounded-xl bg-surface/80 px-3 py-2 text-[12px] leading-5 text-ink/75 ring-1 ring-ink/[0.06]">
                        <ArrowRight size={14} strokeWidth={2.4} class={`mt-0.5 shrink-0 ${k.arrow}`} />
                        <span class="min-w-0 [overflow-wrap:anywhere]"><span class="font-bold text-ink/85">Next step:</span> {f.action}</span>
                      </p>
                    {/if}
                    {#if f.confidence === 'early' || linked}
                      <div class="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-3">
                        {#if f.confidence === 'early'}
                          <span class="inline-flex items-center gap-1 text-[11px] font-semibold text-ink/50" title="Fewer than 20 to go on — worth noting, but it can still change.">
                            <Sprout size={12} /> Early signal · small numbers so far
                          </span>
                        {/if}
                        {#if linked && f.anchor}
                          <a href={f.anchor} on:click={(e) => jump(e, f.anchor ?? '')} class="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-forest hover:underline">
                            See details <ArrowRight size={12} />
                          </a>
                        {/if}
                      </div>
                    {/if}
                  </li>
                {/each}
              </ul>
            </div>
          {/each}
        {:else}
          <p class="flex items-start gap-2.5 rounded-xl border border-dashed border-ink/[0.12] bg-sand/20 px-4 py-3 text-[13px] leading-6 text-ink/60">
            <CircleCheck size={16} class="mt-1 shrink-0 text-ink/40" />
            Nothing stands out yet — no change is big enough, and no count high enough, to call out on its own.
          </p>
        {/if}

        <p class="text-[11px] leading-5 text-ink/45">
          Worked out from your own figures by fixed rules — each point shows the numbers behind it and where they come from.
          “Early signal” means fewer than 20 to go on, so it can still change.
        </p>
      </div>
    {/if}
  </div>
</section>
