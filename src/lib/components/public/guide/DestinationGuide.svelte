<script lang="ts">
  import { onDestroy, tick } from 'svelte';
  import RichText from '../RichText.svelte';
  import { browser } from '$app/environment';
  import { Compass, Lightbulb, ShieldCheck, Sparkles } from '@lucide/svelte';
  import ComparisonTable from '$lib/components/public/ComparisonTable.svelte';
  import FAQAccordion from '$lib/components/public/FAQAccordion.svelte';
  import JsonLd from '$lib/components/public/JsonLd.svelte';
  import ResponsiveImage from '$lib/components/public/ResponsiveImage.svelte';
  import GuidePick from './GuidePick.svelte';
  import { thumbUrl } from '$lib/img';
  import { currency, formatUsd } from '$lib/currency';
  import { lodgeImage, levelLabel, typeLabel } from '$lib/lodge';
  import { tierLabel } from '$lib/tiers';
  import type { GuideBlock, Lodge, Tour } from '$lib/types';
  import { plainText } from '$lib/seo';

  export let blocks: GuideBlock[] = [];
  export let reviewedAt: string | null = null;
  export let destinationName = '';
  /** The page's own FAQs, folded into this guide's FAQPage so the page carries one. */
  export let extraFaqs: { q: string; a: string }[] = [];
  /** Published records the Tours / Accommodation blocks point at (loaded by the page). */
  export let tours: Tour[] = [];
  export let lodges: Lodge[] = [];

  // In the editor's order; anything unpublished or deleted is simply skipped.
  const pickTours = (ids: string[] = []) => ids.map((id) => tours.find((t) => t.id === id)).filter((t): t is Tour => Boolean(t));
  const pickLodges = (ids: string[] = []) => ids.map((id) => lodges.find((l) => l.id === id)).filter((l): l is Lodge => Boolean(l));
  const tourMeta = (t: Tour) =>
    [t.duration_days ? `${t.duration_days} days${t.duration_nights ? ` · ${t.duration_nights} nights` : ''}` : '', tierLabel(t.budget_tier)]
      .filter(Boolean)
      .join(' · ');
  const lodgeMeta = (l: Lodge) => [typeLabel(l), (l as { destinations?: { name?: string } | null }).destinations?.name].filter(Boolean).join(' · ');

  // Split a body string into paragraphs on blank lines. Rendered as escaped text.
  const paras = (s: string): string[] =>
    (s ?? '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  const CALLOUT_LABEL: Record<string, string> = {
    guide_tip: "Guide's Tip",
    local_insight: 'Local Insight',
    safari_wisdom: 'Safari Wisdom'
  };
  const CALLOUT_ICON: Record<string, typeof Compass> = {
    guide_tip: Lightbulb,
    local_insight: Compass,
    safari_wisdom: Sparkles
  };

  const slugify = (s: string) =>
    (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const partBase = (b: GuideBlock): string =>
    'part-' + ('part' in b && b.part != null ? b.part : slugify('title' in b ? String(b.title ?? '') : 'section'));
  const partId = (b: GuideBlock, index: number): string => {
    const base = partBase(b);
    // Keep existing incoming anchor links; disambiguate repeated headings only.
    return bodyBlocks.slice(0, index).some((other) => other.type === 'part' && partBase(other) === base) ? `${base}-${index}` : base;
  };

  const toAccordion = (items: { q: string; a: string }[] = []) =>
    items.map((it, i) => ({ id: `${(it.q ?? '').slice(0, 48)}-${i}`, question: it.q, answer: it.a }));

  // Guide tables store rows as flat string arrays. ComparisonTable takes plain
  // data with the leading cell as the row label (it repeats the column headers
  // per cell when the table reflows into cards on mobile).
  const toComparisonRows = (rows: string[][] = []) =>
    (rows ?? []).map((r) => ({ label: r?.[0] ?? '', cells: (r ?? []).slice(1) }));

  // Internal build artifacts that leaked into a few guides — never shown.
  const ARTIFACT = /end of (the )?(master )?guide|developer|implementation notes?|ready for extract|schematic (map|driving|diagram|route)/i;
  const isArtifact = (b: GuideBlock): boolean =>
    b?.type === 'richtext' && ARTIFACT.test((b as { body?: string }).body ?? '');

  // The "Quick Facts" block (the one carrying best-time / ideal-visit) is
  // promoted into the floating quick-facts bar, so it isn't repeated inline.
  $: quickFacts = blocks.find(
    (b): b is Extract<GuideBlock, { type: 'facts' }> =>
      b?.type === 'facts' && (/quick facts|at a glance/i.test(b.title ?? '') || (b.items ?? []).some((it) => /best time|ideal visit/i.test(it.label ?? '')))
  );

  // Blocks actually rendered inline: drop artifacts, the promoted quick-facts
  // block, and image placeholders that have no real photo yet.
  $: bodyBlocks = blocks.filter(
    (b) => !isArtifact(b) && b !== quickFacts && !(b?.type === 'photo' && !(b as { url?: string }).url)
  );

  // Table of contents, built from the `part` blocks.
  $: toc = bodyBlocks.flatMap((b, i) =>
    b.type === 'part' ? [{ id: partId(b, i), num: b.part, title: b.title }] : []
  );

  // Aggregate every FAQ item across all faq blocks into one FAQPage schema.
  $: faqItems = blocks
    .filter((b): b is Extract<GuideBlock, { type: 'faq' }> => b?.type === 'faq')
    .flatMap((b) => b.items ?? [])
    .concat(extraFaqs)
    .map((item) => ({ q: plainText(item.q), a: plainText(item.a) }))
    .filter((item, i, items) => item.q && item.a && items.findIndex((other) => other.q === item.q) === i);
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
  let spyVersion = 0;
  const setupSpy = async () => {
    if (!browser) return;
    const version = ++spyVersion;
    observer?.disconnect();
    await tick();
    if (version !== spyVersion) return;
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
    if (!toc.some((item) => item.id === activeId)) activeId = toc[0]?.id ?? '';
  };
  $: if (browser && blocks) void setupSpy();
  onDestroy(() => { spyVersion++; observer?.disconnect(); });
</script>

{#if faqLd}
  <JsonLd data={faqLd} />
{/if}

{#if bodyBlocks.length}
  <section id="guide-top" class="scroll-mt-[calc(var(--nav-h)+96px)] border-t border-ink/[0.06] bg-canvas py-14 md:py-16">
    <div class="container-shell">
      <div class="mb-8 flex flex-wrap items-end justify-between gap-3 border-b border-ink/10 pb-6">
        <div><p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-clay">The travel guide</p><h2 class="mt-2 font-serif text-3xl font-medium text-heading">{destinationName ? `Get to know ${destinationName}` : 'Plan with local insight'}</h2></div>
        {#if reviewedLabel(reviewedAt)}<p class="text-xs text-ink/50">Last reviewed {reviewedLabel(reviewedAt)}</p>{/if}
      </div>
      <!-- Floating quick-facts bar (real "Quick Facts" from the guide) -->
      {#if quickFacts?.items?.length}
        <div class="mb-10 rounded-lg border border-ink/10 bg-surface p-6 md:p-7">
          <p class="text-xs font-semibold text-clay">{quickFacts.title || 'At a glance'}</p>
          <dl class="mt-5 grid gap-x-10 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            {#each quickFacts.items as it}
              <div class="border-t border-ink/10 pt-3">
                <dt class="text-[10px] font-bold uppercase tracking-[0.16em] text-ink/40">{it.label}</dt>
                <dd class="mt-1 text-[14px] font-semibold leading-6 text-heading">{it.value}</dd>
              </div>
            {/each}
          </dl>
        </div>
      {/if}

      <!-- Two columns only when there is a contents list to fill the first one;
           without Part headings the body used to fall into the 240px column. -->
      <div class={toc.length ? 'lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-14' : 'mx-auto max-w-3xl'}>
        <!-- Table of contents -->
        {#if toc.length}
          <aside class="mb-8 lg:mb-0">
            <div class="lg:sticky lg:top-[calc(var(--nav-h)+88px)]">
              <!-- mobile: collapsible -->
              <details class="rounded-xl border border-ink/10 bg-surface lg:hidden">
                <summary class="cursor-pointer px-4 py-3 text-sm font-bold text-heading">On this page</summary>
                <nav aria-label="Travel guide contents" class="grid max-h-80 gap-0.5 overflow-y-auto border-t border-ink/10 p-2">
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
                <nav aria-label="Travel guide contents" class="grid max-h-[calc(100dvh-var(--nav-h)-150px)] gap-1 overflow-y-auto border-l border-ink/10">
                  {#each toc as t}
                    <a
                      href={`#${t.id}`}
                      aria-current={activeId === t.id ? 'location' : undefined}
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
        <div class="guide-body min-w-0 max-w-3xl [&>*:first-child]:mt-0">
          {#each bodyBlocks as block, i (i)}
            {#if block.type === 'part'}
              <div id={partId(block, i)} class="mt-14 scroll-mt-[calc(var(--nav-h)+96px)] border-t border-ink/10 pt-8 first:mt-0 first:border-0 first:pt-0">
                {#if block.part}<p class="text-[10px] font-semibold uppercase tracking-wider text-clay">Part {block.part}</p>{/if}
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
                  <h3 class="font-serif text-xl font-normal text-heading">{block.heading}</h3>
                {/if}
                  <!-- RichText so a paragraph can link to the destination, safari
                       or journal post it mentions. Falls back to the escaped
                       paragraph path for the plain text already written here. -->
                  <RichText value={block.body} className="mt-3 text-base leading-8 text-ink/75" />
              </div>
            {:else if block.type === 'field_notes'}
              {@const isIntel = /emnel intelligence/i.test(block.title ?? '')}
              <div class="mt-8 rounded-2xl border border-goldfinch-gold/40 bg-goldfinch-gold/[0.06] p-6">
                <p class="brand-eyebrow inline-flex items-center gap-2 text-goldfinch-gold">
                  <svelte:component this={isIntel ? ShieldCheck : Compass} size={14} strokeWidth={2.4} />
                  {block.title || 'Field Notes'}
                </p>
                <div class="mt-2 space-y-3">
                  {#each paras(block.body) as p}
                    <p class="text-[15px] leading-7 text-ink/80">{p}</p>
                  {/each}
                </div>
              </div>
            {:else if block.type === 'callout'}
              <div class="mt-6 border-l-4 border-goldfinch-gold pl-5">
                <p class="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-forest">
                  <svelte:component this={CALLOUT_ICON[block.variant] ?? Lightbulb} size={14} strokeWidth={2.4} />
                  {CALLOUT_LABEL[block.variant] ?? 'Insight'}
                </p>
                <p class="mt-1 text-[15px] leading-7 text-ink/80">{block.body}</p>
              </div>
            {:else if block.type === 'did_you_know'}
              <div class="mt-8 border-y border-goldfinch-gold/50 py-4">
                <p class="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-goldfinch-gold">
                  <Sparkles size={14} strokeWidth={2.4} /> Did You Know?
                </p>
                <p class="mt-1.5 text-base leading-7 text-ink/80">{block.body}</p>
              </div>
            {:else if block.type === 'facts'}
              <div class="mt-8 rounded-2xl border border-ink/10 bg-surface p-6 shadow-soft">
                {#if block.title}
                  <h3 class="font-serif text-lg font-normal text-heading">{block.title}</h3>
                {/if}
                <dl class="mt-3 grid gap-x-10 sm:grid-cols-2">
                  {#each block.items ?? [] as item}
                    <div class="border-b border-ink/[0.06] py-3">
                      <dt class="text-sm font-semibold text-ink/60">{item.label}</dt>
                      <dd class="mt-1 text-sm leading-6 text-ink">{item.value}</dd>
                    </div>
                  {/each}
                </dl>
              </div>
            {:else if block.type === 'table'}
              <div class="mt-8">
                <ComparisonTable
                  columns={block.columns ?? []}
                  rows={toComparisonRows(block.rows)}
                  caption={block.title ?? ''}
                />
              </div>
            {:else if block.type === 'photo'}
              <figure class="mt-8">
                <ResponsiveImage
                  src={block.url}
                  alt={block.alt || block.caption}
                  imgClass="w-full rounded-2xl object-cover shadow-soft"
                  sizes="(min-width:768px) 768px, 100vw"
                />
                {#if block.caption}
                  <figcaption class="mt-2 text-xs italic text-ink/50">{block.caption}</figcaption>
                {/if}
              </figure>
            {:else if block.type === 'faq'}
              <div class="mt-10">
                {#if block.title}
                  <h3 class="mb-4 font-serif text-xl font-normal text-heading">{block.title}</h3>
                {/if}
                <FAQAccordion faqs={toAccordion(block.items)} />
              </div>
            {:else if block.type === 'tours'}
              {@const picked = pickTours(block.tour_ids)}
              {#if picked.length}
                <div class="mt-10">
                  {#if block.title}<h3 class="font-serif text-xl font-normal text-heading">{block.title}</h3>{/if}
                  {#if block.intro}<p class="mt-2 text-[15px] leading-7 text-ink/70">{block.intro}</p>{/if}
                  <div class="mt-5 grid gap-3 md:grid-cols-2">
                    {#each picked as tour (tour.id)}
                      <GuidePick
                        href={`/tours/${tour.slug}`}
                        title={tour.title}
                        image={tour.main_image_url ?? ''}
                        fallbackImage={thumbUrl(tour, 'main_image_url')}
                        eyebrow="Safari"
                        meta={tourMeta(tour)}
                        price={tour.price_from ? formatUsd(tour.price_from, $currency) : ''}
                        priceNote={tour.price_from ? 'pp' : ''}
                      />
                    {/each}
                  </div>
                </div>
              {/if}
            {:else if block.type === 'lodges'}
              {@const picked = pickLodges(block.lodge_ids)}
              {#if picked.length}
                <div class="mt-10">
                  {#if block.title}<h3 class="font-serif text-xl font-normal text-heading">{block.title}</h3>{/if}
                  {#if block.intro}<p class="mt-2 text-[15px] leading-7 text-ink/70">{block.intro}</p>{/if}
                  <div class="mt-5 grid gap-3 md:grid-cols-2">
                    {#each picked as lodge (lodge.id)}
                      <GuidePick
                        href={`/accommodation/${lodge.slug}`}
                        title={lodge.name}
                        image={lodgeImage(lodge)}
                        eyebrow={levelLabel(lodge) || 'Stay'}
                        meta={lodgeMeta(lodge)}
                      />
                    {/each}
                  </div>
                </div>
              {/if}
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

<style>
  .guide-body { overflow-wrap: anywhere; }
  .guide-body :global(.rich table) { max-width: 100%; }
</style>
