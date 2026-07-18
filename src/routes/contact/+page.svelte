<script lang="ts">
  import ContactForm from '$lib/components/public/ContactForm.svelte';
  import SectionHeader from '$lib/components/public/SectionHeader.svelte';
</script>

<svelte:head>
  <title>Contact Emnel Adventures | Plan Your Tanzania Safari</title>
  <meta
    name="description"
    content="Get in touch with Emnel Adventures to start planning your private Tanzania safari. We reply within 24 hours — WhatsApp, email and enquiry form available."
  />
</svelte:head>

<section class="container-shell grid gap-10 py-14 lg:grid-cols-[0.8fr_1.2fr]">
  <SectionHeader
    eyebrow="Contact"
    title="Let’s start planning your story."
    description="Fill in the form and a member of our Arusha team will be in touch within 24 hours. Not an automated reply — a real conversation with someone who knows Tanzania the way you are about to."
  />
  <ContactForm />
</section>
