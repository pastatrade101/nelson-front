<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowRight } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import { revealHeading, staggeredCardReveal, tilt } from '$lib/animations';
  import { COMPARISONS } from '$lib/data/comparisons';
  import type { Comparison } from '$lib/types';

  type Card = { slug: string; eyebrow: string; title: string; intro: string };

  let items: Card[] = COMPARISONS.map((c) => ({ slug: c.slug, eyebrow: c.eyebrow, title: c.title, intro: c.intro }));

  onMount(async () => {
    try {
      const res = await api.comparisons.list({ status: 'published', limit: 100 });
      const rows = res.data.items as Comparison[];
      if (rows.length) items = rows.map((c) => ({ slug: c.slug, eyebrow: c.eyebrow ?? '', title: c.title, intro: c.intro ?? '' }));
    } catch {
      // keep config fallback
    }
  });
</script>

<section class="relative overflow-hidden bg-gradient-to-br from-deep-green via-forest to-deep-green text-white">
  <div class="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-goldfinch-gold/20 blur-3xl"></div>
  <div class="container-shell relative py-16 text-center md:py-20">
    <p class="font-serif text-xl italic text-savanna">Compare</p>
    <h1 class="mx-auto mt-5 max-w-3xl text-3xl font-extrabold leading-[1.1] tracking-tight md:text-[44px]" use:revealHeading>Honest side-by-side comparisons</h1>
    <p class="mx-auto mt-4 max-w-2xl text-[15px] leading-7 text-white/75 md:text-lg">
      The big East Africa decisions, weighed honestly — with a clear Goldfinch verdict for each.
    </p>
  </div>
</section>

<section class="container-shell py-12 md:py-16">
  <div class="grid gap-6 md:grid-cols-3" use:staggeredCardReveal={{ y: 16, stagger: 0.06 }}>
    {#each items as c (c.slug)}
      <a
        class="group flex flex-col rounded-[12px] border border-ink/10 bg-surface p-6 shadow-[0_14px_40px_rgba(15,47,36,0.07)] transition-shadow duration-300 hover:border-goldfinch-gold/40 hover:shadow-[0_26px_60px_rgba(15,47,36,0.16)]"
        href={`/compare/${c.slug}`}
        use:tilt={{ max: 5 }}
      >
        <p class="font-serif text-lg italic text-clay">{c.eyebrow}</p>
        <h2 class="mt-2 text-xl font-extrabold leading-snug text-heading">{c.title}</h2>
        <p class="mt-2 flex-1 text-sm leading-6 text-ink/65">{c.intro}</p>
        <span class="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-forest transition group-hover:text-heading">
          See the comparison <ArrowRight size={16} />
        </span>
      </a>
    {/each}
  </div>
</section>
