<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { CalendarClock, MapPin, Users } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import { revealHeading } from '$lib/animations';
  import BookingForm from '$lib/components/public/BookingForm.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';
  import type { Tour } from '$lib/types';

  let tour: Tour | null = null;
  let loading = true;
  let error = '';

  const rel = (value: unknown, key: string) => {
    if (Array.isArray(value)) return String((value[0] as Record<string, unknown> | undefined)?.[key] ?? '');
    if (value && typeof value === 'object') return String((value as Record<string, unknown>)[key] ?? '');
    return '';
  };

  $: destination = tour ? rel((tour as Record<string, unknown>).destinations, 'name') : '';
  $: heroImage = tour ? tour.main_image_url || tour.banner_image_url || '' : '';
  $: durationLabel = tour?.duration_days ? `${tour.duration_days} days${tour.duration_nights ? ` / ${tour.duration_nights} nights` : ''}` : '';

  onMount(async () => {
    const slug = $page.params.slug ?? '';
    try {
      const response = await api.tours.get(slug);
      tour = response.data ?? null;
    } catch (requestError) {
      error = requestError instanceof Error ? requestError.message : 'Unable to load this trip.';
      tour = null;
    } finally {
      loading = false;
    }
  });
</script>

{#if loading}
  <section class="container-shell py-20">
    <LoadingState message="Loading this trip..." />
  </section>
{:else if !tour}
  <section class="container-shell py-20">
    <ErrorState message="We could not load this trip. Please try again in a moment." />
  </section>
{:else}
<section class="container-shell grid items-start gap-10 py-12 lg:grid-cols-[0.85fr_1.15fr] lg:py-16">
  <!-- tour summary -->
  <aside class="lg:sticky lg:top-24">
    <p class="font-serif text-xl italic text-clay">Booking</p>
    {#key tour.title}
      <h1 class="mt-2 text-3xl font-bold tracking-normal text-heading md:text-4xl" use:revealHeading>{tour.title}</h1>
    {/key}

    <div class="mt-6 overflow-hidden rounded-2xl border border-ink/10 bg-surface shadow-soft">
      <div class="aspect-[16/10] bg-skywash">
        {#if heroImage}
          <img class="h-full w-full object-cover" src={heroImage} alt={tour.title} />
        {/if}
      </div>
      <div class="grid gap-3 p-5">
        <div class="flex flex-wrap gap-2 text-sm font-semibold text-ink/70">
          {#if destination}
            <span class="inline-flex items-center gap-1.5 rounded-full bg-sand/70 px-3 py-1"><MapPin size={14} class="text-forest" />{destination}</span>
          {/if}
          {#if durationLabel}
            <span class="inline-flex items-center gap-1.5 rounded-full bg-sand/70 px-3 py-1"><CalendarClock size={14} class="text-forest" />{durationLabel}</span>
          {/if}
          {#if tour.group_size}
            <span class="inline-flex items-center gap-1.5 rounded-full bg-sand/70 px-3 py-1"><Users size={14} class="text-forest" />{tour.group_size}</span>
          {/if}
        </div>

        {#if tour.short_description}
          <p class="text-sm leading-6 text-ink/65">{tour.short_description}</p>
        {/if}

        {#if tour.price_from}
          <div class="mt-1 flex items-end justify-between border-t border-ink/10 pt-4">
            <span class="text-sm font-medium text-ink/70">From</span>
            <span class="text-2xl font-extrabold text-heading">{tour.currency || 'USD'} {Number(tour.price_from).toLocaleString()}</span>
          </div>
        {/if}
      </div>
    </div>

    <p class="mt-4 text-xs leading-5 text-ink/70">
      Submitting a request does not charge you. A Emnel specialist confirms availability, finalises your itinerary, and shares secure payment options separately.
    </p>
  </aside>

  <!-- booking form -->
  <div>
    <BookingForm {tour} />
  </div>
</section>
{/if}
