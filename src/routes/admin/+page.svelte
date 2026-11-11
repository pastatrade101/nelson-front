<script lang="ts">
  /**
   * The CMS overview, ordered by the questions people open it with: is money
   * owed to us, is anybody waiting on us, where do the quotations stand, and
   * did the messages we sent arrive. Content health comes last — it matters,
   * it just is not urgent.
   *
   * Every figure comes from Emnel's own records (GET /dashboard/stats). Nothing
   * is projected or estimated: a number here either happened or is absent.
   */
  import { onMount } from 'svelte';
  import type { Component } from 'svelte';
  import {
    AlertTriangle,
    ArrowRight,
    Ban,
    CalendarCheck,
    CheckCircle2,
    ClipboardList,
    Inbox,
    Mail,
    Plus,
    Send,
    Sparkles,
    TrendingUp,
    Wallet
  } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import ChartCanvas from '$lib/components/admin/ChartCanvas.svelte';
  import { funnelConfig, lineConfig } from '$lib/charts';
  import ErrorState from '$lib/components/public/ErrorState.svelte';

  type Money = { received: number; refunded: number; outstanding: number };
  type DeliveryReason = { status: 'skipped' | 'failed'; channel: string; detail: string; count: number };
  type Commerce = {
    days: number;
    money: Record<string, Money>;
    currencies: string[];
    series: Array<{ date: string; received: number; enquiries: number; accepted: number }>;
    pipeline: Record<string, number>;
    quotedValue: number;
    acceptedValue: number;
    winRate: number | null;
    attention: { pendingEnquiries: number; quotationsToSend: number; unpaidConfirmed: number };
    delivery: { sent: number; skipped: number; failed: number };
    deliveryReasons?: DeliveryReason[];
  };

  let stats: Record<string, any> | null = null;
  let commerce: Commerce | null = null;
  let loading = true;
  let error = '';

  onMount(async () => {
    try {
      const res = await api.dashboard.stats();
      stats = res.data as Record<string, any>;
      commerce = (stats?.commerce ?? null) as Commerce | null;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to load the dashboard.';
    } finally {
      loading = false;
    }
  });

  const money = (value: unknown, code = 'USD') =>
    `${code} ${Number(value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const exact = (value: unknown, code = 'USD') =>
    `${code} ${Number(value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  /** Short labels; a 30-point axis has no room for years. */
  const tick = (iso: string) =>
    new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));

  const hour = new Date().getHours();
  $: greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  /** The trading currency: whichever has seen the most money. */
  $: primary = (commerce?.currencies ?? []).slice().sort((a, b) => {
    const m = commerce!.money;
    return (m[b].received + m[b].outstanding) - (m[a].received + m[a].outstanding);
  })[0] ?? 'USD';
  $: pot = commerce?.money?.[primary] ?? { received: 0, refunded: 0, outstanding: 0 };

  /**
   * Only what someone can act on, and only when there is something to act on.
   * A permanent row of zeroes trains people to stop reading the section.
   */
  $: todo = !commerce
    ? []
    : [
        {
          key: 'pending',
          count: commerce.attention.pendingEnquiries,
          label: commerce.attention.pendingEnquiries === 1 ? 'enquiry still pending' : 'enquiries still pending',
          detail: 'Trip requests not yet moved on from Pending — reply, quote, or update the status.',
          href: '/admin/bookings?status=pending',
          icon: Inbox,
          tone: 'urgent'
        },
        {
          key: 'tosend',
          count: commerce.attention.quotationsToSend,
          label: commerce.attention.quotationsToSend === 1 ? 'quotation drafted, not sent' : 'quotations drafted, not sent',
          detail: 'Written and waiting. The traveller has not seen these yet.',
          href: '/admin/quotations',
          icon: Send,
          tone: 'warn'
        },
        {
          key: 'unpaid',
          count: commerce.attention.unpaidConfirmed,
          label: commerce.attention.unpaidConfirmed === 1 ? 'confirmed trip not fully paid' : 'confirmed trips not fully paid',
          detail: 'Agreed and going ahead, money still outstanding.',
          href: '/admin/bookings?status=confirmed&payment_status=unpaid',
          icon: CalendarCheck,
          tone: 'warn'
        }
      ].filter((row) => row.count > 0);

  $: urgentCount = todo.filter((t) => t.tone === 'urgent').reduce((n, t) => n + t.count, 0);

  // ── Charts ──────────────────────────────────────────────────────────────
  $: series = commerce?.series ?? [];
  $: hasMoneyHistory = series.some((d) => d.received > 0);
  $: hasEnquiryHistory = series.some((d) => d.enquiries > 0);

  $: moneyChart = lineConfig(series.map((d) => tick(d.date)), series.map((d) => d.received), primary);
  $: enquiryChart = lineConfig(series.map((d) => tick(d.date)), series.map((d) => d.enquiries));

  /** The live stages only — settled outcomes (declined, expired) are reported as numbers. */
  const STAGES: Array<[string, string]> = [
    ['draft', 'Draft'],
    ['sent', 'Sent'],
    ['viewed', 'Viewed'],
    ['accepted', 'Accepted']
  ];
  $: funnelStages = STAGES.map(([key, label]) => ({ label, value: commerce?.pipeline?.[key] ?? 0 }));
  $: hasFunnel = funnelStages.some((s) => s.value > 0);
  $: funnelChart = funnelConfig(funnelStages);
  $: settled = (commerce?.pipeline?.declined ?? 0) + (commerce?.pipeline?.expired ?? 0);

  // ── Delivery ────────────────────────────────────────────────────────────
  $: delivery = commerce?.delivery ?? { sent: 0, skipped: 0, failed: 0 };
  $: deliveryTotal = delivery.sent + delivery.skipped + delivery.failed;
  $: deliveryRate = deliveryTotal ? Math.round((delivery.sent / deliveryTotal) * 100) : null;
  $: deliveryReasons = commerce?.deliveryReasons ?? [];
  const CHANNEL_LABEL: Record<string, string> = { whatsapp: 'WhatsApp', email: 'Email', email_staff: 'Staff email' };

  $: counts = (stats?.counts ?? {}) as Record<string, number>;
  $: recentBookings = (stats?.recent?.bookings ?? []) as Array<Record<string, any>>;
  $: recentMessages = (stats?.recent?.messages ?? []) as Array<Record<string, any>>;

  const when = (value: unknown) =>
    value
      ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(String(value)))
      : '';

  const QUICK: Array<{ label: string; href: string; icon: Component }> = [
    { label: 'New quotation', href: '/admin/quotations', icon: Plus },
    { label: 'Record a payment', href: '/admin/payments', icon: Wallet },
    { label: 'Bookings', href: '/admin/bookings', icon: ClipboardList },
    { label: 'Inbox', href: '/admin/messages', icon: Mail }
  ];

  // `min-w-0` keeps chart canvases and long names inside a phone viewport.
  const card = 'min-w-0 max-w-full rounded-[10px] border border-ink/10 bg-surface p-4 shadow-sm sm:p-5';
  const eyebrow = 'text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70';
  const emptyNote = 'mt-6 rounded-[8px] border border-dashed border-ink/15 px-4 py-8 text-center text-sm text-ink/45';
</script>

{#if error}
  <ErrorState message={error} />
{:else if loading}
  <div class="grid gap-4">
    {#each Array(3) as _}
      <div class="h-32 animate-pulse rounded-[10px] border border-ink/10 bg-sand/30"></div>
    {/each}
  </div>
{:else}
  <div class="grid min-w-0 max-w-full gap-4 sm:gap-5">
    <!-- ── The band: money, and whether anyone is waiting ──────────────── -->
    <section
      class="relative min-w-0 overflow-hidden rounded-[10px] border border-white/10 bg-gradient-to-br from-deep-green via-forest to-[#232620] p-4 text-white shadow-[0_26px_80px_rgba(57,61,50,0.18)] sm:p-6 lg:p-8"
    >
      <div class="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-emnel-gold/10 blur-3xl"></div>

      <div class="relative grid min-w-0 gap-4 sm:gap-5 lg:grid-cols-[1.1fr_1fr] lg:items-end">
        <div class="min-w-0">
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-emnel-gold">{greeting}</p>
          <h1 class="mt-2 font-serif text-[1.75rem] font-semibold leading-[1.1] sm:text-3xl md:text-[38px]">
            {#if urgentCount > 0}
              {urgentCount} {urgentCount === 1 ? 'enquiry is' : 'enquiries are'} waiting on you
            {:else if todo.length}
              Nothing urgent — {todo.length} {todo.length === 1 ? 'item' : 'items'} in hand
            {:else}
              Everything is clear
            {/if}
          </h1>
          <p class="mt-2 max-w-lg text-sm leading-relaxed text-white/70 [overflow-wrap:anywhere]">
            {#if urgentCount > 0}
              Travellers asked for a trip and the request is still marked Pending. The list below shows where the work is.
            {:else if todo.length}
              Nothing is blocked. What is below is work in flight, not work overdue.
            {:else}
              No pending enquiries, no unsent quotations, and nothing outstanding on a confirmed trip.
            {/if}
          </p>
        </div>

        <div class="grid grid-cols-2 gap-2.5 sm:gap-3">
          <div class="min-w-0 rounded-[8px] bg-white/[0.07] p-3 ring-1 ring-white/10 sm:p-4">
            <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-white/55">Received</p>
            <p class="mt-1 break-words font-serif text-2xl font-semibold leading-none text-emnel-gold sm:text-3xl">{money(pot.received, primary)}</p>
            <p class="mt-1.5 text-[11px] text-white/50">
              {#if pot.refunded > 0}less {money(pot.refunded, primary)} refunded{:else}all time{/if}
            </p>
          </div>
          <div class="min-w-0 rounded-[8px] bg-white/[0.07] p-3 ring-1 ring-white/10 sm:p-4">
            <p class="text-[11px] font-bold uppercase tracking-[0.12em] text-white/55">Outstanding</p>
            <p class="mt-1 break-words font-serif text-2xl font-semibold leading-none text-white sm:text-3xl">{money(pot.outstanding, primary)}</p>
            <p class="mt-1.5 text-[11px] text-white/50">
              {commerce?.attention.unpaidConfirmed ?? 0} confirmed {(commerce?.attention.unpaidConfirmed ?? 0) === 1 ? 'trip' : 'trips'}
            </p>
          </div>
        </div>
      </div>

      {#if commerce && commerce.currencies.length > 1}
        <!-- Only when there genuinely is more than one. Currencies are never added together. -->
        {@const others = commerce.currencies.filter((c) => c !== primary)}
        <p class="relative mt-4 text-[11px] text-white/50">
          Also holding
          {#each others as code, i}
            {i > 0 ? ' · ' : ' '}{exact(commerce.money[code].received, code)}
          {/each}
        </p>
      {/if}
    </section>

    <!-- ── What needs a human ──────────────────────────────────────────── -->
    {#if todo.length}
      <section class="grid min-w-0 gap-3">
        <div>
          <p class={eyebrow}>Waiting on you</p>
          <h2 class="mt-1 text-xl font-bold text-ink">Where the work is</h2>
        </div>
        <div class="grid min-w-0 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {#each todo as row (row.key)}
            <a
              class="group flex min-w-0 items-start gap-3 rounded-[10px] border bg-surface p-3.5 shadow-sm transition hover:shadow-md sm:p-4
                {row.tone === 'urgent' ? 'border-clay/30' : 'border-emnel-gold/35'}"
              href={row.href}
            >
              <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl {row.tone === 'urgent' ? 'bg-clay/10 text-clay' : 'bg-emnel-gold/15 text-heading'}">
                <svelte:component this={row.icon} size={18} />
              </span>
              <span class="min-w-0 flex-1">
                <span class="flex items-baseline gap-1.5">
                  <span class="text-2xl font-extrabold leading-none text-ink">{row.count}</span>
                  <span class="min-w-0 text-sm font-semibold text-ink/80 [overflow-wrap:anywhere]">{row.label}</span>
                </span>
                <span class="mt-1 block text-xs leading-5 text-ink/55">{row.detail}</span>
              </span>
              <ArrowRight size={15} class="mt-1 shrink-0 text-ink/25 transition group-hover:translate-x-0.5 group-hover:text-ink/50" />
            </a>
          {/each}
        </div>
      </section>
    {:else}
      <section class="flex items-center gap-3 rounded-[10px] border border-emerald-200/60 bg-emerald-50/60 p-4">
        <CheckCircle2 size={20} class="shrink-0 text-emerald-600" />
        <p class="text-sm text-emerald-900">Nothing is waiting on a decision — no pending enquiries, no unsent quotations, no unpaid confirmed trips.</p>
      </section>
    {/if}

    <!-- ── Trend ───────────────────────────────────────────────────────── -->
    <section class="grid min-w-0 gap-4 xl:grid-cols-2">
      <div class={card}>
        <div class="flex items-baseline justify-between gap-3">
          <div>
            <p class={eyebrow}><TrendingUp size={12} class="mr-1 inline" /> Last {commerce?.days ?? 30} days</p>
            <h2 class="mt-1 text-xl font-bold text-ink">Money received</h2>
          </div>
          <p class="text-right text-sm font-bold text-ink">{exact(series.reduce((n, d) => n + d.received, 0), primary)}</p>
        </div>
        {#if hasMoneyHistory}
          <div class="mt-4 min-w-0"><ChartCanvas {...moneyChart} height={220} /></div>
        {:else}
          <!-- An empty chart would read as a measured zero; this says there is no history yet. -->
          <p class={emptyNote}>No payments recorded in this period yet.</p>
        {/if}
      </div>

      <div class={card}>
        <div class="flex items-baseline justify-between gap-3">
          <div>
            <p class={eyebrow}>Last {commerce?.days ?? 30} days</p>
            <h2 class="mt-1 text-xl font-bold text-ink">Enquiries</h2>
          </div>
          <p class="text-right text-sm font-bold text-ink">{series.reduce((n, d) => n + d.enquiries, 0)}</p>
        </div>
        {#if hasEnquiryHistory}
          <div class="mt-4 min-w-0"><ChartCanvas {...enquiryChart} height={220} /></div>
        {:else}
          <p class={emptyNote}>No enquiries in this period.</p>
        {/if}
      </div>
    </section>

    <!-- ── Deals ───────────────────────────────────────────────────────── -->
    <section class="grid min-w-0 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
      <div class={card}>
        <div class="flex items-baseline justify-between gap-3">
          <div>
            <p class={eyebrow}>Quotations</p>
            <h2 class="mt-1 text-xl font-bold text-ink">Where deals stand</h2>
          </div>
          <a class="text-xs font-semibold text-forest underline underline-offset-4 hover:no-underline" href="/admin/quotations">Open</a>
        </div>
        {#if hasFunnel}
          <div class="mt-4 min-w-0"><ChartCanvas {...funnelChart} height={240} /></div>
          {#if settled > 0}
            <p class="mt-2 text-xs text-ink/50">
              Also settled: {commerce?.pipeline?.declined ?? 0} declined · {commerce?.pipeline?.expired ?? 0} expired
            </p>
          {/if}
        {:else}
          <p class={emptyNote}>No quotations raised yet.</p>
        {/if}
      </div>

      <div class="grid min-w-0 gap-3">
        <div class={card}>
          <p class={eyebrow}>Accepted value</p>
          <p class="mt-1 font-serif text-3xl font-semibold leading-none text-heading">{money(commerce?.acceptedValue, primary)}</p>
          <p class="mt-1.5 text-xs text-ink/50">
            Across {commerce?.pipeline?.accepted ?? 0} accepted {(commerce?.pipeline?.accepted ?? 0) === 1 ? 'quotation' : 'quotations'}
          </p>
        </div>
        <div class={card}>
          <p class={eyebrow}>Still deciding</p>
          <p class="mt-1 font-serif text-3xl font-semibold leading-none text-heading">{money(commerce?.quotedValue, primary)}</p>
          <p class="mt-1.5 text-xs text-ink/50">Sent or viewed, not yet answered</p>
        </div>
        <div class={card}>
          <p class={eyebrow}>Acceptance rate</p>
          {#if commerce?.winRate == null}
            <!-- No decided quotations, so any percentage would be invented. -->
            <p class="mt-1 font-serif text-3xl font-semibold leading-none text-ink/35">—</p>
            <p class="mt-1.5 text-xs text-ink/50">Nothing has been decided yet</p>
          {:else}
            <p class="mt-1 font-serif text-3xl font-semibold leading-none text-emerald-600">{commerce.winRate}%</p>
            <p class="mt-1.5 text-xs text-ink/50">Of quotations that got an answer. Undecided ones are excluded — a quote sent yesterday is not a refusal.</p>
          {/if}
        </div>
      </div>
    </section>

    <!-- ── Did our messages land ───────────────────────────────────────── -->
    <section class={card}>
      <div class="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p class={eyebrow}>Last {commerce?.days ?? 30} days</p>
          <h2 class="mt-1 text-xl font-bold text-ink">Quotation messages</h2>
          <p class="mt-0.5 text-xs text-ink/50">Email and WhatsApp sent to travellers when a quotation is ready, updated or accepted.</p>
        </div>
        {#if deliveryRate != null}
          <p class="text-sm font-bold {deliveryRate >= 90 ? 'text-emerald-600' : deliveryRate >= 60 ? 'text-amber-600' : 'text-clay'}">
            {deliveryRate}% delivered
          </p>
        {/if}
      </div>

      {#if deliveryTotal === 0}
        <p class="mt-4 rounded-[8px] border border-dashed border-ink/15 px-4 py-6 text-center text-sm text-ink/45">No quotation messages in this period.</p>
      {:else}
        <div class="mt-4 grid min-w-0 gap-3 sm:grid-cols-3">
          {#each [['Delivered', delivery.sent, 'text-emerald-600', 'bg-emerald-500'], ['Skipped', delivery.skipped, 'text-amber-600', 'bg-amber-400'], ['Failed', delivery.failed, 'text-clay', 'bg-clay']] as [label, value, tone, accent]}
            <div class="flex items-center gap-3 rounded-[8px] border border-ink/10 px-3.5 py-3">
              <span class={`h-9 w-1 shrink-0 rounded-full ${accent}`}></span>
              <span class="min-w-0">
                <span class={`block text-2xl font-extrabold leading-none ${tone}`}>{value}</span>
                <span class="mt-0.5 block text-[11px] font-semibold text-ink/50">{label}</span>
              </span>
            </div>
          {/each}
        </div>

        {#if deliveryReasons.length}
          <!-- The reasons recorded with each message that did not go out. A
               provider rejecting everything looks just like nobody sending
               anything, and this is the only place the difference shows. -->
          <ul class="mt-3 grid gap-1.5 rounded-[8px] bg-sand/40 px-3.5 py-2.5 text-xs leading-6 text-ink/70">
            {#each deliveryReasons as r}
              <li class="flex items-start gap-2">
                <svelte:component this={r.status === 'failed' ? AlertTriangle : Ban} size={14} class={`mt-1 shrink-0 ${r.status === 'failed' ? 'text-clay' : 'text-amber-600'}`} />
                <span>
                  <strong>{r.count} {CHANNEL_LABEL[r.channel] ?? r.channel}</strong>
                  {r.status === 'failed' ? 'failed' : 'skipped'}: {r.detail}
                </span>
              </li>
            {/each}
          </ul>
        {/if}
      {/if}
    </section>

    <!-- ── Movement ────────────────────────────────────────────────────── -->
    <section class="grid min-w-0 gap-4 lg:grid-cols-2 xl:grid-cols-[1fr_1fr_0.7fr]">
      <div class={card}>
        <div class="flex items-baseline justify-between gap-3">
          <h2 class="text-base font-bold text-ink">Latest enquiries</h2>
          <a class="text-xs font-semibold text-forest underline underline-offset-4 hover:no-underline" href="/admin/bookings">All</a>
        </div>
        {#if recentBookings.length}
          <ul class="mt-3 grid gap-2">
            {#each recentBookings.slice(0, 5) as b}
              <li class="flex min-w-0 items-baseline justify-between gap-3 border-b border-ink/[0.06] pb-2 last:border-0 last:pb-0">
                <span class="min-w-0">
                  <span class="block truncate text-sm font-semibold text-heading">{b.full_name}</span>
                  <span class="font-mono text-[11px] text-ink/45">{b.booking_code}</span>
                </span>
                <span class="shrink-0 text-[11px] text-ink/45">{when(b.created_at)}</span>
              </li>
            {/each}
          </ul>
        {:else}
          <p class="mt-4 text-sm text-ink/45">No enquiries yet.</p>
        {/if}
      </div>

      <div class={card}>
        <div class="flex items-baseline justify-between gap-3">
          <h2 class="text-base font-bold text-ink">
            Latest messages
            {#if counts.unreadMessages}<span class="ml-1 rounded-full bg-clay/10 px-2 py-0.5 text-[11px] font-bold text-clay">{counts.unreadMessages} new</span>{/if}
          </h2>
          <a class="text-xs font-semibold text-forest underline underline-offset-4 hover:no-underline" href="/admin/messages">Inbox</a>
        </div>
        {#if recentMessages.length}
          <ul class="mt-3 grid gap-2">
            {#each recentMessages.slice(0, 5) as m}
              <li class="flex min-w-0 items-baseline justify-between gap-3 border-b border-ink/[0.06] pb-2 last:border-0 last:pb-0">
                <span class="min-w-0">
                  <span class="flex items-center gap-1.5 truncate text-sm font-semibold text-heading">
                    {#if m.status === 'new'}<span class="h-1.5 w-1.5 shrink-0 rounded-full bg-clay" title="New"></span>{/if}
                    {m.full_name ?? m.name ?? 'Someone'}
                  </span>
                  <span class="block truncate text-[11px] text-ink/45">{m.subject ?? m.email ?? ''}</span>
                </span>
                <span class="shrink-0 text-[11px] text-ink/45">{when(m.created_at)}</span>
              </li>
            {/each}
          </ul>
        {:else}
          <p class="mt-4 text-sm text-ink/45">No messages yet.</p>
        {/if}
      </div>

      <div class={card}>
        <h2 class="text-base font-bold text-ink">Jump to</h2>
        <div class="mt-3 grid gap-2">
          {#each QUICK as q}
            <a class="flex items-center gap-2.5 rounded-xl border border-ink/10 px-3 py-2.5 text-sm font-semibold text-heading transition hover:bg-sand/40" href={q.href}>
              <svelte:component this={q.icon} size={15} class="text-ink/45" />
              {q.label}
            </a>
          {/each}
        </div>
      </div>
    </section>

    <!-- ── The website itself. Kept, deliberately last. ─────────────────── -->
    <section class={card}>
      <div class="flex items-baseline justify-between gap-3">
        <div>
          <p class={eyebrow}><Sparkles size={12} class="mr-1 inline" /> The website</p>
          <h2 class="mt-1 text-xl font-bold text-ink">Content</h2>
        </div>
        <a class="text-xs font-semibold text-forest underline underline-offset-4 hover:no-underline" href="/admin/tours">Manage</a>
      </div>
      <div class="mt-4 grid min-w-0 grid-cols-2 gap-2 lg:grid-cols-5">
        {#each [['Published tours', counts.publishedTours], ['Drafts', counts.draftTours], ['Destinations', counts.destinations], ['Blog posts', counts.blogPosts], ['Media', counts.mediaFiles]] as [label, value]}
          <div class="rounded-[8px] border border-ink/10 px-3 py-2.5">
            <span class="block text-xl font-extrabold leading-none text-ink">{value ?? 0}</span>
            <span class="mt-1 block text-[11px] font-semibold text-ink/50">{label}</span>
          </div>
        {/each}
      </div>
    </section>
  </div>
{/if}
