<script lang="ts">
  import PlannerCta from './PlannerCta.svelte';
  export let title = 'Plan your Tanzania safari';
  export let compact = false;
  export let capturePoint = 'lead_capture_form';
</script>
<div class:max-w-lg={compact}><PlannerCta {title} source={capturePoint} /></div>
