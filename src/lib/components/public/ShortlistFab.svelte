<script lang="ts">
  import { Heart } from '@lucide/svelte';
  import { shortlist } from '$lib/shortlist';

  $: count = $shortlist.length;
</script>

{#if count > 0}
  <a
    class="fixed bottom-24 left-4 z-40 inline-flex items-center gap-2 rounded-full border border-ink/10 bg-surface/95 px-4 py-2.5 text-sm font-bold text-heading shadow-[0_10px_30px_rgba(15,47,36,0.15)] backdrop-blur transition hover:bg-surface lg:bottom-6"
    href="/shortlist"
    aria-label={`${count} saved trips`}
  >
    <span class="grid h-6 w-6 place-items-center rounded-full bg-clay text-white"><Heart size={13} fill="currentColor" /></span>
    Saved
    <span class="grid h-5 min-w-[20px] place-items-center rounded-full bg-deep-green px-1 text-xs text-white">{count}</span>
  </a>
{/if}
