<script lang="ts">
  import { Compass, HeartHandshake, ShieldCheck } from '@lucide/svelte';
  import { revealHeading } from '$lib/animations';
  import PlanMyTripForm from '$lib/components/public/PlanMyTripForm.svelte';
  import PlanningProcess from '$lib/components/public/PlanningProcess.svelte';

  const assurances = [
    { icon: ShieldCheck, title: 'Honest, local expertise', text: 'Advice from people who live and travel East Africa every day.' },
    { icon: Compass, title: 'Tailored to you', text: 'A plan shaped around your dates, budget, and travel style.' },
    { icon: HeartHandshake, title: 'No pressure, no payment yet', text: 'This is a planning request — you decide if and when to book.' }
  ];
</script>

<section class="container-shell grid items-start gap-10 py-12 lg:grid-cols-[0.85fr_1.15fr] lg:py-16">
  <aside class="lg:sticky lg:top-24">
    <p class="font-serif text-xl italic text-clay">Plan My Trip</p>
    <h1 class="mt-2 text-3xl font-bold leading-tight tracking-normal text-deep-green md:text-4xl" use:revealHeading>Plan East Africa with confidence</h1>
    <p class="mt-3 text-base leading-7 text-ink/70">
      Tell us what you have in mind and a Goldfinch travel specialist will craft a confident, honest plan — whether it's a safari, Kilimanjaro climb, gorilla trek, or a beach escape in Zanzibar.
    </p>

    <div class="mt-8 grid gap-4">
      {#each assurances as item}
        {@const Icon = item.icon}
        <div class="flex items-start gap-3 rounded-2xl border border-ink/10 bg-white p-4 shadow-soft">
          <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-forest/10 text-forest"><Icon size={19} /></span>
          <div>
            <p class="font-semibold text-ink">{item.title}</p>
            <p class="mt-0.5 text-sm leading-6 text-ink/60">{item.text}</p>
          </div>
        </div>
      {/each}
    </div>

    <div class="mt-8 rounded-2xl border border-ink/10 bg-white p-5 shadow-soft">
      <PlanningProcess compact title="How planning works" />
    </div>
  </aside>

  <div>
    <PlanMyTripForm />
  </div>
</section>
