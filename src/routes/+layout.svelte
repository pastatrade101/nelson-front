<script lang="ts">
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import '../app.css';
  import Navbar from '$lib/components/public/Navbar.svelte';
  import Footer from '$lib/components/public/Footer.svelte';
  import { initSmoothScrolling, setupGsap } from '$lib/animations';
  import { api } from '$lib/api/client';
  import { applyBranding, branding } from '$lib/branding';
  import { SITE_URL } from '$lib/config/env';
  import { loadPublicSettings } from '$lib/settings';

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

  onMount(() => {
    void setupGsap();
    void loadBranding();
    void loadPublicSettings();
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
  <script type="application/ld+json">
    {JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'TravelAgency',
      name: $branding.company_name,
      url: orgUrl,
      slogan: $branding.tagline
    })}
  </script>
</svelte:head>

{#if !isAdmin}
  <Navbar />
{/if}

<slot />

{#if !isAdmin}
  <Footer />
{/if}
