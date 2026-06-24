<script lang="ts">
  export let className = '';
  export let padded = true;
</script>

<section class={`rounded-3xl border border-ink/10 bg-surface shadow-[0_18px_50px_rgba(15,47,36,0.06)] ${padded ? 'p-5' : ''} ${className}`}>
  <slot />
</section>
