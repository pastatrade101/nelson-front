<script lang="ts">
  /**
   * "Your way": one section per kind of traveller (families, couples, luxury,
   * photographers, a first safari), each with a photograph, a few
   * paragraphs, three planning facts and where to go next. Photographs
   * alternate sides and keep a landscape frame (the library's photographs
   * are landscape, and a tall crop cut people out of them); beside a long
   * text the photograph stays in view. A section without one runs full width.
   */
  import { ArrowRight } from '@lucide/svelte';
  import { imgUrl } from '$lib/img';
  import type { DestinationWay } from '$lib/types';

  export let ways: DestinationWay[] = [];
  export let planHref = '#plan';

  const paragraphs = (text = '') => text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const facts = (way: DestinationWay) =>
    [
      ['Nights', way.nights],
      ['Best area', way.best_area],
      [way.extra_label || 'Pair with', way.extra_value]
    ].filter((f): f is [string, string] => Boolean(f[1]?.trim()));
</script>

<div class="grid gap-14">
  {#each ways as way, i (i)}
    {@const list = facts(way)}
    <article class={way.image_url ? 'grid items-start gap-6 sm:grid-cols-2 sm:gap-7' : ''}>
      {#if way.image_url}
        <div class={`aspect-[4/3] overflow-hidden bg-linen sm:sticky sm:top-[calc(var(--nav-h)+76px)] ${i % 2 ? 'sm:order-2' : ''}`}>
          <img src={imgUrl(way.image_url, 900)} alt={way.image_alt || way.title || ''} loading="lazy" class="h-full w-full object-cover" />
        </div>
      {/if}
      <div>
        {#if way.label}<p class="dest-label">{way.label}</p>{/if}
        {#if way.title}<h3 class="mt-2 font-serif text-[26px] font-normal leading-tight text-heading">{way.title}</h3>{/if}
        {#each paragraphs(way.body) as p}
          <p class="mt-3 text-[15px] leading-[1.7] text-ink/75">{p}</p>
        {/each}
        {#if list.length}
          <dl class="mt-5 grid grid-cols-2 border border-ink/10 bg-white text-[13px]">
            {#each list as [label, value], f (label)}
              <div class={`p-3 ${f === 2 ? 'col-span-2 border-t border-ink/10' : ''} ${f === 1 ? 'border-l border-ink/10' : ''}`}>
                <dt class="dest-label">{label}</dt>
                <dd class="mt-1 leading-[1.5] text-heading">{value}</dd>
              </div>
            {/each}
          </dl>
        {/if}
        <p class="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[14px] font-semibold">
          {#if way.link_href && way.link_label}
            <a class="group inline-flex items-center gap-1 text-forest transition hover:text-heading" href={way.link_href}>{way.link_label} <ArrowRight size={15} class="transition group-hover:translate-x-0.5" /></a>
          {/if}
          <a class="text-heading underline decoration-ink/25 underline-offset-4 transition hover:decoration-ink" href={planHref}>Plan this with us</a>
        </p>
      </div>
    </article>
  {/each}
</div>
