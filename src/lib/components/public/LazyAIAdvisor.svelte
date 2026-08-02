<script lang="ts">
  // Defers the AI Advisor (chat UI, Lottie launcher, streaming client) out of the
  // initial bundle. It loads when the browser goes idle, on the first user
  // interaction, or immediately if something opens the advisor programmatically —
  // whichever comes first. This keeps the AI system off the critical path so it
  // has zero impact on first render / LCP.
  import { onMount, onDestroy } from 'svelte';
  import { aiAdvisorOpen } from '$lib/aiAdvisor';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let Advisor: any = null;
  let loading = false;

  const load = async () => {
    if (Advisor || loading) return;
    loading = true;
    const mod = await import('./EmnelAIAdvisor.svelte');
    Advisor = mod.default;
  };

  let cleanup: () => void = () => {};
  const unsub = aiAdvisorOpen.subscribe((open) => {
    if (open) void load();
  });

  onMount(() => {
    const events = ['pointerdown', 'keydown', 'touchstart', 'scroll'] as const;
    const onInteract = () => void load();
    events.forEach((e) => window.addEventListener(e, onInteract, { once: true, passive: true }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const idle: number = w.requestIdleCallback
      ? w.requestIdleCallback(() => void load(), { timeout: 4000 })
      : (setTimeout(() => void load(), 2500) as unknown as number);

    cleanup = () => {
      events.forEach((e) => window.removeEventListener(e, onInteract));
      if (w.cancelIdleCallback) w.cancelIdleCallback(idle);
      else clearTimeout(idle);
    };
    return cleanup;
  });

  onDestroy(() => {
    cleanup();
    unsub();
  });
</script>

{#if Advisor}
  <svelte:component this={Advisor} />
{/if}
