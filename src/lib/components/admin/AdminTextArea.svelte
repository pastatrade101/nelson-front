<script lang="ts">
  export let label: string;
  export let name: string;
  export let value = '';
  export let rows = 5;
  export let placeholder = '';
</script>

<label class="grid gap-1.5">
  <span class="text-[13px] font-semibold text-ink/65">{label}</span>
  <textarea
    class="rounded-md border border-ink/15 bg-black/[0.02] px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink/35 hover:border-ink/25 focus:border-forest focus:bg-surface focus:ring-2 focus:ring-forest/20"
    {name}
    bind:value
    {rows}
    {placeholder}
  ></textarea>
</label>
