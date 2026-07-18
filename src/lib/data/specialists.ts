// Named travel specialists (SRS v2.0 §5 trust / type 25) — the human face of the
// brand on tour pages and after enquiry. Static config (no schema); replace names,
// roles and photos with the real team. Photos optional — initials show otherwise.
export type Specialist = {
  name: string;
  role: string;
  photo?: string;
  blurb?: string;
};

export const SPECIALISTS: Specialist[] = [
  {
    name: 'Amani Mushi',
    role: 'Safari & Kilimanjaro Specialist',
    blurb: 'Born and raised in Arusha, with 12+ years planning private Tanzania safaris. Honest advice, no pressure.'
  },
  {
    name: 'Neema Laizer',
    role: 'Family & Beach Specialist',
    blurb: 'Plans relaxed, kid-friendly safaris and Zanzibar escapes families love.'
  }
];

export const defaultSpecialist = SPECIALISTS[0];
