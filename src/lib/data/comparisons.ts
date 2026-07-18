// Decision-stage comparison pages (SRS v2.0 type 24), shipped as static config so
// there's no schema/backend change. Add/edit entries here; routes render them.
export type ComparisonDim = { label: string; a: string; b: string };

export type Comparison = {
  slug: string;
  eyebrow: string;
  title: string;
  intro: string;
  a: { name: string; image?: string };
  b: { name: string; image?: string };
  dimensions: ComparisonDim[];
  verdict: string;
  cta: { label: string; href: string };
  faqs?: { q: string; a: string }[];
};

export const COMPARISONS: Comparison[] = [
  {
    slug: 'tanzania-vs-kenya-safari',
    eyebrow: 'Safari comparison',
    title: 'Tanzania vs Kenya Safari',
    intro:
      'Both are world-class — and very different in feel. Here is an honest look at how a Tanzania safari compares to Kenya, so you can pick the right one (or do both).',
    a: { name: 'Tanzania', image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801' },
    b: { name: 'Kenya' },
    dimensions: [
      { label: 'Signature wildlife', a: 'Serengeti holds the Great Migration for most of the year; Ngorongoro Crater for incredible density.', b: 'Masai Mara delivers the dramatic Mara River crossings (roughly Jul–Oct).' },
      { label: 'Cost', a: 'Higher park fees — a more premium, exclusive feel.', b: 'Often better value, with more mid-range options.' },
      { label: 'Crowds', a: 'The vast Serengeti spreads vehicles out.', b: 'The Mara can get busy at peak crossing time.' },
      { label: 'Getting there', a: 'Fly into Kilimanjaro (JRO), safari from Arusha.', b: 'Nairobi (NBO) is a major, well-connected hub.' },
      { label: 'Beach add-on', a: 'Zanzibar — arguably the best safari + beach combo in Africa.', b: 'Diani and the Kenyan coast.' },
      { label: 'Best for', a: 'First-timers wanting the iconic, bucket-list trip.', b: 'Value-seekers and the Mara crossing spectacle.' }
    ],
    verdict:
      'For a first safari with the iconic Serengeti and a Zanzibar beach finish, choose Tanzania. If value and the Mara river crossings (Jul–Oct) matter most, Kenya is hard to beat. Plenty of travellers combine both — and we are happy to plan that.',
    cta: { label: 'Plan a Tanzania or Kenya safari', href: '/plan-my-trip?experience=safari' },
    faqs: [
      { q: 'Can I visit both Tanzania and Kenya in one trip?', a: 'Yes — a combined Serengeti + Masai Mara itinerary is popular and we can route it smoothly. It works best across 10+ days.' },
      { q: 'Which is safer?', a: 'Both are well-established safari destinations with strong tourism infrastructure. We plan around trusted lodges, guides and routes in either country.' }
    ]
  },
  {
    slug: 'serengeti-vs-masai-mara',
    eyebrow: 'Park comparison',
    title: 'Serengeti vs Masai Mara',
    intro:
      'They are two halves of the same ecosystem — the migration moves between them. Here is how the Serengeti (Tanzania) and the Masai Mara (Kenya) actually differ.',
    a: { name: 'Serengeti' },
    b: { name: 'Masai Mara' },
    dimensions: [
      { label: 'Size & space', a: 'Enormous (~15,000 km²) — endless plains, fewer vehicles per sighting.', b: 'Compact and game-dense — more action in a smaller area.' },
      { label: 'Migration timing', a: 'Calving in the south (Jan–Mar); central/northern movement mid-year.', b: 'The famous river crossings, roughly Jul–Oct.' },
      { label: 'Predators', a: 'Big lion prides, cheetah on the plains.', b: 'Exceptional big-cat viewing in a concentrated area.' },
      { label: 'Cost', a: 'Higher park fees.', b: 'Often more affordable.' },
      { label: 'Pace', a: 'Longer drives between areas — feels remote and wild.', b: 'Shorter drives, quicker sightings.' }
    ],
    verdict:
      'Want space, fewer crowds and the full migration story across the year? Serengeti. Want the river-crossing drama and dense big-cat action in a shorter trip? Masai Mara. We will match the park to your travel month.',
    cta: { label: 'Plan a migration safari', href: '/plan-my-trip?experience=safari' }
  },
  {
    slug: 'machame-vs-lemosho-kilimanjaro',
    eyebrow: 'Kilimanjaro route comparison',
    title: 'Machame vs Lemosho Route',
    intro:
      'The two routes we recommend most on Kilimanjaro. Both are scenic and non-technical — the honest differences come down to days on the mountain, crowds and summit success.',
    a: { name: 'Machame (7 days)' },
    b: { name: 'Lemosho (8 days)' },
    dimensions: [
      { label: 'Duration', a: 'Typically 6–7 days — the most complete climb doable in a week.', b: '7–8 days — an extra day for acclimatisation.' },
      { label: 'Scenery', a: 'Very scenic and diverse: rainforest, moorland, alpine desert, glacier.', b: 'The most beautiful route, with a quieter, remote western approach.' },
      { label: 'Crowds', a: 'Popular — busier trails and camps.', b: 'Fewer climbers, especially in the early days.' },
      { label: 'Acclimatisation & success', a: 'Excellent success rate with a good "walk high, sleep low" profile.', b: 'The highest summit success rates of any route — the extra day matters.' },
      { label: 'Cost', a: 'A little lower — one fewer day on the mountain.', b: 'Slightly higher for the additional day.' }
    ],
    verdict:
      'Short on days but want a scenic climb with strong odds? Machame. Have the extra day and want the best possible chance of the summit with fewer crowds? Lemosho — the route our guides recommend without reservation. Either way, your guide has reached the crater rim hundreds of times.',
    cta: { label: 'Plan my Kilimanjaro climb', href: '/plan-my-trip?experience=kilimanjaro' }
  }
];

export const getComparison = (slug: string) => COMPARISONS.find((c) => c.slug === slug);
