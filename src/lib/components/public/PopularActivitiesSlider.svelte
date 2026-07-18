<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowUpRight, MapPin, Timer } from '@lucide/svelte';
  import { fadeUpOnScroll, revealHeading, staggeredCardReveal, tilt } from '$lib/animations';
  import { api } from '$lib/api/client';
  import type { Activity as ActivityRecord } from '$lib/types';

  type ActivityCard = {
    badge?: string;
    badgeTone?: 'red' | 'yellow';
    duration: string;
    image: string;
    location: string;
    price?: number;
    priceLabel: string;
    title: string;
    href: string;
  };

  // On-brand fallback shown until the Activities CMS content loads (or if empty).
  const fallbackActivities: ActivityCard[] = [
    {
      badge: 'Popular',
      badgeTone: 'yellow',
      duration: 'Approx. 1 hour',
      image: 'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?auto=format&fit=crop&w=900&q=85',
      location: 'Serengeti, Tanzania',
      price: 599,
      priceLabel: 'Per person',
      title: 'Hot Air Balloon Safari',
      href: '/destinations'
    },
    {
      duration: 'Full day',
      image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=900&q=85',
      location: 'Ngorongoro, Tanzania',
      price: 250,
      priceLabel: 'Per person',
      title: 'Ngorongoro Crater Game Drive',
      href: '/destinations'
    },
    {
      badge: 'Iconic',
      badgeTone: 'red',
      duration: 'Half to full day',
      image: 'https://images.unsplash.com/photo-1534177616072-ef7dc120449d?auto=format&fit=crop&w=900&q=85',
      location: 'Serengeti, Tanzania',
      price: 250,
      priceLabel: 'Per person',
      title: 'Great Migration Game Drive',
      href: '/destinations'
    },
    {
      duration: 'Half day',
      image: 'https://images.unsplash.com/photo-1558998708-ce92a9c8da00?auto=format&fit=crop&w=900&q=85',
      location: 'Zanzibar, Tanzania',
      price: 45,
      priceLabel: 'Per person',
      title: 'Stone Town & Spice Tour',
      href: '/destinations'
    },
    {
      badge: 'Popular',
      badgeTone: 'yellow',
      duration: 'Full day',
      image: 'https://images.unsplash.com/photo-1534177616072-ef7dc120449d?auto=format&fit=crop&w=900&q=85',
      location: 'Maasai Mara, Kenya',
      price: 40,
      priceLabel: 'Per person',
      title: 'Maasai Village Cultural Visit',
      href: '/destinations'
    },
    {
      duration: 'Full day',
      image: 'https://images.unsplash.com/photo-1589553416260-f586c8f1514f?auto=format&fit=crop&w=900&q=85',
      location: 'Kilimanjaro, Tanzania',
      price: 180,
      priceLabel: 'Per person',
      title: 'Kilimanjaro Foothills Day Hike',
      href: '/destinations'
    }
  ];

  const toCard = (a: ActivityRecord): ActivityCard => ({
    badge: a.badge ?? undefined,
    badgeTone: a.is_featured ? 'yellow' : undefined,
    duration: a.duration_label || '',
    image: a.image_url || a.hero_image_url || '',
    location: a.location_label || a.destinations?.name || '',
    price: a.price_from ?? undefined,
    priceLabel: a.price_unit || 'Per person',
    title: a.name,
    href: a.destinations?.slug ? `/destinations?d=${a.destinations.slug}` : '/tours'
  });

  let activities: ActivityCard[] = fallbackActivities;

  const loadActivities = async () => {
    try {
      const res = await api.activities.list({ status: 'published', limit: 6 });
      const items = (res.data.items ?? []) as ActivityRecord[];
      if (items.length) activities = items.map(toCard).slice(0, 6);
    } catch {
      // keep the fallback list
    }
  };

  onMount(loadActivities);
</script>

<section class="bg-surface py-14 md:py-20" use:fadeUpOnScroll={{ y: 18 }}>
  <div class="container-shell">
    <div class="mx-auto max-w-2xl text-center">
      <p class="font-serif text-xl italic text-clay">Things to do</p>
      <h2 class="mt-2 text-3xl font-extrabold tracking-tight text-heading md:text-[40px]" use:revealHeading>Popular Activities</h2>
      <p class="mx-auto mt-3 max-w-[620px] text-[15px] leading-7 text-ink/70 md:text-base">
        A curated list of the most-loved experiences across our Tanzania, Kenya & Zanzibar destinations.
      </p>
    </div>

    <div
      class="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      use:staggeredCardReveal={{ selector: '.activity-card', y: 16, stagger: 0.06 }}
    >
      {#each activities as activity}
        <article
          class="activity-card group relative flex h-full flex-col overflow-hidden rounded-none border border-ink/10 bg-surface shadow-[0_14px_40px_rgba(28,26,22,0.07)] transition-shadow duration-300 hover:shadow-[0_26px_60px_rgba(28,26,22,0.16)]"
          use:tilt={{ max: 5 }}
        >
          <a href={activity.href} class="relative block aspect-[16/10] overflow-hidden bg-skywash">
            <img
              class="h-full w-full object-cover transition-transform duration-[800ms] ease-out group-hover:scale-110"
              src={activity.image}
              alt={activity.title}
              loading="lazy"
            />
            <span class="pointer-events-none absolute inset-0 bg-gradient-to-t from-deep-green/45 via-transparent to-transparent"></span>

            {#if activity.badge}
              <span
                class={`absolute right-3 top-3 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide shadow-md ${
                  activity.badgeTone === 'red' ? 'bg-clay text-white' : 'bg-goldfinch-gold text-heading'
                }`}
              >
                {activity.badge}
              </span>
            {/if}
          </a>

          <div class="flex flex-1 flex-col p-5">
            <h3 class="text-lg font-extrabold leading-snug tracking-tight text-ink">{activity.title}</h3>

            <div class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-semibold text-ink/70">
              {#if activity.location}
                <span class="inline-flex items-center gap-1.5">
                  <MapPin size={15} strokeWidth={2.4} class="text-forest" /> {activity.location}
                </span>
              {/if}
              {#if activity.location && activity.duration}<span class="text-ink/20">·</span>{/if}
              {#if activity.duration}
                <span class="inline-flex items-center gap-1.5">
                  <Timer size={15} strokeWidth={2.4} class="text-forest" /> {activity.duration}
                </span>
              {/if}
            </div>

            <div class="mt-auto flex items-center justify-between gap-3 border-t border-ink/[0.08] pt-4">
              <a
                href={activity.href}
                class="inline-flex items-center gap-1.5 rounded-none bg-forest px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-deep-green"
              >
                Explore
                <ArrowUpRight size={16} strokeWidth={2.6} class="transition-transform duration-300 group-hover:translate-x-0.5" />
              </a>

              {#if activity.price != null}
                <div class="text-right leading-tight">
                  <p class="text-[11px] font-medium uppercase tracking-wide text-ink/65">{activity.priceLabel}</p>
                  <p class="text-lg font-extrabold text-heading">${activity.price.toLocaleString()}</p>
                </div>
              {/if}
            </div>
          </div>
        </article>
      {/each}
    </div>

    <div class="mt-10 flex justify-center">
      <a
        class="inline-flex h-12 items-center gap-2 rounded-full bg-forest px-7 font-bold text-white shadow-sm transition hover:bg-deep-green"
        href="/tours"
      >
        View all activities <ArrowUpRight size={18} strokeWidth={2.6} />
      </a>
    </div>
  </div>
</section>
