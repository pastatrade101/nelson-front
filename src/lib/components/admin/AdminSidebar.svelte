<script lang="ts">
  import { page } from '$app/stores';
  import { onMount, type Component } from 'svelte';
  import { slide } from 'svelte/transition';
  import {
    Bot,
    CalendarDays,
    ChevronDown,
    ChevronLeft,
    CircleDollarSign,
    CircleHelp,
    ClipboardList,
    CreditCard,
    FolderTree,
    Globe,
    Home,
    Hotel,
    Image,
    Images,
    LayoutDashboard,
    ListCheck,
    LogOut,
    Mail,
    Map,
    MapPin,
    MessageCircleHeart,
    Newspaper,
    Palette,
    Route,
    ScrollText,
    Settings,
    ShieldCheck,
    Sparkles,
    Tags,
    Users
  } from '@lucide/svelte';
  import { brand } from '$lib/brand';

  export let collapsed = false;
  export let currentPath = '/admin';
  export let mobileOpen = false;
  export let user: { email?: string; name?: string; role?: string } | null = null;
  export let onCloseMobile: () => void = () => {};
  export let onLogout: () => void = () => {};
  export let onToggleDesktop: () => void = () => {};

  type NavLink = {
    exact?: boolean;
    href: string;
    icon: Component;
    inactivePlaceholder?: boolean;
    label: string;
  };

  type NavGroup = {
    label: string;
    links: NavLink[];
  };

  const groups: NavGroup[] = [
    { label: 'Dashboard', links: [{ href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true }] },
    {
      label: 'Tour Management',
      links: [
        { href: '/admin/tours', label: 'Tours', icon: Map, exact: true },
        { href: '/admin/categories', label: 'Categories', icon: Tags },
        { href: '/admin/destinations', label: 'Destinations', icon: MapPin },
        { href: '/admin/countries', label: 'Countries', icon: Globe },
        { href: '/admin/lodges', label: 'Lodges & Camps', icon: Hotel },
        { href: '/admin/itineraries', label: 'Itineraries', icon: Route },
        { href: '/admin/available-dates', label: 'Available Dates', icon: CalendarDays },
        { href: '/admin/pricing-options', label: 'Pricing Options', icon: CircleDollarSign },
        { href: '/admin/tour-details', label: 'Tour Details', icon: ListCheck }
      ]
    },
    {
      label: 'Booking Management',
      links: [
        { href: '/admin/bookings', label: 'Bookings', icon: ClipboardList },
        { href: '/admin/payments', label: 'Payments', icon: CreditCard },
        { href: '/admin/messages', label: 'Messages', icon: Mail }
      ]
    },
    {
      label: 'Content Management',
      links: [
        { href: '/admin/blog', label: 'Blog', icon: Newspaper, exact: true },
        { href: '/admin/blog/categories', label: 'Blog Categories', icon: FolderTree },
        { href: '/admin/gallery', label: 'Gallery', icon: Images },
        { href: '/admin/media', label: 'Media Library', icon: Image },
        { href: '/admin/testimonials', label: 'Testimonials', icon: MessageCircleHeart },
        { href: '/admin/faqs', label: 'FAQs', icon: CircleHelp },
        { href: '/admin/homepage', label: 'Homepage', icon: Home }
      ]
    },
    {
      label: 'AI System',
      links: [
        { href: '/admin/ai-conversations', label: 'AI Conversations', icon: Bot, exact: true },
        { href: '/admin/ai-conversations', label: 'Tour Match Results', icon: Sparkles, inactivePlaceholder: true }
      ]
    },
    {
      label: 'Administration',
      links: [
        { href: '/admin/users', label: 'Users', icon: Users },
        { href: '/admin/roles', label: 'Roles & Permissions', icon: ShieldCheck },
        { href: '/admin/branding', label: 'Branding', icon: Palette },
        { href: '/admin/settings', label: 'Settings', icon: Settings },
        { href: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText }
      ]
    }
  ];

  $: path = $page.url.pathname || currentPath || '/admin';

  // All real (non-placeholder) nav targets, used for "longest match wins" so a
  // parent link (e.g. /admin/blog) never stays active on a child route
  // (e.g. /admin/blog/categories) — only the most specific match lights up.
  const allHrefs = groups.flatMap((group) => group.links.filter((link) => !link.inactivePlaceholder).map((link) => link.href));

  const matchScore = (currentPath: string, href: string) => {
    // The /admin root is a prefix of every admin route, so it only matches exactly.
    if (href === '/admin') return currentPath === '/admin' ? href.length : -1;
    if (currentPath === href || currentPath.startsWith(`${href}/`)) return href.length;
    return -1;
  };

  // The single most specific matching href for the current path.
  $: activeHref = allHrefs.reduce(
    (best, href) => {
      const score = matchScore(path, href);
      return score > best.score ? { href, score } : best;
    },
    { href: '', score: -1 }
  ).href;

  // `activeHref` is passed explicitly so the template tracks it as a dependency.
  const isActive = (currentActiveHref: string, href: string, inactivePlaceholder?: boolean) =>
    !inactivePlaceholder && href === currentActiveHref && currentActiveHref !== '';

  // ── Collapsible category groups (accordion) ───────────────────────────────
  const STORAGE_KEY = 'admin_sidebar_groups';
  let expanded: Record<string, boolean> = {};
  let ready = false;

  const groupHasActive = (currentActiveHref: string, group: NavGroup) =>
    group.links.some((link) => isActive(currentActiveHref, link.href, link.inactivePlaceholder));

  const persist = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(expanded));
    } catch {
      /* storage unavailable — ignore */
    }
  };

  const toggleGroup = (label: string) => {
    expanded = { ...expanded, [label]: !expanded[label] };
    persist();
  };

  onMount(() => {
    let saved: Record<string, boolean> = {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) saved = JSON.parse(raw) ?? {};
    } catch {
      saved = {};
    }

    const next: Record<string, boolean> = {};
    for (const group of groups) {
      if (group.links.length <= 1) continue;
      // Respect a saved choice; otherwise open only the group with the active route.
      next[group.label] = group.label in saved ? Boolean(saved[group.label]) : groupHasActive(activeHref, group);
    }
    expanded = next;
    ready = true;
  });

  // After navigation, always reveal the group that owns the current route.
  let lastPath = '';
  $: if (ready && path !== lastPath) {
    lastPath = path;
    for (const group of groups) {
      if (group.links.length > 1 && groupHasActive(activeHref, group) && !expanded[group.label]) {
        expanded = { ...expanded, [group.label]: true };
        persist();
      }
    }
  }

  const initials = (value?: string) => {
    const source = value || user?.email || 'Admin';
    return source
      .split(/\s+|@/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  };

  const handleNavigate = () => {
    onCloseMobile();
  };
</script>

{#if mobileOpen}
  <button class="fixed inset-0 z-40 bg-charcoal/60 backdrop-blur-sm lg:hidden" type="button" aria-label="Close sidebar" on:click={onCloseMobile}></button>
{/if}

<aside
  class={`fixed inset-y-0 left-0 z-50 flex h-screen flex-col overflow-hidden border-r border-white/10 bg-gradient-to-b from-deep-green via-forest to-deep-green text-white shadow-2xl transition-[transform,width] duration-300 ease-out lg:sticky lg:translate-x-0 ${
    collapsed ? 'lg:w-[78px]' : 'lg:w-[280px]'
  } ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} w-[min(88vw,304px)]`}
>
  <div class={`flex h-20 items-center gap-3 border-b border-white/10 px-4 ${collapsed ? 'lg:justify-center' : ''}`}>
    <a class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-goldfinch-gold text-base font-black text-deep-green shadow-lg shadow-black/10" href="/admin" title={brand.adminName} on:click={handleNavigate}>
      GA
    </a>
    <div class={`min-w-0 transition duration-200 ${collapsed ? 'lg:hidden lg:opacity-0' : 'opacity-100'}`}>
      <a class="block truncate text-base font-bold tracking-normal text-white" href="/admin" on:click={handleNavigate}>{brand.adminName}</a>
      <p class="truncate text-xs font-medium text-savanna/75">Goldfinch Travel Platform</p>
    </div>
    <button class={`ml-auto hidden h-9 w-9 place-items-center rounded-lg border border-white/10 text-savanna transition hover:bg-white/10 hover:text-white lg:grid ${collapsed ? 'lg:hidden' : ''}`} type="button" aria-label="Collapse sidebar" on:click={onToggleDesktop}>
      <ChevronLeft size={17} />
    </button>
  </div>

  <nav class="min-h-0 flex-1 overflow-y-auto px-3 py-4 [scrollbar-width:thin] [scrollbar-color:rgba(233,216,166,0.35)_transparent]">
    <div class="grid gap-1">
      {#each groups as group}
        {@const single = group.links.length <= 1}
        {@const groupActive = groupHasActive(activeHref, group)}
        {@const open = collapsed || single || (ready ? Boolean(expanded[group.label]) : groupActive)}
        <section>
          {#if single}
            <!-- top-level single link: no category header -->
          {:else if collapsed}
            <div class="my-1 flex justify-center">
              <span class="h-px w-6 rounded bg-white/10"></span>
            </div>
          {:else}
            <button
              class="group/header flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold/60"
              type="button"
              aria-expanded={open}
              on:click={() => toggleGroup(group.label)}
            >
              <span class={`text-[10px] font-bold uppercase tracking-[0.16em] transition ${groupActive ? 'text-savanna/80' : 'text-savanna/45 group-hover/header:text-savanna/70'}`}>{group.label}</span>
              {#if groupActive && !open}
                <span class="h-1.5 w-1.5 rounded-full bg-goldfinch-gold"></span>
              {/if}
              <ChevronDown size={14} class={`ml-auto shrink-0 text-savanna/40 transition-transform duration-200 group-hover/header:text-savanna/70 ${open ? 'rotate-180' : ''}`} />
            </button>
          {/if}

          {#if open}
            <div class={`grid gap-1 ${single || collapsed ? '' : 'mb-1 mt-1'}`} transition:slide={{ duration: 200 }}>
              {#each group.links as link}
                {@const Icon = link.icon}
                {@const active = isActive(activeHref, link.href, link.inactivePlaceholder)}
                <a
                  class={`group relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-goldfinch-gold/70 ${
                    collapsed ? 'lg:justify-center lg:px-0' : ''
                  } ${
                    active
                      ? 'bg-goldfinch-gold/20 text-white shadow-inner ring-1 ring-goldfinch-gold/25'
                      : 'text-savanna/75 hover:bg-white/10 hover:text-white'
                  }`}
                  href={link.href}
                  title={collapsed ? link.label : undefined}
                  aria-current={active ? 'page' : undefined}
                  on:click={handleNavigate}
                >
                  <span class={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition ${active ? 'bg-goldfinch-gold text-deep-green' : 'bg-white/10 text-savanna/80 group-hover:bg-white/10 group-hover:text-white'}`}>
                    <Icon size={17} strokeWidth={2} />
                  </span>
                  <span class={`min-w-0 truncate transition ${collapsed ? 'lg:hidden lg:opacity-0' : 'opacity-100'}`}>{link.label}</span>
                  {#if active && !collapsed}
                    <span class="ml-auto h-1.5 w-1.5 rounded-full bg-goldfinch-gold"></span>
                  {/if}
                </a>
              {/each}
            </div>
          {/if}
        </section>
      {/each}
    </div>
  </nav>

  <div class="border-t border-white/10 p-3">
    <div class={`mb-2 rounded-2xl border border-white/10 bg-white/10 p-3 transition ${collapsed ? 'lg:grid lg:place-items-center lg:p-2' : ''}`}>
      <div class="flex min-w-0 items-center gap-3">
        <div class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-savanna text-xs font-bold text-deep-green">
          {initials(user?.name)}
        </div>
        <div class={`min-w-0 transition ${collapsed ? 'lg:hidden lg:opacity-0' : 'opacity-100'}`}>
          <p class="truncate text-sm font-semibold text-white">{user?.name || 'Admin User'}</p>
          <p class="truncate text-xs text-savanna/60">{user?.role || user?.email || 'Goldfinch CMS'}</p>
        </div>
      </div>
    </div>

    <button
      class={`flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-savanna/80 transition hover:bg-red-500/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goldfinch-gold/70 ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}
      type="button"
      title={collapsed ? 'Logout' : undefined}
      on:click={onLogout}
    >
      <span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10">
        <LogOut size={17} />
      </span>
      <span class={`transition ${collapsed ? 'lg:hidden lg:opacity-0' : 'opacity-100'}`}>Logout</span>
    </button>
  </div>
</aside>
