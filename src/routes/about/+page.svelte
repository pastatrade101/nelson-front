<script lang="ts">
  import { ArrowRight, Check, ChevronDown } from '@lucide/svelte';
  import { fadeUpOnScroll, staggeredCardReveal } from '$lib/animations';
  import ResponsiveImage from '$lib/components/public/ResponsiveImage.svelte';
  import { thumbUrl } from '$lib/img';
  import type { PageData } from './$types';

  export let data: PageData;

  type Section = {
    section_key: string;
    title?: string | null;
    subtitle?: string | null;
    content?: string | null;
    image_url?: string | null;
    button_text?: string | null;
    button_url?: string | null;
    extra_data?: Record<string, unknown> | null;
    is_active?: boolean;
  };

  // The `about_*` rows of the shared homepage_sections table, SSR-loaded in +page.ts.
  $: sections = (data.sections ?? {}) as unknown as Record<string, Section>;

  $: cms = (key: string, field: keyof Section, fallback = ''): string => {
    const value = sections[key]?.[field];
    return typeof value === 'string' && value.trim() ? value : fallback;
  };
  $: extra = (key: string): Record<string, unknown> => (sections[key]?.extra_data ?? {}) as Record<string, unknown>;
  $: ex = (key: string, field: string, fallback = ''): string => {
    const value = extra(key)[field];
    return typeof value === 'string' && value.trim() ? value : fallback;
  };
  $: on = (key: string): boolean => Boolean(sections[key]) && sections[key]?.is_active !== false;
  const list = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
  const paras = (value: string): string[] => value.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  type Stat = { value: string; label: string };
  type Guide = { name: string; title: string; speciality?: string; years?: string; quote?: string; author?: string; image_url?: string };
  type Block = { title?: string; body?: string; items?: string[] };

  $: stats = list<Stat>(extra('about_stats').stats);
  $: guides = list<Guide>(extra('about_guides').guides);
  $: licences = list<string>(extra('about_licences').items);
  $: givingBlocks = list<Block>(extra('about_giving').blocks);

  $: seoTitle = ex('about_seo', 'meta_title', 'About Emnel Adventures — Private Tanzania Safaris from Arusha');
  $: seoDescription = ex(
    'about_seo',
    'meta_description',
    'Emnel Adventures is a family-founded, locally owned Tanzania safari company based in Arusha.'
  );

  const embedUrl = (raw: string): string => {
    const yt = raw.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
    if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
    const vimeo = raw.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
    return raw;
  };
  $: beginningVideo = ex('about_beginning', 'video_url');

  const eyebrowCls = 'text-[11px] font-bold uppercase tracking-[0.18em] text-clay';

  // Editorial typography for CMS prose. The copy is written in short, deliberate
  // beats ("He's still in Arusha.") — rendering every paragraph at the same size
  // flattens that. So: the opening paragraph leads, and the short standalone
  // lines are set as serif statements, which is how they read out loud.
  const isStatement = (p: string) => p.length <= 72;
  const paraClass = (p: string, i: number, tone: 'light' | 'dark' = 'light'): string => {
    const body = tone === 'dark' ? 'text-white/75' : 'text-ink/75';
    const lead = tone === 'dark' ? 'text-white/85' : 'text-ink/80';
    const strong = tone === 'dark' ? 'text-white' : 'text-heading';
    // Short beats become gold-ruled serif statements — they punctuate the column
    // instead of disappearing into it.
    if (isStatement(p)) return `border-l-2 border-goldfinch-gold pl-4 font-serif text-[21px] font-light leading-[1.45] md:text-[23px] ${strong}`;
    // The opening paragraph carries a gold drop cap as the entry point.
    if (i === 0) return `dropcap text-[16px] leading-8 ${lead}`;
    return `text-[15px] leading-7 ${body}`;
  };
</script>

<svelte:head>
  <title>{seoTitle}</title>
  <meta name="description" content={seoDescription} />
</svelte:head>

<!-- ── Hero (original design, now CMS-driven) ────────────────────────────── -->
{#if on('about_hero')}
  <section class="relative overflow-hidden bg-deep-green text-white">
    {#if cms('about_hero', 'image_url')}
      <ResponsiveImage
        imgClass="absolute inset-0 h-full w-full object-cover object-center"
        src={cms('about_hero', 'image_url')}
        fallbackSrc={thumbUrl(sections.about_hero ?? {}, 'image_url')}
        alt={ex('about_hero', 'image_alt', cms('about_hero', 'title'))}
        width={1900}
        sizes="100vw"
        eager
        priority
      />
      <div class="absolute inset-0 bg-[linear-gradient(90deg,rgba(28,26,22,0.52)_0%,rgba(28,26,22,0.28)_38%,transparent_100%)]"></div>
      <div class="absolute inset-0 bg-[linear-gradient(180deg,rgba(28,26,22,0.12)_0%,transparent_32%,rgba(28,26,22,0.4)_100%)]"></div>
    {/if}

    <div class="relative z-10 mx-auto flex min-h-[560px] w-full max-w-[1500px] items-center px-5 py-24 md:min-h-[660px] md:px-8 md:py-28">
      <div class="max-w-[840px] [text-shadow:0_2px_18px_rgba(0,0,0,0.5)]">
        {#if ex('about_hero', 'eyebrow')}
          <p class="brand-eyebrow">{ex('about_hero', 'eyebrow')}</p>
        {/if}
        <h1 class="mt-6 font-serif text-[44px] font-light leading-[1.04] tracking-normal sm:text-[60px] lg:text-[74px]">
          {cms('about_hero', 'title')}
        </h1>
        {#if cms('about_hero', 'subtitle')}
          <p class="mt-7 max-w-[680px] text-[15px] leading-8 text-white/85 md:text-lg">{cms('about_hero', 'subtitle')}</p>
        {/if}

        <div class="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center">
          {#if cms('about_hero', 'button_text') && cms('about_hero', 'button_url')}
            <a
              class="inline-flex h-12 items-center justify-center gap-2 bg-goldfinch-gold px-7 text-[13px] font-semibold uppercase tracking-[0.08em] text-deep-green transition hover:bg-savanna"
              href={cms('about_hero', 'button_url')}
            >
              {cms('about_hero', 'button_text')} <ArrowRight size={17} strokeWidth={2.4} />
            </a>
          {/if}
          {#if ex('about_hero', 'secondary_cta') && ex('about_hero', 'secondary_href')}
            <a
              class="inline-flex h-12 items-center justify-center gap-2 border border-goldfinch-gold px-7 text-[13px] font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-goldfinch-gold hover:text-deep-green"
              href={ex('about_hero', 'secondary_href')}
            >
              {ex('about_hero', 'secondary_cta')}
            </a>
          {/if}
        </div>

        {#if cms('about_hero', 'content')}
          <p class="mt-9 text-sm font-medium text-white/70">
            {#if ex('about_hero', 'trust_stars')}<span class="text-goldfinch-gold">{ex('about_hero', 'trust_stars')}</span>{/if}
            {cms('about_hero', 'content')}
          </p>
        {/if}
      </div>
    </div>
  </section>
{/if}

<!-- ── Stats: one full-width stripe directly under the hero ──────────────── -->
{#if on('about_stats') && stats.length}
  <section class="border-t border-goldfinch-gold/30 bg-deep-green text-white">
    <dl class="container-shell grid grid-cols-2 divide-ink/0 md:grid-cols-4">
      {#each stats as stat, i}
        <div
          class={`px-2 py-7 text-center md:px-4 md:py-8 ${i > 0 ? 'md:border-l md:border-white/12' : ''} ${i % 2 === 1 ? 'border-l border-white/12 md:border-l' : ''} ${i > 1 ? 'border-t border-white/12 md:border-t-0' : ''}`}
        >
          <dd class="font-serif text-[28px] font-light leading-none text-goldfinch-gold md:text-[34px]">{stat.value}</dd>
          <dt class="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">{stat.label}</dt>
        </div>
      {/each}
    </dl>
  </section>
{/if}

<!-- ── Story behind the name — two columns ───────────────────────────────── -->
{#if on('about_founder')}
  <section class="bg-canvas py-14 md:py-18">
    <div class="container-shell grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start lg:gap-14">
      <div class="lg:sticky lg:top-28">
        {#if ex('about_founder', 'eyebrow')}<p class={eyebrowCls}>{ex('about_founder', 'eyebrow')}</p>{/if}
        <h2 class="mt-3 font-serif text-[30px] font-light leading-[1.1] text-heading md:text-[40px]">
          {cms('about_founder', 'title')}
        </h2>
        {#if ex('about_founder', 'quote')}
          <blockquote class="mt-6 border-l-2 border-goldfinch-gold pl-5 font-serif text-[19px] italic leading-8 text-heading/85">
            {ex('about_founder', 'quote')}
          </blockquote>
        {/if}
        {#if cms('about_founder', 'image_url')}
          <figure class="mt-7">
            <div class="aspect-[4/3] overflow-hidden bg-deep-green">
              <ResponsiveImage
                imgClass="h-full w-full object-cover"
                src={cms('about_founder', 'image_url')}
                fallbackSrc={thumbUrl(sections.about_founder ?? {}, 'image_url')}
                alt={ex('about_founder', 'image_caption', cms('about_founder', 'title'))}
                width={900}
                sizes="(min-width:1024px) 45vw, 100vw"
              />
            </div>
            {#if ex('about_founder', 'image_caption')}
              <figcaption class="mt-2.5 text-[13px] leading-6 text-ink/55">{ex('about_founder', 'image_caption')}</figcaption>
            {/if}
          </figure>
        {/if}
        {#if cms('about_founder', 'button_text') && cms('about_founder', 'button_url')}
          <a class="mt-6 inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-forest transition hover:text-goldfinch-gold" href={cms('about_founder', 'button_url')}>
            {cms('about_founder', 'button_text')} <ArrowRight size={15} />
          </a>
        {/if}
      </div>

      <!-- narrative: constrained measure, with the short beats set as statements -->
      <div class="max-w-[62ch] space-y-5 lg:pt-2">
        {#each paras(cms('about_founder', 'content')) as p, i}
          <p class={paraClass(p, i)}>{p}</p>
        {/each}
      </div>
    </div>
  </section>
{/if}

<!-- ── How it began (text + film side by side) ───────────────────────────── -->
{#if on('about_beginning')}
  <section class="bg-linen py-14 md:py-18" use:fadeUpOnScroll={{ y: 14 }}>
    <div class="container-shell grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-14">
      <div>
        {#if ex('about_beginning', 'eyebrow')}<p class={eyebrowCls}>{ex('about_beginning', 'eyebrow')}</p>{/if}
        <h2 class="mt-3 font-serif text-[30px] font-light leading-[1.1] text-heading md:text-[40px]">
          {cms('about_beginning', 'title')}
        </h2>
        <div class="mt-6 max-w-[62ch] space-y-5">
          {#each paras(cms('about_beginning', 'content')) as p, i}
            <p class={paraClass(p, i)}>{p}</p>
          {/each}
        </div>
      </div>

      <div class="lg:sticky lg:top-28">
        {#if beginningVideo}
          <figure>
            <div class="aspect-video w-full overflow-hidden bg-deep-green">
              <iframe
                class="h-full w-full"
                src={embedUrl(beginningVideo)}
                title={ex('about_beginning', 'video_caption', 'Emnel Adventures film')}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen
              ></iframe>
            </div>
            {#if ex('about_beginning', 'video_caption')}
              <figcaption class="mt-2.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink/50">{ex('about_beginning', 'video_caption')}</figcaption>
            {/if}
          </figure>
        {/if}
        {#if ex('about_beginning', 'closing')}
          <div class="space-y-4 border-l-2 border-goldfinch-gold/60 pl-5 {beginningVideo ? 'mt-7' : ''}">
            {#each paras(ex('about_beginning', 'closing')) as p, i}
              <p class={paraClass(p, i)}>{p}</p>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </section>
{/if}

<!-- ── What we do + credentials (one section, two columns) ───────────────── -->
{#if on('about_what_we_do') || (on('about_licences') && licences.length)}
  <section class="bg-canvas py-14 md:py-18">
    <div class="container-shell grid gap-10 lg:grid-cols-[1.25fr_0.75fr] lg:gap-14">
      {#if on('about_what_we_do')}
        <div>
          {#if ex('about_what_we_do', 'eyebrow')}<p class={eyebrowCls}>{ex('about_what_we_do', 'eyebrow')}</p>{/if}
          <h2 class="mt-3 font-serif text-[30px] font-light leading-[1.1] text-heading md:text-[40px]">
            {cms('about_what_we_do', 'title')}
          </h2>
          <div class="mt-6 max-w-[66ch] space-y-5 border-l-2 border-goldfinch-gold/40 bg-savanna/30 p-6 md:p-7">
            {#each paras(cms('about_what_we_do', 'content')) as p, i}
              <p class={paraClass(p, i)}>{p}</p>
            {/each}
          </div>
        </div>
      {/if}

      {#if on('about_licences') && licences.length}
        <aside class="border border-ink/10 bg-surface p-6 lg:sticky lg:top-28 lg:self-start">
          <h3 class="font-serif text-[22px] font-light leading-snug text-heading">{cms('about_licences', 'title')}</h3>
          {#if cms('about_licences', 'content')}
            <p class="mt-3 text-[14px] leading-6 text-ink/65">{paras(cms('about_licences', 'content'))[0]}</p>
          {/if}
          <ul class="mt-5 grid gap-3">
            {#each licences as item}
              <li class="flex items-start gap-2.5 text-[14px] leading-6 text-heading">
                <Check size={16} class="mt-0.5 shrink-0 text-goldfinch-gold" strokeWidth={2.6} />
                {item}
              </li>
            {/each}
          </ul>
        </aside>
      {/if}
    </div>
  </section>
{/if}

<!-- ── The team ──────────────────────────────────────────────────────────── -->
{#if on('about_guides') && guides.length}
  <section id="team" class="scroll-mt-24 bg-linen py-14 md:py-18" use:fadeUpOnScroll={{ y: 14 }}>
    <div class="container-shell">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div class="max-w-[620px]">
          {#if cms('about_guides', 'subtitle')}<p class={eyebrowCls}>{cms('about_guides', 'subtitle')}</p>{/if}
          <h2 class="mt-3 font-serif text-[30px] font-light leading-[1.1] text-heading md:text-[40px]">
            {cms('about_guides', 'title')}
          </h2>
          {#if cms('about_guides', 'content')}
            <p class="mt-4 text-[15px] leading-7 text-ink/70">{paras(cms('about_guides', 'content')).join(' ')}</p>
          {/if}
        </div>
        {#if cms('about_guides', 'button_text') && cms('about_guides', 'button_url')}
          <a class="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-forest transition hover:text-goldfinch-gold" href={cms('about_guides', 'button_url')}>
            {cms('about_guides', 'button_text')} <ArrowRight size={15} />
          </a>
        {/if}
      </div>

      <div class="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" use:staggeredCardReveal={{ y: 14, stagger: 0.05 }}>
        {#each guides as g (g.name)}
          <article class="flex h-full flex-col border border-ink/10 bg-surface p-5">
            {#if g.image_url}
              <div class="mb-4 aspect-square overflow-hidden bg-deep-green">
                <ResponsiveImage imgClass="h-full w-full object-cover" src={g.image_url} alt={g.name} width={600} sizes="(min-width:1024px) 25vw, 50vw" />
              </div>
            {/if}
            <h3 class="font-serif text-[20px] font-light leading-snug text-heading">{g.name}</h3>
            {#if g.title}<p class="mt-1 text-[12px] font-semibold text-goldfinch-gold">{g.title}</p>{/if}
            {#if g.speciality}<p class="mt-2.5 text-[13.5px] leading-6 text-ink/70">{g.speciality}</p>{/if}
            {#if g.years}<p class="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/50">{g.years}</p>{/if}
            {#if g.quote}
              <blockquote class="mt-4 border-t border-ink/10 pt-4 font-serif text-[15px] italic leading-6 text-ink/75">“{g.quote}”</blockquote>
              {#if g.author}<p class="mt-2 text-[11px] font-medium text-ink/55">— {g.author}</p>{/if}
            {/if}
          </article>
        {/each}
      </div>
    </div>
  </section>
{/if}

<!-- ── Giving back — intro + collapsible detail (keeps the page short) ───── -->
{#if on('about_giving')}
  <section class="bg-deep-green py-14 text-white md:py-18">
    <div class="container-shell">
      <div class="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-start lg:gap-14">
        <!-- Intro lives here (not in the right column) so the two sides carry
             comparable weight; sticky keeps it alongside the accordion stack. -->
        <div class="lg:sticky lg:top-28 lg:self-start">
          {#if cms('about_giving', 'title')}
            <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-goldfinch-gold">{cms('about_giving', 'title')}</p>
          {/if}
          {#if cms('about_giving', 'subtitle')}
            <h2 class="mt-3 font-serif text-[30px] font-light leading-[1.1] text-white md:text-[40px]">{cms('about_giving', 'subtitle')}</h2>
          {/if}
          {#if cms('about_giving', 'content')}
            <div class="mt-6 max-w-[58ch] space-y-4">
              {#each paras(cms('about_giving', 'content')) as p, i}
                <p class={paraClass(p, i, 'dark')}>{p}</p>
              {/each}
            </div>
          {/if}
          {#if ex('about_giving', 'highlight')}
            <p class="mt-6 border border-goldfinch-gold/40 bg-goldfinch-gold/10 p-4 font-serif text-[17px] italic leading-7 text-goldfinch-gold">
              {ex('about_giving', 'highlight')}
            </p>
          {/if}
          {#if cms('about_giving', 'button_text') && cms('about_giving', 'button_url')}
            <a
              class="mt-6 inline-flex h-11 items-center justify-center gap-2 border border-goldfinch-gold px-6 text-[12px] font-bold uppercase tracking-[0.12em] text-goldfinch-gold transition hover:bg-goldfinch-gold hover:text-deep-green"
              href={cms('about_giving', 'button_url')}
              target="_blank"
              rel="noopener noreferrer"
            >
              {cms('about_giving', 'button_text')} <ArrowRight size={15} />
            </a>
          {/if}
        </div>

        <div>
          {#if givingBlocks.length}
            <div class="grid gap-2">
              {#each givingBlocks as block, i}
                <details class="group border border-white/12 bg-white/[0.04]" open={i === 0}>
                  <summary class="flex cursor-pointer list-none items-center justify-between gap-4 p-4">
                    <h3 class="font-serif text-[18px] font-light leading-snug text-white md:text-[20px]">{block.title}</h3>
                    <span class="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/25 text-white/70 transition group-open:rotate-180">
                      <ChevronDown size={15} />
                    </span>
                  </summary>
                  <div class="border-t border-white/10 px-4 pb-5 pt-4">
                    {#if block.body}
                      <div class="grid gap-3.5 text-[14.5px] leading-7 text-goldfinch-gold/90">
                        {#each paras(block.body) as p}
                          <p>{p}</p>
                        {/each}
                      </div>
                    {/if}
                    {#if block.items?.length}
                      <ul class="mt-4 grid gap-2 sm:grid-cols-2">
                        {#each block.items as item}
                          <li class="flex items-start gap-2.5 text-[14px] leading-6 text-goldfinch-gold/90">
                            <span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-goldfinch-gold"></span>{item}
                          </li>
                        {/each}
                      </ul>
                    {/if}
                  </div>
                </details>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </div>
  </section>
{/if}

<!-- ── Closing narrative + final CTA (merged) ────────────────────────────── -->
{#if on('about_closing') || on('about_cta')}
  <section class="bg-canvas py-14 md:py-18">
    <div class="container-shell grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-14">
      {#if on('about_closing')}
        <div class="border border-ink/10 bg-surface p-7 shadow-soft md:p-9">
          <span class="block h-0.5 w-14 bg-goldfinch-gold"></span>
          <h2 class="mt-5 font-serif text-[28px] font-light leading-[1.12] text-heading md:text-[36px]">{cms('about_closing', 'title')}</h2>
          <div class="mt-5 max-w-[62ch] space-y-4">
            {#each paras(cms('about_closing', 'content')) as p, i}
              <p class={paraClass(p, i)}>{p}</p>
            {/each}
          </div>
        </div>
      {/if}

      {#if on('about_cta')}
        <div class="bg-deep-green p-7 text-white md:p-9">
          <h2 class="font-serif text-[26px] font-light leading-snug md:text-[32px]">{cms('about_cta', 'title')}</h2>
          {#if cms('about_cta', 'subtitle')}
            <p class="mt-4 text-[15px] leading-7 text-white/75">{cms('about_cta', 'subtitle')}</p>
          {/if}
          {#if cms('about_cta', 'button_text') && cms('about_cta', 'button_url')}
            <a
              class="mt-7 inline-flex h-12 items-center justify-center gap-2 bg-goldfinch-gold px-7 text-[12px] font-bold uppercase tracking-[0.12em] text-deep-green transition hover:bg-savanna"
              href={cms('about_cta', 'button_url')}
            >
              {cms('about_cta', 'button_text')} <ArrowRight size={16} strokeWidth={2.5} />
            </a>
          {/if}
          {#if ex('about_cta', 'footnote')}
            <p class="mt-7 border-t border-white/15 pt-5 text-[12px] font-semibold uppercase tracking-[0.14em] text-white/55">
              {ex('about_cta', 'footnote')}
            </p>
          {/if}
        </div>
      {/if}
    </div>
  </section>
{/if}

<style>
  /* Native disclosure marker off — the chevron button is the affordance. */
  details > summary::-webkit-details-marker {
    display: none;
  }

  /* Gold drop cap on the opening paragraph of each narrative — the single
     strongest, cheapest visual anchor for a long-form column. */
  .dropcap::first-letter {
    float: left;
    margin: 0.06em 0.09em 0 0;
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 3.5em;
    font-weight: 300;
    line-height: 0.8;
    color: rgb(var(--c-goldfinch-gold));
  }

</style>
