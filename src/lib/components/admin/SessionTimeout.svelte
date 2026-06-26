<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { Clock } from '@lucide/svelte';

  // Auto sign-out after inactivity, with a warning countdown first.
  export let timeoutMs = 20 * 60 * 1000; // total inactivity before logout (20 min)
  export let warningMs = 2 * 60 * 1000; //  show the warning this long before (2 min)
  export let onTimeout: () => void; //      called when the countdown reaches zero

  let warning = false;
  let remaining = 0; // seconds left, shown in the modal
  let idleTimer: ReturnType<typeof setTimeout>;
  let warnTimer: ReturnType<typeof setTimeout>;
  let countdown: ReturnType<typeof setInterval>;
  let lastActivity = 0;

  const EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

  const clearAll = () => {
    clearTimeout(idleTimer);
    clearTimeout(warnTimer);
    clearInterval(countdown);
  };

  const start = () => {
    clearAll();
    warning = false;
    warnTimer = setTimeout(showWarning, Math.max(0, timeoutMs - warningMs));
    idleTimer = setTimeout(() => onTimeout(), timeoutMs);
  };

  const showWarning = () => {
    warning = true;
    remaining = Math.round(warningMs / 1000);
    countdown = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) clearInterval(countdown);
    }, 1000);
  };

  // Any activity resets the timer — but once the warning is up the admin must
  // explicitly choose, so a stray mouse nudge can't silently keep the session.
  const onActivity = () => {
    if (warning) return;
    const now = Date.now();
    if (now - lastActivity < 1000) return; // throttle
    lastActivity = now;
    start();
  };

  const stay = () => start();

  onMount(() => {
    if (!browser) return;
    EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    start();
  });
  onDestroy(() => {
    if (!browser) return; // onDestroy can run during SSR — guard window access
    EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
    clearAll();
  });

  // Render on <body> so the admin shell's layout/transforms can't clip the modal.
  const portal = (node: HTMLElement) => {
    document.body.appendChild(node);
    return { destroy: () => node.remove() };
  };

  $: mins = Math.floor(Math.max(0, remaining) / 60);
  $: secs = String(Math.max(0, remaining) % 60).padStart(2, '0');
</script>

{#if warning}
  <div use:portal class="fixed inset-0 z-[120] grid place-items-center p-4" role="alertdialog" aria-modal="true" aria-label="Session expiring">
    <div class="absolute inset-0 bg-ink/60 backdrop-blur-sm"></div>
    <div class="relative w-full max-w-sm rounded-2xl border border-ink/10 bg-surface p-6 text-center shadow-2xl">
      <div class="mx-auto grid h-12 w-12 place-items-center rounded-full bg-goldfinch-gold/15 text-goldfinch-gold">
        <Clock size={22} />
      </div>
      <h2 class="mt-4 text-lg font-bold text-heading">Are you still there?</h2>
      <p class="mt-2 text-sm leading-6 text-ink/65">For your security, you'll be signed out due to inactivity in</p>
      <p class="mt-2 text-4xl font-extrabold tabular-nums text-heading">{mins}:{secs}</p>
      <div class="mt-6 flex gap-3">
        <button
          type="button"
          class="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-ink/15 bg-surface px-4 text-sm font-semibold text-ink/75 transition hover:bg-sand"
          on:click={onTimeout}
        >
          Log out now
        </button>
        <button
          type="button"
          class="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-deep-green px-4 text-sm font-bold text-white transition hover:bg-forest"
          on:click={stay}
        >
          Stay logged in
        </button>
      </div>
    </div>
  </div>
{/if}
