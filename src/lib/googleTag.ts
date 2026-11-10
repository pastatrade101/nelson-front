/**
 * The Google tags, rendered into the <head> of every public page so Google's
 * own checks (Search Console, GA4's "test your tag", Tag Assistant) find them
 * in the first response rather than after the page's JavaScript runs.
 *
 * IDs come from CMS › Settings › Analytics, falling back to the server's
 * PUBLIC_* variables. Each is checked against its format before it goes into a
 * script, so a pasted snippet or a typo can never inject markup.
 *
 * Consent Mode v2: everything that can identify someone starts denied and is
 * upgraded only when the visitor accepts (or accepted on an earlier visit),
 * before any tag loads. Denied visitors send cookieless pings only.
 */
export type GoogleTagIds = { ga4: string; ads: string; gtm: string };

const FORMATS: Record<keyof GoogleTagIds, RegExp> = {
  ga4: /^G-[A-Z0-9]{4,20}$/,
  ads: /^AW-\d{4,20}$/,
  gtm: /^GTM-[A-Z0-9]{4,20}$/
};

/** A valid id of the given kind, or ''. Accepts lower-case and stray spaces. */
export const tagId = (kind: keyof GoogleTagIds, ...candidates: Array<string | null | undefined>): string => {
  for (const candidate of candidates) {
    const id = String(candidate ?? '').trim().toUpperCase();
    if (FORMATS[kind].test(id)) return id;
  }
  return '';
};

/**
 * The Search Console token, whether the CMS holds the bare code, the whole
 * `<meta … content="…">` tag or the DNS form `google-site-verification=…`.
 */
export const verificationCode = (value: string | null | undefined): string => {
  const raw = String(value ?? '').trim();
  const fromMeta = raw.match(/content\s*=\s*["']([^"']+)["']/i)?.[1];
  const code = (fromMeta ?? raw).replace(/^google-site-verification\s*[=:]\s*/i, '').trim();
  return /^[A-Za-z0-9_-]{10,100}$/.test(code) ? code : '';
};

const CONSENT_KEY = 'gf_consent';
const DENIED = "{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',functionality_storage:'denied',personalization_storage:'denied',security_storage:'granted',wait_for_update:500}";
const GRANTED = "{ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted',analytics_storage:'granted',functionality_storage:'granted',personalization_storage:'granted'}";

/** The <head> markup for the configured tags; '' when none is configured. */
export const googleTagHead = (ids: GoogleTagIds): string => {
  const ga4 = tagId('ga4', ids.ga4), ads = tagId('ads', ids.ads), gtm = tagId('gtm', ids.gtm);
  if (!ga4 && !ads && !gtm) return '';
  const lines = [
    'window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}',
    `gtag('consent','default',${DENIED});`,
    `try{if(localStorage.getItem('${CONSENT_KEY}')==='granted')gtag('consent','update',${GRANTED});}catch(e){}`
  ];
  if (gtm) lines.push('window.emnelGtm=true;');
  if (ga4 || ads) {
    lines.push("gtag('js',new Date());");
    // Page views come from the site's own router hook, once per navigation.
    if (ga4) lines.push(`gtag('config','${ga4}',{anonymize_ip:true,send_page_view:false});`);
    if (ads) lines.push(`gtag('config','${ads}');`);
  }
  // One gtag.js serves both GA4 and Ads: a second copy would double-count.
  if (ga4 || ads) lines.push(`var g=document.createElement('script');g.async=true;g.id='ga4-src';g.src='https://www.googletagmanager.com/gtag/js?id=${ga4 || ads}';document.head.appendChild(g);`);
  if (gtm) {
    lines.push(`dataLayer.push({'gtm.start':new Date().getTime(),event:'gtm.js'});var t=document.createElement('script');t.async=true;t.src='https://www.googletagmanager.com/gtm.js?id=${gtm}';document.head.appendChild(t);`);
  }
  // Guarded: if the page re-renders its <head>, the tags must not load twice.
  return `<script>if(!window.emnelGoogleTag){window.emnelGoogleTag=true;${lines.join('')}}</script>`;
};

/** Tag Manager's no-JavaScript fallback, placed at the start of <body>. */
export const googleTagBody = (ids: GoogleTagIds): string => {
  const gtm = tagId('gtm', ids.gtm);
  return gtm
    ? `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${gtm}" height="0" width="0" style="display:none;visibility:hidden" title="Google Tag Manager"></iframe></noscript>`
    : '';
};
