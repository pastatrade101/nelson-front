<script lang="ts">
  import { ArrowRight, Compass, HeartHandshake, ShieldCheck, Sparkles, UserCheck } from '@lucide/svelte';
  import { openAiAdvisor } from '$lib/aiAdvisor';
  import { revealHeading } from '$lib/animations';
  import PlanMyTripForm from '$lib/components/public/PlanMyTripForm.svelte';
  import PlanningProcess from '$lib/components/public/PlanningProcess.svelte';
  import { aiAdvisorEnabled, publicSettings } from '$lib/settings';

  $: aiOn = aiAdvisorEnabled($publicSettings);

  const assurances = [
    { icon: ShieldCheck, title: 'Honest, local expertise', text: 'Advice from people who live and travel East Africa every day.' },
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

<section class="container-shell grid items-start gap-10 py-12 lg:grid-cols-[0.85fr_1.15fr] lg:py-16">
  <aside class="lg:sticky lg:top-24">
    <p class="font-serif text-xl italic text-clay">Plan My Trip</p>
    <h1 class="mt-2 text-3xl font-bold leading-tight tracking-normal text-heading md:text-4xl" use:revealHeading>Plan East Africa with confidence</h1>
    <p class="mt-3 text-base leading-7 text-ink/70">
      Tell us what you have in mind and a Goldfinch travel specialist will craft a confident, honest plan — whether it's a safari, Kilimanjaro climb, gorilla trek, or a beach escape in Zanzibar.
    </p>

    <!-- Natural bridge to the AI advisor (same pipeline — it can start the very
         same booking request, then a specialist confirms). Hidden when the AI
         advisor is turned off in admin settings. -->
    {#if aiOn}
      <button
        type="button"
        on:click={() => openAiAdvisor()}
        class="group mt-5 flex w-full items-center gap-3 rounded-2xl border border-forest/25 bg-forest/[0.04] p-4 text-left transition hover:bg-forest/[0.08]"
      >
        <span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-deep-green text-white"><Sparkles size={19} strokeWidth={2.4} /></span>
        <span class="min-w-0">
          <span class="flex items-center gap-1 font-bold text-heading">
            Prefer to chat? Ask our AI advisor
            <ArrowRight size={15} strokeWidth={2.6} class="transition-transform group-hover:translate-x-0.5" />
          </span>
          <span class="mt-0.5 block text-sm leading-6 text-ink/60">Get instant trip suggestions and start your request in a couple of minutes — a specialist still reviews and confirms.</span>
        </span>
      </button>

      <p class="mt-4 text-xs font-medium uppercase tracking-[0.14em] text-ink/40">Or fill the form — whichever you prefer</p>
    {/if}

    <div class="mt-8 grid gap-4">
      {#each assurances as item}
        {@const Icon = item.icon}
        <div class="flex items-start gap-3 rounded-2xl border border-ink/10 bg-surface p-4 shadow-soft">
          <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-forest/10 text-forest"><Icon size={19} /></span>
          <div>
            <p class="font-semibold text-ink">{item.title}</p>
            <p class="mt-0.5 text-sm leading-6 text-ink/60">{item.text}</p>
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
