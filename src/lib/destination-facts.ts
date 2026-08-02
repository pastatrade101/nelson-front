import type { Destination } from '$lib/types';

// ── Real facts pulled from the destination's `guide` JSON ────────────────────
// The official guides carry a "facts" block (the "… in Numbers" table) with
// labelled metrics. We surface only those real values — never fabricated.
type FactItem = { label?: string; value?: unknown };
type GuideBlock = { type?: string; title?: string; items?: FactItem[] };

const factsFromGuide = (d: Destination): Record<string, string> => {
  const guide = (d as unknown as { guide?: GuideBlock[] }).guide;
  if (!Array.isArray(guide)) return {};
  const out: Record<string, string> = {};
  for (const b of guide) {
    if (b?.type === 'facts' && Array.isArray(b.items)) {
      for (const it of b.items) {
        const label = String(it?.label ?? '').trim().toLowerCase();
        const value = String(it?.value ?? '').trim();
        if (label && value && !(label in out)) out[label] = value;
      }
    }
  }
  return out;
};

const pickFact = (facts: Record<string, string>, ...needles: string[]): string => {
  for (const n of needles) {
    const key = Object.keys(facts).find((k) => k.includes(n));
    if (key) return facts[key];
  }
  return '';
};

export type DestinationFacts = {
  bestTime: string;
  stay: string;
  size: string;
  region: string;
  unesco: boolean;
  famousFor: string;
  wildlife: string;
};

export const destinationFacts = (d: Destination): DestinationFacts => {
  const f = factsFromGuide(d);
  const unescoText = pickFact(f, 'unesco');
  return {
    bestTime: pickFact(f, 'best time'),
    stay: pickFact(f, 'ideal visit length', 'ideal visit', 'visit length'),
    size: pickFact(f, 'size'),
    region: d.region ?? pickFact(f, 'location'),
    unesco: /world heritage|unesco site|inscribed/i.test(unescoText) && !/^not\b|\bnot a\b/i.test(unescoText),
    famousFor: pickFact(f, 'famous for'),
    wildlife: pickFact(f, 'wildlife')
  };
};

// Honest highlight chips — derived from the real guide facts (famous-for /
// wildlife text), UNESCO status, region and 0-10 scores. No invented claims.
export const destinationChips = (d: Destination): string[] => {
  const f = destinationFacts(d);
  const hay = `${f.famousFor} ${f.wildlife} ${d.name} ${d.short_description ?? ''}`.toLowerCase();
  const chips: string[] = [];
  const add = (c: string) => { if (!chips.includes(c) && chips.length < 5) chips.push(c); };
  if (f.unesco) add('UNESCO');
  if (/migration|wildebeest/.test(hay)) add('Great Migration');
  if (/big five/.test(hay) || (/lion/.test(hay) && /elephant/.test(hay) && /leopard/.test(hay))) add('Big Five');
  if (/crater|caldera/.test(hay)) add('Crater');
  if (/baobab/.test(hay)) add('Ancient Baobabs');
  if (/tree-climbing/.test(hay)) add('Tree-climbing Lions');
  if (/flamingo/.test(hay)) add('Flamingos');
  if (/whale shark|coral|reef|diving|marine/.test(hay)) add('Diving & Marine');
  if (/hadza|hunter-gatherer|datoga|swahili|stone town/.test(hay)) add('Culture & History');
  if (/\bbird|bird species/.test(hay)) add('Birding');
  if (/beach|coral sand|indian ocean/.test(hay) || /island|coast/i.test(d.region ?? '')) add('Beach Extension');
  if ((d.score_family ?? 0) >= 8) add('Family Friendly');
  if ((d.score_photography ?? 0) >= 9) add('Photography');
  return chips.slice(0, 5);
};

// Luxury level (0-5) from the 0-10 luxury score; null when unscored.
export const luxuryStars = (d: Destination): number | null =>
  d.score_luxury == null ? null : Math.max(1, Math.round((d.score_luxury ?? 0) / 2));

// "Best for" tags derived from a destination's 0-10 scores. Only what the data
// supports — no fabricated facts. Used across the destinations page park cards.
export const bestForTags = (d: Destination): string[] => {
  const t: string[] = [];
  if ((d.score_wildlife ?? 0) >= 9) t.push('Big game & predators');
  else if ((d.score_wildlife ?? 0) >= 7) t.push('Classic game viewing');
  if ((d.score_photography ?? 0) >= 9) t.push('Photography');
  if ((d.score_family ?? 0) >= 8) t.push('Families');
  if ((d.score_luxury ?? 0) >= 8) t.push('Luxury lodges');
  if ((d.score_adventure ?? 0) >= 9) t.push('Wild & remote');
  return t.slice(0, 3);
};

// Group published destinations into the three circuits the page renders.
export const groupByCircuit = (destinations: Destination[]) => ({
  northern: destinations.filter((d) => /north/i.test(d.region ?? '')),
  islands: destinations.filter((d) => /island|coast|indian ocean|zanzibar/i.test(d.region ?? '')),
  beyond: destinations.filter((d) => !/north|island|coast|indian ocean|zanzibar/i.test(d.region ?? ''))
});
