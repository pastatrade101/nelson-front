# Analytics (GA4 + first-party + Clarity)

This site runs **three complementary layers**:

1. **GA4** via `gtag.js`, loaded in `src/routes/+layout.svelte` (`loadGa4()`) — the
   primary business analytics (traffic, events, conversions).
2. **First-party** — every event is also `POST`ed to `/api/analytics/events`
   (own backend, fire-and-forget). This keeps working even when GA4 is blocked.
3. **Microsoft Clarity** (`src/lib/clarity.ts`) — **UX analytics only**: session
   recordings, heatmaps, rage/dead clicks, scroll behaviour. A companion to GA4,
   not a replacement.

GA4 and Clarity are installed **directly (no Google Tag Manager)**. Do not add
GTM unless the team wants tag management in the UI — it would duplicate this setup.

## Configuration

| Thing | Where | Notes |
|---|---|---|
| Measurement ID | `PUBLIC_GA4_MEASUREMENT_ID` env var (`.env`) | Blank = first-party only; GA4 stays off. |
| Consent gate | `src/lib/consent.ts` + `ConsentBanner.svelte` | GA4 loads **only** after `consent === 'granted'`. `denied` = nothing fires at all. |
| Dev/preview guard | `loadGa4()` `isProdHost()` | GA4 never loads on `localhost` / `*.local`, so dev/preview can't pollute the prod property. |
| Admin exclusion | `isAdmin` in the layout | `/admin/*` is never tracked. |
| PII protection | `SAFE_KEYS` whitelist in `analytics.ts` | Only whitelisted, non-personal keys are ever sent. |

## How to track things (use the helpers, not raw `gtag`)

```ts
import { trackEvent, trackPageView, trackCta, trackSearch } from '$lib/analytics';

trackEvent('tour_page_view', { tour_id, tour_title, destination, duration_days, price_from, currency });
trackCta({ cta_name: 'Book Now', cta_location: 'tour_detail', cta_type: 'button', tour_id });
trackSearch({ search_term, results_count, list_name: 'tours' }); // never per keystroke
```

- **Page views are automatic** — `afterNavigate → trackPageView()` in the layout
  fires one `page_view` per navigation (initial + every SPA route change +
  back/forward), deduped by path, with the query string stripped.
- To add a new safe parameter, add its key to `SAFE_KEYS`. Anything not on the
  list is silently dropped — that is the PII guard, keep it strict.

## Event catalogue

GA4 receives the **GA4-recommended name** where one exists (via `GA4_EVENT_MAP`);
the first-party layer keeps the site's own name for report continuity.

| First-party event | GA4 event | Trigger | Key params | Key event? | Status |
|---|---|---|---|---|---|
| `page_view` | `page_view` | Every navigation (auto) | `page_path`, `page_location`(no query), `page_title`, `page_referrer` | no | added (SPA) |
| `tour_page_view` | `view_item` | Tour detail loaded | `tour_id`, `tour_title`, `destination`, `duration_days`, `price_from`, `currency` | no | improved |
| `destination_page_view` | `view_item` | Destination detail loaded | `destination` | no | existing |
| `tour_list_view` | `view_item_list` | Tours listing shown (once) | `list_name`, `results_count` | no | added |
| `tour_card_click` | `select_item` | Tour card clicked | `tour_id`, `tour_title` | no | existing→mapped |
| `search` | `search` | Committed search w/ results | `search_term`(sanitised), `results_count`, `list_name` | no | added |
| `no_search_results` | `no_search_results` | Committed search, 0 results | `search_term`, `results_count: 0` | no | added |
| `tour_filter_used` | `filter_applied` | Filter/sort changed | `filter_name` / `metadata.filters` | no | existing→mapped |
| `plan_my_trip_submitted` | **`generate_lead`** | Backend confirms lead | `lead_type`, `transaction_id`(booking code), `destination`, `budget_range` | **YES** | improved |
| `begin_journey_submitted` | **`generate_lead`** | Backend confirms lead | `lead_type`, `transaction_id`, `budget_range` | **YES** | improved |
| `request_trip_submitted` | **`generate_lead`** | Backend confirms lead | `lead_type`, `transaction_id`, `tour_id` | **YES** | improved |
| `form_submit_error` | `form_submit_error` | Lead POST failed | `form_name`, `error_type` | no | added |
| `whatsapp_click` | `whatsapp_click` | WhatsApp link clicked | `cta_location`* | **YES** (micro) | existing |
| `phone_click` | `phone_click` | `tel:` clicked | `cta_location`* | **YES** (micro) | existing |
| `email_click` | `email_click` | `mailto:` clicked | `cta_location`* | **YES** (micro) | existing |
| `cta_click` | `cta_click` | `trackCta()` helper | `cta_name`, `cta_type`, `cta_location` | no | added (helper) |
| `plan_my_trip_opened` / `begin_journey_opened` / `request_trip_opened` | (same) | Form opened | — | no | existing |
| `ai_advisor_opened` / `ai_advisor_message_sent` | (same) | AI advisor use | — | no | existing |

\* `cta_location` is available on the helper; pass it when wiring new CTAs.

### Conversions / key events to mark in GA4 (Admin → Events → *Mark as key event*)

1. **`generate_lead`** — the primary conversion (all three lead forms, confirmed by the backend).
2. `whatsapp_click`, `phone_click`, `email_click` — outbound-lead micro-conversions.
3. (Optional) `form_submit_error` — monitor, do **not** mark as a key event.

Leads carry a `transaction_id` (booking code) for de-duplication, and fire only
**after the backend confirms the save** — not on button click — so a submit that
fails, or a refresh of the thank-you page, never counts as a lead.

## Lead funnel

`view_item_list` → `select_item` → `view_item` → `*_opened` → **`generate_lead`**,
with `whatsapp_click` / `phone_click` / `email_click` as parallel outbound leads.

## Testing

- **GA4 DebugView**: on the prod domain, accept cookies, then add `?debug_mode=1`
  (or use the GA Debugger extension). Watch `page_view` fire once per navigation,
  `generate_lead` on a real submit, `select_item` on a card click.
- **SPA nav**: click through Home → Tours → a tour → back. Exactly one `page_view` each.
- **Dedup**: refresh a thank-you page — no second `generate_lead`.
- **Consent**: decline → confirm **no** `/analytics/events` requests and no gtag hits.
- **Local**: GA4 does not load on `localhost` (by design) — verify with a `window.gtag` spy.

## Privacy rules (do not weaken)

- Never add names, emails, phones, WhatsApp numbers, messages, passport/booking
  personal data, payment info or tokens to any event. Only `SAFE_KEYS` are sent.
- URLs sent to analytics are **query-stripped** (`cleanLocation()`); search terms
  that look like an email/phone or exceed 64 chars are dropped.
- `denied` consent = zero tracking. GA4 waits for `granted`.

## Microsoft Clarity (UX analytics)

Clarity is the qualitative UX layer — **session recordings, heatmaps, rage
clicks, dead clicks, scroll behaviour**. It is a companion to GA4, never a
replacement. GA4 remains the primary business-analytics platform.

**Architecture** — `src/lib/clarity.ts` (`loadClarity(projectId)`, `clarityReady()`,
`clarityDashboardUrl()`), injected once from `+layout.svelte` using Clarity's
official async snippet (no npm dependency, mirrors how GA4 is loaded).

| Thing | Where | Notes |
|---|---|---|
| Project ID | `PUBLIC_CLARITY_PROJECT_ID` env var | Blank = Clarity off. |
| When it loads | `+layout.svelte`, same gate as GA4 | Only after `consent === 'granted'`, on a **production host**, public site (not `/admin`), env set. |
| Init once | `loaded` flag + `#clarity-src` DOM guard in `loadClarity()` | Never double-initialises. |
| SSR | never — `browser`-guarded | |
| SPA routes | handled by Clarity automatically | No per-navigation call, so **no page-view duplication** with GA4. |
| Dev/preview | excluded via `isProdHost()` (localhost / `*.local`) | Set the env only in prod (or a staging property). |

### Enable / disable
- **Enable:** set `PUBLIC_CLARITY_PROJECT_ID=<id>` in the production env and redeploy.
- **Disable:** clear the env var (or don't set it). Nothing else to change.
- **Staging:** use a *separate* Clarity project id on the staging host, or leave blank.

### Privacy
- Clarity **masks every form input value by default** — passwords, emails, phones,
  passport/payment fields are never captured as typed.
- Keep the Clarity **dashboard masking mode on “Mask” (default) or “Balanced.”** Do
  not switch to “Relaxed/Unmask.”
- The AI advisor conversation is force-masked in code with `data-clarity-mask="true"`.
  Add the same attribute to any new element that renders visitor PII.
- The whole `/admin` app is excluded from Clarity.
- Clarity loads only after cookie consent (`granted`).

### Verification
1. **Prod / consent:** on the live domain, accept cookies → in DevTools ▸ Network,
   confirm one request to `clarity.ms/tag/<id>` and `window.clarity` is defined.
2. **Once:** navigate around — only **one** `#clarity-src` script exists; no duplicate init.
3. **SPA routes:** in Clarity ▸ Recordings, a single session spans multiple pages.
4. **Recordings / heatmaps / rage & dead clicks / scroll:** appear in the Clarity
   dashboard within a few minutes of live traffic.
5. **No dev pollution:** on `localhost`, `window.clarity` is **undefined** (host-guarded).
6. **No consent:** decline cookies → Clarity never loads.
7. **No JS errors:** console is clean; a blocked `clarity.ms` request must not break the app.

### Troubleshooting
- *Clarity not loading in prod:* env var missing/typo, consent not granted, or an
  ad-blocker is blocking `clarity.ms` (expected for some users).
- *Nothing on localhost:* by design — `isProdHost()` blocks it. Test on the deployed host.
- *PII visible in a recording:* dashboard masking was relaxed, or a new PII element
  lacks `data-clarity-mask` — re-check both.
- *Admin “Connected” but no recordings:* “Connected” reflects the env var being set;
  recordings only accrue from **production** traffic after consent.

### Admin UX Insights
`/admin/analytics` shows a **UX Insights** card: connection status, what Clarity
captures, and an **“Open Microsoft Clarity”** launch button (`clarityDashboardUrl`).
It deliberately does **not** rebuild Clarity's recording/heatmap viewer. A dashed
“AI UX recommendations” panel is wired (empty `clarityUxInsights[]`) as the
foundation for future AI-generated UX call-outs — no AI summarisation is built yet.

## Not implemented (deliberate — add only if the feature/value warrants it)

Scroll-depth, video start/complete, gallery/FAQ/itinerary-expand engagement
events, and per-page `view_item_list` on destinations/accommodation/blog were
**scoped out** to avoid event noise and churn. Wire them with the existing
helpers when there's a clear reporting need. Error monitoring for exceptions
should use a dedicated tool (e.g. Sentry), not GA4.
