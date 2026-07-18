<script lang="ts">
  export let className = '';
</script>

<div class={`rounded-none border border-ink/10 bg-surface p-4 shadow-card ${className}`}>
  <slot />
</div>
