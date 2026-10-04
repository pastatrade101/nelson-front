<script lang="ts">
  import PlanMyTripForm from '$lib/components/public/PlanMyTripForm.svelte';
  import type { PageData } from './$types';
  export let data: PageData;
</script>
<svelte:head>
  <title>Plan your tailor-made safari | Emnel Adventures</title>
  <meta name="description" content="Build your safari brief with Emnel Adventures. Share your travel style, dates, group, budget and ideas with our Tanzania team. No payment required." />
  <link rel="canonical" href="https://www.emneladventures.com/plan-my-trip" />
</svelte:head>
<section class="bg-savanna/35">
  <div class="container-shell py-10 md:py-16">
    <header class="mb-8 max-w-3xl md:mb-10">
      <p class="text-[11px] font-semibold uppercase tracking-[0.25em] text-clay">Your journey, your way</p>
      <h1 class="mt-3 font-serif text-4xl font-normal leading-tight text-heading md:text-6xl">A remarkable trip starts with you.</h1>
      <p class="mt-4 max-w-2xl text-base leading-7 text-ink/70">A few thoughtful choices. One personal travel brief. Tell our local team what matters, and we’ll help shape the details.</p>
    </header>
    <PlanMyTripForm catalog={data.catalog} entry={data.entry} />
  </div>
</section>
