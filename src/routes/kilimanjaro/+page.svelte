<script lang="ts">
  import { ArrowRight, Check, X } from '@lucide/svelte';
  import { fadeUpOnScroll, staggeredCardReveal } from '$lib/animations';
  import SectionHeader from '$lib/components/public/SectionHeader.svelte';

  const routes = [
    {
      name: 'Machame Route',
      days: '7 days',
      tag: 'Recommended',
      body: 'The most scenic route and one of the highest success rates on the mountain — six days up, one day down, with excellent acclimatisation. Our first recommendation for most climbers, crossing rainforest, heath, moorland, alpine desert and glacier.'
    },
    {
      name: 'Lemosho Route',
      days: '8 days',
      tag: 'Our favourite',
      body: 'The most beautiful route on Kilimanjaro and the one that consistently delivers the highest summit success rates. Fewer climbers, more time, better acclimatisation. If you have the days, this is the route we recommend without reservation.'
    },
    {
      name: 'Marangu Route',
      days: '5–6 days',
      tag: 'Hut accommodation',
      body: 'The only route with hut accommodation rather than tents — a good option for climbers who prefer not to camp. The shorter acclimatisation window means lower success rates, but it is very manageable with 6 days and a good guide.'
    },
    {
      name: 'Rongai Route',
      days: '6–7 days',
      tag: 'Quiet & dry',
      body: 'Approaches from the north — the only route that begins on the drier side of the mountain. Fewer crowds and a different perspective, and an excellent option in the rainy season when the western routes can be wet.'
    }
  ];

  const included = [
    'Expert certified mountain guide',
    'Assistant guide and porters',
    'All camping equipment (tents, mattresses, dining setup)',
    'All meals and drinking water on the mountain',
    'National park fees and rescue fees',
    'Arusha transfers',
    'Pre-climb briefing and gear check'
  ];
  const notIncluded = [
    'International flights',
    'Visa fees',
    'Personal climbing equipment (gear list provided)',
    'Travel and medical insurance (required)',
    'Tips for guides and porters',
    'Hotel accommodation in Arusha pre/post climb'
  ];

  const pricing = [
    { route: 'Machame — 7 days', price: '$2,200–2,800 pp', stay: 'Tented camps on route', note: 'Min. 2 climbers — solo rates on request' },
    { route: 'Lemosho — 8 days', price: '$2,500–3,200 pp', stay: 'Tented camps on route', note: 'Best acclimatisation, highest success rate' },
    { route: 'Marangu — 6 days', price: '$1,900–2,400 pp', stay: 'Mountain huts', note: 'Hut accommodation, no tents needed' }
  ];
</script>

<svelte:head>
  <title>Kilimanjaro Climb | Expert Guides from Arusha | Emnel Adventures</title>
  <meta
    name="description"
    content="Climb Mount Kilimanjaro with Emnel Adventures — expert Arusha-based guides, all routes, all durations. The highest summit in Africa, done properly."
  />
</svelte:head>

<!-- Hero -->
<section class="relative overflow-hidden bg-deep-green text-white">
  <img
    class="absolute inset-0 h-full w-full object-cover object-center"
    src="https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=1900&q=72"
    alt="Mount Kilimanjaro summit above the clouds at sunrise"
    loading="eager"
    fetchpriority="high"
  />
  <div class="absolute inset-0 bg-[linear-gradient(90deg,rgba(28,26,22,0.92)_0%,rgba(28,26,22,0.78)_36%,rgba(28,26,22,0.40)_70%,rgba(28,26,22,0.14)_100%)]"></div>
  <div class="absolute inset-0 bg-[linear-gradient(180deg,rgba(28,26,22,0.5)_0%,rgba(28,26,22,0.08)_30%,rgba(28,26,22,0.6)_100%)]"></div>

  <div class="relative z-10 mx-auto flex min-h-[560px] w-full max-w-[1500px] items-center px-5 py-24 md:min-h-[660px] md:px-8 md:py-28">
    <div class="max-w-[840px]">
      <p class="brand-eyebrow">Mount Kilimanjaro · 5,895m</p>
      <h1 class="mt-6 font-serif text-[42px] font-light leading-[1.05] tracking-normal sm:text-[58px] lg:text-[70px]">
        Africa's highest summit. Arusha's finest guides. Your best chance of reaching it.
      </h1>
      <p class="mt-7 max-w-[680px] text-[15px] leading-8 text-white/85 md:text-lg">
        Kilimanjaro is the highest freestanding mountain on earth and one of the few summits at this altitude
        accessible to non-technical climbers. Success depends on one thing more than fitness or equipment: your guide.
        Ours have reached the crater rim hundreds of times.
      </p>
      <div class="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center">
        <a class="inline-flex h-12 items-center justify-center gap-2 bg-goldfinch-gold px-7 text-[13px] font-semibold uppercase tracking-[0.08em] text-deep-green transition hover:bg-savanna" href="/contact">
          Plan My Climb <ArrowRight size={17} strokeWidth={2.4} />
        </a>
        <a class="inline-flex h-12 items-center justify-center gap-2 border border-goldfinch-gold px-7 text-[13px] font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-goldfinch-gold hover:text-deep-green" href="#routes">
          Compare Routes
        </a>
      </div>
    </div>
  </div>
</section>

<!-- About -->
<section class="bg-canvas py-16 md:py-24">
  <div class="container-shell max-w-[880px]">
    <p class="brand-eyebrow">The Mountain</p>
    <h2 class="mt-5 font-serif text-[34px] font-light leading-[1.1] text-heading sm:text-[46px]">Not a technical climb — an acclimatisation challenge</h2>
    <p class="mt-6 text-[15px] leading-8 text-ink/75 md:text-base">
      At 5,895 metres above sea level, Kilimanjaro dominates the horizon from Arusha on clear mornings — a white-capped
      presence that draws climbers from every corner of the world. There are no ropes, no fixed anchors, no vertical
      faces. What defeats most attempts is acclimatisation: ascending too quickly, not reading the body's signals, or
      following a schedule rather than a person. Our guides know the difference between fatigue and altitude sickness,
      between summit fever and genuine danger, and between a climber who needs encouraging and one who needs turning
      around.
    </p>
  </div>
</section>

<!-- Routes -->
<section id="routes" class="scroll-mt-24 bg-linen py-16 md:py-24" use:fadeUpOnScroll={{ y: 14 }}>
  <div class="container-shell">
    <SectionHeader eyebrow="The Routes" title="Which one is right for you" description="Every route ends at Uhuru Peak. They differ on days, crowds, scenery and — most of all — summit success." />
    <div class="mt-12 grid gap-6 md:grid-cols-2" use:staggeredCardReveal={{ y: 16, stagger: 0.06 }}>
      {#each routes as r (r.name)}
        <article class="flex h-full flex-col border border-ink/10 bg-surface p-7">
          <div class="flex items-center justify-between gap-3">
            <h3 class="font-serif text-2xl text-heading">{r.name}</h3>
            <span class="shrink-0 bg-goldfinch-gold/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-clay">{r.days}</span>
          </div>
          <p class="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-goldfinch-gold">{r.tag}</p>
          <p class="mt-4 text-[15px] leading-7 text-ink/70">{r.body}</p>
        </article>
      {/each}
    </div>
  </div>
</section>

<!-- Included / not included -->
<section class="bg-canvas py-16 md:py-24">
  <div class="container-shell grid gap-8 md:grid-cols-2">
    <div class="border border-ink/10 bg-surface p-7">
      <h3 class="flex items-center gap-2 font-serif text-2xl text-heading"><Check size={20} class="text-forest" /> Included</h3>
      <ul class="mt-5 grid gap-3">
        {#each included as item}
          <li class="flex items-start gap-2.5 text-[15px] leading-7 text-ink/75"><Check size={16} class="mt-1 shrink-0 text-forest" /> {item}</li>
        {/each}
      </ul>
    </div>
    <div class="border border-ink/10 bg-surface p-7">
      <h3 class="flex items-center gap-2 font-serif text-2xl text-heading"><X size={20} class="text-ink/40" /> Not included</h3>
      <ul class="mt-5 grid gap-3">
        {#each notIncluded as item}
          <li class="flex items-start gap-2.5 text-[15px] leading-7 text-ink/60"><X size={16} class="mt-1 shrink-0 text-ink/35" /> {item}</li>
        {/each}
      </ul>
    </div>
  </div>
</section>

<!-- Pricing -->
<section class="bg-linen py-16 md:py-24">
  <div class="container-shell">
    <SectionHeader eyebrow="Pricing" title="Honest starting points by route" description="Per person, guided end to end from Arusha. Final price depends on group size and season." />
    <div class="mt-10 overflow-x-auto">
      <table class="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr class="border-b border-ink/15 text-xs font-bold uppercase tracking-wide text-ink/55">
            <th class="py-3 pr-4">Route</th>
            <th class="py-3 pr-4">From (per person)</th>
            <th class="py-3 pr-4">Accommodation</th>
            <th class="py-3 pr-4">Notes</th>
          </tr>
        </thead>
        <tbody>
          {#each pricing as p (p.route)}
            <tr class="border-b border-ink/[0.08]">
              <td class="py-4 pr-4 font-serif text-lg text-heading">{p.route}</td>
              <td class="py-4 pr-4 font-bold text-goldfinch-gold">{p.price}</td>
              <td class="py-4 pr-4 text-sm text-ink/70">{p.stay}</td>
              <td class="py-4 pr-4 text-sm text-ink/70">{p.note}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <p class="mt-6 max-w-2xl text-sm leading-7 text-ink/65">
      Combine your climb with a safari: most climbers add 5–7 days on safari before or after the mountain. We arrange
      the full circuit from Arusha — one booking, one team.
    </p>
  </div>
</section>

<!-- CTA -->
<section class="bg-deep-green py-16 text-white md:py-20">
  <div class="container-shell flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
    <div>
      <h2 class="font-serif text-3xl font-light sm:text-4xl">The summit is waiting.</h2>
      <p class="mt-3 max-w-xl text-white/75">Tell us your dates and preferred route. We'll assess your fitness level and recommend the right itinerary.</p>
    </div>
    <a
      class="inline-flex shrink-0 items-center gap-2 rounded-full border border-goldfinch-gold px-6 py-3 text-sm font-semibold text-goldfinch-gold transition hover:bg-goldfinch-gold hover:text-deep-green"
      href="/contact"
    >
      Plan My Kilimanjaro Climb <ArrowRight size={16} strokeWidth={2.6} />
    </a>
  </div>
</section>
