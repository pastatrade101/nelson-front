import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Client-side "save trips" shortlist (spec §7). Persists across sessions so a
// returning visitor keeps their saved trips and the enquiry form can pre-fill.
export type ShortlistItem = {
  /** What was saved. Absent on items saved before lodges could be — those are tours. */
  kind?: 'tour' | 'lodge';
  slug: string;
  title: string;
  image_url?: string;
  destination?: string;
  duration_days?: number;
  price_from?: number;
  currency?: string;
};

const KEY = 'emnel_shortlist';

const load = (): ShortlistItem[] => {
  if (!browser) return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    // Items saved before lodges carried a kind: tours always stored duration_days
    // (a number or null), lodges never did — so its absence marks a lodge.
    return (parsed as ShortlistItem[]).map((item) =>
      item && !item.kind ? { ...item, kind: 'duration_days' in item ? 'tour' : 'lodge' } : item
    );
  } catch {
    return [];
  }
};

export const shortlist = writable<ShortlistItem[]>(load());

if (browser) {
  shortlist.subscribe((items) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      // storage may be unavailable (private mode) — fail silently
    }
  });
}

export const toggleShortlist = (item: ShortlistItem) =>
  shortlist.update((items) =>
    items.some((i) => i.slug === item.slug)
      ? items.filter((i) => i.slug !== item.slug)
      : [...items, item]
  );

export const removeShortlist = (slug: string) =>
  shortlist.update((items) => items.filter((i) => i.slug !== slug));

export const clearShortlist = () => shortlist.set([]);
