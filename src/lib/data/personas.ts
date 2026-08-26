// Traveler personas (SRS v2.0 type 8) — used to tailor the Tours page copy and the
// "concerns we plan around" list. Kept as static config (no schema change).
export type Persona = {
  label: string;
  headline: string;
  sub: string;
  concerns: string[];
};

// `honeymoon` was already the most-used tag in the catalogue (6 tours) and has
// its own travel style, but was missing from the vocabulary — so the Honeymoon
// style pointed at `couple` and the tag matched nothing.
export const PERSONA_ORDER = ['family', 'couple', 'honeymoon', 'group', 'solo'] as const;
export type PersonaKey = (typeof PERSONA_ORDER)[number];

export const PERSONAS: Record<string, Persona> = {
  family: {
    label: 'Families',
    headline: 'Family safaris in Tanzania',
    sub: 'Trips paced for children — shorter game drives, safe family lodges, and guides who love turning kids into young explorers.',
    concerns: ['Kid-friendly pace & lodges', 'Malaria-aware planning', 'Big Five without long drives', 'Family rooms & flexible meals']
  },
  couple: {
    label: 'Couples',
    headline: 'Romantic safaris & beach escapes',
    sub: 'Private moments, sundowners and barefoot beach time — safari by day, romance by night across Tanzania and Zanzibar.',
    concerns: ['Private, romantic camps', 'Safari + Zanzibar combos', 'Honeymoon touches', 'Quiet, scenic locations']
  },
  group: {
    label: 'Groups',
    headline: 'Group safaris for friends & celebrations',
    sub: 'Shared adventures with the logistics handled — one coordinated plan, fair group pricing, everyone looked after.',
    concerns: ['Group pricing & rooming', 'One coordinated itinerary', 'Mixed fitness levels', 'Celebration-ready']
  },
  honeymoon: {
    label: 'Honeymooners',
    headline: 'Honeymoon safaris & Zanzibar',
    sub: 'A safari that feels like a celebration — private camps, unhurried mornings and barefoot beach time to finish.',
    concerns: ['Privacy at camp', 'Safari paired with Zanzibar', 'Special-occasion touches', 'Unhurried, romantic pacing']
  },
  solo: {
    label: 'Solo travellers',
    headline: 'Solo-friendly Tanzania trips',
    sub: 'Travel solo with confidence — trusted guides, sociable scheduled departures, and honest safety advice every step.',
    concerns: ['Safety & trusted guides', 'Optional group departures', 'No single-supplement surprises', 'Flexible, independent pace']
  }
};

// Maps an experience slug (?experience=) to a tour category slug for filtering.
export const EXPERIENCE_TO_CATEGORY: Record<string, string> = {
  safari: 'safari',
  beach: 'beach-holiday',
  'beach-holiday': 'beach-holiday',
  zanzibar: 'beach-holiday',
  kilimanjaro: 'kilimanjaro',
  'kilimanjaro-trekking': 'kilimanjaro'
};
