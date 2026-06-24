<script lang="ts">
  import { MessageCircle } from '@lucide/svelte';
  import { publicSettings, settingText } from '$lib/settings';
  import type { Specialist } from '$lib/data/specialists';

  export let specialist: Specialist;
  export let heading = 'Your trip specialist';

  $: waDigits = (settingText($publicSettings, 'whatsapp_number') || '+255 700 000 000').replace(/\D/g, '');
  $: waHref = `https://wa.me/${waDigits}?text=${encodeURIComponent(`Hi ${specialist.name}, I'd like help planning a trip.`)}`;
  $: initials =
    specialist.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || '?';
  $: firstName = specialist.name.split(' ')[0];
</script>

<div class="rounded-2xl border border-ink/10 bg-surface p-5 shadow-soft">
  {#if heading}<p class="text-[11px] font-bold uppercase tracking-[0.16em] text-clay">{heading}</p>{/if}
  <div class="mt-3 flex items-center gap-3">
    {#if specialist.photo}
      <img class="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-white shadow-sm" src={specialist.photo} alt={specialist.name} />
    {:else}
      <span class="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-forest/10 text-base font-bold text-forest">{initials}</span>
    {/if}
    <div class="min-w-0">
      <p class="font-bold text-ink">{specialist.name}</p>
      <p class="text-sm font-medium text-clay">{specialist.role}</p>
    </div>
  </div>
  {#if specialist.blurb}<p class="mt-3 text-sm leading-6 text-ink/65">{specialist.blurb}</p>{/if}
  <a
    class="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-sm font-bold text-white transition hover:brightness-105"
    href={waHref}
    target="_blank"
    rel="noopener noreferrer"
  >
    <MessageCircle size={16} /> Message {firstName}
  </a>
</div>
