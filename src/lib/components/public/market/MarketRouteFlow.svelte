<script lang="ts">
  // Dark routing band — a centred vertical flow of stops joined by gold
  // connectors, followed by a two-column grid of notes.
  // REAL DATA ONLY: stops and notes are admin-entered. The mockup's
  // AIRLINE_ROUTING_DETAIL placeholder is deliberately NOT reproduced — when an
  // admin has entered no routing, this section renders nothing at all.
  export let stops: string[] = [];
  export let notes: { title?: string; body?: string }[] = [];
  export let eyebrow = '';
  export let title = '';
  export let intro = '';

  $: shownStops = (stops ?? []).filter((stop) => typeof stop === 'string' && stop.trim());
  $: shownNotes = (notes ?? []).filter((note) => note && (note.title || note.body));
</script>

{#if shownStops.length || shownNotes.length}
  <section class="bg-deep-green py-16 text-white md:py-24">
    <div class="container-shell">
      {#if eyebrow || title || intro}
        <div class="mx-auto max-w-[760px] text-center">
          {#if eyebrow}
            <p class="brand-eyebrow">{eyebrow}</p>
          {/if}
          {#if title}
            <h2 class="mt-4 font-serif text-[32px] font-light leading-[1.1] text-white md:text-[44px]">{title}</h2>
          {/if}
          {#if intro}
            <p class="mt-5 text-[15px] leading-8 text-white/70">{intro}</p>
          {/if}
        </div>
      {/if}

      {#if shownStops.length}
        <ol class="mx-auto mt-12 flex max-w-[640px] flex-col items-center">
          {#each shownStops as stop, i}
            <li class="flex w-full flex-col items-center">
              {#if i > 0}
                <span class="h-10 w-px bg-goldfinch-gold/55" aria-hidden="true"></span>
              {/if}
              <span
                class="w-full border border-goldfinch-gold/35 bg-white/[0.05] px-6 py-4 text-center font-serif text-[20px] font-light leading-snug text-white md:text-[24px]"
              >
                {stop}
              </span>
            </li>
          {/each}
        </ol>
      {/if}

      {#if shownNotes.length}
        <div class="mt-14 grid gap-4 md:grid-cols-2">
          {#each shownNotes as note}
            <div class="border border-white/15 p-6 md:p-7">
              {#if note.title}
                <h3 class="font-serif text-[20px] font-light leading-snug text-white">{note.title}</h3>
              {/if}
              {#if note.body}
                <p class="mt-3 text-[14.5px] leading-7 text-white/70">{note.body}</p>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </section>
{/if}
