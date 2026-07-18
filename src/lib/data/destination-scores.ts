// Destination scores (SRS v2.0 §4.2 / "destination-scores" page) — the 5 honest
// 1–10 ratings the Product Owner curates per destination. Shipped as static config
// keyed by destination slug (no schema change). Destinations without an entry
// simply don't show a score panel.
export type DestinationScores = {
  wildlife: number;
  luxury: number;
  family: number;
  photography: number;
  adventure: number;
  budgetFromUsd?: number;
};

export const SCORE_DIMENSIONS: { key: keyof DestinationScores; label: string }[] = [
  { key: 'wildlife', label: 'Wildlife' },
  { key: 'luxury', label: 'Luxury' },
  { key: 'family', label: 'Family' },
  { key: 'photography', label: 'Photography' },
  { key: 'adventure', label: 'Adventure' }
];

export const DESTINATION_SCORES: Record<string, DestinationScores> = {
  tanzania: { wildlife: 10, luxury: 9, family: 8, photography: 10, adventure: 9, budgetFromUsd: 1500 },
  kenya: { wildlife: 9, luxury: 8, family: 8, photography: 9, adventure: 8, budgetFromUsd: 1300 },
  zanzibar: { wildlife: 4, luxury: 9, family: 9, photography: 8, adventure: 6, budgetFromUsd: 900 }
};

export const getDestinationScores = (slug: string): DestinationScores | undefined => DESTINATION_SCORES[slug];

// The dimension a destination scores highest in — used for a "best for" label.
export const topDimension = (s: DestinationScores) =>
  SCORE_DIMENSIONS.reduce((best, d) => ((s[d.key] as number) > (s[best.key] as number) ? d : best), SCORE_DIMENSIONS[0]).label;
