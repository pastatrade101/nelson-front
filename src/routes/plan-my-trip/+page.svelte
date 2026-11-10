<script lang="ts">
  import PlanMyTripForm from '$lib/components/public/PlanMyTripForm.svelte';
  import type { PageData } from './$types';
  export let data: PageData;
</script>
<svelte:head>
  <title>Request a free tailor-made safari quote | Emnel Adventures</title>
  <meta name="description" content="Request a free, tailor-made safari quote from Emnel Adventures in four quick steps: your trip, travellers, budget and contact details. No obligation to book." />
  <link rel="canonical" href="https://www.emneladventures.com/plan-my-trip" />
</svelte:head>
<section class="bg-savanna/35">
  <div class="container-shell py-10 md:py-16">
    <header class="mb-8 max-w-3xl md:mb-10">
      <p class="eyebrow text-clay">Your journey, your way</p>
      <h1 class="type-h1 mt-3 text-heading">A remarkable trip starts with you.</h1>
      <p class="type-lead mt-4 max-w-2xl text-ink/70">Four quick steps to a free, tailor-made quote from our local team. There is no obligation to book.</p>
    </header>
    <PlanMyTripForm catalog={data.catalog} entry={data.entry} />
  </div>
</section>
