<script lang="ts">
  export let label: string;
  export let name: string;
  export let type = 'text';
  export let value = '';
  export let placeholder = '';
  export let required = false;
</script>

<label class="grid gap-2 text-sm font-medium text-ink">
  <span>{label}</span>
  <input class="rounded-md border border-ink/15 bg-surface px-3 py-3 outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/15" {name} {type} bind:value {placeholder} {required} />
</label>
