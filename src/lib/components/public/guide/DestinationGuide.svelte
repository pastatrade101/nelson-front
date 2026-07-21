<script lang="ts">
  import { Camera } from '@lucide/svelte';
  import FAQAccordion from '$lib/components/public/FAQAccordion.svelte';
  import JsonLd from '$lib/components/public/JsonLd.svelte';
  import type { GuideBlock } from '$lib/types';

  export let blocks: GuideBlock[] = [];
  export let reviewedAt: string | null = null;

  // Split a body string into paragraphs on blank lines. Content is rendered as
  // escaped text (no HTML), so this is safe and preserves author paragraphing.
  const paras = (s: string): string[] =>
    (s ?? '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  const CALLOUT_LABEL: Record<string, string> = {
    guide_tip: "Guide's Tip",
    local_insight: 'Local Insight',
    safari_wisdom: 'Safari Wisdom'
  };

  // Map guide FAQ items to the shape FAQAccordion expects ({ id, question, answer }).
  const toAccordion = (items: { q: string; a: string }[] = []) =>
    items.map((it, i) => ({ id: `${(it.q ?? '').slice(0, 48)}-${i}`, question: it.q, answer: it.a }));

  // Aggregate every FAQ item across all faq blocks into one FAQPage schema (rich results).
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
</script>

{#if faqLd}
  <JsonLd data={faqLd} />
{/if}

{#if blocks.length}
  <section class="border-t border-ink/[0.06] py-14 md:py-20">
    <div class="container-shell">
      <div class="mx-auto max-w-3xl">
        {#if reviewedLabel(reviewedAt)}
          <p class="mb-10 text-xs font-semibold uppercase tracking-[0.14em] text-ink/40">
            Guide last reviewed · {reviewedLabel(reviewedAt)}
          </p>
        {/if}

        {#each blocks as block, i (i)}
          {#if block.type === 'part'}
            <div class="mt-16 first:mt-0">
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
      </div>
    </div>
  </section>
{/if}
