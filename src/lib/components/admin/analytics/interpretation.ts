// `interpretation` field of GET /api/analytics/website-intelligence — the
// built-in reading of the period. Every finding comes from a fixed rule run
// over the site's own figures (lead records, the in-house tracker, GA4,
// Clarity) on the server; nothing is generated. The server already skips a
// rule when its data is missing or too thin, so an empty `findings` list means
// "nothing worth saying yet" — unless the reading says it could not be made
// (`ok: false`, see readingFailed), when the panel shows its retry state.

export type InterpretationKind = 'win' | 'watch' | 'problem' | 'opportunity';

export type InterpretationArea =
  | 'leads'
  | 'planner'
  | 'itinerary'
  | 'whatsapp'
  | 'sources'
  | 'follow_up'
  | 'demand'
  | 'traffic'
  | 'tracking';

export type InterpretationFinding = {
  id: string; // stable rule id
  kind: InterpretationKind;
  area: InterpretationArea;
  title: string; // plain words with the number in it
  evidence: string; // the figures behind it
  action: string | null; // a concrete next step, or null when nothing to do
  source: 'website' | 'ga4' | 'clarity'; // SourceBadge key ('website' renders "In-house")
  confidence: 'solid' | 'early'; // 'early' when the base count is under 20
  anchor: string | null; // in-page anchor to the detail, e.g. '#sec-main-leads'
};

export type Interpretation = {
  // false when a read behind the reading failed: nothing in it is known, and
  // its zero lead count is a placeholder, not a count.
  ok?: boolean;
  headline: string | null; // one sentence for the period; null when there is no data at all
  findings: InterpretationFinding[]; // sorted problem, watch, opportunity, win; max 8
  // `visitors` is the in-house real-visitor count (the Visitors card: sessions
  // with a page view, automated networks left out); `visitorsSource` names it.
  // `leads` is null (or `ok` false) when the main leads could not be read.
  basis: {
    ok?: boolean;
    from: string;
    to: string;
    days: number;
    leads: number | null;
    visitors: number | null;
    visitorsSource?: 'website' | 'ga4' | null;
  };
};

/** True when the server could not read the period, so the reading must not be shown as "nothing to say". */
export const readingFailed = (i: Interpretation | null | undefined): boolean =>
  Boolean(i) && (i!.ok === false || i!.basis?.ok === false || i!.basis?.leads == null);

// Reading order — what needs fixing first, what is going well last.
export const KIND_ORDER: InterpretationKind[] = ['problem', 'watch', 'opportunity', 'win'];

// Owner-facing names for the part of the business a finding is about.
export const AREA_LABEL: Record<InterpretationArea, string> = {
  leads: 'Main leads',
  planner: 'Plan My Trip',
  itinerary: 'Itinerary form',
  whatsapp: 'WhatsApp',
  sources: 'Lead sources',
  follow_up: 'Follow-up',
  demand: 'Demand',
  traffic: 'Visitors',
  tracking: 'Tracking'
};
