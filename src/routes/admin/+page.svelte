<script lang="ts">
  import { onMount } from 'svelte';
  import type { Component } from 'svelte';
  import {
    AlertTriangle,
    Bot,
    CalendarCheck,
    ChartBar,
    ChartPie,
    CheckCircle,
    CircleDollarSign,
    ClipboardList,
    Clock,
    FileClock,
    ImagePlus,
    Images,
    Mail,
    Map,
    MapPin,
    MessageSquare,
    Newspaper,
    Plus,
    Route,
    SearchCheck,
    ShieldCheck,
    Sparkles,
    Tags,
    Upload
  } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import ApexChart from '$lib/components/admin/ApexChart.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';

  type CountStats = {
    aiConversations: number;
    blogPosts: number;
    confirmedBookings: number;
    destinations: number;
    draftTours: number;
    mediaFiles: number;
    pendingBookings: number;
    publishedTours: number;
    totalBookings: number;
    totalRevenue: number;
    totalTours: number;
    unreadMessages: number;
  };

  type BookingPipeline = {
    cancelled: number;
    completed: number;
    confirmed: number;
    pending: number;
    rejected: number;
  };

  type ContentHealth = {
    publishedBlogPosts: number;
    publishedDestinations: number;
    publishedFaqs: number;
    publishedTestimonials: number;
    toursMissingImages: number;
    toursWithSeo: number;
    toursWithoutAvailableDates: number;
    toursWithoutItinerary: number;
  };

  type DashboardRow = Record<string, unknown>;

  type DashboardStats = {
    bookingPipeline: BookingPipeline;
    contentHealth: ContentHealth;
    counts: CountStats;
    featured: {
      blogPosts: DashboardRow[];
      destinations: DashboardRow[];
      tours: DashboardRow[];
    };
    recent: {
      auditLogs: DashboardRow[];
      bookings: DashboardRow[];
      media: DashboardRow[];
      messages: DashboardRow[];
      tours: DashboardRow[];
    };
  };

  type KpiCard = {
    accent: string;
    helper: string;
    icon: Component;
    label: string;
    trend?: string;
    value: string | number;
  };

  type ActionItem = {
    description: string;
    href: string;
    icon: Component;
    label: string;
  };

  const emptyStats: DashboardStats = {
    counts: {
      aiConversations: 0,
      blogPosts: 0,
      confirmedBookings: 0,
      destinations: 0,
      draftTours: 0,
      mediaFiles: 0,
      pendingBookings: 0,
      publishedTours: 0,
      totalBookings: 0,
      totalRevenue: 0,
      totalTours: 0,
      unreadMessages: 0
    },
    bookingPipeline: {
      pending: 0,
      confirmed: 0,
      cancelled: 0,
      completed: 0,
      rejected: 0
    },
    contentHealth: {
      toursWithSeo: 0,
      toursMissingImages: 0,
      toursWithoutItinerary: 0,
      toursWithoutAvailableDates: 0,
      publishedDestinations: 0,
      publishedBlogPosts: 0,
      publishedFaqs: 0,
      publishedTestimonials: 0
    },
    recent: {
      bookings: [],
      messages: [],
      tours: [],
      media: [],
      auditLogs: []
    },
    featured: {
      tours: [],
      destinations: [],
      blogPosts: []
    }
  };

  const quickActions: ActionItem[] = [
    { label: 'Create New Tour', description: 'Build a new travel product', href: '/admin/tours/new', icon: Plus },
    { label: 'Add Destination', description: 'Manage countries and regions', href: '/admin/destinations', icon: MapPin },
    { label: 'Add Category', description: 'Organize tour experiences', href: '/admin/categories', icon: Tags },
    { label: 'Upload Media', description: 'Add reusable CMS assets', href: '/admin/media', icon: Upload },
    { label: 'Add Blog Post', description: 'Publish travel guidance', href: '/admin/blog', icon: Newspaper },
    { label: 'View Messages', description: 'Respond to customer leads', href: '/admin/messages', icon: Mail },
    { label: 'Review Bookings', description: 'Track booking requests', href: '/admin/bookings', icon: ClipboardList },
    { label: 'AI Conversations', description: 'Review travel advisor sessions', href: '/admin/ai-conversations', icon: Bot }
  ];

  let stats: DashboardStats = emptyStats;
  let loading = true;
  let error = '';
  let adminName = 'Goldfinch Super Admin';

  const numberValue = (source: Record<string, unknown>, key: string) => Number(source[key] ?? 0) || 0;

  const arrayValue = (source: Record<string, unknown>, key: string) => {
    const value = source[key];
    return Array.isArray(value) ? (value as DashboardRow[]) : [];
  };

  const normalizeStats = (data: Record<string, unknown>): DashboardStats => {
    const countsSource = (data.counts && typeof data.counts === 'object' ? data.counts : data) as Record<string, unknown>;
    const bookingSource = (data.bookingPipeline && typeof data.bookingPipeline === 'object' ? data.bookingPipeline : {}) as Record<string, unknown>;
    const healthSource = (data.contentHealth && typeof data.contentHealth === 'object' ? data.contentHealth : {}) as Record<string, unknown>;
    const recentSource = (data.recent && typeof data.recent === 'object' ? data.recent : {}) as Record<string, unknown>;
    const featuredSource = (data.featured && typeof data.featured === 'object' ? data.featured : {}) as Record<string, unknown>;

    return {
      counts: {
        totalTours: numberValue(countsSource, 'totalTours') || numberValue(countsSource, 'tours'),
        publishedTours: numberValue(countsSource, 'publishedTours'),
        draftTours: numberValue(countsSource, 'draftTours'),
        destinations: numberValue(countsSource, 'destinations'),
        totalBookings: numberValue(countsSource, 'totalBookings') || numberValue(countsSource, 'bookings'),
        pendingBookings: numberValue(countsSource, 'pendingBookings'),
        confirmedBookings: numberValue(countsSource, 'confirmedBookings'),
        totalRevenue: numberValue(countsSource, 'totalRevenue'),
        unreadMessages: numberValue(countsSource, 'unreadMessages') || numberValue(countsSource, 'newMessages'),
        mediaFiles: numberValue(countsSource, 'mediaFiles'),
        blogPosts: numberValue(countsSource, 'blogPosts') || numberValue(countsSource, 'posts'),
        aiConversations: numberValue(countsSource, 'aiConversations')
      },
      bookingPipeline: {
        pending: numberValue(bookingSource, 'pending'),
        confirmed: numberValue(bookingSource, 'confirmed'),
        cancelled: numberValue(bookingSource, 'cancelled'),
        completed: numberValue(bookingSource, 'completed'),
        rejected: numberValue(bookingSource, 'rejected')
      },
      contentHealth: {
        toursWithSeo: numberValue(healthSource, 'toursWithSeo'),
        toursMissingImages: numberValue(healthSource, 'toursMissingImages'),
        toursWithoutItinerary: numberValue(healthSource, 'toursWithoutItinerary'),
        toursWithoutAvailableDates: numberValue(healthSource, 'toursWithoutAvailableDates'),
        publishedDestinations: numberValue(healthSource, 'publishedDestinations'),
        publishedBlogPosts: numberValue(healthSource, 'publishedBlogPosts'),
        publishedFaqs: numberValue(healthSource, 'publishedFaqs'),
        publishedTestimonials: numberValue(healthSource, 'publishedTestimonials')
      },
      recent: {
        bookings: arrayValue(recentSource, 'bookings'),
        messages: arrayValue(recentSource, 'messages'),
        tours: arrayValue(recentSource, 'tours'),
        media: arrayValue(recentSource, 'media'),
        auditLogs: arrayValue(recentSource, 'auditLogs')
      },
      featured: {
        tours: arrayValue(featuredSource, 'tours'),
        destinations: arrayValue(featuredSource, 'destinations'),
        blogPosts: arrayValue(featuredSource, 'blogPosts')
      }
    };
  };

  const formatMoney = (value: number) => `USD ${value.toLocaleString()}`;

  const formatDate = (value?: unknown) => {
    if (!value) return 'No date';
    return new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(String(value)));
  };

  const textValue = (row: DashboardRow, key: string, fallback = '-') => String(row[key] ?? fallback);

  const relationText = (row: DashboardRow, key: string, childKey = 'title') => {
    const value = row[key];
    if (Array.isArray(value)) return String((value[0] as DashboardRow | undefined)?.[childKey] ?? '');
    if (value && typeof value === 'object') return String((value as DashboardRow)[childKey] ?? '');
    return '';
  };

  const percent = (value: number, total: number) => {
    if (total <= 0) return 0;
    return Math.min(Math.round((value / total) * 100), 100);
  };

  const statusClass = (count: number) =>
    count > 0 ? 'bg-goldfinch-gold/15 text-heading ring-goldfinch-gold/25' : 'bg-forest/10 text-forest ring-forest/20';

  $: kpiCards = [
    { label: 'Total Tours', value: stats.counts.totalTours, helper: 'All CMS tour packages', trend: `${stats.counts.publishedTours} published`, icon: Map, accent: 'from-forest/12 to-forest/5 text-forest' },
    { label: 'Published Tours', value: stats.counts.publishedTours, helper: 'Visible on website', trend: 'Public inventory', icon: CheckCircle, accent: 'from-forest/12 to-forest/5 text-forest' },
    { label: 'Draft Tours', value: stats.counts.draftTours, helper: 'Waiting for publishing', trend: stats.counts.draftTours ? 'Needs review' : 'Clear', icon: FileClock, accent: 'from-goldfinch-gold/20 to-goldfinch-gold/5 text-heading' },
    { label: 'Destinations', value: stats.counts.destinations, helper: 'CMS destinations', trend: `${stats.contentHealth.publishedDestinations} published`, icon: MapPin, accent: 'from-savanna/50 to-savanna/15 text-heading' },
    { label: 'Bookings', value: stats.counts.totalBookings, helper: 'Total booking requests', trend: `${stats.counts.pendingBookings} pending`, icon: ClipboardList, accent: 'from-forest/12 to-forest/5 text-forest' },
    { label: 'Pending Bookings', value: stats.counts.pendingBookings, helper: 'Need response', trend: stats.counts.pendingBookings ? 'Action needed' : 'No backlog', icon: Clock, accent: 'from-goldfinch-gold/20 to-goldfinch-gold/5 text-heading' },
    { label: 'Revenue', value: formatMoney(stats.counts.totalRevenue), helper: 'Paid booking records', trend: 'Finance view', icon: CircleDollarSign, accent: 'from-forest/12 to-forest/5 text-forest' },
    { label: 'Messages', value: stats.counts.unreadMessages, helper: 'Unread customer messages', trend: stats.counts.unreadMessages ? 'Follow up' : 'Inbox clear', icon: Mail, accent: 'from-goldfinch-gold/20 to-goldfinch-gold/5 text-heading' },
    { label: 'Media Files', value: stats.counts.mediaFiles, helper: 'Reusable CMS assets', trend: 'Image library', icon: Images, accent: 'from-savanna/50 to-savanna/15 text-heading' },
    { label: 'Blog Posts', value: stats.counts.blogPosts, helper: 'Published and draft posts', trend: `${stats.contentHealth.publishedBlogPosts} published`, icon: Newspaper, accent: 'from-forest/12 to-forest/5 text-forest' },
    { label: 'AI Conversations', value: stats.counts.aiConversations, helper: 'Travel advisor sessions', trend: 'Lead intelligence', icon: Bot, accent: 'from-goldfinch-gold/20 to-goldfinch-gold/5 text-heading' },
    { label: 'Confirmed Bookings', value: stats.counts.confirmedBookings, helper: 'Ready for operations', trend: 'Operations queue', icon: CalendarCheck, accent: 'from-forest/12 to-forest/5 text-forest' }
  ] satisfies KpiCard[];

  $: operationalItems = [
    { label: 'Pending bookings', value: stats.counts.pendingBookings, href: '/admin/bookings', icon: ClipboardList },
    { label: 'Unread messages', value: stats.counts.unreadMessages, href: '/admin/messages', icon: Mail },
    { label: 'Draft tours', value: stats.counts.draftTours, href: '/admin/tours', icon: FileClock },
    { label: 'Tours missing images', value: stats.contentHealth.toursMissingImages, href: '/admin/tours', icon: ImagePlus },
    { label: 'Tours need itinerary', value: stats.contentHealth.toursWithoutItinerary, href: '/admin/itineraries', icon: Route },
    { label: 'Tours need dates', value: stats.contentHealth.toursWithoutAvailableDates, href: '/admin/available-dates', icon: CalendarCheck }
  ];

  $: pipelineTotal = Object.values(stats.bookingPipeline).reduce((sum, value) => sum + value, 0);

  $: pipelineItems = [
    { label: 'Pending', value: stats.bookingPipeline.pending, color: 'bg-goldfinch-gold' },
    { label: 'Confirmed', value: stats.bookingPipeline.confirmed, color: 'bg-forest' },
    { label: 'Cancelled', value: stats.bookingPipeline.cancelled, color: 'bg-slate-400' },
    { label: 'Completed', value: stats.bookingPipeline.completed, color: 'bg-deep-green' },
    { label: 'Rejected', value: stats.bookingPipeline.rejected, color: 'bg-red-400' }
  ];

  $: healthItems = [
    {
      label: 'SEO completed',
      helper: `${stats.contentHealth.toursWithSeo} of ${stats.counts.totalTours} tours`,
      value: percent(stats.contentHealth.toursWithSeo, stats.counts.totalTours),
      icon: SearchCheck
    },
    {
      label: 'Tour images added',
      helper: `${Math.max(stats.counts.totalTours - stats.contentHealth.toursMissingImages, 0)} of ${stats.counts.totalTours} tours`,
      value: percent(Math.max(stats.counts.totalTours - stats.contentHealth.toursMissingImages, 0), stats.counts.totalTours),
      icon: Images
    },
    {
      label: 'Destinations published',
      helper: `${stats.contentHealth.publishedDestinations} of ${stats.counts.destinations} destinations`,
      value: percent(stats.contentHealth.publishedDestinations, stats.counts.destinations),
      icon: MapPin
    },
    {
      label: 'Blog content added',
      helper: `${stats.contentHealth.publishedBlogPosts} published posts`,
      value: percent(stats.contentHealth.publishedBlogPosts, Math.max(stats.counts.blogPosts, 1)),
      icon: Newspaper
    },
    {
      label: 'FAQs ready',
      helper: `${stats.contentHealth.publishedFaqs} published FAQs`,
      value: stats.contentHealth.publishedFaqs > 0 ? 100 : 0,
      icon: ShieldCheck
    },
    {
      label: 'Testimonials ready',
      helper: `${stats.contentHealth.publishedTestimonials} published testimonials`,
      value: stats.contentHealth.publishedTestimonials > 0 ? 100 : 0,
      icon: MessageSquare
    }
  ];

  $: currentPeriod = new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  // ── ApexCharts options (brand-coloured) ──────────────────────────────────
  const CHART_FONT = 'Figtree, Inter, sans-serif';
  $: donutOptions = {
    chart: { type: 'donut', height: 300, fontFamily: CHART_FONT },
    labels: ['Pending', 'Confirmed', 'Cancelled', 'Completed', 'Rejected'],
    series: [
      stats.bookingPipeline.pending,
      stats.bookingPipeline.confirmed,
      stats.bookingPipeline.cancelled,
      stats.bookingPipeline.completed,
      stats.bookingPipeline.rejected
    ],
    colors: ['#D9A441', '#1F4D3A', '#94a3b8', '#0F2F24', '#f87171'],
    legend: { position: 'bottom', fontWeight: 600, labels: { colors: '#5A655F' } },
    dataLabels: { enabled: false },
    stroke: { width: 2, colors: ['#ffffff'] },
    plotOptions: {
      pie: {
        donut: {
          size: '68%',
          labels: {
            show: true,
            value: { fontSize: '24px', fontWeight: 700, color: '#1B2420' },
            total: { show: true, label: 'Total requests', color: '#5A655F', formatter: () => String(pipelineTotal) }
          }
        }
      }
    },
    tooltip: { y: { formatter: (v: number) => `${v} request${v === 1 ? '' : 's'}` } }
  };

  $: barOptions = {
    chart: { type: 'bar', height: 300, fontFamily: CHART_FONT, toolbar: { show: false } },
    series: [
      {
        name: 'Items',
        data: [
          stats.counts.totalTours,
          stats.counts.destinations,
          stats.counts.totalBookings,
          stats.counts.blogPosts,
          stats.counts.mediaFiles
        ]
      }
    ],
    xaxis: { categories: ['Tours', 'Destinations', 'Bookings', 'Blog', 'Media'], labels: { style: { colors: '#5A655F', fontWeight: 600 } } },
    yaxis: { labels: { style: { colors: '#5A655F' } } },
    colors: ['#1F4D3A'],
    plotOptions: { bar: { borderRadius: 5, columnWidth: '46%' } },
    dataLabels: { enabled: false },
    grid: { borderColor: 'rgba(15,47,36,0.07)', strokeDashArray: 4 },
    tooltip: { theme: 'light' }
  };

  onMount(async () => {
    loading = true;
    error = '';

    try {
      const [statsResponse, userResponse] = await Promise.all([
        api.dashboard.stats(),
        api.auth.me().catch(() => null)
      ]);

      stats = normalizeStats(statsResponse.data);

      if (userResponse?.data && typeof userResponse.data === 'object') {
        const user = userResponse.data as Record<string, unknown>;
        adminName = String(user.name ?? user.email ?? adminName);
      }
    } catch (requestError) {
      error = requestError instanceof Error ? requestError.message : 'Unable to load dashboard stats.';
    } finally {
      loading = false;
    }
  });
</script>

{#if loading}
  <div class="mx-auto grid w-full max-w-[1500px] gap-6">
    <div class="min-h-[260px] animate-pulse rounded-[10px] bg-gradient-to-br from-forest/80 to-deep-green"></div>
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {#each Array(12) as _}
        <div class="h-36 animate-pulse rounded-[8px] border border-ink/10 bg-surface/80"></div>
      {/each}
    </div>
  </div>
{:else if error}
  <ErrorState message={error} />
{:else}
  <div class="mx-auto grid w-full max-w-[1500px] gap-6">
    <section class="relative overflow-hidden rounded-[10px] border border-white/10 bg-gradient-to-br from-deep-green via-forest to-[#14382d] p-6 text-white shadow-[0_26px_80px_rgba(15,47,36,0.18)] lg:p-8">
      <div class="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-goldfinch-gold/25 blur-3xl"></div>
      <div class="pointer-events-none absolute bottom-0 left-1/3 h-44 w-44 rounded-full bg-savanna/10 blur-3xl"></div>

      <div class="relative grid gap-8 xl:grid-cols-[1fr_360px] xl:items-end">
        <div>
          <div class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-surface/10 px-3 py-1.5 text-xs font-semibold text-savanna backdrop-blur">
            <Sparkles size={14} />
            Goldfinch Travel Platform
          </div>
          <h1 class="mt-5 max-w-4xl text-3xl font-bold tracking-normal text-white sm:text-4xl lg:text-5xl">
            Welcome back, {adminName}
          </h1>
          <p class="mt-3 max-w-2xl text-base leading-7 text-savanna/85">
            Here is what is happening across your travel platform today.
          </p>
          <p class="mt-4 max-w-2xl text-sm font-semibold leading-6 text-white/80">
            Travelers do not need more options. They need more confidence.
          </p>

          <div class="mt-6 flex flex-wrap gap-3">
            <a class="inline-flex h-11 items-center gap-2 rounded-2xl bg-goldfinch-gold px-4 text-sm font-bold text-heading shadow-lg shadow-black/10 transition hover:bg-savanna focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-savanna" href="/admin/tours/new">
              <Plus size={16} />
              Add Tour
            </a>
            <a class="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/15 bg-surface/10 px-4 text-sm font-bold text-white backdrop-blur transition hover:bg-surface/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-savanna" href="/admin/bookings">
              <ClipboardList size={16} />
              View Bookings
            </a>
            <a class="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/15 bg-surface/10 px-4 text-sm font-bold text-white backdrop-blur transition hover:bg-surface/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-savanna" href="/admin/media">
              <Upload size={16} />
              Upload Media
            </a>
          </div>
        </div>

        <div class="rounded-[10px] border border-white/10 bg-surface/10 p-5 backdrop-blur">
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-savanna/80">Current period</p>
          <p class="mt-2 text-2xl font-bold text-white">{currentPeriod}</p>
          <div class="mt-5 grid grid-cols-2 gap-3">
            <div class="rounded-2xl bg-surface/10 p-3">
              <p class="text-xs text-savanna/75">Pending bookings</p>
              <p class="mt-1 text-2xl font-bold">{stats.counts.pendingBookings}</p>
            </div>
            <div class="rounded-2xl bg-surface/10 p-3">
              <p class="text-xs text-savanna/75">Unread messages</p>
              <p class="mt-1 text-2xl font-bold">{stats.counts.unreadMessages}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section aria-labelledby="dashboard-kpis">
      <div class="mb-4 flex items-end justify-between gap-4">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Platform pulse</p>
          <h2 id="dashboard-kpis" class="mt-1 text-xl font-bold text-ink">Key metrics</h2>
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {#each kpiCards as card}
          {@const Icon = card.icon}
          <article class="group rounded-[8px] border border-ink/10 bg-surface p-5 shadow-[0_18px_50px_rgba(15,47,36,0.055)] transition hover:-translate-y-0.5 hover:border-goldfinch-gold/35 hover:shadow-[0_24px_70px_rgba(15,47,36,0.1)]">
            <div class="flex items-start justify-between gap-4">
              <div class={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${card.accent} ring-1 ring-ink/5 dark:text-goldfinch-gold`}>
                <Icon size={21} />
              </div>
              {#if card.trend}
                <span class="rounded-full bg-sand/70 px-2.5 py-1 text-[11px] font-bold text-ink/58 ring-1 ring-ink/5">{card.trend}</span>
              {/if}
            </div>
            <p class="mt-4 text-sm font-semibold text-ink/58">{card.label}</p>
            <p class="mt-2 text-3xl font-bold tracking-normal text-ink">{card.value}</p>
            <p class="mt-2 text-sm leading-5 text-ink/55">{card.helper}</p>
          </article>
        {/each}
      </div>
    </section>

    <!-- Analytics charts (ApexCharts) -->
    <section class="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <div class="rounded-[10px] border border-ink/10 bg-surface p-5 shadow-card">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Booking pipeline</p>
            <h2 class="mt-1 text-xl font-bold text-ink">Requests by status</h2>
          </div>
          <ChartPie class="text-goldfinch-gold" size={22} />
        </div>
        <div class="mt-4">
          {#if pipelineTotal > 0}
            <ApexChart options={donutOptions} />
          {:else}
            <p class="grid h-[260px] place-items-center text-sm text-ink/45">No booking requests yet.</p>
          {/if}
        </div>
      </div>

      <div class="rounded-[10px] border border-ink/10 bg-surface p-5 shadow-card">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Content overview</p>
            <h2 class="mt-1 text-xl font-bold text-ink">Inventory at a glance</h2>
          </div>
          <ChartBar class="text-goldfinch-gold" size={22} />
        </div>
        <div class="mt-4">
          <ApexChart options={barOptions} />
        </div>
      </div>
    </section>

    <section class="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <div class="rounded-[10px] border border-ink/10 bg-surface p-5 shadow-[0_18px_50px_rgba(15,47,36,0.06)]">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Operational snapshot</p>
            <h2 class="mt-1 text-xl font-bold text-ink">What needs attention</h2>
          </div>
          <AlertTriangle class="text-goldfinch-gold" size={22} />
        </div>

        <div class="mt-5 grid gap-3 sm:grid-cols-2">
          {#each operationalItems as item}
            {@const Icon = item.icon}
            <a class="flex items-center gap-3 rounded-2xl border border-ink/10 bg-sand/25 p-4 transition hover:border-goldfinch-gold/35 hover:bg-sand/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/20" href={item.href}>
              <span class="grid h-10 w-10 place-items-center rounded-xl bg-surface text-forest ring-1 ring-ink/10 dark:text-goldfinch-gold">
                <Icon size={17} />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block text-sm font-bold text-ink">{item.label}</span>
                <span class="mt-1 block text-xs text-ink/55">{item.value > 0 ? `${item.value} item${item.value === 1 ? '' : 's'} need review` : 'Clear'}</span>
              </span>
              <span class={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${statusClass(item.value)}`}>{item.value}</span>
            </a>
          {/each}
        </div>
      </div>

      <div class="rounded-[10px] border border-ink/10 bg-surface p-5 shadow-[0_18px_50px_rgba(15,47,36,0.06)]">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Quick actions</p>
            <h2 class="mt-1 text-xl font-bold text-ink">Move faster</h2>
          </div>
          <Sparkles class="text-goldfinch-gold" size={22} />
        </div>

        <div class="mt-5 grid gap-3 sm:grid-cols-2">
          {#each quickActions as action}
            {@const Icon = action.icon}
            <a class="group flex items-center gap-3 rounded-2xl border border-ink/10 bg-surface p-3 shadow-sm transition hover:border-goldfinch-gold/35 hover:bg-sand/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/20" href={action.href} aria-label={action.label}>
              <span class="grid h-10 w-10 place-items-center rounded-xl bg-forest/10 text-forest transition group-hover:bg-forest group-hover:text-white dark:text-goldfinch-gold dark:group-hover:text-white">
                <Icon size={17} />
              </span>
              <span class="min-w-0">
                <span class="block truncate text-sm font-bold text-ink">{action.label}</span>
                <span class="mt-0.5 block truncate text-xs text-ink/55">{action.description}</span>
              </span>
            </a>
          {/each}
        </div>
      </div>
    </section>

    <section class="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <div class="rounded-[10px] border border-ink/10 bg-surface p-5 shadow-[0_18px_50px_rgba(15,47,36,0.06)]">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Booking pipeline</p>
          <h2 class="mt-1 text-xl font-bold text-ink">Request status</h2>
        </div>

        <div class="mt-5 grid gap-4">
          {#each pipelineItems as item}
            {@const width = percent(item.value, Math.max(pipelineTotal, 1))}
            <div>
              <div class="flex items-center justify-between gap-3 text-sm">
                <span class="font-semibold text-ink">{item.label}</span>
                <span class="font-bold text-ink/65">{item.value}</span>
              </div>
              <div class="mt-2 h-2.5 overflow-hidden rounded-full bg-sand">
                <div class={`h-full rounded-full ${item.color}`} style={`width: ${width}%`}></div>
              </div>
            </div>
          {/each}
        </div>
      </div>

      <div class="rounded-[10px] border border-ink/10 bg-surface p-5 shadow-[0_18px_50px_rgba(15,47,36,0.06)]">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Content health</p>
          <h2 class="mt-1 text-xl font-bold text-ink">Publishing readiness</h2>
        </div>

        <div class="mt-5 grid gap-4 md:grid-cols-2">
          {#each healthItems as item}
            {@const Icon = item.icon}
            <div class="rounded-2xl border border-ink/10 bg-sand/20 p-4">
              <div class="flex items-start gap-3">
                <span class="grid h-10 w-10 place-items-center rounded-xl bg-surface text-forest ring-1 ring-ink/10 dark:text-goldfinch-gold">
                  <Icon size={17} />
                </span>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between gap-3">
                    <p class="text-sm font-bold text-ink">{item.label}</p>
                    <p class="text-xs font-bold text-forest">{item.value}%</p>
                  </div>
                  <p class="mt-1 text-xs text-ink/55">{item.helper}</p>
                  <div class="mt-3 h-2 overflow-hidden rounded-full bg-surface">
                    <div class="h-full rounded-full bg-gradient-to-r from-forest to-goldfinch-gold" style={`width: ${item.value}%`}></div>
                  </div>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </section>

    <section class="grid gap-6 xl:grid-cols-3">
      <div class="rounded-[10px] border border-ink/10 bg-surface p-5 shadow-[0_18px_50px_rgba(15,47,36,0.06)] xl:col-span-2">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Recent activity</p>
          <h2 class="mt-1 text-xl font-bold text-ink">Latest movement</h2>
        </div>

        <div class="mt-5 grid gap-4 md:grid-cols-2">
          <div class="rounded-2xl bg-sand/25 p-4">
            <h3 class="text-sm font-bold text-ink">Recent bookings</h3>
            <div class="mt-3 grid gap-3">
              {#if stats.recent.bookings.length}
                {#each stats.recent.bookings as booking}
                  <div class="rounded-xl bg-surface p-3 ring-1 ring-ink/10">
                    <p class="text-sm font-semibold text-ink">{textValue(booking, 'full_name', 'Guest')}</p>
                    <p class="mt-1 text-xs text-ink/55">{relationText(booking, 'tours') || textValue(booking, 'booking_code')} · {textValue(booking, 'status')}</p>
                  </div>
                {/each}
              {:else}
                <p class="rounded-xl bg-surface p-3 text-sm text-ink/55 ring-1 ring-ink/10">No booking activity yet.</p>
              {/if}
            </div>
          </div>

          <div class="rounded-2xl bg-sand/25 p-4">
            <h3 class="text-sm font-bold text-ink">Recent messages</h3>
            <div class="mt-3 grid gap-3">
              {#if stats.recent.messages.length}
                {#each stats.recent.messages as message}
                  <div class="rounded-xl bg-surface p-3 ring-1 ring-ink/10">
                    <p class="text-sm font-semibold text-ink">{textValue(message, 'full_name', 'Visitor')}</p>
                    <p class="mt-1 text-xs text-ink/55">{textValue(message, 'subject', 'General inquiry')} · {textValue(message, 'status')}</p>
                  </div>
                {/each}
              {:else}
                <p class="rounded-xl bg-surface p-3 text-sm text-ink/55 ring-1 ring-ink/10">No recent messages.</p>
              {/if}
            </div>
          </div>

          <div class="rounded-2xl bg-sand/25 p-4">
            <h3 class="text-sm font-bold text-ink">Recently added tours</h3>
            <div class="mt-3 grid gap-3">
              {#if stats.recent.tours.length}
                {#each stats.recent.tours as tour}
                  <div class="rounded-xl bg-surface p-3 ring-1 ring-ink/10">
                    <p class="text-sm font-semibold text-ink">{textValue(tour, 'title', 'Untitled tour')}</p>
                    <p class="mt-1 text-xs text-ink/55">{textValue(tour, 'status')} · {formatDate(tour.created_at)}</p>
                  </div>
                {/each}
              {:else}
                <p class="rounded-xl bg-surface p-3 text-sm text-ink/55 ring-1 ring-ink/10">No tours have been added yet.</p>
              {/if}
            </div>
          </div>

          <div class="rounded-2xl bg-sand/25 p-4">
            <h3 class="text-sm font-bold text-ink">Recent media uploads</h3>
            <div class="mt-3 grid gap-3">
              {#if stats.recent.media.length}
                {#each stats.recent.media as media}
                  <div class="rounded-xl bg-surface p-3 ring-1 ring-ink/10">
                    <p class="truncate text-sm font-semibold text-ink">{textValue(media, 'file_name', 'Media file')}</p>
                    <p class="mt-1 text-xs text-ink/55">{textValue(media, 'file_type')} · {formatDate(media.created_at)}</p>
                  </div>
                {/each}
              {:else}
                <p class="rounded-xl bg-surface p-3 text-sm text-ink/55 ring-1 ring-ink/10">No media uploads yet.</p>
              {/if}
            </div>
          </div>
        </div>
      </div>

      <div class="rounded-[10px] border border-ink/10 bg-surface p-5 shadow-[0_18px_50px_rgba(15,47,36,0.06)]">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Audit trail</p>
          <h2 class="mt-1 text-xl font-bold text-ink">Admin actions</h2>
        </div>
        <div class="mt-5 grid gap-3">
          {#if stats.recent.auditLogs.length}
            {#each stats.recent.auditLogs as log}
              <div class="rounded-2xl border border-ink/10 bg-sand/25 p-3">
                <p class="text-sm font-bold capitalize text-ink">{textValue(log, 'action')}</p>
                <p class="mt-1 text-xs text-ink/55">{textValue(log, 'entity_type')} · {formatDate(log.created_at)}</p>
              </div>
            {/each}
          {:else}
            <div class="rounded-2xl border border-dashed border-forest/20 bg-sand/25 p-5 text-center">
              <ShieldCheck class="mx-auto text-forest" size={24} />
              <p class="mt-3 text-sm font-bold text-ink">No audit logs yet</p>
              <p class="mt-1 text-xs leading-5 text-ink/55">Admin actions will appear here once CMS activity is recorded.</p>
            </div>
          {/if}
        </div>
      </div>
    </section>

    <section class="grid gap-6 xl:grid-cols-3">
      <div class="rounded-[10px] border border-ink/10 bg-surface p-5 shadow-[0_18px_50px_rgba(15,47,36,0.06)]">
        <h2 class="text-xl font-bold text-ink">Featured tours</h2>
        <div class="mt-4 grid gap-3">
          {#if stats.featured.tours.length}
            {#each stats.featured.tours as tour}
              <a class="block rounded-2xl border border-ink/10 bg-sand/25 p-4 transition hover:border-goldfinch-gold/35 hover:bg-sand/50" href="/admin/tours">
                <p class="font-semibold text-ink">{textValue(tour, 'title', 'Untitled tour')}</p>
                <p class="mt-1 text-xs text-ink/55">{formatMoney(Number(tour.price_from ?? 0))} · {textValue(tour, 'status')}</p>
              </a>
            {/each}
          {:else}
            <a class="block rounded-2xl border border-dashed border-forest/20 bg-sand/25 p-4 text-sm font-semibold text-forest" href="/admin/tours">Mark tours as featured</a>
          {/if}
        </div>
      </div>

      <div class="rounded-[10px] border border-ink/10 bg-surface p-5 shadow-[0_18px_50px_rgba(15,47,36,0.06)]">
        <h2 class="text-xl font-bold text-ink">Featured destinations</h2>
        <div class="mt-4 grid gap-3">
          {#if stats.featured.destinations.length}
            {#each stats.featured.destinations as destination}
              <a class="block rounded-2xl border border-ink/10 bg-sand/25 p-4 transition hover:border-goldfinch-gold/35 hover:bg-sand/50" href="/admin/destinations">
                <p class="font-semibold text-ink">{textValue(destination, 'name', 'Untitled destination')}</p>
                <p class="mt-1 text-xs text-ink/55">{textValue(destination, 'country', 'East Africa')} · {textValue(destination, 'status')}</p>
              </a>
            {/each}
          {:else}
            <a class="block rounded-2xl border border-dashed border-forest/20 bg-sand/25 p-4 text-sm font-semibold text-forest" href="/admin/destinations">Feature destination content</a>
          {/if}
        </div>
      </div>

      <div class="rounded-[10px] border border-ink/10 bg-surface p-5 shadow-[0_18px_50px_rgba(15,47,36,0.06)]">
        <h2 class="text-xl font-bold text-ink">Latest blog posts</h2>
        <div class="mt-4 grid gap-3">
          {#if stats.featured.blogPosts.length}
            {#each stats.featured.blogPosts as post}
              <a class="block rounded-2xl border border-ink/10 bg-sand/25 p-4 transition hover:border-goldfinch-gold/35 hover:bg-sand/50" href="/admin/blog">
                <p class="font-semibold text-ink">{textValue(post, 'title', 'Untitled post')}</p>
                <p class="mt-1 text-xs text-ink/55">{textValue(post, 'status')} · {formatDate(post.published_at ?? post.created_at)}</p>
              </a>
            {/each}
          {:else}
            <a class="block rounded-2xl border border-dashed border-forest/20 bg-sand/25 p-4 text-sm font-semibold text-forest" href="/admin/blog">Create the first blog post</a>
          {/if}
        </div>
      </div>
    </section>
  </div>
{/if}
