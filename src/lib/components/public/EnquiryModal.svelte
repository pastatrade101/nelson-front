<script lang="ts">
  import { enquiryOpen, closeEnquiry } from '$lib/enquiry';
  import BeginJourneyForm from './BeginJourneyForm.svelte';

  // Lock background scroll while the modal is open.
  $: if (typeof document !== 'undefined') {
    document.body.style.overflow = $enquiryOpen ? 'hidden' : '';
  }

  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && $enquiryOpen) closeEnquiry();
  };
</script>

<svelte:window on:keydown={onKeydown} />

{#if $enquiryOpen}
  <!-- data-lenis-prevent keeps the smooth-scroll engine off the modal + backdrop -->
  <div class="fixed inset-0 z-[100] overflow-y-auto overscroll-contain" role="dialog" aria-modal="true" aria-label="Begin your journey" data-lenis-prevent>
    <button class="fixed inset-0 cursor-default bg-ink/70 backdrop-blur-sm" type="button" aria-label="Close" on:click={closeEnquiry}></button>
    <div class="relative flex min-h-full items-start justify-center p-4 md:items-center md:p-6">
      <!-- keyed so each open starts a fresh wizard -->
      {#key $enquiryOpen}
        <BeginJourneyForm onClose={closeEnquiry} />
      {/key}
    </div>
  </div>
{/if}
