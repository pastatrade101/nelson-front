<script lang="ts">
  import { ArrowRight, LayoutGrid, MessageCircle, Search, Star } from '@lucide/svelte';
  import { fly } from 'svelte/transition';
  import { goto } from '$app/navigation';

  // Lucide icons are functional components; `typeof ArrowRight` is their type.
  type IconC = typeof ArrowRight;
  type BrowseItem = { label: string; href: string; icon: IconC; subtitle?: string };
  type FeaturedItem = {
    label: string; href: string; image?: string; description?: string;
    badge?: string; tier?: string; duration?: string; price?: string;
  };
  type TrustItem = { icon: IconC; label: string };
  type MegaCta = { eyebrow: string; title: string; subtitle: string; buttonLabel: string; image?: string };

  // A luxury 3-column nav "mega menu": a curated browse list, rich editorial
  // cards, and a photo-backed concierge CTA. Every field is passed in from real
  // data by the navbar — this component never invents content.
  export let id: string;
  export let href: string; // "all / view all" destination for this section
  export let browseTitle: string;
  export let allLabel: string;
  export let browseItems: BrowseItem[] = [];
  export let featuredTitle: string;
  export let featuredItems: FeaturedItem[] = [];
  export let viewAllLabel: string;
  export let cta: MegaCta;
  export let trust: TrustItem[] = [];
  export let onCta: () => void = () => {};
  export let secondaryLabel = '';
  export let secondaryHref = '';
  export let searchPlaceholder = '';
  // True only for section pages that actually filter on ?search (tours, stays).
  export let pageSupportsSearch = false;

  // Compact rows when no item carries a subtitle (destinations / styles / stays);
  // richer icon-chip rows when subtitles are present (tours) — keeps tall lists short.
  $: dense = !browseItems.some((b) => b.subtitle);

  let query = '';
  $: q = query.trim().toLowerCase();
  $: filteredBrowse = q
    ? browseItems.filter((b) => b.label.toLowerCase().includes(q) || (b.subtitle ?? '').toLowerCase().includes(q))
    : browseItems;

  const runSearch = () => {
    const term = query.trim();
    if (!term) return void goto(href);
    // Pages that filter on ?search get the term; the rest (destinations, styles)
    // jump straight to the best match so Enter is never a silent no-op.
    if (pageSupportsSearch) return void goto(`${href}?search=${encodeURIComponent(term)}`);
    const first = filteredBrowse[0] ?? featuredItems.find(Boolean);
    void goto(first ? first.href : href);
  };

  // Centre the wide menu under the navbar and keep it clear of both viewport
  // edges, wherever the (right-aligned) trigger sits in the nav.
  function positionMega(node: HTMLElement) {
    const reposition = () => {
      const host = (node.offsetParent as HTMLElement | null) ?? node.parentElement;
      const hostLeft = host ? host.getBoundingClientRect().left : 0;
      const vw = document.documentElement.clientWidth;
      const w = node.offsetWidth;
      const viewportLeft = Math.max(16, Math.min((vw - w) / 2, vw - w - 16));
      node.style.left = `${Math.round(viewportLeft - hostLeft)}px`;
    };
    reposition();
    window.addEventListener('resize', reposition);
    return { destroy() { window.removeEventListener('resize', reposition); } };
  }
</script>

<div
  {id}
  use:positionMega
  class="mega absolute top-full z-50 grid max-h-[calc(100dvh-8rem)] w-[min(1260px,calc(100vw-32px))] grid-cols-[336px_minmax(0,1fr)_312px] grid-rows-[auto_minmax(0,1fr)] overflow-y-auto rounded-none border border-ink/[0.08] bg-[#FAF8F4] shadow-[0_36px_90px_-24px_rgba(28,26,22,0.35)]"
  aria-label={browseTitle}
  transition:fly={{ y: 10, duration: 230, opacity: 0 }}
>
  <!-- Search — spans browse + featured; the concierge CTA runs full height beside it -->
  {#if searchPlaceholder}
    <div class="mm-col col-start-1 col-end-3 row-start-1 border-b border-ink/[0.06] px-6 pb-3.5 pt-5" style="--d:20ms">
      <div class="flex items-center gap-2.5 rounded-none border border-ink/10 bg-white px-4 py-2.5 shadow-[0_1px_0_rgba(28,26,22,0.03)] transition focus-within:border-goldfinch-gold/60 focus-within:shadow-[0_0_0_4px_rgba(197,162,101,0.12)]">
        <Search size={17} strokeWidth={2.2} class="shrink-0 text-clay/60" />
        <input
          class="min-w-0 flex-1 bg-transparent text-[13.5px] font-medium text-ink outline-none placeholder:text-ink/40"
          type="search"
          bind:value={query}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          on:keydown={(e) => e.key === 'Enter' && runSearch()}
        />
        {#if query}
          <button type="button" class="shrink-0 text-[11px] font-bold uppercase tracking-[0.1em] text-forest transition hover:text-goldfinch-gold" on:click={runSearch}>Search</button>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Column 1 · curated browse list with editorial subtitles -->
  <div class="mm-col col-start-1 row-start-2 border-r border-ink/[0.06] px-6 py-6" style="--d:60ms">
    <p class="px-1 pb-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-ink/40">{browseTitle}</p>
    <a class="group/all flex items-center justify-between gap-3 rounded-none bg-[#EFE7D8] px-3.5 py-3 text-sm font-bold text-forest ring-1 ring-goldfinch-gold/20 transition duration-300 hover:bg-[#EAE0CD]" {href}>
      <span class="inline-flex items-center gap-3"><LayoutGrid size={17} strokeWidth={2.2} /> {allLabel}</span>
      <ArrowRight size={15} strokeWidth={2.6} class="text-goldfinch-gold transition-transform duration-300 group-hover/all:translate-x-1" />
    </a>
    {#if filteredBrowse.length}
      <div class="mt-2 grid grid-cols-1 divide-y divide-ink/[0.06]">
        {#each filteredBrowse as it (it.href)}
          <a
            class="group/li relative flex min-w-0 items-center justify-between gap-3 rounded-none {dense ? 'px-2.5 py-2' : 'px-3 py-2.5'} transition duration-300 ease-out hover:-translate-y-px hover:bg-white hover:shadow-[0_10px_26px_-16px_rgba(28,26,22,0.45)]"
            href={it.href}
           
          >
            <span class="flex min-w-0 items-center {dense ? 'gap-3' : 'gap-3.5'}">
              {#if dense}
                <svelte:component this={it.icon} size={17} strokeWidth={1.9} class="shrink-0 text-clay/70 transition duration-300 group-hover/li:text-goldfinch-gold" />
              {:else}
                <span class="grid h-9 w-9 shrink-0 place-items-center rounded-none bg-ink/[0.04] text-clay/70 transition duration-300 group-hover/li:bg-goldfinch-gold/12 group-hover/li:text-goldfinch-gold">
                  <svelte:component this={it.icon} size={17} strokeWidth={1.9} />
                </span>
              {/if}
              <span class="min-w-0">
                <span class="block truncate text-[13.5px] font-semibold text-ink/85 transition group-hover/li:text-forest">{it.label}</span>
                {#if it.subtitle}<span class="mt-0.5 block truncate text-[11.5px] leading-tight text-ink/45">{it.subtitle}</span>{/if}
              </span>
            </span>
            <ArrowRight size={14} strokeWidth={2.4} class="shrink-0 text-ink/20 transition-all duration-300 group-hover/li:translate-x-0.5 group-hover/li:text-goldfinch-gold" />
          </a>
        {/each}
      </div>
    {:else}
      <p class="px-3 py-6 text-center text-[13px] text-ink/45">No matches for “{query}”.</p>
    {/if}
  </div>

  <!-- Column 2 · rich editorial cards from real records -->
  <div class="mm-col col-start-2 row-start-2 flex flex-col px-6 py-6" style="--d:120ms">
    <p class="px-1 pb-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-ink/40">{featuredTitle}</p>
    <div class="grid flex-1 content-start gap-1">
      {#each featuredItems as exp (exp.href)}
        <a class="group/exp flex items-start gap-4 rounded-none p-2.5 transition duration-300 ease-out hover:-translate-y-px hover:bg-white hover:shadow-[0_14px_34px_-18px_rgba(28,26,22,0.5)]" href={exp.href}>
          <span class="relative h-[76px] w-[96px] shrink-0 overflow-hidden rounded-none bg-deep-green">
            {#if exp.image}<img class="absolute inset-0 h-full w-full object-cover transition duration-[900ms] ease-out group-hover/exp:scale-[1.08]" src={exp.image} alt={exp.label} loading="lazy" />{/if}
          </span>
          <span class="min-w-0 flex-1 pt-0.5">
            <span class="line-clamp-1 text-[14.5px] font-bold leading-snug text-heading transition group-hover/exp:text-forest">{exp.label}</span>
            {#if exp.tier || exp.duration || exp.price}
              <span class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] font-semibold">
                {#if exp.tier}<span class="text-clay">{exp.tier}</span>{/if}
                {#if exp.tier && exp.duration}<span class="text-ink/20">·</span>{/if}
                {#if exp.duration}<span class="text-ink/55">{exp.duration}</span>{/if}
                {#if exp.price}<span class="ml-auto whitespace-nowrap text-forest">{exp.price}</span>{/if}
              </span>
            {/if}
            {#if exp.description}<span class="mt-1 line-clamp-2 text-[12px] leading-[1.5] text-ink/55">{exp.description}</span>{/if}
          </span>
        </a>
      {/each}
    </div>
    <a class="mt-3 inline-flex items-center gap-1.5 px-1 text-[13px] font-bold text-forest transition hover:text-goldfinch-gold" {href}>
      {viewAllLabel} <ArrowRight size={14} strokeWidth={2.6} />
    </a>
  </div>

  <!-- Column 3 · concierge CTA over a real cinematic photo, content anchored low -->
  <div class="mm-col relative col-start-3 row-start-1 row-span-2 flex flex-col justify-end overflow-hidden bg-deep-green p-6 text-white" style="--d:180ms">
    {#if cta.image}
      <img class="absolute inset-0 h-full w-full object-cover" src={cta.image} alt="" loading="lazy" aria-hidden="true" />
    {/if}
    <div class="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,18,15,0.1)_0%,rgba(20,18,15,0.24)_38%,rgba(20,18,15,0.78)_74%,rgba(20,18,15,0.96)_100%)]"></div>
    <div class="relative">
      <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-goldfinch-gold">{cta.eyebrow}</p>
      <p class="mt-2.5 font-serif text-[28px] font-light leading-[1.1]">{cta.title}</p>
      <p class="mt-3 text-[13px] leading-6 text-white/72">{cta.subtitle}</p>
      <div class="mt-5 flex flex-col gap-2.5">
        <button type="button" class="inline-flex items-center justify-center gap-2 bg-goldfinch-gold px-5 py-3 text-[12px] font-bold uppercase tracking-[0.14em] text-deep-green transition duration-300 hover:bg-savanna" on:click={onCta}>
          {cta.buttonLabel} <ArrowRight size={15} strokeWidth={2.6} />
        </button>
        {#if secondaryLabel && secondaryHref}
          <a class="inline-flex items-center justify-center gap-2 border border-white/25 px-5 py-2.5 text-[12px] font-bold uppercase tracking-[0.12em] text-white transition duration-300 hover:border-goldfinch-gold hover:text-goldfinch-gold" href={secondaryHref} target="_blank" rel="noopener noreferrer">
            <MessageCircle size={15} strokeWidth={2.3} /> {secondaryLabel}
          </a>
        {/if}
      </div>
    </div>
    {#if trust.length}
      <div class="relative mt-6 border-t border-white/12 pt-4">
        <p class="flex items-center gap-1.5 text-[11px] font-semibold text-white/70">
          <span class="inline-flex text-goldfinch-gold" aria-hidden="true">
            {#each Array(5) as _}<Star size={12} fill="currentColor" strokeWidth={0} />{/each}
          </span>
          Loved on TripAdvisor
        </p>
        <div class="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
          {#each trust as t}
            <span class="inline-flex items-center gap-2 text-[11.5px] font-semibold text-white/80">
              <svelte:component this={t.icon} size={15} strokeWidth={2.2} class="shrink-0 text-goldfinch-gold" /> {t.label}
            </span>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  /* Staggered entrance: each region rises + fades in just after the panel flies
     in, giving the menu a layered, deliberate reveal. Delay is per-region (--d).
     Disabled automatically under prefers-reduced-motion (see app.css). */
  @keyframes mega-col-in {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: none; }
  }
  .mm-col {
    animation: mega-col-in 0.46s cubic-bezier(0.22, 1, 0.36, 1) both;
    animation-delay: var(--d, 0ms);
  }
</style>
