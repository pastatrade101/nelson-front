<script lang="ts">
  import { Clock, MapPin, Mountain } from '@lucide/svelte';
  import { tilt } from '$lib/animations';
  import type { Activity } from '$lib/types';

  export let activity: Activity;

  const categoryLabels: Record<string, string> = {
    wildlife: 'Wildlife',
    adventure: 'Adventure',
    cultural: 'Cultural',
    water: 'Water',
    trekking: 'Trekking',
    relaxation: 'Relaxation'
  };
  const difficultyLabels: Record<string, string> = {
    easy: 'Easy',
    moderate: 'Moderate',
    challenging: 'Challenging',
    strenuous: 'Strenuous'
  };

  $: imageUrl = activity.image_url || activity.hero_image_url || '';
  $: location = activity.location_label || activity.destinations?.name || '';
  $: priceLabel =
    activity.price_from != null
      ? `${activity.currency ?? 'USD'} ${Math.round(activity.price_from).toLocaleString()}`
      : '';
</script>

<article class="group flex h-full flex-col overflow-hidden rounded-[12px] border border-ink/10 bg-surface shadow-[0_14px_40px_rgba(15,47,36,0.07)] transition-shadow duration-300 hover:shadow-[0_26px_60px_rgba(15,47,36,0.16)]" use:tilt={{ max: 5 }}>
  <div class="relative aspect-[4/3] overflow-hidden bg-skywash">
    {#if imageUrl}
      <img class="h-full w-full object-cover transition-transform duration-[800ms] ease-out group-hover:scale-110" src={imageUrl} alt={activity.name} loading="lazy" />
    {/if}
    {#if activity.badge}
      <span class="absolute left-3 top-3 inline-flex items-center rounded-full bg-goldfinch-gold px-2.5 py-1 text-[11px] font-bold text-heading shadow">
        {activity.badge}
      </span>
    {/if}
  </div>
  <div class="flex flex-1 flex-col p-5">
    <p class="text-xs font-semibold uppercase tracking-[0.12em] text-clay">
      {categoryLabels[activity.category] ?? activity.category}
    </p>
    <h3 class="mt-2 text-lg font-bold tracking-normal text-ink">{activity.name}</h3>
    {#if activity.why_we_recommend}
      <p class="mt-2 line-clamp-3 text-sm leading-6 text-ink/70">{activity.why_we_recommend}</p>
    {:else if activity.description}
      <p class="mt-2 line-clamp-3 text-sm leading-6 text-ink/70">{activity.description}</p>
    {/if}

    <div class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] font-semibold text-ink/55">
      {#if location}
        <span class="inline-flex items-center gap-1.5"><MapPin size={14} /> {location}</span>
      {/if}
      {#if activity.duration_label}
        <span class="inline-flex items-center gap-1.5"><Clock size={14} /> {activity.duration_label}</span>
      {/if}
      {#if activity.difficulty}
        <span class="inline-flex items-center gap-1.5"><Mountain size={14} /> {difficultyLabels[activity.difficulty] ?? activity.difficulty}</span>
      {/if}
    </div>

    {#if priceLabel}
      <div class="mt-auto pt-4">
        <p class="text-sm text-ink/60">
          From <span class="font-bold text-ink">{priceLabel}</span>{#if activity.price_unit} · {activity.price_unit}{/if}
        </p>
      </div>
    {/if}
  </div>
</article>
