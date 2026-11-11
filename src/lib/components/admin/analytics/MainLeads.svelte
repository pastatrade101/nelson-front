<script lang="ts">
  import { onMount } from 'svelte';
  import {
    AlertTriangle, ClipboardList, Compass, Gauge, Map as MapIcon, MessageCircle, RefreshCw, Target
  } from '@lucide/svelte';
  import AnalyticsEmpty from '../AnalyticsEmpty.svelte';
  import LeadChannelCard from './LeadChannelCard.svelte';
  import PlannerPanel from './PlannerPanel.svelte';
  import ItineraryPanel from './ItineraryPanel.svelte';
  import WhatsAppPanel from './WhatsAppPanel.svelte';
  import LeadSourcesTable from './LeadSourcesTable.svelte';
  import TrackingHealth from './TrackingHealth.svelte';
  import { shortDate, type LeadChannelKey, type MainLeadsData } from './types';

  // Main leads — the three channels the business runs on (Plan My Trip, the
  // itinerary form on tour pages, WhatsApp), with the same date range as the
  // rest of the page. Channel cards on top; one detail panel at a time below
  // (clicking a card opens its panel), plus lead sources and tracking health.
  export let data: MainLeadsData | null = null;
  export let loading = false;
  export let error = false;
  /** Name of the selected range ("30 days", "This month"…). */
  export let rangeLabel = '';
  export let clarityId: string | undefined = undefined;
  export let onRetry: () => void = () => {};

  type TabKey = LeadChannelKey | 'sources' | 'tracking';
  const TABS: Array<{ key: TabKey; label: string; icon: typeof Target }> = [
    { key: 'plan_my_trip', label: 'Plan My Trip', icon: MapIcon },
    { key: 'itinerary_form', label: 'Itinerary form', icon: ClipboardList },
    { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
    { key: 'sources', label: 'Lead sources', icon: Compass },
    { key: 'tracking', label: 'Tracking & setup', icon: Gauge }
  ];
  const CHANNEL_ICON: Record<LeadChannelKey, typeof Target> = {
    plan_my_trip: MapIcon, itinerary_form: ClipboardList, whatsapp: MessageCircle
  };

  // The open panel is a per-viewer convenience — remembered in this browser only.
  const TAB_KEY = 'gf_admin_main_leads_tab';
  let tab: TabKey = 'plan_my_trip';
  onMount(() => {
    try {
      const saved = localStorage.getItem(TAB_KEY) as TabKey | null;
      if (saved && TABS.some((t) => t.key === saved)) tab = saved;
    } catch { /* storage blocked */ }
  });
  const select = (key: TabKey) => {
    tab = key;
    try { localStorage.setItem(TAB_KEY, key); } catch { /* storage blocked */ }
  };
  // Arrow keys move between tabs (WAI-ARIA tabs pattern).
  let tabEls: HTMLButtonElement[] = [];
  const onTabKey = (e: KeyboardEvent, i: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = (i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length;
    select(TABS[next].key);
    tabEls[next]?.focus();
  };

  // The server answered but a read behind the report failed (ok false): its
  // figures are the empty shape, so they are never shown as real zeros.
  $: failed = data?.ok === false;
  $: report = data && !failed ? data : null;
  $: channels = report?.channels ?? [];
  $: channelOf = (key: LeadChannelKey) => channels.find((c) => c.key === key) ?? null;
  $: totalLeads = channels.reduce((a, c) => a + c.leads, 0);
  $: totalPrev = channels.reduce((a, c) => a + c.previous, 0);
  $: totalChange = totalPrev > 0 ? Math.round(((totalLeads - totalPrev) / totalPrev) * 100) : null;
  // On a tiny base a percentage says nothing ("+2000%" from 1 to 21) — show the count it is compared with.
  $: smallBase = totalPrev > 0 && totalPrev < 5;

  // "1 Sep – 30 Sep 2026" from the API's range (from + days, so it doesn't
  // matter whether `to` is inclusive or the exclusive next midnight).
  $: dateSpan = (() => {
    if (!data?.range?.from) return '';
    const start = new Date(data.range.from.length === 10 ? `${data.range.from}T00:00:00Z` : data.range.from);
    if (Number.isNaN(start.getTime())) return '';
    const days = Math.max(1, data.range.days || 1);
    const end = new Date(start.getTime() + (days - 1) * 86_400_000);
    const year = end.toLocaleDateString('en-GB', { year: 'numeric', timeZone: 'UTC' });
    return days === 1 ? `${shortDate(start.toISOString())} ${year}` : `${shortDate(start.toISOString())} – ${shortDate(end.toISOString())} ${year}`;
  })();

  // A form whose in-house count is far below its saved enquiries = a gap to fix.
  $: trackingGap = (report?.tracking.reconciliation ?? []).some((r) => r.database != null && r.database >= 3 && r.inHouse / r.database < 0.5);
  $: ga4On = report?.tracking.ga4.configured === true;
  $: clarityOn = Boolean(report?.tracking.clarity.configured || clarityId);
</script>

<section id="sec-main-leads" class="scroll-mt-24 overflow-hidden rounded-none border border-ink/10 bg-surface shadow-card" aria-labelledby="main-leads-title" aria-busy={loading}>
  <!-- header -->
  <div class="flex flex-col gap-3 border-b border-ink/[0.07] bg-gradient-to-br from-forest/[0.05] to-emnel-gold/[0.07] p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
    <div class="flex min-w-0 items-center gap-3">
      <span class="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-forest text-white"><Target size={20} /></span>
      <div class="min-w-0">
        <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70 dark:text-emnel-gold">Main leads</p>
        <h3 id="main-leads-title" class="text-lg font-bold leading-tight text-ink sm:text-xl">Plan My Trip, itinerary form &amp; WhatsApp</h3>
        <p class="mt-0.5 text-xs text-ink/50">
          {dateSpan || rangeLabel}{data ? ` · compared with the previous ${data.range.days} day${data.range.days === 1 ? '' : 's'}` : ''}
        </p>
      </div>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      {#if report}
        <span class="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs font-bold text-ink/75 ring-1 ring-ink/10">
          {totalLeads.toLocaleString()} main lead{totalLeads === 1 ? '' : 's'}
          {#if smallBase}<span class="font-semibold text-ink/50">vs {totalPrev} before</span>
          {:else if totalChange != null}<span class={totalChange >= 0 ? 'text-emerald-600' : 'text-red-600'}>{totalChange >= 0 ? '+' : '−'}{Math.abs(totalChange)}%</span>{/if}
        </span>
        <button type="button" class="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs font-bold text-ink/65 ring-1 ring-ink/10 transition hover:ring-emnel-gold/50" on:click={() => select('tracking')} title="Tracking health & setup">
          <span class={`h-2 w-2 rounded-full ${ga4On ? 'bg-emerald-500' : 'bg-ink/25'}`}></span>GA4
          <span class={`ml-1 h-2 w-2 rounded-full ${clarityOn ? 'bg-emerald-500' : 'bg-ink/25'}`}></span>Clarity
          {#if trackingGap}<AlertTriangle size={12} class="ml-1 text-amber-600" />{/if}
        </button>
      {/if}
      <button type="button" on:click={onRetry} disabled={loading} class="inline-flex items-center gap-1.5 rounded-lg border border-ink/10 bg-surface px-3 py-1.5 text-xs font-bold text-ink/65 transition hover:border-emnel-gold/40 disabled:opacity-50" aria-label="Refresh main leads">
        <RefreshCw size={13} class={loading ? 'animate-spin' : ''} /> Refresh
      </button>
    </div>
  </div>

  <div class="grid grid-cols-1 gap-5 p-4 sm:p-5">
    {#if loading && !data}
      <!-- skeleton -->
      <div class="grid grid-cols-1 gap-3 lg:grid-cols-3" aria-hidden="true">
        {#each Array(3) as _}<div class="h-40 animate-pulse rounded-2xl border border-ink/10 bg-sand/30"></div>{/each}
      </div>
      <div class="h-9 w-full animate-pulse rounded-xl bg-sand/30" aria-hidden="true"></div>
      <div class="h-72 animate-pulse rounded-2xl border border-ink/10 bg-sand/30" aria-hidden="true"></div>
    {:else if (error && !data) || failed}
      <div class={`grid grid-cols-1 gap-3 transition-opacity ${loading ? 'opacity-60' : ''}`}>
        {#if failed}
          <AnalyticsEmpty icon={Target} title="Couldn't read this period" minHeight={200}
            description="One of the reads behind the lead report failed, so its figures would be incomplete and aren't shown. Try again — your forms and WhatsApp buttons keep recording in the background, so nothing is lost." />
        {:else}
          <AnalyticsEmpty icon={Target} title="Couldn't load the main leads" minHeight={200}
            description="The lead report didn't answer. Your forms and WhatsApp buttons keep recording in the background — nothing is lost." />
        {/if}
        <div class="flex justify-center">
          <button type="button" on:click={onRetry} disabled={loading} class="inline-flex items-center gap-1.5 rounded-lg bg-forest px-4 py-2 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-50">
            <RefreshCw size={13} class={loading ? 'animate-spin' : ''} /> Try again
          </button>
        </div>
      </div>
    {:else if report}
      <div class={`grid grid-cols-1 gap-5 transition-opacity ${loading ? 'pointer-events-none opacity-60' : ''}`}>
        <!-- channel cards -->
        <div class="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {#each channels as c (c.key)}
            <LeadChannelCard channel={c} icon={CHANNEL_ICON[c.key] ?? Target} active={tab === c.key} panelId="main-leads-panel" onSelect={select} />
          {/each}
        </div>
        {#if !channels.length}
          <AnalyticsEmpty icon={Target} title="No lead channels returned" minHeight={160}
            description="The report came back empty for this range. Pick another range or refresh." />
        {/if}

        <!-- panel tabs -->
        <div class="-mx-4 px-4 sm:mx-0 sm:px-0">
          <div class="grid grid-cols-2 gap-1 rounded-xl border border-ink/10 bg-sand/30 p-1 sm:grid-cols-3 lg:flex lg:min-w-0" role="tablist" aria-label="Main lead details">
            {#each TABS as t, i (t.key)}
              <button
                type="button"
                role="tab"
                id={`main-leads-tab-${t.key}`}
                aria-selected={tab === t.key}
                aria-controls="main-leads-panel"
                tabindex={tab === t.key ? 0 : -1}
                bind:this={tabEls[i]}
                class={`inline-flex min-w-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-left text-xs font-bold transition lg:shrink-0 lg:whitespace-nowrap ${tab === t.key ? 'bg-forest text-white shadow-sm' : 'text-ink/60 hover:bg-surface hover:text-ink/80'}`}
                on:click={() => select(t.key)}
                on:keydown={(e) => onTabKey(e, i)}
              >
                <svelte:component this={t.icon} size={13} />{t.label}
                {#if t.key === 'tracking' && trackingGap}<AlertTriangle size={12} class={tab === t.key ? 'text-white' : 'text-amber-600'} />{/if}
              </button>
            {/each}
          </div>
        </div>

        <div id="main-leads-panel" role="tabpanel" aria-labelledby={`main-leads-tab-${tab}`} tabindex="0" class="min-w-0 focus:outline-none">
          {#if tab === 'plan_my_trip'}
            <PlannerPanel planner={report.planner} opened={channelOf('plan_my_trip')?.opened ?? null} leads={channelOf('plan_my_trip')?.leads ?? 0} />
          {:else if tab === 'itinerary_form'}
            <ItineraryPanel itinerary={report.itinerary} leads={channelOf('itinerary_form')?.leads ?? 0} />
          {:else if tab === 'whatsapp'}
            <WhatsAppPanel whatsapp={report.whatsapp} />
          {:else if tab === 'sources'}
            <LeadSourcesTable sources={report.sources} sourcesTracked={report.sourcesTracked} />
          {:else}
            <TrackingHealth tracking={report.tracking} {clarityId} />
          {/if}
        </div>
      </div>
    {/if}
  </div>
</section>
