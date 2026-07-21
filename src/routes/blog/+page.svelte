<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/api/client';
  import { staggeredCardReveal } from '$lib/animations';
  import BlogCard from '$lib/components/public/BlogCard.svelte';
  import SectionHeader from '$lib/components/public/SectionHeader.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import EmptyState from '$lib/components/public/EmptyState.svelte';
  import type { BlogPost } from '$lib/types';

  let posts: BlogPost[] = [];
  let loading = true;
  let loadFailed = false;

  onMount(async () => {
    try {
      const response = await api.blog.list();
      posts = response.data.items;
    } catch {
      posts = [];
      loadFailed = true;
    } finally {
      loading = false;
    }
  });
</script>

<section class="container-shell py-14">
  <SectionHeader eyebrow="Blog" title="Travel Notes" description="CMS-managed blog index starter." />
  {#if loading}
    <LoadingState message="Loading stories…" />
  {:else if loadFailed}
    <ErrorState message="We could not load the blog right now. Please refresh in a moment." />
  {:else if posts.length}
    <div class="mt-8 grid gap-6 md:grid-cols-3" use:staggeredCardReveal={{ y: 16, stagger: 0.06 }}>
      {#each posts as post}
        <BlogCard {post} />
      {/each}
    </div>
  {:else}
    <EmptyState title="No stories yet" message="Fresh travel notes are on the way. Check back soon." />
  {/if}
</section>
