<script lang="ts">
  import { Compass, HeartHandshake, ShieldCheck, UserCheck } from '@lucide/svelte';
  import { revealHeading } from '$lib/animations';
  import PlanMyTripForm from '$lib/components/public/PlanMyTripForm.svelte';
  import PlanningProcess from '$lib/components/public/PlanningProcess.svelte';

  const assurances = [
    { icon: ShieldCheck, title: 'Honest, local expertise', text: 'Advice from people who live and guide in Tanzania every day.' },
    { icon: Compass, title: 'Tailored to you', text: 'A plan shaped around your dates, budget, and travel style.' },
    { icon: HeartHandshake, title: 'No pressure, no payment yet', text: 'This is a planning request — you decide if and when to book.' },
    { icon: UserCheck, title: 'Human review', text: 'Every request is reviewed by a local specialist before confirmation.' }
  ];

  const planningSteps = [
    { title: 'Tell us your travel idea', text: 'Share your dates, budget, destination, and what you dream of doing.' },
    { title: 'We review the details', text: 'A local specialist checks availability, season, route, and realistic options.' },
    { title: 'You receive a tailored plan', text: 'We suggest the best route, stays, activities, and next steps.' },
    { title: 'You decide', text: 'No pressure. You only book when the plan feels right.' }
  ];
</script>

<svelte:head>
  <title>Plan Your Tanzania Safari | Emnel Adventures</title>
  <meta name="description" content="Plan a private Tanzania safari with a local specialist. Tell us your dates and rough budget and we will come back with an honest plan." />
</svelte:head>


<section class="container-shell grid items-start gap-10 py-12 lg:grid-cols-[0.85fr_1.15fr] lg:py-16">
  <aside class="lg:sticky lg:top-24">
    <p class="font-serif text-xl italic text-clay">Plan My Safari</p>
    <h1 class="mt-2 text-3xl font-bold leading-tight tracking-normal text-heading md:text-4xl" use:revealHeading>Plan your Tanzania safari with confidence</h1>
    <p class="mt-3 text-base leading-7 text-ink/70">
      Tell us what you have in mind and an Emnel safari specialist will craft a confident, honest plan — whether it's a private safari, a Kilimanjaro climb, or a bush-and-beach escape in Zanzibar.
    </p>


    <div class="mt-8 grid gap-4">
      {#each assurances as item}
        {@const Icon = item.icon}
        <div class="flex items-start gap-3 rounded-2xl border border-ink/10 bg-surface p-4 shadow-soft">
          <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-forest/10 text-forest"><Icon size={19} /></span>
          <div>
            <p class="font-semibold text-ink">{item.title}</p>
            <p class="mt-0.5 text-sm leading-6 text-ink/70">{item.text}</p>
          </div>
        </div>
      {/each}
    </div>

    <div class="mt-8 rounded-2xl border border-ink/10 bg-surface p-5 shadow-soft">
      <PlanningProcess compact title="How planning works" steps={planningSteps} />
    </div>
  </aside>

  <div>
    <PlanMyTripForm />
  </div>
</section>
