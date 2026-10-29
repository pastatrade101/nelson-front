<script lang="ts">
  import { staggeredCardReveal } from '$lib/animations';
  import BlogCard from '$lib/components/public/BlogCard.svelte';
  import SectionHeader from '$lib/components/public/SectionHeader.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import EmptyState from '$lib/components/public/EmptyState.svelte';
  import type { BlogPost } from '$lib/types';
  import type { PageData } from './$types';

  export let data: PageData;

  // posts + loadFailed are SSR-loaded in +page.ts.
  $: posts = (data.posts ?? []) as BlogPost[];
  $: loadFailed = data.loadFailed;
</script>


<section class="container-shell py-14">
  <!-- The page's own title, as an h1: an index with no h1 reads as a stub to search engines. -->
  <SectionHeader as="h1" eyebrow="Journal" title="Travel Notes" description="Travel notes and planning advice from Emnel Adventures." />
  <!-- The list's own (visually hidden) h2 keeps the outline H1 → H2 → H3 card titles. -->
  <h2 class="type-h2 sr-only">All travel notes</h2>
  {#if loadFailed}
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
