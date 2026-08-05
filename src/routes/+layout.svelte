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
  import LazyAIAdvisor from '$lib/components/public/LazyAIAdvisor.svelte';
  import { consent } from '$lib/consent';
  import { setupPwaInstall } from '$lib/pwa';
  import { initSmoothScrolling, setupGsap } from '$lib/animations';
  import { api } from '$lib/api/client';
  import { applyBranding, branding, brandColorStyleTag } from '$lib/branding';
  import { SITE_URL } from '$lib/config/env';
  import type { LayoutData } from './$types';

  export let data: LayoutData;

  // Seed the store from the SSR-loaded branding so the first render (and every
  // <svelte:head> tag below) is already branded — no flash, correct for crawlers.
  // Kept in sync on client-side navigation as `data` refreshes.
  $: branding.set(data.branding);

  // Inline the palette during SSR so first paint matches the saved brand.
  $: brandStyleTag = brandColorStyleTag($branding.colors);
  import { aiAdvisorEnabled, loadPublicSettings, publicSettings } from '$lib/settings';
  import { trackPageView } from '$lib/analytics';
  import { loadClarity } from '$lib/clarity';

  $: isAdmin = $page.url.pathname.startsWith('/admin');

  // Site origin from PUBLIC_SITE_URL (.env), falling back to the live request origin.
  $: siteOrigin = SITE_URL || $page.url.origin;
  $: canonicalUrl = `${siteOrigin}${$page.url.pathname}`;
  $: orgUrl = `${siteOrigin}/`;

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

  // The public AI chatbot is the built-in Emnel AI Advisor (mounted below),
  // powered by our own /ai/chat backend. The external Makutano widget is no
  // longer loaded so there is only one chat launcher.
  $: aiOn = !isAdmin && aiAdvisorEnabled($publicSettings);

  // Local dev / preview hosts must never pollute the production GA4 property.
  const isProdHost = () =>
    browser && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname) && !window.location.hostname.endsWith('.local');

  // Load GA4 (gtag) on the public site — gated by consent ('granted') above and a
  // configured PUBLIC_GA4_MEASUREMENT_ID. send_page_view is off so the SPA
  // page-view tracker (afterNavigate → trackPageView) is the single source of
  // truth for page views; we send the current page once here to catch the entry
  // page (afterNavigate for it already ran before gtag existed).
  const loadGa4 = () => {
    const id = publicEnv.PUBLIC_GA4_MEASUREMENT_ID;
    if (!browser || !id || isAdmin || !isProdHost() || document.getElementById('ga4-src')) return;
    const script = document.createElement('script');
    script.id = 'ga4-src';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    document.head.appendChild(script);
    const w = window as unknown as { dataLayer: unknown[]; gtag: (...args: unknown[]) => void };
    w.dataLayer = w.dataLayer || [];
    w.gtag = function gtag() { w.dataLayer.push(arguments); };
    w.gtag('js', new Date());
    w.gtag('config', id, { anonymize_ip: true, send_page_view: false });
    trackPageView();
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

  // Load analytics (GA4 + Clarity) only once the visitor has granted consent.
  $: if (browser && $consent === 'granted') { loadGa4(); loadClarityIfReady(); }

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
    setupPwaInstall();
    return () => {
      smoothScrollCleanup?.();
    };
  });
</script>

<svelte:head>
  <title>{$branding.site_name}</title>
  <meta name="description" content={`${$branding.tagline}. ${$branding.positioning}`} />
  <meta property="og:title" content={$branding.site_name} />
  <meta property="og:description" content={$branding.positioning} />
  <meta property="og:type" content="website" />
  <link rel="canonical" href={canonicalUrl} />
  {#if $branding.favicon_url}
    <link rel="icon" href={$branding.favicon_url} />
  {/if}
  <!-- Inlined brand palette for a flash-free, already-branded first paint. -->
  {@html brandStyleTag}
</svelte:head>

<!-- Org-wide schema (JsonLd injects via {@html}; a {mustache} inside <script> is
     not interpolated by Svelte, which is what broke the old inline block). -->
<JsonLd data={{ '@type': 'TravelAgency', name: $branding.company_name, url: orgUrl, slogan: $branding.tagline }} />

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
  <Navbar />
{/if}

<main id="main-content">
  <slot />
</main>

{#if !isAdmin}
  <Footer />
  <ShortlistFab />
  <ConsentBanner />
  <EnquiryModal />
  {#if aiOn}
    <LazyAIAdvisor />
  {/if}
{/if}
