<script lang="ts">
  import { onMount } from 'svelte';
  import { fly } from 'svelte/transition';
  import { Cookie } from '@lucide/svelte';
  import { consent, setConsent } from '$lib/consent';

  // Only decide visibility after mount. The server can't read localStorage, so an
  // SSR-rendered banner would appear in the initial HTML and then vanish on
  // hydration for anyone who already chose — the "disappears for no reason"
  // flash. Waiting for mount shows it once, with the correct state, and it stays
  // put until the visitor accepts or declines.
  let mounted = false;
  onMount(() => { mounted = true; });
</script>

{#if mounted && $consent === null}
  <div
    class="fixed inset-x-2 bottom-2 z-[70] max-w-3xl rounded-xl border border-ink/10 bg-surface p-3 shadow-[0_18px_50px_rgba(28,26,22,0.22)] sm:inset-x-auto sm:left-4 sm:right-4 sm:bottom-3 sm:mx-auto sm:rounded-2xl sm:p-4 md:left-6 md:right-6"
    role="dialog"
    aria-label="Cookie consent"
    transition:fly={{ y: 24, duration: 300 }}
  >
    <div class="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <div class="flex min-w-0 items-start gap-3">
        <span class="hidden h-9 w-9 shrink-0 place-items-center rounded-xl bg-forest/10 text-forest dark:text-goldfinch-gold sm:grid"><Cookie size={18} /></span>
        <p class="min-w-0 text-xs leading-5 text-ink/75 sm:text-sm sm:leading-6">
          Help us improve your trip planning. Google Analytics loads only if you accept; we never send personal or trip details. See our
          <a class="font-semibold text-forest underline dark:text-goldfinch-gold" href="/privacy">Privacy Policy</a>.
        </p>
      </div>
      <div class="flex w-full shrink-0 gap-2 sm:w-auto">
        <button
          type="button"
          class="h-9 flex-1 rounded-lg border border-ink/15 px-4 text-xs font-semibold text-ink/70 transition hover:bg-sand sm:h-10 sm:flex-none sm:text-sm"
          on:click={() => setConsent('denied')}
        >
          Decline
        </button>
        <button
          type="button"
          class="h-9 flex-1 rounded-lg bg-deep-green px-5 text-xs font-bold text-white transition hover:bg-forest sm:h-10 sm:flex-none sm:text-sm"
          on:click={() => setConsent('granted')}
        >
          Accept
        </button>
      </div>
    </div>
  </div>
{/if}
