import { writable } from 'svelte/store';

// Shared open-state for the Goldfinch AI Travel Advisor so any component
// (navbar "Need help?", page chips, etc.) can launch it — optionally seeding a
// first question that the widget auto-sends.
export const aiAdvisorOpen = writable(false);
export const aiAdvisorSeed = writable<string | null>(null);

export const openAiAdvisor = (seed?: string) => {
  if (seed) aiAdvisorSeed.set(seed);
  aiAdvisorOpen.set(true);
};
