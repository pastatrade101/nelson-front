import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';

// Compatibility exports for older components. New requests always navigate to
// the canonical planner; /enquiry also redirects there with its query intact.
export const enquiryOpen = writable(false);
export const openEnquiry = () => {
  if (!browser) return;
  const params = new URLSearchParams(window.location.search);
  params.set('from', window.location.pathname);
  const tour = window.location.pathname.match(/^\/tours\/([^/]+)\/?$/);
  if (tour) params.set('tour', decodeURIComponent(tour[1]));
  enquiryOpen.set(false);
  void goto(`/plan-my-trip?${params}`);
};
export const closeEnquiry = () => enquiryOpen.set(false);
