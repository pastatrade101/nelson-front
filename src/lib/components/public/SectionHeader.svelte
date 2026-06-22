<script lang="ts">
  import { revealHeading } from '$lib/animations';
  export let eyebrow = '';
  export let title = '';
  export let description = '';
</script>

<div class="max-w-2xl">
  {#if eyebrow}
    <p class="font-serif text-xl italic text-clay">{eyebrow}</p>
  {/if}
  {#key title}
    <h2 class="mt-2 font-serif text-3xl font-bold tracking-normal text-ink md:text-4xl" use:revealHeading>{title}</h2>
  {/key}
  {#if description}
    <p class="mt-3 text-base leading-7 text-ink/70">{description}</p>
  {/if}
</div>
