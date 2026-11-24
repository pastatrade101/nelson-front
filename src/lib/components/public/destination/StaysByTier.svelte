<script lang="ts">
  /**
   * The camps and lodges here, filtered by comfort level. Only the levels that
   * have stays are offered; the page opens on Luxury when there is one (the
   * level most asked about), else on the first.
   */
  import { thumbUrl } from '$lib/img';
  import { normalizeTier, TIER_KEYS, TIER_LABELS, type TierKey } from '$lib/tiers';
  import type { Lodge } from '$lib/types';

  export let lodges: Lodge[] = [];

  $: byTier = TIER_KEYS.map((tier) => ({ tier, items: lodges.filter((l) => normalizeTier(l.accommodation_level) === tier) })).filter((g) => g.items.length);
  let chosen: TierKey | '' = '';
  $: current = byTier.find((g) => g.tier === chosen) ?? byTier.find((g) => g.tier === 'luxury') ?? byTier[0];
  // Stays with no comfort level set are still listed when no level has any.
  $: shown = (current?.items ?? (byTier.length ? [] : lodges)).slice(0, 6);
  // "Ndutu, southern Serengeti ecosystem (…)" → "Ndutu, southern Serengeti ecosystem"
  const area = (l: Lodge) => String((l as { park_area?: string | null }).park_area ?? '').replace(/\s*\(.*\)\s*$/, '');
</script>

{#if byTier.length > 1}
  <div class="flex flex-wrap gap-2" role="group" aria-label="Comfort level">
    {#each byTier as group (group.tier)}
      <button
        type="button"
        aria-pressed={current?.tier === group.tier}
        class={`h-10 border px-3.5 text-[13px] font-medium transition ${current?.tier === group.tier ? 'border-deep-green bg-deep-green text-white' : 'border-ink/15 bg-white text-heading hover:border-ink/40'}`}
        on:click={() => (chosen = group.tier)}
      >{TIER_LABELS[group.tier]} <span class="opacity-60">({group.items.length})</span></button>
    {/each}
  </div>
{/if}

<ul class="mt-5 grid gap-x-4 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
  {#each shown as lodge (lodge.id)}
    {@const photo = thumbUrl(lodge, 'hero_image_url', 'image_url')}
    <li>
      <a class="group block" href={`/accommodation/${lodge.slug}`}>
        <div class="aspect-[4/3] overflow-hidden bg-linen">
          {#if photo}<img src={photo} alt={lodge.name} loading="lazy" class="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />{/if}
        </div>
        {#if area(lodge)}<p class="dest-label mt-3 line-clamp-1">{area(lodge)}</p>{/if}
        <h3 class="mt-1 font-serif text-[19px] font-normal leading-snug text-heading transition group-hover:text-forest">{lodge.name}</h3>
      </a>
    </li>
  {/each}
</ul>
