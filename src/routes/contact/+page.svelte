<script lang="ts">
  import { Clock, MessageSquare, ShieldCheck } from '@lucide/svelte';
  import ContactChannels from '$lib/components/public/ContactChannels.svelte';
  import ContactForm from '$lib/components/public/ContactForm.svelte';

  const assurances = [
    { icon: MessageSquare, text: 'A real conversation — never an automated reply' },
    { icon: Clock, text: 'We respond within 24 hours, often much sooner' },
    { icon: ShieldCheck, text: 'No obligation, no pressure — just honest advice' }
  ];
</script>

<!-- Header band -->
<section class="relative overflow-hidden bg-deep-green text-white">
  <div class="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-goldfinch-gold/10 blur-3xl"></div>
  <div class="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-savanna/10 blur-3xl"></div>
  <div class="container-shell relative py-14 md:py-20">
    <p class="eyebrow text-goldfinch-gold">Contact</p>
    <h1 class="type-h1 mt-4 max-w-3xl">Let’s start planning your story.</h1>
    <p class="type-lead mt-5 max-w-2xl text-white/80">
      Tell us what you have in mind and a member of our Arusha team will be in touch within 24 hours — a real
      conversation with someone who knows Tanzania the way you are about to.
    </p>
    <div class="mt-8 flex flex-wrap gap-x-7 gap-y-3">
      {#each assurances as item}
        <span class="inline-flex items-center gap-2 text-sm font-medium text-white/85">
          <svelte:component this={item.icon} size={17} class="text-goldfinch-gold" strokeWidth={2.2} />
          {item.text}
        </span>
      {/each}
    </div>
  </div>
</section>

<!-- Channels + form -->
<section class="container-shell grid gap-10 py-14 lg:grid-cols-2 lg:gap-12 lg:py-16">
  <div>
    <p class="brand-eyebrow">Reach us your way</p>
    <h2 class="type-h2 mt-2 text-heading">Talk to a real safari specialist</h2>
    <p class="mt-3 max-w-md text-base leading-[1.75] text-ink/70">
      Message us on WhatsApp for the fastest reply, call or email us directly, or fill in the form — whichever suits you.
    </p>
    <div class="mt-6">
      <ContactChannels />
    </div>
  </div>

  <div>
    <div class="mb-4 hidden lg:block">
      <p class="brand-eyebrow">Send an enquiry</p>
      <h2 class="type-h2 mt-2 text-heading">Prefer to write it down?</h2>
    </div>
    <ContactForm />
    <p class="mt-3 text-center text-sm leading-[1.6] text-ink/50">
      By sending, you agree to our <a href="/privacy" class="font-semibold text-forest underline-offset-2 hover:underline">Privacy Policy</a>.
      We never share your details, and we won’t add you to any mailing list without asking.
    </p>
  </div>
</section>
