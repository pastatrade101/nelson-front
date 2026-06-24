<script lang="ts">
  export let href: string | undefined = undefined;
  export let type: 'button' | 'submit' | 'reset' = 'button';
  export let variant: 'primary' | 'secondary' | 'ghost' = 'primary';
  export let className = '';

  const variants = {
    primary: 'bg-forest text-white hover:bg-black',
    secondary: 'bg-surface text-ink ring-1 ring-ink/10 hover:bg-skywash',
    ghost: 'text-forest hover:bg-skywash'
  };
</script>

{#if href}
  <a class={`inline-flex items-center justify-center rounded-md px-5 py-3 text-sm font-semibold transition ${variants[variant]} ${className}`} {href}>
    <slot />
  </a>
{:else}
  <button class={`inline-flex items-center justify-center rounded-md px-5 py-3 text-sm font-semibold transition ${variants[variant]} ${className}`} {type}>
    <slot />
  </button>
{/if}
