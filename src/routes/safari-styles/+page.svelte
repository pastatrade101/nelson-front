<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowRight, MessageCircle } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import { imgUrl } from '$lib/img';
  import { fadeUpOnScroll, revealHeading, staggeredCardReveal } from '$lib/animations';
  import LoadingState from '$lib/components/public/LoadingState.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import EmptyState from '$lib/components/public/EmptyState.svelte';

  type Style = {
    name: string;
    slug: string;
    description?: string | null;
    who_its_for?: string | null;
    fitness?: string | null;
    highlights?: string[] | null;
    image_url?: string | null;
  };

  let styles: Style[] = [];
  let loading = true;
  let failed = false;

  onMount(async () => {
    try {
      const res = await api.categories.list({ status: 'published', limit: 100 });
      styles = ((res.data.items ?? []) as unknown as Style[]).filter((s) => s.name && s.slug);
    } catch {
      failed = true;
    } finally {
      loading = false;
    }
  });

  // A tidy card blurb — first sentence(s) of the description, capped.
  const blurb = (text?: string | null): string => {
    const t = (text ?? '').trim();
    if (!t) return '';
    if (t.length <= 168) return t;
    return t.slice(0, 165).replace(/\s+\S*$/, '') + '…';
  };
</script>

<svelte:head>
  <title>Safari Styles | Emnel Adventures</title>
  <meta
    name="description"
    content="Every Emnel safari is private and tailor-made — but they start from a style. Family, honeymoon, the Great Migration, Big Five, luxury, photography and more. Find the way you want to travel."
  />
</svelte:head>

<!-- page header -->
<section class="bg-deep-green text-white">
  <div class="container-shell py-16 md:py-20">
    <p class="text-[12px] font-bold uppercase tracking-[0.2em] text-goldfinch-gold">Safari Styles</p>
    <h1 class="mt-4 max-w-3xl font-serif text-4xl font-light leading-[1.08] md:text-6xl" use:revealHeading>
      Find the safari that fits the way you travel
    </h1>
    <p class="mt-5 max-w-2xl text-base leading-8 text-white/80 md:text-lg">
      Every safari we run is private and built around you — but it usually starts from a style. Whether you're travelling
      as a family, chasing the Great Migration, marking a honeymoon or photographing predators at first light, here's how
      we shape a trip around it.
    </p>
  </div>
</section>

{#if loading}
  <section class="container-shell py-20"><LoadingState message="Loading safari styles..." /></section>
{:else if failed}
  <section class="container-shell py-20">
    <ErrorState message="We couldn't load safari styles right now. Please refresh in a moment." />
  </section>
{:else if !styles.length}
  <section class="container-shell py-20">
    <EmptyState title="Safari styles coming soon" message="Our safari styles are being prepared — check back again shortly." />
  </section>
{:else}
  <!-- styles grid -->
  <section class="container-shell py-14 md:py-20">
    <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" use:staggeredCardReveal={{ selector: '.style-card', y: 18, stagger: 0.05 }}>
      {#each styles as style (style.slug)}
        <!-- Only real URLs render as images; bare filenames fall back to the branded gradient. -->
        {@const image = /^(https?:\/\/|\/)/.test(style.image_url ?? '') ? imgUrl(style.image_url ?? '', 720) : ''}
        <a
          href={`/tours?category=${style.slug}`}
          class="style-card group flex flex-col overflow-hidden border border-ink/10 bg-surface shadow-[0_14px_40px_rgba(28,26,22,0.07)] transition-shadow duration-300 hover:border-goldfinch-gold/40 hover:shadow-[0_26px_60px_rgba(28,26,22,0.16)]"
        >
          <!-- image / branded fallback -->
          <div class="relative aspect-[16/10] overflow-hidden bg-deep-green">
            {#if image}
              <img src={image} alt={style.name} loading="lazy" class="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
            {:else}
              <div class="absolute inset-0 bg-[linear-gradient(150deg,#153733_0%,#0f2a2a_46%,rgba(74,55,40,0.96)_100%)]"></div>
              <span class="pointer-events-none absolute inset-0 opacity-[0.06]" style="background-image: radial-gradient(circle, #fff 1px, transparent 1.5px); background-size: 22px 22px;" aria-hidden="true"></span>
            {/if}
            <span class="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,26,24,0)_35%,rgba(13,22,20,0.82)_100%)]"></span>
            <h2 class="absolute inset-x-5 bottom-4 font-serif text-[26px] font-normal leading-tight text-white">{style.name}</h2>
          </div>

          <!-- body -->
          <div class="flex flex-1 flex-col p-6">
            {#if blurb(style.description)}
              <p class="text-[14px] leading-7 text-ink/70">{blurb(style.description)}</p>
            {/if}

            {#if style.who_its_for}
              <p class="mt-3 text-[13px] leading-6 text-ink/60">
                <span class="font-bold text-clay">Best for </span>{blurb(style.who_its_for)}
              </p>
            {/if}

            {#if style.highlights?.length}
              <div class="mt-4 flex flex-wrap gap-1.5">
                {#each style.highlights.slice(0, 3) as h}
                  <span class="border border-ink/10 bg-sand/50 px-2.5 py-1 text-[11px] font-semibold text-ink/70">{h}</span>
                {/each}
              </div>
            {/if}

            <span class="mt-auto inline-flex items-center gap-2 pt-6 text-[12px] font-bold uppercase tracking-[0.14em] text-forest transition group-hover:text-goldfinch-gold">
              View these safaris <ArrowRight size={14} strokeWidth={2.6} class="transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </a>
      {/each}
    </div>
  </section>

  <!-- not-sure band -->
  <section class="border-y border-ink/[0.06] bg-savanna/20" use:fadeUpOnScroll={{ y: 16 }}>
    <div class="container-shell flex flex-col items-start justify-between gap-4 py-10 sm:flex-row sm:items-center">
      <div>
        <p class="brand-eyebrow">Not sure which style?</p>
        <p class="mt-2 max-w-xl font-serif text-xl text-heading md:text-2xl">Tell us how you like to travel — we'll shape the right safari around it.</p>
      </div>
      <div class="flex flex-wrap gap-3">
        <a class="inline-flex h-12 items-center gap-2 bg-deep-green px-6 text-[12px] font-bold uppercase tracking-[0.14em] text-white transition hover:bg-forest" href="/plan-my-trip">
          Plan My Safari <ArrowRight size={15} strokeWidth={2.5} />
        </a>
        <a class="inline-flex h-12 items-center gap-2 border border-deep-green/20 px-6 text-[12px] font-bold uppercase tracking-[0.14em] text-heading transition hover:bg-sand/50" href="/contact">
          <MessageCircle size={15} /> Talk to an Advisor
        </a>
      </div>
    </div>
  </section>
{/if}
