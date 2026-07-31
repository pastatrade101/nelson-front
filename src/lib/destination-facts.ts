import type { Destination } from '$lib/types';

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
