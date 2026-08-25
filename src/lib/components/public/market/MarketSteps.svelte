<script lang="ts">
  import { ArrowRight } from '@lucide/svelte';
  import { trackEvent } from '$lib/analytics';

  // Numbered "How it works" row with big gold serif numerals and an optional
  // centred CTA.
  // REAL DATA ONLY: steps are admin-entered; nothing is defaulted. The CTA only
  // renders when BOTH a label and an href have been supplied.
  export let eyebrow = '';
  export let title = '';
  export let steps: { title?: string; body?: string }[] = [];
  export let ctaLabel = '';
  export let ctaHref = '';

  $: shown = (steps ?? []).filter((step) => step && (step.title || step.body));

  // Full literal class strings so Tailwind's scanner keeps them.
  const colsFor = (n: number): string =>
    n <= 1 ? '' : n === 2 ? 'sm:grid-cols-2' : n === 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-4';
  $: gridClass = colsFor(shown.length);

  const index = (i: number): string => String(i + 1).padStart(2, '0');

  const handleCta = (): void =>
    trackEvent('cta_click', {
      cta_name: ctaLabel,
      cta_type: 'link',
      cta_location: 'market_steps',
      page_section: title || 'how_it_works'
    });
</script>

{#if shown.length}
  <section class="bg-canvas py-12 md:py-16">
    <div class="container-shell">
      {#if eyebrow || title}
        <div class="max-w-[820px]">
          {#if eyebrow}
            <p class="brand-eyebrow">{eyebrow}</p>
          {/if}
          {#if title}
            <h2 class="mt-4 font-serif text-[32px] font-light leading-[1.1] text-heading md:text-[44px]">{title}</h2>
          {/if}
        </div>
      {/if}

      <ol class={`mt-10 grid gap-8 ${gridClass}`}>
        {#each shown as step, i}
          <li class="border-t border-goldfinch-gold/40 pt-6">
            <span class="block font-serif text-[44px] font-light leading-none text-goldfinch-gold md:text-[56px]" aria-hidden="true">
              {index(i)}
            </span>
            {#if step.title}
              <h3 class="mt-5 font-serif text-[21px] font-light leading-snug text-heading md:text-[23px]">{step.title}</h3>
            {/if}
            {#if step.body}
              <p class="mt-3 text-[14.5px] leading-7 text-ink/70">{step.body}</p>
            {/if}
          </li>
        {/each}
      </ol>

      {#if ctaLabel && ctaHref}
        <div class="mt-12 flex justify-center">
          <a
            class="inline-flex h-[52px] items-center gap-2 bg-deep-green px-8 text-[12px] font-bold uppercase tracking-[0.18em] text-white transition hover:bg-forest"
            href={ctaHref}
            on:click={handleCta}
          >
            {ctaLabel}
            <ArrowRight size={16} strokeWidth={2.5} />
          </a>
        </div>
      {/if}
    </div>
  </section>
{/if}
