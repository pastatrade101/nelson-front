import type { Tour } from './types';
export const STEPS = ['Trip type', 'Travellers', 'When', 'Length & pace', 'Preferences', 'Planning stage', 'Your summary'];
export const PARTIES = ['Solo traveller', 'Couple', 'Family', 'Friends / group', 'Honeymoon', 'Corporate / team', 'Not sure yet'];
export const LENGTHS = ['1–3 days', '4–6 days', '7–10 days', '11–14 days', '15+ days', 'Not sure yet'];
export const PACES = ['Relaxed', 'Balanced', 'See as much as possible', 'Help me decide'];
export const STAGES = ['Just exploring', 'Comparing options', 'Ready to plan', 'Ready to book once the details work'];
export const PRIORITIES = ['Wildlife', 'Family time', 'Photography', 'Local culture', 'Quiet places', 'Beach time', 'Celebrating something special'];
export const STAYS = ['Lodge / hotel', 'Tented camp', 'Beach resort', 'A mix of stays', 'Help me decide'];
export type PlannerCatalog = { tours: Tour[]; destinations: Array<{ name: string; slug: string }>; available: boolean };
export type Entry = { url: string; params: Record<string, string[]>; tour?: { id: string; slug: string; title: string }; lodge?: { slug: string; name: string } };
export type PlannerDraft = {
  experiences: string[]; destinations: string[]; party: string; adults: number; children: number; childAges: string[];
  dateMode: 'flexible' | 'exact' | 'unsure'; month: string; startDate: string; endDate: string; flexibility: string;
  duration: string; pace: string; comfort: string; accommodation: string; priorities: string[];
  budget: string; budgetUnsure: boolean; stage: string; notes: string; specialRequests: string;
  fullName: string; email: string; phone: string; country: string; preferredContact: string; contactConsent: boolean;
};
export const emptyDraft = (): PlannerDraft => ({ experiences: [], destinations: [], party: '', adults: 2, children: 0, childAges: [], dateMode: 'unsure', month: '', startDate: '', endDate: '', flexibility: 'Flexible by a few days', duration: '', pace: '', comfort: '', accommodation: '', priorities: [], budget: '', budgetUnsure: false, stage: '', notes: '', specialRequests: '', fullName: '', email: '', phone: '', country: '', preferredContact: 'Email', contactConsent: false });
export const localToday = () => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`; };
export const pretty = (v: string) => v.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
export const toggle = (items: string[], item: string) => items.includes(item) ? items.filter((s) => s !== item) : [...items.filter((s) => s !== 'Not sure yet'), item];
export const tourText = (t: Tour) => [t.title, t.experience_type, t.tour_categories?.name, t.tour_categories?.slug, t.destinations?.name, ...(t.persona_tags || [])].join(' ');
export function tripTypes(tours: Tour[]) {
  const text = tours.map(tourText).join(' ');
  return [
    { label: 'Safari', description: 'Wildlife, national parks and your own route.', match: /safari|wildlife/i },
    { label: 'Safari from Zanzibar', description: 'Start your safari from the islands.', match: /from zanzibar/i },
    { label: 'Safari & beach', description: 'Time in the bush, then time by the ocean.', match: /zanzibar|beach|island/i },
    { label: 'Kenya & Tanzania', description: 'A journey across two safari countries.', match: /kenya/i },
    { label: 'Kilimanjaro climb', description: 'A mountain journey, shaped around you.', match: /kilimanjaro|trekking/i },
    { label: 'Culture & community', description: 'Make room for people and local experiences.', match: /culture|cultural/i },
    { label: 'Not sure yet', description: 'Let an Emnel specialist help you choose.', match: /(?:)/ }
  ].filter((o) => o.match.test(text));
}
export const comfortOptions = (tours: Tour[]) => [...new Set(tours.map((t) => t.budget_tier).filter(Boolean).map((s) => pretty(String(s))))].concat('Help me decide');
/** Preserve referring parameters even when they no longer resolve in the catalogue. */
export function applyEntry(draft: PlannerDraft, entry: Entry, catalog: PlannerCatalog): PlannerDraft {
  const d = { ...draft, experiences: [...draft.experiences], destinations: [...draft.destinations] }; const p = entry.params;
  const first = (k: string) => p[k]?.[0] || '';
  const personas: Record<string, string> = { solo: 'Solo traveller', couple: 'Couple', family: 'Family', group: 'Friends / group', honeymoon: 'Honeymoon' };
  const experiences: Record<string, string> = { safari: 'Safari', beach: 'Safari & beach', 'beach-holiday': 'Safari & beach', kilimanjaro: 'Kilimanjaro climb', cultural: 'Culture & community', culture: 'Culture & community' };
  if (first('persona') && !d.party) d.party = personas[first('persona')] || pretty(first('persona'));
  if (d.party === 'Solo traveller' && !draft.party) d.adults = 1;
  for (const v of p.experience || []) { const label = experiences[v] || pretty(v); if (!d.experiences.includes(label)) d.experiences.push(label); }
  for (const v of p.destination || []) { const label = catalog.destinations.find((dest) => dest.slug === v)?.name || pretty(v); if (!d.destinations.includes(label)) d.destinations.push(label); }
  const when = first('month') || first('date') || first('when');
  if (when && !d.month && !d.startDate) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(when)) { d.startDate = when; d.dateMode = 'exact'; }
    else if (/^\d{4}-\d{2}$/.test(when)) { d.month = when; d.dateMode = 'flexible'; }
    else { const month = ['January','February','March','April','May','June','July','August','September','October','November','December'].findIndex((m) => m.toLowerCase() === when.toLowerCase()); if (month >= 0) { const now = new Date(); d.month = `${now.getFullYear() + (month < now.getMonth() ? 1 : 0)}-${String(month + 1).padStart(2, '0')}`; d.dateMode = 'flexible'; } }
  }
  const lengths: Record<string, string> = { short: '1–4 days', medium: '5–8 days', long: '9+ days' };
  if (!d.duration && first('length')) d.duration = lengths[first('length')] || first('length');
  if (!d.budget && /^\d+(\.\d+)?$/.test(first('budget'))) d.budget = first('budget');
  return d;
}
const validDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
export function validateStep(d: PlannerDraft, step: number): string[] {
  const e: string[] = [];
  if (step === 0 && !d.experiences.length) e.push('Choose a trip type, or select “Not sure yet”.');
  if (step === 1) {
    if (!d.party) e.push('Tell us who is travelling.');
    if (!Number.isInteger(d.adults) || d.adults < 1 || d.adults > 100) e.push('Enter 1–100 adults.');
    if (!Number.isInteger(d.children) || d.children < 0 || d.children > 50) e.push('Enter 0–50 children.');
    if (d.childAges.slice(0, d.children).some((a) => a !== '' && (!/^\d+$/.test(a) || Number(a) > 17))) e.push('Children’s ages must be 0–17, or leave them blank if unsure.');
  }
  if (step === 2) {
    if (d.dateMode === 'exact') { if (!validDate(d.startDate) || d.startDate < localToday()) e.push('Choose a valid start date today or later.'); if (!validDate(d.endDate) || d.endDate < d.startDate) e.push('Choose an end date on or after your start date.'); }
    if (d.dateMode === 'flexible' && (!/^\d{4}-(0[1-9]|1[0-2])$/.test(d.month) || d.month < localToday().slice(0, 7))) e.push('Choose this month or a later month, including the year.');
  }
  if (step === 3) { if (!d.duration) e.push('Choose a trip length, or select “Not sure yet”.'); if (!d.pace) e.push('Choose a pace, or ask us to help you decide.'); }
  if (step === 4) { if (!d.comfort) e.push('Choose a comfort level, or ask us to help you decide.'); if (!d.budgetUnsure && (!/^\d+(\.\d{1,2})?$/.test(d.budget) || Number(d.budget) <= 0 || Number(d.budget) > 1000000)) e.push('Enter a budget per person in USD, or select “Help me set a budget”.'); }
  if (step === 5 && !d.stage) e.push('Choose your planning stage.');
  if (step === 6) {
    if (d.fullName.trim().length < 2) e.push('Enter your full name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) e.push('Enter a valid email address.');
    if (!d.country.trim()) e.push('Select your country of residence.');
    if ((d.phone.trim() || d.preferredContact !== 'Email') && (!/^\+?[\d\s().-]{7,25}$/.test(d.phone.trim()) || d.phone.replace(/\D/g, '').length < 7)) e.push('Enter a phone number with country code for phone or WhatsApp contact.');
    if (!d.contactConsent) e.push('Please confirm that Emnel may contact you about this request.');
  }
  return e;
}
export const whenText = (d: PlannerDraft) => d.dateMode === 'exact' ? `${d.startDate || 'Start date'} → ${d.endDate || 'End date'}` : d.dateMode === 'flexible' && d.month ? new Date(`${d.month}-01T12:00:00`).toLocaleDateString('en', { month: 'long', year: 'numeric' }) : 'Dates to be decided';
export const briefRows = (d: PlannerDraft) => [
  ['Trip type', d.experiences.join(', ') || 'Let’s find your safari'], ['Destinations', d.destinations.join(', ') || 'Open to suggestions'],
  ['Travellers', `${d.adults} adults · ${d.children} children${d.party ? ` · ${d.party}` : ''}`],
  ...(d.children > 0 && d.children <= 50 ? [['Children’s ages at travel', Array.from({ length: Math.floor(d.children) }, (_, i) => d.childAges[i] === '' || d.childAges[i] == null ? 'Not sure' : d.childAges[i]).join(', ')]] : []),
  ['When', whenText(d)], ['Date flexibility', d.flexibility], ['Length', d.duration || 'To be decided'], ['Pace', d.pace || 'To be decided'], ['Comfort', d.comfort || 'To be decided'],
  ['Stay style', d.accommodation || 'Open to suggestions'], ['Priorities', d.priorities.join(', ') || 'Open to suggestions'],
  ['Budget per person', d.budgetUnsure ? 'Help me set a budget' : d.budget ? `US$${Number(d.budget).toLocaleString('en-US')} for the trip, excluding international flights` : 'To be decided'], ['Planning stage', d.stage || 'To be decided']
];
export function recommendations(d: PlannerDraft, tours: Tour[], selectedTourId = '') {
  return tours.filter((t) => {
    if (!d.budgetUnsure && Number(d.budget) > 0 && (!t.currency || t.currency === 'USD') && Number(t.price_from) > Number(d.budget)) return false;
    if (Number(t.minimum_age) > 0 && d.childAges.slice(0, d.children).some((age) => age !== '' && Number(age) < Number(t.minimum_age))) return false;
    return true;
  }).map((tour) => { let score = 0; const reasons: string[] = []; const text = tourText(tour).toLowerCase();
    if (tour.id === selectedTourId) { score += 8; reasons.push('Your starting point'); }
    if (d.party === 'Family' && /family/.test(text)) { score += 4; reasons.push('Family-focused'); }
    if (d.party === 'Honeymoon' && /honeymoon/.test(text)) { score += 4; reasons.push('Honeymoon-focused'); }
    if (d.destinations.some((dest) => text.includes(dest.toLowerCase()))) { score += 3; reasons.push('Your destination'); }
    if (d.experiences.includes('Safari & beach') && /beach|zanzibar/.test(text)) { score += 3; reasons.push('Bush & beach'); }
    if (d.experiences.includes('Kenya & Tanzania') && /kenya/.test(text)) { score += 3; reasons.push('Includes Kenya'); }
    if (d.experiences.includes('Safari from Zanzibar') && /from zanzibar/.test(text)) { score += 3; reasons.push('Starts from Zanzibar'); }
    if (d.comfort && pretty(tour.budget_tier || '') === d.comfort) { score += 2; reasons.push('Your comfort level'); }
    const range = d.duration.match(/^(\d+)–(\d+)/);
    if ((range && Number(tour.duration_days) >= +range[1] && Number(tour.duration_days) <= +range[2]) || (d.duration === '15+ days' && Number(tour.duration_days) >= 15)) { score += 5; reasons.push('Your trip length'); }
    return { tour, score, reason: reasons.slice(0, 2).join(' · ') };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 2);
}
export function submission(d: PlannerDraft, entries: Entry[], savedTrips: unknown[], key: string, selectedCurrency: string, url: string, honeypot: string) {
  const latestTour = [...entries].reverse().find((e) => e.tour)?.tour;
  return {
    tour_id: latestTour?.id || null, full_name: d.fullName.trim(), email: d.email.trim(), phone: d.phone.trim() || null, country: d.country,
    travel_date: d.dateMode === 'exact' ? d.startDate : null, number_of_adults: d.adults, number_of_children: d.children, special_requests: d.specialRequests.trim(), message: d.notes.trim(),
    source: 'plan_my_trip', currency: 'USD', selected_currency: selectedCurrency, idempotency_key: key, hp_company: honeypot,
    lead_context: {
      v: 2, form_type: 'emnel_trip_planner', lead_source: 'Website Plan My Trip', source_page_url: url, selected_trip: latestTour?.title || '',
      destination_interest: d.destinations.join(', '), travel_interests: d.experiences.join(', '), travel_month: whenText(d),
      exact_start_date: d.dateMode === 'exact' ? d.startDate : null, exact_end_date: d.dateMode === 'exact' ? d.endDate : null, date_flexibility: d.flexibility,
      traveller_type: d.party, children_ages: Array.from({ length: d.children }, (_, i) => d.childAges[i] === '' || d.childAges[i] == null ? null : Number(d.childAges[i])),
      trip_duration: d.duration, travel_pace: d.pace, comfort_level: d.comfort, accommodation_preference: d.accommodation, travel_priorities: d.priorities,
      budget_per_person: d.budgetUnsure ? 'Help me set a budget' : `USD ${d.budget}`, budget_basis: 'Per person for the whole trip, excluding international flights', planning_stage: d.stage,
      preferred_contact: d.preferredContact, contact_consent: d.contactConsent, consent_scope: 'Contact about this trip request only; not marketing',
      entry_points: entries, saved_trips: savedTrips, answers: JSON.parse(JSON.stringify(d)), submitted_at: new Date().toISOString()
    }
  };
}
export function readDraft(raw: string | null): { draft: PlannerDraft; entries: Entry[]; savedTrips: unknown[]; step: number; key: string; pending: ReturnType<typeof submission> | null } | null {
  try { const p = JSON.parse(raw || 'null'); if (!p || p.v !== 2 || (!p.pending && Date.now() - p.at > 86400000)) return null;
    if (!p.draft || Object.entries(emptyDraft()).some(([k, v]) => Array.isArray(v) ? !Array.isArray(p.draft[k]) || !p.draft[k].every((x: unknown) => typeof x === 'string') : typeof p.draft[k] !== typeof v)) return null;
    if (!Array.isArray(p.entries) || !Array.isArray(p.savedTrips) || typeof p.key !== 'string') return null;
    return { ...p, step: Math.max(0, Math.min(6, Number(p.step) || 0)) };
  } catch { return null; }
}
