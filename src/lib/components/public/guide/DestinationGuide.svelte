<script lang="ts">
  import { onDestroy, tick } from 'svelte';
  import { browser } from '$app/environment';
  import { Camera } from '@lucide/svelte';
  import FAQAccordion from '$lib/components/public/FAQAccordion.svelte';
  import JsonLd from '$lib/components/public/JsonLd.svelte';
  import type { GuideBlock } from '$lib/types';

  export let blocks: GuideBlock[] = [];
  export let reviewedAt: string | null = null;

  // Split a body string into paragraphs on blank lines. Rendered as escaped text.
  const paras = (s: string): string[] =>
    (s ?? '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  const CALLOUT_LABEL: Record<string, string> = {
    guide_tip: "Guide's Tip",
    local_insight: 'Local Insight',
    safari_wisdom: 'Safari Wisdom'
  };

  const slugify = (s: string) =>
    (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const partId = (b: { part?: number; title: string }): string =>
    'part-' + (b.part != null ? b.part : slugify(b.title));

  const toAccordion = (items: { q: string; a: string }[] = []) =>
    items.map((it, i) => ({ id: `${(it.q ?? '').slice(0, 48)}-${i}`, question: it.q, answer: it.a }));

  // Table of contents, built from the `part` blocks.
  $: toc = blocks
    .filter((b): b is Extract<GuideBlock, { type: 'part' }> => b?.type === 'part')
    .map((b) => ({ id: partId(b), num: b.part, title: b.title }));

  // Aggregate every FAQ item across all faq blocks into one FAQPage schema.
  $: faqItems = blocks
    .filter((b): b is Extract<GuideBlock, { type: 'faq' }> => b?.type === 'faq')
    .flatMap((b) => b.items ?? []);
  $: faqLd = faqItems.length
    ? {
        '@type': 'FAQPage',
        mainEntity: faqItems.map((it) => ({
          '@type': 'Question',
          name: it.q,
          acceptedAnswer: { '@type': 'Answer', text: it.a }
        }))
      }
    : null;

  const reviewedLabel = (d: string | null): string => {
    if (!d) return '';
    const dt = new Date(d);
    return Number.isNaN(dt.getTime())
      ? ''
      : dt.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
  };

  // Scrollspy — highlight the part currently in view. Re-runs when blocks change
  // (the detail page reuses this component across destinations).
  let activeId = '';
  let observer: IntersectionObserver | undefined;
  const setupSpy = async () => {
    if (!browser) return;
    observer?.disconnect();
    await tick();
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) activeId = (e.target as HTMLElement).id;
        });
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
    );
    toc.forEach((t) => {
      const el = document.getElementById(t.id);
      if (el) observer?.observe(el);
    });
    if (!activeId && toc.length) activeId = toc[0].id;
  };
  $: if (browser && blocks) void setupSpy();
  onDestroy(() => observer?.disconnect());
</script>

{#if faqLd}
  <JsonLd data={faqLd} />
{/if}

{#if blocks.length}
  <section id="guide-top" class="border-t border-ink/[0.06] py-14 md:py-20">
    <div class="container-shell">
      <div class="lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12">
        <!-- Table of contents -->
        {#if toc.length}
          <aside class="mb-8 lg:mb-0">
            <div class="lg:sticky lg:top-28">
              <!-- mobile: collapsible -->
              <details class="rounded-xl border border-ink/10 bg-surface lg:hidden">
                <summary class="cursor-pointer px-4 py-3 text-sm font-bold text-heading">On this page</summary>
                <nav class="grid gap-0.5 border-t border-ink/10 p-2">
                  {#each toc as t}
                    <a
                      href={`#${t.id}`}
                      class="rounded-md px-3 py-2 text-sm text-ink/70 transition hover:bg-sand hover:text-forest"
                    >
                      {t.num ? `Part ${t.num} · ` : ''}{t.title}
                    </a>
                  {/each}
                </nav>
              </details>
              <!-- desktop: sticky rail -->
              <div class="hidden lg:block">
                <p class="brand-eyebrow mb-3">On this page</p>
                <nav class="grid gap-0.5 border-l border-ink/10">
                  {#each toc as t}
                    <a
                      href={`#${t.id}`}
                      class={`-ml-px border-l-2 py-1.5 pl-3 text-sm leading-snug transition ${
                        activeId === t.id
                          ? 'border-goldfinch-gold font-semibold text-forest'
                          : 'border-transparent text-ink/60 hover:text-forest'
                      }`}
                    >
                      {t.num ? `Part ${t.num} · ` : ''}{t.title}
                    </a>
                  {/each}
                </nav>
              </div>
            </div>
          </aside>
        {/if}

        <!-- Guide body -->
        <div class="min-w-0 max-w-3xl">
          {#if reviewedLabel(reviewedAt)}
            <p class="mb-10 text-xs font-semibold uppercase tracking-[0.14em] text-ink/40">
              Guide last reviewed · {reviewedLabel(reviewedAt)}
            </p>
          {/if}

          {#each blocks as block, i (i)}
            {#if block.type === 'part'}
              <div id={partId(block)} class="mt-16 scroll-mt-28 first:mt-0">
                <p class="brand-eyebrow">{block.part ? `Part ${block.part}` : 'Guide'}</p>
                <h2 class="mt-2 font-serif text-3xl font-normal tracking-normal text-heading md:text-[34px]">
                  {block.title}
                </h2>
                {#if block.subtitle}
                  <p class="mt-2 font-serif text-lg italic text-clay">{block.subtitle}</p>
                {/if}
              </div>
            {:else if block.type === 'richtext'}
              <div class="mt-8">
                {#if block.heading}
                  <h3 class="text-xl font-bold text-heading">{block.heading}</h3>
                {/if}
                <div class="mt-3 space-y-4">
                  {#each paras(block.body) as p}
                    <p class="text-base leading-8 text-ink/75">{p}</p>
                  {/each}
                </div>
              </div>
            {:else if block.type === 'field_notes'}
              <div class="mt-8 rounded-2xl border border-goldfinch-gold/40 bg-goldfinch-gold/[0.06] p-6">
                <p class="brand-eyebrow text-goldfinch-gold">{block.title || 'Field Notes'}</p>
                <div class="mt-2 space-y-3">
                  {#each paras(block.body) as p}
                    <p class="text-[15px] leading-7 text-ink/80">{p}</p>
                  {/each}
                </div>
              </div>
            {:else if block.type === 'callout'}
              <div class="mt-6 border-l-4 border-goldfinch-gold pl-5">
                <p class="text-xs font-bold uppercase tracking-[0.12em] text-forest">
                  {CALLOUT_LABEL[block.variant] ?? 'Insight'}
                </p>
                <p class="mt-1 text-[15px] leading-7 text-ink/80">{block.body}</p>
              </div>
            {:else if block.type === 'did_you_know'}
              <div class="mt-8 border-y border-goldfinch-gold/50 py-4">
                <p class="text-xs font-bold uppercase tracking-[0.14em] text-goldfinch-gold">Did You Know?</p>
                <p class="mt-1.5 text-base leading-7 text-ink/80">{block.body}</p>
              </div>
            {:else if block.type === 'facts'}
              <div class="mt-8 rounded-2xl border border-ink/10 bg-surface p-6 shadow-soft">
                {#if block.title}
                  <h3 class="text-lg font-bold text-heading">{block.title}</h3>
                {/if}
                <dl class="mt-3 grid gap-x-10 sm:grid-cols-2">
                  {#each block.items ?? [] as item}
                    <div class="flex justify-between gap-4 border-b border-ink/[0.06] py-2.5">
                      <dt class="text-sm font-semibold text-ink/60">{item.label}</dt>
                      <dd class="text-right text-sm font-medium text-ink">{item.value}</dd>
                    </div>
                  {/each}
                </dl>
              </div>
            {:else if block.type === 'table'}
              <div class="mt-8">
                {#if block.title}
                  <h3 class="mb-3 text-lg font-bold text-heading">{block.title}</h3>
                {/if}
                <div class="overflow-x-auto rounded-2xl border border-ink/10 bg-surface shadow-soft">
                  <table class="w-full min-w-[560px] text-left text-sm">
                    <thead>
                      <tr class="border-b border-ink/10 bg-sand/40">
                        {#each block.columns ?? [] as col}
                          <th class="px-4 py-3 font-bold text-heading">{col}</th>
                        {/each}
                      </tr>
                    </thead>
                    <tbody>
                      {#each block.rows ?? [] as row}
                        <tr class="border-b border-ink/[0.06] last:border-0">
                          {#each row as cell}
                            <td class="px-4 py-3 align-top text-ink/75">{cell}</td>
                          {/each}
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              </div>
            {:else if block.type === 'photo'}
              <figure class="mt-8">
                {#if block.url}
                  <img
                    class="w-full rounded-2xl object-cover shadow-soft"
                    src={block.url}
                    alt={block.alt || block.caption}
                  />
                  {#if block.caption}
                    <figcaption class="mt-2 text-xs italic text-ink/50">{block.caption}</figcaption>
                  {/if}
                {:else}
                  <div class="flex items-center gap-3 rounded-2xl border border-dashed border-ink/20 bg-sand/30 px-5 py-8 text-ink/45">
                    <Camera size={20} />
                    <span class="text-sm italic">Photograph — {block.caption}</span>
                  </div>
                {/if}
              </figure>
            {:else if block.type === 'faq'}
              <div class="mt-10">
                {#if block.title}
                  <h3 class="mb-4 text-xl font-bold text-heading">{block.title}</h3>
                {/if}
                <FAQAccordion faqs={toAccordion(block.items)} />
              </div>
            {/if}
          {/each}

          {#if toc.length}
            <a
              href="#guide-top"
              class="mt-14 inline-block text-sm font-semibold text-forest transition hover:text-heading"
            >
              ↑ Back to top
            </a>
          {/if}
        </div>
      </div>
    </div>
  </section>
{/if}
