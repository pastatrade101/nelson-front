<script lang="ts">
  import { onMount } from 'svelte';
  import {
    Bot,
    ClipboardList,
    Filter,
    MapPin,
    MessageCircle,
    MousePointerClick,
    Send,
    TrendingUp,
    Users
  } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import ChartCanvas from '$lib/components/admin/ChartCanvas.svelte';
  import { barConfig, doughnutConfig, funnelConfig, lineConfig } from '$lib/charts';

  type Tally = Array<{ label: string; value: number }>;
  type Overview = {
    visitors: number; interactions: number; planMyTripSubmissions: number; requestTripSubmissions: number;
    aiLeads: number; whatsappClicks: number; phoneClicks: number; emailClicks: number; aiAdvisorOpened: number;
    totalLeads: number; formOpens: number; formConversionRate: number; leadConversionRate: number;
  };
  type LeadData = {
    total: number; leadsByDay: Array<{ date: string; value: number }>;
    bySource: Tally; byDestination: Tally; byBudget: Tally; byExperience: Tally;
    byTravellerType: Tally; byAccommodation: Tally; byStatus: Tally;
  };
  type Funnel = { stages: Array<{ key: string; label: string; value: number }>; rates: Record<string, number> };
  type Traffic = { byDay: Array<{ date: string; visitors: number; whatsapp: number; ai: number; events: number }>; byDevice: Tally; topEvents: Tally };
  type Ga4 = {
    configured: boolean; error?: string; activeUsers: number; totalUsers: number; sessions: number; pageViews: number;
    byDay: Array<{ date: string; users: number; sessions: number; pageViews: number }>;
    topPages: Tally; sources: Tally; countries: Tally; devices: Tally;
  };

  const RANGES = [
    { k: 'today', l: 'Today' }, { k: 'yesterday', l: 'Yesterday' }, { k: '7d', l: '7 days' },
    { k: '30d', l: '30 days' }, { k: 'this_month', l: 'This month' }, { k: 'last_month', l: 'Last month' }
  ];

  let range = '30d';
  let loading = true;
  let overview: Overview | null = null;
  let leads: LeadData | null = null;
  let funnel: Funnel | null = null;
  let traffic: Traffic | null = null;
  let ga4: Ga4 | null = null;

  const load = async () => {
    loading = true;
    const params = { range };
    try {
      const [o, l, f, t, g] = await Promise.all([
        api.analytics.overview(params), api.analytics.leads(params),
        api.analytics.funnel(params), api.analytics.timeseries(params),
        api.analytics.traffic(params)
      ]);
      overview = o.data as Overview;
      leads = l.data as LeadData;
      funnel = f.data as Funnel;
      traffic = t.data as Traffic;
      ga4 = g.data as Ga4;
    } catch {
      overview = null; leads = null; funnel = null; traffic = null; ga4 = null;
    } finally {
      loading = false;
    }
  };

  const setRange = (k: string) => { range = k; void load(); };
  onMount(load);

  $: cards = overview
    ? [
        { label: 'Visitors', value: overview.visitors, helper: 'Unique sessions (first-party)', icon: Users, trend: `${overview.interactions} interactions` },
        { label: 'Total leads', value: overview.totalLeads, helper: 'Requests in range', icon: ClipboardList, trend: `${overview.leadConversionRate}% of visitors` },
        { label: 'Plan My Trip', value: overview.planMyTripSubmissions, helper: 'General planning leads', icon: MapPin, trend: 'Submissions' },
        { label: 'Request This Trip', value: overview.requestTripSubmissions, helper: 'Tour-specific leads', icon: Send, trend: 'Submissions' },
        { label: 'AI advisor leads', value: overview.aiLeads, helper: `${overview.aiAdvisorOpened} advisor opens`, icon: Bot, trend: 'From chat' },
        { label: 'WhatsApp clicks', value: overview.whatsappClicks, helper: `${overview.phoneClicks} phone · ${overview.emailClicks} email`, icon: MessageCircle, trend: 'Contact intent' },
        { label: 'Form conversion', value: `${overview.formConversionRate}%`, helper: `${overview.formOpens} form opens`, icon: TrendingUp, trend: 'Open → submit' },
        { label: 'Interactions', value: overview.interactions, helper: 'Tracked events', icon: MousePointerClick, trend: 'All events' }
      ]
    : [];

  // ── Chart.js configs (reactive — rebuild when the underlying data changes) ──
  const topRows = (t: Tally, n = 6) =>
    (t ?? []).filter((x) => x.value > 0 && x.label !== 'Not specified' && x.label !== '(not set)').slice(0, n);

  $: leadsLineCfg = lineConfig(
    (leads?.leadsByDay ?? []).map((d) => d.date.slice(5)),
    (leads?.leadsByDay ?? []).map((d) => d.value),
    ' leads'
  );
  $: sourceDonutCfg = doughnutConfig(topRows(leads?.bySource ?? []), ' leads');
  $: budgetDonutCfg = doughnutConfig(topRows(leads?.byBudget ?? []), ' leads');
  $: destBarCfg = barConfig(topRows(leads?.byDestination ?? [], 7), { horizontal: true, unit: ' leads' });
  $: funnelCfg = funnel ? funnelConfig(funnel.stages) : null;
  $: deviceDonutCfg = doughnutConfig(topRows(traffic?.byDevice ?? [], 3));

  // Pre-clean ranked lists in the script (Svelte {@const} can't live under a <div>).
  const cleanRows = (t: Tally, n = 6) => {
    const rows = (t ?? []).filter((x) => x.label !== 'Not specified' && x.label !== '(not set)' && x.value > 0).slice(0, n);
    return { rows, max: Math.max(1, ...rows.map((x) => x.value)) };
  };

  $: ga4ListBlocks = ga4
    ? [
        { title: 'Top pages', list: cleanRows(ga4.topPages, 8) },
        { title: 'Traffic sources', list: cleanRows(ga4.sources) },
        { title: 'Countries', list: cleanRows(ga4.countries) },
        { title: 'Devices', list: cleanRows(ga4.devices, 3) }
      ]
    : [];

  $: funnelMax = funnel ? Math.max(1, ...funnel.stages.map((s) => s.value)) : 1;
  $: breakdownBlocks = leads
    ? [
        { t: 'Experience interests', ...cleanRows(leads.byExperience) },
        { t: 'Traveller type', ...cleanRows(leads.byTravellerType) },
        { t: 'Accommodation preference', ...cleanRows(leads.byAccommodation) }
      ]
    : [];
  $: topEventRows = traffic ? cleanRows(traffic.topEvents, 8) : { rows: [], max: 1 };
</script>

<section class="grid gap-6">
  <!-- header + range filter -->
  <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
    <div>
      <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Insights</p>
      <h2 class="mt-1 text-2xl font-bold text-ink">Analytics &amp; lead performance</h2>
      <p class="mt-1 text-sm text-ink/55">First-party traffic + business funnel. Full GA4 traffic (visitors, sources, countries) arrives in Phase 2.</p>
    </div>
    <div class="flex flex-wrap items-center gap-1.5">
      <Filter size={15} class="mr-1 text-ink/40" />
      {#each RANGES as r}
        <button
          class={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${range === r.k ? 'bg-forest text-white' : 'border border-ink/10 bg-surface text-ink/65 hover:border-goldfinch-gold/40'}`}
          type="button"
          on:click={() => setRange(r.k)}
        >{r.l}</button>
      {/each}
    </div>
  </div>

  {#if loading}
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {#each Array(8) as _}<div class="h-28 animate-pulse rounded-[10px] border border-ink/10 bg-surface/70"></div>{/each}
    </div>
  {:else}
    <!-- overview cards -->
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {#each cards as c}
        {@const Icon = c.icon}
        <article class="rounded-[10px] border border-ink/10 bg-surface p-5 shadow-card">
          <div class="flex items-start justify-between">
            <span class="grid h-11 w-11 place-items-center rounded-2xl bg-forest/10 text-forest ring-1 ring-ink/5 dark:text-goldfinch-gold"><Icon size={19} /></span>
            <span class="rounded-full bg-sand/70 px-2.5 py-1 text-[10px] font-bold text-ink/55 ring-1 ring-ink/5">{c.trend}</span>
          </div>
          <p class="mt-4 text-3xl font-bold text-ink">{c.value}</p>
          <p class="mt-1 text-sm font-semibold text-ink/70">{c.label}</p>
          <p class="mt-0.5 text-xs text-ink/50">{c.helper}</p>
        </article>
      {/each}
    </div>

    <!-- GA4 traffic (Phase 2) -->
    {#if ga4}
      <div class="rounded-[10px] border border-ink/10 bg-surface p-5 shadow-card">
        <div class="mb-4 flex items-center justify-between">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Website traffic · GA4</p>
            <h3 class="mt-1 text-xl font-bold text-ink">Visitors &amp; sources</h3>
          </div>
          {#if ga4.configured}
            <span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600">
              <span class="h-2 w-2 rounded-full bg-emerald-500"></span>{ga4.activeUsers} active now
            </span>
          {/if}
        </div>

        {#if !ga4.configured}
          <div class="grid place-items-center gap-2 rounded-xl border border-dashed border-ink/15 bg-sand/20 px-6 py-10 text-center">
            <p class="text-sm font-semibold text-ink/70">GA4 isn't connected yet</p>
            <p class="max-w-md text-xs text-ink/55">Add GA4_PROPERTY_ID, GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY to the backend to see visitors, sessions, page views, sources, countries and devices here. Lead &amp; funnel analytics above already work without it.</p>
            <a class="mt-1 text-xs font-bold text-forest underline" href="/admin/settings/integrations">Check integration status →</a>
          </div>
        {:else if ga4.error}
          <p class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">GA4 error: {ga4.error}</p>
        {:else}
          <div class="grid gap-4 sm:grid-cols-4">
            {#each [['Users', ga4.totalUsers], ['Sessions', ga4.sessions], ['Page views', ga4.pageViews], ['Active now', ga4.activeUsers]] as [label, value]}
              <div class="rounded-xl border border-ink/10 bg-sand/25 p-4">
                <p class="text-2xl font-extrabold text-ink">{value}</p>
                <p class="mt-0.5 text-xs font-semibold text-ink/55">{label}</p>
              </div>
            {/each}
          </div>
          {#if ga4ListBlocks.length}
            <div class="mt-4 grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
              {#each ga4ListBlocks as block}
                <div>
                  <p class="text-xs font-bold text-ink/70">{block.title}</p>
                  {#if block.list.rows.length}
                    <div class="mt-2 grid gap-2">
                      {#each block.list.rows as row}
                        <div>
                          <div class="flex items-center justify-between text-[11px]">
                            <span class="truncate font-semibold text-ink/70" title={row.label}>{row.label}</span>
                            <span class="font-bold text-ink/50">{row.value}</span>
                          </div>
                          <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-sand/50">
                            <div class="h-full rounded-full bg-gradient-to-r from-forest to-goldfinch-gold" style={`width: ${(row.value / block.list.max) * 100}%`}></div>
                          </div>
                        </div>
                      {/each}
                    </div>
                  {:else}
                    <p class="mt-2 text-xs text-ink/45">No data.</p>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        {/if}
      </div>
    {/if}

    <!-- funnel -->
    {#if funnel}
      <div class="rounded-[10px] border border-ink/10 bg-surface p-5 shadow-card">
        <div class="mb-4">
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Conversion funnel</p>
          <h3 class="mt-1 text-xl font-bold text-ink">Visitor → Booked</h3>
        </div>
        {#if funnelCfg}<ChartCanvas {...funnelCfg} height={320} />{/if}
        <div class="mt-5 grid gap-3 sm:grid-cols-4">
          {#each [['Visitors → form', funnel.rates.visitorsToFormOpen], ['Form → submit', funnel.rates.formOpenToSubmit], ['Submit → contacted', funnel.rates.submitToContacted], ['Contacted → booked', funnel.rates.contactedToBooked]] as [label, rate]}
            <div class="rounded-xl border border-ink/10 bg-sand/25 p-3 text-center">
              <p class="text-2xl font-extrabold text-heading">{rate}%</p>
              <p class="mt-0.5 text-[11px] font-semibold text-ink/55">{label}</p>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- charts row -->
    <div class="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
      <div class="rounded-[10px] border border-ink/10 bg-surface p-5 shadow-card">
        <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Leads over time</p>
        <h3 class="mt-1 text-xl font-bold text-ink">Leads by day</h3>
        <div class="mt-3">
          {#if (leads?.leadsByDay ?? []).length}<ChartCanvas {...leadsLineCfg} height={280} />{:else}<p class="grid h-[280px] place-items-center text-sm text-ink/45">No leads in this range yet.</p>{/if}
        </div>
      </div>
      <div class="rounded-[10px] border border-ink/10 bg-surface p-5 shadow-card">
        <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Where leads come from</p>
        <h3 class="mt-1 text-xl font-bold text-ink">Lead source</h3>
        <div class="mt-3">
          {#if (leads?.bySource ?? []).some((x) => x.value > 0)}<ChartCanvas {...sourceDonutCfg} height={280} />{:else}<p class="grid h-[280px] place-items-center text-sm text-ink/45">No leads yet.</p>{/if}
        </div>
      </div>
    </div>

    <div class="grid gap-6 xl:grid-cols-2">
      <div class="rounded-[10px] border border-ink/10 bg-surface p-5 shadow-card">
        <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Demand</p>
        <h3 class="mt-1 text-xl font-bold text-ink">Most requested destinations</h3>
        <div class="mt-3">
          {#if (leads?.byDestination ?? []).some((x) => x.label !== 'Not specified' && x.value > 0)}<ChartCanvas {...destBarCfg} height={280} />{:else}<p class="grid h-[280px] place-items-center text-sm text-ink/45">No destination data yet.</p>{/if}
        </div>
      </div>
      <div class="rounded-[10px] border border-ink/10 bg-surface p-5 shadow-card">
        <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Budget</p>
        <h3 class="mt-1 text-xl font-bold text-ink">Budget range mix</h3>
        <div class="mt-3">
          {#if (leads?.byBudget ?? []).some((x) => x.value > 0)}<ChartCanvas {...budgetDonutCfg} height={280} />{:else}<p class="grid h-[280px] place-items-center text-sm text-ink/45">No budget data yet.</p>{/if}
        </div>
      </div>
    </div>

    <!-- ranked breakdowns -->
    <div class="grid gap-6 lg:grid-cols-3">
      {#each breakdownBlocks as block}
        <div class="rounded-[10px] border border-ink/10 bg-surface p-5 shadow-card">
          <h3 class="text-sm font-bold text-ink">{block.t}</h3>
          {#if block.rows.length}
            <div class="mt-3 grid gap-2.5">
              {#each block.rows as row}
                <div>
                  <div class="flex items-center justify-between text-xs">
                    <span class="font-semibold text-ink/75">{row.label}</span>
                    <span class="font-bold text-ink/55">{row.value}</span>
                  </div>
                  <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-sand/50">
                    <div class="h-full rounded-full bg-gradient-to-r from-forest to-goldfinch-gold" style={`width: ${(row.value / block.max) * 100}%`}></div>
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <p class="mt-3 text-sm text-ink/45">No data yet.</p>
          {/if}
        </div>
      {/each}
    </div>

    <!-- first-party traffic (until GA4 in Phase 2) -->
    {#if traffic}
      <div class="grid gap-6 lg:grid-cols-[0.55fr_0.45fr]">
        <div class="rounded-[10px] border border-ink/10 bg-surface p-5 shadow-card">
          <h3 class="text-sm font-bold text-ink">Top tracked events</h3>
          {#if topEventRows.rows.length}
            <div class="mt-3 grid gap-2.5">
              {#each topEventRows.rows as ev}
                <div>
                  <div class="flex items-center justify-between text-xs">
                    <span class="font-mono font-semibold text-ink/75">{ev.label}</span>
                    <span class="font-bold text-ink/55">{ev.value}</span>
                  </div>
                  <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-sand/50">
                    <div class="h-full rounded-full bg-gradient-to-r from-forest to-goldfinch-gold" style={`width: ${(ev.value / topEventRows.max) * 100}%`}></div>
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <p class="mt-3 text-sm text-ink/45">No events captured yet — they'll appear as visitors interact.</p>
          {/if}
        </div>
        <div class="rounded-[10px] border border-ink/10 bg-surface p-5 shadow-card">
          <h3 class="text-sm font-bold text-ink">Devices</h3>
          <div class="mt-3">
            {#if traffic.byDevice.some((x) => x.value > 0)}<ChartCanvas {...deviceDonutCfg} height={200} />{:else}<p class="grid h-[200px] place-items-center text-sm text-ink/45">No device data yet.</p>{/if}
          </div>
        </div>
      </div>
    {/if}
  {/if}
</section>
