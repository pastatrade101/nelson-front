<script lang="ts">
  import { brand } from '$lib/brand';
  import LeadCaptureForm from './LeadCaptureForm.svelte';
  import SectionHeader from './SectionHeader.svelte';

  export let description = 'This route is prepared for Emnel content, SEO, CMS data, and future visual design.';
  export let showLeadForm = false;
  export let title = brand.name;
</script>

<svelte:head>
  <title>{title} | {brand.name}</title>
  <meta name="description" content={description} />
</svelte:head>

<section class="bg-sand py-16 md:py-20">
  <div class="container-shell grid gap-8 md:grid-cols-[1fr_0.8fr] md:items-start">
    <div>
      <SectionHeader eyebrow={brand.tagline} {title} {description} />
      <div class="mt-8 grid gap-4 rounded-lg border border-ink/10 bg-surface p-5 text-sm leading-6 text-ink/70 shadow-soft">
        <p>{brand.positioning}</p>
        <p>CMS and API hooks are ready for tours, destinations, lead capture, AI conversations, SEO content, and HubSpot handoff.</p>
      </div>
    </div>

    {#if showLeadForm}
      <LeadCaptureForm compact />
    {/if}
  </div>
</section>
