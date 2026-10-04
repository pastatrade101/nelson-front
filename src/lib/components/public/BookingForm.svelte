<script lang="ts">
  import type { Tour } from '$lib/types';
  import PlannerCta from './PlannerCta.svelte';
  export let tour: Tour | null = null;
</script>
<PlannerCta tourSlug={tour?.slug || ''} title={tour ? 'Make this safari yours.' : 'Let’s plan your journey.'} />
