<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { fly } from 'svelte/transition';
  import { cubicIn, cubicOut } from 'svelte/easing';
  import {
    Activity, AlertTriangle, AppWindow, ArrowDownRight, ArrowRight, ArrowUpRight, BarChart3, CalendarDays, Check,
    CheckCircle2, ChevronDown, ClipboardList, Compass, Copy, Download, ExternalLink, Eye, Flame, Globe, Hand, History,
    Info, Lightbulb, Link2, ListChecks, MapPin, MessageCircle, Monitor, MousePointer2, MousePointerClick,
    MoveVertical, PlayCircle, RefreshCw, ScanEye, Send, ShieldCheck, Target, TrendingUp, Trophy, Users, Zap
  } from '@lucide/svelte';
  import { env as publicEnv } from '$env/dynamic/public';
  import { api } from '$lib/api/client';
  import { clarityDashboardUrl } from '$lib/clarity';
  import ChartCanvas from '$lib/components/admin/ChartCanvas.svelte';
  import Sparkline from '$lib/components/admin/Sparkline.svelte';
  import Counter from '$lib/components/admin/Counter.svelte';
  import AnalyticsEmpty from '$lib/components/admin/AnalyticsEmpty.svelte';
  import MetricCard from '$lib/components/admin/ux/MetricCard.svelte';
  import SourceBadge from '$lib/components/admin/ux/SourceBadge.svelte';
  import BreakdownBars from '$lib/components/admin/ux/BreakdownBars.svelte';
  import DeepLinkCard from '$lib/components/admin/ux/DeepLinkCard.svelte';
  import ScoreRing from '$lib/components/admin/ux/ScoreRing.svelte';
  import MainLeads from '$lib/components/admin/analytics/MainLeads.svelte';
  import AnalyticsDecisionDeck from '$lib/components/admin/analytics/AnalyticsDecisionDeck.svelte';
  import Interpretation from '$lib/components/admin/analytics/Interpretation.svelte';
  import type { MainLeadsData } from '$lib/components/admin/analytics/types';
  import type { Interpretation as InterpretationData } from '$lib/components/admin/analytics/interpretation';
  import { barConfig, doughnutConfig, funnelConfig, lineConfig } from '$lib/charts';

  type Tally = Array<{ label: string; value: number }>;
  // `ok: false` on any of these: a read behind it failed, so its zeros are unknowns.
  type Overview = {
    ok?: boolean;
    visitors: number; pageViews: number; interactions: number; activeVisitors: number;
    planMyTripSubmissions: number; requestTripSubmissions: number; itineraryRequests: number;
    whatsappClicks: number; phoneClicks: number; emailClicks: number;
    totalLeads: number; formOpens: number; formSubmissions: number; formOpenersWhoSent: number;
    formConversionRate: number; leadConversionRate: number; automatedExcluded: number;
  };
  type LeadData = {
    ok?: boolean;
    total: number; leadsByDay: Array<{ date: string; value: number }>;
    bySource: Tally; byDestination: Tally; byBudget: Tally; byExperience: Tally;
    byTravellerType: Tally; byAccommodation: Tally; byStatus: Tally;
  };
  type FunnelDrop = {
    from: string; fromLabel: string; fromValue: number; to: string; toLabel: string; toValue: number;
    comparable: boolean; dropPct: number | null;
  };
  type Funnel = {
    ok?: boolean;
    stages: Array<{ key: string; label: string; value: number }>;
    drops: FunnelDrop[];
    /** The one bottleneck, chosen by the API with the same rule as the Website Intelligence summary. */
    biggestDrop: FunnelDrop | null;
    rates: Record<string, number>;
  };
  type Traffic = {
    ok?: boolean;
    byDay: Array<{ date: string; visitors: number; pageViews: number; interactions: number; whatsapp: number; events: number }>;
    byDevice: Tally; topEvents: Tally;
  };
  type Ga4 = {
    configured: boolean; error?: string; activeUsers: number; totalUsers: number; sessions: number; pageViews: number;
    byDay: Array<{ date: string; users: number; sessions: number; pageViews: number }>;
    topPages: Tally; sources: Tally; countries: Tally; devices: Tally;
  };
  // Real Microsoft Clarity aggregates (Data Export API) — nulls where unavailable.
  type ClarityTotals = {
    sessions: number | null; botSessions: number | null; distinctUsers: number | null; pagesPerSession: number | null;
    avgScrollDepth: number | null; totalTimeMs: number | null; activeTimeMs: number | null; rageClicks: number | null;
    deadClicks: number | null; excessiveScroll: number | null; quickBacks: number | null; scriptErrors: number | null; errorClicks: number | null;
  };
  type Clarity = {
    configured: boolean; error?: string; windowDays: number; fetchedAt: string | null;
    totals: ClarityTotals; byDevice: Tally; byBrowser: Tally; byCountry: Tally; byUrl: Tally;
  };
  // Deterministic website-intelligence engine (no LLM) — health/category scores,
  // executive summary, rule-based alerts, prioritized actions, real timeline,
  // and the plain-language `interpretation` of the period shown under Main leads.
  // `changePct` is null when the earlier figure is too small (under 5) or the
  // earlier period ends before tracking / the first lead existed; the card then
  // shows `previous` itself ("vs 12").
  type MetricRef = { value: number | null; source: string; changePct: number | null; previous?: number | null; status: 'direct' | 'derived' | 'na'; note?: string };
  type CategoryScore = { key: string; label: string; score: number | null; changePct: number | null; available: boolean; reason: string; basis: string };
  type WiAlert = { id: string; severity: 'critical' | 'warning' | 'info' | 'success'; category: string; title: string; detail: string; metric: string | null; deepLink?: string };
  type WiAction = { id: string; priority: 'critical' | 'high' | 'medium' | 'low'; category: string; issue: string; supportingMetric: string; why: string; fix: string; expectedOutcome: string; effort: 'easy' | 'medium' | 'hard'; confidence: 'high' | 'medium' | 'low'; deepLink?: string };
  type WiTimeline = { when: string; date: string; label: string; detail: string; direction: 'up' | 'down' | 'flat' };
  type Intelligence = {
    generatedAt: string; range: { from: string; to: string; days: number; label: string };
    sources: { firstParty: boolean; ga4: boolean; clarity: boolean };
    health: { score: number | null; status: string; changePct: number | null; criticalCount: number; basis: string; contributing: string[] };
    categoryScores: CategoryScore[];
    // automatedExcluded = sessions left out as automated in the range (a network
    // opening more than 10 sessions in one UTC day).
    executive: { metrics: Record<string, MetricRef>; automatedExcluded?: number; biggestDropOff: string | null; topIssue: string | null };
    alerts: WiAlert[]; actions: WiAction[]; timeline: WiTimeline[];
    interpretation?: InterpretationData | null;
  };
  // A source-labeled KPI — provider-agnostic so new providers slot in unchanged.
  type MetricCardModel = {
    key: string; label: string; value: number | null; format?: 'number' | 'percent' | 'duration' | 'currency';
    source: string; available: boolean; deepLink?: string; deepLinkLabel?: string; emptyText?: string;
    hint?: string; series?: number[]; icon?: typeof Users; accent?: string;
  };

  const RANGES = [
    { k: 'today', l: 'Today' }, { k: 'yesterday', l: 'Yesterday' }, { k: '7d', l: '7 days' },
    { k: '30d', l: '30 days' }, { k: 'this_month', l: 'This month' }, { k: 'last_month', l: 'Last month' }
  ];

  // Each analytics area is intentionally a focused workspace rather than one
  // long scroll. The selected area is saved in the URL so a copied dashboard
  // link opens the exact report a teammate was reviewing.
  type AnalyticsTab = 'overview' | 'leads' | 'conversion' | 'demand' | 'health' | 'experience' | 'traffic';
  const ANALYTICS_TABS: Array<{ key: AnalyticsTab; label: string; description: string; icon: typeof Target }> = [
    { key: 'overview', label: 'Overview', description: 'Snapshot, insights & next move', icon: BarChart3 },
    { key: 'leads', label: 'Leads', description: 'Channels, sources & pipeline', icon: Target },
    { key: 'conversion', label: 'Conversion', description: 'Visitor-to-booked journey', icon: TrendingUp },
    { key: 'demand', label: 'Demand', description: 'Destinations, budgets & preferences', icon: Compass },
    { key: 'health', label: 'Website health', description: 'Scores, alerts & action plan', icon: ShieldCheck },
    { key: 'experience', label: 'Visitor experience', description: 'Friction, behaviour & Clarity', icon: MousePointerClick },
    { key: 'traffic', label: 'Traffic', description: 'GA4, content & interactions', icon: Globe }
  ];
  const TAB_FOR_ANCHOR: Record<string, AnalyticsTab> = {
    'sec-interpretation': 'overview',
    'sec-main-leads': 'leads',
    'sec-leads': 'leads',
    'sec-funnel': 'conversion',
    'sec-ux': 'health',
    'sec-experience': 'experience',
    'sec-traffic': 'traffic',
    'sec-events': 'traffic'
  };

  let range = '30d';
  let loading = true;
  let overview: Overview | null = null;
  let leads: LeadData | null = null;
  let funnel: Funnel | null = null;
  let traffic: Traffic | null = null;
  let ga4: Ga4 | null = null;
  let clarity: Clarity | null = null;
  let intel: Intelligence | null = null;
  // Starts true so the reading under Main leads shows its skeleton, not its
  // empty state, until the first answer arrives.
  let intelLoading = true;
  let intelError = false;
  let copied = false;
  let updatedAt = 0;
  let eventView: 'business' | 'dev' = 'business';
  let activeStep = -1;
  let activeAnalyticsTab: AnalyticsTab = 'overview';
  let analyticsTabEls: HTMLButtonElement[] = [];
  let tabDirection = 1;
  let reduceMotion = false;

  // ── Microsoft Clarity — one source inside the UX Intelligence Hub. Recordings
  // & heatmaps stay in Clarity (deep-linked); real aggregates come from the API.
  const clarityId = publicEnv.PUBLIC_CLARITY_PROJECT_ID;
  const clarityConnected = Boolean(clarityId);
  const clarityUrl = clarityDashboardUrl(clarityId);
  const clarityLink = (view: string) =>
    clarityId ? `https://clarity.microsoft.com/projects/view/${clarityId}/${view}` : 'https://clarity.microsoft.com/';

  // ── Main leads (Plan My Trip · itinerary form · WhatsApp) — its own request
  // so it renders as soon as it answers and a failure there never blanks the
  // rest of the page. `mainLeadsReq` drops answers for a range no longer shown.
  let mainLeads: MainLeadsData | null = null;
  let mainLeadsLoading = true;
  let mainLeadsError = false;
  let mainLeadsReq = 0;
  const loadMainLeads = async () => {
    const req = ++mainLeadsReq;
    mainLeadsLoading = true;
    mainLeadsError = false;
    try {
      const res = await api.analytics.mainLeads({ range });
      if (req !== mainLeadsReq) return;
      mainLeads = (res.data ?? null) as MainLeadsData | null;
      mainLeadsError = !mainLeads;
    } catch {
      if (req !== mainLeadsReq) return;
      mainLeads = null;
      mainLeadsError = true;
    } finally {
      if (req === mainLeadsReq) mainLeadsLoading = false;
    }
  };
  $: rangeLabel = RANGES.find((r) => r.k === range)?.l ?? range;
  $: intelShown = intelFor === range ? intel : null;

  // `coreReq` drops answers for a range no longer selected (a slow 'Last month'
  // must not overwrite a quick 'Today').
  let coreReq = 0;
  const load = async () => {
    const req = ++coreReq;
    loading = true;
    // Drop any reading still on its way and show the panel as loading at once,
    // so the previous range's reading never sits at full strength under the
    // new one while the core figures load (loadIntel follows them below).
    intelReq++;
    intelLoading = true;
    void loadMainLeads();
    const params = { range };
    try {
      const [o, l, f, t, g] = await Promise.all([
        api.analytics.overview(params), api.analytics.leads(params),
        api.analytics.funnel(params), api.analytics.timeseries(params),
        api.analytics.traffic(params)
      ]);
      if (req !== coreReq) return;
      const parts = [o.data, l.data, f.data, t.data] as Array<{ ok?: boolean } | null>;
      // A read behind any of them failed: say so rather than show its zeros.
      if (parts.some((p) => !p || p.ok === false)) throw new Error('incomplete');
      overview = o.data as Overview;
      leads = l.data as LeadData;
      funnel = f.data as Funnel;
      traffic = t.data as Traffic;
      ga4 = g.data as Ga4;
      updatedAt = Date.now();
    } catch {
      if (req !== coreReq) return;
      overview = null; leads = null; funnel = null; traffic = null; ga4 = null;
    } finally {
      if (req === coreReq) loading = false;
    }
    if (req === coreReq) void loadIntel();
  };

  // Website Intelligence (Clarity aggregates + the deterministic health, alerts,
  // actions and the period's interpretation) loads after the core figures, so
  // the KPIs never wait on it and GA4 answers come from the cache they warmed.
  // `force` bypasses Clarity's server-side cache; `intelReq` drops answers for
  // a range no longer shown.
  let intelReq = 0;
  // The range key the reading in `intel` was asked for; a reading for another
  // range is never shown (`intelShown` is null until the new one arrives).
  let intelFor = '';
  const loadIntel = async (force = false) => {
    const req = ++intelReq;
    const forRange = range;
    intelLoading = true;
    try {
      const [c, w] = await Promise.all([
        api.analytics.clarity(force ? { refresh: '1' } : undefined).catch(() => null),
        api.analytics.intelligence({ range: forRange }).catch(() => null)
      ]);
      if (req !== intelReq) return;
      clarity = (c?.data ?? null) as Clarity | null;
      intel = (w?.data ?? null) as Intelligence | null;
      intelFor = forRange;
      intelError = !intel;
    } finally {
      if (req === intelReq) intelLoading = false;
    }
  };

  // ── Export + share (real data only) ─────────────────────────────────────────
  // One meaning per column: "Change vs prev" only ever holds a % change, the
  // earlier figure sits in "Previous period", and a finding's or action's kind
  // and next step have their own columns.
  const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const SOURCE_NAME: Record<string, string> = { website: 'In-house', ga4: 'GA4', clarity: 'Microsoft Clarity' };
  const sourceName = (src: string) => SOURCE_NAME[src] ?? src;
  const exportCsv = () => {
    if (typeof document === 'undefined') return;
    const rows: string[][] = [['Section', 'Kind', 'Metric', 'Value', 'Previous period', 'Change vs prev', 'Source', 'Next step']];
    const shown = intelShown;
    const m = shown?.executive.metrics ?? {};
    for (const cfg of execConfig) {
      const v = m[cfg.key];
      if (!v) continue;
      const unit = cfg.format === 'percent' ? '%' : '';
      rows.push(['Executive', '', cfg.label, v.value == null ? 'N/A' : `${v.value}${unit}`, v.previous == null ? '' : `${v.previous}${unit}`, v.changePct == null ? '' : `${v.changePct}%`, sourceName(v.source), '']);
    }
    const auto = shown?.executive.automatedExcluded ?? 0;
    if (auto > 0) rows.push(['Executive', '', 'Automated sessions left out', String(auto), '', '', 'In-house', '']);
    for (const sc of categoryScores) rows.push(['Score', '', sc.label, sc.score == null ? 'N/A' : String(sc.score), '', sc.changePct == null ? '' : `${sc.changePct}%`, 'Derived', '']);
    for (const a of shown?.actions ?? []) rows.push(['Action', a.priority, a.issue, a.supportingMetric, '', '', '', a.fix]);
    for (const f of shown?.interpretation?.findings ?? []) rows.push(['Finding', f.kind, f.title, f.evidence, '', '', sourceName(f.source), f.action ?? '']);
    const csv = rows.map((r) => r.map(csvCell).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = `website-analytics-${range}.csv`; a.click();
    URL.revokeObjectURL(url);
  };
  const copyLink = async () => {
    if (typeof window === 'undefined') return;
    try { await navigator.clipboard.writeText(window.location.href); copied = true; setTimeout(() => (copied = false), 1800); } catch { /* clipboard blocked */ }
  };

  const setRange = (k: string) => { range = k; activeStep = -1; void load(); };
  let rangeMenuOpen = false;
  let rangeMenuEl: HTMLDivElement | null = null;
  let rangeButtonEl: HTMLButtonElement | null = null;
  // The menu belongs to its button: once the workspace scrolls the button away, close it.
  const closeOnScroll = (_node: HTMLElement) => {
    const close = () => (rangeMenuOpen = false);
    document.addEventListener('scroll', close, true);
    return { destroy: () => document.removeEventListener('scroll', close, true) };
  };
  const panelEnter = () => reduceMotion
    ? { duration: 0 }
    : { x: 14 * tabDirection, y: 8, duration: 320, easing: cubicOut };
  const panelExit = () => reduceMotion
    ? { duration: 0 }
    : { x: -8 * tabDirection, y: -4, duration: 170, easing: cubicIn };
  const scrollWorkspaceToTop = () => {
    if (typeof document === 'undefined') return;
    const scroller = document.querySelector<HTMLElement>('.admin-shell main[data-lenis-prevent]');
    scroller?.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  };
  const setAnalyticsTab = (key: AnalyticsTab, writeUrl = true, resetScroll = true) => {
    if (key !== activeAnalyticsTab) {
      const currentIndex = ANALYTICS_TABS.findIndex((tab) => tab.key === activeAnalyticsTab);
      const nextIndex = ANALYTICS_TABS.findIndex((tab) => tab.key === key);
      tabDirection = nextIndex >= currentIndex ? 1 : -1;
      activeAnalyticsTab = key;
      if (resetScroll) requestAnimationFrame(scrollWorkspaceToTop);
    }
    if (!writeUrl || typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (key === 'overview') url.searchParams.delete('tab');
    else url.searchParams.set('tab', key);
    window.history.replaceState(window.history.state, '', url);
  };
  const onAnalyticsTabKey = (event: KeyboardEvent, index: number) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? ANALYTICS_TABS.length - 1
        : (index + (event.key === 'ArrowRight' ? 1 : ANALYTICS_TABS.length - 1)) % ANALYTICS_TABS.length;
    setAnalyticsTab(ANALYTICS_TABS[next].key);
    analyticsTabEls[next]?.focus();
  };
  const scrollTo = async (id: string) => {
    if (typeof document === 'undefined') return;
    const target = id.replace(/^#/, '');
    const tab = TAB_FOR_ANCHOR[target];
    if (tab && tab !== activeAnalyticsTab) {
      setAnalyticsTab(tab, true, false);
      await tick();
    }
    const element = document.getElementById(target);
    const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    element?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  };
  onMount(() => {
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotionPreference = () => (reduceMotion = motionPreference.matches);
    syncMotionPreference();
    motionPreference.addEventListener?.('change', syncMotionPreference);
    const requested = new URLSearchParams(window.location.search).get('tab');
    if (requested && ANALYTICS_TABS.some((tab) => tab.key === requested)) setAnalyticsTab(requested as AnalyticsTab, false);
    void load();
    return () => motionPreference.removeEventListener?.('change', syncMotionPreference);
  });

  // ── helpers ──────────────────────────────────────────────────────────────
  const pct = (a: number, b: number) => (b > 0 ? Math.round(((a - b) / b) * 100) : a > 0 ? 100 : 0);
  // Momentum = second half of the period vs the first, over whole days only
  // (the series below leave today out) split into two equal halves; none when
  // the first half is under 5, where a % says nothing.
  const momentum = (series: number[]): { pct: number } | null => {
    const s = (series ?? []).filter((n) => Number.isFinite(n));
    if (s.length < 4) return null;
    const half = Math.floor(s.length / 2);
    const earlier = s.slice(s.length - 2 * half, s.length - half).reduce((a, b) => a + b, 0);
    const recent = s.slice(s.length - half).reduce((a, b) => a + b, 0);
    if (earlier < 5) return null;
    return { pct: pct(recent, earlier) };
  };
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
  // Whole days only: today is still filling up and would read as a fall.
  $: todayUtc = new Date(now).toISOString().slice(0, 10);
  $: wholeDays = (traffic?.byDay ?? []).filter((d) => d.date < todayUtc);
  $: visitorSeries = wholeDays.map((d) => d.visitors);
  $: waSeries = wholeDays.map((d) => d.whatsapp);

  // ── UX friction cards (Clarity) — real or honestly empty; source-labeled.
  // The business + GA4 KPIs now live in the deterministic Executive summary.
  $: ga4Cfg = ga4?.configured === true;
  // Clarity has two separate switches: recordings and heatmaps run from
  // PUBLIC_CLARITY_PROJECT_ID on the site; the figures here need the data-export
  // token (CLARITY_API_TOKEN) on the server. `configured` with an `error` means
  // the token is there but the export call failed — say why, never "not connected".
  $: cCfg = clarity?.configured === true && !clarity.error; // export answering with real numbers
  $: clarityExportStatus = !clarity
    ? intelLoading ? 'Checking the data export…' : "Couldn't check the data export"
    : clarity.configured
      ? clarity.error ? `Export connected but failing: ${clarity.error}` : 'Data export live'
      : 'Data export not set up on this server (CLARITY_API_TOKEN)';
  // Short form for the small UX cards; the full reason sits in the connection panel.
  $: clarityCardEmpty = !clarity || cCfg ? '' : clarity.configured ? 'Export failing' : 'Export not set up';
  $: cT = clarity?.totals ?? null;

  $: clarityMetrics = [
    { key: 'rage', label: 'Rage clicks', value: cT?.rageClicks ?? null, source: 'clarity', available: cCfg && cT?.rageClicks != null, deepLink: clarityLink('impressions'), deepLinkLabel: 'Watch recordings', emptyText: clarityCardEmpty, icon: Hand, accent: '#0F6CBD' },
    { key: 'dead', label: 'Dead clicks', value: cT?.deadClicks ?? null, source: 'clarity', available: cCfg && cT?.deadClicks != null, deepLink: clarityLink('impressions'), deepLinkLabel: 'Watch recordings', emptyText: clarityCardEmpty, icon: MousePointer2, accent: '#0F6CBD' },
    { key: 'scroll', label: 'Avg scroll depth', value: cT?.avgScrollDepth ?? null, format: 'percent', source: 'clarity', available: cCfg && cT?.avgScrollDepth != null, deepLink: clarityLink('heatmaps'), deepLinkLabel: 'Open heatmap', emptyText: clarityCardEmpty, icon: MoveVertical, accent: '#0F6CBD' },
    { key: 'quick', label: 'Quick-backs', value: cT?.quickBacks ?? null, source: 'clarity', available: cCfg && cT?.quickBacks != null, deepLink: clarityLink('impressions'), deepLinkLabel: 'Watch recordings', emptyText: clarityCardEmpty, icon: Zap, accent: '#0F6CBD' }
  ] as MetricCardModel[];

  // Breakdowns prefer GA4 (richer), falling back to Clarity; each stays labeled.
  $: deviceRows = ga4Cfg && ga4!.devices.length ? ga4!.devices : clarity?.byDevice ?? [];
  $: deviceSource = ga4Cfg && ga4!.devices.length ? 'ga4' : 'clarity';
  $: countryRows = ga4Cfg && ga4!.countries.length ? ga4!.countries : clarity?.byCountry ?? [];
  $: countrySource = ga4Cfg && ga4!.countries.length ? 'ga4' : 'clarity';
  $: pageRows = ga4Cfg && ga4!.topPages.length ? ga4!.topPages : clarity?.byUrl ?? [];
  $: pageSource = ga4Cfg && ga4!.topPages.length ? 'ga4' : 'clarity';
  $: browserRows = clarity?.byBrowser ?? [];

  // Connection panel — the outside sources, each reflecting its real config.
  // `failing` = set up but the last call errored (the note says why).
  $: hubSources = [
    {
      key: 'ga4', label: 'Google Analytics 4', connected: ga4Cfg, failing: ga4Cfg && Boolean(ga4?.error),
      note: !ga4Cfg ? 'Add GA4 credentials' : ga4?.error ? `Connected but failing: ${ga4.error}` : 'Traffic API · live'
    },
    {
      key: 'clarity', label: 'Microsoft Clarity', connected: clarityConnected, failing: clarity?.configured === true && Boolean(clarity.error),
      note: `${clarityConnected ? 'Recordings live' : 'Recordings off (PUBLIC_CLARITY_PROJECT_ID not set)'} · ${clarityExportStatus}`
    }
  ];
  $: connectedCount = hubSources.filter((s) => s.connected).length;

  // UX Health / Traffic Quality only come from the Clarity export: when it is
  // off or failing, their N/A line says which, in the same words as above.
  $: categoryScores = (intelShown?.categoryScores ?? []).map((cat) =>
    (cat.key === 'ux' || cat.key === 'traffic') && cat.score == null && clarity && !cCfg ? { ...cat, reason: clarityExportStatus } : cat
  );
  // The server's Clarity alert is rewritten from the same status (or added when
  // the export is failing and the server had none), so all three places agree.
  $: alerts = (() => {
    const list = intelShown?.alerts ?? [];
    if (!intelShown || !clarity || cCfg) return list;
    const status = clarityExportStatus.replace(/\.$/, '');
    const recordings = clarityConnected ? 'still open in Clarity' : 'need PUBLIC_CLARITY_PROJECT_ID on the site';
    const clarityAlert: WiAlert = clarity.configured
      ? {
          id: 'clarity-export', severity: 'warning', category: 'User Experience', title: 'Clarity data export failing',
          detail: `${status}. Rage/dead-click, scroll and quick-back figures here stay empty until it answers; recordings and heatmaps ${recordings}.`,
          metric: null
        }
      : {
          id: 'clarity-export', severity: 'info', category: 'User Experience', title: 'Clarity data export not set up',
          detail: `${status}. Rage/dead-click, scroll and quick-back figures here need it; recordings and heatmaps ${recordings}.`,
          metric: null
        };
    const at = list.findIndex((a) => a.id.startsWith('clarity'));
    if (at < 0) return [...list, clarityAlert];
    return list.flatMap((a, i) => (i === at ? [clarityAlert] : a.id.startsWith('clarity') ? [] : [a]));
  })();

  // ── Executive summary — real KPIs + previous-period benchmarks (deterministic).
  // One source per card (the chip says which); the hint says what is counted.
  // In-house counts leave automated sessions out; GA4 only sees visitors who
  // accepted cookies, so it has its own card and is never mixed into another.
  // No sparklines here: the daily series below count every session, which
  // would not match these totals.
  const execConfig: Array<{ key: string; label: string; hint: string; icon: typeof Users; accent: string; format?: 'percent' }> = [
    { key: 'visitors', label: 'Visitors', hint: 'Sessions that viewed a page', icon: Users, accent: '#4A3728' },
    { key: 'pageViews', label: 'Page views', hint: 'Pages opened on the site', icon: Eye, accent: '#4A3728' },
    { key: 'ga4Visitors', label: 'GA4 visitors', hint: 'Accepted cookies', icon: Users, accent: '#E37400' },
    { key: 'interactions', label: 'Interactions', hint: 'Clicks, form steps, contact taps', icon: MousePointerClick, accent: '#153733' },
    { key: 'leads', label: 'Leads', hint: 'All website enquiries', icon: Target, accent: '#153733' },
    { key: 'conversionRate', label: 'Conversion rate', hint: 'Leads ÷ visitors', icon: TrendingUp, accent: '#153733', format: 'percent' },
    { key: 'formOpens', label: 'Saw an enquiry form', hint: 'Visitors shown or opening a form', icon: ClipboardList, accent: '#4A3728' },
    { key: 'formSubmissions', label: 'Form submissions', hint: 'Enquiry forms sent', icon: Send, accent: '#4A3728' },
    { key: 'itineraryRequests', label: 'Itinerary requests', hint: 'Tour itinerary form', icon: MapPin, accent: '#153733' },
    { key: 'whatsappClicks', label: 'WhatsApp clicks', hint: 'Taps on WhatsApp buttons', icon: MessageCircle, accent: '#128C7E' }
  ];
  // The API names the site's own tracker 'website' (SourceBadge: "Website Tracking").
  const execSource = (src: string) => src;
  $: execCards = intelShown
    ? execConfig.flatMap((cfg) => {
        const ref = intelShown!.executive.metrics[cfg.key];
        return ref ? [{ cfg, ref }] : [];
      })
    : [];
  $: automatedExcluded = intelShown?.executive.automatedExcluded ?? 0;

  // deterministic-alert + action styling (const maps, used in markup)
  const ALERT_STYLE: Record<string, { cls: string; text: string; icon: typeof Info }> = {
    critical: { cls: 'border-red-300/70 bg-red-50/50', text: 'text-red-700', icon: AlertTriangle },
    warning: { cls: 'border-amber-300/70 bg-amber-50/40', text: 'text-amber-700', icon: AlertTriangle },
    info: { cls: 'border-ink/[0.12] bg-sand/25', text: 'text-ink/60', icon: Info },
    success: { cls: 'border-emerald-300/70 bg-emerald-50/40', text: 'text-emerald-700', icon: CheckCircle2 }
  };
  const PRIO_STYLE: Record<string, { label: string; cls: string; bar: string }> = {
    critical: { label: 'Critical', cls: 'bg-red-500/[0.12] text-red-600', bar: 'bg-red-500' },
    high: { label: 'High', cls: 'bg-amber-500/[0.12] text-amber-600', bar: 'bg-amber-500' },
    medium: { label: 'Medium', cls: 'bg-forest/[0.12] text-forest', bar: 'bg-forest' },
    low: { label: 'Low', cls: 'bg-ink/[0.06] text-ink/50', bar: 'bg-ink/30' }
  };
  $: healthStatusColor =
    intelShown?.health.score == null ? 'text-ink/40'
    : intelShown.health.score >= 70 ? 'text-emerald-600'
    : intelShown.health.score >= 50 ? 'text-amber-600' : 'text-red-500';

  // Every top card is in-house: the tracker (automated sessions left out) or
  // the website's enquiries in Bookings. GA4 has its own card further down.
  // Overview keeps just the four metrics a manager can act on quickly. Channel,
  // form and event detail has its own report, so it does not create a long,
  // duplicate dashboard on a phone.
  $: cards = overview
    ? [
        { label: 'Visitors', value: overview.visitors, suffix: '', helper: 'Visitors who viewed a page', icon: Users, series: visitorSeries, anchor: 'sec-funnel' },
        { label: 'Total leads', value: overview.totalLeads, suffix: '', helper: `${overview.leadConversionRate}% of visitors · all website enquiries`, icon: ClipboardList, series: [] as number[], anchor: 'sec-leads' },
        { label: 'WhatsApp clicks', value: overview.whatsappClicks, suffix: '', helper: `${overview.phoneClicks} phone · ${overview.emailClicks} email`, icon: MessageCircle, series: waSeries, anchor: 'sec-events' },
        { label: 'Lead rate', value: overview.leadConversionRate, suffix: '%', helper: 'Website enquiries ÷ visitors', icon: TrendingUp, series: [] as number[], anchor: 'sec-funnel' }
      ]
    : [];

  // ── Conversion funnel drop-offs + auto-detected bottleneck ──────────────────
  // Stages, in order: Visitors → Viewed a tour → Opened an enquiry form → Sent
  // an enquiry → Contacted → Quoted → Booked (distinct visitors from the in-house
  // tracker, then enquiry records and their status). Each step is worked out
  // from the stage values the chart shows; when the later stage is larger (or
  // the earlier one is empty) a drop can't be worked out, so the step reads
  // "not comparable" and is never picked as the bottleneck.
  const DROP_TIPS: Record<string, string> = {
    'visitor>tour_view': 'Most visitors never open a tour — feature tours on the pages people land on and keep them in the menu.',
    'tour_view>form_open': 'People look at tours but do not reach the enquiry form — keep the enquiry button in view near the price and itinerary.',
    'form_open>submitted': 'People see a form but do not send it — shorten it and make clear which fields are required.',
    'submitted>contacted': "Enquiries count as contacted only once their status in Bookings moves past 'pending' — reply and update the status.",
    'contacted>quoted': 'Send an itinerary and quote to contacted leads, and update the status in Bookings.',
    'quoted>booked': 'Follow up on sent quotes, and mark confirmed trips in Bookings.'
  };
  // Every adjacent pair of stages, as the API worked them out; "not comparable"
  // where the later stage is larger or the earlier one empty.
  $: funnelSteps = funnel
    ? (funnel.drops ?? []).map((d) => {
        const rate = d.comparable && d.fromValue > 0 ? Math.round((d.toValue / d.fromValue) * 1000) / 10 : null;
        return {
          key: `${d.from}>${d.to}`, label: `${d.fromLabel} → ${d.toLabel.toLowerCase()}`, tip: DROP_TIPS[`${d.from}>${d.to}`] ?? '',
          fromLabel: d.fromLabel, toLabel: d.toLabel, fromValue: d.fromValue, toValue: d.toValue, comparable: d.comparable, rate,
          dropoff: d.dropPct
        };
      })
    : [];
  // The bottleneck is the API's choice — the same rule as "Biggest drop-off" above.
  $: bottleneck = funnel?.biggestDrop ? funnelSteps.find((st) => st.key === `${funnel!.biggestDrop!.from}>${funnel!.biggestDrop!.to}`) ?? null : null;

  // ── Business-friendly event names (toggle vs raw GA4 names) ──────────────────
  const EVENT_LABELS: Record<string, string> = {
    page_view: 'Page viewed', tour_page_view: 'Tour viewed', destination_page_view: 'Destination viewed',
    safari_style_view: 'Safari style viewed', accommodation_view: 'Stay viewed', tour_list_view: 'Tours list viewed',
    tour_card_click: 'Tour selected', related_tour_click: 'Related tour clicked', tour_filter_used: 'Filters used',
    search: 'Search', no_search_results: 'Search — no results',
    plan_my_trip_opened: 'Safari planner opened', plan_my_trip_submitted: 'Plan lead submitted',
    begin_journey_opened: 'Journey planner opened', begin_journey_submitted: 'Journey lead submitted',
    request_trip_opened: 'Quote request started', request_trip_submitted: 'Quote lead submitted',
    form_submit_error: 'Form error', cta_click: 'CTA clicked',
    whatsapp_click: 'WhatsApp clicked', phone_click: 'Phone clicked', email_click: 'Email clicked'
  };
  const prettyEvent = (raw: string) => EVENT_LABELS[raw] ?? raw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  // Events from the retired advisor chat (no longer on the site) can still sit
  // in older ranges; the Business view leaves them out, the Developer view
  // keeps every raw name.
  const isRetiredEvent = (raw: string) => raw.startsWith('ai_advisor_');

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
  $: topEventRows = traffic
    ? cleanRows(eventView === 'business' ? traffic.topEvents.filter((e) => !isRetiredEvent(e.label)) : traffic.topEvents, 8)
    : { rows: [], max: 1 };
</script>

<svelte:window
  on:click={(event) => { if (rangeMenuOpen && rangeMenuEl && !rangeMenuEl.contains(event.target as Node)) rangeMenuOpen = false; }}
  on:keydown={(event) => { if (rangeMenuOpen && event.key === 'Escape') { rangeMenuOpen = false; rangeButtonEl?.focus(); } }}
/>

<section class="grid min-h-full min-w-0 grid-cols-1 gap-5 overflow-x-clip bg-white p-3 sm:gap-6 sm:p-6">
  <!-- header + range filter -->
  <div class="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div class="min-w-0">
      <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Insights</p>
      <h2 class="mt-1 text-2xl font-bold text-ink">Analytics &amp; lead performance</h2>
      <p class="mt-1 text-sm text-ink/55">
        What's working, what's not, and what to do next.{#if lastUpdatedLabel}<span class="ml-1 text-ink/40">· {lastUpdatedLabel}</span>{/if}
      </p>
    </div>
    <!-- One date menu instead of six buttons: the chosen period reads at a glance. -->
    <div class="relative shrink-0 self-start sm:self-auto" bind:this={rangeMenuEl}>
      <button
        type="button"
        bind:this={rangeButtonEl}
        class="inline-flex min-h-10 items-center gap-2 border border-ink/15 bg-white px-3.5 text-[13px] font-semibold text-ink transition-colors hover:border-ink/30 focus:outline-none focus-visible:border-forest"
        aria-haspopup="listbox"
        aria-expanded={rangeMenuOpen}
        on:click={() => (rangeMenuOpen = !rangeMenuOpen)}
      >
        <CalendarDays size={15} class="text-ink/45" />
        <span class="text-ink/50">Period</span>
        <span>{rangeLabel}</span>
        <ChevronDown size={15} class={`text-ink/45 transition-transform duration-200 ${rangeMenuOpen ? 'rotate-180' : ''}`} />
      </button>
      {#if rangeMenuOpen}
        <ul
          class="absolute right-0 top-full z-40 mt-1.5 w-52 border border-ink/10 bg-white py-1 shadow-[0_12px_32px_-12px_rgba(28,26,22,0.35)] sm:left-auto"
          role="listbox"
          aria-label="Report period"
          use:closeOnScroll
          transition:fly={{ y: -4, duration: reduceMotion ? 0 : 140 }}
        >
          {#each RANGES as r}
            <li>
              <button
                type="button"
                role="option"
                aria-selected={range === r.k}
                class={`flex w-full items-center justify-between px-3.5 py-2 text-left text-[13px] transition-colors hover:bg-ink/[0.04] focus:outline-none focus-visible:bg-ink/[0.06] ${range === r.k ? 'font-semibold text-ink' : 'text-ink/70'}`}
                on:click={() => { rangeMenuOpen = false; if (range !== r.k) setRange(r.k); }}
              >
                {r.l}
                {#if range === r.k}<Check size={15} class="text-emnel-gold" strokeWidth={2.6} />{/if}
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </div>

  <!-- Workspace navigation: the content below is intentionally split into focused reports. -->
  <!-- A segmented control: one quiet track, the open report raised on it.
       Each report's one-line description is the tab's tooltip, never text cut
       off inside a narrow tab. -->
  <!-- Sticks flush to the top of the scrolling workspace: the negative top
       cancels the workspace's own padding (main: p-4 / sm:p-6), so no content
       shows through above the bar. Full-bleed across the white sheet. -->
  <div class="sticky -top-4 z-30 -mx-3 border-b border-ink/[0.07] bg-white px-3 py-2.5 sm:-top-6 sm:-mx-6 sm:px-6">
    <div class="min-w-0">
      <div class="min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div class="inline-flex min-w-max items-center gap-0.5 bg-ink/[0.045] p-1" role="tablist" aria-label="Analytics report areas">
          {#each ANALYTICS_TABS as tab, index (tab.key)}
            {@const TabIcon = tab.icon}
            {@const active = activeAnalyticsTab === tab.key}
            <button
              type="button"
              role="tab"
              id={`analytics-tab-${tab.key}`}
              aria-selected={active}
              aria-controls={`analytics-panel-${tab.key}`}
              tabindex={active ? 0 : -1}
              title={tab.description}
              bind:this={analyticsTabEls[index]}
              on:click={() => setAnalyticsTab(tab.key)}
              on:keydown={(event) => onAnalyticsTabKey(event, index)}
              class={`inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-[13px] font-semibold transition-[background-color,color,box-shadow] duration-200 ease-out focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-forest/50 ${active ? 'bg-white text-ink shadow-[0_1px_2px_rgba(28,26,22,0.1)] ring-1 ring-ink/[0.08]' : 'text-ink/55 hover:text-ink'}`}
            >
              <TabIcon size={14} strokeWidth={2.2} class={active ? 'text-emnel-gold' : 'text-ink/40'} />
              {tab.label}
            </button>
          {/each}
        </div>
      </div>
    </div>
  </div>

  {#if activeAnalyticsTab === 'overview'}
    <div id="analytics-panel-overview" role="tabpanel" aria-labelledby="analytics-tab-overview" class="grid min-w-0 gap-6" in:fly={panelEnter()} out:fly={panelExit()}>
      <!-- Fast owner-facing summary: demand, channel mix and the next evidence-backed move. -->
      <AnalyticsDecisionDeck
        data={mainLeads}
        interpretation={intelShown?.interpretation ?? null}
        loading={mainLeadsLoading || intelLoading}
        {rangeLabel}
        onNavigate={scrollTo}
      />

      <!-- Built-in, rule-based reading of the selected range. -->
      <Interpretation interpretation={intelShown?.interpretation ?? null} loading={intelLoading} error={intelError} {rangeLabel} onRetry={() => loadIntel()} />
    </div>
  {/if}

  {#if activeAnalyticsTab === 'leads'}
    <div id="analytics-panel-leads" role="tabpanel" aria-labelledby="analytics-tab-leads" class="min-w-0" in:fly={panelEnter()} out:fly={panelExit()}>
      <!-- Plan My Trip · itinerary form · WhatsApp (own loading/error). -->
      <MainLeads data={mainLeads} loading={mainLeadsLoading} error={mainLeadsError} {rangeLabel} {clarityId} onRetry={loadMainLeads} />
    </div>
  {/if}

  {#if loading}
    <!-- full-page skeleton -->
    <div class="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
      {#each Array(7) as _, i}<div class={`h-32 animate-pulse rounded-none border border-ink/10 bg-surface/70 ${i === 6 ? 'sm:col-span-2' : ''}`}></div>{/each}
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
    {#if activeAnalyticsTab === 'overview'}
      <!-- KPI cards (sparkline + trend + click to drill in). -->
      <section class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" aria-label="Key activity metrics" in:fly={panelEnter()} out:fly={panelExit()}>
        {#each cards as c}
          {@const Icon = c.icon}
          {@const m = c.series.length ? momentum(c.series) : null}
          <button
            type="button"
            class="group min-w-0 rounded-2xl border border-ink/10 bg-surface p-3.5 text-left shadow-card transition hover:-translate-y-0.5 hover:border-emnel-gold/40 hover:shadow-[0_16px_40px_-18px_rgba(28,26,22,0.35)] sm:p-5"
            on:click={() => scrollTo(c.anchor)}
          >
            <div class="flex items-start justify-between">
              <span class="grid h-9 w-9 place-items-center rounded-xl bg-forest/10 text-forest ring-1 ring-ink/5 dark:text-emnel-gold sm:h-11 sm:w-11 sm:rounded-2xl"><Icon size={17} /></span>
              {#if m}
                <span title="Recent whole days compared with the earlier part of this period" class={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-1 text-[10px] font-bold ${m.pct >= 0 ? 'bg-emerald-500/[0.12] text-emerald-600' : 'bg-red-500/[0.12] text-red-600'}`}>
                  {#if m.pct >= 0}<ArrowUpRight size={12} />{:else}<ArrowDownRight size={12} />{/if}<span class="hidden sm:inline">Pace </span>{Math.abs(m.pct)}%
                </span>
              {/if}
            </div>
            <p class="mt-3 text-2xl font-bold text-ink sm:mt-4 sm:text-3xl">
              {#if typeof c.value === 'number'}<Counter value={c.value} suffix={c.suffix} decimals={c.suffix === '%' ? 1 : 0} />
              {:else}<span class="text-ink/30" title="Not comparable">—</span>{/if}
            </p>
            <div class="mt-1 flex min-w-0 items-end justify-between gap-2">
              <div class="min-w-0">
                <p class="flex flex-wrap items-center gap-1 text-[12px] font-semibold text-ink/70 sm:gap-1.5 sm:text-sm">{c.label} <SourceBadge source="website" /></p>
                <p class="mt-0.5 line-clamp-2 text-[11px] leading-4 text-ink/50 sm:text-xs" title={c.helper}>{c.helper}</p>
              </div>
              {#if c.series.length}<span class="hidden shrink-0 text-forest/70 sm:block"><Sparkline data={c.series} color="#4A3728" /></span>{/if}
            </div>
          </button>
        {/each}
      </section>
    {/if}

    <!-- ══ Website Intelligence — deterministic health, behaviour & priorities (real-only) ══ -->
    {#if activeAnalyticsTab === 'health' || activeAnalyticsTab === 'experience'}
    <section id={activeAnalyticsTab === 'health' ? 'sec-ux' : 'sec-experience'} class="scroll-mt-24 overflow-hidden rounded-none border border-ink/10 bg-surface shadow-card" in:fly={panelEnter()} out:fly={panelExit()}>
      <!-- header: neutral branding · connection summary · quick actions -->
      <div class="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-br from-deep-green to-forest p-5 text-white">
        <div class="flex items-center gap-3">
          <span class="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/[0.12] text-emnel-gold ring-1 ring-white/15"><ShieldCheck size={20} /></span>
          <div>
            <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-emnel-gold">Website Intelligence</p>
            <h3 class="font-serif text-xl font-light leading-tight">{activeAnalyticsTab === 'health' ? 'Health, priorities & what to fix next' : 'Visitor behaviour & experience signals'}</h3>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold ring-1 ring-white/15">
            <span class="h-2 w-2 rounded-full bg-emerald-400"></span> {connectedCount}/{hubSources.length} sources live
          </span>
          <button type="button" on:click={() => loadIntel(true)} disabled={intelLoading} class="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.12] px-3 py-1.5 text-xs font-bold ring-1 ring-white/15 transition hover:bg-white/20 disabled:opacity-50" aria-label="Refresh website intelligence">
            <RefreshCw size={14} class={intelLoading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button type="button" on:click={exportCsv} class="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.12] px-3 py-1.5 text-xs font-bold ring-1 ring-white/15 transition hover:bg-white/20" aria-label="Export CSV">
            <Download size={14} /> CSV
          </button>
          <button type="button" on:click={copyLink} class="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.12] px-3 py-1.5 text-xs font-bold ring-1 ring-white/15 transition hover:bg-white/20" aria-label="Copy dashboard link">
            {#if copied}<Check size={14} /> Copied{:else}<Link2 size={14} /> Copy link{/if}
          </button>
          <a class="inline-flex items-center gap-1.5 rounded-lg bg-emnel-gold px-3 py-1.5 text-xs font-bold text-deep-green transition hover:brightness-105" href={clarityUrl} target="_blank" rel="noopener noreferrer">
            Open Clarity <ExternalLink size={13} />
          </a>
        </div>
      </div>

      <div class="grid gap-5 p-5">
        {#if activeAnalyticsTab === 'health'}
        <div class="grid min-w-0 gap-5" in:fly={panelEnter()} out:fly={panelExit()}>
        <!-- connection panel -->
        <div class="grid gap-2.5 lg:grid-cols-2">
          {#each hubSources as s}
            <div class="flex items-center gap-2.5 rounded-xl border border-ink/[0.07] bg-sand/20 px-3.5 py-2.5">
              <span class={`h-2.5 w-2.5 shrink-0 rounded-full ${s.failing ? 'bg-amber-500 ring-4 ring-amber-500/15' : s.connected ? 'bg-emerald-500 ring-4 ring-emerald-500/15' : 'bg-ink/20'}`}></span>
              <div class="min-w-0">
                <p class="truncate text-[13px] font-bold text-ink/80">{s.label}</p>
                <p class={`text-[11px] leading-4 [overflow-wrap:anywhere] ${s.failing ? 'text-amber-700 dark:text-amber-400' : 'text-ink/45'}`}>{s.note}</p>
              </div>
            </div>
          {/each}
        </div>

        <!-- Website Health + category scores (derived from real analytics) -->
        <div class={`grid gap-4 rounded-2xl border border-ink/10 bg-gradient-to-br from-sand/35 to-surface p-5 transition-opacity lg:grid-cols-[auto_1fr] lg:items-center ${intelLoading && intelShown ? 'opacity-60' : ''}`} aria-busy={intelLoading}>
          <div class="flex items-center gap-4">
            <ScoreRing score={intelShown?.health.score ?? null} label={intelShown?.health.status ?? ''} size={128} />
            <div>
              <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-ink/40">Website Health</p>
              {#if intelShown}
                <p class={`text-2xl font-extrabold ${healthStatusColor}`}>{intelShown.health.status}</p>
                <p class={`mt-1 flex items-center gap-1.5 text-[12px] font-semibold ${intelShown.health.criticalCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {#if intelShown.health.criticalCount > 0}<AlertTriangle size={13} /> {intelShown.health.criticalCount} critical issue{intelShown.health.criticalCount === 1 ? '' : 's'}{:else}<CheckCircle2 size={13} /> No critical issues{/if}
                </p>
              {:else if intelLoading}
                <div class="mt-1 h-7 w-24 animate-pulse rounded-md bg-ink/[0.06]"></div>
                <div class="mt-2 h-3 w-28 animate-pulse rounded bg-ink/[0.05]"></div>
              {:else}
                <p class={`text-2xl font-extrabold ${healthStatusColor}`}>N/A</p>
              {/if}
              <p class="mt-1 text-[10px] uppercase tracking-wide text-ink/35">Derived from website analytics</p>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {#if !intelShown && intelLoading}
              {#each Array(4) as _}<div class="h-[132px] animate-pulse rounded-xl border border-ink/[0.07] bg-surface"></div>{/each}
            {/if}
            {#each categoryScores as cat (cat.key)}
              <div class="flex flex-col items-center rounded-xl border border-ink/[0.07] bg-surface p-3 text-center">
                <ScoreRing score={cat.score} size={68} stroke={7} />
                <p class="mt-1.5 text-[12px] font-bold text-ink/75">{cat.label}</p>
                <p class="mt-0.5 line-clamp-2 text-[10px] leading-3 text-ink/40 [overflow-wrap:anywhere]" title={cat.reason}>{cat.reason}</p>
              </div>
            {/each}
          </div>
        </div>

        <!-- Executive summary — real KPIs + previous-period benchmarks.
             10 cards: 2 columns, then 5 at xl, so every row fills. -->
        <div>
          <div class="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-ink/40">Executive summary · {intelShown?.range.label ?? rangeLabel} vs previous period</p>
            {#if lastUpdatedLabel}<span class="text-[11px] text-ink/40">{lastUpdatedLabel}</span>{/if}
          </div>
          {#if intelShown}
            <div class={`grid gap-3 transition-opacity lg:grid-cols-2 xl:grid-cols-5 ${intelLoading ? 'opacity-60' : ''}`} aria-busy={intelLoading}>
              {#each execCards as x (x.cfg.key)}
                {@const silentGa4 = x.cfg.key === 'ga4Visitors' && /no visitors since|no visitors in this period/.test(x.ref.note ?? '')}
                <!-- A note from the API (GA4 gone quiet, a period still in progress)
                     replaces the static hint while the figure itself is shown. -->
                <MetricCard
                  label={silentGa4 ? 'GA4 (no visitors reported yet)' : x.cfg.label}
                  hint={x.ref.status !== 'na' && x.ref.note ? x.ref.note : x.cfg.hint}
                  value={x.ref.value} format={x.cfg.format ?? 'number'} source={execSource(x.ref.source)}
                  available={x.ref.status !== 'na'} emptyText={x.ref.note ?? ''} changePct={x.ref.changePct} previous={x.ref.previous ?? null}
                  icon={x.cfg.icon} accent={x.cfg.accent} />
              {/each}
            </div>
          {:else if intelLoading}
            <div class="grid gap-3 lg:grid-cols-2 xl:grid-cols-5" aria-busy="true">
              {#each execConfig as cfg (cfg.key)}
                <MetricCard label={cfg.label} hint={cfg.hint} icon={cfg.icon} accent={cfg.accent} loading />
              {/each}
            </div>
          {:else}
            <p class="rounded-xl border border-dashed border-ink/[0.12] bg-sand/20 px-4 py-3 text-[13px] text-ink/60">The summary didn't come back this time — use Refresh above to try again. The figures further down are unaffected.</p>
          {/if}
          {#if intelShown && automatedExcluded > 0}
            <p class="mt-2.5 flex min-w-0 items-start gap-1.5 text-[11px] leading-5 text-ink/50 [overflow-wrap:anywhere]" title="A network that opens more than 10 sessions in one day (UTC) is counted as automated; its visits that day are left out of visitors, page views, interactions and WhatsApp clicks. Enquiries are never left out.">
              <Info size={13} class="mt-1 shrink-0" />
              {automatedExcluded.toLocaleString()} automated session{automatedExcluded === 1 ? '' : 's'} left out — e.g. a crawler that opened many sessions from one network.
            </p>
          {/if}
          {#if intelShown && (intelShown.executive.biggestDropOff || intelShown.executive.topIssue)}
            <div class={`mt-3 grid gap-3 transition-opacity lg:grid-cols-2 ${intelLoading ? 'opacity-60' : ''}`}>
              {#if intelShown.executive.biggestDropOff}
                <div class="flex items-center gap-2.5 rounded-xl border border-amber-300/60 bg-amber-50/40 px-4 py-3">
                  <ArrowDownRight size={18} class="shrink-0 text-amber-600" />
                  <div class="min-w-0"><p class="text-[10px] font-bold uppercase tracking-wide text-amber-700/80">Biggest drop-off</p><p class="text-[13px] font-bold text-ink/80 [overflow-wrap:anywhere]">{intelShown.executive.biggestDropOff}</p></div>
                </div>
              {/if}
              {#if intelShown.executive.topIssue}
                <div class="flex items-center gap-2.5 rounded-xl border border-red-300/60 bg-red-50/40 px-4 py-3">
                  <AlertTriangle size={18} class="shrink-0 text-red-500" />
                  <div class="min-w-0"><p class="text-[10px] font-bold uppercase tracking-wide text-red-700/80">Most important issue</p><p class="text-[13px] font-bold text-ink/80 [overflow-wrap:anywhere]">{intelShown.executive.topIssue}</p></div>
                </div>
              {/if}
            </div>
          {/if}
        </div>

        <!-- Alerts — rule-based on real conditions -->
        {#if alerts.length}
          <div class={`transition-opacity ${intelLoading ? 'opacity-60' : ''}`}>
            <p class="mb-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-ink/40">Alerts · {alerts.length}</p>
            <div class="grid gap-2">
              {#each alerts as a (a.id)}
                {@const st = ALERT_STYLE[a.severity]}
                <div class={`flex items-start gap-3 rounded-xl border px-4 py-3 ${st.cls}`}>
                  <svelte:component this={st.icon} size={16} class={`mt-0.5 shrink-0 ${st.text}`} />
                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-2">
                      <p class="text-[13px] font-bold text-ink/85">{a.title}</p>
                      <span class="rounded-full bg-ink/[0.05] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-ink/50">{a.category}</span>
                      {#if a.metric}<span class={`text-[11px] font-bold ${st.text}`}>{a.metric}</span>{/if}
                    </div>
                    <p class="mt-0.5 text-[12px] leading-5 text-ink/60 [overflow-wrap:anywhere]">{a.detail}</p>
                  </div>
                  {#if a.deepLink}<a class="shrink-0 text-[11px] font-bold text-forest hover:underline" href={clarityLink(a.deepLink)} target="_blank" rel="noopener noreferrer">View →</a>{/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Recommended action plan — deterministic, priority-ordered -->
        {#if intelShown?.actions.length}
          <div class={`transition-opacity ${intelLoading ? 'opacity-60' : ''}`}>
            <p class="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-ink/40"><ListChecks size={13} /> Recommended action plan · priority order</p>
            <div class="grid gap-2.5">
              {#each intelShown.actions as a, i (a.id)}
                {@const p = PRIO_STYLE[a.priority]}
                <div class="relative flex gap-3 overflow-hidden rounded-2xl border border-ink/10 bg-surface p-4 shadow-[0_1px_2px_rgba(28,26,22,0.04)]">
                  <span class={`absolute inset-y-0 left-0 w-1 ${p.bar}`} aria-hidden="true"></span>
                  <span class="ml-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink/[0.05] text-[13px] font-extrabold text-ink/60">{i + 1}</span>
                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-2">
                      <span class={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${p.cls}`}>{p.label}</span>
                      <span class="rounded-full bg-ink/[0.05] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-ink/50">{a.category}</span>
                      <span class="text-[11px] font-bold text-ink/45">{a.supportingMetric}</span>
                    </div>
                    <p class="mt-1 text-[14px] font-bold text-heading">{a.issue}</p>
                    <p class="mt-0.5 text-[12px] leading-5 text-ink/60"><span class="font-semibold text-ink/70">Why:</span> {a.why}</p>
                    <p class="mt-0.5 text-[12px] leading-5 text-ink/60"><span class="font-semibold text-ink/70">Fix:</span> {a.fix}</p>
                    <div class="mt-2 flex flex-wrap items-center gap-2">
                      <span class="inline-flex items-center gap-1 rounded-lg bg-emerald-500/[0.08] px-2 py-1 text-[11px] font-bold text-emerald-700"><TrendingUp size={12} /> {a.expectedOutcome}</span>
                      <span class="inline-flex items-center gap-1 rounded-lg bg-sand/50 px-2 py-1 text-[11px] font-semibold text-ink/65">Effort: {a.effort}</span>
                      <span class="inline-flex items-center gap-1 rounded-lg bg-sand/50 px-2 py-1 text-[11px] font-semibold text-ink/65">Confidence: {a.confidence}</span>
                      {#if a.deepLink}<a class="ml-auto text-[11px] font-bold text-forest hover:underline" href={clarityLink(a.deepLink)} target="_blank" rel="noopener noreferrer">View supporting data →</a>{/if}
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {:else if intelShown && !intelLoading}
          <div class="flex items-center gap-2.5 rounded-xl border border-emerald-300/50 bg-emerald-50/40 px-4 py-3">
            <CheckCircle2 size={18} class="shrink-0 text-emerald-600" />
            <p class="text-[13px] text-ink/70">No priority issues detected in this period. Keep an eye on the alerts above as traffic grows.</p>
          </div>
        {/if}

        </div>
        {:else}
        <div class="grid min-w-0 gap-5" in:fly={panelEnter()} out:fly={panelExit()}>
        <!-- UX friction signals (Clarity) -->
        <div>
          <p class="mb-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-ink/40">UX friction signals · Microsoft Clarity{#if cCfg && clarity?.windowDays} · last {clarity.windowDays} days{/if}</p>
          <div class="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
            {#each clarityMetrics as m (m.key)}
              <MetricCard
                label={m.label} value={m.value} format={m.format ?? 'number'} source={m.source}
                available={m.available} deepLink={m.deepLink} deepLinkLabel={m.deepLinkLabel ?? 'Open in Clarity'}
                emptyText={m.emptyText ?? ''} icon={m.icon} accent={m.accent ?? '#0F6CBD'} loading={intelLoading && !clarity} />
            {/each}
          </div>
        </div>

        <!-- breakdowns (GA4 preferred, Clarity fallback — each stays labeled) -->
        <div class="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
          <BreakdownBars title="Devices" source={deviceSource} rows={deviceRows} icon={Monitor} accent="#153733" emptyText="Device split appears once GA4 or Clarity export is live." />
          <BreakdownBars title="Top countries" source={countrySource} rows={countryRows} icon={Globe} accent="#4A3728" emptyText="Country data appears with GA4 or Clarity export." />
          <BreakdownBars title="Top pages" source={pageSource} rows={pageRows} icon={AppWindow} accent="#0F6CBD" emptyText="Top pages appear with GA4 or Clarity export." />
          <BreakdownBars title="Browsers" source="clarity" rows={browserRows} icon={AppWindow} accent="#0F6CBD" emptyText="Browser split comes from Clarity data export." />
        </div>

        <!-- Event timeline — real detected changes only -->
        {#if intelShown?.timeline.length}
          <div class={`transition-opacity ${intelLoading ? 'opacity-60' : ''}`}>
            <p class="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-ink/40"><History size={13} /> Event timeline · detected changes</p>
            <div class="ml-2 grid gap-4 border-l border-ink/10 pl-5">
              {#each intelShown.timeline as ev (ev.date + ev.label)}
                <div class="relative">
                  <span class={`absolute -left-[27px] top-0.5 grid h-4 w-4 place-items-center rounded-full ring-4 ring-surface ${ev.direction === 'up' ? 'bg-emerald-500' : ev.direction === 'down' ? 'bg-red-500' : 'bg-ink/30'}`}>
                    <svelte:component this={ev.direction === 'up' ? ArrowUpRight : ev.direction === 'down' ? ArrowDownRight : ArrowRight} size={10} class="text-white" strokeWidth={3} />
                  </span>
                  <p class="text-[10px] font-bold uppercase tracking-wide text-ink/40">{ev.when}</p>
                  <p class="text-[13px] font-bold text-ink/80">{ev.label}</p>
                  <p class="text-[11px] text-ink/50">{ev.detail}</p>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- deep-link launchers — recordings & heatmaps live in Clarity, never rebuilt -->
        <div>
          <p class="mb-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-ink/40">
            Explore in Microsoft Clarity <span class="font-medium normal-case tracking-normal text-ink/30">— recordings &amp; heatmaps open in Clarity</span>
          </p>
          <div class="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
            <DeepLinkCard title="Session recordings" desc="Watch real visitor sessions" href={clarityLink('impressions')} icon={PlayCircle} enabled={clarityConnected} />
            <DeepLinkCard title="Click & scroll heatmaps" desc="Where attention actually goes" href={clarityLink('heatmaps')} icon={Flame} enabled={clarityConnected} />
            <DeepLinkCard title="Rage & dead clicks" desc="Frustration & friction signals" href={clarityLink('impressions')} icon={Hand} enabled={clarityConnected} />
            <DeepLinkCard title="Clarity dashboard" desc="Full UX analytics workspace" href={clarityUrl} icon={Activity} enabled={clarityConnected} />
          </div>
        </div>

        {#if !clarityConnected}
          <AnalyticsEmpty icon={ScanEye} title="Connect Microsoft Clarity" minHeight={140}
            description="Set PUBLIC_CLARITY_PROJECT_ID on the site and CLARITY_API_TOKEN on the backend to unlock live recordings, heatmaps and real rage/dead-click metrics here — the panels above light up automatically."
            hint="Clarity masks all form inputs by default — keep dashboard masking on 'Mask' or 'Balanced' for privacy." />
        {/if}
        </div>
        {/if}
      </div>
    </section>
    {/if}

    <!-- ── Conversion — interactive funnel with a single auto-flagged bottleneck. -->
    {#if activeAnalyticsTab === 'conversion' && funnel}
      <div id="sec-funnel" class="scroll-mt-24 rounded-none border border-ink/10 bg-surface p-5 shadow-card" in:fly={panelEnter()} out:fly={panelExit()}>
        <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Conversion funnel</p>
            <h3 class="mt-1 text-xl font-bold text-ink">Visitor → Booked</h3>
            <p class="mt-1 text-xs text-ink/50">Visitors, tour views and form opens: distinct visitors, in-house tracker (automated left out) · enquiries and their status: booking records</p>
          </div>
          {#if bottleneck}
            <span class="inline-flex items-center gap-1.5 rounded-full bg-amber-500/[0.12] px-3 py-1 text-xs font-bold text-amber-600">
              <AlertTriangle size={13} /> Bottleneck: {bottleneck.label}
            </span>
          {/if}
        </div>
        {#if funnelCfg}<ChartCanvas {...funnelCfg} height={300} />{/if}
        <div class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {#each funnelSteps as step, i}
            <button
              type="button"
              class={`rounded-xl border p-3 text-center transition ${activeStep === i ? 'border-forest bg-forest/[0.06]' : step.key === bottleneck?.key ? 'border-amber-400/60 bg-amber-50/40' : 'border-ink/10 bg-sand/25 hover:border-emnel-gold/40'}`}
              on:click={() => (activeStep = activeStep === i ? -1 : i)}
            >
              {#if step.rate != null}
                <p class="text-2xl font-extrabold text-heading">{step.rate}%</p>
              {:else}
                <p class="text-2xl font-extrabold text-ink/30" aria-hidden="true">—</p>
              {/if}
              <p class="mt-0.5 text-[11px] font-semibold text-ink/55">{step.label}</p>
              <p class="mt-0.5 text-[10px] text-ink/40">{step.rate != null ? `${step.fromValue.toLocaleString()} → ${step.toValue.toLocaleString()}` : 'not comparable'}</p>
            </button>
          {/each}
        </div>
        {#if activeStep >= 0 && funnelSteps[activeStep]}
          {@const st = funnelSteps[activeStep]}
          <div class="mt-3 flex gap-3 rounded-xl border border-ink/[0.07] bg-sand/25 p-4">
            <span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emnel-gold/15 text-clay"><Lightbulb size={17} /></span>
            <div>
              {#if st.rate != null}
                <p class="text-sm font-bold text-ink">{st.dropoff}% drop off at “{st.label}”</p>
                <p class="mt-0.5 text-xs leading-5 text-ink/60">{st.fromValue.toLocaleString()} at “{st.fromLabel}” → {st.toValue.toLocaleString()} at “{st.toLabel}”. {st.tip}</p>
              {:else if st.fromValue === 0}
                <p class="text-sm font-bold text-ink">Not comparable at “{st.label}”</p>
                <p class="mt-0.5 text-xs leading-5 text-ink/60">Nothing was counted at “{st.fromLabel}” in this range, so there is no drop to work out.</p>
              {:else}
                <p class="text-sm font-bold text-ink">Not comparable at “{st.label}”</p>
                <p class="mt-0.5 text-xs leading-5 text-ink/60">{st.toValue.toLocaleString()} reached “{st.toLabel}” but {st.fromValue.toLocaleString()} were counted at “{st.fromLabel}” — the later step is larger, so no drop can be worked out for it.</p>
              {/if}
            </div>
          </div>
        {:else}
          <p class="mt-3 text-center text-xs text-ink/45">Tap a step to see its drop-off and how to improve it. Per-step device &amp; source splits need GA4 event scopes (backend).</p>
        {/if}
      </div>
    {/if}

    {#if activeAnalyticsTab === 'traffic'}
    <!-- ── GA4 traffic quality ──────────────────────────────────────────── -->
    {#if ga4}
      <div id="sec-traffic" class="scroll-mt-24 rounded-none border border-ink/10 bg-surface p-5 shadow-card" in:fly={panelEnter()} out:fly={panelExit()}>
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
          <div class="grid gap-4 lg:grid-cols-4">
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
                            <div class="h-full rounded-full bg-gradient-to-r from-forest to-emnel-gold" style={`width: ${(row.value / block.list.max) * 100}%`}></div>
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
              <div class="mt-5 grid gap-5 lg:grid-cols-2">
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

    {/if}

    {#if activeAnalyticsTab === 'leads'}
    <!-- ── leads over time + source ─────────────────────────────────────── -->
    <div id="sec-leads" class="grid scroll-mt-24 gap-6 xl:grid-cols-[1.3fr_0.7fr]" in:fly={panelEnter()} out:fly={panelExit()}>
      <div class="rounded-none border border-ink/10 bg-surface p-5 shadow-card" in:fly={panelEnter()} out:fly={panelExit()}>
        <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Leads over time</p>
        <h3 class="mt-1 text-xl font-bold text-ink">Leads by day</h3>
        <div class="mt-3">
          {#if (leads?.leadsByDay ?? []).some((d) => d.value > 0)}<ChartCanvas {...leadsLineCfg} height={280} />
          {:else}<AnalyticsEmpty icon={ClipboardList} title="No leads in this range yet" minHeight={280}
            description="Every 'Plan my safari' and 'Request this trip' enquiry appears here so you can see which days and campaigns drive demand."
            hint="Run a WhatsApp or Instagram campaign, then check back." />{/if}
        </div>
      </div>
      <div class="rounded-none border border-ink/10 bg-surface p-5 shadow-card">
        <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Where leads come from</p>
        <h3 class="mt-1 text-xl font-bold text-ink">Lead source</h3>
        <div class="mt-3">
          {#if (leads?.bySource ?? []).some((x) => x.value > 0)}<ChartCanvas {...sourceDonutCfg} height={280} />
          {:else}<AnalyticsEmpty icon={Compass} title="No source data yet" minHeight={280}
            description="Once enquiries come in, you'll see whether they start from the planner or a tour page." />{/if}
        </div>
      </div>
    </div>

    <!-- ── lead status pipeline ─────────────────────────────────────────── -->
    {#if statusRows.rows.length}
      <div class="rounded-none border border-ink/10 bg-surface p-5 shadow-card">
        <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Pipeline</p>
        <h3 class="mt-1 text-xl font-bold text-ink">Lead status</h3>
        <div class="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-5">
          {#each statusRows.rows as s}
            <div class="rounded-xl border border-ink/10 bg-sand/25 p-4">
              <p class="text-2xl font-extrabold text-heading">{s.value}</p>
              <p class="mt-0.5 text-xs font-semibold capitalize text-ink/60">{s.label.replace(/_/g, ' ')}</p>
              <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-sand/50">
                <div class="h-full rounded-full bg-gradient-to-r from-forest to-emnel-gold" style={`width: ${(s.value / statusRows.max) * 100}%`}></div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
    {/if}

    {#if activeAnalyticsTab === 'demand'}
    <div class="grid min-w-0 gap-6" in:fly={panelEnter()} out:fly={panelExit()}>
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
                    <div class="h-full rounded-full bg-gradient-to-r from-forest to-emnel-gold" style={`width: ${(row.value / block.max) * 100}%`}></div>
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
    </div>
    {/if}

    {#if activeAnalyticsTab === 'traffic'}
    <!-- ── events (business/dev toggle) + devices ───────────────────────── -->
    {#if traffic}
      <div id="sec-events" class="grid scroll-mt-24 gap-6 lg:grid-cols-[0.55fr_0.45fr]" in:fly={panelEnter()} out:fly={panelExit()}>
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
                    <div class="h-full rounded-full bg-gradient-to-r from-forest to-emnel-gold" style={`width: ${(ev.value / topEventRows.max) * 100}%`}></div>
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
  {/if}
</section>
