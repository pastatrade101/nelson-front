<script lang="ts">
  import { ArrowRight, Check } from '@lucide/svelte';
  import { fadeUpOnScroll, staggeredCardReveal } from '$lib/animations';
  import { isHtml } from '$lib/richtext';

  export let eyebrow = 'Why Emnel';
  export let title = 'Private Tanzania safaris,';
  export let accentTitle = 'planned where they happen.';
  export let content =
    'Emnel Adventures was founded in Arusha by Tanzanians who know these parks, seasons and routes first-hand. You plan directly with the local team responsible for your safari.\n\nEvery itinerary is private and tailored around your dates, pace, interests and budget - never pulled from a shelf.';
  export let quote = '“We are not resellers. We are the guides.”';
  export let ctaLabel = 'Why Travel With Emnel';
  export let ctaHref = '/about';

  const promises = [
    'One local team from first conversation to final transfer',
    'No reseller layer or call-centre handoff',
    'Private vehicle, guide and daily pace',
    'Season-led advice on parks, lodges and timing'
  ];

  // The CMS contains the full brand narrative. The homepage deliberately shows
  // only its first two paragraphs; the About page carries the complete story.
  const shortenHtml = (html: string): string => {
    const paragraphs = html.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi);
    return paragraphs?.length ? paragraphs.slice(0, 2).join('') : html;
  };

  $: htmlContent = isHtml(content) ? shortenHtml(content) : '';
  $: textParagraphs = !htmlContent
    ? content.replace(/\\n/g, '\n').split(/\n{2,}/).map((part) => part.trim()).filter(Boolean).slice(0, 2)
    : [];
</script>

<section class="bg-deep-green py-16 text-white md:py-20" use:fadeUpOnScroll={{ y: 14 }}>
  <div class="container-shell grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
    <div class="max-w-[720px]">
      <p class="brand-eyebrow">{eyebrow}</p>
      <h2 class="mt-5 font-serif text-[38px] font-light leading-[1.08] tracking-normal sm:text-[50px] lg:text-[58px]">
        {title}
        <span class="block italic text-goldfinch-gold">{accentTitle}</span>
      </h2>

      {#if htmlContent}
        <div class="cms-rich mt-7 text-[15px] font-medium leading-8 text-white/68 md:text-base">{@html htmlContent}</div>
      {:else}
        <div class="mt-7 space-y-5 text-[15px] font-medium leading-8 text-white/68 md:text-base">
          {#each textParagraphs as paragraph}<p>{paragraph}</p>{/each}
        </div>
      {/if}

      <div class="mt-8 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <a class="inline-flex h-[50px] items-center justify-center gap-3 bg-goldfinch-gold px-7 text-[12px] font-bold uppercase tracking-[0.16em] text-deep-green transition hover:bg-savanna" href={ctaHref}>
          {ctaLabel} <ArrowRight size={16} strokeWidth={2.5} />
        </a>
        <blockquote class="border-l-2 border-goldfinch-gold pl-5 font-serif text-xl italic leading-8 text-goldfinch-gold">{quote}</blockquote>
      </div>
    </div>

    <div class="border border-white/10 bg-white/[0.035]" use:staggeredCardReveal={{ selector: '.why-emnel-item', y: 12, stagger: 0.05 }}>
      {#each promises as promise, index}
        <div class="why-emnel-item flex min-h-[92px] items-center gap-4 border-b border-white/[0.08] px-6 py-5 last:border-b-0 md:px-8">
          <span class="grid h-9 w-9 shrink-0 place-items-center border border-goldfinch-gold/45 text-goldfinch-gold"><Check size={16} strokeWidth={2.8} /></span>
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">Emnel promise {String(index + 1).padStart(2, '0')}</p>
            <p class="mt-1.5 text-[15px] font-semibold leading-6 text-white/82">{promise}</p>
          </div>
        </div>
      {/each}
    </div>
  </div>
</section>
