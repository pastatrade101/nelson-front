<script lang="ts">
  import { SCORE_DIMENSIONS, type DestinationScores } from '$lib/data/destination-scores';

  export let scores: DestinationScores;
</script>

<div class="grid gap-2.5">
  {#each SCORE_DIMENSIONS as dim}
    {@const value = scores[dim.key] as number}
    <div class="flex items-center gap-3">
      <span class="w-24 shrink-0 text-sm font-semibold text-ink/70">{dim.label}</span>
      <div class="h-2 flex-1 overflow-hidden rounded-full bg-black/10">
        <div class="h-full rounded-full bg-goldfinch-gold" style:width={`${value * 10}%`}></div>
      </div>
      <span class="w-8 shrink-0 text-right text-sm font-bold text-heading">{value}</span>
    </div>
  {/each}
</div>
