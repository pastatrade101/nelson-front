<script lang="ts">
  /**
   * Draws a travel style's sections. Every layout decision lives here; the CMS
   * only supplies words, images and order (see styleContent.ts for how loose
   * blocks are read into these shapes).
   *
   * One rhythm throughout: an eyebrow + serif heading, generous vertical space,
   * reading measure capped near 68ch, and a 12-column split (heading left,
   * content right) for anything text-led. Backgrounds are chosen per kind and a
   * hairline separates two neighbours that would otherwise share a colour.
   */
  import { ArrowRight, ArrowUpRight, Check, Minus, Plus } from '@lucide/svelte';
  import DestinationFeatureCard from '$lib/components/public/DestinationFeatureCard.svelte';
  import FinalCtaSection from '$lib/components/public/FinalCtaSection.svelte';
  import ResponsiveImage from '$lib/components/public/ResponsiveImage.svelte';
  import RichText from '$lib/components/public/RichText.svelte';
  import TourCardRich from '$lib/components/public/TourCardRich.svelte';
  import GuideCard from './GuideCard.svelte';
  import ComfortTierCard from './ComfortTierCard.svelte';
  import { splitPlace, splitSchedule, type Section } from './styleContent';

  export let sections: Section[] = [];
  /** Background of whatever sits directly above the first section. */
  export let prevTone: Tone = 'dark';
  export let toursHref = '/tours';
  export let planHref = '/plan-my-trip';

  type Tone = 'canvas' | 'linen' | 'dark';

  const toneOf = (s: Section): Tone => {
    switch (s.kind) {
      case 'numbered':
        return 'dark';
      case 'cta':
        return 'dark';
      case 'tiers':
      case 'steps':
      case 'tours':
        return 'linen';
      case 'panels':
        return s.view.kind === 'people' ? 'linen' : 'canvas';
      case 'prose':
        return s.prose.kind === 'schedule' ? 'linen' : 'canvas';
      default:
        return 'canvas';
    }
  };

  const BG: Record<Tone, string> = {
    canvas: 'bg-canvas',
    linen: 'bg-linen/45',
    dark: 'bg-deep-green text-white'
  };

  $: tones = sections.map(toneOf);
  const sectionClass = (i: number) => {
    const tone = tones[i];
    const prev = i === 0 ? prevTone : tones[i - 1];
    return [
      BG[tone],
      'py-14 md:py-24',
      tone === prev && tone !== 'dark' ? 'border-t border-ink/10' : '',
      'scroll-mt-[calc(var(--nav-h,70px)+64px)]'
    ].join(' ');
  };

  const pad2 = (n: number) => String(n).padStart(2, '0');

  /** Mosaic: the first image leads at 2×2 once there are enough to frame it. */
  const tileClass = (i: number, count: number) =>
    count >= 4 && i === 0 ? 'col-span-2 row-span-2' : '';

  const faqGroups = (items: Extract<Section, { kind: 'faq' }>['items']) => {
    const groups = new Map<string, typeof items>();
    const hasTopics = items.some((item) => item.topic);
    for (const item of items) {
      const topic = item.topic || (hasTopics ? 'Other questions' : '');
      groups.set(topic, [...(groups.get(topic) ?? []), item]);
    }
    return [...groups].map(([topic, questions]) => ({ topic, questions }));
  };
</script>

{#snippet heading(eyebrow: string, title: string, dark = false, size = 'md')}
  {#if eyebrow}
    <p class={`text-[11px] font-medium uppercase tracking-[0.26em] ${dark ? 'text-goldfinch-gold' : 'text-clay'}`}>{eyebrow}</p>
  {/if}
  {#if title}
    <h2
      class={`font-serif font-light leading-[1.08] ${eyebrow ? 'mt-4' : ''} ${dark ? 'text-white' : 'text-heading'} ${
        size === 'lg' ? 'text-[34px] md:text-[52px]' : 'text-[32px] md:text-[44px]'
      }`}
    >
      {title}
    </h2>
  {/if}
{/snippet}

{#each sections as s, i (s.id)}
  {#if s.kind === 'cta'}
    <!-- Every call to action is the site's shared photo band. -->
    <div id={s.id}>
      <FinalCtaSection
        seed={s.id}
        title={s.title}
        subtitle={s.subtitle}
        primaryLabel={s.label || 'Plan this trip'}
        primaryHref={s.href || planHref}
        secondaryLabel={s.final ? 'Browse itineraries' : ''}
        secondaryHref={s.final ? toursHref : ''}
        points={s.points}
      />
    </div>
  {:else}
  <section id={s.id} class={sectionClass(i)}>
    <div class="container-shell min-w-0">
      <!-- ── Prose ──────────────────────────────────────────────────────── -->
      {#if s.kind === 'prose'}
        {@const p = s.prose}
        {#if s.lead}
          <!-- Opening read: heading and pull quote on the left, body on the right. -->
          <div class="grid gap-10 lg:grid-cols-12 lg:gap-16">
            <div class="lg:col-span-5">
              {@render heading(s.eyebrow || 'Overview', s.title, false, 'lg')}
              {#if p.callout}
                <p class="mt-8 border-l-2 border-goldfinch-gold bg-linen/60 p-6 font-serif text-[22px] font-light italic leading-[1.45] text-heading md:text-[26px]">
                  {p.callout}
                </p>
              {/if}
            </div>
            <div class="lg:col-span-7 lg:pt-2">
              <RichText value={p.intro} className="style-lead max-w-[68ch] text-[16px] leading-[1.85] text-ink/75" />
              {#if p.link}
                <a class="group mt-8 inline-flex items-center gap-2 border-b border-deep-green/30 pb-1 text-sm font-semibold text-deep-green transition hover:border-deep-green" href={p.link.href}>
                  {p.link.label} <ArrowRight class="h-4 w-4 transition group-hover:translate-x-0.5" />
                </a>
              {/if}
            </div>
          </div>
        {:else if p.kind === 'text'}
          <div class="grid gap-8 lg:grid-cols-12 lg:gap-16">
            <div class="lg:col-span-4">
              {@render heading(s.eyebrow, s.title)}
            </div>
            <div class="lg:col-span-8">
              <RichText value={p.intro} className="max-w-[68ch] text-[16px] leading-[1.85] text-ink/75" />
              {#if p.link}
                <a class="group mt-8 inline-flex items-center gap-2 border-b border-deep-green/30 pb-1 text-sm font-semibold text-deep-green transition hover:border-deep-green" href={p.link.href}>
                  {p.link.label} <ArrowRight class="h-4 w-4 transition group-hover:translate-x-0.5" />
                </a>
              {/if}
              {#if p.callout}
                <p class="mt-8 max-w-[60ch] border-l-2 border-goldfinch-gold pl-6 font-serif text-[22px] font-light italic leading-[1.45] text-heading">{p.callout}</p>
              {/if}
            </div>
          </div>
        {:else}
          <div class="grid gap-10 lg:grid-cols-12 lg:gap-16">
            <div class="lg:col-span-4">
              <div class="lg:sticky lg:top-[calc(var(--nav-h,70px)+88px)]">
                {@render heading(s.eyebrow, s.title)}
                {#if p.intro}
                  <RichText value={p.intro} className="mt-6 text-[15px] leading-[1.8] text-ink/70" />
                {/if}
                {#if p.link}
                  <a class="group mt-8 inline-flex items-center gap-2 border-b border-deep-green/30 pb-1 text-sm font-semibold text-deep-green transition hover:border-deep-green" href={p.link.href}>
                    {p.link.label}
                    <ArrowRight class="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </a>
                {/if}
              </div>
            </div>

            <div class="lg:col-span-8">
              {#if p.kind === 'route'}
                <!-- Day-by-day: a vertical line with a stop per row. -->
                <ol class="relative">
                  {#each p.rows as row, r (r)}
                    {@const stop = splitPlace(row.text)}
                    <li class="relative grid grid-cols-[64px_minmax(0,1fr)] gap-4 pb-8 last:pb-0 md:grid-cols-[112px_minmax(0,1fr)] md:gap-6">
                      {#if r < p.rows.length - 1}
                        <span class="absolute left-[87px] top-3 h-full w-px bg-ink/15 md:left-[143px]" aria-hidden="true"></span>
                      {/if}
                      <span class="pt-0.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-clay">{row.label}</span>
                      <div class="relative pl-7">
                        <span class="absolute left-[3px] top-[7px] h-2.5 w-2.5 rounded-full border-2 border-goldfinch-gold bg-canvas" aria-hidden="true"></span>
                        <p class="font-serif text-[22px] leading-tight text-heading">{stop.place}</p>
                        {#if stop.detail}
                          <p class="mt-1.5 text-[15px] leading-7 text-ink/65">{stop.detail}</p>
                        {/if}
                      </div>
                    </li>
                  {/each}
                </ol>
              {:else if p.kind === 'schedule'}
                <ol class="divide-y divide-ink/10 border-y border-ink/10">
                  {#each p.rows as row, r (r)}
                    {@const slot = splitSchedule(row.label)}
                    <li class="grid gap-2 py-6 sm:grid-cols-[120px_1fr] sm:gap-8">
                      <span class="font-serif text-[26px] font-light leading-none text-goldfinch-gold tabular-nums">{slot.time}</span>
                      <div>
                        <p class="text-[15px] font-semibold text-heading">{slot.title}</p>
                        <p class="mt-1.5 text-[15px] leading-7 text-ink/65">{row.text}</p>
                      </div>
                    </li>
                  {/each}
                </ol>
              {:else if p.kind === 'seasons'}
                <div class="grid gap-px border border-ink/10 bg-ink/10 sm:grid-cols-2">
                  {#each p.rows as row, r (r)}
                    <div class="bg-canvas p-7 md:p-8">
                      <p class="font-serif text-[24px] leading-tight text-heading">{row.label}</p>
                      <p class="mt-3 text-[15px] leading-7 text-ink/65">{row.text}</p>
                    </div>
                  {/each}
                </div>
              {:else}
                <dl class="divide-y divide-ink/10 border-y border-ink/10">
                  {#each p.rows as row, r (r)}
                    <div class="grid gap-2 py-6 sm:grid-cols-[180px_1fr] sm:gap-8">
                      <dt class="font-serif text-[21px] leading-snug text-heading">{row.label}</dt>
                      <dd class="text-[15px] leading-7 text-ink/70">{row.text}</dd>
                    </div>
                  {/each}
                </dl>
              {/if}

              {#if p.outro}
                <RichText value={p.outro} className="mt-8 max-w-[68ch] text-[15px] leading-[1.8] text-ink/70" />
              {/if}
              {#if p.callout}
                <p class="mt-8 border-l-2 border-goldfinch-gold pl-6 font-serif text-[21px] font-light italic leading-[1.45] text-heading">{p.callout}</p>
              {/if}
            </div>
          </div>
        {/if}

      <!-- ── Numbered reasons ───────────────────────────────────────────── -->
      {:else if s.kind === 'numbered'}
        <div class="max-w-3xl">{@render heading(s.eyebrow, s.title, true)}</div>
        <div class={`mt-9 grid gap-4 sm:grid-cols-2 md:mt-12 ${s.columns === 4 ? 'xl:grid-cols-4' : s.columns === 2 ? 'lg:grid-cols-2' : 'lg:grid-cols-3'}`}>
          {#each s.items as item, n (n)}
            <div class="min-w-0 border border-white/15 bg-white/[0.035] p-6 md:p-8">
              <span class="inline-block border-b border-goldfinch-gold/60 pb-2 font-serif text-[25px] text-goldfinch-gold">{pad2(n + 1)}</span>
              {#if item.title}<h3 class="mt-5 font-serif text-[24px] leading-snug text-white">{item.title}</h3>{/if}
              {#if item.body}<p class="mt-3 text-[15px] leading-7 text-white/80">{item.body}</p>{/if}
            </div>
          {/each}
        </div>

      <!-- ── Panels: places / stays / people ────────────────────────────── -->
      {:else if s.kind === 'panels'}
        {@const v = s.view}
        <div class="max-w-3xl">{@render heading(s.eyebrow, s.title)}</div>

        {#if v.kind === 'places'}
          <div class={`mt-12 grid gap-x-6 gap-y-12 sm:grid-cols-2 md:mt-16 ${v.items.length >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
            {#each v.items as place, n (n)}
              <article>
                {#if place.image}
                  <div class="aspect-[4/5] overflow-hidden bg-ink/5">
                    <ResponsiveImage src={place.image} alt={place.title} sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw" width={720} imgClass="h-full w-full object-cover transition duration-700 hover:scale-[1.03]" />
                  </div>
                {/if}
                <h3 class="mt-5 font-serif text-[24px] leading-tight text-heading">{place.title}</h3>
                {#if place.text}<p class="mt-2.5 text-[15px] leading-7 text-ink/65">{place.text}</p>{/if}
              </article>
            {/each}
          </div>

        {:else if v.kind === 'stays'}
          <div class="mt-12 grid gap-16 md:mt-16 md:gap-24">
            {#each v.items as stay, n (n)}
              <article class="grid items-start gap-8 lg:grid-cols-12 lg:gap-14">
                {#if stay.image}
                  <div class={`aspect-[4/3] overflow-hidden bg-ink/5 lg:col-span-6 ${n % 2 ? 'lg:order-2' : ''}`}>
                    <ResponsiveImage src={stay.image} alt={stay.title} sizes="(min-width:1024px) 50vw, 100vw" width={1100} imgClass="h-full w-full object-cover" />
                  </div>
                {/if}
                <div class={stay.image ? 'lg:col-span-6' : 'lg:col-span-12'}>
                  <h3 class="font-serif text-[30px] font-light leading-tight text-heading md:text-[36px]">{stay.title}</h3>
                  {#if stay.bestFor}
                    <p class="mt-4 text-[15px] leading-7 text-ink/80">
                      <span class="mr-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-clay">Best for</span>{stay.bestFor}
                    </p>
                  {/if}
                  {#each stay.body as para, k (k)}
                    <p class="mt-4 max-w-[62ch] text-[15px] leading-7 text-ink/65">{para}</p>
                  {/each}
                  {#if stay.facts.length}
                    <dl class="mt-8 divide-y divide-ink/10 border-y border-ink/10">
                      {#each stay.facts as fact, k (k)}
                        <div class="grid gap-1 py-3.5 sm:grid-cols-[110px_1fr] sm:gap-6">
                          <dt class="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/45 sm:pt-1">{fact.label}</dt>
                          <dd class="text-[14px] leading-6 text-ink/75">{fact.value}</dd>
                        </div>
                      {/each}
                    </dl>
                  {/if}
                </div>
              </article>
            {/each}
          </div>

        {:else}
          {@const showPortrait = v.items.some((person) => person.image)}
          <div class={`mt-9 grid gap-6 md:mt-12 ${v.items.length === 1 ? 'max-w-md' : v.items.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
            {#each v.items as person, n (n)}
              <GuideCard {person} {showPortrait} />
            {/each}
          </div>
        {/if}

      <!-- ── Price tiers ────────────────────────────────────────────────── -->
      {:else if s.kind === 'tiers'}
        <div class="grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-16">
          <div class="lg:col-span-6">{@render heading(s.eyebrow, s.title)}</div>
          {#if s.intro}<p class="max-w-[60ch] text-[15px] leading-7 text-ink/65 lg:col-span-6">{s.intro}</p>{/if}
        </div>
        <div class={`mt-9 grid gap-6 md:mt-12 ${s.tiers.length === 1 ? 'max-w-md' : s.tiers.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
          {#each s.tiers as tier, n (n)}
            <ComfortTierCard {tier} {planHref} />
          {/each}
        </div>

      <!-- ── Steps ──────────────────────────────────────────────────────── -->
      {:else if s.kind === 'steps'}
        <div class="max-w-3xl">{@render heading(s.eyebrow, s.title)}</div>
        <ol class={`mt-9 grid gap-4 sm:grid-cols-2 md:mt-12 ${s.steps.length >= 5 ? 'lg:grid-cols-3 xl:grid-cols-5' : s.steps.length === 4 ? 'xl:grid-cols-4' : 'lg:grid-cols-3'}`}>
          {#each s.steps as step, n (n)}
            <li class="relative min-w-0 border border-ink/10 bg-canvas p-6">
              <div class="flex items-center gap-4">
                <span class="grid h-10 w-10 shrink-0 place-items-center bg-deep-green font-serif text-[18px] text-goldfinch-gold">{pad2(n + 1)}</span>
              </div>
              <h3 class="mt-5 text-[15px] font-semibold text-heading">{step.title}</h3>
              {#if step.body}<p class="mt-2 text-[14px] leading-6 text-ink/65">{step.body}</p>{/if}
            </li>
          {/each}
        </ol>
        {#if s.ctaLabel && s.ctaHref}
          <a class="mt-12 inline-flex h-12 items-center gap-2 bg-deep-green px-7 text-sm font-semibold text-white transition hover:bg-forest" href={s.ctaHref}>
            {s.ctaLabel} <ArrowRight class="h-4 w-4" />
          </a>
        {/if}

      <!-- ── Gallery ────────────────────────────────────────────────────── -->
      {:else if s.kind === 'gallery'}
        <div class="max-w-3xl">{@render heading(s.eyebrow, s.title)}</div>
        <div class={`mt-12 grid auto-rows-[160px] grid-cols-2 gap-3 md:mt-16 md:auto-rows-[240px] md:gap-4 ${s.images.length >= 4 || s.images.length === 3 ? 'md:grid-cols-3' : s.images.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
          {#each s.images as im, n (n)}
            <figure class={`relative overflow-hidden bg-ink/5 ${tileClass(n, s.images.length)}`}>
              <ResponsiveImage src={im.url} alt={im.alt} sizes={n === 0 ? '(min-width:768px) 66vw, 100vw' : '(min-width:768px) 33vw, 50vw'} width={n === 0 ? 1200 : 640} imgClass="h-full w-full object-cover transition duration-700 hover:scale-[1.03]" />
              {#if im.caption}<figcaption class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 p-4 text-[13px] text-white">{im.caption}</figcaption>{/if}
            </figure>
          {/each}
        </div>

      <!-- ── Included / not included ────────────────────────────────────── -->
      {:else if s.kind === 'inclusions'}
        <div class="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div class="lg:col-span-4">{@render heading(s.eyebrow, s.title || "What's included")}</div>
          <div class="grid gap-4 sm:grid-cols-2 lg:col-span-8">
            {#if s.included.length}
              <div class="min-w-0 border border-deep-green/15 bg-deep-green/[0.035] p-5 md:p-7">
                <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-heading">Included</p>
                <ul class="mt-5 divide-y divide-ink/10 border-t border-ink/10">
                  {#each s.included as item, k (k)}
                    <li class="flex gap-3 py-3 text-[15px] leading-6 text-ink/75"><Check class="mt-1 h-4 w-4 shrink-0 text-clay" strokeWidth={2.4} />{item}</li>
                  {/each}
                </ul>
              </div>
            {/if}
            {#if s.excluded.length}
              <div class="min-w-0 border border-ink/10 bg-linen/50 p-5 md:p-7">
                <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink/75">Not included</p>
                <ul class="mt-5 divide-y divide-ink/10 border-t border-ink/10">
                  {#each s.excluded as item, k (k)}
                    <li class="flex gap-3 py-3 text-[15px] leading-6 text-ink/75"><Minus class="mt-1 h-4 w-4 shrink-0 text-clay" strokeWidth={2.4} />{item}</li>
                  {/each}
                </ul>
              </div>
            {/if}
          </div>
        </div>

      <!-- ── Destinations (picked in the CMS) ───────────────────────────── -->
      {:else if s.kind === 'destinations'}
        <div class="grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-16">
          <div class="lg:col-span-6">{@render heading(s.eyebrow || 'Where to go', s.title)}</div>
          {#if s.intro}<p class="max-w-[60ch] text-[15px] leading-7 text-ink/65 lg:col-span-6">{s.intro}</p>{/if}
        </div>
        <div class={`mt-12 grid gap-5 sm:grid-cols-2 md:mt-16 ${s.destinations.length === 4 || s.destinations.length >= 7 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
          {#each s.destinations as destination (destination.id)}
            <DestinationFeatureCard {destination} />
          {/each}
        </div>

      <!-- ── Curated itineraries ────────────────────────────────────────── -->
      {:else if s.kind === 'tours'}
        <div class="flex flex-wrap items-end justify-between gap-6">
          <div class="max-w-3xl">
            {@render heading(s.eyebrow || 'Itineraries', s.title || 'Trips to start from')}
            {#if s.intro}<p class="mt-5 text-[15px] leading-7 text-ink/65">{s.intro}</p>{/if}
          </div>
          <a class="group inline-flex items-center gap-2 border-b border-deep-green/30 pb-1 text-sm font-semibold text-deep-green transition hover:border-deep-green" href={toursHref}>
            Browse all itineraries
            <ArrowUpRight class="h-4 w-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
        </div>
        <div class="mt-12 grid gap-6 md:mt-16 md:grid-cols-2 lg:grid-cols-3">
          {#each s.tours as tour (tour.id)}
            <TourCardRich {tour} />
          {/each}
        </div>

      <!-- ── FAQ ────────────────────────────────────────────────────────── -->
      {:else if s.kind === 'faq'}
        <div class="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div class="lg:col-span-4">
            <div class="lg:sticky lg:top-[calc(var(--nav-h,70px)+88px)]">
              {@render heading(s.eyebrow || 'Questions', s.title || 'Frequently asked')}
              <p class="mt-5 inline-flex border border-ink/15 bg-linen/50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-clay">{s.items.length} questions answered</p>
              <p class="mt-6 text-[15px] leading-7 text-ink/65">Something we haven't covered? Ask us directly — a member of the team replies personally.</p>
              <a class="group mt-6 inline-flex items-center gap-2 border-b border-deep-green/30 pb-1 text-sm font-semibold text-deep-green transition hover:border-deep-green" href="/contact">
                Ask a question
                <ArrowRight class="h-4 w-4 transition group-hover:translate-x-0.5" />
              </a>
            </div>
          </div>
          <div class="lg:col-span-8">
            <!-- Native <details>: answers stay in the server HTML for search, only visually collapsed. -->
            {#each faqGroups(s.items) as group, g (g)}
              <div class={g ? 'mt-8' : ''}>
                {#if group.topic}<h3 class="mb-4 text-[12px] font-semibold uppercase tracking-[0.15em] text-clay">{group.topic}</h3>{/if}
                <div class="space-y-2">
                  {#each group.questions as item, k (k)}
                    <details class="style-faq group border border-ink/12 bg-surface open:border-goldfinch-gold/60 open:bg-linen/30">
                      <summary class="flex min-h-16 cursor-pointer list-none items-start justify-between gap-4 px-5 py-5 text-left md:px-6">
                        <span class="text-[15px] font-medium leading-6 text-heading md:text-[16px]">{item.q}</span>
                        <Plus class="mt-0.5 h-5 w-5 shrink-0 text-clay group-open:rotate-45" />
                      </summary>
                      <p class="max-w-[70ch] whitespace-pre-line px-5 pb-6 text-[15px] leading-7 text-ink/75 md:px-6">{item.a}</p>
                    </details>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </section>
  {/if}
{/each}

<style>
  .style-faq > summary::-webkit-details-marker {
    display: none;
  }
  /* The opening paragraph of the overview reads a size up. */
  :global(.style-lead > p:first-child) {
    font-size: 1.18em;
    line-height: 1.7;
    color: rgb(var(--c-ink) / 0.88);
  }
</style>
