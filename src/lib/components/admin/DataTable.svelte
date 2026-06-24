<script lang="ts">
  import StatusBadge from './StatusBadge.svelte';

  type Column = {
    key: string;
    label: string;
    type?: 'text' | 'status' | 'currency';
  };

  export let columns: Column[] = [];
  export let rows: Record<string, unknown>[] = [];
  export let emptyMessage = 'No records found.';

  const cellValue = (row: Record<string, unknown>, key: string) => {
    const value = row[key];
    if (value === undefined || value === null || value === '') return '-';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };
</script>

<div class="overflow-hidden rounded-3xl border border-ink/10 bg-surface shadow-[0_18px_50px_rgba(15,47,36,0.06)]">
  <div class="overflow-x-auto">
    <table class="w-full min-w-[720px] text-start text-sm">
      <thead class="bg-sand/60 text-xs uppercase tracking-[0.08em] text-ink/55">
        <tr>
          {#each columns as column}
            <th class="px-4 py-3 font-semibold">{column.label}</th>
          {/each}
        </tr>
      </thead>
      <tbody class="divide-y divide-ink/10">
        {#if rows.length === 0}
          <tr>
            <td class="px-4 py-8 text-center text-ink/60" colspan={columns.length}>{emptyMessage}</td>
          </tr>
        {:else}
          {#each rows as row}
            <tr class="transition hover:bg-sand/30">
              {#each columns as column}
                <td class="px-4 py-4 text-ink/75">
                  {#if column.type === 'status'}
                    <StatusBadge status={cellValue(row, column.key)} />
                  {:else}
                    {cellValue(row, column.key)}
                  {/if}
                </td>
              {/each}
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>
</div>
