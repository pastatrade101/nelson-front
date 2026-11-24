<script lang="ts">
  /**
   * The destination's long-form travel guide, laid out as chapters rather than
   * one reading column. Each Part heading opens a chapter band; inside it the
   * text runs in a main column with tips and notes beside it, and tables,
   * photos and picks run the full width. Month-by-month tables become a season
   * strip and short tables become side-by-side columns (see guideLayout.ts).
   *
   * The guide's "Quick facts" block is shown in the page's overview, so it is
   * left out here.
   */
  import { ArrowRight, Compass, Lightbulb, Sparkles } from '@lucide/svelte';
  import RichText from '../RichText.svelte';
  import ComparisonTable from '$lib/components/public/ComparisonTable.svelte';
  import FAQAccordion from '$lib/components/public/FAQAccordion.svelte';
  import ResponsiveImage from '$lib/components/public/ResponsiveImage.svelte';
  import GuideColumns from './GuideColumns.svelte';
  import GuidePick from './GuidePick.svelte';
  import { thumbUrl } from '$lib/img';
  import { currency, formatUsd } from '$lib/currency';
  import { lodgeImage, levelLabel, typeLabel } from '$lib/lodge';
  import { tourTierLabel } from '$lib/tiers';
  import { findQuickFacts, tableView, toChapters } from '$lib/guideLayout';
  import type { GuideBlock, Lodge, Tour } from '$lib/types';

  export let blocks: GuideBlock[] = [];
  export let reviewedAt: string | null = null;
  export let destinationName = '';
  /** The heading of the contents band; defaults to "<name> travel guide". */
  export let title = '';
  /**
   * Blocks the page already shows in its own sections (the FAQ, the areas and
   * price tables…), left out here so nothing is said twice. A chapter left
   * with nothing in it is left out of the contents too.
   */
  export let skip: GuideBlock[] = [];
  /** Published records the Tours / Accommodation blocks point at (loaded by the page). */
  export let tours: Tour[] = [];
  export let lodges: Lodge[] = [];
  /** A second photograph of the destination, shown full width between chapters when the guide has none of its own. */
  export let breakImage = '';

  // In the editor's order; anything unpublished or deleted is simply skipped.
  const pickTours = (ids: string[] = []) => ids.map((id) => tours.find((t) => t.id === id)).filter((t): t is Tour => Boolean(t));
  const pickLodges = (ids: string[] = []) => ids.map((id) => lodges.find((l) => l.id === id)).filter((l): l is Lodge => Boolean(l));
  const tourMeta = (t: Tour) =>
    [t.duration_days ? `${t.duration_days} days${t.duration_nights ? ` · ${t.duration_nights} nights` : ''}` : '', tourTierLabel(t)]
      .filter(Boolean)
      .join(' · ');
  const lodgeMeta = (l: Lodge) => [typeLabel(l), (l as { destinations?: { name?: string } | null }).destinations?.name].filter(Boolean).join(' · ');

  // Split a body string into paragraphs on blank lines. Rendered as escaped text.
  const paras = (s: string): string[] => (s ?? '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  const CALLOUT_LABEL: Record<string, string> = {
    guide_tip: 'Guide’s tip',
    local_insight: 'Local insight',
    safari_wisdom: 'Safari wisdom'
  };
  const CALLOUT_ICON: Record<string, typeof Compass> = {
    guide_tip: Lightbulb,
    local_insight: Compass,
    safari_wisdom: Sparkles
  };

  const toAccordion = (items: { q: string; a: string }[] = []) =>
    items.map((it, i) => ({ id: `${(it.q ?? '').slice(0, 48)}-${i}`, question: it.q, answer: it.a }));

  // Guide tables store rows as flat string arrays. ComparisonTable takes the
  // leading cell as the row label.
  const toComparisonRows = (rows: string[][] = []) => rows.map((r) => ({ label: r[0] ?? '', cells: r.slice(1) }));

  // Internal build artifacts that leaked into a few guides — never shown.
  const ARTIFACT = /end of (the )?(master )?guide|developer|implementation notes?|ready for extract|schematic (map|driving|diagram|route)/i;
  const isArtifact = (b: GuideBlock): boolean => b?.type === 'richtext' && ARTIFACT.test((b as { body?: string }).body ?? '');

  $: quickFacts = findQuickFacts(blocks);

  // Blocks actually laid out: drop artifacts, the quick facts (shown at the top
  // of the page), the blocks the page shows itself and photo placeholders that
  // have no real photo yet.
  $: bodyBlocks = blocks.filter((b) => !isArtifact(b) && b !== quickFacts && !skip.includes(b) && !(b?.type === 'photo' && !(b as { url?: string }).url));
  $: chapters = toChapters(bodyBlocks);
  $: contents = chapters.filter((c) => c.part).map((c) => ({ id: c.id, title: c.part?.title ?? '' }));
  $: hasOwnPhotos = bodyBlocks.some((b) => b.type === 'photo');
  // The photo break sits after the second chapter, where the long read begins.
  $: breakAfter = breakImage && !hasOwnPhotos && chapters.length >= 3 ? 1 : -1;

  const reviewedLabel = (d: string | null): string => {
    if (!d) return '';
    const dt = new Date(d);
    return Number.isNaN(dt.getTime()) ? '' : dt.toLocaleDateString('en-GB', { year: 'numeric', month: 'long' });
  };
  $: reviewed = reviewedLabel(reviewedAt);
</script>

{#if chapters.length}
  <!-- Contents: what the guide covers, as links to each chapter. -->
  <section id="guide-top" class="scroll-mt-[calc(var(--nav-h)+64px)] bg-deep-green py-14 text-white md:py-20">
    <div class="container-shell grid gap-8 lg:grid-cols-12 lg:gap-14">
      <div class="lg:col-span-4">
        <h2 class="type-h2 text-white">{title || (destinationName ? `${destinationName} travel guide` : 'Travel guide')}</h2>
        <p class="mt-4 text-[15px] leading-[1.7] text-white/70">
          {#if contents.length}{contents.length} chapters, from where to go to how to get there.{/if}
          {#if reviewed}<span class="block">Last reviewed {reviewed}.</span>{/if}
        </p>
      </div>
      {#if contents.length}
        <nav class="lg:col-span-8" aria-label="Travel guide contents">
          {#if contents.length > 8}
            <!-- Phones: a long contents list folds away. -->
            <details class="guide-toc border-y border-white/15 md:hidden">
              <summary class="flex min-h-12 cursor-pointer items-center justify-between text-[15px] font-semibold text-white">
                Show all {contents.length} chapters <ArrowRight size={16} class="rotate-90 transition" />
              </summary>
              <ol class="pb-2">
                {#each contents as item (item.id)}
                  <li><a class="flex min-h-11 items-center border-t border-white/10 text-[15px] text-white/80 hover:text-white" href={`#${item.id}`}>{item.title}</a></li>
                {/each}
              </ol>
            </details>
          {/if}
          <!-- Two columns read top to bottom, like a contents page. -->
          <ol class={`gap-x-10 sm:columns-2 ${contents.length > 8 ? 'hidden md:block' : ''}`}>
            {#each contents as item (item.id)}
              <li class="break-inside-avoid">
                <a class="group flex min-h-12 items-center justify-between gap-4 border-b border-white/15 py-3 text-[15px] leading-snug text-white/85 transition hover:text-white" href={`#${item.id}`}>
                  {item.title}
                  <ArrowRight size={15} class="shrink-0 text-white/40 transition group-hover:translate-x-0.5 group-hover:text-emnel-gold" />
                </a>
              </li>
            {/each}
          </ol>
        </nav>
      {/if}
    </div>
  </section>

  {#each chapters as chapter, i (chapter.id)}
    <section id={chapter.id} class={`guide-chapter scroll-mt-[calc(var(--nav-h)+64px)] py-16 md:py-24 ${i % 2 ? 'bg-linen/45' : 'bg-canvas'}`}>
      <div class="container-shell">
        {#if chapter.part}
          <header class="max-w-3xl">
            <h2 class="type-h2 text-heading">{chapter.part.title}</h2>
            {#if chapter.part.subtitle}
              <p class="mt-3 font-serif text-xl italic leading-snug text-clay">{chapter.part.subtitle}</p>
            {/if}
          </header>
        {/if}

        {#each chapter.segments as segment, s (s)}
          <div class={chapter.part || s > 0 ? 'mt-10 md:mt-12' : ''}>
            {#if segment.kind === 'run'}
              <div class="grid gap-8 lg:grid-cols-12 lg:gap-14">
                <div class={`guide-text min-w-0 lg:col-span-8 ${segment.main.length ? '' : 'grid gap-5'}`}>
                  {#each segment.main as block, b (b)}
                    {#if block.type === 'richtext'}
                      <div class={b ? 'mt-8' : ''}>
                        {#if block.heading}<h3 class="type-h3 mb-3 text-heading">{block.heading}</h3>{/if}
                        <!-- RichText so a paragraph can link to the places it mentions. -->
                        <RichText value={block.body} className="max-w-[68ch] text-base leading-[1.8] text-ink/75" />
                      </div>
                    {:else if block.type === 'faq'}
                      <div class={b ? 'mt-10' : ''}>
                        {#if block.title}<h3 class="type-h3 mb-4 text-heading">{block.title}</h3>{/if}
                        <FAQAccordion faqs={toAccordion(block.items)} headingLevel={block.title ? 4 : 3} />
                      </div>
                    {/if}
                  {/each}
                  <!-- With no text beside them, the notes take the main column. -->
                  {#if !segment.main.length}
                    {#each segment.notes as note, n (n)}
                      {@render noteBlock(note)}
                    {/each}
                  {/if}
                </div>
                {#if segment.main.length && segment.notes.length}
                  <aside class="grid content-start gap-5 lg:sticky lg:top-[calc(var(--nav-h)+96px)] lg:col-span-4 lg:self-start">
                    {#each segment.notes as note, n (n)}
                      {@render noteBlock(note)}
                    {/each}
                  </aside>
                {/if}
              </div>
            {:else}
              {@const block = segment.block}
              {#if block.type === 'table'}
                {@const view = tableView(block)}
                {#if view.kind === 'season'}
                  <GuideColumns table={view.table} months={view.months} seasonCol={view.seasonCol} />
                {:else if view.kind === 'columns'}
                  <GuideColumns table={view.table} />
                {:else}
                  <ComparisonTable columns={view.table.columns} rows={toComparisonRows(view.table.rows)} caption={view.table.title} />
                {/if}
              {:else if block.type === 'photo' && block.url}
                <figure>
                  <div class="relative aspect-[4/3] overflow-hidden bg-deep-green sm:aspect-[16/9] lg:aspect-[21/9]">
                    <ResponsiveImage src={block.url} alt={block.alt || block.caption || destinationName} imgClass="absolute inset-0 h-full w-full object-cover" sizes="(min-width:1320px) 1320px, 100vw" width={1600} />
                  </div>
                  {#if block.caption}<figcaption class="mt-3 max-w-[68ch] text-sm leading-[1.6] text-ink/55">{block.caption}</figcaption>{/if}
                </figure>
              {:else if block.type === 'tours'}
                {@const picked = pickTours(block.tour_ids)}
                {#if picked.length}
                  {#if block.title}<h3 class="type-h3 text-heading">{block.title}</h3>{/if}
                  {#if block.intro}<p class="mt-2 max-w-[68ch] text-base leading-[1.75] text-ink/70">{block.intro}</p>{/if}
                  <div class="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {#each picked as tour (tour.id)}
                      <GuidePick
                        href={`/tours/${tour.slug}`}
                        title={tour.title}
                        image={tour.main_image_url ?? ''}
                        fallbackImage={thumbUrl(tour, 'main_image_url')}
                        meta={tourMeta(tour)}
                        price={tour.price_from ? formatUsd(tour.price_from, $currency) : ''}
                        priceNote={tour.price_from ? 'pp' : ''}
                      />
                    {/each}
                  </div>
                {/if}
              {:else if block.type === 'lodges'}
                {@const picked = pickLodges(block.lodge_ids)}
                {#if picked.length}
                  {#if block.title}<h3 class="type-h3 text-heading">{block.title}</h3>{/if}
                  {#if block.intro}<p class="mt-2 max-w-[68ch] text-base leading-[1.75] text-ink/70">{block.intro}</p>{/if}
                  <div class="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {#each picked as lodge (lodge.id)}
                      <GuidePick href={`/accommodation/${lodge.slug}`} title={lodge.name} image={lodgeImage(lodge)} meta={[levelLabel(lodge), lodgeMeta(lodge)].filter(Boolean).join(' · ')} />
                    {/each}
                  </div>
                {/if}
              {/if}
            {/if}
          </div>
        {/each}
      </div>
    </section>

    {#if i === breakAfter}
      <figure class="relative h-[56vh] min-h-[300px] overflow-hidden bg-deep-green md:max-h-[640px]">
        <ResponsiveImage src={breakImage} alt={destinationName} imgClass="absolute inset-0 h-full w-full object-cover" sizes="100vw" width={2000} />
      </figure>
    {/if}
  {/each}
{/if}

{#snippet noteBlock(note: GuideBlock)}
  {#if note.type === 'callout'}
    <div class="border border-ink/10 bg-surface p-6">
      <p class="flex items-center gap-2 text-sm font-semibold text-heading">
        <svelte:component this={CALLOUT_ICON[note.variant] ?? Lightbulb} size={16} class="text-clay" />
        {CALLOUT_LABEL[note.variant] ?? 'Insight'}
      </p>
      <p class="mt-2.5 text-[15px] leading-[1.7] text-ink/75">{note.body}</p>
    </div>
  {:else if note.type === 'did_you_know'}
    <div class="py-1">
      <p class="text-sm font-semibold text-clay">Did you know?</p>
      <p class="mt-2 font-serif text-[21px] font-normal leading-[1.45] text-heading">{note.body}</p>
    </div>
  {:else if note.type === 'field_notes'}
    <div class="bg-deep-green p-6 text-white">
      <p class="text-sm font-semibold text-emnel-gold">{note.title || 'Field notes'}</p>
      <div class="mt-2.5 grid gap-3">
        {#each paras(note.body) as p}
          <p class="text-[15px] leading-[1.7] text-white/85">{p}</p>
        {/each}
      </div>
    </div>
  {:else if note.type === 'facts'}
    <div class="border border-ink/10 bg-surface p-6">
      {#if note.title}<h3 class="type-card text-heading">{note.title}</h3>{/if}
      <dl class={note.title ? 'mt-3' : ''}>
        {#each note.items ?? [] as item}
          <div class="border-t border-ink/10 py-3 first:border-t-0 first:pt-0 last:pb-0">
            <dt class="text-[13px] text-ink/55">{item.label}</dt>
            <dd class="mt-0.5 text-[15px] leading-[1.6] text-heading">{item.value}</dd>
          </div>
        {/each}
      </dl>
    </div>
  {/if}
{/snippet}

<style>
  .guide-text {
    overflow-wrap: anywhere;
  }
  .guide-text :global(.rich table) {
    max-width: 100%;
  }
  .guide-toc[open] summary :global(svg) {
    transform: rotate(-90deg);
  }
</style>
