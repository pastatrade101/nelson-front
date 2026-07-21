<script lang="ts">
  // The load function in +page.ts redirects /kilimanjaro -> /destinations/kilimanjaro
  // on the server. This client-side fallback only runs on the rare edge where the
  // load redirect is skipped; it keeps the route from ever showing a blank page.
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  onMount(() => void goto('/destinations/kilimanjaro', { replaceState: true }));
</script>

<div class="container-shell py-24 text-center text-ink/60">
  Taking you to the Kilimanjaro guide…
</div>
