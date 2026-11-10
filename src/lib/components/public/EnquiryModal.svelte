<script lang="ts">
  // The quote form as a popup over the current page. Opened by "Begin Your
  // Journey" and by any plain click on a /plan-my-trip link (see the root
  // layout); answers are kept in the tab, so closing it loses nothing.
  import { tick } from 'svelte';
  import { afterNavigate } from '$app/navigation';
  import { enquiryHref, closeEnquiry } from '$lib/enquiry';
  import { loadPlanner } from '$lib/plannerEntry';
  import PlanMyTripForm from './PlanMyTripForm.svelte';

  let planner: Awaited<ReturnType<typeof loadPlanner>> | null = null;
  let shownFor = '';
  let opener: HTMLElement | null = null;
  let panel: HTMLDivElement;

  async function open(href: string) {
    shownFor = href;
    planner = null;
    opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const loaded = await loadPlanner(fetch, new URL(href, window.location.origin));
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
