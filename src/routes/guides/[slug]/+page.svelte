<script lang="ts">
  import { page } from '$app/stores';
  import PlaceholderPage from '$lib/components/public/PlaceholderPage.svelte';
</script>

<PlaceholderPage
  title="Emnel Travel Guide"
  description={`Prepared guide page for ${$page.params.slug}.`}
  showAdvisor
/>
