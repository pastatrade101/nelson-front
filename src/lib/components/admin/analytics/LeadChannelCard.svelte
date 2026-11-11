<script lang="ts">
  import { ArrowDownRight, ArrowRight, ArrowUpRight } from '@lucide/svelte';
  import Counter from '../Counter.svelte';
  import Sparkline from '../Sparkline.svelte';
  import { CHANNEL_ACCENT, type MainLeadsChannel } from './types';

  // One main-lead channel: the lead count (big), change vs the previous period
  // of equal length, unique visitors, opened → lead conversion where the
  // channel has a form, and the daily trend. Clicking it opens that channel's
  // detail panel below (`onSelect`).
  export let channel: MainLeadsChannel;
  export let icon: typeof ArrowRight;
  export let active = false;
  export let panelId = '';
  export let onSelect: (key: MainLeadsChannel['key']) => void = () => {};

  $: accent = CHANNEL_ACCENT[channel.key] ?? '#153733';
  $: series = (channel.byDay ?? []).map((d) => d.value);
  $: hasTrend = series.length > 1 && series.some((v) => v > 0);
  // changePct is null when the previous figure is too small for a % (or the
  // period is still running): then the card shows the earlier count itself
  // ("vs 3"). "New" only when the previous period had none at all.
  $: change =
    channel.changePct != null
      ? { kind: channel.changePct > 0 ? 'up' : channel.changePct < 0 ? 'down' : 'flat', text: `${Math.abs(channel.changePct)}%` }
      : channel.previous > 0
        ? { kind: 'count', text: `vs ${channel.previous.toLocaleString()}` }
        : channel.previous === 0 && channel.leads > 0
          ? { kind: 'new', text: 'New' }
          : null;
  $: unit = (n: number) => (channel.key === 'whatsapp' ? (n === 1 ? 'click' : 'clicks') : n === 1 ? 'lead' : 'leads');
  $: noun = unit(channel.leads);
</script>

<button
  type="button"
  class={`group flex h-full w-full flex-col rounded-2xl border bg-surface p-4 text-left shadow-[0_1px_2px_rgba(28,26,22,0.04)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(28,26,22,0.09)] sm:p-5 ${active ? 'border-forest ring-2 ring-forest/15' : 'border-ink/10 hover:border-emnel-gold/40'}`}
  aria-pressed={active}
  aria-controls={panelId || undefined}
  on:click={() => onSelect(channel.key)}
>
  <div class="flex items-start justify-between gap-2">
    <div class="flex min-w-0 items-center gap-2.5">
      <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={`background:${accent}14;color:${accent}`}>
        <svelte:component this={icon} size={19} strokeWidth={2.1} />
      </span>
      <p class="text-sm font-bold leading-snug text-ink/80">{channel.label}</p>
    </div>
    {#if change}
      <span
        class={`inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-1 text-[10px] font-bold ${
          change.kind === 'up' ? 'bg-emerald-500/12 text-emerald-600'
          : change.kind === 'down' ? 'bg-red-500/12 text-red-600'
          : 'bg-ink/[0.06] text-ink/55'}`}
        title={`Previous period: ${channel.previous.toLocaleString()} ${unit(channel.previous)}${change.kind === 'count' ? ' (no % change shown for this comparison)' : ''}`}
      >
        {#if change.kind === 'up'}<ArrowUpRight size={12} />{:else if change.kind === 'down'}<ArrowDownRight size={12} />{:else if change.kind === 'flat'}<ArrowRight size={12} />{/if}{change.text}
      </span>
    {/if}
  </div>

  <div class="mt-3">
    <p class="text-[32px] font-extrabold leading-none tracking-tight text-heading"><Counter value={channel.leads} /></p>
    <p class="mt-1.5 text-xs font-semibold text-ink/55">
      {noun} · {channel.uniqueVisitors.toLocaleString()} unique visitor{channel.uniqueVisitors === 1 ? '' : 's'}
    </p>
  </div>
  <!-- The daily trend as a strip across the card, so the caption above keeps its line. -->
  <div class="mt-3 h-[34px] overflow-hidden [&_svg]:h-auto [&_svg]:max-h-[34px] [&_svg]:w-full" title="Daily trend in this period">
    {#if hasTrend}<Sparkline data={series} color={accent} width={240} height={34} />{/if}
  </div>

  <div class="mt-auto pt-3">
    <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-ink/[0.07] pt-3 text-[11px]">
      {#if channel.conversionRate != null}
        <span class="font-semibold text-ink/60">
          <span class="font-extrabold text-ink/85">{Math.min(100, channel.conversionRate)}%</span> of {(channel.opened ?? 0).toLocaleString()} tracked visitors who saw the form sent it
        </span>
      {:else if channel.opened === 0}
        <span class="font-semibold text-ink/45">No tracked visitor has seen the form yet</span>
      {:else if channel.opened != null}
        <span class="font-semibold text-ink/45">{channel.opened.toLocaleString()} saw the form · conversion shows once the new form tracking has visits</span>
      {:else if channel.opened == null}
        <span class="font-semibold text-ink/45">Any WhatsApp link on the site</span>
      {/if}
      <span class="text-ink/45">Prev. {channel.previous.toLocaleString()}</span>
    </div>
  </div>
</button>
