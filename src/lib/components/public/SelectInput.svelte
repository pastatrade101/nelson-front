<script lang="ts">
  export let label: string;
  export let name: string;
  export let value = '';
  export let options: { label: string; value: string }[] = [];
</script>

<label class="grid gap-2 text-sm font-medium text-ink">
  <span>{label}</span>
  <select class="rounded-md border border-ink/15 bg-surface px-3 py-3 outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/15" {name} bind:value>
    {#each options as option}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>
</label>
