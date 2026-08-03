<script lang="ts">
  import { onMount } from 'svelte';
  import {
    AlertTriangle, ArrowDownRight, ArrowUpRight, BarChart3, Bot, ClipboardList, Compass, ExternalLink, Filter,
    Flame, Hand, Lightbulb, MapPin, MessageCircle, MousePointer2, MousePointerClick, MoveVertical, PlayCircle,
    Send, Sparkles, Target, TrendingUp, Trophy, Users
  } from '@lucide/svelte';
  import { env as publicEnv } from '$env/dynamic/public';
  import { api } from '$lib/api/client';
  import { clarityDashboardUrl } from '$lib/clarity';
  import ChartCanvas from '$lib/components/admin/ChartCanvas.svelte';
  import Sparkline from '$lib/components/admin/Sparkline.svelte';
  import Counter from '$lib/components/admin/Counter.svelte';
  import AnalyticsEmpty from '$lib/components/admin/AnalyticsEmpty.svelte';
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
  let updatedAt = 0;
  let eventView: 'business' | 'dev' = 'business';
  let activeStep = -1;

  // ── Microsoft Clarity — UX analytics companion (a launch point, not a rebuild)
  const clarityId = publicEnv.PUBLIC_CLARITY_PROJECT_ID;
  const clarityConnected = Boolean(clarityId);
  const clarityUrl = clarityDashboardUrl(clarityId);
  const CLARITY_CAPS = [
    { icon: PlayCircle, label: 'Session recordings', desc: 'Watch real visitor sessions' },
    { icon: Flame, label: 'Heatmaps', desc: 'Click, scroll & attention maps' },
    { icon: Hand, label: 'Rage clicks', desc: 'Frustration & friction signals' },
    { icon: MousePointer2, label: 'Dead clicks', desc: 'Clicks that lead nowhere' },
    { icon: MoveVertical, label: 'Scroll depth', desc: 'How far people actually read' }
  ];
  // Foundation for future AI-generated UX recommendations (biggest drop-offs,
  // rage-clicked elements, mobile usability, CTA performance…). Rendered when
  // populated; empty for now — no AI summarisation is implemented yet.
  type ClarityUxInsight = { title: string; detail: string };
  const clarityUxInsights: ClarityUxInsight[] = [];

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
      updatedAt = Date.now();
    } catch {
      overview = null; leads = null; funnel = null; traffic = null; ga4 = null;
    } finally {
      loading = false;
    }
  };

  const setRange = (k: string) => { range = k; activeStep = -1; void load(); };
  const scrollTo = (id: string) => { if (typeof document !== 'undefined') document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  onMount(load);

  // ── helpers ──────────────────────────────────────────────────────────────
  const pct = (a: number, b: number) => (b > 0 ? Math.round(((a - b) / b) * 100) : a > 0 ? 100 : 0);
  const share = (v: number, total: number) => (total > 0 ? Math.round((v / total) * 100) : 0);
  // Momentum = 2nd half of the period vs the 1st half of the same daily series.
  const momentum = (series: number[]): { pct: number } | null => {
    const s = (series ?? []).filter((n) => Number.isFinite(n));
    if (s.length < 4) return null;
    const mid = Math.floor(s.length / 2);
    const earlier = s.slice(0, mid).reduce((a, b) => a + b, 0);
    const recent = s.slice(mid).reduce((a, b) => a + b, 0);
    if (earlier === 0 && recent === 0) return null;
    return { pct: pct(recent, earlier) };
  };
  const topRow = (t?: Tally) =>
    (t ?? []).filter((x) => x.value > 0 && x.label !== 'Not specified' && x.label !== '(not set)').sort((a, b) => b.value - a.value)[0] ?? null;
  const sum = (t?: Tally) => (t ?? []).reduce((a, x) => a + x.value, 0);

  const rel = (ts: number, ref: number) => {
    if (!ts) return '';
    const m = Math.round((ref - ts) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m} min ago`;
    return `${Math.round(m / 60)}h ago`;
  };
  let now = Date.now();
  onMount(() => { const i = setInterval(() => (now = Date.now()), 30000); return () => clearInterval(i); });
  $: lastUpdatedLabel = updatedAt ? `Updated ${rel(updatedAt, now)}` : '';

  // ── KPI cards (with per-card daily series for sparkline + trend) ────────────
  $: visitorSeries = (traffic?.byDay ?? []).map((d) => d.visitors);
  $: leadSeries = (leads?.leadsByDay ?? []).map((d) => d.value);
  $: eventSeries = (traffic?.byDay ?? []).map((d) => d.events);
  $: waSeries = (traffic?.byDay ?? []).map((d) => d.whatsapp);
  $: aiSeries = (traffic?.byDay ?? []).map((d) => d.ai);

  $: cards = overview
    ? [
        { label: 'Visitors', value: overview.visitors, suffix: '', helper: 'Unique sessions', icon: Users, series: visitorSeries, anchor: 'sec-traffic' },
        { label: 'Total leads', value: overview.totalLeads, suffix: '', helper: `${overview.leadConversionRate}% of visitors`, icon: ClipboardList, series: leadSeries, anchor: 'sec-leads' },
        { label: 'Plan My Safari', value: overview.planMyTripSubmissions, suffix: '', helper: 'General planning leads', icon: MapPin, series: [] as number[], anchor: 'sec-leads' },
        { label: 'Request This Trip', value: overview.requestTripSubmissions, suffix: '', helper: 'Tour-specific leads', icon: Send, series: [] as number[], anchor: 'sec-leads' },
        { label: 'AI advisor leads', value: overview.aiLeads, suffix: '', helper: `${overview.aiAdvisorOpened} advisor opens`, icon: Bot, series: aiSeries, anchor: 'sec-events' },
        { label: 'WhatsApp clicks', value: overview.whatsappClicks, suffix: '', helper: `${overview.phoneClicks} phone · ${overview.emailClicks} email`, icon: MessageCircle, series: waSeries, anchor: 'sec-events' },
        { label: 'Form conversion', value: overview.formConversionRate, suffix: '%', helper: `${overview.formOpens} form opens`, icon: TrendingUp, series: [] as number[], anchor: 'sec-funnel' },
        { label: 'Interactions', value: overview.interactions, suffix: '', helper: 'Tracked events', icon: MousePointerClick, series: eventSeries, anchor: 'sec-events' }
      ]
    : [];

  // ── Conversion funnel drop-offs + auto-detected bottleneck ──────────────────
  const RATE_STEPS = [
    { key: 'visitorsToFormOpen', label: 'Visitors → form open', tip: 'Few visitors start an enquiry — make the "Plan my safari" CTAs more prominent above the fold.' },
    { key: 'formOpenToSubmit', label: 'Form open → submit', tip: 'People open the form but don\'t finish — shorten it, cut optional fields, and reassure on privacy.' },
    { key: 'submitToContacted', label: 'Submit → contacted', tip: 'Leads submit but aren\'t marked contacted — speed up first response; most enquiries expect a reply within hours.' },
    { key: 'contactedToBooked', label: 'Contacted → booked', tip: 'Contacted leads aren\'t booking — revisit quote turnaround, pricing clarity and follow-up cadence.' }
  ];
  $: funnelSteps = funnel ? RATE_STEPS.map((s) => ({ ...s, rate: funnel!.rates[s.key] ?? 0, dropoff: Math.max(0, 100 - (funnel!.rates[s.key] ?? 0)) })) : [];
  $: bottleneck = funnelSteps.length ? [...funnelSteps].sort((a, b) => a.rate - b.rate)[0] : null;

  // ── AI insight engine — plain-language, derived only from the real data ─────
  type Insight = { icon: typeof Trophy; tone: 'up' | 'down' | 'good' | 'warn' | 'neutral'; label: string; text: string };
  $: insights = (() => {
    if (!overview) return [] as Insight[];
    const out: Insight[] = [];
    const vm = momentum(visitorSeries) ?? momentum(eventSeries);
    if (vm) {
      const up = vm.pct >= 0;
      out.push({
        icon: up ? ArrowUpRight : ArrowDownRight, tone: up ? 'up' : 'down', label: 'Traffic trend',
        text: `Visitor activity is trending ${up ? 'up' : 'down'} ${Math.abs(vm.pct)}% across this period (second half vs first).`
      });
    }
    const dest = topRow(leads?.byDestination);
    if (dest) out.push({ icon: MapPin, tone: 'good', label: 'Top destination', text: `${dest.label} leads demand with ${dest.value} enquir${dest.value === 1 ? 'y' : 'ies'} (${share(dest.value, leads!.total)}% of leads).` });
    const src = topRow(leads?.bySource);
    if (src) out.push({ icon: Compass, tone: 'good', label: 'Best source', text: `Most leads arrive via ${src.label} — ${src.value} (${share(src.value, leads!.total)}% of the total).` });
    if (bottleneck) out.push({ icon: AlertTriangle, tone: 'warn', label: 'Biggest drop-off', text: `${bottleneck.label}: only ${bottleneck.rate}% continue — this is the weakest step in your funnel.` });
    if (overview.leadConversionRate != null) {
      const good = overview.leadConversionRate >= 2;
      out.push({ icon: Target, tone: good ? 'good' : 'neutral', label: 'Conversion', text: `${overview.leadConversionRate}% of visitors become a lead${good ? ' — a healthy rate for a considered purchase.' : '. There is room to lift this with stronger CTAs.'}` });
    }
    if (bottleneck) out.push({ icon: Lightbulb, tone: 'neutral', label: 'Recommended action', text: bottleneck.tip });
    return out;
  })();
  const TONE: Record<Insight['tone'], string> = {
    up: 'bg-emerald-500/12 text-emerald-600', down: 'bg-red-500/12 text-red-600',
    good: 'bg-forest/12 text-forest', warn: 'bg-amber-500/15 text-amber-600', neutral: 'bg-goldfinch-gold/15 text-clay'
  };

  // ── Business-friendly event names (toggle vs raw GA4 names) ──────────────────
  const EVENT_LABELS: Record<string, string> = {
    page_view: 'Page viewed', tour_page_view: 'Tour viewed', destination_page_view: 'Destination viewed',
    safari_style_view: 'Safari style viewed', accommodation_view: 'Stay viewed', tour_list_view: 'Tours list viewed',
    tour_card_click: 'Tour selected', related_tour_click: 'Related tour clicked', tour_filter_used: 'Filters used',
    search: 'Search', no_search_results: 'Search — no results',
    plan_my_trip_opened: 'Safari planner opened', plan_my_trip_submitted: 'Plan lead submitted',
    begin_journey_opened: 'Journey planner opened', begin_journey_submitted: 'Journey lead submitted',
    request_trip_opened: 'Quote request started', request_trip_submitted: 'Quote lead submitted',
    form_submit_error: 'Form error', ai_advisor_opened: 'AI advisor opened', ai_advisor_message_sent: 'AI advisor message',
    ai_advisor_lead_created: 'AI advisor lead', cta_click: 'CTA clicked',
    whatsapp_click: 'WhatsApp clicked', phone_click: 'Phone clicked', email_click: 'Email clicked'
  };
  const prettyEvent = (raw: string) => EVENT_LABELS[raw] ?? raw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  // ── Chart configs ───────────────────────────────────────────────────────────
  const topRows = (t: Tally, n = 6) =>
    (t ?? []).filter((x) => x.value > 0 && x.label !== 'Not specified' && x.label !== '(not set)').slice(0, n);
  const cleanRows = (t: Tally, n = 6) => {
    const rows = (t ?? []).filter((x) => x.label !== 'Not specified' && x.label !== '(not set)' && x.value > 0).slice(0, n);
    return { rows, max: Math.max(1, ...rows.map((x) => x.value)) };
  };

  $: leadsLineCfg = lineConfig((leads?.leadsByDay ?? []).map((d) => d.date.slice(5)), (leads?.leadsByDay ?? []).map((d) => d.value), ' leads');
  $: sourceDonutCfg = doughnutConfig(topRows(leads?.bySource ?? []), ' leads');
  $: budgetDonutCfg = doughnutConfig(topRows(leads?.byBudget ?? []), ' leads');
  $: destBarCfg = barConfig(topRows(leads?.byDestination ?? [], 7), { horizontal: true, unit: ' leads' });
  $: funnelCfg = funnel ? funnelConfig(funnel.stages) : null;
  $: deviceDonutCfg = doughnutConfig(topRows(traffic?.byDevice ?? [], 3));

  $: ga4ListBlocks = ga4
    ? [
        { title: 'Top pages', list: cleanRows(ga4.topPages, 8) },
        { title: 'Traffic sources', list: cleanRows(ga4.sources) },
        { title: 'Countries', list: cleanRows(ga4.countries) },
        { title: 'Devices', list: cleanRows(ga4.devices, 3) }
      ]
    : [];
  // Most-viewed tours / destinations, derived from real GA4 page paths.
  const pagesUnder = (prefix: string, n = 6) =>
    cleanRows((ga4?.topPages ?? []).filter((p) => String(p.label).startsWith(prefix) && String(p.label) !== prefix)
      .map((p) => ({ label: String(p.label).replace(prefix, '').replace(/\/$/, '') || '—', value: p.value })), n);
  $: topTourPages = ga4?.configured ? pagesUnder('/tours/') : { rows: [], max: 1 };
  $: topDestPages = ga4?.configured ? pagesUnder('/destinations/') : { rows: [], max: 1 };

  $: breakdownBlocks = leads
    ? [
        { t: 'Experience interests', ...cleanRows(leads.byExperience) },
        { t: 'Traveller type', ...cleanRows(leads.byTravellerType) },
        { t: 'Accommodation preference', ...cleanRows(leads.byAccommodation) }
      ]
    : [];
  $: statusRows = leads ? cleanRows(leads.byStatus, 8) : { rows: [], max: 1 };
  $: topEventRows = traffic ? cleanRows(traffic.topEvents, 8) : { rows: [], max: 1 };
</script>

<section class="grid gap-6">
  <!-- header + range filter -->
  <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
    <div>
      <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Insights</p>
      <h2 class="mt-1 text-2xl font-bold text-ink">Analytics &amp; lead performance</h2>
      <p class="mt-1 text-sm text-ink/55">
        What's working, what's not, and what to do next.{#if lastUpdatedLabel}<span class="ml-1 text-ink/40">· {lastUpdatedLabel}</span>{/if}
      </p>
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
    <!-- full-page skeleton -->
    <div class="h-40 animate-pulse rounded-none border border-ink/10 bg-surface/70"></div>
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {#each Array(8) as _}<div class="h-32 animate-pulse rounded-none border border-ink/10 bg-surface/70"></div>{/each}
    </div>
    <div class="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
      <div class="h-72 animate-pulse rounded-none border border-ink/10 bg-surface/70"></div>
      <div class="h-72 animate-pulse rounded-none border border-ink/10 bg-surface/70"></div>
    </div>
  {:else if !overview}
    <AnalyticsEmpty icon={BarChart3} title="Couldn't load analytics" minHeight={260}
      description="We couldn't reach the analytics service. Check your connection and try again — your tracking is still recording in the background."
      hint="Pick a date range above to retry." />
  {:else}
    <!-- ── AI INSIGHTS (first thing you see) ─────────────────────────────── -->
    <div class="rounded-none border border-goldfinch-gold/30 bg-gradient-to-br from-forest/[0.04] to-goldfinch-gold/[0.06] p-5 shadow-card">
      <div class="mb-3 flex items-center gap-2">
        <span class="grid h-8 w-8 place-items-center rounded-xl bg-forest text-white"><Sparkles size={17} /></span>
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">AI insights</p>
          <h3 class="text-lg font-bold text-ink">Your key takeaways this period</h3>
        </div>
      </div>
      {#if insights.length}
        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {#each insights as ins}
            {@const I = ins.icon}
            <div class="flex gap-3 rounded-xl border border-ink/[0.07] bg-surface/80 p-3.5">
              <span class={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${TONE[ins.tone]}`}><I size={16} /></span>
              <div class="min-w-0">
                <p class="text-[11px] font-bold uppercase tracking-[0.1em] text-ink/45">{ins.label}</p>
                <p class="mt-0.5 text-[13px] leading-5 text-ink/75">{ins.text}</p>
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <AnalyticsEmpty icon={Sparkles} title="Insights are warming up" minHeight={140}
          description="As soon as visitors browse tours and submit enquiries, we'll surface trends, your top destination, best traffic source and the biggest funnel drop-off here."
          hint="Share your site link on WhatsApp, Instagram or Google to start collecting data." />
      {/if}
    </div>

    <!-- ── KPI cards (sparkline + trend + click to drill in) ─────────────── -->
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {#each cards as c}
        {@const Icon = c.icon}
        {@const m = c.series.length ? momentum(c.series) : null}
        <button
          type="button"
          class="group rounded-none border border-ink/10 bg-surface p-5 text-left shadow-card transition hover:-translate-y-0.5 hover:border-goldfinch-gold/40 hover:shadow-[0_16px_40px_-18px_rgba(28,26,22,0.35)]"
          on:click={() => scrollTo(c.anchor)}
        >
          <div class="flex items-start justify-between">
            <span class="grid h-11 w-11 place-items-center rounded-2xl bg-forest/10 text-forest ring-1 ring-ink/5 dark:text-goldfinch-gold"><Icon size={19} /></span>
            {#if m}
              <span class={`inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-[10px] font-bold ${m.pct >= 0 ? 'bg-emerald-500/12 text-emerald-600' : 'bg-red-500/12 text-red-600'}`}>
                {#if m.pct >= 0}<ArrowUpRight size={12} />{:else}<ArrowDownRight size={12} />{/if}{Math.abs(m.pct)}%
              </span>
            {/if}
          </div>
          <p class="mt-4 text-3xl font-bold text-ink"><Counter value={typeof c.value === 'number' ? c.value : 0} suffix={c.suffix} decimals={c.suffix === '%' ? 1 : 0} /></p>
          <div class="mt-1 flex items-end justify-between gap-2">
            <div class="min-w-0">
              <p class="text-sm font-semibold text-ink/70">{c.label}</p>
              <p class="mt-0.5 truncate text-xs text-ink/50">{c.helper}</p>
            </div>
            {#if c.series.length}<span class="shrink-0 text-forest/70"><Sparkline data={c.series} color="#4A3728" /></span>{/if}
          </div>
        </button>
      {/each}
    </div>

    <!-- ── UX Insights · Microsoft Clarity (companion to GA4, not a rebuild) ── -->
    <div class="rounded-none border border-ink/10 bg-surface p-5 shadow-card">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="flex items-center gap-2">
          <span class="grid h-8 w-8 place-items-center rounded-xl bg-forest text-white"><MousePointerClick size={17} /></span>
          <div>
            <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">UX insights · Microsoft Clarity</p>
            <h3 class="text-lg font-bold text-ink">The “why” behind the numbers</h3>
          </div>
        </div>
        <span class={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${clarityConnected ? 'bg-emerald-500/12 text-emerald-600' : 'bg-ink/[0.06] text-ink/50'}`}>
          <span class={`h-2 w-2 rounded-full ${clarityConnected ? 'bg-emerald-500' : 'bg-ink/30'}`}></span>
          {clarityConnected ? 'Connected' : 'Not connected'}
        </span>
      </div>
      <p class="mt-2 max-w-2xl text-sm leading-6 text-ink/60">
        Clarity records real sessions and builds heatmaps — capturing rage clicks, dead clicks and scroll behaviour. It's the qualitative UX layer that complements GA4's metrics: GA4 stays your primary business analytics, while recordings &amp; heatmaps live inside Clarity.
      </p>

      {#if clarityConnected}
        <div class="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {#each CLARITY_CAPS as cap}
            {@const CI = cap.icon}
            <div class="rounded-xl border border-ink/[0.07] bg-sand/20 p-3">
              <span class="grid h-8 w-8 place-items-center rounded-lg bg-forest/10 text-forest dark:text-goldfinch-gold"><CI size={16} /></span>
              <p class="mt-2 text-[13px] font-bold text-ink/80">{cap.label}</p>
              <p class="mt-0.5 text-[11px] leading-4 text-ink/50">{cap.desc}</p>
            </div>
          {/each}
        </div>
        <div class="mt-4 flex flex-wrap items-center gap-2">
          <a class="inline-flex items-center gap-2 rounded-lg bg-forest px-4 py-2.5 text-sm font-bold text-white transition hover:bg-forest/90" href={clarityUrl} target="_blank" rel="noopener noreferrer">
            Open Microsoft Clarity <ExternalLink size={15} />
          </a>
          <span class="text-xs text-ink/45">Recordings &amp; heatmaps open in Clarity — nothing is duplicated here.</span>
        </div>

        <!-- Future AI UX insights — architecture ready, not yet generated -->
        <div class="mt-4 rounded-xl border border-dashed border-goldfinch-gold/30 bg-goldfinch-gold/[0.05] p-4">
          <p class="flex items-center gap-1.5 text-xs font-bold text-clay"><Sparkles size={14} /> AI UX recommendations</p>
          {#if clarityUxInsights.length}
            <div class="mt-2 grid gap-2">
              {#each clarityUxInsights as ux}
                <div><p class="text-[13px] font-bold text-ink/80">{ux.title}</p><p class="text-xs text-ink/55">{ux.detail}</p></div>
              {/each}
            </div>
          {:else}
            <p class="mt-1 text-xs leading-5 text-ink/55">Coming soon: automatic call-outs for your biggest funnel drop-off, most rage-clicked elements, mobile usability issues and high-performing CTAs — generated from Clarity data. This panel is already wired to display them.</p>
          {/if}
        </div>
      {:else}
        <div class="mt-4">
          <AnalyticsEmpty icon={PlayCircle} title="Connect Microsoft Clarity for UX analytics" minHeight={180}
            description="Create a free Clarity project, then set PUBLIC_CLARITY_PROJECT_ID in the environment. Clarity then loads automatically on the live site after cookie consent — session recordings, heatmaps and rage/dead-click detection, with no further code changes."
            hint="Clarity masks all form inputs by default; keep the dashboard masking on 'Mask' or 'Balanced' for privacy." />
          <div class="mt-3">
            <a class="inline-flex items-center gap-2 rounded-lg border border-forest px-4 py-2.5 text-sm font-bold text-forest transition hover:bg-forest hover:text-white" href="https://clarity.microsoft.com/" target="_blank" rel="noopener noreferrer">
              Create a free Clarity project <ExternalLink size={15} />
            </a>
          </div>
        </div>
      {/if}
    </div>

    <!-- ── funnel (interactive: click a step; bottleneck auto-flagged) ───── -->
    {#if funnel}
      <div id="sec-funnel" class="scroll-mt-24 rounded-none border border-ink/10 bg-surface p-5 shadow-card">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Conversion funnel</p>
            <h3 class="mt-1 text-xl font-bold text-ink">Visitor → Booked</h3>
          </div>
          {#if bottleneck}
            <span class="inline-flex items-center gap-1.5 rounded-full bg-amber-500/12 px-3 py-1 text-xs font-bold text-amber-600">
              <AlertTriangle size={13} /> Bottleneck: {bottleneck.label}
            </span>
          {/if}
        </div>
        {#if funnelCfg}<ChartCanvas {...funnelCfg} height={300} />{/if}
        <div class="mt-5 grid gap-3 sm:grid-cols-4">
          {#each funnelSteps as step, i}
            <button
              type="button"
              class={`rounded-xl border p-3 text-center transition ${activeStep === i ? 'border-forest bg-forest/[0.06]' : step.key === bottleneck?.key ? 'border-amber-400/60 bg-amber-50/40' : 'border-ink/10 bg-sand/25 hover:border-goldfinch-gold/40'}`}
              on:click={() => (activeStep = activeStep === i ? -1 : i)}
            >
              <p class="text-2xl font-extrabold text-heading">{step.rate}%</p>
              <p class="mt-0.5 text-[11px] font-semibold text-ink/55">{step.label}</p>
            </button>
          {/each}
        </div>
        {#if activeStep >= 0 && funnelSteps[activeStep]}
          <div class="mt-3 flex gap-3 rounded-xl border border-ink/[0.07] bg-sand/25 p-4">
            <span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-goldfinch-gold/15 text-clay"><Lightbulb size={17} /></span>
            <div>
              <p class="text-sm font-bold text-ink">{funnelSteps[activeStep].dropoff}% drop off at “{funnelSteps[activeStep].label}”</p>
              <p class="mt-0.5 text-xs leading-5 text-ink/60">{funnelSteps[activeStep].tip}</p>
            </div>
          </div>
        {:else}
          <p class="mt-3 text-center text-xs text-ink/45">Tap a step to see its drop-off and how to improve it. Per-step device &amp; source splits need GA4 event scopes (backend).</p>
        {/if}
      </div>
    {/if}

    <!-- ── GA4 traffic quality ──────────────────────────────────────────── -->
    {#if ga4}
      <div id="sec-traffic" class="scroll-mt-24 rounded-none border border-ink/10 bg-surface p-5 shadow-card">
        <div class="mb-4 flex items-center justify-between">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Website traffic · GA4</p>
            <h3 class="mt-1 text-xl font-bold text-ink">Visitors, sources &amp; quality</h3>
          </div>
          {#if ga4.configured}
            <span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600">
              <span class="h-2 w-2 rounded-full bg-emerald-500"></span>{ga4.activeUsers} active now
            </span>
          {/if}
        </div>

        {#if !ga4.configured}
          <AnalyticsEmpty icon={Users} title="Connect GA4 for full traffic quality" minHeight={200}
            description="Add GA4_PROPERTY_ID, GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY on the backend to unlock visitors, sessions, page views, sources, countries, devices and most-viewed tours. Your lead & funnel analytics above already work without it."
            hint="Open Settings → Integrations to check the connection status." />
        {:else if ga4.error}
          <p class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">GA4 error: {ga4.error}</p>
        {:else}
          <div class="grid gap-4 sm:grid-cols-4">
            {#each [['Users', ga4.totalUsers], ['Sessions', ga4.sessions], ['Page views', ga4.pageViews], ['Active now', ga4.activeUsers]] as [label, value]}
              <div class="rounded-xl border border-ink/10 bg-sand/25 p-4">
                <p class="text-2xl font-extrabold text-ink"><Counter value={Number(value)} /></p>
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
            {#if topTourPages.rows.length || topDestPages.rows.length}
              <div class="mt-5 grid gap-5 md:grid-cols-2">
                {#each [{ t: 'Most viewed tours', d: topTourPages, i: Trophy }, { t: 'Most viewed destinations', d: topDestPages, i: MapPin }] as blk}
                  {@const BI = blk.i}
                  <div class="rounded-xl border border-ink/[0.07] bg-sand/20 p-4">
                    <p class="flex items-center gap-1.5 text-xs font-bold text-ink/70"><BI size={14} /> {blk.t}</p>
                    {#if blk.d.rows.length}
                      <div class="mt-2 grid gap-2">
                        {#each blk.d.rows as row}
                          <div class="flex items-center justify-between text-[11px]">
                            <span class="truncate font-semibold text-ink/70" title={row.label}>{row.label}</span>
                            <span class="font-bold text-ink/50">{row.value}</span>
                          </div>
                        {/each}
                      </div>
                    {:else}
                      <p class="mt-2 text-xs text-ink/45">No page views yet.</p>
                    {/if}
                  </div>
                {/each}
              </div>
            {/if}
          {/if}
        {/if}
      </div>
    {/if}

    <!-- ── leads over time + source ─────────────────────────────────────── -->
    <div id="sec-leads" class="grid scroll-mt-24 gap-6 xl:grid-cols-[1.3fr_0.7fr]">
      <div class="rounded-none border border-ink/10 bg-surface p-5 shadow-card">
        <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Leads over time</p>
        <h3 class="mt-1 text-xl font-bold text-ink">Leads by day</h3>
        <div class="mt-3">
          {#if (leads?.leadsByDay ?? []).some((d) => d.value > 0)}<ChartCanvas {...leadsLineCfg} height={280} />
          {:else}<AnalyticsEmpty icon={ClipboardList} title="No leads in this range yet" minHeight={280}
            description="Every 'Plan my safari', 'Request this trip' and AI advisor enquiry appears here so you can see which days and campaigns drive demand."
            hint="Run a WhatsApp or Instagram campaign, then check back." />{/if}
        </div>
      </div>
      <div class="rounded-none border border-ink/10 bg-surface p-5 shadow-card">
        <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Where leads come from</p>
        <h3 class="mt-1 text-xl font-bold text-ink">Lead source</h3>
        <div class="mt-3">
          {#if (leads?.bySource ?? []).some((x) => x.value > 0)}<ChartCanvas {...sourceDonutCfg} height={280} />
          {:else}<AnalyticsEmpty icon={Compass} title="No source data yet" minHeight={280}
            description="Once enquiries come in, you'll see whether they start from the planner, a tour page or the AI advisor." />{/if}
        </div>
      </div>
    </div>

    <!-- ── lead status pipeline ─────────────────────────────────────────── -->
    {#if statusRows.rows.length}
      <div class="rounded-none border border-ink/10 bg-surface p-5 shadow-card">
        <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Pipeline</p>
        <h3 class="mt-1 text-xl font-bold text-ink">Lead status</h3>
        <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {#each statusRows.rows as s}
            <div class="rounded-xl border border-ink/10 bg-sand/25 p-4">
              <p class="text-2xl font-extrabold text-heading">{s.value}</p>
              <p class="mt-0.5 text-xs font-semibold capitalize text-ink/60">{s.label.replace(/_/g, ' ')}</p>
              <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-sand/50">
                <div class="h-full rounded-full bg-gradient-to-r from-forest to-goldfinch-gold" style={`width: ${(s.value / statusRows.max) * 100}%`}></div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- ── demand + budget ──────────────────────────────────────────────── -->
    <div class="grid gap-6 xl:grid-cols-2">
      <div class="rounded-none border border-ink/10 bg-surface p-5 shadow-card">
        <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Demand</p>
        <h3 class="mt-1 text-xl font-bold text-ink">Most requested destinations</h3>
        <div class="mt-3">
          {#if (leads?.byDestination ?? []).some((x) => x.label !== 'Not specified' && x.value > 0)}<ChartCanvas {...destBarCfg} height={280} />
          {:else}<AnalyticsEmpty icon={MapPin} title="No destination demand yet" minHeight={280}
            description="When enquiries name a destination, this ranks which parks and regions travellers want most — useful for planning offers and content." />{/if}
        </div>
      </div>
      <div class="rounded-none border border-ink/10 bg-surface p-5 shadow-card">
        <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Budget</p>
        <h3 class="mt-1 text-xl font-bold text-ink">Budget range mix</h3>
        <div class="mt-3">
          {#if (leads?.byBudget ?? []).some((x) => x.value > 0)}<ChartCanvas {...budgetDonutCfg} height={280} />
          {:else}<AnalyticsEmpty icon={Target} title="No budget data yet" minHeight={280}
            description="See how enquiries split across budget tiers so you can weight your itineraries and pricing accordingly." />{/if}
        </div>
      </div>
    </div>

    <!-- ── ranked lead breakdowns ───────────────────────────────────────── -->
    <div class="grid gap-6 lg:grid-cols-3">
      {#each breakdownBlocks as block}
        <div class="rounded-none border border-ink/10 bg-surface p-5 shadow-card">
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
            <p class="mt-3 text-sm text-ink/45">No {block.t.toLowerCase()} captured yet.</p>
          {/if}
        </div>
      {/each}
    </div>

    <!-- ── events (business/dev toggle) + devices ───────────────────────── -->
    {#if traffic}
      <div id="sec-events" class="grid scroll-mt-24 gap-6 lg:grid-cols-[0.55fr_0.45fr]">
        <div class="rounded-none border border-ink/10 bg-surface p-5 shadow-card">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-ink">Top interactions</h3>
            <div class="inline-flex rounded-lg border border-ink/10 bg-sand/40 p-0.5 text-[11px] font-bold">
              <button type="button" class={`rounded-md px-2.5 py-1 transition ${eventView === 'business' ? 'bg-forest text-white' : 'text-ink/55'}`} on:click={() => (eventView = 'business')}>Business</button>
              <button type="button" class={`rounded-md px-2.5 py-1 transition ${eventView === 'dev' ? 'bg-forest text-white' : 'text-ink/55'}`} on:click={() => (eventView = 'dev')}>Developer</button>
            </div>
          </div>
          {#if topEventRows.rows.length}
            <div class="mt-3 grid gap-2.5">
              {#each topEventRows.rows as ev}
                <div>
                  <div class="flex items-center justify-between text-xs">
                    <span class={`font-semibold text-ink/75 ${eventView === 'dev' ? 'font-mono' : ''}`}>{eventView === 'dev' ? ev.label : prettyEvent(ev.label)}</span>
                    <span class="font-bold text-ink/55">{ev.value}</span>
                  </div>
                  <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-sand/50">
                    <div class="h-full rounded-full bg-gradient-to-r from-forest to-goldfinch-gold" style={`width: ${(ev.value / topEventRows.max) * 100}%`}></div>
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <AnalyticsEmpty icon={MousePointerClick} title="No interactions captured yet" minHeight={200}
              description="Tour views, searches, CTA clicks and form opens appear here as visitors explore — switch to Developer view for the raw GA4 event names."
              hint="Interactions start recording the moment someone lands on the site." />
          {/if}
        </div>
        <div class="rounded-none border border-ink/10 bg-surface p-5 shadow-card">
          <h3 class="text-sm font-bold text-ink">Devices</h3>
          <div class="mt-3">
            {#if traffic.byDevice.some((x) => x.value > 0)}<ChartCanvas {...deviceDonutCfg} height={200} />
            {:else}<AnalyticsEmpty icon={Users} title="No device data yet" minHeight={200}
              description="See the mobile / tablet / desktop split so you know where to optimise the booking experience first." />{/if}
          </div>
        </div>
      </div>
    {/if}
  {/if}
</section>
