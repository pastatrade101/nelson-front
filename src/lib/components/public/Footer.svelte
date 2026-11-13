<script lang="ts">
  /**
   * Country hubs to link, and whether the Safari Essentials hub has anything in
   * it. Both come from the root layout and are data-derived, so a new country or
   * the first published guide appears here without a code change — and neither
   * links to an empty page.
   */
  export let countries: string[] = [];
  export let essentialsLive = false;
  /** Whether the /safaris markets hub has anything published in it. */
  export let marketsLive = false;

  // The hub path, past any redirect (Tanzania's lives at its destination guide).
  const countryHref = (country: string) => canonicalHref(`/${country.toLowerCase().replace(/\s+/g, '-')}-safaris`);

  import { ArrowRight, ArrowUpRight, Clock, Mail, MapPin, MessageCircle, Phone } from '@lucide/svelte';
  import { brand } from '$lib/brand';
  import { canonicalHref } from '$lib/redirects';
  import { branding } from '$lib/branding';
  import { cdnUrl } from '$lib/img';
  import { publicSettings, settingText } from '$lib/settings';
  import SocialIcon from './SocialIcon.svelte';
  import WhatsAppCta from './WhatsAppCta.svelte';

  type FooterLink = { href: string; label: string; title?: string; external?: boolean };

  const SOCIAL = [
    { key: 'facebook_url', label: 'Facebook', name: 'facebook' },
    { key: 'instagram_url', label: 'Instagram', name: 'instagram' },
    { key: 'youtube_url', label: 'YouTube', name: 'youtube' },
    { key: 'tiktok_url', label: 'TikTok', name: 'tiktok' },
    { key: 'linkedin_url', label: 'LinkedIn', name: 'linkedin' },
    { key: 'tripadvisor_url', label: 'Tripadvisor', name: 'tripadvisor' }
  ];

  $: s = $publicSettings;
  $: siteName = settingText(s, 'site_name') || brand.name;
  $: tagline = settingText(s, 'tagline') || brand.tagline;
  $: statement = settingText(s, 'brand_statement') || brand.positioning;
  $: logoSrc = cdnUrl($branding.logo_url) || '/emnel.avif';
  $: socials = SOCIAL.filter((item) => settingText(s, item.key));

  // The contact desk: only what the team has filled in under Admin › Settings.
  $: contactEmail = settingText(s, 'contact_email');
  $: contactPhone = settingText(s, 'contact_phone');
  $: waNumber = settingText(s, 'whatsapp_number');
  $: waMessage = settingText(s, 'whatsapp_default_message') || 'Hello Emnel, I would like help planning a Tanzania safari.';
  $: waLabel = settingText(s, 'whatsapp_button_text') || brand.whatsappCta;
  // One number for calls and chat is listed once; a separate chat line gets its own row.
  $: waOwnRow = Boolean(waNumber) && waNumber.replace(/\D/g, '') !== contactPhone.replace(/\D/g, '');
  $: office = [settingText(s, 'office_address'), settingText(s, 'city'), settingText(s, 'country')].filter(Boolean).join(', ');
  $: mapsUrl = settingText(s, 'google_maps_url');
  $: hours = settingText(s, 'business_hours');
  $: responseNote = settingText(s, 'default_response_time_message');
  $: tripadvisorUrl = settingText(s, 'tripadvisor_url');

  $: columns = [
    {
      title: 'Safaris',
      links: [
        { href: '/tours', label: 'All Safaris' },
        ...countries.map((country) => ({ href: countryHref(country), label: `${country} Safaris` })),
        ...(marketsLive ? [{ href: '/safaris', label: 'Safaris by Departure' }] : []),
        { href: '/trip-finder', label: 'Safari Trip Finder' },
        { href: '/plan-my-trip', label: 'Tailor-Made Safari' }
      ]
    },
    {
      title: 'Travel Styles',
      links: [
        { href: '/travel-styles', label: 'All Travel Styles' },
        { href: '/travel-styles/great-migration-safari', label: 'Great Migration' },
        { href: '/travel-styles/tanzania-family-safari', label: 'Family Safaris' },
        { href: '/travel-styles/honeymoon', label: 'Honeymoon Safaris' },
        { href: '/travel-styles/tanzania-safari-zanzibar', label: 'Safari & Zanzibar' },
        { href: '/travel-styles/tanzania-day-safari', label: 'Day Safaris' }
      ]
    },
    {
      title: 'Plan Your Trip',
      links: [
        { href: '/destinations', label: 'Destinations' },
        { href: '/accommodation', label: 'Accommodation' },
        ...(essentialsLive ? [{ href: '/safari-essentials', label: 'Safari Essentials' }] : []),
        { href: '/safety', label: 'Health & Safety' }
      ]
    },
    {
      title: 'Company',
      links: [
        { href: '/about', label: 'About Us' },
        { href: '/blog', label: 'Journal' },
        { href: '/gallery', label: 'Gallery' },
        { href: '/contact', label: 'Contact' },
        ...(tripadvisorUrl ? [{ href: tripadvisorUrl, label: 'Guest Reviews', title: 'Guest reviews on Tripadvisor', external: true }] : [])
      ]
    }
  ] satisfies { title: string; links: FooterLink[] }[];

  // Legal links: use the admin-set URL when provided, else the on-site page.
  $: privacyUrl = settingText(s, 'privacy_policy_url') || '/privacy';
  $: termsUrl = settingText(s, 'terms_url') || '/terms';
  $: cancellationUrl = settingText(s, 'cancellation_policy_url') || '/cancellation-policy';

  const year = new Date().getFullYear();

  // One link look for the whole footer: quiet until hovered, gold focus ring.
  const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emnel-gold';
  const link = `inline-flex min-h-[44px] items-center text-[15px] leading-snug text-white/70 transition-colors hover:text-white md:min-h-[34px] ${focus}`;
  // Contact values reach into their row's padding, so the whole row height is the tap area.
  const value = `-my-3.5 block py-3.5 text-[15px] leading-snug text-white transition-colors hover:text-emnel-gold ${focus}`;
</script>

<footer class="site-type border-t border-white/10 bg-deep-green text-white">
  <div class="container-shell">
    <!-- Who we are, and the two ways to start. -->
    <div class="flex flex-col gap-8 border-b border-white/10 pb-10 pt-12 md:py-14 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
      <div class="max-w-xl">
        <a href="/" class={`-my-3 -ml-[13px] inline-block md:-my-4 md:-ml-[19px] ${focus}`} aria-label={`${siteName} home`}>
          <!-- The logo file has ~9% transparent padding; the negative margin puts the mark on the text edge. -->
          <img src={logoSrc} alt={siteName} width="574" height="226" class="h-14 w-auto object-contain md:h-20" loading="lazy" decoding="async" />
        </a>
        <p class="mt-6 font-heading text-[1.625rem] font-light leading-[1.2] text-white [text-wrap:balance] md:text-[1.875rem]">{tagline}.</p>
        <p class="mt-2 text-[15px] leading-[1.65] text-white/65">{statement}</p>
      </div>
      <div class="flex flex-col gap-3 sm:flex-row lg:shrink-0">
        <a
          href="/plan-my-trip"
          class={`group inline-flex h-12 items-center justify-center gap-2 bg-emnel-gold px-7 text-sm font-semibold text-deep-green transition hover:brightness-95 active:translate-y-px ${focus}`}
        >
          {brand.primaryCta}
          <ArrowRight size={16} class="transition-transform group-hover:translate-x-0.5" />
        </a>
        <WhatsAppCta
          variant="ghost"
          context="footer"
          message={waMessage}
          className={`inline-flex h-12 items-center justify-center gap-2 border border-white/30 px-7 text-sm font-semibold text-white transition hover:border-white/60 hover:bg-white/10 active:translate-y-px ${focus}`}
        >
          <MessageCircle size={17} /> {waLabel}
        </WhatsAppCta>
      </div>
    </div>

    <div class="grid gap-12 pb-12 pt-10 md:py-14 lg:grid-cols-12 lg:gap-10">
      <!-- The contact desk: how to reach the team, where, and when. -->
      <section class="lg:col-span-4 lg:pr-6" aria-labelledby="footer-contact">
        <h2 id="footer-contact" class="font-sans text-[15px] font-semibold leading-snug text-white">Talk to our team in Arusha</h2>
        <!-- Two columns on tablets, where one would run the full width. -->
        <dl class="mt-4 border-t border-white/10 md:grid md:grid-cols-2 md:gap-x-10 lg:block">
          {#if contactPhone}
            <div class="grid grid-cols-[20px_minmax(0,1fr)] gap-3.5 border-b border-white/10 py-3.5">
              <dt class="pt-0.5 text-emnel-gold"><Phone size={18} strokeWidth={1.75} aria-hidden="true" /><span class="sr-only">Phone</span></dt>
              <dd><a class={value} href={`tel:${contactPhone.replace(/[^\d+]/g, '')}`}>{contactPhone}</a></dd>
            </div>
          {/if}
          {#if waOwnRow}
            <div class="grid grid-cols-[20px_minmax(0,1fr)] gap-3.5 border-b border-white/10 py-3.5">
              <dt class="pt-0.5 text-emnel-gold"><MessageCircle size={18} strokeWidth={1.75} aria-hidden="true" /><span class="sr-only">WhatsApp</span></dt>
              <dd><WhatsAppCta variant="ghost" context="footer_contact" message={waMessage} className={value}>{waNumber}</WhatsAppCta></dd>
            </div>
          {/if}
          {#if contactEmail}
            <div class="grid grid-cols-[20px_minmax(0,1fr)] gap-3.5 border-b border-white/10 py-3.5">
              <dt class="pt-0.5 text-emnel-gold"><Mail size={18} strokeWidth={1.75} aria-hidden="true" /><span class="sr-only">Email</span></dt>
              <dd class="min-w-0"><a class={`break-words ${value}`} href={`mailto:${contactEmail}`}>{contactEmail}</a></dd>
            </div>
          {/if}
          {#if office}
            <div class="grid grid-cols-[20px_minmax(0,1fr)] gap-3.5 border-b border-white/10 py-3.5">
              <dt class="pt-0.5 text-emnel-gold"><MapPin size={18} strokeWidth={1.75} aria-hidden="true" /><span class="sr-only">Office</span></dt>
              <dd>
                <p class="text-[15px] leading-snug text-white">{office}</p>
                {#if mapsUrl}
                  <a class={`group inline-flex min-h-[44px] items-center gap-1 text-[13px] font-semibold md:mt-1.5 md:min-h-0 text-white/70 transition-colors hover:text-white ${focus}`} href={mapsUrl} target="_blank" rel="noopener noreferrer">
                    Get directions <ArrowUpRight size={14} class="transition-transform group-hover:-translate-y-px group-hover:translate-x-px" />
                  </a>
                {/if}
              </dd>
            </div>
          {/if}
          {#if hours}
            <div class="grid grid-cols-[20px_minmax(0,1fr)] gap-3.5 border-b border-white/10 py-3.5">
              <dt class="pt-0.5 text-emnel-gold"><Clock size={18} strokeWidth={1.75} aria-hidden="true" /><span class="sr-only">Hours</span></dt>
              <dd>
                <p class="text-[15px] leading-snug text-white">{hours}</p>
                {#if responseNote}<p class="mt-1 text-[13px] leading-snug text-white/55">{responseNote}</p>{/if}
              </dd>
            </div>
          {/if}
        </dl>
      </section>

      <nav class="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4 lg:col-span-8" aria-label="Footer">
        {#each columns as column (column.title)}
          <div class="min-w-0">
            <h2 class="font-sans text-[15px] font-semibold leading-snug text-white">{column.title}</h2>
            <ul class="mt-3">
              {#each column.links as item (item.href)}
                <li>
                  {#if item.external}
                    <a class={`group gap-1 ${link}`} href={item.href} target="_blank" rel="noopener noreferrer" aria-label={item.title} title={item.title}>
                      {item.label}
                      <ArrowUpRight size={14} class="shrink-0 transition-transform group-hover:-translate-y-px group-hover:translate-x-px" />
                    </a>
                  {:else}
                    <a class={link} href={item.href}>{item.label}</a>
                  {/if}
                </li>
              {/each}
            </ul>
          </div>
        {/each}
      </nav>
    </div>
  </div>

  <div class="border-t border-white/10">
    <div class="container-shell flex flex-col gap-5 py-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
      {#if socials.length}
        <div class="flex flex-wrap gap-2 lg:order-last">
          {#each socials as social (social.key)}
            <a
              class={`grid h-11 w-11 place-items-center border border-white/15 text-white/75 transition hover:border-white/50 hover:text-white ${focus}`}
              href={settingText(s, social.key)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${siteName} on ${social.label}`}
              title={social.label}
            >
              <SocialIcon name={social.name} size={18} />
            </a>
          {/each}
        </div>
      {/if}
      <div class="flex flex-col gap-2 text-[13px] text-white/55 lg:flex-row lg:items-center lg:gap-6">
        <p>© {year} {settingText(s, 'company_name') || brand.companyName}. All rights reserved.</p>
        <nav class="flex flex-wrap items-center gap-x-5" aria-label="Legal">
          <a class={`inline-flex min-h-[44px] items-center transition-colors hover:text-white lg:min-h-[28px] ${focus}`} href={privacyUrl}>Privacy Policy</a>
          <a class={`inline-flex min-h-[44px] items-center transition-colors hover:text-white lg:min-h-[28px] ${focus}`} href={termsUrl}>Terms</a>
          <a class={`inline-flex min-h-[44px] items-center transition-colors hover:text-white lg:min-h-[28px] ${focus}`} href={cancellationUrl}>Cancellation Policy</a>
          <a class={`inline-flex min-h-[44px] items-center transition-colors hover:text-white lg:min-h-[28px] ${focus}`} href="/data-retention">Data Retention</a>
        </nav>
      </div>
    </div>
  </div>
</footer>
