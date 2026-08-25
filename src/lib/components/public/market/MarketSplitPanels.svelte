<script lang="ts">
  import { origUrl, thumbUrl } from '$lib/img';
  import ResponsiveImage from '../ResponsiveImage.svelte';

  // Full-bleed "two worlds" split (e.g. safari vs. island). Built for two
  // panels, degrades cleanly to one.
  // REAL DATA ONLY: titles, list items and images are admin-entered. A panel
  // with no image keeps its dark ground rather than borrowing a stock photo,
  // and the section hides entirely when there are no panels.
  export let panels: { title?: string; items?: string[]; image_url?: string }[] = [];

  const cleanItems = (items: string[] | undefined): string[] =>
    (items ?? []).filter((item) => typeof item === 'string' && item.trim());

  $: shown = (panels ?? [])
    .filter((panel) => panel && (panel.title || panel.image_url || cleanItems(panel.items).length))
    .map((panel) => ({ ...panel, list: cleanItems(panel.items) }));

  // Full literal class string so Tailwind's scanner keeps it.
  $: gridClass = shown.length >= 2 ? 'md:grid-cols-2' : '';
</script>

{#if shown.length}
  <section class={`grid ${gridClass}`}>
    {#each shown as panel}
      <article
        class="group relative isolate flex min-h-[420px] flex-col justify-end overflow-hidden bg-deep-green p-8 md:min-h-[560px] md:p-12"
      >
        {#if panel.image_url}
          <ResponsiveImage
            src={origUrl(panel, 'image_url')}
            fallbackSrc={thumbUrl(panel, 'image_url')}
            width={1200}
            alt={panel.title || ''}
            imgClass="absolute inset-0 -z-10 h-full w-full object-cover transition duration-700 group-hover:scale-105"
            sizes="(min-width:768px) 50vw, 100vw"
          />
        {/if}
        <span
          class="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(28,26,22,0.20)_0%,rgba(28,26,22,0.55)_55%,rgba(28,26,22,0.88)_100%)]"
          aria-hidden="true"
        ></span>

        {#if panel.title}
          <h3 class="font-serif text-[30px] font-light leading-[1.12] text-white md:text-[40px]">{panel.title}</h3>
        {/if}
        {#if panel.list.length}
          <ul class="mt-6 grid gap-3">
            {#each panel.list as item}
              <li class="flex gap-3 text-[14.5px] leading-7 text-white/80">
                <span class="mt-2.5 h-1.5 w-1.5 shrink-0 bg-goldfinch-gold" aria-hidden="true"></span>
                {item}
              </li>
            {/each}
          </ul>
        {/if}
      </article>
    {/each}
  </section>
{/if}
