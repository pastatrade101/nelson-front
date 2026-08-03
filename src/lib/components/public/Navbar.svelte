<script lang="ts">
  import { onMount } from 'svelte';
  import { afterNavigate, goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { ArrowDownToLine, ArrowRight, BadgeCheck, BedDouble, Binoculars, Camera, ChevronDown, CircleHelp, Compass, Gem, Handshake, Headphones, Heart, Home, MapPin, Menu, MessageCircle, Mountain, Plane, Route, Search, ShieldCheck, Sparkles, Tent, Users, Wallet, Waves, X } from '@lucide/svelte';
  import { fade, fly } from 'svelte/transition';
  import MegaMenu from './MegaMenu.svelte';
  import { api } from '$lib/api/client';
  import { openAiAdvisor } from '$lib/aiAdvisor';
  import { openEnquiry } from '$lib/enquiry';
  import { trackEvent } from '$lib/analytics';
  import { navbarEntrance } from '$lib/animations';
  import { brand } from '$lib/brand';
  import { branding } from '$lib/branding';
  import { aiAdvisorEnabled, publicSettings, settingText } from '$lib/settings';
  import { canInstall, promptInstall } from '$lib/pwa';

  type NavLink = {
    href: string; label: string; image?: string; description?: string; slug?: string;
    subtitle?: string; badge?: string; tier?: string; duration?: string; price?: string;
  };
  type DropdownKey = 'tours' | 'destinations' | 'accommodation' | 'safari-styles';
  type NavItem = { dropdown?: DropdownKey; href: string; label: string };

  let menuOpen = false;
  let openDropdown: '' | DropdownKey = '';
  let mobileAccordion: '' | DropdownKey = '';
  let searchQuery = '';
  let scrolled = false;

  // Dropdown data comes ONLY from published CMS content — no invented fallbacks.
  let destinations: NavLink[] = [];
  let categories: NavLink[] = [];
  // Real published tours (genuine images) power the Tours "popular experiences"
  // cards; category records only carry placeholder image names.
  let popularTours: NavLink[] = [];
  // Featured cards for the other menus, each filtered to real http images only.
  let featuredDestinations: NavLink[] = [];
  let featuredLodges: NavLink[] = [];
  // Real photo borrowed from each safari style's representative tour (category
  // images are placeholders), keyed by category slug.
  let styleImageBySlug: Record<string, string> = {};

  // Icon for a category / destination, picked from keywords in its real name.
  // Purely presentational — labels and links always come from the record.
  const catIcon = (label: string): typeof Compass => {
    const s = label.toLowerCase();
    if (/migration|wildebeest/.test(s)) return Binoculars;
    if (/photograph/.test(s)) return Camera;
    if (/family|kids|children/.test(s)) return Users;
    if (/honeymoon|romance|couple/.test(s)) return Heart;
    if (/luxury|prestige|premium|exclusive/.test(s)) return Gem;
    if (/fly|air|charter/.test(s)) return Plane;
    if (/zanzibar|beach|coast|island|ocean|holiday|mafia|pemba/.test(s)) return Waves;
    if (/crater|ngorongoro|mountain|kilimanjaro|highland/.test(s)) return Mountain;
    if (/northern|circuit|classic|serengeti|big five|tarangire|manyara|ruaha|mikumi|nyerere|eyasi|arusha/.test(s)) return Route;
    return Compass;
  };

  // Real, verbatim brand promises per section (each reused from that section's own
  // hero / CTA copy) shown as the mega-menu CTA panel's 2×2 trust badges.
  const TRUST: Record<DropdownKey, { icon: typeof Compass; label: string }[]> = {
    tours: [
      { icon: BadgeCheck, label: '100% private & tailor-made' },
      { icon: MapPin, label: 'Local safari experts' },
      { icon: Wallet, label: 'No hidden costs' },
      { icon: Headphones, label: '24/7 travel support' }
    ],
    destinations: [
      { icon: MapPin, label: 'Arusha-based since 2016' },
      { icon: Users, label: 'Tanzania-born guides' },
      { icon: ShieldCheck, label: 'Private vehicles only' },
      { icon: Sparkles, label: 'Tailor-made journeys' }
    ],
    accommodation: [
      { icon: BadgeCheck, label: 'Personally visited' },
      { icon: Handshake, label: 'Booked & managed for you' },
      { icon: MapPin, label: 'Location-first choices' },
      { icon: ShieldCheck, label: 'Honest guidance' }
    ],
    'safari-styles': [
      { icon: ShieldCheck, label: 'Private vehicles only' },
      { icon: Sparkles, label: 'Tailor-made itineraries' },
      { icon: Users, label: 'Tanzania-born guides' },
      { icon: MapPin, label: 'Arusha-based since 2016' }
    ]
  };

  // Accommodation "browse by style" — ONLY enum values that exist in published
  // lodges (types: tented_camp, lodge · levels: luxury, mid_range, budget).
  const ACCOMMODATION_BROWSE: { label: string; href: string; icon: typeof Compass }[] = [
    { label: 'Luxury', href: '/accommodation?level=luxury', icon: Gem },
    { label: 'Mid-range', href: '/accommodation?level=mid_range', icon: Sparkles },
    { label: 'Comfortable', href: '/accommodation?level=budget', icon: BedDouble },
    { label: 'Tented camp', href: '/accommodation?type=tented_camp', icon: Tent },
    { label: 'Lodge', href: '/accommodation?type=lodge', icon: Home }
  ];

  const closeAndEnquire = () => { openDropdown = ''; openEnquiry(); };

  // ── Real-data formatters for the rich editorial cards ─────────────────────
  const TIER_LABELS: Record<string, string> = {
    budget: 'Comfortable', mid_range: 'Mid-range', 'mid-range': 'Mid-range', midrange: 'Mid-range',
    luxury: 'Luxury', luxury_plus: 'Luxury+', 'luxury-plus': 'Luxury+', ultra_luxury: 'Ultra-luxury'
  };
  const tierLabel = (t?: unknown): string | undefined => {
    if (!t) return undefined;
    const k = String(t).toLowerCase();
    return TIER_LABELS[k] ?? String(t);
  };
  const durationLabel = (days?: unknown): string | undefined => {
    const n = Number(days);
    return Number.isFinite(n) && n > 0 ? `${n} day${n === 1 ? '' : 's'}` : undefined;
  };
  const priceLabel = (from?: unknown, currency?: unknown, suffix = ''): string | undefined => {
    const n = Number(from);
    return Number.isFinite(n) && n > 0 ? `From ${currency ? String(currency) : 'USD'} ${n.toLocaleString()}${suffix}` : undefined;
  };
  // Trim real copy to a single tidy line (for browse subtitles) at a word break.
  const oneLine = (text?: unknown, max = 46): string | undefined => {
    const s = String(text ?? '').replace(/\s+/g, ' ').trim();
    if (!s) return undefined;
    if (s.length <= max) return s;
    const cut = s.slice(0, max);
    const sp = cut.lastIndexOf(' ');
    return `${(sp > 20 ? cut.slice(0, sp) : cut).replace(/[,;:.\s]+$/, '')}…`;
  };

  // Curated, concise order for the Tours browse column (marquee styles first);
  // every one is a real published category — the rest live behind "All".
  const CURATED_STYLE_ORDER = [
    'classic-northern-circuit', 'great-migration-safaris', 'big-five-safaris', 'luxury-tanzania-safaris',
    'family-safaris', 'honeymoon-safaris', 'photography-safaris', 'fly-in-safaris',
    'safari-zanzibar-holidays', 'private-tanzania-safaris'
  ];

  // Emnel primary nav. Tours, Destinations, Accommodation & Safari Styles each
  // open a rich mega-menu; the rest are plain links.
  const NAV: NavItem[] = [
    { href: '/', label: 'Home' },
    { href: '/tours', label: 'Tours & Safaris', dropdown: 'tours' },
    { href: '/destinations', label: 'Destinations', dropdown: 'destinations' },
    { href: '/accommodation', label: 'Accommodation', dropdown: 'accommodation' },
    { href: '/safari-styles', label: 'Safari Styles', dropdown: 'safari-styles' },
    { href: '/about', label: 'About' },
    { href: '/blog', label: 'Journal' }
  ];

  // Sub-links for the mobile accordion, per dropdown (label + href only are read).
  $: mobileSubLinks = {
    tours: categories,
    destinations,
    accommodation: ACCOMMODATION_BROWSE,
    'safari-styles': categories
  } as Record<DropdownKey, NavLink[]>;

  // Background photo for a CTA panel: the first genuine http image from real data.
  $: ctaImage = [...popularTours, ...destinations].map((x) => x.image).find((u) => typeof u === 'string' && u.startsWith('http')) ?? '';

  // Left "browse" columns: real records mapped to labelled, icon'd links.
  // Tours = a concise, curated set with an editorial one-line subtitle (from the
  // category's real who_its_for); Styles = the full, compact style directory.
  $: curatedTours = CURATED_STYLE_ORDER
    .map((slug) => categories.find((c) => c.slug === slug))
    .filter((c): c is NavLink => Boolean(c));
  $: browseTours = (curatedTours.length >= 5 ? curatedTours : categories)
    .slice(0, 8)
    .map((c) => ({ label: c.label, href: c.href, icon: catIcon(c.label), subtitle: c.subtitle }));
  $: browseStyles = categories.map((c) => ({ label: c.label, href: c.href, icon: catIcon(c.label) }));
  $: browseDestinations = destinations.map((d) => ({ label: d.label, href: d.href, icon: catIcon(d.label) }));
  // Featured safari-style cards: category name + description (verbatim) over a
  // photo borrowed from that style's representative real tour; skip styles with
  // no real-image tour so no card is ever imageless/fabricated.
  $: featuredStyles = categories
    .map((c) => ({ label: c.label, href: c.href, description: c.description, image: styleImageBySlug[c.slug ?? ''] }))
    .filter((c) => Boolean(c.image))
    .slice(0, 5);

  // One config per mega-menu, assembled from the real data above. Every menu gets
  // a live search, a concierge CTA (enquiry + WhatsApp) and real trust badges.
  $: megaConfig = {
    tours: {
      id: 'dd-tours', href: '/tours', searchPlaceholder: 'Search safaris…', pageSupportsSearch: true,
      browseTitle: 'Browse Tours & Safaris', allLabel: 'All Tours & Safaris', browseItems: browseTours,
      featuredTitle: 'Popular Experiences', featuredItems: popularTours, viewAllLabel: 'View all tours & safaris',
      cta: { eyebrow: 'Ready to plan?', title: "Let's create your perfect safari", subtitle: 'Share your dates and a local safari expert designs a private journey around your pace and budget.', buttonLabel: 'Design My Safari', image: ctaImage },
      trust: TRUST.tours, onCta: closeAndEnquire, secondaryLabel: 'Speak to a Safari Expert', secondaryHref: waHref
    },
    destinations: {
      id: 'dd-destinations', href: '/destinations', searchPlaceholder: 'Search destinations…',
      browseTitle: 'Browse Destinations', allLabel: 'All Destinations', browseItems: browseDestinations,
      featuredTitle: 'Popular Destinations', featuredItems: featuredDestinations, viewAllLabel: 'View all destinations',
      cta: { eyebrow: 'Not sure where to go?', title: "We'll help you choose", subtitle: 'Tell us what you want to see and a local expert maps the right regions into one seamless journey.', buttonLabel: 'Design My Safari', image: featuredDestinations[0]?.image || ctaImage },
      trust: TRUST.destinations, onCta: closeAndEnquire, secondaryLabel: 'Speak to a Safari Expert', secondaryHref: waHref
    },
    accommodation: {
      id: 'dd-accommodation', href: '/accommodation', searchPlaceholder: 'Search stays…', pageSupportsSearch: true,
      browseTitle: 'Browse by Style', allLabel: 'All Stays', browseItems: ACCOMMODATION_BROWSE,
      featuredTitle: 'Featured Stays', featuredItems: featuredLodges, viewAllLabel: 'View all stays',
      cta: { eyebrow: 'Not sure where to stay?', title: "We'll match you to the right camps", subtitle: 'Tell us your dates and how you like to travel — a local specialist pairs you with the right lodges.', buttonLabel: 'Design My Safari', image: featuredLodges[0]?.image || ctaImage },
      trust: TRUST.accommodation, onCta: closeAndEnquire, secondaryLabel: 'Speak to a Safari Expert', secondaryHref: waHref
    },
    'safari-styles': {
      id: 'dd-safari-styles', href: '/safari-styles', searchPlaceholder: 'Search safari styles…',
      browseTitle: 'Browse Safari Styles', allLabel: 'All Safari Styles', browseItems: browseStyles,
      featuredTitle: 'Popular Safari Styles', featuredItems: featuredStyles, viewAllLabel: 'View all safari styles',
      cta: { eyebrow: 'Still deciding?', title: 'Tell us how you like to travel', subtitle: 'A style is only a starting point — share your dates and a local specialist shapes the right private safari around you.', buttonLabel: 'Design My Safari', image: featuredStyles[0]?.image || ctaImage },
      trust: TRUST['safari-styles'], onCta: closeAndEnquire, secondaryLabel: 'Speak to a Safari Expert', secondaryHref: waHref
    }
  } as Record<DropdownKey, import('svelte').ComponentProps<MegaMenu>>;

  const submitSearch = () => {
    const query = searchQuery.trim();
    void goto(query ? `/tours?search=${encodeURIComponent(query)}` : '/tours');
    menuOpen = false;
    openDropdown = '';
  };

  // ── active route ──────────────────────────────────────────────────────────
  $: path = $page.url.pathname;
  $: isHome = path === '/';
  // On the homepage the header overlays the full-height hero: transparent at the
  // very top, solid once scrolled. On every other page it stays a solid sticky bar.
  $: transparentHeader = isHome && !scrolled;
  const isActive = (currentPath: string, href: string) => {
    if (href === '/') return currentPath === '/';
    return currentPath === href || currentPath.startsWith(`${href}/`);
  };

  // Close menus whenever the route changes.
  let lastPath = '';
  $: if (path !== lastPath) {
    lastPath = path;
    menuOpen = false;
    openDropdown = '';
    mobileAccordion = '';
  }

  // Navbar logo: the Emnel wordmark, overridable by an admin-set logo.
  $: logoSrc = $branding.logo_url || '/emnel.avif';

  // ── WhatsApp CTA (from public settings, with safe fallback) ─────────────────
  $: s = $publicSettings;
  $: aiOn = aiAdvisorEnabled(s);
  $: waNumber = settingText(s, 'whatsapp_number') || '+255 700 000 000';
  $: waMessage = settingText(s, 'whatsapp_default_message') || 'Hello Emnel Adventures, I would like help planning a private Tanzania safari.';
  $: waDigits = waNumber.replace(/[^0-9]/g, '');
  $: waHref = `https://wa.me/${waDigits}?text=${encodeURIComponent(waMessage)}`;
  $: waButtonText = settingText(s, 'whatsapp_button_text') || brand.whatsappCta;
  $: supportEmail = settingText(s, 'contact_email') || 'hello@emneladventures.com';
  $: supportPhone = settingText(s, 'contact_phone') || waNumber;

  const toggleDropdown = (key: DropdownKey) => {
    openDropdown = openDropdown === key ? '' : key;
  };

  // Always close the mobile drawer (and any open dropdowns) after a navigation,
  // so tapping any link reliably closes it.
  afterNavigate(() => {
    menuOpen = false;
    mobileAccordion = '';
    openDropdown = '';
  });

  onMount(() => {
    const loadNav = async () => {
      try {
        const res = await api.destinations.list({ status: 'published', limit: 100 });
        const items = (res.data.items ?? []) as Array<Record<string, unknown>>;
        if (items.length) {
          destinations = items.map((d) => ({
            label: String(d.name ?? d.slug),
            href: `/destinations/${d.slug}`,
            slug: String(d.slug ?? ''),
            image: (d.main_image_url || d.image_url || d.banner_image_url || undefined) as string | undefined,
            description: d.short_description ? String(d.short_description) : undefined
          }));
          // Popular cards: only destinations with a real photo; featured first,
          // then the ones that also have a real short description (richer cards).
          const withImage = items.filter((d) => typeof d.image_url === 'string' && (d.image_url as string).startsWith('http'));
          withImage.sort((a, b) =>
            (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0) ||
            (b.short_description ? 1 : 0) - (a.short_description ? 1 : 0)
          );
          featuredDestinations = withImage.slice(0, 5).map((d) => ({
            label: String(d.name ?? d.slug),
            href: `/destinations/${d.slug}`,
            image: (d.image_url_thumbnail || d.image_url) as string,
            description: d.short_description ? String(d.short_description) : undefined,
            tier: (d.region || d.country) ? String(d.region || d.country) : undefined
          }));
        }
      } catch {
        // keep fallback
      }
      try {
        const res = await api.categories.list({ status: 'published', limit: 20 });
        const items = res.data.items ?? [];
        if (items.length) categories = items.map((c) => ({ label: String(c.name ?? c.slug), href: `/tours?category=${c.slug}`, slug: String(c.slug ?? ''), image: (c.image_url as string) || undefined, description: c.description ? String(c.description) : undefined, subtitle: oneLine(c.who_its_for) ?? oneLine(c.description) }));
      } catch {
        // keep fallback
      }
      try {
        const res = await api.tours.list({ status: 'published', limit: 24 });
        const items = (res.data.items ?? []) as Array<Record<string, unknown>>;
        const withImage = items.filter((t) => typeof t.main_image_url === 'string' && (t.main_image_url as string).startsWith('http'));
        // Surface the most promoted trips first (best-sellers, then recommended).
        withImage.sort((a, b) => (b.is_popular ? 1 : 0) - (a.is_popular ? 1 : 0) || (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0));
        popularTours = withImage.slice(0, 5).map((t) => ({
          label: String(t.title ?? t.slug),
          href: `/tours/${t.slug}`,
          image: t.main_image_url as string,
          description: t.short_description ? String(t.short_description) : undefined,
          badge: t.is_popular ? 'Best Seller' : t.is_featured ? 'Recommended' : undefined,
          tier: tierLabel(t.budget_tier),
          duration: durationLabel(t.duration_days),
          price: priceLabel(t.price_from, t.currency)
        }));
        // Map each category slug -> a real tour photo, for the Safari Styles cards.
        const byStyle: Record<string, string> = {};
        for (const t of withImage) {
          const slug = (t.tour_categories as { slug?: string } | null)?.slug;
          const img = t.main_image_url as string;
          if (slug && !byStyle[slug]) byStyle[slug] = img;
        }
        styleImageBySlug = byStyle;
      } catch {
        // keep fallback
      }
      try {
        const res = await api.lodges.list({ status: 'published', limit: 200 });
        const items = (res.data.items ?? []) as Array<Record<string, unknown>>;
        // Only lodges with a real hero photo (6 of 12); recommended first.
        const withImage = items.filter((l) => typeof l.hero_image_url === 'string' && (l.hero_image_url as string).startsWith('http'));
        withImage.sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0));
        featuredLodges = withImage.slice(0, 5).map((l) => ({
          label: String(l.name ?? l.slug),
          href: `/accommodation/${l.slug}`,
          image: l.hero_image_url as string,
          description: l.why_we_recommend ? String(l.why_we_recommend) : undefined,
          badge: l.is_featured ? 'Recommended' : undefined,
          tier: tierLabel(l.accommodation_level),
          price: priceLabel(l.price_per_night_from, l.currency, ' / night')
        }));
      } catch {
        // keep fallback
      }
    };
    void loadNav();

    const onClick = (event: MouseEvent) => {
      if (!(event.target as HTMLElement)?.closest?.('.nav-dropdown')) openDropdown = '';
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        openDropdown = '';
        menuOpen = false;
      }
    };
    // Hysteresis: collapse the top row only once we're well past the header,
    // and only re-expand when scrolled back near the top. The wide dead zone
    // (40–120px) stops the sticky header shrinking from nudging scrollY back
    // across a single threshold, which caused the infinite on/off "vibration".
    const onScroll = () => {
      const y = window.scrollY;
      if (!scrolled && y > 120) scrolled = true;
      else if (scrolled && y < 40) scrolled = false;
    };
    onScroll();
    window.addEventListener('click', onClick);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('click', onClick);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll);
    };
  });
</script>

<header class={`${isHome ? 'fixed' : 'sticky'} inset-x-0 top-0 z-40 border-b text-white transition-[background-color,box-shadow,border-color] duration-[400ms] ease-out ${
  transparentHeader
    ? 'border-transparent bg-transparent'
    : `bg-deep-green ${scrolled ? 'border-transparent shadow-[0_8px_28px_rgba(28,26,22,0.20)]' : 'border-white/10'}`
}`} use:navbarEntrance>
  <!-- ── mobile top bar ─────────────────────────────────────────────────── -->
  <div class="flex h-[70px] items-center justify-between gap-3 px-4 sm:px-5 xl:hidden">
    <button class="grid h-11 w-11 place-items-center rounded-xl border border-white/15 bg-white/5 text-white" type="button" aria-label="Toggle menu" aria-expanded={menuOpen} on:click={() => (menuOpen = !menuOpen)}>
      <Menu size={24} strokeWidth={2.4} />
    </button>

    <a href="/" class="flex shrink-0 items-center gap-2" aria-label="Emnel Adventures home">
      <img src={logoSrc} alt={$branding.site_name} class="h-12 w-auto object-contain" />
    </a>

    <a class="grid h-11 w-11 place-items-center rounded-full bg-[#25D366] text-white shadow-sm" href={waHref} target="_blank" rel="noopener noreferrer" aria-label={waButtonText} on:click={() => trackEvent('whatsapp_click')}>
      <MessageCircle size={20} strokeWidth={2.6} />
    </a>
  </div>

  <!-- ── desktop nav row (single bar: huge logo left · nav + CTA right) ───── -->
  <div class="hidden xl:block">
    <div class="mx-auto flex w-full max-w-[1500px] items-center justify-between gap-6 px-4">
      <!-- logo: left, oversized -->
      <a href="/" class="flex shrink-0 items-center py-2" aria-label="Emnel Adventures home">
        <img src={logoSrc} alt={$branding.site_name} class="h-24 w-auto object-contain" />
      </a>

      <!-- nav links + CTA, aligned right -->
      <div class="flex items-center gap-2">
        <nav class="flex items-center gap-1" aria-label="Primary">
          {#each NAV as item}
          {@const active = isActive(path, item.href)}
          {#if item.dropdown}
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div class="nav-dropdown relative" on:mouseenter={() => (openDropdown = item.dropdown ?? '')} on:mouseleave={() => (openDropdown = '')}>
              <div class="flex items-center">
                <a
                  class={`relative inline-flex items-center gap-1 rounded px-4 py-8 text-[16.5px] font-medium transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold/40 ${active ? 'text-goldfinch-gold' : 'text-white/70'}`}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                >
                  {item.label}
                  {#if active}<span class="absolute inset-x-4 bottom-1 h-0.5 rounded-full bg-goldfinch-gold"></span>{/if}
                </a>
                <button
                  class="grid h-8 w-7 place-items-center rounded text-white/60 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold/40"
                  type="button"
                  aria-haspopup="true"
                  aria-expanded={openDropdown === item.dropdown}
                  aria-controls={`dd-${item.dropdown}`}
                  aria-label={`${item.label} menu`}
                  on:click|stopPropagation={() => item.dropdown && toggleDropdown(item.dropdown)}
                >
                  <ChevronDown size={15} strokeWidth={2.6} class={`transition-transform ${openDropdown === item.dropdown ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {#if openDropdown === item.dropdown && megaConfig[item.dropdown]}
                <MegaMenu {...megaConfig[item.dropdown]} />
              {/if}
            </div>
          {:else}
            <a
              class={`relative inline-flex items-center rounded px-4 py-8 text-[16.5px] font-medium transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold/40 ${active ? 'text-goldfinch-gold' : 'text-white/70'}`}
              href={item.href}
              aria-current={active ? 'page' : undefined}
            >
              {item.label}
              {#if active}<span class="absolute inset-x-4 bottom-1 h-0.5 rounded-full bg-goldfinch-gold"></span>{/if}
            </a>
          {/if}
        {/each}
        </nav>

        <!-- Begin Your Journey CTA — opens the enquiry modal -->
        <button
          type="button"
          class="ml-1 inline-flex items-center gap-1.5 border border-goldfinch-gold px-6 py-2.5 text-[15px] font-semibold text-goldfinch-gold shadow-sm transition hover:bg-goldfinch-gold hover:text-deep-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold/50"
          on:click={openEnquiry}
        >
          Begin Your Journey
          <ArrowRight size={15} strokeWidth={2.6} />
        </button>
      </div>
    </div>
  </div>

  <!-- ── mobile drawer ──────────────────────────────────────────────────── -->
  {#if menuOpen}
    <div class="fixed inset-0 z-[90] xl:hidden" transition:fade={{ duration: 120 }}>
      <button class="absolute inset-0 bg-black/45 backdrop-blur-md" type="button" aria-label="Close menu" on:click={() => (menuOpen = false)}></button>

      <aside class="absolute right-0 top-0 flex min-h-dvh w-[86vw] min-w-[300px] max-w-[380px] flex-col overflow-y-auto border-l border-ink/10 bg-surface px-5 py-5 shadow-[-20px_0_55px_rgba(0,0,0,0.12)]" transition:fly={{ x: 60, duration: 200 }}>
        <div class="flex items-center justify-between gap-4">
          <!-- Logo sits on a deep-green chip so the gold wordmark stays legible on the light drawer. -->
          <a href="/" class="flex shrink-0 items-center" on:click={() => (menuOpen = false)} aria-label="Emnel Adventures home">
            <span class="inline-flex items-center rounded-lg bg-deep-green px-3 py-1.5">
              <img src={logoSrc} alt={$branding.site_name} class="h-9 w-auto object-contain" />
            </span>
          </a>
          <button class="grid h-11 w-11 place-items-center rounded-xl border border-ink/15 bg-surface text-ink" type="button" aria-label="Close menu" on:click={() => (menuOpen = false)}>
            <X size={22} strokeWidth={2.4} />
          </button>
        </div>

        <form class="mt-5 flex h-11 items-center rounded-full bg-sand px-2 transition focus-within:ring-2 focus-within:ring-goldfinch-gold/30" on:submit|preventDefault={submitSearch} role="search">
          <button class="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink" type="submit" aria-label="Search itineraries"><Search size={17} strokeWidth={2.6} /></button>
          <input class="min-w-0 flex-1 bg-transparent px-1 text-sm font-medium text-ink outline-none placeholder:text-stone" aria-label="Search itineraries" placeholder="Search itineraries..." bind:value={searchQuery} />
        </form>

        {#if aiOn}
          <button
            type="button"
            class="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-deep-green px-4 py-3 text-sm font-bold text-white transition hover:bg-forest"
            on:click={() => { openAiAdvisor(); menuOpen = false; }}
          >
            <CircleHelp size={16} strokeWidth={2.6} /> Ask our AI advisor
          </button>
        {/if}

        <nav class="mt-5 grid gap-1" aria-label="Mobile">
          {#each NAV as item}
            {@const active = isActive(path, item.href)}
            {#if item.dropdown}
              <div class="rounded-xl">
                <div class="flex items-center">
                  <a class={`flex-1 rounded-xl px-3 py-3 text-[17px] font-semibold transition ${active ? 'text-forest dark:text-goldfinch-gold' : 'text-ink'}`} href={item.href} on:click={() => (menuOpen = false)}>{item.label}</a>
                  {#if mobileSubLinks[item.dropdown].length}
                    <button class="grid h-11 w-11 place-items-center rounded-xl text-ink/70 transition hover:bg-sand/50" type="button" aria-expanded={mobileAccordion === item.dropdown} aria-label={`Toggle ${item.label}`} on:click={() => (mobileAccordion = mobileAccordion === item.dropdown ? '' : (item.dropdown ?? ''))}>
                      <ChevronDown size={18} strokeWidth={2.6} class={`transition-transform ${mobileAccordion === item.dropdown ? 'rotate-180' : ''}`} />
                    </button>
                  {/if}
                </div>
                {#if mobileAccordion === item.dropdown && mobileSubLinks[item.dropdown].length}
                  <div class="grid gap-0.5 pb-2 pl-3" transition:fly={{ y: -4, duration: 150 }}>
                    {#each mobileSubLinks[item.dropdown] as link (link.href)}
                      <a class="rounded-lg px-3 py-2 text-[15px] font-medium text-ink/65 transition hover:bg-sand/50 hover:text-forest" href={link.href} on:click={() => (menuOpen = false)}>{link.label}</a>
                    {/each}
                  </div>
                {/if}
              </div>
            {:else}
              <a class={`rounded-xl px-3 py-3 text-[17px] font-semibold transition ${active ? 'text-forest dark:text-goldfinch-gold' : 'text-ink'}`} href={item.href} on:click={() => (menuOpen = false)}>{item.label}</a>
            {/if}
          {/each}

          <button type="button" class="mt-2 inline-flex w-full items-center justify-center gap-1.5 border border-goldfinch-gold px-4 py-3 text-sm font-semibold text-goldfinch-gold transition hover:bg-goldfinch-gold hover:text-deep-green" on:click={() => { menuOpen = false; openEnquiry(); }}>
            Begin Your Journey <ArrowRight size={15} strokeWidth={2.6} />
          </button>
        </nav>

        <div class="mt-6 grid gap-2.5 border-t border-ink/10 pt-5">
          {#if $canInstall}
            <button type="button" class="flex w-full items-center justify-center gap-2 rounded-2xl bg-forest px-4 py-3 text-sm font-bold text-white transition hover:bg-deep-green" on:click={() => { void promptInstall(); menuOpen = false; }}>
              <ArrowDownToLine size={18} strokeWidth={2.6} /> Install app
            </button>
          {/if}
          <a class="flex items-center gap-3 rounded-2xl bg-[#25D366]/10 px-4 py-3" href={waHref} target="_blank" rel="noopener noreferrer" on:click={() => { trackEvent('whatsapp_click'); menuOpen = false; }}>
            <span class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#25D366] text-white"><MessageCircle size={20} strokeWidth={2.6} /></span>
            <span class="grid leading-tight">
              <span class="text-xs font-medium text-ink/70">{waButtonText}</span>
              <span class="text-[15px] font-bold text-ink">{waNumber}</span>
            </span>
          </a>
        </div>
      </aside>
    </div>
  {/if}
</header>
