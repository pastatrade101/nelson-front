<script lang="ts">
  /**
   * The site's error page. For a missing page it never dead-ends: it offers the
   * real pages closest to the address that was asked for (an old link, a typo,
   * an address a chatbot made up), then the main hubs. The status stays a real
   * 404 — SvelteKit sets it — so search engines drop the dead address.
   */
  import { onMount } from 'svelte';
  import { ArrowRight } from '@lucide/svelte';
  import { page } from '$app/stores';
  import { KIND_LABEL, loadSitePages, rankSuggestions, type SitePage } from '$lib/siteIndex';

  $: status = $page.status;
  $: notFound = status === 404;

  const HUBS = [
    { label: 'Safaris', href: '/tours' },
    { label: 'Travel styles', href: '/travel-styles' },
    { label: 'Destinations', href: '/destinations' },
    { label: 'Accommodation', href: '/accommodation' },
    { label: 'Plan my trip', href: '/plan-my-trip' }
  ];

  let suggestions: SitePage[] = [];
  let looked = false;
  onMount(async () => {
    if ($page.status !== 404) return;
    try {
      const { pages } = await loadSitePages(fetch);
      suggestions = rankSuggestions($page.url.pathname, pages, 4);
    } catch {
      suggestions = [];
    } finally {
      looked = true;
    }
  });
</script>

<svelte:head>
  <title>{notFound ? 'Page not found' : 'Something went wrong'} | Emnel Adventures</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<section class="bg-canvas py-20 md:py-28">
  <div class="container-shell grid gap-12 lg:grid-cols-12 lg:gap-16">
    <div class="lg:col-span-5">
      <p class="text-[11px] font-medium uppercase tracking-[0.26em] text-clay">{notFound ? 'Error 404' : `Error ${status}`}</p>
      <h1 class="mt-4 font-serif text-[36px] font-light leading-[1.08] text-heading md:text-[52px]">
        {notFound ? 'This page has moved, or never existed' : 'Something went wrong on our side'}
      </h1>
      <p class="mt-6 max-w-[48ch] text-[16px] leading-8 text-ink/70">
        {#if notFound}
          The address may be old or mistyped. The pages below are the closest matches we have — or start from one of the main sections.
        {:else}
          Please try again in a moment. If it keeps happening, the sections below will still get you where you were going.
        {/if}
      </p>
      <a class="mt-9 inline-flex h-12 items-center gap-2 bg-deep-green px-7 text-sm font-semibold text-white transition hover:bg-forest" href="/">
        Back to the home page <ArrowRight size={16} />
      </a>
    </div>

    <div class="lg:col-span-7">
      {#if notFound && suggestions.length}
        <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-heading">Did you mean</p>
        <ul class="mt-4 divide-y divide-ink/10 border-y border-ink/10">
          {#each suggestions as s (s.href)}
            <li>
              <a class="group flex items-center justify-between gap-6 py-5 transition hover:bg-linen/40" href={s.href}>
                <span class="min-w-0">
                  <span class="block text-[11px] font-semibold uppercase tracking-[0.18em] text-clay">{KIND_LABEL[s.kind]}</span>
                  <span class="mt-1 block truncate font-serif text-[22px] leading-snug text-heading">{s.title}</span>
                </span>
                <ArrowRight size={18} class="shrink-0 text-ink/30 transition group-hover:translate-x-0.5 group-hover:text-deep-green" />
              </a>
            </li>
          {/each}
        </ul>
      {:else if notFound && !looked}
        <p class="border-y border-ink/10 py-8 text-sm text-ink/50">Looking for the closest pages…</p>
      {/if}

      <p class={`text-[11px] font-semibold uppercase tracking-[0.2em] text-heading ${notFound && (suggestions.length || !looked) ? 'mt-12' : ''}`}>Main sections</p>
      <ul class="mt-4 flex flex-wrap gap-x-7 gap-y-3">
        {#each HUBS as hub (hub.href)}
          <li>
            <a class="inline-flex items-center gap-1.5 border-b border-deep-green/30 pb-0.5 text-sm font-semibold text-deep-green transition hover:border-deep-green" href={hub.href}>
              {hub.label} <ArrowRight size={14} />
            </a>
          </li>
        {/each}
      </ul>
    </div>
  </div>
</section>
