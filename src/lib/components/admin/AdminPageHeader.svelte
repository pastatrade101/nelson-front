<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Component } from 'svelte';
  import AdminButton from './AdminButton.svelte';

  export let actionLabel = '';
  export let actionIcon: Component | null = null;
  export let description = '';
  export let eyebrow = 'Admin CMS';
  export let secondaryLabel = '';
  export let title = '';

  const dispatch = createEventDispatcher<{ action: void; secondary: void }>();
</script>

<section class="relative overflow-hidden rounded-[10px] border border-ink/10 bg-gradient-to-br from-white via-white to-sand/70 p-5 shadow-[0_20px_60px_rgba(15,47,36,0.08)] sm:p-6">
  <div class="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-goldfinch-gold/20 blur-3xl"></div>
  <div class="pointer-events-none absolute -bottom-24 left-12 h-52 w-52 rounded-full bg-forest/10 blur-3xl"></div>

  <div class="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
    <div class="max-w-3xl">
      <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">{eyebrow}</p>
      <h1 class="mt-2 text-2xl font-bold tracking-normal text-ink sm:text-3xl">{title}</h1>
      {#if description}
        <p class="mt-2 max-w-2xl text-sm leading-6 text-ink/62">{description}</p>
      {/if}
    </div>

    {#if actionLabel || secondaryLabel}
      <div class="flex flex-wrap gap-3">
        {#if secondaryLabel}
          <AdminButton variant="secondary" on:click={() => dispatch('secondary')}>{secondaryLabel}</AdminButton>
        {/if}
        {#if actionLabel}
          <AdminButton on:click={() => dispatch('action')}>
            {#if actionIcon}
              <svelte:component this={actionIcon} size={17} />
            {/if}
            {actionLabel}
          </AdminButton>
        {/if}
      </div>
    {/if}
  </div>
</section>
