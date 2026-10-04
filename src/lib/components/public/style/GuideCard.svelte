<script lang="ts">
  import ResponsiveImage from '$lib/components/public/ResponsiveImage.svelte';
  import type { PersonCard } from './styleContent';

  export let person: PersonCard;
  export let showPortrait = true;

  let failedImage = '';
  $: initials = person.name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]?.toUpperCase()).join('');
  $: hasImage = Boolean(person.image && failedImage !== person.image);
</script>

<article class="guide-card flex h-full min-w-0 flex-col overflow-hidden rounded-none border border-ink/10 bg-surface">
  {#if showPortrait}
    <div class="relative aspect-[4/5] w-full shrink-0 overflow-hidden rounded-none bg-linen">
      {#if hasImage}
        <ResponsiveImage
          src={person.image}
          alt={person.imageAlt}
          sizes="(min-width:1280px) 410px, (min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
          width={960}
          imgClass={`absolute inset-0 h-full w-full rounded-none ${person.imageFit === 'cover' ? 'object-cover' : 'object-contain'}`}
          imgStyle={`object-position: ${person.imagePosition}`}
          on:error={() => (failedImage = person.image)}
        />
      {:else}
        <div class="flex h-full flex-col items-center justify-center gap-5 bg-deep-green/[0.04]" aria-hidden="true">
          <span class="font-serif text-[72px] font-light leading-none text-deep-green/45">{initials}</span>
          <span class="h-px w-10 bg-goldfinch-gold"></span>
        </div>
      {/if}
    </div>
  {/if}

  <div class="flex flex-1 flex-col px-6 py-7 sm:px-7 sm:py-8">
    <div class="flex items-start gap-4">
      {#if !showPortrait}
        <span class="grid h-12 w-12 shrink-0 place-items-center border border-goldfinch-gold/35 bg-linen/60 font-serif text-xl text-clay" aria-hidden="true">{initials}</span>
      {/if}
      <div class="min-w-0">
        {#if person.role}<p class="text-[10px] font-semibold uppercase leading-[1.7] tracking-[0.16em] text-clay">{person.role}</p>{/if}
        <h3 class="mt-2 break-words font-serif text-[28px] font-light leading-[1.15] text-heading">{person.name}</h3>
      </div>
    </div>
    {#if person.paragraphs.length}
      <div class="mt-6 space-y-3 border-t border-ink/10 pt-5 text-[14px] leading-[1.85] text-ink/75 sm:text-[15px]">
        {#each person.paragraphs as paragraph, i (i)}
          <p class="break-words">{paragraph}</p>
        {/each}
      </div>
    {/if}
  </div>
</article>
