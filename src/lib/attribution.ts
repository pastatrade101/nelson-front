import { browser } from '$app/environment';

// ----------------------------------------------------------------------------
// Campaign attribution for enquiries: the UTM tags and ad click ids a visitor
// arrived with, kept for the browser tab so a request sent three pages later
// still says which ad or campaign brought them. First touch wins within the
// tab: a later internal click carries no tags and must not wipe the ad's.
// Saved with the enquiry in lead_context.attribution and shown to Nelson.
// Session storage only; every access is guarded, since it can be blocked.
// ----------------------------------------------------------------------------

const KEY = 'emnel_attribution';

const PARAMS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'gclid', 'gbraid', 'wbraid', 'msclkid', 'fbclid'
] as const;

export type Attribution = Partial<Record<(typeof PARAMS)[number] | 'referrer' | 'landing_page' | 'captured_at', string>>;

const read = (): Attribution | null => {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Attribution) : null;
  } catch {
    return null;
  }
};

/** Call on page load. Records the landing page, referrer and campaign tags once per tab. */
export const captureAttribution = (): void => {
  if (!browser) return;
  try {
    const url = new URL(window.location.href);
    const found: Attribution = {};
    for (const key of PARAMS) {
      const value = url.searchParams.get(key)?.trim();
      if (value) found[key] = value.slice(0, 200);
    }
    const existing = read();
    const hasCampaign = Object.keys(found).length > 0;
    // Keep the first touch unless this landing carries new campaign tags.
    if (existing && !hasCampaign) return;

    let referrer = '';
    try {
      const ref = document.referrer ? new URL(document.referrer) : null;
      if (ref && ref.host !== window.location.host) referrer = `${ref.origin}${ref.pathname}`.slice(0, 300);
    } catch {
      referrer = '';
    }

    const record: Attribution = {
      ...found,
      landing_page: `${url.pathname}${hasCampaign ? url.search : ''}`.slice(0, 500),
      captured_at: new Date().toISOString()
    };
    if (referrer) record.referrer = referrer;
    sessionStorage.setItem(KEY, JSON.stringify(record));
  } catch {
    // attribution must never break the page
  }
};

/** What to save with an enquiry ({} when nothing was recorded). */
export const getAttribution = (): Attribution => (browser ? read() ?? {} : {});
