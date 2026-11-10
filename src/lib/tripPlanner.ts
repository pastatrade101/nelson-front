import type { Tour } from './types';
// The quote request at /plan-my-trip: four short steps (the founder's brief, Nov 2026).
export const STEPS = ['Trip details', 'Travellers', 'Budget', 'Contact details'];
export const SAFARI_TYPES = [
  { label: 'Tanzania Safari only', description: 'Wildlife and national parks across Tanzania.' },
  { label: 'Tanzania Safari with Zanzibar', description: 'Safari first, then time on Zanzibar’s beaches.' },
  { label: 'Tanzania & Kenya', description: 'One safari across both countries.' },
  { label: 'Tanzania, Kenya & Zanzibar', description: 'Both safari countries, then Zanzibar’s beaches.' }
];
/** Indicative prices per person sharing, per night, as the team quotes them. */
export const BUDGETS = [
  { key: 'classic', label: 'Classic', stays: 'classic lodges, hotels and tented camps', price: 'US$300 – 450' },
  { key: 'mid_luxury', label: 'Mid-luxury', stays: 'mid-luxury lodges, hotels and tented camps', price: 'US$500 – 600' },
  { key: 'luxury', label: 'Luxury', stays: 'luxury lodges, hotels and tented camps', price: 'US$650 – 750' },
  { key: 'ultra_luxury', label: 'Ultra-luxury', stays: 'ultra-luxury lodges, hotels and tented camps', price: 'US$800+' }
];
export const CUSTOM_BUDGET = 'custom';
export const MAX_DAYS = 60;
export type PlannerCatalog = { tours: Tour[]; destinations: Array<{ name: string; slug: string }>; available: boolean };
export type Entry = { url: string; params: Record<string, string[]>; tour?: { id: string; slug: string; title: string }; lodge?: { slug: string; name: string } };
export type PlannerDraft = {
  safariType: string; days: string; startDate: string; month: string; adults: number; children: number;
  budgetTier: string; budget: string; fullName: string; email: string; phone: string; notes: string;
};
export const emptyDraft = (): PlannerDraft => ({ safariType: '', days: '', startDate: '', month: '', adults: 2, children: 0, budgetTier: '', budget: '', fullName: '', email: '', phone: '', notes: '' });
export const localToday = () => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`; };
export const pretty = (v: string) => v.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
export const tourText = (t: Tour) => [t.title, t.experience_type, t.tour_categories?.name, t.tour_categories?.slug, t.destinations?.name, ...(t.persona_tags || [])].join(' ');
/** The safari type a tour (or a trip-finder answer) points to. */
export const typeFor = (text: string) => {
  const kenya = /kenya|maasai mara|masai mara|amboseli/i.test(text), zanzibar = /zanzibar|beach|island/i.test(text);
  return kenya && zanzibar ? SAFARI_TYPES[3].label : kenya ? SAFARI_TYPES[2].label : zanzibar ? SAFARI_TYPES[1].label : SAFARI_TYPES[0].label;
};
/** Prefill from where the traveller came from; anything unmapped still travels in entry_points. */
export function applyEntry(draft: PlannerDraft, entry: Entry, catalog: PlannerCatalog): PlannerDraft {
  const d = { ...draft }; const p = entry.params;
  const first = (k: string) => p[k]?.[0] || '';
  const tour = entry.tour ? catalog.tours.find((t) => t.id === entry.tour?.id) : undefined;
  if (!d.safariType) {
    const hints = [...(p.experience || []), ...(p.destination || [])].join(' ');
    if (tour) d.safariType = typeFor(tourText(tour));
    else if (hints) d.safariType = typeFor(hints);
  }
  if (!d.days) {
    const days = Number(tour?.duration_days) || Number(first('days'));
    if (Number.isInteger(days) && days >= 1 && days <= MAX_DAYS) d.days = String(days);
  }
  if (first('persona') === 'solo' && draft.adults === emptyDraft().adults) d.adults = 1;
  const when = first('month') || first('date') || first('when');
  if (when && !d.month && !d.startDate) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(when) && when >= localToday()) d.startDate = when;
    else if (/^\d{4}-\d{2}$/.test(when)) d.month = when;
    else { const month = ['January','February','March','April','May','June','July','August','September','October','November','December'].findIndex((m) => m.toLowerCase() === when.toLowerCase()); if (month >= 0) { const now = new Date(); d.month = `${now.getFullYear() + (month < now.getMonth() ? 1 : 0)}-${String(month + 1).padStart(2, '0')}`; } }
  }
  if (!d.budgetTier && /^\d+(\.\d+)?$/.test(first('budget')) && Number(first('budget')) > 0) { d.budgetTier = CUSTOM_BUDGET; d.budget = first('budget'); }
  return d;
}
const validDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
const validBudget = (v: string) => /^\d+(\.\d{1,2})?$/.test(v) && Number(v) > 0 && Number(v) <= 1000000;
export function validateStep(d: PlannerDraft, step: number): string[] {
  const e: string[] = [];
  if (step === 0 && !SAFARI_TYPES.some((t) => t.label === d.safariType)) e.push('Choose the kind of safari you would like.');
  if (step === 1) {
    if (!/^\d+$/.test(d.days) || Number(d.days) < 1 || Number(d.days) > MAX_DAYS) e.push(`Enter how many days you would like to spend (1–${MAX_DAYS}).`);
    if (d.startDate && (!validDate(d.startDate) || d.startDate < localToday())) e.push('Choose a start date today or later, or leave it blank.');
    if (!Number.isInteger(d.adults) || d.adults < 1 || d.adults > 100) e.push('Enter 1–100 adults.');
    if (!Number.isInteger(d.children) || d.children < 0 || d.children > 50) e.push('Enter 0–50 children.');
  }
  if (step === 2) {
    if (d.budgetTier !== CUSTOM_BUDGET && !BUDGETS.some((b) => b.key === d.budgetTier)) e.push('Choose a budget and accommodation level.');
    if (d.budgetTier === CUSTOM_BUDGET && !validBudget(d.budget)) e.push('Enter your budget per person in US dollars.');
  }
  if (step === 3) {
    if (d.fullName.trim().length < 2) e.push('Enter your full name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) e.push('Enter a valid email address.');
    if (d.phone.trim() && (!/^\+?[\d\s().-]{7,25}$/.test(d.phone.trim()) || d.phone.replace(/\D/g, '').length < 7)) e.push('Enter your WhatsApp number with its country code, or leave it blank.');
  }
  return e;
}
export const whenText = (d: PlannerDraft) => d.startDate && validDate(d.startDate) ? new Date(`${d.startDate}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : d.month ? `Around ${new Date(`${d.month}-01T12:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}` : 'Not sure yet';
export const budgetText = (d: PlannerDraft) => {
  if (d.budgetTier === CUSTOM_BUDGET) return validBudget(d.budget) ? `US$${Number(d.budget).toLocaleString('en-US')} per person for the whole trip` : 'Own budget for the whole trip';
  const tier = BUDGETS.find((b) => b.key === d.budgetTier);
  return tier ? `${tier.label}: ${tier.price} per person sharing, per night` : 'To be decided';
};
export const briefRows = (d: PlannerDraft) => [
  ['Safari', d.safariType || 'To be decided'],
  ['Days', d.days ? `${d.days} day${d.days === '1' ? '' : 's'}` : 'To be decided'],
  ['Preferred start', whenText(d)],
  ['Travellers', `${d.adults} adult${d.adults === 1 ? '' : 's'} · ${d.children} child${d.children === 1 ? '' : 'ren'}`],
  ['Budget', budgetText(d)]
];
export function recommendations(d: PlannerDraft, tours: Tour[], selectedTourId = '') {
  const days = Number(d.days);
  return tours.filter((t) => !(d.budgetTier === CUSTOM_BUDGET && validBudget(d.budget) && (!t.currency || t.currency === 'USD') && Number(t.price_from) > Number(d.budget)))
    .map((tour) => { let score = 0; const reasons: string[] = []; const text = tourText(tour);
      if (tour.id === selectedTourId) { score += 8; reasons.push('Your starting point'); }
      if (d.safariType && typeFor(text) === d.safariType) { score += 4; reasons.push('Your kind of safari'); }
      const gap = Math.abs(Number(tour.duration_days) - days);
      if (days > 0 && gap <= 1) { score += 5; reasons.push('Your trip length'); } else if (days > 0 && gap <= 2) score += 2;
      return { tour, score, reason: reasons.slice(0, 2).join(' · ') };
    }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 2);
}
export function submission(d: PlannerDraft, entries: Entry[], savedTrips: unknown[], key: string, selectedCurrency: string, url: string, honeypot: string) {
  const latestTour = [...entries].reverse().find((e) => e.tour)?.tour;
  const tier = BUDGETS.find((b) => b.key === d.budgetTier);
  const custom = d.budgetTier === CUSTOM_BUDGET;
  return {
    tour_id: latestTour?.id || null, full_name: d.fullName.trim(), email: d.email.trim(), phone: d.phone.trim() || null, country: null,
    travel_date: d.startDate || null, number_of_adults: d.adults, number_of_children: d.children, special_requests: '', message: d.notes.trim(),
    source: 'plan_my_trip', currency: 'USD', selected_currency: selectedCurrency, idempotency_key: key, hp_company: honeypot,
    lead_context: {
      v: 3, form_type: 'emnel_safari_quote', lead_source: 'Website Plan My Trip', source_page_url: url, selected_trip: latestTour?.title || '',
      destination_interest: d.safariType, travel_interests: d.safariType, trip_duration: `${d.days} days`,
      travel_month: whenText(d), exact_start_date: d.startDate || null,
      accommodation_preference: custom ? 'Team to suggest within the budget' : tier ? `${tier.label}: ${tier.stays}` : '',
      budget_per_person: custom ? `US$${Number(d.budget).toLocaleString('en-US')} per person for the whole trip` : tier ? `${tier.price} per person sharing, per night` : '',
      budget_basis: custom ? 'Per person for the whole trip' : 'Per person sharing, per night',
      whatsapp: d.phone.trim(), preferred_contact: d.phone.trim() ? 'WhatsApp or email' : 'Email',
      consent_scope: 'Contact about this quote request only; not marketing',
      entry_points: entries, saved_trips: savedTrips, answers: JSON.parse(JSON.stringify(d)), submitted_at: new Date().toISOString()
    }
  };
}
export function readDraft(raw: string | null): { draft: PlannerDraft; entries: Entry[]; savedTrips: unknown[]; step: number; key: string; pending: ReturnType<typeof submission> | null } | null {
  try { const p = JSON.parse(raw || 'null'); if (!p || p.v !== 3 || (!p.pending && Date.now() - p.at > 86400000)) return null;
    if (!p.draft || Object.entries(emptyDraft()).some(([k, v]) => typeof p.draft[k] !== typeof v)) return null;
    if (!Array.isArray(p.entries) || !Array.isArray(p.savedTrips) || typeof p.key !== 'string') return null;
    return { ...p, step: Math.max(0, Math.min(STEPS.length - 1, Number(p.step) || 0)) };
  } catch { return null; }
}
