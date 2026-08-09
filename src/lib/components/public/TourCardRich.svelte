<script lang="ts">
  import { ArrowRight, Binoculars, Camera, Car, Clock, Footprints, Heart, MapPin, PawPrint, Plane, Sparkles, Star, Users, Waves } from '@lucide/svelte';
  import { trackEvent } from '$lib/analytics';
  import { thumbUrl } from '$lib/img';
  import ResponsiveImage from './ResponsiveImage.svelte';
  import { tilt } from '$lib/animations';
  import ShortlistButton from './ShortlistButton.svelte';
  import { currency, formatUsd } from '$lib/currency';
  import type { Tour } from '$lib/types';
  import { tierLabel } from '$lib/tiers';

  export let tour: Tour;


  // "Perfect for" audience labels, from the tour's real persona tags.
  const PERSONA_LABEL: Record<string, string> = {
    honeymoon: 'Honeymoon', couple: 'Couples', family: 'Families', 'multi-generational': 'Multi-gen families',
    'first-time-visitor': 'First-timers', 'first-time-safari': 'First-timers', 'luxury-traveller': 'Luxury travellers',
    'wildlife-enthusiast': 'Wildlife lovers', 'wildlife-focused': 'Wildlife lovers', 'private-traveller': 'Private safari',
    'small-group': 'Small groups', solo: 'Solo travellers', photographer: 'Photographers'
  };

  // Interest icon-chips, detected from the tour's real highlights / tags / type —
  // never invented: a chip only shows when the source text actually supports it.
  type Chip = { icon: typeof Star; label: string };
  const detectChips = (t: Tour): Chip[] => {
    const hay = `${(t.highlights ?? []).join(' ')} ${t.short_description ?? ''}`.toLowerCase();
    const tags = t.persona_tags ?? [];
    const out: Chip[] = [];
    const add = (c: Chip) => { if (out.length < 4 && !out.some((x) => x.label === c.label)) out.push(c); };
    if (/big five|rhino|leopard|\blion|buffalo/.test(hay)) add({ icon: PawPrint, label: 'Big Five' });
    if (/migration|wildebeest/.test(hay)) add({ icon: Binoculars, label: 'Great Migration' });
    if (/photograph/.test(hay) || tags.includes('photographer')) add({ icon: Camera, label: 'Photography' });
    if (t.experience_type === 'safari-beach' || /zanzibar|beach|coast|indian ocean/.test(hay)) add({ icon: Waves, label: 'Beach extension' });
    if (tags.includes('fly-in') || /fly-in|flight connection|seamless flight/.test(hay)) add({ icon: Plane, label: 'Fly-in' });
    if (/walking safari/.test(hay)) add({ icon: Footprints, label: 'Walking safari' });
    if (/private vehicle|private guide/.test(hay) || tags.includes('private-traveller')) add({ icon: Car, label: 'Private vehicle' });
    if (tags.includes('family') || tags.includes('multi-generational')) add({ icon: Users, label: 'Family friendly' });
    if (tags.includes('honeymoon')) add({ icon: Heart, label: 'Honeymoon' });
    return out.slice(0, 4);
  };

  $: country = tour.destinations?.country || tour.destinations?.name || '';
  $: comfort = tierLabel(tour.budget_tier);
  $: durationLabel =
    tour.duration_days != null
      ? `${tour.duration_days} day${tour.duration_days === 1 ? '' : 's'}${tour.duration_nights ? `, ${tour.duration_nights} nights` : ''}`
      : '';
  $: metaBits = [country, comfort, durationLabel].filter(Boolean);
  $: chips = detectChips(tour);
  $: perfectFor = [...new Set((tour.persona_tags ?? []).map((p) => PERSONA_LABEL[p]).filter(Boolean))].slice(0, 2) as string[];

  $: item = {
    slug: tour.slug, title: tour.title, image_url: tour.main_image_url,
    duration_days: tour.duration_days, price_from: tour.price_from, currency: tour.currency,
    destination: tour.destinations?.name
  };
</script>

<article
  class="group relative flex h-full flex-col overflow-hidden border border-ink/10 bg-surface shadow-[0_14px_40px_rgba(28,26,22,0.07)] transition-all duration-300 hover:-translate-y-1 hover:border-goldfinch-gold/40 hover:shadow-[0_28px_64px_rgba(28,26,22,0.18)]"
  use:tilt={{ max: 4 }}
>
  <div class="absolute right-3 top-3 z-10">
    <ShortlistButton {item} />
  </div>

  <a href={`/tours/${tour.slug}`} class="flex h-full flex-col" on:click={() => trackEvent('tour_card_click', { tour_id: tour.id, tour_title: tour.title })}>
    <!-- Image: consistent 16/10 crop, gradient, destination + status badges, overlaid title -->
    <div class="relative aspect-[16/10] overflow-hidden bg-deep-green">
      {#if tour.main_image_url}
        <ResponsiveImage
          src={tour.main_image_url}
          fallbackSrc={thumbUrl(tour, 'main_image_url')}
          alt={tour.title}
          width={800}
          sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
          imgClass="h-full w-full object-cover transition-transform duration-[800ms] ease-out group-hover:scale-105"
        />
      {:else}
        <div class="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,rgba(21,55,51,0.98),rgba(74,55,40,0.92))] text-white/70">
          <MapPin size={26} strokeWidth={1.4} />
        </div>
      {/if}
      <span class="absolute inset-x-0 bottom-0 h-2/3 bg-[linear-gradient(180deg,transparent,rgba(15,26,24,0.88))]"></span>

      <!-- status badges -->
      <div class="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
        {#if tour.is_popular}
          <span class="inline-flex items-center gap-1 bg-goldfinch-gold px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-deep-green shadow"><Star size={11} fill="currentColor" strokeWidth={0} /> Best Seller</span>
        {:else if tour.is_featured}
          <span class="inline-flex items-center gap-1 bg-deep-green/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-goldfinch-gold backdrop-blur"><Sparkles size={11} strokeWidth={2.6} /> Recommended</span>
        {/if}
      </div>
      {#if country}
        <span class="absolute right-3 top-12 inline-flex items-center gap-1 bg-black/45 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white backdrop-blur"><MapPin size={10} strokeWidth={2.6} /> {country}</span>
      {/if}

      <h3 class="absolute inset-x-0 bottom-0 p-4 font-serif text-[22px] font-normal leading-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">{tour.title}</h3>
    </div>

    <!-- Body: hierarchy → meta → interests → perfect-for → price → CTA -->
    <div class="flex flex-1 flex-col p-5">
      {#if metaBits.length}
        <p class="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-bold uppercase tracking-[0.08em] text-clay">
          {#each metaBits as bit, i}{#if i > 0}<span class="text-ink/25">·</span>{/if}<span>{bit}</span>{/each}
        </p>
      {/if}

      {#if chips.length}
        <div class="mt-3 flex flex-wrap gap-1.5">
          {#each chips as chip}
            <span class="inline-flex items-center gap-1 border border-ink/10 bg-sand/50 px-2 py-1 text-[11px] font-semibold text-ink/70">
              <svelte:component this={chip.icon} size={12} strokeWidth={2} class="text-forest" /> {chip.label}
            </span>
          {/each}
        </div>
      {/if}

      {#if perfectFor.length}
        <p class="mt-3 text-[12px] font-semibold text-forest">
          Perfect for {perfectFor.join(' & ').toLowerCase()}
        </p>
      {:else if tour.short_description}
        <p class="mt-3 line-clamp-2 text-sm leading-6 text-ink/65">{tour.short_description}</p>
      {/if}

      <div class="mt-auto flex items-end justify-between gap-3 border-t border-ink/[0.08] pt-4">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/45">From</p>
          <p class="font-serif text-[26px] font-light leading-none text-heading">{formatUsd(tour.price_from ?? 0, $currency)}<span class="ml-1 text-[13px] font-sans font-semibold text-ink/55">pp</span></p>
          {#if durationLabel}<p class="mt-1 inline-flex items-center gap-1 text-[12px] font-semibold text-clay"><Clock size={12} /> {durationLabel}</p>{/if}
        </div>
        <span class="inline-flex shrink-0 items-center gap-1.5 bg-deep-green px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white transition group-hover:bg-goldfinch-gold group-hover:text-deep-green">
          View Safari <ArrowRight size={14} strokeWidth={2.6} class="transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </div>
  </a>
</article>
