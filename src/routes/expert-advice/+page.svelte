<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowRight, GitCompare, MessageSquare, Sparkles } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import { openAiAdvisor } from '$lib/aiAdvisor';
  import { fadeUpOnScroll, revealHeading, staggeredCardReveal } from '$lib/animations';
  import BlogCard from '$lib/components/public/BlogCard.svelte';
  import EmptyState from '$lib/components/public/EmptyState.svelte';
  import FAQAccordion from '$lib/components/public/FAQAccordion.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';
  import { placeholderFaqs, placeholderPosts } from '$lib/data/placeholders';
  import { aiAdvisorEnabled, publicSettings } from '$lib/settings';
  import type { BlogPost, FAQ } from '$lib/types';

  $: aiOn = aiAdvisorEnabled($publicSettings);

  let posts: BlogPost[] = [];
  let faqs: FAQ[] = [];
  let loading = true;

  // The questions confident travellers ask — tapping one asks our AI advisor.
  const topics = [
    'How much does a safari cost?',
    'When is the best time to visit?',
    'Is East Africa safe?',
    'What should I pack for a safari?',
    'Kilimanjaro routes compared',
    'How does gorilla trekking work?'
  ];

  onMount(async () => {
    const [postRes, faqRes] = await Promise.allSettled([
      api.blog.list({ status: 'published', limit: 24 }),
      api.faqs.list({ limit: 8 })
    ]);
    posts = postRes.status === 'fulfilled' && postRes.value.data.items.length ? postRes.value.data.items : placeholderPosts;
    faqs = faqRes.status === 'fulfilled' && faqRes.value.data.items.length ? faqRes.value.data.items : placeholderFaqs;
    loading = false;
  });
</script>

<svelte:head>
  <title>Expert Advice | Goldfinch Adventures</title>
  <meta name="description" content="Honest East Africa travel advice — costs, timing, safety, Kilimanjaro routes and gorilla trekking, plus an AI advisor that answers instantly." />
</svelte:head>

<!-- Hero -->
<section class="relative overflow-hidden bg-gradient-to-br from-deep-green via-forest to-deep-green text-white">
  <div class="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-goldfinch-gold/20 blur-3xl"></div>
  <div class="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-savanna/15 blur-3xl"></div>
  <div class="container-shell relative py-16 text-center md:py-20">
    <p class="font-serif text-xl italic text-savanna">Expert Advice</p>
    <h1 class="mx-auto mt-5 max-w-3xl text-3xl font-extrabold leading-[1.1] tracking-tight md:text-[44px]" use:revealHeading>
      Honest guides to plan East Africa with confidence
    </h1>
    <p class="mx-auto mt-4 max-w-2xl text-[15px] leading-7 text-white/75 md:text-lg">
      Real answers from local experts — costs, timing, safety, and what each trip is actually like. Or ask our AI advisor and get an instant, honest answer.
    </p>
    <div class="mt-7 flex flex-wrap justify-center gap-3">
      {#if aiOn}
        <button type="button" on:click={() => openAiAdvisor()} class="inline-flex h-12 items-center gap-2 rounded-xl bg-goldfinch-gold px-6 font-bold text-deep-green shadow-lg transition hover:brightness-105">
          <Sparkles size={18} strokeWidth={2.4} /> Ask our AI advisor
        </button>
      {/if}
      <a href="/plan-my-trip" class="inline-flex h-12 items-center gap-2 rounded-xl border border-white/30 px-6 font-semibold text-white transition hover:bg-white/10">
        Plan My Trip <ArrowRight size={18} />
      </a>
    </div>
  </div>
</section>

<!-- Popular questions → AI advisor (only when the AI advisor is enabled) -->
{#if aiOn}
  <section class="container-shell py-12 md:py-16" use:fadeUpOnScroll={{ y: 16 }}>
    <p class="font-serif text-xl italic text-clay">Ask away</p>
    <h2 class="mt-2 text-3xl font-extrabold tracking-tight text-deep-green md:text-[34px]" use:revealHeading>Popular questions, answered instantly</h2>
    <p class="mt-3 max-w-2xl text-[15px] leading-7 text-ink/60">Tap a question and our AI travel advisor will answer it for you — grounded in real Goldfinch trips, with honest limitations.</p>

    <div class="mt-6 flex flex-wrap gap-2.5">
      {#each topics as topic}
        <button
          type="button"
          on:click={() => openAiAdvisor(topic)}
          class="group inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white px-4 py-2 text-sm font-semibold text-ink/70 shadow-sm transition hover:border-forest/40 hover:text-forest"
        >
          <MessageSquare size={14} class="text-forest/60 transition group-hover:text-forest" />
          {topic}
        </button>
      {/each}
    </div>
  </section>
{/if}

<!-- Latest guides -->
<section class="bg-sand/30 py-12 md:py-16">
  <div class="container-shell">
    <p class="font-serif text-xl italic text-clay">Guides</p>
    <h2 class="mt-2 text-3xl font-extrabold tracking-tight text-deep-green md:text-[34px]" use:revealHeading>Latest planning guides</h2>
    <p class="mt-3 max-w-2xl text-[15px] leading-7 text-ink/60">Practical, no-fluff reads from the team who plans these trips every day.</p>

    <div class="mt-8">
      {#if loading}
        <LoadingState message="Loading guides..." />
      {:else if posts.length === 0}
        <EmptyState title="Guides coming soon" message="We're writing honest planning guides — in the meantime, ask our AI advisor anything." />
      {:else}
        <div class="grid gap-6 md:grid-cols-3" use:staggeredCardReveal={{ y: 16, stagger: 0.06 }}>
          {#each posts as post (post.slug)}
            <BlogCard {post} />
          {/each}
        </div>
      {/if}
    </div>

    <!-- compare promo -->
    <div class="group mt-10 flex flex-col items-start justify-between gap-3 rounded-[12px] border border-ink/10 bg-white p-6 shadow-[0_14px_40px_rgba(15,47,36,0.07)] transition hover:border-goldfinch-gold/40 hover:shadow-[0_26px_60px_rgba(15,47,36,0.16)] sm:flex-row sm:items-center">
      <div class="flex items-start gap-3">
        <span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-forest/10 text-forest"><GitCompare size={20} /></span>
        <div>
          <p class="font-serif text-lg italic text-clay">Decision help</p>
          <p class="mt-0.5 text-lg font-extrabold text-deep-green">Compare destinations &amp; routes side by side</p>
        </div>
      </div>
      <a href="/compare" class="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border border-forest/20 bg-white px-5 font-semibold text-forest transition group-hover:bg-sand/40">
        See comparisons <ArrowRight size={16} />
      </a>
    </div>
  </div>
</section>

<!-- FAQ -->
{#if faqs.length}
  <section class="container-shell grid gap-8 py-12 md:grid-cols-[0.7fr_1.3fr] md:py-16" use:fadeUpOnScroll={{ y: 16 }}>
    <div>
      <p class="font-serif text-xl italic text-clay">Good to know</p>
      <h2 class="mt-2 text-3xl font-extrabold tracking-tight text-deep-green md:text-4xl" use:revealHeading>Frequently asked</h2>
      <p class="mt-3 text-[15px] leading-7 text-ink/60">The questions East Africa travellers ask us most. Need something specific? Our AI advisor or a specialist can help.</p>
      {#if aiOn}
        <button type="button" on:click={() => openAiAdvisor()} class="mt-5 inline-flex items-center gap-2 text-sm font-bold text-forest transition hover:text-deep-green">
          <Sparkles size={15} /> Ask the AI advisor
        </button>
      {/if}
    </div>
    <FAQAccordion {faqs} />
  </section>
{/if}

<!-- Closing CTA -->
<section class="container-shell pb-14 md:pb-20">
  <div class="relative overflow-hidden rounded-[12px] bg-gradient-to-br from-deep-green via-forest to-deep-green p-8 text-center text-white md:p-12">
    <div class="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-goldfinch-gold/20 blur-3xl"></div>
    <div class="relative mx-auto max-w-2xl">
      <h2 class="text-2xl font-extrabold md:text-3xl">Still have questions?</h2>
      <p class="mx-auto mt-3 text-white/75">Get an instant answer from our AI advisor, or tell us what you're planning and a local expert will follow up — honest advice, no pressure.</p>
      <div class="mt-7 flex flex-wrap justify-center gap-3">
        {#if aiOn}
          <button type="button" on:click={() => openAiAdvisor()} class="inline-flex h-12 items-center gap-2 rounded-xl bg-goldfinch-gold px-7 font-bold text-deep-green transition hover:brightness-105">
            <Sparkles size={18} strokeWidth={2.4} /> Ask our AI advisor
          </button>
        {/if}
        <a class="inline-flex h-12 items-center gap-2 rounded-xl border border-white/30 px-7 font-semibold text-white transition hover:bg-white/10" href="/plan-my-trip">
          Plan My Trip <ArrowRight size={18} />
        </a>
      </div>
    </div>
  </div>
</section>
