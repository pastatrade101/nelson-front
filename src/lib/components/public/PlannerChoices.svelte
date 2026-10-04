<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Check } from '@lucide/svelte';
  export let options: Array<string | { label: string; description?: string }> = [];
  export let selected: string[] = [];
  export let compact = false;
  const dispatch = createEventDispatcher<{ choose: string }>();
</script>
<div class:compact class="choices">
  {#each options as option}
    {@const label = typeof option === 'string' ? option : option.label}
    <button type="button" aria-pressed={selected.includes(label)} class:chosen={selected.includes(label)} on:click={() => dispatch('choose', label)}>
      <span><strong>{label}</strong>{#if typeof option !== 'string' && option.description}<small>{option.description}</small>{/if}</span>
      <span class="check" aria-hidden="true">{#if selected.includes(label)}<Check size={14} />{/if}</span>
    </button>
  {/each}
</div>
<style>
  .choices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.choices button{display:flex;align-items:center;justify-content:space-between;gap:12px;min-width:0;min-height:86px;padding:18px;text-align:left;border:1px solid rgb(var(--c-ink) / .16);background:rgb(var(--c-surface));color:rgb(var(--c-heading));cursor:pointer}.choices button:hover{border-color:rgb(var(--c-clay));background:rgb(var(--c-goldfinch-gold) / .05)}.choices button.chosen{border-color:rgb(var(--c-deep-green));background:rgb(var(--c-goldfinch-gold) / .12);box-shadow:inset 0 0 0 1px rgb(var(--c-deep-green))}.choices strong{font-size:15px;font-weight:600;line-height:1.4;display:block}.choices small{font-size:12px;line-height:1.6;color:rgb(var(--c-ink) / .6);display:block;margin-top:5px}.check{flex-shrink:0;width:20px;height:20px;border:1px solid rgb(var(--c-ink) / .25);display:grid;place-items:center}.chosen .check{background:rgb(var(--c-deep-green));color:white;border-color:rgb(var(--c-deep-green))}.compact button{min-height:52px;padding:13px}.compact strong{font-size:13px}button:focus-visible{outline:3px solid rgb(var(--c-goldfinch-gold));outline-offset:3px}@media(max-width:460px){.choices:not(.compact){grid-template-columns:1fr}.choices button{padding:14px;min-height:70px}.compact button{min-height:52px;padding:11px}.check{width:18px;height:18px}}
</style>
