<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowLeftRight, ArrowUpRight, MapPin, Timer } from '@lucide/svelte';
  import { fadeUpOnScroll, staggeredCardReveal } from '$lib/animations';
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
      badge: 'Limited permits',
      badgeTone: 'red',
      duration: 'Half to full day',
      image: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?auto=format&fit=crop&w=900&q=85',
      location: 'Volcanoes NP, Rwanda',
      price: 1500,
      priceLabel: 'Per person',
      title: 'Mountain Gorilla Trek',
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
      const res = await api.activities.list({ is_featured: true, status: 'published', limit: 8 });
      const items = (res.data.items ?? []) as ActivityRecord[];
      if (items.length) {
        activities = items.map(toCard);
        syncVisibleCount();
      }
    } catch {
      // keep the fallback list
    }
  };

  let viewport: HTMLDivElement;
  let cards: HTMLElement[] = [];
  let page = 0;
  let visibleCount = 3;

  $: pageCount = Math.max(Math.ceil(activities.length / visibleCount), 1);

  const registerCard = (node: HTMLElement, index: number) => {
    cards[index] = node;

    return {
      destroy() {
        cards[index] = undefined as unknown as HTMLElement;
      }
    };
  };

  const syncVisibleCount = () => {
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const nextVisibleCount = viewportWidth >= 1024 ? 3 : viewportWidth >= 700 ? 2 : 1;
    visibleCount = nextVisibleCount;

    const nextPageCount = Math.max(Math.ceil(activities.length / nextVisibleCount), 1);
    page = Math.min(page, nextPageCount - 1);
    requestAnimationFrame(() => goTo(page, false));
  };

  const goTo = (nextPage: number, smooth = true) => {
    page = Math.min(Math.max(nextPage, 0), pageCount - 1);
    const card = cards[page * visibleCount];

    if (!viewport || !card) return;
    viewport.scrollTo({
      behavior: smooth ? 'smooth' : 'auto',
      left: Math.max(card.offsetLeft - viewport.offsetLeft, 0)
    });
  };

  onMount(() => {
    syncVisibleCount();
    void loadActivities();
    window.addEventListener('resize', syncVisibleCount);

    return () => window.removeEventListener('resize', syncVisibleCount);
  });
</script>

<section class="bg-white py-14 md:py-20" use:fadeUpOnScroll={{ y: 18 }}>
  <div class="container-shell">
    <div class="mx-auto max-w-2xl text-center">
      <h2 class="text-3xl font-extrabold tracking-normal text-[#111111] md:text-[40px]">Popular Activities</h2>
      <p class="mx-auto mt-3 max-w-[620px] text-[15px] font-medium leading-7 text-[#555555] md:text-lg">
        A curated list of the most popular travel packages based on different destinations.
      </p>
    </div>

    <div class="mt-10 overflow-hidden" bind:this={viewport}>
      <div class="activity-track" use:staggeredCardReveal={{ selector: '.activity-card', y: 16, stagger: 0.07 }}>
        {#each activities as activity, index}
          <article class="activity-card" use:registerCard={index}>
            <div class="relative overflow-hidden rounded-t-2xl">
              <img class="h-[176px] w-full object-cover" src={activity.image} alt={activity.title} />

              {#if activity.badge}
                <span class={`activity-badge ${activity.badgeTone === 'red' ? 'activity-badge-red' : 'activity-badge-yellow'}`}>
                  {activity.badge}
                </span>
              {/if}
            </div>

            <div class="px-4 pb-4 pt-4">
              <h3 class="text-[17px] font-extrabold leading-snug tracking-normal text-[#121212]">{activity.title}</h3>

              <div class="mt-2 flex flex-wrap items-center gap-2.5 text-[13px] font-semibold text-[#5f5f5f]">
                {#if activity.location}
                  <span class="inline-flex items-center gap-1.5">
                    <MapPin size={15} strokeWidth={2.4} />
                    {activity.location}
                  </span>
                {/if}
                {#if activity.location && activity.duration}
                  <ArrowLeftRight size={14} strokeWidth={2.4} class="text-[#c4c4c4]" />
                {/if}
                {#if activity.duration}
                  <span class="inline-flex items-center gap-1.5">
                    <Timer size={15} strokeWidth={2.4} />
                    {activity.duration}
                  </span>
                {/if}
              </div>

              <div class="mt-4 flex items-center justify-between gap-4 border-t border-[#11111110] pt-4">
                <a class="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#315b3f] px-4 text-[13px] font-extrabold text-[#fff5ca] transition hover:bg-[#244631]" href={activity.href}>
                  Explore
                  <ArrowUpRight size={16} strokeWidth={2.6} />
                </a>

                {#if activity.price != null}
                  <div class="text-right leading-none">
                    <p class="text-[11px] font-bold uppercase tracking-wide text-[#888888]">{activity.priceLabel}</p>
                    <p class="mt-1 text-[22px] font-extrabold leading-none text-[#101010]">${activity.price}</p>
                  </div>
                {/if}
              </div>
            </div>
          </article>
        {/each}
      </div>
    </div>

    <div class="mt-9 flex items-center justify-center gap-3" aria-label="Popular activities slider pagination">
      {#each Array(pageCount) as _, index}
        <button
          class={`h-3 rounded-full transition ${page === index ? 'w-9 bg-[#315b3f]' : 'w-3 bg-[#d3d3d3]'}`}
          type="button"
          aria-label={`Show activity slide ${index + 1}`}
          aria-current={page === index ? 'true' : 'false'}
          on:click={() => goTo(index)}
        ></button>
      {/each}
    </div>
  </div>
</section>

<style>
  .activity-track {
    display: grid;
    gap: 24px;
    grid-auto-columns: 100%;
    grid-auto-flow: column;
  }

  .activity-card {
    min-width: 0;
    overflow: hidden;
    border: 1px solid rgba(17, 17, 17, 0.08);
    border-radius: 16px;
    background: white;
    box-shadow: 0 10px 26px rgba(15, 25, 40, 0.06);
  }

  .activity-badge {
    position: absolute;
    right: 16px;
    top: 18px;
    display: inline-flex;
    min-height: 34px;
    align-items: center;
    border-radius: 999px;
    padding: 0 18px;
    font-size: 14px;
    font-weight: 800;
    color: #101010;
  }

  .activity-badge-red {
    background: #ff513f;
    color: white;
  }

  .activity-badge-yellow {
    background: #ffe947;
  }

  @media (min-width: 700px) {
    .activity-track {
      grid-auto-columns: calc((100% - 24px) / 2);
    }
  }

  @media (min-width: 1024px) {
    .activity-track {
      gap: 28px;
      grid-auto-columns: calc((100% - 56px) / 3);
    }
  }
</style>
