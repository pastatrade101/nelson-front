<script lang="ts">
  import { ArrowRight, BadgeCheck, Clock, Globe, Mail, MapPin, MessageCircle, Phone } from '@lucide/svelte';
  import { trackEvent } from '$lib/analytics';
  import { brand } from '$lib/brand';
  import { publicSettings, settingText } from '$lib/settings';

  // Same social keys the footer uses — shown only when an admin has set the URL.
  const SOCIAL = [
    { key: 'instagram_url', label: 'Instagram' },
    { key: 'facebook_url', label: 'Facebook' },
    { key: 'youtube_url', label: 'YouTube' },
    { key: 'tiktok_url', label: 'TikTok' },
    { key: 'linkedin_url', label: 'LinkedIn' },
    { key: 'tripadvisor_url', label: 'TripAdvisor' }
  ];

  // Contact channels from public settings, with safe fallbacks that match the
  // navbar so the whole site is consistent even before settings load.
  $: s = $publicSettings;
  $: waNumber = settingText(s, 'whatsapp_number') || '+255 700 000 000';
  $: waMessage =
    settingText(s, 'whatsapp_default_message') ||
    'Hello Emnel Adventures, I would like help planning a private Tanzania safari.';
  $: waDigits = waNumber.replace(/[^0-9]/g, '');
  $: waHref = `https://wa.me/${waDigits}?text=${encodeURIComponent(waMessage)}`;
  $: waButtonText = settingText(s, 'whatsapp_button_text') || brand.whatsappCta;

  $: contactEmail = settingText(s, 'contact_email') || 'hello@emneladventures.com';
  $: contactPhone = settingText(s, 'contact_phone') || waNumber;
  $: telHref = `tel:${contactPhone.replace(/[^0-9+]/g, '')}`;
  // Honest location: only ever "Arusha, Tanzania" unless an admin sets a fuller address.
  $: officeAddress = settingText(s, 'office_address') || 'Arusha, Tanzania';

  $: socials = SOCIAL.filter((item) => settingText(s, item.key));
</script>

<div class="grid gap-4">
  <!-- Primary channel: WhatsApp -->
  <a
    href={waHref}
    target="_blank"
    rel="noopener noreferrer"
    on:click={() => trackEvent('whatsapp_click')}
    class="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-[#25D366]/35 bg-[#25D366]/[0.07] p-5 shadow-soft transition hover:border-[#25D366]/60 hover:bg-[#25D366]/[0.12]"
    aria-label={`${waButtonText} ${waNumber}`}
  >
    <span class="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#25D366] text-white shadow-[0_10px_26px_rgba(37,211,102,0.38)] ring-8 ring-[#25D366]/10">
      <MessageCircle size={26} strokeWidth={2.4} />
    </span>
    <span class="min-w-0 flex-1">
      <span class="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0f7a41]">Prefer to chat? · Fastest reply</span>
      <span class="mt-1 block text-lg font-bold leading-tight text-heading">{waButtonText}</span>
      <span class="block truncate text-sm text-ink/60">{waNumber} — talk to a real safari specialist</span>
    </span>
    <ArrowRight size={20} strokeWidth={2.6} class="shrink-0 text-[#25D366] transition group-hover:translate-x-0.5" />
  </a>

  <!-- Email + Phone -->
  <div class="grid gap-4 sm:grid-cols-2">
    <a
      href={`mailto:${contactEmail}`}
      on:click={() => trackEvent('email_click')}
      class="group flex items-start gap-3 rounded-xl border border-ink/10 bg-surface p-4 shadow-soft transition hover:border-forest/30 hover:shadow-md"
    >
      <span class="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-forest/10 text-forest transition group-hover:bg-forest group-hover:text-white">
        <Mail size={18} strokeWidth={2.2} />
      </span>
      <span class="min-w-0">
        <span class="text-[11px] font-bold uppercase tracking-[0.12em] text-clay">Email us</span>
        <span class="mt-0.5 block truncate text-sm font-semibold text-heading">{contactEmail}</span>
      </span>
    </a>

    <a
      href={telHref}
      on:click={() => trackEvent('phone_click')}
      class="group flex items-start gap-3 rounded-xl border border-ink/10 bg-surface p-4 shadow-soft transition hover:border-forest/30 hover:shadow-md"
    >
      <span class="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-forest/10 text-forest transition group-hover:bg-forest group-hover:text-white">
        <Phone size={18} strokeWidth={2.2} />
      </span>
      <span class="min-w-0">
        <span class="text-[11px] font-bold uppercase tracking-[0.12em] text-clay">Call us</span>
        <span class="mt-0.5 block truncate text-sm font-semibold text-heading">{contactPhone}</span>
      </span>
    </a>
  </div>

  <!-- Office + Response promise -->
  <div class="grid gap-4 sm:grid-cols-2">
    <div class="flex items-start gap-3 rounded-xl border border-ink/10 bg-surface p-4 shadow-soft">
      <span class="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-goldfinch-gold/15 text-clay">
        <MapPin size={18} strokeWidth={2.2} />
      </span>
      <span class="min-w-0">
        <span class="text-[11px] font-bold uppercase tracking-[0.12em] text-clay">Where we are</span>
        <span class="mt-0.5 block text-sm font-semibold text-heading">{officeAddress}</span>
        <span class="block text-xs text-ink/55">At the foot of Mount Meru — by appointment</span>
      </span>
    </div>

    <div class="flex items-start gap-3 rounded-xl border border-ink/10 bg-surface p-4 shadow-soft">
      <span class="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-goldfinch-gold/15 text-clay">
        <Clock size={18} strokeWidth={2.2} />
      </span>
      <span class="min-w-0">
        <span class="text-[11px] font-bold uppercase tracking-[0.12em] text-clay">Response time</span>
        <span class="mt-0.5 block text-sm font-semibold text-heading">Within 24 hours — often sooner</span>
        <span class="inline-flex items-center gap-1 text-xs text-ink/55"><Globe size={12} /> Arusha is on EAT (GMT+3)</span>
      </span>
    </div>
  </div>

  <!-- Reassurance -->
  <div class="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-ink/[0.07] bg-sand/40 px-4 py-3">
    {#each ['A real person, not an auto-reply', 'Local Arusha experts', 'No obligation to book'] as point}
      <span class="inline-flex items-center gap-1.5 text-xs font-semibold text-ink/70">
        <BadgeCheck size={15} class="text-forest" strokeWidth={2.4} />
        {point}
      </span>
    {/each}
  </div>

  <!-- Socials (only when configured) -->
  {#if socials.length}
    <div class="flex flex-wrap items-center gap-2 pt-1">
      <span class="text-xs font-semibold text-ink/50">Follow along:</span>
      {#each socials as social (social.key)}
        <a
          class="inline-flex items-center rounded-full border border-ink/10 bg-surface px-3.5 py-1.5 text-xs font-semibold text-ink/70 transition hover:border-forest/30 hover:text-forest"
          href={settingText(s, social.key)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={social.label}
        >
          {social.label}
        </a>
      {/each}
    </div>
  {/if}
</div>
