<script lang="ts">
  import { page } from '$app/stores';
  import TourForm from '$lib/components/admin/TourForm.svelte';
  import ItineraryDaysManager from '$lib/components/admin/ItineraryDaysManager.svelte';

  $: tourId = $page.params.id;
</script>

<TourForm mode="edit" {tourId} />

{#if tourId}
  <!-- Itinerary lives right here in the tour editor — no separate page hunt. -->
  <div class="mx-auto mt-6 w-full max-w-[1500px]">
    <section id="itinerary" class="rounded-none border border-ink/10 bg-surface p-5 shadow-[0_18px_50px_rgba(28,26,22,0.06)] md:p-6">
      <ItineraryDaysManager {tourId} />
    </section>
  </div>
{/if}
