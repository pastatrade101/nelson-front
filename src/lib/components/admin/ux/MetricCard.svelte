<script lang="ts">
  import { ArrowDownRight, ArrowUpRight } from '@lucide/svelte';
  import Counter from '../Counter.svelte';
  import Sparkline from '../Sparkline.svelte';
  import SourceBadge from './SourceBadge.svelte';

  // One KPI, provider-agnostic. Renders a real value + its source, OR — when the
  // metric isn't available from any connected source — an honest empty/deep-link
  // state. It NEVER invents a number.
  export let label: string;
  export let value: number | null = null;
  export let format: 'number' | 'percent' | 'duration' | 'currency' = 'number';
  export let source = 'website';
  export let available = true;
  export let deepLink: string | undefined = undefined;
  export let deepLinkLabel = 'Open in Clarity';
  export let emptyText = '';
  export let hint = '';
  export let series: number[] = [];
  export let icon: typeof ArrowUpRight | undefined = undefined;
  export let accent = '#153733';
  export let loading = false;
  // Previous-period benchmark. `invertChange` = a drop is good (bounce/quick-backs).
  // When the server leaves `changePct` out (the earlier figure is too small, it
  // predates tracking, or the source stopped counting part-way) the card shows
  // the earlier figure itself.
  export let changePct: number | null = null;
  export let previous: number | null = null;
  export let invertChange = false;

  $: changeGood = changePct == null ? null : invertChange ? changePct < 0 : changePct > 0;
  $: changeUp = changePct != null && changePct > 0;

  // ms → "1m 20s" / "45s"
  const duration = (ms: number): string => {
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    return `${m}m ${s % 60}s`;
  };
  $: previousLabel =
    previous == null || !Number.isFinite(previous) ? ''
    : format === 'percent' ? `${previous}%`
    : format === 'duration' ? duration(previous)
    : previous.toLocaleString();
  $: show = available && value != null && Number.isFinite(value);
  $: emptyLabel = emptyText || (deepLink ? 'Available in Clarity' : 'No data yet');
</script>

<div
  class="group relative flex flex-col rounded-2xl border border-ink/10 bg-surface p-4 shadow-[0_1px_2px_rgba(28,26,22,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-ink/20 hover:shadow-[0_10px_28px_rgba(28,26,22,0.09)]"
>
  <div class="flex items-start justify-between gap-2">
    <div class="flex min-w-0 items-center gap-2">
      {#if icon}
        <span class="grid h-7 w-7 shrink-0 place-items-center rounded-lg" style={`background:${accent}14;color:${accent}`}>
          <svelte:component this={icon} size={15} strokeWidth={2.2} />
        </span>
      {/if}
      <div class="min-w-0">
        <!-- Label and hint wrap (two lines at most) instead of cutting off: the
             hint is the only text saying what the card counts. -->
        <p class="line-clamp-2 text-[12px] font-semibold leading-4 text-ink/60 [overflow-wrap:anywhere]" title={label}>{label}</p>
        {#if hint}<p class="mt-0.5 line-clamp-2 text-[10px] leading-[13px] text-ink/40 [overflow-wrap:anywhere]" title={hint}>{hint}</p>{/if}
      </div>
    </div>
    {#if show && series.length > 1}
      <Sparkline data={series} color={accent} width={62} height={22} />
    {/if}
  </div>

  {#if loading}
    <div class="mt-3 h-7 w-24 animate-pulse rounded-md bg-ink/[0.06]"></div>
    <div class="mt-2.5 h-3 w-20 animate-pulse rounded bg-ink/[0.05]"></div>
  {:else if show}
    <p class="mt-2 text-[26px] font-extrabold leading-none tracking-tight text-heading">
      {#if format === 'currency'}${''}<Counter value={value ?? 0} />
      {:else if format === 'percent'}<Counter value={value ?? 0} suffix="%" decimals={Number.isInteger(value) ? 0 : 1} />
      {:else if format === 'duration'}{duration(value ?? 0)}
      {:else}<Counter value={value ?? 0} />{/if}
    </p>
    <div class="mt-2.5 flex items-center justify-between gap-2">
      <SourceBadge {source} />
      {#if changePct === 0}
        <span class="text-[11px] font-bold text-ink/45" title={previousLabel ? `Previous period: ${previousLabel}` : 'vs previous period'}>0%</span>
      {:else if changePct != null}
        <span class={`inline-flex items-center gap-0.5 text-[11px] font-bold ${changeGood ? 'text-emerald-600' : 'text-red-500'}`} title={previousLabel ? `Previous period: ${previousLabel}` : 'vs previous period'}>
          <svelte:component this={changeUp ? ArrowUpRight : ArrowDownRight} size={12} strokeWidth={2.6} />{Math.abs(changePct)}%
        </span>
      {:else if previousLabel}
        <span class="min-w-0 truncate text-[11px] font-bold text-ink/45" title={`Previous period: ${previousLabel} — no % change shown for this comparison`}>vs {previousLabel}</span>
      {/if}
    </div>
  {:else}
    <p class="mt-2 text-[13px] font-semibold text-ink/35">{emptyLabel}</p>
    <div class="mt-2.5 flex items-center justify-between gap-2">
      <SourceBadge {source} />
      {#if deepLink}
        <a
          class="inline-flex items-center gap-0.5 text-[11px] font-bold text-forest transition hover:gap-1 hover:underline"
          href={deepLink}
          target="_blank"
          rel="noopener noreferrer"
        >
          {deepLinkLabel}<ArrowUpRight size={12} strokeWidth={2.6} />
        </a>
      {/if}
    </div>
  {/if}
</div>
