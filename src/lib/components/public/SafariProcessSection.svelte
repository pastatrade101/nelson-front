<script lang="ts">
  import { ArrowRight } from '@lucide/svelte';
  import { fadeUpOnScroll, staggeredCardReveal } from '$lib/animations';

  type Step = {
    title: string;
    text: string;
  };

  export let eyebrow = 'Simple From the Start';
  export let title = 'How a Private Tanzania Safari';
  export let accentTitle = 'With Emnel Works';
  export let subtitle =
    "Custom safari booking can feel complicated. It is not - not when you work directly with the people who run the safaris. Here is how it works from first message to first game drive.";
  export let quote = '"One conversation. One contact. One safari that is genuinely yours."';
  export let ctaLabel = 'Begin Your Journey';
  export let ctaHref = '/plan-my-trip';
  export let steps: unknown[] | undefined = undefined;

  const fallbackSteps: Step[] = [
    {
      title: "Tell Us What You're Looking For",
      text: "Send a message through our enquiry form or WhatsApp. Tell us your travel dates, group size, budget range, and what you want to see - or simply say you do not know yet. Nelson responds personally, typically within 24 hours."
    },
    {
      title: 'We Build Your Itinerary',
      text: 'Nelson designs a tailor-made itinerary around your specific requirements - parks, lodges, timing, and experiences. No fixed templates. No packages off a shelf.'
    },
    {
      title: 'We Handle Everything',
      text: 'Once confirmed, we manage every detail - lodge bookings, internal flights, park fees, transfers, and pre-departure briefing. You have one point of contact for every question.'
    },
    {
      title: 'Your Safari Begins',
      text: 'Your guide meets you at the airport. Your private vehicle is ready. Your first game drive starts. Everything is taken care of - you simply experience Tanzania.'
    }
  ];

  const stepFrom = (item: unknown): Step | null => {
    if (!item || typeof item !== 'object') return null;
    const source = item as Record<string, unknown>;
    if (typeof source.title !== 'string' || typeof source.text !== 'string') return null;
    return { title: source.title, text: source.text };
  };

  $: displaySteps = (steps ?? []).map(stepFrom).filter(Boolean) as Step[];
  $: if (!displaySteps.length) displaySteps = fallbackSteps;
</script>

<section class="bg-linen py-16 text-ink md:py-24" use:fadeUpOnScroll={{ y: 14 }}>
  <div class="container-shell">
    <div class="max-w-[760px]">
      <p class="brand-eyebrow">{eyebrow}</p>
      <h2 class="mt-5 font-serif text-[40px] font-light leading-[1.08] tracking-normal text-heading sm:text-[54px] lg:text-[64px]">
        {title}
        <span class="block italic text-goldfinch-gold">{accentTitle}</span>
      </h2>
      <p class="mt-6 max-w-[700px] text-[15px] font-medium leading-8 text-ink/70 md:text-base">{subtitle}</p>
    </div>

    <div class="mt-16 border border-ink/10 bg-surface" use:staggeredCardReveal={{ selector: '.process-card', y: 16, stagger: 0.05 }}>
      <div class="grid lg:grid-cols-4">
        {#each displaySteps as step, i}
          <article class="process-card group relative flex min-h-[320px] flex-col border-b border-ink/10 p-8 transition-colors duration-300 hover:bg-savanna/30 lg:border-b-0 lg:border-r lg:p-10">
            <div class="flex items-center gap-4">
              <span class="font-serif text-[52px] font-light leading-none text-goldfinch-gold sm:text-[58px]">{(i + 1).toString().padStart(2, '0')}</span>
              <span class="h-px flex-1 origin-left scale-x-100 bg-gradient-to-r from-goldfinch-gold/50 to-transparent transition-all duration-500 group-hover:from-goldfinch-gold"></span>
            </div>
            <h3 class="mt-8 font-serif text-[24px] font-normal leading-tight text-heading">{step.title}</h3>
            <p class="mt-4 text-[15px] font-medium leading-8 text-ink/66">{step.text}</p>
          </article>
        {/each}
      </div>
      <div class="flex flex-col gap-6 bg-deep-green px-8 py-8 text-white md:flex-row md:items-center md:justify-between md:px-12">
        <p class="font-serif text-[22px] italic leading-8 text-white/74">{quote}</p>
        <a class="inline-flex h-[52px] items-center justify-center bg-goldfinch-gold px-8 text-[12px] font-bold uppercase tracking-[0.18em] text-deep-green transition hover:bg-savanna" href={ctaHref}>
          {ctaLabel}
          <ArrowRight size={16} strokeWidth={2.5} />
        </a>
      </div>
    </div>
  </div>
</section>
