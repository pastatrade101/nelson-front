<script lang="ts">
  import FinalCtaSection from '$lib/components/public/FinalCtaSection.svelte';
  import { onMount } from 'svelte';
  import { ArrowRight, GitCompare } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import { fadeUpOnScroll, revealHeading, staggeredCardReveal } from '$lib/animations';
  import BlogCard from '$lib/components/public/BlogCard.svelte';
  import EmptyState from '$lib/components/public/EmptyState.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import FAQAccordion from '$lib/components/public/FAQAccordion.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';
  import type { BlogPost, FAQ } from '$lib/types';
  import type { PageData } from './$types';
  import JsonLd from '$lib/components/public/JsonLd.svelte';
  import { faqLd, faqPairs } from '$lib/seo';

  export let data: PageData;

  let posts: BlogPost[] = [];
  // From the SSR load (+page.ts), so the answers are in the server HTML.
  $: faqs = (data.faqs ?? []) as FAQ[];
  let loading = true;
  let postsFailed = false;

  onMount(async () => {
    const [postRes] = await Promise.allSettled([api.blog.list({ status: 'published', limit: 24 })]);
    if (postRes.status === 'fulfilled') {
      posts = postRes.value.data.items;
    } else {
      posts = [];
      postsFailed = true;
    }
    loading = false;
  });
</script>

{#if faqPairs(faqs).length}<JsonLd data={faqLd(faqPairs(faqs))} />{/if}

<!-- Hero -->
<section class="relative overflow-hidden bg-gradient-to-br from-deep-green via-forest to-deep-green text-white">
  <div class="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-goldfinch-gold/20 blur-3xl"></div>
  <div class="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-savanna/15 blur-3xl"></div>
  <div class="container-shell relative py-16 text-center md:py-20">
    <p class="font-serif text-xl italic text-savanna">Expert Advice</p>
    <h1 class="mx-auto mt-5 max-w-3xl text-3xl font-serif font-light leading-[1.1] md:text-[44px]" use:revealHeading>
      Honest guides to plan Tanzania with confidence
    </h1>
    <p class="mx-auto mt-4 max-w-2xl text-[15px] leading-7 text-white/75 md:text-lg">
      Real answers from local experts — costs, timing, safety, and what each trip is actually like, from the team who plans these trips every day.
    </p>
    <div class="mt-7 flex flex-wrap justify-center gap-3">
      <a href="/plan-my-trip" class="inline-flex h-12 items-center gap-2 bg-goldfinch-gold px-7 text-sm font-semibold text-deep-green transition hover:brightness-95">
        Plan My Safari <ArrowRight size={18} />
      </a>
    </div>
  </div>
</section>

<!-- Latest guides -->
<section class="bg-sand/30 py-12 md:py-16">
  <div class="container-shell">
    <p class="font-serif text-xl italic text-clay">Guides</p>
    <h2 class="mt-2 text-3xl font-serif font-light text-heading md:text-[34px]" use:revealHeading>Latest planning guides</h2>
    <p class="mt-3 max-w-2xl text-[15px] leading-7 text-ink/70">Practical, no-fluff reads from the team who plans these trips every day.</p>

    <div class="mt-8">
      {#if loading}
        <LoadingState message="Loading guides..." />
      {:else if postsFailed}
        <ErrorState message="We couldn't load the guides right now. Please refresh in a moment." />
      {:else if posts.length === 0}
        <EmptyState title="Guides coming soon" message="We're writing honest planning guides — in the meantime, tell us what you're planning and a specialist will help." />
      {:else}
        <div class="grid gap-6 md:grid-cols-3" use:staggeredCardReveal={{ y: 16, stagger: 0.06 }}>
          {#each posts as post (post.slug)}
            <BlogCard {post} />
          {/each}
        </div>
      {/if}
    </div>

    <!-- compare promo -->
    <div class="group mt-10 flex flex-col items-start justify-between gap-3 rounded-none border border-ink/10 bg-surface p-6 shadow-[0_14px_40px_rgba(28,26,22,0.07)] transition hover:border-goldfinch-gold/40 hover:shadow-[0_26px_60px_rgba(28,26,22,0.16)] sm:flex-row sm:items-center">
      <div class="flex items-start gap-3">
        <span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-forest/10 text-forest"><GitCompare size={20} /></span>
        <div>
          <p class="font-serif text-lg italic text-clay">Decision help</p>
          <p class="mt-0.5 text-lg font-serif font-normal text-heading">Compare destinations &amp; routes side by side</p>
        </div>
      </div>
      <a href="/compare" class="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border border-forest/20 bg-surface px-5 font-semibold text-forest transition group-hover:bg-sand/40">
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
      <h2 class="mt-2 text-3xl font-serif font-light text-heading md:text-4xl" use:revealHeading>Frequently asked</h2>
      <p class="mt-3 text-[15px] leading-7 text-ink/70">The questions Tanzania safari travellers ask us most. Need something specific? A local specialist can help.</p>
    </div>
    <FAQAccordion {faqs} />
  </section>
{/if}

<!-- Closing CTA -->
<FinalCtaSection
  eyebrow="Expert advice"
  title="Still have questions?"
  subtitle="Tell us what you're planning and a local expert will follow up — honest advice, no pressure."
  primaryLabel="Plan My Safari"
  primaryHref="/plan-my-trip"
/>
