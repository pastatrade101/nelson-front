<script lang="ts">
  export let label: string;
  export let name: string;
  export let type = 'text';
  export let value = '';
  export let placeholder = '';
  export let required = false;
  /** Optional min for type="number" inputs. */
  export let min: number | undefined = undefined;
  /** Show "n/target" under the field — a soft recommended length, no truncation. */
  export let counter: number | undefined = undefined;
</script>

<label class="grid min-w-0 gap-1.5">
  <span class="text-[13px] font-semibold text-ink/65">{label}</span>
  <input
    class="h-11 w-full min-w-0 rounded-md border border-ink/15 bg-black/[0.02] px-3.5 text-sm text-ink outline-none transition placeholder:text-ink/35 hover:border-ink/25 focus:border-forest focus:bg-surface focus:ring-2 focus:ring-forest/20"
    {name}
    {type}
    bind:value
    {placeholder}
    {required}
    {min}
  />
  {#if counter}
    <span class={`justify-self-end text-[11px] font-semibold ${String(value).length > counter ? 'text-clay' : 'text-ink/40'}`}>
      {String(value).length}/{counter}
    </span>
  {/if}
</label>
