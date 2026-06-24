<script lang="ts">
  export let label: string;
  export let name: string;
  export let type = 'text';
  export let value = '';
  export let placeholder = '';
  export let required = false;
</script>

<label class="grid gap-1.5">
  <span class="text-[13px] font-semibold text-ink/65">{label}</span>
  <input
    class="h-11 rounded-md border border-ink/15 bg-black/[0.02] px-3.5 text-sm text-ink outline-none transition placeholder:text-ink/35 hover:border-ink/25 focus:border-forest focus:bg-surface focus:ring-2 focus:ring-forest/20"
    {name}
    {type}
    bind:value
    {placeholder}
    {required}
  />
</label>
