<script lang="ts">
  import { tilt } from '$lib/animations';
  import { imgUrl, thumbUrl } from '$lib/img';
  import type { BlogPost } from '$lib/types';

  export let post: BlogPost;
</script>

<article class="group flex h-full flex-col overflow-hidden rounded-none border border-ink/10 bg-surface shadow-[0_14px_40px_rgba(28,26,22,0.07)] transition-shadow duration-300 hover:shadow-[0_26px_60px_rgba(28,26,22,0.16)]" use:tilt={{ max: 5 }}>
  <a href={`/blog/${post.slug}`} class="flex h-full flex-col">
    <div class="aspect-[16/10] overflow-hidden bg-skywash">
      {#if post.featured_image_url}
        <img class="h-full w-full object-cover transition-transform duration-[800ms] ease-out group-hover:scale-110" src={imgUrl(thumbUrl(post, 'featured_image_url'), 700)} alt={post.title} loading="lazy" decoding="async" />
      {/if}
    </div>
    <div class="flex flex-1 flex-col p-5">
      <p class="text-sm font-semibold text-clay">{post.author_name ?? 'Tour Team'}</p>
      <h3 class="mt-2 text-xl font-bold tracking-normal text-ink">{post.title}</h3>
      <p class="mt-2 line-clamp-3 text-sm leading-6 text-ink/70">{post.excerpt}</p>
    </div>
  </a>
</article>
