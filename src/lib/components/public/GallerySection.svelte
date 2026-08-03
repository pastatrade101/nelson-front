<script lang="ts">
  import { ArrowRight, Camera, MapPin } from '@lucide/svelte';
  import { origUrl, thumbUrl } from '$lib/img';
  import { fadeUpOnScroll, sectionReveal, staggeredCardReveal } from '$lib/animations';
  import ResponsiveImage from './ResponsiveImage.svelte';

  export let images: Record<string, unknown>[] = [];
  export let eyebrow = 'Recent Safari Gallery';
  export let title = 'Straight from the wild';
  export let description = 'Real moments from recent Emnel journeys — the Serengeti at dawn, the Migration in motion, Zanzibar’s shoreline. A window into the safaris we plan.';

  // A bento of up to 5 real images: one feature + four. Never fabricated —
  // shows only what the CMS gallery actually holds.
  $: shown = (images ?? []).filter((im) => typeof im.image_url === 'string').slice(0, 5);
  const destName = (im: Record<string, unknown>) => (im.destinations as { name?: string } | null)?.name ?? '';
  const caption = (im: Record<string, unknown>) =>
    (typeof im.title === 'string' && im.title.trim()) || (typeof im.caption === 'string' && im.caption.trim()) || '';
</script>

{#if shown.length}
  <section class="bg-canvas py-16 md:py-24" use:sectionReveal>
    <div class="container-shell">
      <div class="flex flex-wrap items-end justify-between gap-4" use:fadeUpOnScroll={{ y: 14 }}>
        <div class="max-w-2xl">
          <p class="brand-eyebrow">{eyebrow}</p>
          <h2 class="mt-3 font-serif text-3xl font-normal leading-tight text-heading md:text-[40px]">{title}</h2>
          <p class="mt-3 text-[15px] font-medium leading-7 text-ink/70 md:text-base">{description}</p>
        </div>
        <a class="inline-flex shrink-0 items-center gap-2 border border-forest px-5 py-2.5 text-[12px] font-bold uppercase tracking-[0.14em] text-forest transition hover:bg-forest hover:text-white" href="/gallery">
          View full gallery <ArrowRight size={15} strokeWidth={2.5} />
        </a>
      </div>

      <div class="mt-10 grid grid-cols-2 gap-3 md:h-[520px] md:grid-cols-4 md:grid-rows-2" use:staggeredCardReveal>
        {#each shown as im, i}
          {@const cap = caption(im)}
          {@const dest = destName(im)}
          <a
            class={`group relative overflow-hidden bg-deep-green ${i === 0 ? 'col-span-2 aspect-[16/10] md:col-span-2 md:row-span-2 md:aspect-auto' : 'aspect-square md:aspect-auto'}`}
            href="/gallery"
            aria-label={cap || 'Open the safari gallery'}
          >
            <ResponsiveImage
              src={origUrl(im, 'image_url')}
              fallbackSrc={thumbUrl(im, 'image_url')}
              alt={String(im.alt_text ?? im.title ?? 'Safari gallery image')}
              width={i === 0 ? 900 : 480}
              sizes={i === 0 ? '(min-width:768px) 50vw, 100vw' : '(min-width:768px) 25vw, 50vw'}
              imgClass="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-105"
            />
            <span class="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-[linear-gradient(180deg,transparent,rgba(15,26,24,0.82))]"></span>
            {#if dest}
              <span class="absolute left-3 top-3 inline-flex items-center gap-1 bg-black/40 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white backdrop-blur">
                <MapPin size={10} strokeWidth={2.6} /> {dest}
              </span>
            {/if}
            <div class="absolute inset-x-0 bottom-0 translate-y-1 p-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 md:p-4">
              {#if cap}<p class={`font-serif font-light leading-tight text-white drop-shadow ${i === 0 ? 'text-xl md:text-2xl' : 'text-[15px]'}`}>{cap}</p>{/if}
              <span class="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-goldfinch-gold">
                <Camera size={12} strokeWidth={2.4} /> View gallery
              </span>
            </div>
          </a>
        {/each}
      </div>
    </div>
  </section>
{/if}
