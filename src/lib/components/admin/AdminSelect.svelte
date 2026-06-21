<script lang="ts">
  export let label: string;
  export let name: string;
  export let value = '';
  export let options: { label: string; value: string }[] = [];
</script>

<label class="grid gap-1.5">
  <span class="text-[13px] font-semibold text-ink/65">{label}</span>
  <select
    class="h-11 rounded-md border border-ink/15 bg-ink/[0.02] px-3.5 text-sm text-ink outline-none transition hover:border-ink/25 focus:border-forest focus:bg-white focus:ring-2 focus:ring-forest/20"
    {name}
    bind:value
    on:change
  >
    {#each options as option}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>
</label>
