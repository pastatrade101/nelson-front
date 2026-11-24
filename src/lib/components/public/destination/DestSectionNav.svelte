<script lang="ts">
  /**
   * The bar that stays under the site header on a destination page: links to
   * the page's sections, the one in view underlined, and "Plan my safari"
   * on the right (wide screens; phones have the bottom bar instead).
   */
  import { onMount } from 'svelte';

  export let links: { label: string; href: string }[] = [];
  export let planHref = '#plan';
  export let label = 'On this page';

  let active = links[0]?.href ?? '';
  let strip: HTMLUListElement;

  // On a phone the strip scrolls sideways: keep the current section's link in it.
  $: if (strip && active) {
    const link = strip.querySelector<HTMLElement>(`a[href="${active}"]`);
    if (link && (link.offsetLeft < strip.scrollLeft || link.offsetLeft + link.offsetWidth > strip.scrollLeft + strip.clientWidth)) {
      strip.scrollTo({ left: Math.max(0, link.offsetLeft - 24), behavior: 'smooth' });
    }
  }

  onMount(() => {
    // The section in view: the last one whose top has passed a third of the
    // way down the window. Read on scroll (once a frame), so it is always the
    // reading position and never the order sections happened to cross a line.
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.33;
      let current = '';
      for (const link of links) {
        const el = document.querySelector(link.href);
        if (el && el.getBoundingClientRect().top <= line) current = link.href;
      }
      active = current || links[0]?.href || '';
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  });
</script>

<nav class="sticky top-[var(--nav-h)] z-20 border-b border-ink/10 bg-white" aria-label={label}>
  <div class="container-shell flex items-center gap-6">
    <ul bind:this={strip} class="relative -mb-px flex min-w-0 flex-1 gap-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {#each links as link (link.href)}
        <li class="shrink-0">
          <a
            class={`inline-flex min-h-[52px] items-center whitespace-nowrap border-b-2 text-[14px] transition ${active === link.href ? 'border-deep-green font-semibold text-heading' : 'border-transparent text-ink/70 hover:text-heading'}`}
            aria-current={active === link.href ? 'location' : undefined}
            href={link.href}
            on:click={() => (active = link.href)}
          >{link.label}</a>
        </li>
      {/each}
    </ul>
    <a class="hidden h-9 shrink-0 items-center bg-deep-green px-4 text-[13px] font-semibold text-white transition hover:bg-forest lg:inline-flex" href={planHref}>Plan my safari</a>
  </div>
</nav>
