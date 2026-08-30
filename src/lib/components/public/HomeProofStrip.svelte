<script lang="ts">
  import { Handshake, MapPin, Route, ShieldCheck } from '@lucide/svelte';

  const proof = [
    {
      icon: ShieldCheck,
      title: '100% private safaris',
      text: 'Your vehicle, guide and daily pace are yours.'
    },
    {
      icon: MapPin,
      title: 'Tanzania-based team',
      text: 'Planned and operated from Arusha since 2016.'
    },
    {
      icon: Route,
      title: 'Tailor-made routes',
      text: 'Dates, lodges and parks shaped around you.'
    },
    {
      icon: Handshake,
      title: 'Direct local expertise',
      text: 'Plan with the people who run your safari.'
    }
  ];
</script>

<section class="border-y border-ink/10 bg-surface" aria-label="Why plan with Emnel Adventures">
  <div class="mx-auto grid max-w-[1500px] sm:grid-cols-2 lg:grid-cols-4">
    {#each proof as item}
      {@const Icon = item.icon}
      <article class="flex min-h-[118px] items-start gap-4 border-b border-ink/[0.08] px-5 py-6 sm:border-r lg:border-b-0 lg:px-7">
        <span class="grid h-10 w-10 shrink-0 place-items-center bg-goldfinch-gold/12 text-goldfinch-gold">
          <Icon size={19} strokeWidth={2.1} />
        </span>
        <div>
          <h2 class="text-[12px] font-bold uppercase tracking-[0.14em] text-heading">{item.title}</h2>
          <p class="mt-1.5 text-[13px] font-medium leading-5 text-ink/62">{item.text}</p>
        </div>
      </article>
    {/each}
  </div>
</section>
