<script lang="ts">
  export let href: string | undefined = undefined;
  export let type: 'button' | 'submit' | 'reset' = 'button';
  export let variant: 'primary' | 'secondary' | 'ghost' = 'primary';
  export let className = '';

  const variants = {
    primary: 'bg-deep-green text-white hover:bg-forest',
    secondary: 'border border-deep-green bg-transparent text-deep-green hover:bg-deep-green hover:text-white',
    ghost: 'border border-goldfinch-gold bg-transparent text-goldfinch-gold hover:bg-goldfinch-gold hover:text-deep-green'
  };
</script>

{#if href}
  <a class={`inline-flex items-center justify-center rounded-md px-7 py-3 text-[13px] font-semibold transition ${variants[variant]} ${className}`} {href}>
    <slot />
  </a>
{:else}
  <button class={`inline-flex items-center justify-center rounded-md px-7 py-3 text-[13px] font-semibold transition ${variants[variant]} ${className}`} {type}>
    <slot />
  </button>
{/if}
