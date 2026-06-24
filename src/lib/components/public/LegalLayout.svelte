<script lang="ts">
  import { ArrowRight } from '@lucide/svelte';
  import { revealHeading } from '$lib/animations';

  export let eyebrow = 'Legal';
  export let title: string;
  export let intro = '';
  export let updated = '';
</script>

<section class="relative overflow-hidden bg-gradient-to-br from-deep-green via-forest to-deep-green text-white">
  <div class="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-goldfinch-gold/20 blur-3xl"></div>
  <div class="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-savanna/15 blur-3xl"></div>
  <div class="container-shell relative py-14 md:py-20">
    <p class="font-serif text-xl italic text-savanna">{eyebrow}</p>
    <h1 class="mt-3 max-w-3xl text-3xl font-extrabold leading-[1.1] tracking-tight md:text-5xl" use:revealHeading>{title}</h1>
    {#if intro}
      <p class="mt-4 max-w-2xl text-[15px] leading-7 text-white/75 md:text-lg">{intro}</p>
    {/if}
    {#if updated}
      <p class="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-savanna/70">Last updated · {updated}</p>
    {/if}
  </div>
</section>

<section class="container-shell py-12 md:py-16">
  <div class="legal-prose mx-auto max-w-3xl rounded-[12px] border border-ink/10 bg-surface p-6 shadow-[0_14px_40px_rgba(15,47,36,0.06)] md:p-10">
    <slot />
  </div>

  <div class="mx-auto mt-8 flex max-w-3xl flex-col items-start justify-between gap-3 rounded-[12px] border border-forest/15 bg-forest/[0.04] p-5 sm:flex-row sm:items-center">
    <p class="text-sm leading-6 text-ink/70">Questions about this policy? A Goldfinch specialist is happy to help.</p>
    <a class="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-forest px-5 text-sm font-bold text-white transition hover:bg-deep-green" href="/contact">
      Contact us <ArrowRight size={16} />
    </a>
  </div>
</section>

<style>
  .legal-prose :global(h2) {
    margin-top: 2rem;
    font-size: 1.25rem;
    font-weight: 800;
    color: rgb(var(--c-deep-green));
    letter-spacing: -0.01em;
  }
  .legal-prose :global(h2:first-child) {
    margin-top: 0;
  }
  .legal-prose :global(h3) {
    margin-top: 1.4rem;
    font-size: 1rem;
    font-weight: 700;
    color: rgb(var(--c-ink));
  }
  .legal-prose :global(p) {
    margin-top: 0.75rem;
    font-size: 0.95rem;
    line-height: 1.7;
    color: rgb(var(--c-ink) / 0.72);
  }
  .legal-prose :global(ul) {
    margin-top: 0.75rem;
    display: grid;
    gap: 0.5rem;
    padding-left: 1.1rem;
    list-style: disc;
  }
  .legal-prose :global(li) {
    font-size: 0.95rem;
    line-height: 1.65;
    color: rgb(var(--c-ink) / 0.72);
  }
  .legal-prose :global(strong) {
    font-weight: 700;
    color: rgb(var(--c-ink));
  }
  .legal-prose :global(a) {
    font-weight: 600;
    color: rgb(var(--c-forest));
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .legal-prose :global(hr) {
    margin: 1.75rem 0;
    border: 0;
    border-top: 1px solid rgb(var(--c-ink) / 0.1);
  }
</style>
