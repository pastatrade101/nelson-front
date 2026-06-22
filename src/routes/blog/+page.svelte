<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/api/client';
  import { staggeredCardReveal } from '$lib/animations';
  import BlogCard from '$lib/components/public/BlogCard.svelte';
  import SectionHeader from '$lib/components/public/SectionHeader.svelte';
  import { placeholderPosts } from '$lib/data/placeholders';
  import type { BlogPost } from '$lib/types';

  let posts: BlogPost[] = placeholderPosts;

  onMount(async () => {
    try {
      const response = await api.blog.list();
      posts = response.data.items.length ? response.data.items : placeholderPosts;
    } catch {
      posts = placeholderPosts;
    }
  });
</script>

<section class="container-shell py-14">
  <SectionHeader eyebrow="Blog" title="Travel Notes" description="CMS-managed blog index starter." />
  <div class="mt-8 grid gap-6 md:grid-cols-3" use:staggeredCardReveal={{ y: 16, stagger: 0.06 }}>
    {#each posts as post}
      <BlogCard {post} />
    {/each}
  </div>
</section>
