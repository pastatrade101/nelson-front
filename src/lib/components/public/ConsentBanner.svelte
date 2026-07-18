<script lang="ts">
  import { fly } from 'svelte/transition';
  import { Cookie } from '@lucide/svelte';
  import { consent, setConsent } from '$lib/consent';
</script>

{#if $consent === null}
  <div
    class="fixed inset-x-3 bottom-3 z-[55] mx-auto max-w-3xl rounded-2xl border border-ink/10 bg-surface p-4 shadow-[0_18px_50px_rgba(28,26,22,0.22)] sm:inset-x-auto sm:left-4 sm:right-4 md:left-6 md:right-6"
    role="dialog"
    aria-label="Cookie consent"
    transition:fly={{ y: 24, duration: 300 }}
  >
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-start gap-3">
        <span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-forest/10 text-forest dark:text-goldfinch-gold"><Cookie size={18} /></span>
        <p class="text-sm leading-6 text-ink/75">
          We use privacy-friendly analytics to improve your trip planning. With your consent we also use Google Analytics.
          Your name, email and trip details are never sent to analytics. See our
          <a class="font-semibold text-forest underline dark:text-goldfinch-gold" href="/privacy">Privacy Policy</a>.
        </p>
      </div>
      <div class="flex shrink-0 gap-2">
        <button
          type="button"
          class="h-10 rounded-lg border border-ink/15 px-4 text-sm font-semibold text-ink/70 transition hover:bg-sand"
          on:click={() => setConsent('denied')}
        >
          Decline
        </button>
        <button
          type="button"
          class="h-10 rounded-lg bg-deep-green px-5 text-sm font-bold text-white transition hover:bg-forest"
          on:click={() => setConsent('granted')}
        >
          Accept
        </button>
      </div>
    </div>
  </div>
{/if}
