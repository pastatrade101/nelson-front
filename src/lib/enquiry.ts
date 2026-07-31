import { writable } from 'svelte/store';

// Controls the site-wide "Begin your journey" enquiry modal. The navbar CTA
// opens it; the modal + form close it. A canonical /enquiry page also exists for
// direct links, using the same form.
export const enquiryOpen = writable(false);
export const openEnquiry = () => enquiryOpen.set(true);
export const closeEnquiry = () => enquiryOpen.set(false);
