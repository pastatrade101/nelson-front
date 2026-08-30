<script lang="ts">
  import { ArrowRight, CalendarDays, Camera, Film, MapPin, Quote, Route, Star } from '@lucide/svelte';
  import { cdnUrl, thumbUrl } from '$lib/img';
  import { fadeUpOnScroll, sectionReveal, staggeredCardReveal } from '$lib/animations';
  import type { GalleryItem, Testimonial } from '$lib/types';
  import ResponsiveImage from './ResponsiveImage.svelte';

  export let images: GalleryItem[] = [];
  export let testimonials: Testimonial[] = [];
  export let eyebrow = 'Real Traveller Proof';
  export let title = 'From Our Recent Safaris';
  export let description = 'Real moments from Emnel journeys, labelled by the place and safari they belong to.';

  // One feature and four supporting moments. Documents are intentionally not
  // rendered as visual proof; existing image/video records keep their CMS order.
  $: shown = (images ?? [])
    .filter((item) => Boolean(item.image_url) && item.media_type !== 'document')
    .slice(0, 5);
  $: reviews = (testimonials ?? []).filter((item) => item.message?.trim()).slice(0, 3);

  const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
  const destinationName = (item: GalleryItem) => text(item.destinations?.name);
  const linkedTour = (item: GalleryItem) => item.tours ?? null;
  const heading = (item: GalleryItem) => text(item.title) || text(item.caption);
  const supportingCaption = (item: GalleryItem) =>
    text(item.title) && text(item.caption) && text(item.title) !== text(item.caption) ? text(item.caption) : '';
  const initials = (name: string) =>
    name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?';
  const rating = (review: Testimonial) => {
    const value = Number(review.rating);
    return Number.isInteger(value) && value >= 1 && value <= 5 ? value : 0;
  };
</script>

{#if shown.length || reviews.length}
  <section class="bg-canvas py-16 md:py-24" use:sectionReveal aria-label="Recent safari and guest proof">
    <div class="container-shell">
      {#if shown.length}
        <div class="flex flex-wrap items-end justify-between gap-4" use:fadeUpOnScroll={{ y: 14 }}>
          <div class="max-w-2xl">
            <p class="brand-eyebrow">{eyebrow}</p>
            <h2 id="recent-safaris-heading" class="mt-3 font-serif text-3xl font-normal leading-tight text-heading md:text-[40px]">{title}</h2>
            <p class="mt-3 text-[15px] font-medium leading-7 text-ink/70 md:text-base">{description}</p>
          </div>
          <a class="inline-flex shrink-0 items-center gap-2 border border-forest px-5 py-2.5 text-[12px] font-bold uppercase tracking-[0.14em] text-forest transition hover:bg-forest hover:text-white" href="/gallery">
            View full gallery <ArrowRight size={15} strokeWidth={2.5} />
          </a>
        </div>

        <div class="mt-10 grid grid-cols-2 gap-3 md:h-[520px] md:grid-cols-4 md:grid-rows-2" use:staggeredCardReveal>
          {#each shown as item, i (item.id)}
            {@const cap = heading(item)}
            {@const detail = supportingCaption(item)}
            {@const destination = destinationName(item)}
            {@const tour = linkedTour(item)}
            {@const quote = text(item.guest_quote)}
            {@const month = text(item.travel_month)}
            {@const href = tour?.slug ? `/tours/${tour.slug}` : '/gallery'}
            <a
              class={`group relative isolate overflow-hidden bg-deep-green ${i === 0 ? 'col-span-2 aspect-[16/10] md:col-span-2 md:row-span-2 md:aspect-auto' : 'aspect-square md:aspect-auto'}`}
              {href}
              aria-label={tour?.title ? `Explore ${tour.title}` : cap || 'Open the safari gallery'}
            >
              {#if item.media_type === 'video'}
                <!-- Decorative silent preview; the card itself is the only interactive element. -->
                <!-- svelte-ignore a11y-media-has-caption -->
                <video
                  class="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-105"
                  src={cdnUrl(item.image_url)}
                  autoplay
                  muted
                  loop
                  playsinline
                  preload="metadata"
                  aria-hidden="true"
                ></video>
              {:else}
                <ResponsiveImage
                  src={item.image_url}
                  fallbackSrc={item.image_url_thumbnail || thumbUrl(item as unknown as Record<string, unknown>, 'image_url')}
                  alt={item.alt_text || item.title || 'Safari gallery image'}
                  width={i === 0 ? 900 : 480}
                  sizes={i === 0 ? '(min-width:768px) 50vw, 100vw' : '(min-width:768px) 25vw, 50vw'}
                  imgClass="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-105"
                />
              {/if}

              <span class="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(15,26,24,0.12)_10%,transparent_40%,rgba(15,26,24,0.92)_100%)]"></span>

              <span class="absolute inset-x-3 top-3 flex flex-wrap items-start justify-between gap-2">
                <span class="flex flex-wrap gap-1.5">
                  {#if destination}
                    <span class="inline-flex items-center gap-1 bg-black/45 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-white backdrop-blur md:text-[10px]">
                      <MapPin size={10} strokeWidth={2.6} /> {destination}
                    </span>
                  {/if}
                  {#if month}
                    <span class="inline-flex items-center gap-1 bg-black/45 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-white backdrop-blur md:text-[10px]">
                      <CalendarDays size={10} strokeWidth={2.4} /> {month}
                    </span>
                  {/if}
                </span>
                {#if item.media_type === 'video'}
                  <span class="grid h-7 w-7 place-items-center rounded-full bg-goldfinch-gold text-deep-green"><Film size={13} /></span>
                {/if}
              </span>

              <div class="absolute inset-x-0 bottom-0 p-3 md:p-4">
                {#if quote}
                  <blockquote class={`line-clamp-2 font-serif italic leading-snug text-white drop-shadow ${i === 0 ? 'text-lg md:text-[22px]' : 'text-[13px] md:text-[15px]'}`}>“{quote}”</blockquote>
                {/if}
                {#if cap}
                  <p class={`mt-1.5 font-semibold leading-tight text-white/90 ${i === 0 ? 'text-sm md:text-base' : 'line-clamp-1 text-[11px] md:text-xs'}`}>{cap}</p>
                {/if}
                {#if detail && i === 0}<p class="mt-1 line-clamp-1 text-xs text-white/65">{detail}</p>{/if}
                {#if tour?.title}
                  <span class="mt-2 inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-goldfinch-gold md:text-[11px]">
                    <Route size={12} strokeWidth={2.4} /> Explore {tour.title}
                  </span>
                {:else}
                  <span class="mt-2 inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-goldfinch-gold md:text-[11px]">
                    <Camera size={12} strokeWidth={2.4} /> View gallery
                  </span>
                {/if}
              </div>
            </a>
          {/each}
        </div>
      {/if}

      {#if reviews.length}
        <aside class={`${shown.length ? 'mt-10' : ''} overflow-hidden bg-deep-green text-white`} aria-label="Published guest testimonials" use:fadeUpOnScroll={{ y: 14 }}>
          <div class="grid lg:grid-cols-[0.72fr_2.28fr]">
            <div class="border-b border-white/12 p-6 sm:p-8 lg:border-b-0 lg:border-r lg:p-9">
              <Quote class="text-goldfinch-gold" size={28} strokeWidth={1.5} />
              <p class="mt-5 text-[11px] font-bold uppercase tracking-[0.2em] text-goldfinch-gold">Traveller Notes</p>
              <h3 class="mt-3 font-serif text-[28px] font-light leading-tight">Real words from real journeys.</h3>
            </div>

            <div class={`grid ${reviews.length === 1 ? '' : reviews.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
              {#each reviews as review, index (review.id)}
                {@const reviewRating = rating(review)}
                <article class={`flex min-h-[250px] flex-col p-6 sm:p-8 ${index < reviews.length - 1 ? 'border-b border-white/12 md:border-b-0 md:border-r' : ''}`}>
                  {#if reviewRating}
                    <div class="flex gap-0.5 text-goldfinch-gold" aria-label={`${reviewRating} out of 5 stars`}>
                      {#each Array(5) as _, starIndex}
                        <Star size={14} fill={starIndex < reviewRating ? 'currentColor' : 'none'} strokeWidth={1.7} />
                      {/each}
                    </div>
                  {/if}
                  <blockquote class="mt-5 line-clamp-5 flex-1 font-serif text-lg italic leading-7 text-white/86">“{review.message}”</blockquote>
                  <footer class="mt-6 border-t border-white/12 pt-5">
                    <div class="flex items-center gap-3">
                      {#if review.client_image_url}
                        <img class="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-white/20" src={cdnUrl(review.client_image_url)} alt={review.client_name} width="40" height="40" loading="lazy" />
                      {:else}
                        <span class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-bold text-goldfinch-gold ring-1 ring-white/15">{initials(review.client_name)}</span>
                      {/if}
                      <div class="min-w-0">
                        <p class="truncate text-sm font-bold">{review.client_name}</p>
                        {#if review.client_country}<p class="truncate text-xs text-white/55">{review.client_country}</p>{/if}
                      </div>
                    </div>
                    {#if review.tours?.slug && review.tours?.title}
                      <a class="mt-4 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-goldfinch-gold transition hover:text-white" href={`/tours/${review.tours.slug}`}>
                        <Route size={12} /> {review.tours.title}
                      </a>
                    {/if}
                  </footer>
                </article>
              {/each}
            </div>
          </div>
        </aside>
      {/if}
    </div>
  </section>
{/if}
