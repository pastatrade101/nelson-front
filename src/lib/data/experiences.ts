// Experience enrichment (SRS v2.0 type 4) — "who it's for" + fitness + highlights,
// keyed by tour-category slug. Static config layered over the CMS categories (no
// schema change). Categories without an entry still render with their own copy.
export type ExperienceInfo = {
  whoItsFor: string;
  fitness?: string;
  highlights: string[];
};

export const EXPERIENCE_INFO: Record<string, ExperienceInfo> = {
  safari: {
    whoItsFor: 'First-timers, families and photographers — anyone who wants the iconic East Africa wildlife experience.',
    fitness: 'Easy — game drives, no walking required.',
    highlights: ['The Great Migration', 'Big Five game viewing', 'Ngorongoro Crater', 'Sunsets on the plains']
  },
  kilimanjaro: {
    whoItsFor: 'Active travellers ready for a multi-day high-altitude trek to the roof of Africa.',
    fitness: 'Challenging — good fitness and proper acclimatisation needed.',
    highlights: ['Uhuru Peak (5,895m)', 'Machame & Marangu routes', 'Glaciers & alpine desert', 'Expert mountain crew']
  },
  'beach-holiday': {
    whoItsFor: 'Couples, honeymooners and families wanting to unwind — the perfect safari finale.',
    fitness: 'Easy — pure relaxation.',
    highlights: ['Zanzibar white-sand beaches', 'Spice tours & Stone Town', 'Snorkelling & dhow cruises', 'Safari + beach combos']
  },
  gorilla: {
    whoItsFor: 'Travellers seeking a once-in-a-lifetime encounter with mountain gorillas.',
    fitness: 'Moderate to challenging — steep forest trekking.',
    highlights: ['Mountain gorilla families', 'Bwindi & Volcanoes NP', 'Limited daily permits', 'Pairs well with a safari']
  },
  'gorilla-trekking': {
    whoItsFor: 'Travellers seeking a once-in-a-lifetime encounter with mountain gorillas.',
    fitness: 'Moderate to challenging — steep forest trekking.',
    highlights: ['Mountain gorilla families', 'Bwindi & Volcanoes NP', 'Limited daily permits', 'Pairs well with a safari']
  }
};

export const getExperienceInfo = (slug: string): ExperienceInfo | undefined => EXPERIENCE_INFO[slug];
