<script lang="ts">
  import { AlertTriangle, BarChart3, CheckCircle2, Database, ExternalLink, Info, Megaphone, ScanEye, SlidersHorizontal, Star } from '@lucide/svelte';
  import { clarityDashboardUrl } from '$lib/clarity';
  import type { MainLeadsTracking, ReconciliationRow } from './types';

  // Tracking health & setup — is each tool actually receiving the main leads,
  // do the three counts agree, and what still has to be switched on in GA4,
  // Clarity and Google Ads. Detection is honest: a step is only marked as seen
  // when the API proves it (e.g. GA4 split generate_lead by lead_source).
  export let tracking: MainLeadsTracking;
  /** PUBLIC_CLARITY_PROJECT_ID from the page — used when the API has none. */
  export let clarityId: string | undefined = undefined;

  const GA4_URL = 'https://analytics.google.com/';
  const ADS_URL = 'https://ads.google.com/';

  $: projectId = tracking?.clarity.projectId || clarityId || '';
  $: clarityOn = Boolean(tracking?.clarity.configured || clarityId);
  $: clarityUrl = clarityDashboardUrl(projectId || undefined);
  $: ga4On = tracking?.ga4.configured === true;
  $: ga4Events = tracking?.ga4.events ?? null;
  $: ga4Count = (name: string) => ga4Events?.find((e) => e.name === name)?.count ?? 0;
  $: inHouse = tracking?.inHouse ?? { eventsInRange: 0, lastEventAt: null, excludedDevEvents: 0 };
  $: recon = tracking?.reconciliation ?? [];
  // GA4 only returns a per-channel split when lead_source is a registered dimension.
  $: leadSourceSeen = recon.some((r) => r.channel !== 'whatsapp' && r.ga4 != null);

  const GA4_EVENT_NOTES: Record<string, string> = {
    generate_lead: 'Every website enquiry form (main-lead split needs lead_source)',
    whatsapp_click: 'WhatsApp link taps',
    form_opened: 'A lead form was opened',
    form_started: 'First answer given',
    form_step_completed: 'A planner / form step finished',
    form_abandoned: 'Left a form part-way'
  };

  const ago = (iso: string | null): string => {
    if (!iso) return 'never';
    const t = new Date(iso).getTime();
    if (!Number.isFinite(t)) return 'unknown';
    const m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m} min ago`;
    if (m < 48 * 60) return `${Math.round(m / 60)}h ago`;
    return new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // In-house vs database: the database is the record for the forms, so the
  // in-house tracker should sit close to it. GA4 is not judged — consent makes
  // it lower by design.
  type Verdict = { tone: 'good' | 'warn' | 'bad' | 'neutral'; text: string; pct: number | null };
  const verdict = (r: ReconciliationRow): Verdict => {
    if (r.database == null) return { tone: 'neutral', text: 'In-house is the record', pct: null };
    if (r.database === 0 && r.inHouse === 0) return { tone: 'neutral', text: 'No leads yet', pct: null };
    if (r.database === 0) return { tone: 'warn', text: 'Events without enquiries', pct: null };
    const pct = Math.round((r.inHouse / r.database) * 100);
    if (pct > 120) return { tone: 'warn', text: 'More events than enquiries', pct };
    if (pct >= 85) return { tone: 'good', text: 'On track', pct };
    if (pct >= 50) return { tone: 'warn', text: 'Partly tracked', pct };
    return { tone: 'bad', text: 'Under-tracked', pct };
  };
  const TONE: Record<Verdict['tone'], string> = {
    good: 'bg-emerald-500/10 text-emerald-700',
    warn: 'bg-amber-500/12 text-amber-700',
    bad: 'bg-red-500/10 text-red-600',
    neutral: 'bg-ink/[0.05] text-ink/55'
  };
  const num = (v: number | null) => (v == null ? '—' : v.toLocaleString());
</script>

<div class="grid grid-cols-1 gap-5">
  <!-- tool status -->
  <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
    <div class="rounded-2xl border border-ink/10 bg-surface p-4 shadow-[0_1px_2px_rgba(28,26,22,0.04)]">
      <p class="flex items-center gap-2 text-[13px] font-bold text-ink/80">
        <span class="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500 ring-4 ring-emerald-500/15"></span> In-house tracker
      </p>
      <p class="mt-2 text-2xl font-extrabold text-heading tabular-nums">{inHouse.eventsInRange.toLocaleString()}</p>
      <p class="text-[11px] text-ink/50">events received in this period</p>
      <dl class="mt-3 grid grid-cols-1 gap-1 border-t border-ink/[0.07] pt-3 text-[11px]">
        <div class="flex justify-between gap-2"><dt class="text-ink/50">Last event</dt><dd class="font-semibold text-ink/75" title={inHouse.lastEventAt ?? ''}>{ago(inHouse.lastEventAt)}</dd></div>
        <div class="flex justify-between gap-2"><dt class="text-ink/50">Dev events excluded</dt><dd class="font-semibold text-ink/75 tabular-nums">{inHouse.excludedDevEvents.toLocaleString()}</dd></div>
      </dl>
      <p class="mt-2 text-[10px] leading-4 text-ink/40">Production site only — test traffic (localhost, IP addresses, any :port address) is left out of every number here.</p>
    </div>

    <div class="rounded-2xl border border-ink/10 bg-surface p-4 shadow-[0_1px_2px_rgba(28,26,22,0.04)]">
      <div class="flex items-center justify-between gap-2">
        <p class="flex items-center gap-2 text-[13px] font-bold text-ink/80">
          <span class={`h-2.5 w-2.5 shrink-0 rounded-full ${ga4On ? 'bg-emerald-500 ring-4 ring-emerald-500/15' : 'bg-ink/20'}`}></span> Google Analytics 4
        </p>
        <a class="inline-flex items-center gap-0.5 text-[11px] font-bold text-forest hover:underline" href={GA4_URL} target="_blank" rel="noopener noreferrer">Open <ExternalLink size={11} /></a>
      </div>
      {#if !ga4On}
        <p class="mt-2 text-[12px] leading-5 text-ink/55">The site sends events to GA4 (G-6WXCHJW308) after cookie consent, but the CMS can't read them yet. Add <code class="text-[11px]">GA4_PROPERTY_ID</code>, <code class="text-[11px]">GOOGLE_CLIENT_EMAIL</code> and <code class="text-[11px]">GOOGLE_PRIVATE_KEY</code> on the backend.</p>
      {:else if !ga4Events}
        <p class="mt-2 flex items-start gap-1.5 text-[12px] leading-5 text-amber-700"><AlertTriangle size={13} class="mt-0.5 shrink-0" /> Connected, but the event counts couldn't be read for this period. Try again shortly.</p>
      {:else}
        <ul class="mt-2 grid grid-cols-1 gap-1.5 text-[11px]">
          {#each Object.keys(GA4_EVENT_NOTES) as name}
            <li class="flex items-center justify-between gap-2">
              <span class="min-w-0"><code class="font-semibold text-ink/75">{name}</code> <span class="hidden text-ink/40 sm:inline">· {GA4_EVENT_NOTES[name]}</span></span>
              <span class="shrink-0 font-bold text-ink/80 tabular-nums">{ga4Count(name).toLocaleString()}</span>
            </li>
          {/each}
        </ul>
      {/if}
    </div>

    <div class="rounded-2xl border border-ink/10 bg-surface p-4 shadow-[0_1px_2px_rgba(28,26,22,0.04)]">
      <div class="flex items-center justify-between gap-2">
        <p class="flex items-center gap-2 text-[13px] font-bold text-ink/80">
          <span class={`h-2.5 w-2.5 shrink-0 rounded-full ${clarityOn ? 'bg-emerald-500 ring-4 ring-emerald-500/15' : 'bg-ink/20'}`}></span> Microsoft Clarity
        </p>
        <a class="inline-flex items-center gap-0.5 text-[11px] font-bold text-forest hover:underline" href={clarityUrl} target="_blank" rel="noopener noreferrer">Open <ExternalLink size={11} /></a>
      </div>
      {#if clarityOn}
        <p class="mt-2 text-[12px] leading-5 text-ink/55">
          Recording consented visitors{projectId ? ' · project ' : ''}{#if projectId}<code class="text-[11px] font-semibold text-ink/70">{projectId}</code>{/if}. Lead sessions are tagged and kept, so every Plan My Trip, itinerary or WhatsApp lead has a recording to watch.
        </p>
      {:else}
        <p class="mt-2 text-[12px] leading-5 text-ink/55">Not connected. Set <code class="text-[11px]">PUBLIC_CLARITY_PROJECT_ID</code> on the site to start recording sessions.</p>
      {/if}
    </div>
  </div>

  <!-- reconciliation -->
  <div>
    <p class="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-ink/40"><Database size={13} /> Do the counts agree? · this period</p>
    <div class="overflow-hidden rounded-2xl border border-ink/10 bg-surface shadow-[0_1px_2px_rgba(28,26,22,0.04)]">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[540px] text-left text-[12px]">
          <thead class="whitespace-nowrap bg-sand/50 text-[10px] uppercase tracking-[0.08em] text-ink/50">
            <tr>
              <th class="px-4 py-2.5 font-bold" scope="col">Channel</th>
              <th class="px-3 py-2.5 text-right font-bold" scope="col" title="Saved enquiries">Database</th>
              <th class="px-3 py-2.5 text-right font-bold" scope="col" title="First-party lead events">In-house</th>
              <th class="px-3 py-2.5 text-right font-bold" scope="col" title="GA4 event count">GA4</th>
              <th class="px-4 py-2.5 font-bold" scope="col">In-house vs database</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-ink/[0.07]">
            {#each recon as r (r.channel)}
              {@const v = verdict(r)}
              <tr>
                <th class="px-4 py-2.5 text-left font-semibold text-ink/80" scope="row">{r.label}</th>
                <td class="px-3 py-2.5 text-right font-semibold text-ink/75 tabular-nums">{num(r.database)}</td>
                <td class="px-3 py-2.5 text-right font-semibold text-ink/75 tabular-nums">{r.inHouse.toLocaleString()}</td>
                <td class="px-3 py-2.5 text-right tabular-nums" title={r.ga4 == null ? (ga4On ? 'Register lead_source as a custom dimension to split leads by channel' : 'GA4 not connected') : ''}>
                  <span class={r.ga4 == null ? 'text-ink/30' : 'font-semibold text-ink/75'}>{num(r.ga4)}</span>
                </td>
                <td class="px-4 py-2.5">
                  <span class={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ${TONE[v.tone]}`}>
                    {#if v.tone === 'good'}<CheckCircle2 size={11} />{:else if v.tone === 'warn' || v.tone === 'bad'}<AlertTriangle size={11} />{:else}<Info size={11} />{/if}
                    {v.pct != null ? `${v.pct}% · ` : ''}{v.text}
                  </span>
                </td>
              </tr>
            {:else}
              <tr><td class="px-4 py-6 text-center text-ink/45" colspan="5">No counts for this period.</td></tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
    <div class="mt-2.5 grid grid-cols-1 gap-1.5 rounded-xl border border-ink/[0.07] bg-sand/20 px-4 py-3 text-[12px] leading-5 text-ink/60">
      <p><span class="font-bold text-ink/80">Database</span> is the truth for the two forms — every enquiry that was saved. WhatsApp has no saved row, so the in-house click count is its record.</p>
      <p><span class="font-bold text-ink/80">In-house</span> counts everyone except visitors who declined cookies, so it should sit close to the database. A big gap means a form's submit event isn't firing.</p>
      <p><span class="font-bold text-ink/80">GA4</span> only counts visitors who accepted cookies (and ad blockers hide some more), so GA4 being lower is expected — use it for trends and Google Ads, not for the exact count.</p>
    </div>
  </div>

  <!-- setup checklist -->
  <div>
    <p class="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-ink/40"><SlidersHorizontal size={13} /> Setup checklist · one-time, outside the CMS</p>
    <ol class="grid grid-cols-1 gap-2.5">
      <li class="flex gap-3 rounded-2xl border border-ink/10 bg-surface p-4">
        <span class="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#E37400]/10 text-[#E37400]"><Star size={14} /></span>
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <p class="text-[13px] font-bold text-ink/85">1 · Mark the lead events as key events in GA4</p>
            {#if recon.some((r) => r.channel !== 'whatsapp' && (r.ga4 ?? 0) > 0)}<span class="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700"><CheckCircle2 size={10} /> main-lead generate_lead arriving</span>{/if}
          </div>
          <p class="mt-0.5 text-[12px] leading-5 text-ink/60">GA4 → <span class="font-semibold">Admin → Events</span> → turn on <span class="font-semibold">Mark as key event</span> for <code class="text-[11px]">generate_lead</code> and <code class="text-[11px]">whatsapp_click</code>. An event only appears in that list after it has fired at least once.</p>
          <a class="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-forest hover:underline" href={GA4_URL} target="_blank" rel="noopener noreferrer">Open Google Analytics <ExternalLink size={11} /></a>
        </div>
      </li>
      <li class="flex gap-3 rounded-2xl border border-ink/10 bg-surface p-4">
        <span class="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#E37400]/10 text-[#E37400]"><BarChart3 size={14} /></span>
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <p class="text-[13px] font-bold text-ink/85">2 · Register the custom dimensions in GA4</p>
            {#if leadSourceSeen}<span class="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700"><CheckCircle2 size={10} /> lead_source detected</span>{/if}
          </div>
          <p class="mt-0.5 text-[12px] leading-5 text-ink/60">GA4 → <span class="font-semibold">Admin → Custom definitions → Create custom dimension</span>, scope <span class="font-semibold">Event</span>, one each for <code class="text-[11px]">lead_source</code>, <code class="text-[11px]">form_name</code>, <code class="text-[11px]">step_key</code> and <code class="text-[11px]">cta_location</code> (event parameter = the same name). They collect from the day they are created, not backwards — and <code class="text-[11px]">lead_source</code> is what lets the table above split GA4 leads by channel.</p>
          <a class="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-forest hover:underline" href={GA4_URL} target="_blank" rel="noopener noreferrer">Open Google Analytics <ExternalLink size={11} /></a>
        </div>
      </li>
      <li class="flex gap-3 rounded-2xl border border-ink/10 bg-surface p-4">
        <span class="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#0F6CBD]/10 text-[#0F6CBD]"><ScanEye size={14} /></span>
        <div class="min-w-0 flex-1">
          <p class="text-[13px] font-bold text-ink/85">3 · Find lead sessions in Clarity</p>
          <p class="mt-0.5 text-[12px] leading-5 text-ink/60">Clarity → <span class="font-semibold">Recordings → Filters</span>: under <span class="font-semibold">Custom tags</span> pick <code class="text-[11px]">lead_channel</code> or <code class="text-[11px]">form_name</code>; under <span class="font-semibold">Custom events</span> pick the ones starting <code class="text-[11px]">lead:</code> (<code class="text-[11px]">lead:plan_my_trip</code>, <code class="text-[11px]">lead:itinerary_form</code>, <code class="text-[11px]">lead:whatsapp</code>). Form steps show as events like <code class="text-[11px]">plan_my_trip:step_3_when</code>.</p>
          <a class="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-forest hover:underline" href={clarityUrl} target="_blank" rel="noopener noreferrer">Open Microsoft Clarity <ExternalLink size={11} /></a>
        </div>
      </li>
      <li class="flex gap-3 rounded-2xl border border-amber-300/60 bg-amber-50/30 p-4 dark:bg-amber-500/[0.05]">
        <span class="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#4285F4]/10 text-[#4285F4]"><Megaphone size={14} /></span>
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <p class="text-[13px] font-bold text-ink/85">4 · Count leads as Google Ads conversions</p>
            <span class="inline-flex items-center gap-1 rounded-full bg-amber-500/12 px-2 py-0.5 text-[10px] font-bold text-amber-700"><AlertTriangle size={10} /> Ads records no conversions today</span>
          </div>
          <p class="mt-0.5 text-[12px] leading-5 text-ink/60">The GTM container's Google Ads conversion only fires on URLs containing <code class="text-[11px]">thank-you</code>, and the site never has one — so no lead reaches Ads. Instead, link GA4 to Google Ads (GA4 → <span class="font-semibold">Admin → Product links → Google Ads links</span>), then in Google Ads → <span class="font-semibold">Goals → Conversions → New conversion action → Import → Google Analytics 4</span> import the <code class="text-[11px]">generate_lead</code> and <code class="text-[11px]">whatsapp_click</code> key events. Set the old thank-you conversion to secondary (or remove it) so it doesn't hide the real ones.</p>
          <div class="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
            <a class="inline-flex items-center gap-1 text-[11px] font-bold text-forest hover:underline" href={GA4_URL} target="_blank" rel="noopener noreferrer">Open Google Analytics <ExternalLink size={11} /></a>
            <a class="inline-flex items-center gap-1 text-[11px] font-bold text-forest hover:underline" href={ADS_URL} target="_blank" rel="noopener noreferrer">Open Google Ads <ExternalLink size={11} /></a>
          </div>
        </div>
      </li>
    </ol>
  </div>
</div>
