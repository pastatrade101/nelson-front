<script lang="ts">
  import BeginJourneyForm from '$lib/components/public/BeginJourneyForm.svelte';
</script>

<svelte:head>
  <title>Begin Your Journey — Tailor-Made Safari Enquiry | Emnel Adventures</title>
  <meta
    name="description"
    content="Answer a few quick questions and a local Emnel specialist will design a private, tailor-made Tanzania safari around you — no payment needed to start."
  />
</svelte:head>

<section class="relative min-h-[100svh] overflow-hidden bg-deep-green text-white">
  <div class="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-goldfinch-gold/10 blur-3xl"></div>
  <div class="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-savanna/10 blur-3xl"></div>

  <div class="container-shell relative py-12 md:py-16">
    <div class="mx-auto mb-8 max-w-2xl text-center">
      <p class="text-[12px] font-bold uppercase tracking-[0.2em] text-goldfinch-gold">Begin your journey</p>
      <h1 class="mt-3 font-serif text-3xl font-light leading-[1.1] md:text-5xl">A few quick questions</h1>
      <p class="mt-4 text-base leading-8 text-white/80">
        Tell us the essentials and a local specialist will shape a private Tanzania safari around your dates, budget and
        travel style. It takes about a minute — and there's no payment to start.
      </p>
    </div>

    <BeginJourneyForm />
  </div>
</section>
