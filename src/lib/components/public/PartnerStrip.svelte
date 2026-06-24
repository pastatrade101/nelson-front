<script lang="ts">
  type Logo = { image_url: string; name?: string; url?: string };

  export let logos: Logo[] = [];
  export let title = '';

  $: valid = logos.filter((logo) => logo && typeof logo.image_url === 'string' && logo.image_url.trim());
  // Duplicate the set so the horizontal scroll loops seamlessly.
  $: loop = valid.length ? [...valid, ...valid] : [];
</script>

{#if valid.length}
  <section class="border-t border-ink/[0.06] bg-surface py-12 md:py-16">
    <div class="container-shell">
      {#if title}
        <p class="text-center text-xs font-bold uppercase tracking-[0.2em] text-ink/40 md:text-[13px]">{title}</p>
      {/if}

      <div class={`marquee ${title ? 'mt-9' : ''}`}>
        <div class="marquee-track">
          {#each loop as logo, index (index)}
            <div class="marquee-item" aria-hidden={index >= valid.length ? 'true' : undefined}>
              {#if logo.url}
                <a class="flex" href={logo.url} target="_blank" rel="noopener noreferrer" title={logo.name}>
                  <img class="marquee-logo" src={logo.image_url} alt={logo.name || 'Partner logo'} loading="lazy" />
                </a>
              {:else}
                <img class="marquee-logo" src={logo.image_url} alt={logo.name || 'Partner logo'} loading="lazy" />
              {/if}
            </div>
          {/each}
        </div>
      </div>
    </div>
  </section>
{/if}

<style>
  .marquee {
    overflow: hidden;
    -webkit-mask-image: linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent);
    mask-image: linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent);
  }

  .marquee-track {
    display: flex;
    width: max-content;
    align-items: center;
    gap: 56px;
    animation: marquee-scroll 34s linear infinite;
  }

  .marquee:hover .marquee-track {
    animation-play-state: paused;
  }

  .marquee-item {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .marquee-logo {
    height: 38px;
    width: auto;
    max-width: 160px;
    object-fit: contain;
    filter: grayscale(1);
    opacity: 0.55;
    transition:
      filter 0.25s ease,
      opacity 0.25s ease,
      transform 0.25s ease;
  }

  .marquee-item:hover .marquee-logo {
    filter: grayscale(0);
    opacity: 1;
    transform: scale(1.04);
  }

  @keyframes marquee-scroll {
    from {
      transform: translateX(0);
    }
    to {
      transform: translateX(-50%);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .marquee-track {
      animation: none;
    }
  }
</style>
