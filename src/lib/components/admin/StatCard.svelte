<script lang="ts">
  import { numberCounter } from '$lib/animations';

  export let label = '';
  export let value = 0;
  export let description = '';
</script>

<article class="rounded-lg border border-ink/10 bg-surface p-5 shadow-soft">
  <p class="text-sm font-medium text-ink/60">{label}</p>
  <p class="mt-3 text-3xl font-bold text-ink" use:numberCounter={{ value }}>{value}</p>
  {#if description}
    <p class="mt-2 text-sm text-ink/60">{description}</p>
  {/if}
</article>
