<script lang="ts">
  import { Compass } from '@lucide/svelte';
  import AnalyticsEmpty from '../AnalyticsEmpty.svelte';
  import { CHANNEL_ACCENT, type LeadSourceRow } from './types';

  // First-touch source per lead, split by channel. Bookings use the
  // attribution saved with the enquiry (UTM, referrer, gclid); WhatsApp clicks
  // use the visitor's session. The table scrolls inside its own box on phones.
  export let sources: LeadSourceRow[] = [];
  /** false: nothing in range recorded a referrer/UTM, so "Direct / unknown" is a recording gap. */
  export let sourcesTracked: boolean | undefined = undefined;

  $: rows = (sources ?? []).filter((r) => r.total > 0);
  $: max = Math.max(1, ...rows.map((r) => r.total));
  $: totals = rows.reduce(
    (a, r) => ({ planner: a.planner + r.planner, itinerary: a.itinerary + r.itinerary, whatsapp: a.whatsapp + r.whatsapp, total: a.total + r.total }),
    { planner: 0, itinerary: 0, whatsapp: 0, total: 0 }
  );

  const COLS = [
    { key: 'planner', label: 'Plan My Trip', accent: CHANNEL_ACCENT.plan_my_trip },
    { key: 'itinerary', label: 'Itinerary form', accent: CHANNEL_ACCENT.itinerary_form },
    { key: 'whatsapp', label: 'WhatsApp', accent: CHANNEL_ACCENT.whatsapp }
  ] as const;
</script>

{#if rows.length}
  <div class="overflow-hidden rounded-2xl border border-ink/10 bg-surface shadow-[0_1px_2px_rgba(28,26,22,0.04)]">
    <div class="overflow-x-auto">
      <table class="w-full min-w-[600px] text-left text-[12px]">
        <thead class="bg-sand/50 text-[10px] uppercase tracking-[0.08em] text-ink/50">
          <tr>
            <th class="whitespace-nowrap px-4 py-2.5 font-bold" scope="col">First-touch source</th>
            {#each COLS as c}
              <th class="whitespace-nowrap px-3 py-2.5 text-right font-bold" scope="col">
                <span class="inline-flex items-center gap-1.5"><span class="h-2 w-2 rounded-full" style={`background:${c.accent}`}></span>{c.label}</span>
              </th>
            {/each}
            <th class="px-4 py-2.5 text-right font-bold" scope="col">Total</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-ink/[0.07]">
          {#each rows as r (r.label)}
            <tr class="transition hover:bg-sand/25">
              <th class="px-4 py-2.5 text-left font-semibold text-ink/80" scope="row">
                <span class="block max-w-[220px] truncate" title={r.label}>{r.label}</span>
                <span class="mt-1 block h-1 overflow-hidden rounded-full bg-ink/[0.06]" aria-hidden="true">
                  <span class="block h-full rounded-full bg-gradient-to-r from-forest to-emnel-gold" style={`width:${Math.max(4, (r.total / max) * 100)}%`}></span>
                </span>
              </th>
              {#each COLS as c}
                <td class={`px-3 py-2.5 text-right tabular-nums ${r[c.key] ? 'font-semibold text-ink/75' : 'text-ink/30'}`}>{r[c.key] ? r[c.key].toLocaleString() : '–'}</td>
              {/each}
              <td class="px-4 py-2.5 text-right font-extrabold text-heading tabular-nums">{r.total.toLocaleString()}</td>
            </tr>
          {/each}
        </tbody>
        <tfoot class="border-t border-ink/10 bg-sand/25 text-ink/60">
          <tr>
            <th class="px-4 py-2.5 text-left text-[11px] font-bold" scope="row">Shown sources</th>
            {#each COLS as c}<td class="px-3 py-2.5 text-right font-bold tabular-nums">{totals[c.key].toLocaleString()}</td>{/each}
            <td class="px-4 py-2.5 text-right font-extrabold text-ink/80 tabular-nums">{totals.total.toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
  {#if sourcesTracked === false}
    <p class="mt-2 text-[11px] leading-5 text-ink/55">
      <span class="font-semibold text-ink/75">Sources aren't recorded yet.</span> The site's own tracker and enquiry forms don't store the referring site or campaign tags, so every lead reads “Direct / unknown” here — that is a gap in what is recorded, not proof that people came directly. GA4 does see traffic sources: check Acquisition there.
    </p>
  {:else}
    <p class="mt-2 text-[11px] leading-5 text-ink/45">
      Google Ads = the enquiry carried a gclid; UTM sources show as <span class="font-semibold">source / medium</span>; otherwise the referring site decides (Google organic, other search, social, TripAdvisor). “Direct / unknown” = no referrer or campaign tag — typed URLs, apps and private browsers.
    </p>
  {/if}
{:else}
  <AnalyticsEmpty icon={Compass} title="No lead sources yet" minHeight={200}
    description="Once enquiries and WhatsApp clicks come in, this shows which campaign, search engine or website first brought each lead." />
{/if}
