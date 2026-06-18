<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { fade, scale } from 'svelte/transition';

  export let open = false;
  export let title = 'Confirm action';
  export let message = 'Are you sure you want to continue?';

  const dispatch = createEventDispatcher<{ confirm: void; cancel: void }>();
</script>

{#if open}
  <div class="fixed inset-0 z-50 grid place-items-center bg-ink/45 p-4 backdrop-blur-sm" transition:fade={{ duration: 140 }}>
    <div class="w-full max-w-md rounded-[10px] border border-ink/10 bg-white p-6 shadow-[0_24px_80px_rgba(15,47,36,0.18)]" transition:scale={{ duration: 160, start: 0.98 }}>
      <h2 class="text-xl font-bold text-ink">{title}</h2>
      <p class="mt-2 text-sm leading-6 text-ink/70">{message}</p>
      <div class="mt-6 flex justify-end gap-3">
        <button class="h-10 rounded-2xl border border-ink/10 bg-white px-4 text-sm font-semibold shadow-sm transition hover:bg-sand" type="button" on:click={() => dispatch('cancel')}>Cancel</button>
        <button class="h-10 rounded-2xl bg-forest px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-deep-green" type="button" on:click={() => dispatch('confirm')}>Confirm</button>
      </div>
    </div>
  </div>
{/if}
