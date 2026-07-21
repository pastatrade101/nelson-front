<script lang="ts">
  import { onMount } from 'svelte';
  import { afterNavigate, goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { ArrowDownToLine, ArrowRight, ChevronDown, CircleHelp, Menu, MessageCircle, Search, TicketsPlane, User, X } from '@lucide/svelte';
  import { fade, fly } from 'svelte/transition';
  import { api } from '$lib/api/client';
  import { openAiAdvisor } from '$lib/aiAdvisor';
  import { trackEvent } from '$lib/analytics';
  import { navbarEntrance } from '$lib/animations';
  import { brand } from '$lib/brand';
  import { branding } from '$lib/branding';
  import { aiAdvisorEnabled, publicSettings, settingText } from '$lib/settings';
  import { canInstall, promptInstall } from '$lib/pwa';

  type NavLink = { href: string; label: string; image?: string };
  type NavItem = { dropdown?: 'destinations' | 'tours'; href: string; label: string };

  // Featured image panel + copy for each mega menu.
  const FALLBACK_FEATURE_IMG = 'https://images.unsplash.com/photo-1516426122078-c23e76319801';
  const FEATURE: Record<'destinations' | 'tours', { eyebrow: string; title: string; blurb: string; cta: string; href: string }> = {
    destinations: {
      eyebrow: 'Where to go',
      title: 'Explore Tanzania',
      blurb: 'Serengeti, Ngorongoro, Tarangire, Zanzibar & the Masai Mara.',
      cta: 'All destinations',
      href: '/destinations'
    },
    tours: {
      eyebrow: 'Ready to plan?',
      title: 'Find your safari',
      blurb: 'Northern Circuit, the Great Migration, family, honeymoon, photography — or fully tailor-made.',
      cta: 'Plan my safari',
      href: '/plan-my-trip'
    }
  };
  const featureImage = (key: 'destinations' | 'tours') =>
    dropdownLinks(key).find((l) => l.image)?.image || FALLBACK_FEATURE_IMG;

  // Emnel primary nav: Home · Safaris (dropdown) · Kilimanjaro · About · Journal · Begin Your Journey (CTA).
  const NAV: NavItem[] = [
    { href: '/', label: 'Home' },
    { href: '/tours', label: 'Safaris', dropdown: 'tours' },
    { href: '/destinations', label: 'Destinations' },
    { href: '/kilimanjaro', label: 'Kilimanjaro' },
    { href: '/about', label: 'About' },
    { href: '/blog', label: 'Journal' }
  ];

  const FALLBACK_DESTINATIONS: NavLink[] = [
    { href: '/destinations/tanzania', label: 'Tanzania' },
    { href: '/destinations/kenya', label: 'Kenya' },
    { href: '/destinations/zanzibar', label: 'Zanzibar' }
  ];

  // Safari types (Safaris dropdown). Overridden at runtime by published categories.
  const FALLBACK_CATEGORIES: NavLink[] = [
    { href: '/tours?category=classic-northern-circuit', label: 'Classic Northern Circuit' },
    { href: '/tours?category=great-migration', label: 'Great Migration' },
    { href: '/tours?category=family-safari', label: 'Family Safari' },
    { href: '/tours?category=honeymoon-safari', label: 'Honeymoon Safari' },
    { href: '/tours?category=photography-safari', label: 'Photography Safari' },
    { href: '/plan-my-trip', label: 'Tailor-Made' }
  ];

  let destinations: NavLink[] = FALLBACK_DESTINATIONS;
  let categories: NavLink[] = FALLBACK_CATEGORIES;

  let menuOpen = false;
  let openDropdown: '' | 'destinations' | 'tours' = '';
  let mobileAccordion: '' | 'destinations' | 'tours' = '';
  let searchQuery = '';
  let scrolled = false;

  const submitSearch = () => {
    const query = searchQuery.trim();
    void goto(query ? `/tours?search=${encodeURIComponent(query)}` : '/tours');
    menuOpen = false;
    openDropdown = '';
  };

  // ── active route ──────────────────────────────────────────────────────────
  $: path = $page.url.pathname;
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

  const dropdownLinks = (key: 'destinations' | 'tours') => (key === 'destinations' ? destinations : categories);

  const toggleDropdown = (key: 'destinations' | 'tours') => {
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
        const res = await api.destinations.list({ status: 'published', limit: 8 });
        const items = res.data.items ?? [];
        if (items.length) destinations = items.map((d) => ({ label: String(d.name ?? d.slug), href: `/destinations/${d.slug}`, image: d.main_image_url || d.image_url || d.banner_image_url || undefined }));
      } catch {
        // keep fallback
      }
      try {
        const res = await api.categories.list({ status: 'published', limit: 8 });
        const items = res.data.items ?? [];
        if (items.length) categories = items.map((c) => ({ label: String(c.name ?? c.slug), href: `/tours?category=${c.slug}`, image: (c.image_url as string) || undefined }));
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

<header class={`sticky top-0 z-40 border-b bg-deep-green text-white transition-[box-shadow,border-color] duration-[400ms] ease-out ${scrolled ? 'border-transparent shadow-[0_8px_28px_rgba(28,26,22,0.20)]' : 'border-white/10'}`} use:navbarEntrance>
  <!-- ── mobile top bar ─────────────────────────────────────────────────── -->
  <div class="flex h-[70px] items-center justify-between gap-3 px-4 sm:px-5 lg:hidden">
    <button class="grid h-11 w-11 place-items-center rounded-xl border border-white/15 bg-white/5 text-white" type="button" aria-label="Toggle menu" aria-expanded={menuOpen} on:click={() => (menuOpen = !menuOpen)}>
      <Menu size={24} strokeWidth={2.4} />
    </button>

    <a href="/" class="flex shrink-0 items-center gap-2" aria-label="Emnel Adventures home">
      {#if $branding.logo_url}
        <img src={$branding.logo_url} alt={$branding.site_name} class="h-10 w-auto object-contain" />
      {:else}
        <TicketsPlane class="text-goldfinch-gold" size={30} strokeWidth={2} />
        <div class="leading-none">
          <p class="text-xl font-semibold tracking-normal text-white">Emnel</p>
          <p class="mt-1 text-xs font-medium text-savanna">Adventures</p>
        </div>
      {/if}
    </a>

    <a class="grid h-11 w-11 place-items-center rounded-full bg-[#25D366] text-white shadow-sm" href={waHref} target="_blank" rel="noopener noreferrer" aria-label={waButtonText} on:click={() => trackEvent('whatsapp_click')}>
      <MessageCircle size={20} strokeWidth={2.6} />
    </a>
  </div>

  <!-- ── desktop top row (collapses smoothly on scroll) ──────────────────── -->
  <div class={`hidden overflow-hidden transition-[max-height,opacity] duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)] lg:block ${scrolled ? 'max-h-0 opacity-0' : 'max-h-[96px] opacity-100'}`}>
    <div class="mx-auto flex w-full max-w-[1500px] items-center justify-between gap-7 px-4 lg:h-[80px]">
      <a href="/" class="flex min-w-[150px] items-center gap-2.5" aria-label="Emnel Adventures home">
        {#if $branding.logo_url}
          <img src={$branding.logo_url} alt={$branding.site_name} class="h-12 w-auto object-contain" />
        {:else}
          <TicketsPlane class="text-goldfinch-gold" size={34} strokeWidth={2.1} />
          <div class="leading-none">
            <p class="text-2xl font-semibold tracking-normal text-white">Emnel</p>
            <p class="mt-1.5 text-sm font-medium text-savanna">Adventures</p>
          </div>
        {/if}
      </a>

      <form class="flex h-[50px] w-full max-w-[640px] items-center rounded-full bg-sand px-3 transition focus-within:ring-2 focus-within:ring-goldfinch-gold/40" on:submit|preventDefault={submitSearch} role="search">
        <button class="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink transition hover:text-forest" type="submit" aria-label="Search itineraries">
          <Search size={19} strokeWidth={2.4} />
        </button>
        <input class="min-w-0 flex-1 bg-transparent px-2 text-sm font-medium text-ink outline-none placeholder:text-stone" aria-label="Search itineraries" placeholder="Search safaris, Kilimanjaro, Zanzibar..." bind:value={searchQuery} />
      </form>

      <div class="flex items-center gap-4 text-[13px] font-semibold">
        {#if aiOn}
          <button type="button" class="inline-flex items-center gap-1 text-savanna transition hover:text-white" on:click={() => openAiAdvisor()}>
            <CircleHelp size={15} strokeWidth={2.6} />
            Need help?
          </button>
        {:else}
          <a class="inline-flex items-center gap-1 text-savanna transition hover:text-white" href="/contact">
            <CircleHelp size={15} strokeWidth={2.6} />
            Need help?
          </a>
        {/if}
        {#if $canInstall}
          <button type="button" class="inline-flex items-center gap-1.5 rounded-full border border-goldfinch-gold px-3 py-1.5 text-goldfinch-gold transition hover:bg-goldfinch-gold hover:text-deep-green" on:click={() => promptInstall()}>
            <ArrowDownToLine size={14} strokeWidth={2.6} /> Install app
          </button>
        {/if}
      </div>

      <a href="/admin/login" class="inline-flex h-12 items-center gap-2.5 rounded-xl border border-goldfinch-gold px-6 text-sm font-semibold text-goldfinch-gold shadow-sm transition hover:bg-goldfinch-gold hover:text-deep-green">
        <User size={16} strokeWidth={2.6} />
        Login
      </a>
    </div>
  </div>

  <!-- ── desktop nav row ────────────────────────────────────────────────── -->
  <div class="hidden border-t border-white/10 lg:block">
    <div class="mx-auto flex w-full max-w-[1500px] items-stretch justify-between px-4">
      <nav class="flex items-center gap-1" aria-label="Primary">
        {#if scrolled}
          <a href="/" class="mr-1 flex shrink-0 items-center gap-2" aria-label="Emnel Adventures home" transition:fly={{ x: -14, duration: 320 }}>
            {#if $branding.logo_url}
              <img src={$branding.logo_url} alt={$branding.site_name} class="h-8 w-auto object-contain" />
            {:else}
              <TicketsPlane class="text-goldfinch-gold" size={26} strokeWidth={2.2} />
              <span class="text-lg font-semibold tracking-normal text-white">Emnel</span>
            {/if}
          </a>
          <form class="mr-2 hidden h-9 items-center rounded-full bg-sand pl-1 pr-2 transition focus-within:ring-2 focus-within:ring-goldfinch-gold/40 xl:flex" on:submit|preventDefault={submitSearch} role="search" transition:fly={{ x: -14, duration: 320 }}>
            <button class="grid h-7 w-7 shrink-0 place-items-center rounded-full text-ink" type="submit" aria-label="Search itineraries"><Search size={15} strokeWidth={2.6} /></button>
            <input class="w-32 min-w-0 bg-transparent text-xs font-medium text-ink outline-none placeholder:text-stone" aria-label="Search itineraries" placeholder="Search itineraries..." bind:value={searchQuery} />
          </form>
        {/if}
        {#each NAV as item}
          {@const active = isActive(path, item.href)}
          {#if item.dropdown}
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div class="nav-dropdown relative" on:mouseenter={() => (openDropdown = item.dropdown ?? '')} on:mouseleave={() => (openDropdown = '')}>
              <div class="flex items-center">
                <a
                  class={`relative inline-flex items-center gap-1 rounded px-2.5 py-6 text-[15px] font-medium transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold/40 ${active ? 'text-goldfinch-gold' : 'text-white/70'}`}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                >
                  {item.label}
                  {#if active}<span class="absolute inset-x-2.5 bottom-1 h-0.5 rounded-full bg-goldfinch-gold"></span>{/if}
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

              {#if openDropdown === item.dropdown}
                {@const feat = FEATURE[item.dropdown]}
                <div
                  id={`dd-${item.dropdown}`}
                  class="absolute left-0 top-full z-50 grid w-[660px] grid-cols-[1fr_248px] overflow-hidden rounded-2xl border border-ink/10 bg-surface shadow-[0_24px_60px_rgba(28,26,22,0.18)]"
                  role="menu"
                  transition:fly={{ y: 6, duration: 140 }}
                >
                  <!-- link list -->
                  <div class="p-4">
                    <a class="flex items-center justify-between rounded-xl px-3 py-2 text-sm font-bold text-forest transition hover:bg-sand/60" href={item.href} role="menuitem">
                      All {item.label}
                      <ArrowRight size={14} strokeWidth={2.6} />
                    </a>
                    <div class="my-1.5 h-px bg-black/5"></div>
                    <div class="grid grid-cols-2 gap-0.5">
                      {#each dropdownLinks(item.dropdown) as link (link.href)}
                        <a class="truncate rounded-xl px-3 py-2.5 text-sm font-medium text-ink/75 transition hover:bg-sand/60 hover:text-forest" href={link.href} role="menuitem">{link.label}</a>
                      {/each}
                    </div>
                  </div>

                  <!-- featured image panel -->
                  <a href={feat.href} class="group/feat relative block overflow-hidden bg-deep-green" role="menuitem" aria-label={feat.cta}>
                    <img class="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover/feat:scale-105" src={featureImage(item.dropdown)} alt={feat.title} loading="lazy" />
                    <div class="absolute inset-0 bg-gradient-to-t from-deep-green via-deep-green/45 to-deep-green/10"></div>
                    <div class="relative flex h-full flex-col justify-end p-4 text-white">
                      <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-savanna">{feat.eyebrow}</p>
                      <p class="mt-1 text-lg font-extrabold leading-tight">{feat.title}</p>
                      <p class="mt-1 text-xs leading-5 text-white/80">{feat.blurb}</p>
                      <span class="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-goldfinch-gold">
                        {feat.cta} <ArrowRight size={14} strokeWidth={2.6} class="transition-transform group-hover/feat:translate-x-0.5" />
                      </span>
                    </div>
                  </a>
                </div>
              {/if}
            </div>
          {:else}
            <a
              class={`relative inline-flex items-center rounded px-2.5 py-6 text-[15px] font-medium transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold/40 ${active ? 'text-goldfinch-gold' : 'text-white/70'}`}
              href={item.href}
              aria-current={active ? 'page' : undefined}
            >
              {item.label}
              {#if active}<span class="absolute inset-x-2.5 bottom-1 h-0.5 rounded-full bg-goldfinch-gold"></span>{/if}
            </a>
          {/if}
        {/each}

        <!-- Begin Your Journey CTA -->
        <a
          class={`ml-2 inline-flex items-center gap-1.5 rounded-full border border-goldfinch-gold px-5 py-2.5 text-[15px] font-semibold shadow-sm transition hover:bg-goldfinch-gold hover:text-deep-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold/50 ${isActive(path, '/contact') ? 'bg-goldfinch-gold text-deep-green' : 'text-goldfinch-gold'}`}
          href="/contact"
          aria-current={isActive(path, '/contact') ? 'page' : undefined}
        >
          Begin Your Journey
          <ArrowRight size={15} strokeWidth={2.6} />
        </a>
      </nav>

      <!-- WhatsApp block -->
      <a
        class="flex min-h-[54px] items-center gap-3 border-l border-white/10 px-5 transition hover:bg-white/5 lg:w-[300px] lg:px-6"
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        on:click={() => trackEvent('whatsapp_click')}
        aria-label={`${waButtonText} ${waNumber}`}
      >
        <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#25D366] text-white ring-4 ring-[#25D366]/15">
          <MessageCircle size={18} strokeWidth={2.8} />
        </span>
        <span class="grid leading-tight">
          <span class="text-xs font-medium text-white/55">{waButtonText}</span>
          <span class="whitespace-nowrap text-base font-semibold text-white">{waNumber}</span>
        </span>
      </a>
    </div>
  </div>

  <!-- ── mobile drawer ──────────────────────────────────────────────────── -->
  {#if menuOpen}
    <div class="fixed inset-0 z-[90] lg:hidden" transition:fade={{ duration: 120 }}>
      <button class="absolute inset-0 bg-black/45 backdrop-blur-md" type="button" aria-label="Close menu" on:click={() => (menuOpen = false)}></button>

      <aside class="absolute right-0 top-0 flex min-h-dvh w-[86vw] min-w-[300px] max-w-[380px] flex-col overflow-y-auto border-l border-ink/10 bg-surface px-5 py-5 shadow-[-20px_0_55px_rgba(0,0,0,0.12)]" transition:fly={{ x: 60, duration: 200 }}>
        <div class="flex items-center justify-between gap-4">
          <a href="/" class="flex shrink-0 items-center gap-2.5" on:click={() => (menuOpen = false)}>
            {#if $branding.logo_url}
              <img src={$branding.logo_url} alt={$branding.site_name} class="h-10 w-auto object-contain" />
            {:else}
              <TicketsPlane class="text-goldfinch-gold" size={32} strokeWidth={2.1} />
              <div class="leading-none">
                <p class="text-xl font-semibold tracking-normal text-heading">Emnel</p>
                <p class="mt-1 text-xs font-semibold text-ink/70">Adventures</p>
              </div>
            {/if}
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
                  <button class="grid h-11 w-11 place-items-center rounded-xl text-ink/70 transition hover:bg-sand/50" type="button" aria-expanded={mobileAccordion === item.dropdown} aria-label={`Toggle ${item.label}`} on:click={() => (mobileAccordion = mobileAccordion === item.dropdown ? '' : (item.dropdown ?? ''))}>
                    <ChevronDown size={18} strokeWidth={2.6} class={`transition-transform ${mobileAccordion === item.dropdown ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                {#if mobileAccordion === item.dropdown}
                  <div class="grid gap-0.5 pb-2 pl-3" transition:fly={{ y: -4, duration: 150 }}>
                    {#each dropdownLinks(item.dropdown) as link (link.href)}
                      <a class="rounded-lg px-3 py-2 text-[15px] font-medium text-ink/65 transition hover:bg-sand/50 hover:text-forest" href={link.href} on:click={() => (menuOpen = false)}>{link.label}</a>
                    {/each}
                  </div>
                {/if}
              </div>
            {:else}
              <a class={`rounded-xl px-3 py-3 text-[17px] font-semibold transition ${active ? 'text-forest dark:text-goldfinch-gold' : 'text-ink'}`} href={item.href} on:click={() => (menuOpen = false)}>{item.label}</a>
            {/if}
          {/each}

          <a class="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-goldfinch-gold px-4 py-3 text-sm font-semibold text-goldfinch-gold transition hover:bg-goldfinch-gold hover:text-deep-green" href="/contact" on:click={() => (menuOpen = false)}>
            Begin Your Journey <ArrowRight size={15} strokeWidth={2.6} />
          </a>
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
          <a class="mt-1 text-center text-xs font-medium text-ink/40 transition hover:text-forest" href="/admin/login" on:click={() => (menuOpen = false)}>Staff login</a>
        </div>
      </aside>
    </div>
  {/if}
</header>
