<script lang="ts">
  import { onMount } from 'svelte';
  import {
    ArrowRight,
    FileCheck,
    Headset,
    HeartPulse,
    Info,
    Lock,
    PawPrint,
    Shield,
    ShieldCheck,
    TriangleAlert
  } from '@lucide/svelte';
  import { page } from '$app/stores';
  import { api } from '$lib/api/client';
  import { staggeredCardReveal } from '$lib/animations/motion';
  import JsonLd from '$lib/components/public/JsonLd.svelte';
  import SectionHeader from '$lib/components/public/SectionHeader.svelte';
  import { breadcrumbLd } from '$lib/seo';
  import type { Destination, SafetyTopic } from '$lib/types';

  $: origin = $page.url.origin;

  // Lucide icons admins can reference by name (falls back to ShieldCheck).
  const iconMap: Record<string, typeof ShieldCheck> = {
    ShieldCheck,
    Shield,
    HeartPulse,
    PawPrint,
    Lock,
    FileCheck,
    Headset,
    Info,
    TriangleAlert
  };
  const iconFor = (name?: string | null) => (name && iconMap[name]) || ShieldCheck;

  let topics: SafetyTopic[] = [];
  let destinations: Destination[] = [];
  let loading = true;

  const load = async () => {
    loading = true;
    const [topicRes, destRes] = await Promise.allSettled([
      api.safetyTopics.list({ status: 'published', limit: 50 }),
      api.destinations.list({ status: 'published', limit: 30 })
    ]);
    if (topicRes.status === 'fulfilled') {
      topics = (topicRes.value.data.items ?? []).sort(
        (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
      );
    }
    if (destRes.status === 'fulfilled') {
      destinations = (destRes.value.data.items ?? []).filter((d) => d.safety_overview);
    }
    loading = false;
  };

  onMount(load);
</script>

<svelte:head>
  <title>Health &amp; Safety Guide | Emnel Adventures</title>
  <meta
    name="description"
    content="Honest health and safety guidance for safaris in Tanzania, Kenya and Zanzibar — vaccinations, wildlife, insurance and our 24/7 support."
  />
</svelte:head>

<JsonLd data={breadcrumbLd(origin, [{ name: 'Home', path: '/' }, { name: 'Safety', path: '/safety' }])} />

<!-- Hero -->
<section class="relative overflow-hidden bg-deep-green text-white">
  <div class="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-goldfinch-gold/20 blur-3xl"></div>
  <div class="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-savanna/15 blur-3xl"></div>
  <div class="container-shell relative py-16 md:py-24">
    <div class="max-w-2xl">
      <span class="inline-flex items-center gap-2 rounded-full bg-surface/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-savanna">
        <ShieldCheck size={14} /> Health &amp; Safety
      </span>
      <h1 class="mt-5 text-4xl font-extrabold leading-tight md:text-5xl">Travel with confidence</h1>
      <p class="mt-4 text-lg leading-8 text-white/80">
        Africa is an extraordinary, welcoming place to travel — and with the right planning, a safari is
        wonderfully safe. Here's our honest guidance on health, wildlife, security and the support you can
        count on before and during your trip.
      </p>
    </div>
  </div>
</section>

<!-- Safety topics -->
<section class="container-shell py-14 md:py-20">
  <SectionHeader
    eyebrow="The essentials"
    title="What you should know"
    description="Straightforward answers to the questions travellers ask us most."
  />

  {#if loading}
    <div class="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {#each Array(6) as _}
        <div class="h-48 animate-pulse rounded-2xl bg-sand/60"></div>
      {/each}
    </div>
  {:else if topics.length}
    <div class="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ y: 18, stagger: 0.06 }}>
      {#each topics as topic (topic.id)}
        {@const Icon = iconFor(topic.icon)}
        <article class="flex h-full flex-col rounded-2xl border border-ink/10 bg-surface p-6 shadow-soft">
          <div class="grid h-12 w-12 place-items-center rounded-xl bg-forest/10 text-forest">
            <Icon size={22} />
          </div>
          <h3 class="mt-4 text-lg font-bold text-ink">{topic.title}</h3>
          {#if topic.summary}
            <p class="mt-2 text-sm font-semibold leading-6 text-ink/70">{topic.summary}</p>
          {/if}
          {#if topic.content}
            <p class="mt-2 text-sm leading-6 text-ink/65">{topic.content}</p>
          {/if}
        </article>
      {/each}
    </div>
  {:else}
    <p class="mt-10 rounded-2xl border border-ink/10 bg-sand/40 p-6 text-center text-ink/70">
      Safety guidance is being prepared. Please <a class="font-semibold text-forest underline" href="/contact">contact us</a> with any questions in the meantime.
    </p>
  {/if}
</section>

<!-- Safety by destination -->
{#if destinations.length}
  <section class="border-t border-ink/[0.06] bg-sand/30 py-14 md:py-20">
    <div class="container-shell">
      <SectionHeader
        eyebrow="By destination"
        title="Safety where you're going"
        description="A quick overview for each region — full health & safety notes are on every destination page."
      />
      <div class="mt-9 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {#each destinations as dest (dest.id)}
          <a
            class="group flex h-full flex-col rounded-2xl border border-ink/10 bg-surface p-6 shadow-soft transition hover:border-goldfinch-gold/40 hover:shadow-md"
            href={`/destinations/${dest.slug}`}
          >
            <h3 class="text-lg font-bold text-ink">{dest.name}</h3>
            <p class="mt-2 line-clamp-4 text-sm leading-6 text-ink/65">{dest.safety_overview}</p>
            <span class="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-semibold text-forest transition group-hover:text-heading">
              Read full safety notes <ArrowRight size={16} />
            </span>
          </a>
        {/each}
      </div>
    </div>
  </section>
{/if}

<!-- CTA -->
<section class="container-shell py-14 md:py-16">
  <div class="relative overflow-hidden rounded-none bg-gradient-to-br from-deep-green via-forest to-deep-green px-6 py-12 text-center text-white md:px-12 md:py-16">
    <div class="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-goldfinch-gold/20 blur-3xl"></div>
    <div class="relative mx-auto max-w-2xl">
      <h2 class="text-2xl font-extrabold md:text-3xl">Still have a safety question?</h2>
      <p class="mt-3 text-white/75">
        Our team plans these trips every day and is happy to talk through anything — health, insurance,
        wildlife or logistics — before you commit.
      </p>
      <div class="mt-7 flex flex-wrap justify-center gap-3">
        <a class="inline-flex h-12 items-center gap-2 rounded-xl bg-goldfinch-gold px-6 font-bold text-heading shadow-lg transition hover:brightness-105" href="/plan-my-trip">
          Plan My Safari <ArrowRight size={18} />
        </a>
        <a class="inline-flex h-12 items-center rounded-xl border border-white/30 px-6 font-semibold text-white transition hover:bg-surface/10" href="/contact">
          Talk to an Advisor
        </a>
      </div>
    </div>
  </div>
</section>
