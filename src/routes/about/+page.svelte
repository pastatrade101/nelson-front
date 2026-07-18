<script lang="ts">
  import { ArrowRight } from '@lucide/svelte';
  import { fadeUpOnScroll, staggeredCardReveal } from '$lib/animations';
  import FounderStorySection from '$lib/components/public/FounderStorySection.svelte';
  import SectionHeader from '$lib/components/public/SectionHeader.svelte';

  const timeline = [
    {
      year: '2008',
      title: 'A childhood with wildlife as a neighbour',
      body: 'Nelson Kambo grows up near Arusha, the son of a chef who worked extraordinary hours so his children could have an education. For Nelson, wildlife is not a product — it is the texture of ordinary life. Something takes root.'
    },
    {
      year: '2013',
      title: 'A guide is born',
      body: 'Nelson completes his certified naturalist training and begins guiding through the northern circuit parks. He quickly understands that the guests who remember a trip forever are the ones whose guide made them understand what they were seeing — and feel it.'
    },
    {
      year: '2016',
      title: 'Emnel Adventures: $200 and a conviction',
      body: 'With $200, a phone, and a self-taught understanding of Google Ads, Nelson launches Emnel Adventures from Arusha. The name is two people: his daughter Emily, and himself. Its first asset is genuine expertise in the field.'
    },
    {
      year: '2018–2023',
      title: 'The team that makes this possible',
      body: 'Rahim joins, then Gabriel, then Ally — each one certified, each a specialist. The team shares one operating philosophy: every guest deserves the guide’s complete attention, every single game drive.'
    },
    {
      year: '2024–present',
      title: 'Five stars and a responsibility',
      body: 'A TripAdvisor Certificate of Excellence, and reviews describing private bush dinners on the Serengeti and a child’s first lion. The $200 that started this has grown into something genuinely earned — and a clear responsibility to the land and communities that made it possible.'
    }
  ];

  const guides = [
    {
      name: 'Nelson Kambo',
      title: 'Founder & Head Guide',
      speciality: 'Big cats · Serengeti ecosystem · Photography · Cultural heritage',
      years: '15+ years in the field',
      quote:
        'Nelson made us feel like the Serengeti was his garden and we were honoured guests. His knowledge of lion behaviour is extraordinary.',
      author: 'Tom H., United Kingdom'
    },
    {
      name: 'Rahim',
      title: 'Senior Guide & Naturalist',
      speciality: 'Birdlife · Ngorongoro · Tarangire elephant herds · Geology',
      years: '10+ years in the field',
      quote:
        'Rahim spotted a leopard in a tree that we had driven past three times. His eyes are absolutely extraordinary.',
      author: 'Sarah M., United States'
    },
    {
      name: 'Gabriel',
      title: 'Lead Guide — Northern Circuit',
      speciality: 'Migration routes · Big Five tracking · Ecology · Cultural interpretation',
      years: '8+ years in the field',
      quote:
        'Gabriel turned every game drive into a lesson in ecology. Our children learned more in 7 days than in a year of school.',
      author: 'The Vandenberghe Family, Belgium'
    },
    {
      name: 'Ally',
      title: 'Guide & Cultural Specialist',
      speciality: 'Maasai culture · Lake Manyara · Crater highlands · Photography',
      years: '7+ years in the field',
      quote:
        'Ally’s passion for Tanzania — its people, not just its wildlife — gave our trip a depth we did not expect.',
      author: 'Cornelia L., Germany'
    }
  ];
</script>

<svelte:head>
  <title>About Emnel Adventures — Local Tanzania Safari Operator | Arusha</title>
  <meta
    name="description"
    content="Emnel Adventures is a locally owned Tanzania safari company based in Arusha, founded by Nelson Kambo. Meet the team, our story, and why we do this."
  />
</svelte:head>

<!-- Hero -->
<section class="relative overflow-hidden bg-deep-green text-white">
  <img
    class="absolute inset-0 h-full w-full object-cover object-center"
    src="https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1900&q=72"
    alt="Emnel Adventures — a Tanzanian safari team on the Serengeti plains at golden hour"
    loading="eager"
    fetchpriority="high"
  />
  <div class="absolute inset-0 bg-[linear-gradient(90deg,rgba(28,26,22,0.93)_0%,rgba(28,26,22,0.80)_34%,rgba(28,26,22,0.42)_70%,rgba(28,26,22,0.14)_100%)]"></div>
  <div class="absolute inset-0 bg-[linear-gradient(180deg,rgba(28,26,22,0.55)_0%,rgba(28,26,22,0.08)_28%,rgba(28,26,22,0.62)_100%)]"></div>

  <div class="relative z-10 mx-auto flex min-h-[560px] w-full max-w-[1500px] items-center px-5 py-24 md:min-h-[660px] md:px-8 md:py-28">
    <div class="max-w-[840px]">
      <p class="brand-eyebrow">About Emnel Adventures</p>
      <h1 class="mt-6 font-serif text-[44px] font-light leading-[1.04] tracking-normal sm:text-[60px] lg:text-[74px]">
        We are not a travel agency. We are Tanzania.
      </h1>
      <p class="mt-7 max-w-[680px] text-[15px] leading-8 text-white/85 md:text-lg">
        Every person on this team was born here, raised here, and has spent their life learning this land. We did not
        come to Tanzania to offer safaris — we grew up inside the thing we are now sharing with you.
      </p>

      <div class="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center">
        <a
          class="inline-flex h-12 items-center justify-center gap-2 bg-goldfinch-gold px-7 text-[13px] font-semibold uppercase tracking-[0.08em] text-deep-green transition hover:bg-savanna"
          href="/contact"
        >
          Begin Your Journey <ArrowRight size={17} strokeWidth={2.4} />
        </a>
        <a
          class="inline-flex h-12 items-center justify-center gap-2 border border-goldfinch-gold px-7 text-[13px] font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-goldfinch-gold hover:text-deep-green"
          href="#guides"
        >
          Meet the Guides
        </a>
      </div>

      <p class="mt-9 text-sm font-medium text-white/70">
        <span class="text-goldfinch-gold">★★★★★</span> TripAdvisor · TLTO Certified · TTB Licensed · Tanzania-born team · Reply within 24 hours
      </p>
    </div>
  </div>
</section>

<!-- Founder story (shared component, Emnel-correct copy) -->
<FounderStorySection />

<!-- Our story — timeline -->
<section class="bg-canvas py-16 md:py-24">
  <div class="container-shell max-w-[920px]">
    <SectionHeader eyebrow="Our Story" title="From a childhood near Arusha to the world’s greatest safari destination" />
    <ol class="mt-12 grid gap-10" use:staggeredCardReveal={{ y: 16, stagger: 0.06 }}>
      {#each timeline as item (item.year)}
        <li class="grid gap-4 border-l-2 border-goldfinch-gold/50 pl-6 sm:grid-cols-[120px_1fr] sm:gap-8 sm:pl-8">
          <p class="font-serif text-3xl font-light text-goldfinch-gold sm:text-4xl">{item.year}</p>
          <div>
            <h3 class="text-lg font-bold text-heading">{item.title}</h3>
            <p class="mt-2 text-[15px] leading-7 text-ink/75">{item.body}</p>
          </div>
        </li>
      {/each}
    </ol>
  </div>
</section>

<!-- Meet the guides -->
<section id="guides" class="scroll-mt-24 bg-linen py-16 md:py-24" use:fadeUpOnScroll={{ y: 14 }}>
  <div class="container-shell">
    <SectionHeader
      eyebrow="Meet the Guides"
      title="The people who make every Emnel safari"
      description="Certified naturalists, born and raised in Tanzania. The single biggest variable in your safari is not the lodge — it is the guide."
    />
    <div class="mt-12 grid gap-6 md:grid-cols-2" use:staggeredCardReveal={{ y: 16, stagger: 0.06 }}>
      {#each guides as g (g.name)}
        <article class="flex h-full flex-col border border-ink/10 bg-surface p-7">
          <h3 class="font-serif text-2xl text-heading">{g.name}</h3>
          <p class="mt-1 text-sm font-semibold text-goldfinch-gold">{g.title}</p>
          <p class="mt-3 text-sm leading-6 text-ink/70">{g.speciality}</p>
          <p class="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink/50">{g.years}</p>
          <blockquote class="mt-5 border-t border-ink/10 pt-5 font-serif text-lg italic leading-7 text-ink/80">
            “{g.quote}”
          </blockquote>
          <p class="mt-3 text-xs font-medium text-ink/55">— {g.author}</p>
        </article>
      {/each}
    </div>
  </div>
</section>

<!-- CTA -->
<section class="bg-deep-green py-16 text-white md:py-20">
  <div class="container-shell flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
    <div>
      <h2 class="font-serif text-3xl font-light sm:text-4xl">Ready to start planning your story?</h2>
      <p class="mt-3 max-w-xl text-white/75">Our Arusha team replies within 24 hours — a real conversation with someone who knows Tanzania the way you are about to.</p>
    </div>
    <a
      class="inline-flex shrink-0 items-center gap-2 rounded-full border border-goldfinch-gold px-6 py-3 text-sm font-semibold text-goldfinch-gold transition hover:bg-goldfinch-gold hover:text-deep-green"
      href="/contact"
    >
      Begin Your Journey <ArrowRight size={16} strokeWidth={2.6} />
    </a>
  </div>
</section>
