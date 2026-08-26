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

<svelte:head>
  <title>Travel Notes | Emnel Adventures</title>
  <meta name="description" content="Field notes and planning writing from the Emnel team — what we have learned guiding safaris in Tanzania." />
</svelte:head>


<section class="container-shell py-14">
  <SectionHeader eyebrow="Blog" title="Travel Notes" description="CMS-managed blog index starter." />
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
