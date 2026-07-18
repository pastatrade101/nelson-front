<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { api } from '$lib/api/client';

  // Exchange the magic-link token for a session cookie, then drop the token from
  // the URL by redirecting to the clean /trip portal (which reads the session).
  onMount(async () => {
    const token = $page.params.token ?? '';
    try {
      await api.trip.session(token);
    } catch {
      /* invalid/expired — /trip will show the "link not working" state */
    }
    await goto('/trip', { replaceState: true });
  });
</script>

<svelte:head>
  <title>Opening your trip · Emnel Adventures</title>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="grid min-h-[60vh] place-items-center px-6 text-center">
  <p class="text-sm font-medium text-ink/60">Opening your trip…</p>
</div>
