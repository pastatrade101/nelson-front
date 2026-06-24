<script lang="ts">
  import { staggeredCardReveal } from '$lib/animations';
  import SectionHeader from '$lib/components/public/SectionHeader.svelte';
</script>

<section class="container-shell py-14">
  <SectionHeader eyebrow="About" title="Tour Company Starter" description="A clean content page prepared for your company story, team details, licenses, and travel values." />
  <div class="mt-8 grid gap-6 md:grid-cols-3" use:staggeredCardReveal={{ y: 16, stagger: 0.06 }}>
    <div class="rounded-[12px] border border-ink/10 bg-surface p-6 shadow-[0_14px_40px_rgba(15,47,36,0.07)] transition-shadow duration-300 hover:shadow-[0_26px_60px_rgba(15,47,36,0.16)]">
      <h2 class="text-lg font-bold text-ink">Local Expertise</h2>
      <p class="mt-2 text-sm leading-6 text-ink/70">Use this section for guide credentials, destination knowledge, and operating regions.</p>
    </div>
    <div class="rounded-[12px] border border-ink/10 bg-surface p-6 shadow-[0_14px_40px_rgba(15,47,36,0.07)] transition-shadow duration-300 hover:shadow-[0_26px_60px_rgba(15,47,36,0.16)]">
      <h2 class="text-lg font-bold text-ink">Custom Planning</h2>
      <p class="mt-2 text-sm leading-6 text-ink/70">Connect booking requests to itinerary design and quote workflows.</p>
    </div>
    <div class="rounded-[12px] border border-ink/10 bg-surface p-6 shadow-[0_14px_40px_rgba(15,47,36,0.07)] transition-shadow duration-300 hover:shadow-[0_26px_60px_rgba(15,47,36,0.16)]">
      <h2 class="text-lg font-bold text-ink">CMS Ready</h2>
      <p class="mt-2 text-sm leading-6 text-ink/70">Admins can manage tours, content, messages, and uploaded images.</p>
    </div>
  </div>
</section>
