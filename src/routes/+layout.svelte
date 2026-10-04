<script lang="ts">
  import { browser } from '$app/environment';
  import { navigating, page } from '$app/stores';
  import { afterNavigate } from '$app/navigation';
  import { env as publicEnv } from '$env/dynamic/public';
  import { onMount } from 'svelte';
  import '../app.css';
  import Navbar from '$lib/components/public/Navbar.svelte';
  import Footer from '$lib/components/public/Footer.svelte';
  import ConsentBanner from '$lib/components/public/ConsentBanner.svelte';
  import JsonLd from '$lib/components/public/JsonLd.svelte';
  import ShortlistFab from '$lib/components/public/ShortlistFab.svelte';
  import EnquiryModal from '$lib/components/public/EnquiryModal.svelte';
  import { consent, getConsent } from '$lib/consent';
  import { setupPwaInstall } from '$lib/pwa';
  import { initSmoothScrolling, setupGsap } from '$lib/animations';
  import { api } from '$lib/api/client';
  import { applyBranding, branding, brandColorStyleTag } from '$lib/branding';
  import { cdnUrl } from '$lib/img';
  import { SITE_URL } from '$lib/config/env';
  import { canonicalForPath, isPrivateOrUtilityPath, resolvePageSeo, safeSiteOrigin } from '$lib/seo-policy';
  import type { LayoutData } from './$types';

  export let data: LayoutData;

  // Seed the store from the SSR-loaded branding so the first render (and every
  // <svelte:head> tag below) is already branded — no flash, correct for crawlers.
  // Kept in sync on client-side navigation as `data` refreshes.
  $: branding.set(data.branding);

  // Inline the palette during SSR so first paint matches the saved brand.
  $: brandStyleTag = brandColorStyleTag($branding.colors);
  import { loadPublicSettings } from '$lib/settings';
  import { initCurrency } from '$lib/currency';
  import { trackPageView } from '$lib/analytics';
  import { loadClarity } from '$lib/clarity';

  $: path = $page.url.pathname;
  $: isAdmin = path.startsWith('/admin');
  $: isPrivateOrUtility = isPrivateOrUtilityPath(path);
  $: publicSettings = data.publicSettings ?? {};

  const settingText = (settings: Record<string, unknown>, key: string): string =>
    typeof settings[key] === 'string' ? settings[key].trim() : '';
  const settingBool = (settings: Record<string, unknown>, key: string, fallback = true): boolean =>
    typeof settings[key] === 'boolean' ? settings[key] : fallback;
  const absoluteUrl = (value: string, origin: string): string => {
    try {
      return new URL(value, origin).toString();
    } catch {
      return `${origin}/emnel-icon.png`;
    }
  };

  // One authoritative SEO composition point. Route defaults come from the
  // server-rendered page data, then an explicit CMS override can win without
  // creating a second title/description/canonical tag elsewhere in the app.
  $: configuredCanonicalBase = settingText(publicSettings, 'canonical_base_url') || SITE_URL;
  $: siteOrigin = safeSiteOrigin(configuredCanonicalBase, $page.url.origin);
  $: defaultSeo = resolvePageSeo(path, $page.data, $branding);
  $: seoOverride = data.seoOverride ?? null;
  $: seoTitle = seoOverride?.title?.trim() || defaultSeo.title;
  $: seoDescription = seoOverride?.meta_description?.trim() || defaultSeo.description;
  $: seoOgTitle = seoOverride?.og_title?.trim() || seoOverride?.title?.trim() || defaultSeo.title;
  $: seoOgDescription = seoOverride?.og_description?.trim() || seoOverride?.meta_description?.trim() || defaultSeo.description;
  $: canonicalUrl = canonicalForPath(siteOrigin, path, seoOverride?.canonical_url);
  $: defaultOgImage = settingText(publicSettings, 'default_og_image_url') || '/emnel-icon.png';
  $: socialImage = absoluteUrl(seoOverride?.og_image_url?.trim() || defaultSeo.image || defaultOgImage, siteOrigin);
  $: indexingEnabled = settingBool(publicSettings, 'robots_indexing_enabled', true);
  $: robots = isAdmin || isPrivateOrUtility || !indexingEnabled
    ? 'noindex,nofollow'
    : defaultSeo.noindex
      ? 'noindex,follow'
      : seoOverride?.robots?.trim() || 'index,follow';
  $: orgUrl = `${siteOrigin}/`;
  $: seoStructured = seoOverride?.structured_data && !Array.isArray(seoOverride.structured_data)
    ? seoOverride.structured_data
    : null;

  let smoothScrollCleanup: (() => void) | undefined;
  $: if (browser) {
    if (isAdmin && smoothScrollCleanup) {
      smoothScrollCleanup();
      smoothScrollCleanup = undefined;
    }

    if (!isAdmin && !smoothScrollCleanup) {
      smoothScrollCleanup = initSmoothScrolling();
    }
  }

  const loadBranding = async () => {
    try {
      const response = await api.branding.get();
      applyBranding(response.data as Record<string, unknown>);
    } catch {
      // Defaults already live in app.css :root — nothing to do on failure.
    }
  };

  // Local dev / preview hosts must never pollute the production GA4 property.
  const isProdHost = () =>
    browser && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname) && !window.location.hostname.endsWith('.local');

  // Load the Google tag on the public site — gated by consent ('granted') below,
  // a production host, and at least one configured id.
  //
  // GA4 (G-…) and Google Ads (AW-…) deliberately share ONE gtag.js script. That
  // is what Google's own instructions mean by "don't add more than one Google
  // tag to each page": the library loads once and each product is registered by
  // its own config() call. Pasting the Ads snippet verbatim next to the GA4 one
  // would load the library twice and double-count everything.
  //
  // GA4's send_page_view stays off so the SPA tracker (afterNavigate →
  // trackPageView) remains the single source of truth for page views; the entry
  // page is sent once here because its afterNavigate ran before gtag existed.
  // The Ads config takes no such flag — Ads counts conversions, not page views.
  /**
   * Tell an already-loaded Google tag about a consent decision. Safe to call
   * before the library exists — gtag() only pushes onto dataLayer, which the
   * library drains when it loads.
   */
  const applyConsent = (state: 'granted' | 'denied' | null) => {
    if (!browser) return;
    const w = window as unknown as { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };
    if (!w.gtag) return;
    const v = state === 'granted' ? 'granted' : 'denied';
    w.gtag('consent', 'update', {
      ad_storage: v,
      ad_user_data: v,
      ad_personalization: v,
      analytics_storage: v,
      functionality_storage: v,
      personalization_storage: v
    });
  };

  const loadGoogleTag = () => {
    const ga4Id = publicEnv.PUBLIC_GA4_MEASUREMENT_ID;
    const adsId = publicEnv.PUBLIC_GOOGLE_ADS_ID;
    if (!browser || isAdmin || !isProdHost()) return;
    if (!ga4Id && !adsId) return;
    if (document.getElementById('ga4-src')) return;

    // Either id can bootstrap the library; the other is registered by config().
    const script = document.createElement('script');
    script.id = 'ga4-src';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${ga4Id || adsId}`;
    document.head.appendChild(script);

    const w = window as unknown as { dataLayer: unknown[]; gtag: (...args: unknown[]) => void };
    w.dataLayer = w.dataLayer || [];
    w.gtag = function gtag() { w.dataLayer.push(arguments); };

    // CONSENT MODE v2 — the default MUST be pushed before anything else, so the
    // library never has a moment where it could set a cookie. Everything that
    // can identify someone starts denied; the banner upgrades it on Accept.
    //
    // This is why the tag may now load before a choice is made: in denied state
    // it writes no cookies and sends no identifiers, only cookieless pings that
    // let Google model the conversions it would otherwise never see. That is
    // the behaviour Google's own EEA guidance asks for, and it is what makes
    // conversion tracking work for visitors who decline.
    w.gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
      functionality_storage: 'denied',
      personalization_storage: 'denied',
      // Not a tracking signal — it covers things like fraud prevention.
      security_storage: 'granted',
      // Give the banner a moment to answer before anything is sent.
      wait_for_update: 500
    });
    // A returning visitor already decided; apply it before the first ping so we
    // never send a denied ping to someone who accepted on a previous visit.
    applyConsent(getConsent());

    w.gtag('js', new Date());

    if (ga4Id) {
      w.gtag('config', ga4Id, { anonymize_ip: true, send_page_view: false });
      trackPageView();
    }
    if (adsId) w.gtag('config', adsId);
  };

  // Microsoft Clarity — UX companion to GA4 (session recordings, heatmaps,
  // rage/dead clicks, scroll behaviour). Same gates as GA4: consent granted,
  // production host, public site, and PUBLIC_CLARITY_PROJECT_ID configured.
  // Clarity handles SPA route changes itself, so there is no per-navigation call.
  const loadClarityIfReady = () => {
    const id = publicEnv.PUBLIC_CLARITY_PROJECT_ID;
    if (!browser || !id || isAdmin || !isProdHost()) return;
    loadClarity(id);
  };

  // The Google tag loads for everyone (in denied state — see loadGoogleTag), so
  // Ads can model conversions from visitors who decline and Google's own tag
  // test can detect the installation. The decision is then pushed as an update.
  $: if (browser && !isAdmin) loadGoogleTag();
  $: if (browser && $consent) applyConsent($consent);

  // Clarity records sessions, so unlike the Google tag it stays fully gated on
  // an explicit grant — it has no cookieless mode to fall back to.
  $: if (browser && $consent === 'granted') loadClarityIfReady();

  // One page_view per navigation (initial + every client-side route change,
  // incl. back/forward). Deduped + query-stripped inside trackPageView. Public
  // site only — the admin app is excluded from analytics.
  afterNavigate(() => {
    if (!isAdmin) trackPageView();
  });

  onMount(() => {
    void setupGsap();
    // Apply the SSR-loaded branding's client-side effects (brand-color-vars style
    // tag + favicon) right away, then refresh from the API (also retries if the
    // server-side fetch had failed and we fell back to defaults).
    applyBranding(data.branding);
    void loadBranding();
    void loadPublicSettings();
    void initCurrency();
    setupPwaInstall();
    return () => {
      smoothScrollCleanup?.();
    };
  });
</script>

<svelte:head>
  {#if !isAdmin && !isPrivateOrUtility}
    <title>{seoTitle}</title>
    <meta name="description" content={seoDescription} />
    <meta property="og:title" content={seoOgTitle} />
    <meta property="og:description" content={seoOgDescription} />
    <meta property="og:type" content={defaultSeo.type ?? 'website'} />
    <meta property="og:site_name" content={$branding.site_name} />
    <meta property="og:url" content={canonicalUrl} />
    <meta property="og:image" content={socialImage} />
    <meta property="og:image:alt" content={defaultSeo.imageAlt || seoOgTitle} />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={seoOgTitle} />
    <meta name="twitter:description" content={seoOgDescription} />
    <meta name="twitter:image" content={socialImage} />
    <meta name="twitter:image:alt" content={defaultSeo.imageAlt || seoOgTitle} />
    <link rel="canonical" href={canonicalUrl} />
  {/if}
  {#if robots || isAdmin || isPrivateOrUtility}
    <meta name="robots" content={robots} />
  {/if}
  {#if $branding.favicon_url}
    <link rel="icon" href={cdnUrl($branding.favicon_url)} />
  {/if}
  <!-- Inlined brand palette for a flash-free, already-branded first paint. -->
  {@html brandStyleTag}
</svelte:head>

<!-- Org-wide schema (JsonLd injects via {@html}; a {mustache} inside <script> is
     not interpolated by Svelte, which is what broke the old inline block). -->
<JsonLd
  data={{
    '@graph': [
      {
        '@id': `${orgUrl}#organization`,
        '@type': 'TravelAgency',
        name: $branding.company_name,
        url: orgUrl,
        slogan: $branding.tagline
      },
      {
        '@id': `${orgUrl}#website`,
        '@type': 'WebSite',
        name: $branding.site_name,
        url: orgUrl,
        publisher: { '@id': `${orgUrl}#organization` },
        inLanguage: 'en'
      }
    ]
  }}
/>
{#if seoStructured}
  <JsonLd data={seoStructured} />
{/if}

{#if $navigating}
  <div class="nav-progress" role="progressbar" aria-label="Loading page" aria-busy="true"></div>
{/if}

{#if !isAdmin}
  <a
    href="#main-content"
    class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-deep-green focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg"
  >
    Skip to content
  </a>
  <Navbar essentialsLive={data.essentialsLive ?? false} countries={data.countries ?? []} />
{/if}

<main id="main-content">
  <slot />
</main>

{#if !isAdmin}
  <Footer
    countries={data.countries ?? []}
    essentialsLive={data.essentialsLive ?? false}
    marketsLive={data.marketsLive ?? false}
  />
  <ShortlistFab />
  <ConsentBanner />
  <EnquiryModal />
{/if}
