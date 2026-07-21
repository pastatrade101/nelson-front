<script lang="ts">
  import { ArrowRight, Check, Sparkles } from '@lucide/svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { api } from '$lib/api/client';
  import { revealHeading } from '$lib/animations';
  import JsonLd from '$lib/components/public/JsonLd.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import { breadcrumbLd, faqLd } from '$lib/seo';
  import type { Comparison } from '$lib/types';

  type NormCmp = {
    slug: string;
    eyebrow: string;
    title: string;
    intro: string;
    a: { name: string; image?: string };
    b: { name: string; image?: string };
    dimensions: { label: string; a: string; b: string }[];
    verdict: string;
    cta: { label: string; href: string };
    faqs?: { q: string; a: string }[];
  };

  $: origin = $page.url.origin;

  // Carry the comparison topic into internal planning links (e.g. /plan-my-trip)
  // so the form can pre-fill it and the lead records where the visitor came from.
  // Custom/external CTA links are left untouched.
  const withTopic = (href: string, topic: string) => {
    if (!href.startsWith('/')) return href;
    const sep = href.includes('?') ? '&' : '?';
    return `${href}${sep}topic=${encodeURIComponent(topic)}`;
  };
  $: ctaHref = cmp ? withTopic(cmp.cta.href, cmp.title) : '/plan-my-trip';

  let cmp: NormCmp | null = null;
  let others: { slug: string; eyebrow: string; title: string }[] = [];
  let loading = true;
  let loadFailed = false;

  const fromApi = (c: Comparison): NormCmp => ({
    slug: c.slug,
    eyebrow: c.eyebrow ?? '',
    title: c.title,
    intro: c.intro ?? '',
    a: { name: c.a_name, image: c.a_image_url ?? undefined },
    b: { name: c.b_name, image: c.b_image_url ?? undefined },
    dimensions: c.dimensions ?? [],
    verdict: c.verdict ?? '',
    cta: { label: c.cta_label ?? 'Plan My Safari', href: c.cta_href ?? '/plan-my-trip' },
    faqs: c.faqs ?? []
  });

  const loadCmp = async (slug: string) => {
    loading = true;
    loadFailed = false;
    cmp = null;
    others = [];
    try {
      const res = await api.comparisons.get(slug);
      cmp = fromApi(res.data);
    } catch {
      loadFailed = true;
      cmp = null;
    } finally {
      loading = false;
    }

    if (cmp) {
      try {
        const list = await api.comparisons.list({ status: 'published', limit: 100 });
        const rows = list.data.items as Comparison[];
        others = rows
          .map((c) => ({ slug: c.slug, eyebrow: c.eyebrow ?? '', title: c.title }))
          .filter((c) => c.slug !== slug)
          .slice(0, 2);
      } catch {
        others = [];
      }
    }
  };

  $: slug = $page.params.slug ?? '';
  $: if (browser && slug) void loadCmp(slug);
</script>

{#if loading}
  <section class="container-shell py-20"><LoadingState message="Loading comparison..." /></section>
{:else if cmp}
  <JsonLd data={breadcrumbLd(origin, [{ name: 'Home', path: '/' }, { name: 'Compare', path: '/compare' }, { name: cmp.title, path: `/compare/${cmp.slug}` }])} />
  {#if cmp.faqs?.length}<JsonLd data={faqLd(cmp.faqs)} />{/if}
  <!-- hero -->
  <section class="relative overflow-hidden bg-deep-green text-white">
    {#if cmp.a.image}
      <img class="absolute inset-0 h-full w-full object-cover opacity-40" src={cmp.a.image} alt="" />
    {/if}
    <div class="absolute inset-0 bg-gradient-to-t from-deep-green via-deep-green/80 to-deep-green/40"></div>
    <div class="container-shell relative py-14 md:py-20">
      <nav class="mb-5 flex items-center gap-2 text-sm text-white/70">
        <a class="font-medium transition hover:text-white" href="/compare">Compare</a>
        <span class="text-white/30">/</span>
        <span class="font-medium text-white">{cmp.title}</span>
      </nav>
      <p class="font-serif text-xl italic text-savanna">{cmp.eyebrow}</p>
      {#key cmp.title}
        <h1 class="mt-2 max-w-3xl text-3xl font-extrabold leading-[1.08] tracking-tight md:text-5xl" use:revealHeading>{cmp.title}</h1>
      {/key}
      <p class="mt-4 max-w-2xl text-[15px] leading-7 text-white/80 md:text-base">{cmp.intro}</p>
    </div>
  </section>

  <section class="container-shell py-12 md:py-16">
    <!-- comparison table -->
    <div class="overflow-hidden rounded-none border border-ink/10 bg-surface shadow-soft">
      <div class="hidden grid-cols-[200px_1fr_1fr] border-b border-ink/10 bg-sand/40 sm:grid">
        <div class="p-4"></div>
        <div class="p-4 text-center text-lg font-extrabold text-heading">{cmp.a.name}</div>
        <div class="p-4 text-center text-lg font-extrabold text-heading">{cmp.b.name}</div>
      </div>
      {#each cmp.dimensions as dim, i}
        <div class={`grid sm:grid-cols-[200px_1fr_1fr] ${i % 2 ? 'bg-sand/20' : 'bg-surface'}`}>
          <div class="px-4 pt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-clay sm:py-4 sm:text-xs">{dim.label}</div>
          <div class="px-4 pb-2 pt-1 text-sm leading-6 text-ink/75 sm:border-l sm:border-ink/10 sm:py-4">
            <span class="mb-1 block text-xs font-bold text-heading sm:hidden">{cmp.a.name}</span>{dim.a}
          </div>
          <div class="px-4 pb-4 pt-1 text-sm leading-6 text-ink/75 sm:border-l sm:border-ink/10 sm:py-4">
            <span class="mb-1 block text-xs font-bold text-heading sm:hidden">{cmp.b.name}</span>{dim.b}
          </div>
        </div>
      {/each}
    </div>

    <!-- verdict -->
    <div class="mt-8 flex items-start gap-3 rounded-2xl border border-goldfinch-gold/30 bg-savanna/20 p-5 md:p-6">
      <Sparkles size={22} class="mt-0.5 shrink-0 text-goldfinch-gold" />
      <div>
        <p class="text-sm font-bold uppercase tracking-[0.14em] text-clay">Our honest verdict</p>
        <p class="mt-2 text-base leading-7 text-ink/80">{cmp.verdict}</p>
        <a class="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-deep-green px-6 font-bold text-white transition hover:bg-forest" href={ctaHref}>
          {cmp.cta.label} <ArrowRight size={16} />
        </a>
      </div>
    </div>

    {#if cmp.faqs?.length}
      <div class="mt-10">
        <h2 class="text-2xl font-bold text-heading">Common questions</h2>
        <div class="mt-4 grid gap-3">
          {#each cmp.faqs as faq}
            <div class="rounded-2xl border border-ink/10 bg-surface p-5">
              <p class="flex items-start gap-2 font-semibold text-ink">
                <Check size={16} class="mt-1 shrink-0 text-forest" />{faq.q}
              </p>
              <p class="mt-1.5 pl-6 text-sm leading-6 text-ink/65">{faq.a}</p>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    {#if others.length}
      <div class="mt-12">
        <h2 class="text-xl font-bold text-heading">More comparisons</h2>
        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          {#each others as o (o.slug)}
            <a class="group flex items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-surface p-5 transition hover:border-goldfinch-gold/40" href={`/compare/${o.slug}`}>
              <span>
                <span class="block text-xs font-bold uppercase tracking-[0.14em] text-clay">{o.eyebrow}</span>
                <span class="mt-0.5 block font-extrabold text-heading">{o.title}</span>
              </span>
              <ArrowRight size={18} class="shrink-0 text-ink/30 transition group-hover:text-forest" />
            </a>
          {/each}
        </div>
      </div>
    {/if}
  </section>
{:else}
  <section class="container-shell py-20">
    <ErrorState message={loadFailed ? "We couldn't load this comparison right now. Please refresh in a moment." : 'Comparison not found.'} />
    <a class="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-forest hover:text-heading" href="/compare">See all comparisons <ArrowRight size={16} /></a>
  </section>
{/if}
