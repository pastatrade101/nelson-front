<script lang="ts">
  import { onMount } from 'svelte';
  import { BadgeCheck, MapPin, ShieldCheck, Star } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import type { Testimonial } from '$lib/types';

  // Social proof. Defaults to the brand rating, then refines from real published
  // testimonials once they load (review count shown only when there are reviews).
  let avg = 4.9;
  let count = 0;

  const points = [
    { icon: MapPin, label: 'Local Tanzania specialists' },
    { icon: ShieldCheck, label: 'Free, no-obligation planning' },
    { icon: BadgeCheck, label: '24/7 in-country support' }
  ];

  onMount(async () => {
    try {
      const res = await api.testimonials.list({ status: 'published', limit: 200 });
      const items = (res.data.items ?? []) as Testimonial[];
      count = items.length;
      const rated = items.map((t) => Number(t.rating)).filter((n) => n > 0);
      if (rated.length) avg = Math.round((rated.reduce((a, b) => a + b, 0) / rated.length) * 10) / 10;
    } catch {
      count = 0;
    }
  });
</script>

<section class="border-y border-forest/15 bg-forest/[0.07]">
  <div class="container-shell flex flex-wrap items-center justify-center gap-x-8 gap-y-3 py-4 text-sm md:justify-between">
    <div class="flex items-center gap-2">
      <span class="flex" aria-hidden="true">
        {#each Array(5) as _, i}
          <Star size={16} class="text-goldfinch-gold" fill={i < Math.round(avg) ? 'currentColor' : 'none'} />
        {/each}
      </span>
      <span class="font-bold text-ink">{avg.toFixed(1)}/5</span>
      {#if count > 0}
        <span class="text-ink/70">from {count} traveller review{count === 1 ? '' : 's'}</span>
      {:else}
        <span class="text-ink/70">loved by our travellers</span>
      {/if}
    </div>

    <div class="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
      {#each points as p}
        <span class="inline-flex items-center gap-1.5 font-semibold text-ink/70">
          <svelte:component this={p.icon} size={16} class="text-forest" /> {p.label}
        </span>
      {/each}
    </div>
  </div>
</section>
