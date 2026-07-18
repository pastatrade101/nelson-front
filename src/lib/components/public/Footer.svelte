<script lang="ts">
  import { Mail, Phone } from '@lucide/svelte';
  import { trackEvent } from '$lib/analytics';
  import { brand } from '$lib/brand';
  import { publicSettings, settingText } from '$lib/settings';

  const SOCIAL = [
    { key: 'facebook_url', label: 'Facebook' },
    { key: 'instagram_url', label: 'Instagram' },
    { key: 'youtube_url', label: 'YouTube' },
    { key: 'tiktok_url', label: 'TikTok' },
    { key: 'linkedin_url', label: 'LinkedIn' },
    { key: 'tripadvisor_url', label: 'TripAdvisor' }
  ];

  $: s = $publicSettings;
  $: siteName = settingText(s, 'site_name') || brand.name;
  $: tagline = settingText(s, 'tagline') || brand.tagline;
  $: statement = settingText(s, 'brand_statement') || brand.positioning;
  $: contactEmail = settingText(s, 'contact_email');
  $: contactPhone = settingText(s, 'contact_phone');
  $: socials = SOCIAL.filter((item) => settingText(s, item.key));

  // Legal links: use the admin-set URL when provided, else the on-site page.
  $: privacyUrl = settingText(s, 'privacy_policy_url') || '/privacy';
  $: termsUrl = settingText(s, 'terms_url') || '/terms';
  $: cancellationUrl = settingText(s, 'cancellation_policy_url') || '/cancellation-policy';

  const year = new Date().getFullYear();
</script>

<footer class="border-t border-ink/10 bg-deep-green text-white">
  <div class="container-shell grid gap-8 py-10 md:grid-cols-[1.2fr_1fr_1fr]">
    <div>
      <p class="text-lg font-bold">{siteName}</p>
      <p class="mt-3 max-w-sm text-sm leading-6 text-white/70">{tagline}. {statement}</p>

      {#if contactEmail || contactPhone}
        <div class="mt-4 grid gap-1.5 text-sm text-white/70">
          {#if contactEmail}
            <a class="inline-flex w-fit items-center gap-2 transition hover:text-white" href={`mailto:${contactEmail}`} on:click={() => trackEvent('email_click')}>
              <Mail size={15} class="text-white/50" />{contactEmail}
            </a>
          {/if}
          {#if contactPhone}
            <a class="inline-flex w-fit items-center gap-2 transition hover:text-white" href={`tel:${contactPhone}`} on:click={() => trackEvent('phone_click')}>
              <Phone size={15} class="text-white/50" />{contactPhone}
            </a>
          {/if}
        </div>
      {/if}

      {#if socials.length}
        <div class="mt-5 flex flex-wrap gap-2">
          {#each socials as social (social.key)}
            <a
              class="inline-flex items-center rounded-full bg-surface/10 px-3.5 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-goldfinch-gold hover:text-heading"
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

    <div>
      <p class="text-sm font-semibold">Safaris</p>
      <div class="mt-3 grid gap-2 text-sm text-white/70">
        <a class="w-fit transition hover:text-white" href="/tours">All Safaris</a>
        <a class="w-fit transition hover:text-white" href="/tours?category=great-migration">Great Migration</a>
        <a class="w-fit transition hover:text-white" href="/tours?category=family-safari">Family Safari</a>
        <a class="w-fit transition hover:text-white" href="/tours?category=honeymoon-safari">Honeymoon Safari</a>
        <a class="w-fit transition hover:text-white" href="/tours?category=photography-safari">Photography Safari</a>
        <a class="w-fit transition hover:text-white" href="/kilimanjaro">Kilimanjaro</a>
        <a class="w-fit transition hover:text-white" href="/destinations">Destinations</a>
        <a class="w-fit transition hover:text-white" href="/plan-my-trip">Tailor-Made</a>
      </div>
    </div>

    <div>
      <p class="text-sm font-semibold">Company</p>
      <div class="mt-3 grid gap-2 text-sm text-white/70">
        <a class="w-fit transition hover:text-white" href="/about">About</a>
        <a class="w-fit transition hover:text-white" href="/blog">Journal</a>
        <a class="w-fit transition hover:text-white" href="/experiences">Experiences</a>
        <a class="w-fit transition hover:text-white" href="/gallery">Gallery</a>
        <a class="w-fit transition hover:text-white" href="/safety">Health &amp; Safety</a>
        <a class="w-fit transition hover:text-white" href="/contact">Contact</a>
        <a class="w-fit transition hover:text-white" href="/admin">{brand.adminName}</a>
      </div>
    </div>
  </div>

  <div class="border-t border-white/10">
    <div class="container-shell flex flex-col gap-3 py-5 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between">
      <p>© {year} {settingText(s, 'company_name') || brand.companyName}. All rights reserved.</p>
      <nav class="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <a class="inline-flex min-h-[24px] items-center transition hover:text-white" href={privacyUrl}>Privacy Policy</a>
        <a class="inline-flex min-h-[24px] items-center transition hover:text-white" href={termsUrl}>Terms</a>
        <a class="inline-flex min-h-[24px] items-center transition hover:text-white" href={cancellationUrl}>Cancellation Policy</a>
        <a class="inline-flex min-h-[24px] items-center transition hover:text-white" href="/data-retention">Data Retention</a>
      </nav>
    </div>
  </div>
</footer>
