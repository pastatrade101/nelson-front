<script lang="ts">
  export let images: Record<string, unknown>[] = [];
</script>

<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
  {#each images as image}
    {@const title = typeof image.title === 'string' ? image.title.trim() : ''}
    {@const caption = typeof image.caption === 'string' ? image.caption.trim() : ''}
    <figure>
      <div class="aspect-[4/3] overflow-hidden rounded-lg bg-skywash">
        {#if typeof image.image_url === 'string'}
          <img class="h-full w-full object-cover" src={image.image_url} alt={String(image.alt_text ?? image.title ?? 'Gallery image')} />
        {/if}
      </div>
      {#if title || caption}
        <figcaption class="pt-2 text-sm">
          {#if title}<span class="font-semibold text-ink">{title}</span>{/if}
          {#if caption}<span class="mt-0.5 block text-ink/60">{caption}</span>{/if}
        </figcaption>
      {/if}
    </figure>
  {/each}
</div>
