<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowRight, Compass } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import BlogCard from '$lib/components/public/BlogCard.svelte';
  import EmptyState from '$lib/components/public/EmptyState.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';
  import { placeholderPosts } from '$lib/data/placeholders';
  import type { BlogPost } from '$lib/types';

  let posts: BlogPost[] = [];
  let loading = true;

  // The questions confident travellers ask — signals what these guides answer.
  const topics = [
    'How much does a safari cost?',
    'When is the best time to visit?',
    'Is East Africa safe?',
    'What to pack',
    'Kilimanjaro routes compared',
    'Gorilla trekking, explained'
  ];

  onMount(async () => {
    try {
      const res = await api.blog.list({ status: 'published', limit: 24 });
      posts = res.data.items.length ? res.data.items : placeholderPosts;
    } catch {
      posts = placeholderPosts;
    } finally {
      loading = false;
    }
  });
</script>

<section class="relative overflow-hidden bg-gradient-to-br from-deep-green via-forest to-deep-green text-white">
  <div class="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-goldfinch-gold/20 blur-3xl"></div>
  <div class="container-shell relative py-16 text-center md:py-20">
    <span class="inline-flex items-center gap-2 rounded-full border border-goldfinch-gold/30 bg-goldfinch-gold/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-goldfinch-gold">
      <Compass size={14} strokeWidth={2.4} /> Expert Advice
    </span>
    <h1 class="mx-auto mt-5 max-w-3xl text-3xl font-extrabold leading-[1.1] tracking-tight md:text-[44px]">
      Honest guides to plan East Africa with confidence
    </h1>
    <p class="mx-auto mt-4 max-w-2xl text-[15px] leading-7 text-white/75 md:text-lg">
      Real answers from local experts — costs, timing, safety, and what each trip is actually like.
    </p>
  </div>
</section>

<section class="container-shell py-12 md:py-16">
  <div class="flex flex-wrap gap-2">
    {#each topics as topic}
      <span class="rounded-full border border-ink/10 bg-sand/40 px-3.5 py-1.5 text-sm font-medium text-ink/60">{topic}</span>
    {/each}
  </div>

  <div class="mt-8">
    {#if loading}
      <LoadingState message="Loading guides..." />
    {:else if posts.length === 0}
      <EmptyState title="Guides coming soon" message="We're writing honest planning guides — in the meantime, tell us what you'd like to know." />
    {:else}
      <div class="grid gap-6 md:grid-cols-3">
        {#each posts as post (post.slug)}
          <BlogCard {post} />
        {/each}
      </div>
    {/if}
  </div>

  <!-- compare promo -->
  <a class="group mt-10 flex flex-col items-start justify-between gap-3 rounded-2xl border border-ink/10 bg-sand/40 p-6 transition hover:border-goldfinch-gold/40 sm:flex-row sm:items-center" href="/compare">
    <div>
      <p class="text-xs font-bold uppercase tracking-[0.16em] text-clay">Decision help</p>
      <p class="mt-1 text-lg font-extrabold text-deep-green">Compare destinations & routes side by side</p>
    </div>
    <span class="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border border-forest/20 bg-white px-5 font-semibold text-forest transition group-hover:bg-white">
      See comparisons <ArrowRight size={16} />
    </span>
  </a>

  <!-- every guide surface ends with the primary action (SRS v2.0 §4.8) -->
  <div class="mt-12 overflow-hidden rounded-[10px] bg-gradient-to-br from-deep-green via-forest to-deep-green p-8 text-center text-white md:p-12">
    <h2 class="text-2xl font-extrabold md:text-3xl">Still have questions?</h2>
    <p class="mx-auto mt-3 max-w-xl text-white/75">Tell us what you're planning and a local expert will give honest, tailored advice — no pressure.</p>
    <a class="mt-6 inline-flex h-12 items-center gap-2 rounded-xl bg-goldfinch-gold px-7 font-bold text-deep-green transition hover:brightness-105" href="/plan-my-trip">
      Plan My Trip <ArrowRight size={18} />
    </a>
  </div>
</section>
