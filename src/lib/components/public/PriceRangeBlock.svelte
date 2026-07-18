<script lang="ts">
  import { ArrowRight, ShieldCheck } from '@lucide/svelte';

  // Honest "typical cost" band (spec §4.1 F / §6). Rows can be overridden from the
  // CMS (cost_ranges section → extra_data.ranges); otherwise sensible defaults show.
  export let title = '';
  export let subtitle = '';
  export let ranges: Array<{ label: string; from: string; note?: string; image?: string }> = [];

  const defaults = [
    { label: 'Safari', from: 'from $1,500', note: 'Guiding, park fees & lodges', image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801' },
    { label: 'Kilimanjaro', from: 'from $1,900', note: 'Guides, crew, meals & route support', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b' },
    { label: 'Zanzibar beach', from: 'from $850', note: 'Beach stays & transfers', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e' },
    { label: 'Tanzania + Kenya combined', from: 'from $3,200', note: 'Serengeti & Masai Mara in one trip', image: 'https://images.unsplash.com/photo-1516426122078-c23e76319801' }
  ];

  // Keyword → image fallback so CMS-provided rows still get a fitting backdrop.
  const FALLBACK_IMG = 'https://images.unsplash.com/photo-1516426122078-c23e76319801';
  const imageFor = (row: { label: string; image?: string }) => {
    if (row.image) return row.image;
    const s = row.label.toLowerCase();
    if (/kilimanjaro|trek|climb|mountain/.test(s)) return 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b';
    if (/beach|zanzibar|coast|island/.test(s)) return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e';
    if (/migration|safari|wildlife|game/.test(s)) return 'https://images.unsplash.com/photo-1516426122078-c23e76319801';
    return FALLBACK_IMG;
  };

  $: rows = ranges.length ? ranges : defaults;
</script>

<div>
  {#if title}<h2 class="text-center text-3xl font-bold tracking-normal text-ink md:text-4xl">{title}</h2>{/if}
  {#if subtitle}<p class="mx-auto mt-3 max-w-2xl text-center text-base leading-7 text-ink/65">{subtitle}</p>{/if}

  <div class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    {#each rows as row}
      <div class="group relative flex min-h-[200px] flex-col overflow-hidden rounded-2xl border border-ink/10 bg-surface p-5 shadow-soft transition duration-300 hover:-translate-y-1 hover:border-goldfinch-gold/40 hover:shadow-[0_20px_44px_rgba(28,26,22,0.14)]">
        <!-- very faint photo texture -->
        <img
          class="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.08] transition duration-700 group-hover:scale-105 group-hover:opacity-[0.14]"
          src={imageFor(row)}
          alt=""
          aria-hidden="true"
          loading="lazy"
        />
        <div class="pointer-events-none absolute inset-0 bg-gradient-to-br from-surface/40 via-transparent to-transparent"></div>
        <div class="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-goldfinch-gold/0 via-goldfinch-gold/60 to-goldfinch-gold/0 opacity-0 transition group-hover:opacity-100"></div>

        <div class="relative flex flex-1 flex-col">
          <p class="text-sm font-bold uppercase tracking-[0.14em] text-clay">{row.label}</p>
          <p class="mt-2 text-2xl font-extrabold text-heading">{row.from}</p>
          {#if row.note}<p class="mt-1.5 text-sm leading-6 text-ink/70">{row.note}</p>{/if}
          <p class="mt-auto pt-3 text-xs font-medium text-ink/65">per person</p>
        </div>
      </div>
    {/each}
  </div>

  <div class="mt-7 flex flex-col items-center justify-center gap-4 sm:flex-row sm:justify-between">
    <p class="inline-flex items-center gap-2 text-sm text-ink/70">
      <ShieldCheck size={18} class="shrink-0 text-forest" />
      Typical starting prices — your exact cost depends on season, lodges and group size. No hidden costs.
    </p>
    <a class="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-deep-green px-6 font-bold text-white transition hover:bg-forest" href="/plan-my-trip">
      Get your exact price <ArrowRight size={18} />
    </a>
  </div>
</div>
