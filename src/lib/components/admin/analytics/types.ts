// Response of GET /api/analytics/main-leads — the three channels the business
// treats as its MAIN LEADS (Plan My Trip planner, the itinerary form on tour
// pages, WhatsApp). Mirrors the backend contract field for field; every read
// on the server is fail-silent, so arrays may be empty and nullable fields null.
// When a read behind the report failed the server sends its empty shape with
// `ok: false`: every figure in it is then unknown, not zero.

export type LeadChannelKey = 'plan_my_trip' | 'itinerary_form' | 'whatsapp';

export type Tally = Array<{ label: string; value: number }>;

export type MainLeadsChannel = {
  key: LeadChannelKey;
  label: string; // 'Plan My Trip' | 'Itinerary form' | 'WhatsApp'
  leads: number; // bookings for the forms, whatsapp_click events for WhatsApp
  uniqueVisitors: number; // distinct sessions behind those leads
  previous: number; // same metric, previous period of equal length
  changePct: number | null; // null when the previous figure is 0 or too small for a % (the card then shows "vs N")
  trackedEvents: number; // in-house lead events received
  opened: number | null; // distinct sessions that opened the form (null for WhatsApp)
  conversionRate: number | null; // leads / opened, %, one decimal
  byDay: Array<{ date: string; value: number }>; // every day in range, zeros filled
};

export type PlannerStep = {
  index: number;
  key: string; // trip_type, travellers, when, length_pace, preferences, planning_stage, summary
  label: string;
  reached: number;
  completed: number;
  dropOffPct: number;
};

export type MainLeadsPlanner = {
  /** The site reported the planner step by step in this range (not only opened and sent). */
  stepsTracked?: boolean;
  steps: PlannerStep[];
  validationErrors: Tally; // "<Step label> · <field>"
  abandonedAt: Tally;
  submitErrors: number;
  byTripType: Tally;
  byStage: Tally;
  byComfort: Tally;
  byBudget: Tally;
};

export type ItineraryFunnelKey = 'opened' | 'started' | 'details' | 'submitted';

export type MainLeadsItinerary = {
  /** The site reported the form step by step; without it the funnel is Form seen → Request sent. */
  stepsTracked?: boolean;
  funnel: Array<{ key: ItineraryFunnelKey; label: string; value: number }>;
  topTours: Tally;
  submitErrors: number;
};

export type MainLeadsWhatsApp = {
  byLocation: Tally;
  byPage: Tally;
  byTour: Tally;
  byDevice: Tally;
};

export type LeadSourceRow = { label: string; planner: number; itinerary: number; whatsapp: number; total: number };

export type ReconciliationRow = {
  channel: LeadChannelKey;
  label: string;
  database: number | null; // booking rows (null for WhatsApp — there is no row to count)
  inHouse: number; // = trackedEvents
  ga4: number | null; // null until GA4 is connected / lead_source is registered
};

export type MainLeadsTracking = {
  ga4: { configured: boolean; events: Array<{ name: string; count: number }> | null };
  clarity: { configured: boolean; projectId: string | null };
  inHouse: { eventsInRange: number; lastEventAt: string | null; excludedDevEvents: number };
  reconciliation: ReconciliationRow[];
};

export type MainLeadsData = {
  ok: boolean; // false: a read failed and this is the empty shape, so the section shows its retry state
  range:{ from: string; to: string; days: number };
  channels: MainLeadsChannel[];
  planner: MainLeadsPlanner;
  itinerary: MainLeadsItinerary;
  whatsapp: MainLeadsWhatsApp;
  sources: LeadSourceRow[];
  /** false: no referrer/UTM recorded for any lead in range ("Direct / unknown" is a recording gap). */
  sourcesTracked?: boolean;
  tracking: MainLeadsTracking;
};

// Channel styling shared by the cards, tabs and tables — one accent per
// channel, so the same colour always means the same lead source.
export const CHANNEL_ACCENT: Record<LeadChannelKey, string> = {
  plan_my_trip: '#153733',
  itinerary_form: '#4A3728',
  whatsapp: '#128C7E'
};

// "page_content" → "Page content", "ready_to_book" → "Ready to book". Only
// snake_case slugs are rewritten — human labels ("$3,000–$5,000", "Mid-range",
// page paths) pass through untouched.
export const prettyLabel = (raw: string): string => {
  const s = String(raw ?? '').trim();
  if (!s) return 'Unknown';
  if (!/^[a-z0-9_]+$/.test(s)) return s;
  const words = s.replace(/_+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

// Tally rows with prettified labels; equal labels after tidying are merged.
export const prettyRows = (rows: Tally | undefined): Tally => {
  const merged = new Map<string, number>();
  for (const r of rows ?? []) {
    const label = prettyLabel(r.label);
    merged.set(label, (merged.get(label) ?? 0) + (Number(r.value) || 0));
  }
  return [...merged.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
};

// "2026-09-04T10:15:00Z" → "4 Sep". Dates in the contract are UTC days.
export const shortDate = (iso: string): string => {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
};
