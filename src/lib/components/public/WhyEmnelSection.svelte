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
  export let promises = [
    'One local team from first conversation to final transfer',
    'No reseller layer or call-centre handoff',
    'Private vehicle, guide and daily pace',
    'Season-led advice on parks, lodges and timing'
  ];
  /** Light when a dark section sits right next to it, so two dark bands never merge. */
  export let tone: 'dark' | 'light' = 'dark';

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
  $: dark = tone === 'dark';
</script>

<!-- Light is linen, not ivory: every other light section is ivory, so it stays distinct beside them too. -->
<section class={`py-16 md:py-20 ${dark ? 'bg-deep-green text-white' : 'bg-linen text-ink'}`} use:fadeUpOnScroll={{ y: 14 }}>
  <div class="container-shell grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
    <div class="max-w-[720px]">
      <p class="brand-eyebrow">{eyebrow}</p>
      <h2 class={`type-h2 mt-5 ${dark ? '' : 'text-heading'}`}>
        {title}
        {#if accentTitle}<span class="block italic text-emnel-gold">{accentTitle}</span>{/if}
      </h2>

      {#if htmlContent}
        <div class={`cms-rich mt-7 text-base leading-[1.75] font-medium ${dark ? 'text-white/68' : 'text-ink/70'}`}>{@html htmlContent}</div>
      {:else}
        <div class={`mt-7 space-y-5 text-base leading-[1.75] font-medium ${dark ? 'text-white/68' : 'text-ink/70'}`}>
          {#each textParagraphs as paragraph}<p>{paragraph}</p>{/each}
        </div>
      {/if}

      <div class="mt-8 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <a class="inline-flex h-[50px] items-center justify-center gap-3 bg-emnel-gold px-7 text-[12px] font-bold uppercase tracking-[0.16em] text-deep-green transition hover:bg-savanna" href={ctaHref}>
          {ctaLabel} <ArrowRight size={16} strokeWidth={2.5} />
        </a>
        {#if quote}
          <blockquote class={`border-l-2 border-emnel-gold pl-5 font-serif text-xl italic leading-8 ${dark ? 'text-emnel-gold' : 'text-heading'}`}>{quote}</blockquote>
        {/if}
      </div>
    </div>

    {#if promises.length}
      <div class={`border ${dark ? 'border-white/10 bg-white/[0.035]' : 'border-ink/10 bg-surface'}`} use:staggeredCardReveal={{ selector: '.why-emnel-item', y: 12, stagger: 0.05 }}>
        {#each promises as promise, index}
          <div class={`why-emnel-item flex min-h-[92px] items-center gap-4 border-b px-6 py-5 last:border-b-0 md:px-8 ${dark ? 'border-white/[0.08]' : 'border-ink/10'}`}>
            <span class="grid h-9 w-9 shrink-0 place-items-center border border-emnel-gold/45 text-emnel-gold"><Check size={16} strokeWidth={2.8} /></span>
            <div>
              <p class={`eyebrow ${dark ? 'text-white/35' : 'text-ink/45'}`}>Emnel promise {String(index + 1).padStart(2, '0')}</p>
              <p class={`mt-1.5 text-base font-semibold leading-6 ${dark ? 'text-white/82' : 'text-ink/80'}`}>{promise}</p>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</section>
