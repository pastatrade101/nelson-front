<script lang="ts">
  // Reusable "how planning works" process (spec §5). `compact` renders a tight
  // vertical timeline for sidebars; the default renders a homepage-width row.
  export let title = '';
  export let subtitle = '';
  export let compact = false;

  type Step = { title: string; text: string };
  const defaultSteps: Step[] = [
    { title: 'Tell us your travel idea', text: 'Share your dates, budget and what you dream of doing.' },
    { title: 'We review the details', text: 'We look at your timing, budget and preferences — honestly.' },
    { title: 'We suggest the best-fit trip', text: 'A tailored itinerary shaped around you, not a fixed package.' },
    { title: 'You refine it with a specialist', text: 'Adjust pace, lodges and activities until it feels right.' },
    { title: 'You confirm when ready', text: 'No pressure, no payment to start — you decide if and when.' }
  ];

  // Callers can pass a tailored set (e.g. the Plan My Trip sidebar); defaults
  // keep every existing usage unchanged.
  export let steps: Step[] = defaultSteps;
</script>

{#if compact}
  <div class="grid gap-3">
    {#if title}<p class="text-[11px] font-bold uppercase tracking-[0.16em] text-goldfinch-gold">{title}</p>{/if}
    <ol class="relative grid gap-4 border-l border-ink/10 pl-6">
      {#each steps as step, i}
        <li class="relative">
          <span class="absolute -left-[31px] grid h-6 w-6 place-items-center rounded-full bg-forest text-[11px] font-bold text-white ring-4 ring-white">{i + 1}</span>
          <p class="text-sm font-semibold text-ink">{step.title}</p>
          <p class="mt-0.5 text-xs leading-5 text-ink/70">{step.text}</p>
        </li>
      {/each}
    </ol>
  </div>
{:else}
  <div class="text-center">
    {#if title}<h2 class="text-3xl font-bold tracking-normal text-ink md:text-4xl">{title}</h2>{/if}
    {#if subtitle}<p class="mx-auto mt-3 max-w-2xl text-base leading-7 text-ink/65">{subtitle}</p>{/if}
    <ol class="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
      {#each steps as step, i}
        <li class="relative flex flex-col items-center text-center lg:items-start lg:text-left">
          <span class="grid h-12 w-12 place-items-center rounded-2xl bg-goldfinch-gold text-lg font-extrabold text-heading shadow-sm">{i + 1}</span>
          <p class="mt-4 font-bold text-heading">{step.title}</p>
          <p class="mt-1 text-sm leading-6 text-ink/70">{step.text}</p>
        </li>
      {/each}
    </ol>
  </div>
{/if}
