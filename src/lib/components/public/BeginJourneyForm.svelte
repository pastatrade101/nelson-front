<script lang="ts">
  import PlannerCta from './PlannerCta.svelte';
  export let onClose: () => void = () => {};
</script>
<div><PlannerCta title="Begin your journey." source="legacy-enquiry" /><button type="button" class="mt-3 min-h-11 text-sm underline" on:click={onClose}>Close</button></div>
