<script lang="ts">
  import { ArrowRight, Star } from '@lucide/svelte';
  import { fadeUpOnScroll, staggeredCardReveal } from '$lib/animations';
  import type { Testimonial } from '$lib/types';

  type Review = {
    name: string;
    country: string;
    message: string;
    label: string;
    rating: number;
  };

  export let eyebrow = 'Guest Experiences';
  export let title = 'What Guests Say About';
  export let accentTitle = 'Their Tanzania Safari';
  export let subtitle = 'Every review is from a guest who travelled with Emnel Adventures on a private, tailor-made safari.';
  export let quote = '"From first enquiry to last game drive - consistently extraordinary."';
  export let ctaLabel = 'Plan Your Safari';
  export let ctaHref = '/plan-my-trip';
  export let testimonials: Testimonial[] = [];

  const fallbackReviews: Review[] = [
    {
      name: 'Melanie W.',
      country: 'Germany',
      message:
        'Nelson arranged a private bush dinner for our anniversary that I will never forget. The table was set in the middle of the Serengeti with candles, flowers and a chef. I felt like the only person on earth.',
      label: 'Anniversary Safari - Serengeti',
      rating: 5
    },
    {
      name: 'The Vandenberghe Family',
      country: 'Belgium',
      message:
        'Gabriel turned every game drive into a lesson in ecology. Our children learned more in 7 days than in a year of school. We are already planning to come back.',
      label: 'Family Safari - Serengeti',
      rating: 5
    },
    {
      name: 'Cornelia L.',
      country: 'Germany',
      message:
        'I felt like a princess. The personal photographer made this the most special experience of my life. I came home with images I had only ever dreamed of.',
      label: 'Photography Safari',
      rating: 5
    }
  ];

  const toReview = (testimonial: Testimonial): Review => ({
    name: testimonial.client_name,
    country: testimonial.client_country ?? 'Guest',
    message: testimonial.message,
    label: testimonial.tours?.title ?? 'Private Tanzania Safari',
    rating: testimonial.rating ?? 5
  });

  $: reviews = [...testimonials.map(toReview), ...fallbackReviews].slice(0, 3);
</script>

<section class="bg-ivory py-16 text-ink md:py-24" use:fadeUpOnScroll={{ y: 14 }}>
  <div class="container-shell">
    <div class="max-w-[900px]">
      <p class="brand-eyebrow">{eyebrow}</p>
      <h2 class="mt-5 font-serif text-[40px] font-light leading-[1.08] tracking-normal text-heading sm:text-[54px] lg:text-[64px]">
        {title}
        <span class="block italic text-goldfinch-gold">{accentTitle}</span>
      </h2>
      <p class="mt-6 text-[15px] font-medium leading-8 text-ink/66 md:text-base">{subtitle}</p>
    </div>

    <div class="mt-14 border border-ink/10 bg-surface" use:staggeredCardReveal={{ selector: '.review-card', y: 16, stagger: 0.06 }}>
      <div class="grid lg:grid-cols-3">
        {#each reviews as review}
          <article class="review-card min-h-[430px] border-b border-ink/10 p-8 lg:border-b-0 lg:border-r lg:p-10">
            <div class="flex gap-1 text-goldfinch-gold" aria-label={`${review.rating} star review`}>
              {#each Array(5) as _, i}
                <Star size={18} fill={i < review.rating ? 'currentColor' : 'none'} strokeWidth={1.7} />
              {/each}
            </div>
            <blockquote class="mt-10 font-serif text-[22px] italic leading-[1.65] text-heading/88">"{review.message}"</blockquote>
            <div class="mt-10 border-t border-ink/10 pt-6">
              <p class="font-bold text-heading">{review.name}</p>
              <p class="mt-1 text-sm font-medium text-ink/62">{review.country}</p>
              <p class="mt-4 inline-flex bg-linen px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-goldfinch-gold">{review.label}</p>
            </div>
          </article>
        {/each}
      </div>
      <div class="flex flex-col gap-6 bg-deep-green px-8 py-8 text-white md:flex-row md:items-center md:justify-between md:px-12">
        <p class="font-serif text-[22px] italic leading-8 text-white/72">{quote}</p>
        <a class="inline-flex h-[52px] items-center justify-center border border-goldfinch-gold px-8 text-[12px] font-bold uppercase tracking-[0.18em] text-goldfinch-gold transition hover:bg-goldfinch-gold hover:text-deep-green" href={ctaHref}>
          {ctaLabel}
          <ArrowRight size={16} strokeWidth={2.5} />
        </a>
      </div>
    </div>
  </div>
</section>
