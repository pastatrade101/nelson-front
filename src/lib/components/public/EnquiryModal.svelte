<script lang="ts" context="module">
  import type { PlannerCatalog } from '$lib/tripPlanner';
  // The catalogue is fetched once per visit and shared by every opening.
  let catalogLoad: Promise<PlannerCatalog> | null = null;
  let loadedCatalog: PlannerCatalog | null = null;
</script>

<script lang="ts">
  // The quote form as a popup over the current page. Opened by "Begin Your
  // Journey" and by any plain click on a /plan-my-trip link (see the root
  // layout); answers are kept in the tab, so closing it loses nothing.
  //
  // The form opens at once: its steps need no server data. The catalogue
  // (trip ideas, prefill from a tour link) loads behind it, and a tour or
  // lodge on the current page is used directly.
  import { tick } from 'svelte';
  import { afterNavigate } from '$app/navigation';
  import { page } from '$app/stores';
  import { enquiryHref, closeEnquiry } from '$lib/enquiry';
  import { EMPTY_CATALOG, loadCatalog, loadPlanner, quickPlanner } from '$lib/plannerEntry';
  import PlanMyTripForm from './PlanMyTripForm.svelte';

  let planner: Awaited<ReturnType<typeof loadPlanner>> | null = null;
  let shownFor = '';
  let opener: HTMLElement | null = null;
  let panel: HTMLDivElement;

  const catalogue = () =>
    (catalogLoad ??= loadCatalog(fetch).then((c) => {
      // An outage is retried on the next opening rather than remembered.
      if (c.available) loadedCatalog = c;
      else catalogLoad = null;
      return c;
    }));

  async function open(href: string) {
    shownFor = href;
    planner = null;
    opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const url = new URL(href, window.location.origin);
    const here = { tour: $page.data?.tour, lodge: $page.data?.lodge };
    const quick = quickPlanner(url, loadedCatalog ?? EMPTY_CATALOG, here);
    const pending = loadedCatalog ? null : catalogue();
    if (quick) {
      planner = quick;
      await tick();
      panel?.focus();
      // Trip ideas arrive when the catalogue does; the form keeps its answers.
      const full = await pending;
      if (full && shownFor === href && planner) {
        const extra = planner.catalog.tours.filter((t) => !full.tours.some((f) => f.id === t.id));
        planner = { ...planner, catalog: { ...full, tours: [...full.tours, ...extra] } };
      }
      return;
    }
    // A tour or lodge named only by its address: look it up before the form starts from it.
    const loaded = await loadPlanner(fetch, url, (await pending) ?? loadedCatalog ?? undefined);
    if (shownFor !== href) return;
    planner = loaded;
    await tick();
    panel?.focus();
  }

  $: if ($enquiryHref && $enquiryHref !== shownFor) void open($enquiryHref);
  $: if (!$enquiryHref && shownFor) {
    shownFor = '';
    opener?.focus();
  }

  // Lock background scroll while the popup is open.
  $: if (typeof document !== 'undefined') document.body.style.overflow = $enquiryHref ? 'hidden' : '';

  // A link followed from inside the popup (a trip idea, the confirmation) closes it.
  afterNavigate(() => {
    if ($enquiryHref) closeEnquiry();
  });

  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && $enquiryHref) closeEnquiry();
  };
</script>

<svelte:window on:keydown={onKeydown} />

{#if $enquiryHref}
  <!-- data-lenis-prevent keeps the smooth-scroll engine off the popup + backdrop -->
  <div class="fixed inset-0 z-[100] overflow-y-auto overscroll-contain" role="dialog" aria-modal="true" aria-label="Request a free safari quote" data-lenis-prevent>
    <button class="fixed inset-0 cursor-default bg-ink/70 backdrop-blur-sm" type="button" tabindex="-1" aria-label="Close" on:click={closeEnquiry}></button>
    <div class="pointer-events-none relative flex min-h-full items-start justify-center sm:p-6 md:items-center">
      <div class="pointer-events-auto relative min-h-[100svh] w-full max-w-[860px] bg-surface shadow-[0_28px_90px_rgba(0,0,0,0.35)] outline-none sm:min-h-0" bind:this={panel} tabindex="-1">
        {#if planner}
          {#key shownFor}
            <PlanMyTripForm catalog={planner.catalog} entry={planner.entry} variant="modal" onClose={closeEnquiry} />
          {/key}
        {:else}
          <div class="flex min-h-[320px] items-center justify-center text-sm text-ink/60" role="status">Opening your quote request…</div>
        {/if}
      </div>
    </div>
  </div>
{/if}
