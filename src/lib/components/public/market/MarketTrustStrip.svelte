<script lang="ts">
  // Bordered reassurance band ("licensed operator", "24/7 support", …).
  // REAL DATA ONLY: labels come from a CMS field an admin fills in — there are
  // no defaults and no examples. Empty in, nothing out.
  export let items: { label: string }[] = [];

  // Drop blanks so a half-filled admin row never renders an empty column.
  $: shown = (items ?? []).filter((item) => item && typeof item.label === 'string' && item.label.trim()).slice(0, 5);

  // Full literal class strings so Tailwind's scanner keeps them.
  const colsFor = (n: number): string =>
    n <= 1
      ? ''
      : n === 2
        ? 'sm:grid-cols-2'
        : n === 3
          ? 'sm:grid-cols-3'
          : n === 4
            ? 'sm:grid-cols-2 lg:grid-cols-4'
            : 'sm:grid-cols-2 lg:grid-cols-5';
  $: gridClass = colsFor(shown.length);
</script>

{#if shown.length}
  <section class="border-y border-ink/10 bg-sand">
    <div class="container-shell">
      <ul class={`grid gap-px bg-ink/10 ${gridClass}`}>
        {#each shown as item}
          <li class="flex items-center justify-center gap-3 bg-sand px-5 py-6 text-center md:py-7">
            <span class="h-1.5 w-1.5 shrink-0 bg-goldfinch-gold" aria-hidden="true"></span>
            <span class="text-[11px] font-bold uppercase leading-5 tracking-[0.16em] text-heading">{item.label}</span>
          </li>
        {/each}
      </ul>
    </div>
  </section>
{/if}
