<script lang="ts">
  /**
   * Month by month: twelve month buttons and, for the chosen month, what the
   * guide's month table says about it. Opens on the current month. Every
   * month's answer is also in the page as text, for readers without scripts
   * and for search engines (the hidden panels are not removed, only hidden).
   */
  import { ArrowRight } from '@lucide/svelte';
  import { MONTH_NAMES, type MonthEntry } from '$lib/guideLayout';

  export let months: (MonthEntry | null)[] = [];
  export let tip = '';
  export let adjName = '';
  export let planHref = '#plan';

  const SHORT = MONTH_NAMES.map((m) => m.slice(0, 3));
  let active = new Date().getMonth();
  $: if (!months[active]) active = Math.max(0, months.findIndex(Boolean));
</script>

<div>
  <div class="flex flex-wrap gap-2" role="tablist" aria-label="Choose a month">
    {#each SHORT as label, m (m)}
      <button
        type="button"
        role="tab"
        id={`month-tab-${m}`}
        aria-selected={active === m}
        aria-controls={`month-panel-${m}`}
        disabled={!months[m]}
        class={`h-10 min-w-[48px] border px-3 text-[13px] font-medium transition disabled:opacity-35 ${active === m ? 'border-deep-green bg-deep-green text-white' : 'border-ink/15 bg-white text-heading hover:border-ink/40'}`}
        on:click={() => (active = m)}
      >{label}</button>
    {/each}
  </div>

  {#each months as entry, m (m)}
    {#if entry}
      <div
        id={`month-panel-${m}`}
        role="tabpanel"
        aria-labelledby={`month-tab-${m}`}
        hidden={active !== m}
        class={`mt-5 border border-ink/10 bg-white sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] ${active === m ? 'grid' : 'hidden'}`}
      >
        <div class="border-b border-ink/10 p-5 sm:border-b-0 sm:border-r">
          <p class="dest-label">{MONTH_NAMES[m]}</p>
          <h3 class="mt-2 font-serif text-[22px] font-normal leading-tight text-heading">{entry.title}</h3>
          <p class="mt-1 text-[13px] text-ink/60">{entry.period}</p>
        </div>
        <div class="p-5">
          {#if entry.text}<p class="text-[15px] leading-[1.65] text-ink/80">{entry.text}</p>{/if}
          <a class="group mt-3 inline-flex items-center gap-1 text-[14px] font-semibold text-forest transition hover:text-heading" href={planHref}>
            Plan a {adjName} safari for {MONTH_NAMES[m]} <ArrowRight size={15} class="transition group-hover:translate-x-0.5" />
          </a>
        </div>
      </div>
    {/if}
  {/each}

  {#if tip}<p class="mt-4 text-[13px] leading-[1.6] text-ink/65"><span class="font-semibold text-heading">Guide’s tip:</span> {tip}</p>{/if}
</div>
