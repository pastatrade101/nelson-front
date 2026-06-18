<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { ImagePlus } from '@lucide/svelte';
  import type { Component } from 'svelte';
  import AdminButton from './AdminButton.svelte';

  export let actionLabel = '';
  export let icon: Component = ImagePlus;
  export let message = 'There is nothing to show yet.';
  export let title = 'No records found';

  const dispatch = createEventDispatcher<{ action: void }>();
</script>

<section class="rounded-[10px] border border-dashed border-forest/20 bg-white/85 p-8 text-center shadow-[0_18px_50px_rgba(15,47,36,0.05)]">
  <div class="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-goldfinch-gold/20 text-deep-green ring-1 ring-goldfinch-gold/25">
    <svelte:component this={icon} size={25} />
  </div>
  <h2 class="mt-4 text-lg font-bold tracking-normal text-ink">{title}</h2>
  <p class="mx-auto mt-2 max-w-xl text-sm leading-6 text-ink/60">{message}</p>
  {#if actionLabel}
    <div class="mt-5">
      <AdminButton on:click={() => dispatch('action')}>{actionLabel}</AdminButton>
    </div>
  {/if}
</section>
