import { writable } from 'svelte/store';
import { browser } from '$app/environment';

/**
 * The quote form as a popup over the current page (EnquiryModal). Holds the
 * planner address it was opened with — the same query /plan-my-trip takes —
 * or null while closed. /plan-my-trip itself stays a full page for direct
 * visits, new tabs and crawlers.
 */
export const enquiryHref = writable<string | null>(null);
export const enquiryOpen = { subscribe: (run: (open: boolean) => void) => enquiryHref.subscribe((href) => run(href !== null)) };

/**
 * Open the quote form. `search` carries a link's own query (`?tour=…`); the
 * page it was opened from is added, and on a tour page so is that tour, so
 * the form starts from it.
 */
export const openEnquiry = (search = '') => {
  if (!browser) return;
  const params = new URLSearchParams(search || window.location.search);
  if (!params.has('from')) params.set('from', window.location.pathname);
  const tour = window.location.pathname.match(/^\/tours\/([^/]+)\/?$/);
  if (tour && !params.has('tour')) params.set('tour', decodeURIComponent(tour[1]));
  enquiryHref.set(`/plan-my-trip?${params}`);
};
export const closeEnquiry = () => enquiryHref.set(null);
