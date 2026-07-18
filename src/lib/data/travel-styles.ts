// Travel styles (SRS v2.0 type 6) — persona-led landing pages, shipped as static
// config (no schema/backend change). `persona` links results to the tailored
// /tours?persona= view where it maps; otherwise the CTA goes to Plan My Safari.
export type TravelStyle = {
  slug: string;
  name: string;
  emotionalPromise: string;
  description: string;
  desires: string[];
  concerns: string[];
  persona?: string;
};

export const TRAVEL_STYLES: TravelStyle[] = [
  {
    slug: 'honeymoon',
    name: 'Honeymoon',
    emotionalPromise: 'The most romantic start to forever',
    description: 'Private moments, sundowners and barefoot beach time — a safari by day and romance by night, planned so you never think about logistics.',
    desires: ['Private, intimate camps', 'Safari + Zanzibar combinations', 'Special-occasion touches', 'Effortless, handled planning'],
    concerns: ['Will it feel romantic, not rushed?', 'Best beach to pair with safari', 'Privacy at lodges'],
    persona: 'couple'
  },
  {
    slug: 'family-travel',
    name: 'Family Travel',
    emotionalPromise: 'The trip your kids will never forget',
    description: 'Safaris paced for children — shorter drives, safe family lodges, and guides who turn young travellers into wide-eyed explorers.',
    desires: ['Kid-friendly pace & rooms', 'Big Five without long drives', 'Flexible meals & downtime', 'Educational, hands-on moments'],
    concerns: ['Is it safe for children?', 'Malaria and health', 'Will younger kids cope?'],
    persona: 'family'
  },
  {
    slug: 'luxury-travel',
    name: 'Luxury Travel',
    emotionalPromise: 'Africa at its most effortless and exclusive',
    description: 'The finest camps, private guiding and seamless transfers — every detail anticipated so all you do is experience it.',
    desires: ['Ultra-luxury lodges & camps', 'Private vehicles & guides', 'Light-aircraft transfers', 'Total discretion'],
    concerns: ['Is the lodge genuinely top-tier?', 'Privacy & exclusivity', 'Seamless connections']
  },
  {
    slug: 'photography',
    name: 'Photography',
    emotionalPromise: 'Be in the right place at the right light',
    description: 'Itineraries built around golden hours, wildlife density and vehicle access — with guides who understand a photographer’s patience.',
    desires: ['Prime light & positioning', 'Time at sightings, not rushing', 'Bean bags & vehicle space', 'Migration & predator timing'],
    concerns: ['Will the guide wait for the shot?', 'Best season for my subjects', 'Gear handling on safari']
  },
  {
    slug: 'group-travel',
    name: 'Group Travel',
    emotionalPromise: 'One shared adventure, every detail handled',
    description: 'Friends, celebrations or reunions — a single coordinated plan with fair group pricing and everyone looked after.',
    desires: ['Fair group pricing & rooming', 'One coordinated itinerary', 'Range of fitness levels', 'Celebration-ready moments'],
    concerns: ['Keeping everyone together', 'Mixed budgets & interests', 'Rooming logistics'],
    persona: 'group'
  },
  {
    slug: 'solo-travel',
    name: 'Solo Travel',
    emotionalPromise: 'Go it alone, with confidence',
    description: 'Trusted guides, sociable scheduled departures and honest safety advice — independence without the worry.',
    desires: ['Safety & trusted guides', 'Optional group departures', 'No single-supplement surprises', 'Flexible, independent pace'],
    concerns: ['Is it safe to travel solo?', 'Will I feel isolated?', 'Single-supplement cost'],
    persona: 'solo'
  }
];

export const getTravelStyle = (slug: string) => TRAVEL_STYLES.find((s) => s.slug === slug);
