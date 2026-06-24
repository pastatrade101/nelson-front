<script lang="ts">
  import { Moon, Sun } from '@lucide/svelte';
  import { theme, toggleTheme } from '$lib/theme';

  // Optional style hook so the same toggle fits the dark navbar/admin topbar.
  export let className = '';
</script>

<button
  type="button"
  on:click={toggleTheme}
  class={`grid h-9 w-9 shrink-0 place-items-center rounded-full border border-ink/15 text-ink/70 transition hover:bg-sand hover:text-ink ${className}`}
  aria-label={$theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
  title={$theme === 'dark' ? 'Light mode' : 'Dark mode'}
>
  {#if $theme === 'dark'}
    <Sun size={16} strokeWidth={2.2} />
  {:else}
    <Moon size={16} strokeWidth={2.2} />
  {/if}
</button>
