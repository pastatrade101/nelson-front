<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowRight, ChevronDown, Compass, MapPin, MessageCircle, Quote, ShieldCheck, Sparkles, Users } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import { imgUrl, thumbUrl } from '$lib/img';
  import { fadeUpOnScroll, revealHeading, staggeredCardReveal } from '$lib/animations';
  import LoadingState from '$lib/components/public/LoadingState.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import EmptyState from '$lib/components/public/EmptyState.svelte';
  import type { Destination } from '$lib/types';

  type Style = {
    name: string;
    slug: string;
    description?: string | null;
    who_its_for?: string | null;
    fitness?: string | null;
    highlights?: string[] | null;
    image_url?: string | null;
  };
  type Stat = { count: number; from: number; currency: string };

  let styles: Style[] = [];
  let catStats: Record<string, Stat> = {};
  let heroImage = '';
  let destCount = 0;
  let loading = true;
  let failed = false;

  onMount(async () => {
    const [catRes, tourRes, destRes] = await Promise.allSettled([
      api.categories.list({ status: 'published', limit: 100 }),
      api.tours.list({ status: 'published', limit: 100 }),
      api.destinations.list({ status: 'published', limit: 100 })
    ]);
    if (catRes.status === 'fulfilled') {
      styles = ((catRes.value.data.items ?? []) as unknown as Style[]).filter((s) => s.name && s.slug);
    } else {
      failed = true;
    }
    if (tourRes.status === 'fulfilled') {
      const stats: Record<string, Stat> = {};
      for (const t of (tourRes.value.data.items ?? []) as Array<Record<string, unknown>>) {
        const slug = (t.tour_categories as { slug?: string } | undefined)?.slug;
        if (!slug) continue;
        const s = (stats[slug] = stats[slug] ?? { count: 0, from: Infinity, currency: 'USD' });
        s.count += 1;
        const price = Number(t.price_from) || 0;
        if (price > 0 && price < s.from) { s.from = price; s.currency = String(t.currency || 'USD'); }
      }
      for (const s of Object.values(stats)) if (s.from === Infinity) s.from = 0;
      catStats = stats;
    }
    if (destRes.status === 'fulfilled') {
      const dests = (destRes.value.data.items ?? []) as Destination[];
      destCount = dests.length;
      const withImg = (d: Destination) => thumbUrl(d, 'banner_image_url', 'main_image_url', 'image_url');
      const src = dests.find((d) => d.is_featured && withImg(d)) ?? dests.find((d) => withImg(d));
      heroImage = src ? imgUrl(withImg(src), 1920) : '';
    }
    loading = false;
  });

  const styleImg = (s: Style, w = 900) =>
    /^(https?:\/\/|\/)/.test(s.image_url ?? '') ? imgUrl(s.image_url ?? '', w) : '';
  const blurb = (text?: string | null, n = 170): string => {
    const t = (text ?? '').trim();
    return t.length <= n ? t : t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…';
  };
  const activity = (s: Style): string => (s.fitness ?? '').split(/[—-]/)[0].trim();

  // A quick-decision label derived from the style's own identity — no invented facts.
  // Distinctive, category-defining keywords are matched on the NAME first so each
  // style gets its most telling label; broader audience keywords fall back to who_its_for.
  const decisionLabel = (s: Style): string => {
    const name = `${s.slug} ${s.name}`.toLowerCase();
    const all = `${name} ${s.who_its_for ?? ''}`.toLowerCase();
    if (/big.?five/.test(name)) return 'Best for Big Five';
    if (/migration/.test(name)) return 'Iconic wildlife event';
    if (/honeymoon/.test(name)) return 'Best for couples';
    if (/photograph/.test(name)) return 'Best for photography';
    if (/fly.?in/.test(name)) return 'Time-efficient';
    if (/luxury/.test(name)) return 'Top-tier luxury';
    if (/zanzibar|beach|holiday/.test(name)) return 'Safari + beach';
    if (/short/.test(name)) return 'Great for short trips';
    if (/first.?time/.test(name)) return 'Best for first-timers';
    if (/family|families/.test(name)) return 'Best for families';
    if (/private/.test(name)) return 'Fully private';
    if (/classic|northern/.test(name)) return 'The classic route';
    if (/honeymoon|couple/.test(all)) return 'Best for couples';
    if (/family|families|children/.test(all)) return 'Best for families';
    if (/first.?time/.test(all)) return 'Best for first-timers';
    return '';
  };

  // Featured = the style with the most itineraries (a real signal).
  $: featured = styles.length
    ? [...styles].sort((a, b) => (catStats[b.slug]?.count ?? 0) - (catStats[a.slug]?.count ?? 0))[0]
    : undefined;
  $: rest = styles.filter((s) => s.slug !== featured?.slug);
  $: restA = rest.slice(0, 6);
  $: restB = rest.slice(6);

  // Animated counter for the stat strip.
  const countUp = (node: HTMLElement, target: number) => {
    let done = false;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || done) return;
        done = true;
        const dur = 1100;
        const start = performance.now();
        const step = (now: number) => {
          const p = Math.min(1, (now - start) / dur);
          node.textContent = String(Math.round((1 - Math.pow(1 - p, 3)) * target));
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      },
      { threshold: 0.5 }
    );
    io.observe(node);
    return { destroy: () => io.disconnect() };
  };

  const heroChips = ['Luxury', 'Family', 'Honeymoon', 'Photography', 'Private', 'Great Migration'];
  const trust = ['Private vehicles only', 'Tailor-made itineraries', 'Tanzania-born guides', 'Arusha-based since 2016', 'A specialist through your trip'];
</script>

<svelte:head>
  <title>Safari Styles | Emnel Adventures</title>
  <meta
    name="description"
    content="Every Emnel safari is private and tailor-made — but they start from a style. Family, honeymoon, the Great Migration, Big Five, luxury, photography and more. Find the way you want to travel."
  />
</svelte:head>

<!-- ── cinematic hero ─────────────────────────────────────────────────────── -->
<section class="relative overflow-hidden bg-deep-green text-white">
  {#if heroImage}
    <img src={heroImage} alt="" class="absolute inset-0 h-full w-full object-cover object-center" decoding="async" />
    <div class="absolute inset-0 bg-[linear-gradient(90deg,rgba(28,26,22,0.94)_0%,rgba(28,26,22,0.74)_48%,rgba(28,26,22,0.4)_100%)]"></div>
  {/if}
  <div class="container-shell relative py-20 md:py-28">
    <p class="text-[12px] font-bold uppercase tracking-[0.22em] text-goldfinch-gold">Safari Styles</p>
    <h1 class="mt-4 max-w-3xl font-serif text-4xl font-light leading-[1.06] md:text-6xl" use:revealHeading>
      Find the safari that fits the way you travel
    </h1>
    <p class="mt-5 max-w-2xl text-base leading-8 text-white/80 md:text-lg">
      Every safari we run is private and built around you — but it starts from a style. However you like to travel,
      here's the one we'd shape a journey around.
    </p>
    {#if styles.length}
      <p class="mt-4 text-sm font-semibold text-goldfinch-gold">{styles.length} ways to experience Tanzania</p>
    {/if}
    <div class="mt-7 flex flex-wrap gap-2">
      {#each heroChips as chip}
        <span class="border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/85 backdrop-blur">{chip}</span>
      {/each}
    </div>
    <div class="mt-8 flex flex-wrap gap-3">
      <a href="#styles" class="group inline-flex h-12 items-center gap-2 bg-goldfinch-gold px-7 text-[12px] font-bold uppercase tracking-[0.14em] text-deep-green transition hover:bg-savanna">
        Explore Safari Styles <ArrowRight size={16} strokeWidth={2.5} class="transition-transform group-hover:translate-x-0.5" />
      </a>
      <a href="/plan-my-trip" class="inline-flex h-12 items-center gap-2 border border-white/30 px-7 text-[12px] font-bold uppercase tracking-[0.14em] text-white transition hover:border-goldfinch-gold hover:text-goldfinch-gold">
        Plan My Safari
      </a>
    </div>
  </div>
  <a href="#intro" aria-label="Scroll to explore" class="absolute inset-x-0 bottom-5 mx-auto grid w-fit place-items-center text-white/60 transition hover:text-goldfinch-gold">
    <ChevronDown size={22} class="animate-bounce" />
  </a>
</section>

<!-- ── intro + why it matters ─────────────────────────────────────────────── -->
<section id="intro" class="container-shell py-16 md:py-20" use:fadeUpOnScroll={{ y: 16 }}>
  <div class="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16">
    <div>
      <p class="brand-eyebrow">Where every safari begins</p>
      <h2 class="mt-3 font-serif text-3xl font-light leading-[1.1] text-heading md:text-[42px]">Choose the safari that matches the way you travel.</h2>
      <p class="mt-5 max-w-md text-[15px] leading-8 text-ink/70">
        A style isn't a fixed package — it's a starting point. Pick the one that fits, and a local specialist shapes the
        route, lodges, pace and timing around you.
      </p>
    </div>
    <div class="grid gap-4 sm:grid-cols-3">
      {#each [{ icon: Compass, t: 'Shaped around you', d: 'Every trip is private and tailor-made — no fixed departures.' }, { icon: Users, t: 'People who run it', d: 'Planned by the Arusha team who guide these safaris themselves.' }, { icon: ShieldCheck, t: 'Honest advice', d: "We'll tell you plainly what's worth it — and what isn't." }] as b}
        <div class="border border-ink/10 bg-surface p-5 shadow-soft transition-shadow hover:shadow-md">
          <span class="grid h-10 w-10 place-items-center rounded-lg bg-forest/10 text-forest"><svelte:component this={b.icon} size={18} strokeWidth={2} /></span>
          <p class="mt-4 font-serif text-lg text-heading">{b.t}</p>
          <p class="mt-1.5 text-[13px] leading-6 text-ink/60">{b.d}</p>
        </div>
      {/each}
    </div>
  </div>
</section>

{#if loading}
  <section class="container-shell py-20"><LoadingState message="Loading safari styles..." /></section>
{:else if failed}
  <section class="container-shell py-20"><ErrorState message="We couldn't load safari styles right now. Please refresh in a moment." /></section>
{:else if !styles.length}
  <section class="container-shell py-20"><EmptyState title="Safari styles coming soon" message="Our safari styles are being prepared — check back again shortly." /></section>
{:else}
  <!-- ── stat strip ───────────────────────────────────────────────────────── -->
  <section class="border-y border-white/10 bg-deep-green text-white">
    <div class="container-shell grid gap-px overflow-hidden border-x border-white/[0.07] py-0 sm:grid-cols-2 lg:grid-cols-4">
      {#each [{ n: styles.length, s: '', l: 'Safari styles' }, { n: destCount, s: '', l: 'Destinations' }, { n: 3, s: '', l: 'Safari circuits' }, { n: 100, s: '%', l: 'Private & tailor-made' }] as stat}
        <div class="border-b border-white/[0.07] px-6 py-9 sm:border-r lg:border-b-0">
          <p class="font-serif text-[44px] font-light leading-none text-goldfinch-gold md:text-[52px]">
            <span use:countUp={stat.n}>0</span>{stat.s}
          </p>
          <p class="mt-3 text-[11px] font-bold uppercase tracking-[0.2em] text-white/45">{stat.l}</p>
        </div>
      {/each}
    </div>
  </section>

  <!-- ── trust bar ────────────────────────────────────────────────────────── -->
  <section class="border-b border-ink/[0.06] bg-sand/40">
    <div class="container-shell flex flex-wrap items-center justify-center gap-x-8 gap-y-3 py-5 text-[12px] font-semibold text-ink/65">
      {#each trust as point}
        <span class="inline-flex items-center gap-2"><ShieldCheck size={14} class="text-forest" strokeWidth={2.4} />{point}</span>
      {/each}
    </div>
  </section>

  <div id="styles" class="scroll-mt-24"></div>

  <!-- ── featured style ───────────────────────────────────────────────────── -->
  {#if featured}
    {@const fImg = styleImg(featured, 1400)}
    {@const fStat = catStats[featured.slug]}
    <section class="container-shell py-14 md:py-20" use:fadeUpOnScroll={{ y: 18 }}>
      <a href={`/tours?category=${featured.slug}`} class="group grid overflow-hidden border border-ink/10 bg-surface shadow-soft transition-shadow duration-300 hover:shadow-[0_28px_70px_rgba(28,26,22,0.18)] lg:grid-cols-2">
        <div class="relative min-h-[300px] overflow-hidden bg-deep-green lg:min-h-[480px]">
          {#if fImg}
            <img src={fImg} alt={featured.name} loading="lazy" class="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]" />
          {:else}
            <div class="absolute inset-0 bg-[linear-gradient(150deg,#153733_0%,#0f2a2a_46%,rgba(74,55,40,0.96)_100%)]"></div>
            <span class="pointer-events-none absolute inset-0 opacity-[0.06]" style="background-image: radial-gradient(circle, #fff 1px, transparent 1.5px); background-size: 22px 22px;" aria-hidden="true"></span>
          {/if}
          <span class="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,26,24,0)_45%,rgba(13,22,20,0.5)_100%)]"></span>
          {#if fStat?.count}
            <span class="absolute left-5 top-5 inline-flex items-center gap-1.5 bg-goldfinch-gold px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-deep-green"><Sparkles size={12} strokeWidth={2.6} /> Most itineraries</span>
          {/if}
        </div>
        <div class="flex flex-col justify-center p-8 md:p-12">
          {#if decisionLabel(featured)}<p class="text-[11px] font-bold uppercase tracking-[0.18em] text-goldfinch-gold">{decisionLabel(featured)}</p>{/if}
          <h3 class="mt-2 font-serif text-[32px] font-light leading-[1.05] text-heading md:text-[44px]">{featured.name}</h3>
          {#if featured.description}<p class="mt-4 max-w-lg text-[15px] leading-8 text-ink/70">{blurb(featured.description, 280)}</p>{/if}
          {#if featured.highlights?.length}
            <div class="mt-5 flex flex-wrap gap-2">
              {#each featured.highlights.slice(0, 5) as h}<span class="border border-goldfinch-gold/40 bg-goldfinch-gold/10 px-2.5 py-1 text-[11px] font-semibold text-clay">{h}</span>{/each}
            </div>
          {/if}
          <div class="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
            {#if activity(featured)}<span class="text-sm text-ink/60"><span class="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/40">Pace </span>{activity(featured)}</span>{/if}
            {#if fStat?.count}<span class="text-sm text-ink/70"><span class="font-bold text-heading">{fStat.count}</span> itinerar{fStat.count === 1 ? 'y' : 'ies'}{#if fStat.from} · from <span class="font-bold text-heading">{fStat.currency} {fStat.from.toLocaleString()}</span>{/if}</span>{/if}
          </div>
          <span class="mt-8 inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.16em] text-forest transition group-hover:text-goldfinch-gold">
            Explore {featured.name} <ArrowRight size={15} strokeWidth={2.6} class="transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </a>
    </section>
  {/if}

  <!-- ── styles grid (part A) ─────────────────────────────────────────────── -->
  <section class="container-shell pb-4">
    <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ selector: '.style-card', y: 18, stagger: 0.05 }}>
      {#each restA as style (style.slug)}
        {@const image = styleImg(style)}
        {@const s = catStats[style.slug]}
        {@const label = decisionLabel(style)}
        <a href={`/tours?category=${style.slug}`} class="style-card group flex flex-col overflow-hidden border border-ink/10 bg-surface shadow-[0_14px_40px_rgba(28,26,22,0.07)] transition-all duration-300 hover:-translate-y-1 hover:border-goldfinch-gold/40 hover:shadow-[0_28px_64px_rgba(28,26,22,0.18)]">
          <div class="relative aspect-[16/10] overflow-hidden bg-deep-green">
            {#if image}
              <img src={image} alt={style.name} loading="lazy" class="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
            {:else}
              <div class="absolute inset-0 bg-[linear-gradient(150deg,#153733_0%,#0f2a2a_46%,rgba(74,55,40,0.96)_100%)]"></div>
              <span class="pointer-events-none absolute inset-0 opacity-[0.06]" style="background-image: radial-gradient(circle, #fff 1px, transparent 1.5px); background-size: 22px 22px;" aria-hidden="true"></span>
            {/if}
            <span class="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,26,24,0)_35%,rgba(13,22,20,0.85)_100%)]"></span>
            {#if label}<span class="absolute left-4 top-4 bg-deep-green/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-goldfinch-gold backdrop-blur">{label}</span>{/if}
            <h3 class="absolute inset-x-5 bottom-4 font-serif text-[26px] font-normal leading-tight text-white">{style.name}</h3>
          </div>
          <div class="flex flex-1 flex-col p-6">
            {#if blurb(style.description)}<p class="text-[14px] leading-7 text-ink/70">{blurb(style.description)}</p>{/if}
            {#if style.who_its_for}<p class="mt-3 text-[13px] leading-6 text-ink/60"><span class="font-bold text-clay">Best for </span>{blurb(style.who_its_for, 90)}</p>{/if}
            {#if style.highlights?.length}
              <div class="mt-4 flex flex-wrap gap-1.5">
                {#each style.highlights.slice(0, 3) as h}<span class="border border-ink/10 bg-sand/50 px-2.5 py-1 text-[11px] font-semibold text-ink/70">{h}</span>{/each}
              </div>
            {/if}
            <div class="mt-auto flex items-center justify-between gap-3 pt-6">
              <span class="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-forest transition group-hover:text-goldfinch-gold">
                Explore safaris <ArrowRight size={14} strokeWidth={2.6} class="transition-transform group-hover:translate-x-0.5" />
              </span>
              {#if s?.count}<span class="shrink-0 text-[12px] text-ink/50">{s.count} trip{s.count === 1 ? '' : 's'}{#if s.from} · from {s.currency} {s.from.toLocaleString()}{/if}</span>{/if}
            </div>
          </div>
        </a>
      {/each}
    </div>
  </section>

  <!-- ── inspiration / quote band ─────────────────────────────────────────── -->
  <section class="my-6 bg-deep-green text-white" use:fadeUpOnScroll={{ y: 16 }}>
    <div class="container-shell py-16 text-center md:py-20">
      <Quote size={34} class="mx-auto text-goldfinch-gold/70" strokeWidth={1.6} />
      <p class="mx-auto mt-5 max-w-3xl font-serif text-2xl font-light italic leading-[1.4] text-white md:text-[34px]">
        We don't sell packages. We design safaris around people.
      </p>
      <p class="mt-6 text-[11px] font-bold uppercase tracking-[0.2em] text-goldfinch-gold">Nelson Laizer · Founder, Emnel Adventures</p>
    </div>
  </section>

  <!-- ── styles grid (part B) ─────────────────────────────────────────────── -->
  {#if restB.length}
    <section class="container-shell pb-4 pt-4">
      <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ selector: '.style-card', y: 18, stagger: 0.05 }}>
        {#each restB as style (style.slug)}
          {@const image = styleImg(style)}
          {@const s = catStats[style.slug]}
          {@const label = decisionLabel(style)}
          <a href={`/tours?category=${style.slug}`} class="style-card group flex flex-col overflow-hidden border border-ink/10 bg-surface shadow-[0_14px_40px_rgba(28,26,22,0.07)] transition-all duration-300 hover:-translate-y-1 hover:border-goldfinch-gold/40 hover:shadow-[0_28px_64px_rgba(28,26,22,0.18)]">
            <div class="relative aspect-[16/10] overflow-hidden bg-deep-green">
              {#if image}
                <img src={image} alt={style.name} loading="lazy" class="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              {:else}
                <div class="absolute inset-0 bg-[linear-gradient(150deg,#153733_0%,#0f2a2a_46%,rgba(74,55,40,0.96)_100%)]"></div>
                <span class="pointer-events-none absolute inset-0 opacity-[0.06]" style="background-image: radial-gradient(circle, #fff 1px, transparent 1.5px); background-size: 22px 22px;" aria-hidden="true"></span>
              {/if}
              <span class="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,26,24,0)_35%,rgba(13,22,20,0.85)_100%)]"></span>
              {#if label}<span class="absolute left-4 top-4 bg-deep-green/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-goldfinch-gold backdrop-blur">{label}</span>{/if}
              <h3 class="absolute inset-x-5 bottom-4 font-serif text-[26px] font-normal leading-tight text-white">{style.name}</h3>
            </div>
            <div class="flex flex-1 flex-col p-6">
              {#if blurb(style.description)}<p class="text-[14px] leading-7 text-ink/70">{blurb(style.description)}</p>{/if}
              {#if style.who_its_for}<p class="mt-3 text-[13px] leading-6 text-ink/60"><span class="font-bold text-clay">Best for </span>{blurb(style.who_its_for, 90)}</p>{/if}
              {#if style.highlights?.length}
                <div class="mt-4 flex flex-wrap gap-1.5">
                  {#each style.highlights.slice(0, 3) as h}<span class="border border-ink/10 bg-sand/50 px-2.5 py-1 text-[11px] font-semibold text-ink/70">{h}</span>{/each}
                </div>
              {/if}
              <div class="mt-auto flex items-center justify-between gap-3 pt-6">
                <span class="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-forest transition group-hover:text-goldfinch-gold">
                  Explore safaris <ArrowRight size={14} strokeWidth={2.6} class="transition-transform group-hover:translate-x-0.5" />
                </span>
                {#if s?.count}<span class="shrink-0 text-[12px] text-ink/50">{s.count} trip{s.count === 1 ? '' : 's'}{#if s.from} · from {s.currency} {s.from.toLocaleString()}{/if}</span>{/if}
              </div>
            </div>
          </a>
        {/each}
      </div>
    </section>
  {/if}

  <!-- ── premium final CTA ────────────────────────────────────────────────── -->
  <section class="container-shell py-16 md:py-20">
    <div class="relative overflow-hidden bg-deep-green px-6 py-14 text-center text-white md:px-12 md:py-20">
      {#if heroImage}
        <img src={heroImage} alt="" class="absolute inset-0 h-full w-full object-cover object-center opacity-25" decoding="async" />
      {/if}
      <div class="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-goldfinch-gold/20 blur-3xl"></div>
      <div class="relative mx-auto max-w-2xl">
        <p class="brand-eyebrow justify-center text-goldfinch-gold">Still deciding?</p>
        <h2 class="mt-3 font-serif text-3xl font-light leading-[1.1] md:text-[44px]">Tell us how you like to travel.</h2>
        <p class="mx-auto mt-4 max-w-xl text-white/75">
          Share your dates and what you have in mind — a local specialist will shape the right safari around you. No
          payment needed to start.
        </p>
        <div class="mt-8 flex flex-wrap justify-center gap-3">
          <a class="inline-flex h-12 items-center gap-2 bg-goldfinch-gold px-7 text-[12px] font-bold uppercase tracking-[0.14em] text-deep-green transition hover:bg-savanna" href="/plan-my-trip">
            Build My Safari <ArrowRight size={16} strokeWidth={2.5} />
          </a>
          <a class="inline-flex h-12 items-center gap-2 border border-white/30 px-7 text-[12px] font-bold uppercase tracking-[0.14em] text-white transition hover:border-goldfinch-gold hover:text-goldfinch-gold" href="/contact">
            <MessageCircle size={15} /> Talk to a Safari Expert
          </a>
        </div>
        <div class="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 border-t border-white/15 pt-6 text-[12px] font-medium text-white/70">
          {#each ['Private & tailor-made', 'Tanzania-born guides', 'No obligation to book'] as t}
            <span class="inline-flex items-center gap-1.5"><MapPin size={13} class="text-goldfinch-gold" />{t}</span>
          {/each}
        </div>
      </div>
    </div>
  </section>
{/if}
