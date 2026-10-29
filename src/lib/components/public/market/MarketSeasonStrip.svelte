<script lang="ts">
  // "When to go" — bordered cards with gold serif months.
  // REAL DATA ONLY: the mockup's SEASON_MONTHS_* / SEASON_* placeholders are NOT
  // reproduced. Every season is an admin-entered row; a row renders only the
  // fields that were actually filled in, and the section hides entirely when no
  // seasons exist. The trailing note is optional and never defaulted.
  export let eyebrow = '';
  export let title = '';
  export let intro = '';
  export let seasons: { months?: string; label?: string; body?: string }[] = [];
  export let note = '';

  $: shown = (seasons ?? []).filter((season) => season && (season.months || season.label || season.body));

  // Full literal class strings so Tailwind's scanner keeps them.
  const colsFor = (n: number): string =>
    n <= 1 ? '' : n === 2 ? 'sm:grid-cols-2' : n === 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-4';
  $: gridClass = colsFor(shown.length);
</script>

{#if shown.length}
  <section class="bg-canvas py-12 md:py-16">
    <div class="container-shell">
      {#if eyebrow || title || intro}
        <div class="max-w-[820px]">
          {#if eyebrow}
            <p class="brand-eyebrow">{eyebrow}</p>
          {/if}
          {#if title}
            <h2 class="type-h2 mt-4 text-heading">{title}</h2>
          {/if}
          {#if intro}
            <p class="mt-5 text-base leading-[1.75] text-ink/70">{intro}</p>
          {/if}
        </div>
      {/if}

      <div class={`mt-10 grid gap-4 ${gridClass}`}>
        {#each shown as season}
          <div class="flex flex-col border border-ink/10 bg-surface p-6 md:p-7">
            {#if season.months}
              <p class="font-serif text-[26px] font-light leading-none text-goldfinch-gold md:text-[30px]">{season.months}</p>
            {/if}
            {#if season.label}
              <p class="eyebrow mt-4 text-heading">{season.label}</p>
            {/if}
            {#if season.body}
              <p class="mt-3 text-base leading-[1.75] text-ink/70">{season.body}</p>
            {/if}
          </div>
        {/each}
      </div>

      {#if note}
        <p class="mt-8 border-l-2 border-goldfinch-gold pl-5 text-base leading-[1.75] text-ink/65">{note}</p>
      {/if}
    </div>
  </section>
{/if}
