<script lang="ts">
  import { onMount } from 'svelte';
  import { scale } from 'svelte/transition';
  import { Bell, ChevronDown, LogOut, Mail, Menu, Moon, PanelLeftClose, PanelLeftOpen, ShieldCheck, Sun } from '@lucide/svelte';
  import { theme, toggleTheme } from '$lib/theme';

  type AdminUser = {
    avatar_url?: string;
    email?: string;
    full_name?: string;
    name?: string;
    role?: string;
  };

  export let collapsed = false;
  export let onLogout: () => void = () => {};
  export let onOpenMobile: () => void = () => {};
  export let onToggleDesktop: () => void = () => {};
  export let title = 'Dashboard';
  export let user: AdminUser | null = null;

  let profileOpen = false;

  $: displayName = user?.full_name || user?.name || 'Admin User';
  $: displayEmail = user?.email || 'Goldfinch Travel Platform';
  $: roleLabel = (user?.role || 'CMS user').replaceAll('_', ' ');
  $: initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'A';

  onMount(() => {
    const closeProfileMenu = () => {
      profileOpen = false;
    };

    document.addEventListener('click', closeProfileMenu);

    return () => {
      document.removeEventListener('click', closeProfileMenu);
    };
  });
</script>

<header class="sticky top-0 z-30 border-b border-ink/[0.08] bg-surface">
  <div class="flex h-[68px] items-center justify-between gap-3 px-4 sm:px-6">
    <div class="flex min-w-0 items-center gap-3">
      <button class="grid h-11 w-11 place-items-center rounded-2xl border border-ink/10 bg-surface text-ink shadow-sm transition hover:border-goldfinch-gold/40 hover:bg-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/30 lg:hidden" type="button" aria-label="Open sidebar" on:click={onOpenMobile}>
        <Menu size={19} />
      </button>

      <button class="hidden h-11 w-11 place-items-center rounded-2xl border border-ink/10 bg-surface text-ink/70 shadow-sm transition hover:border-goldfinch-gold/40 hover:bg-sand hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/30 lg:grid" type="button" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} on:click={onToggleDesktop}>
        {#if collapsed}
          <PanelLeftOpen size={19} />
        {:else}
          <PanelLeftClose size={19} />
        {/if}
      </button>

      <div class="min-w-0">
        <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Goldfinch CMS</p>
        <h1 class="truncate text-lg font-bold tracking-normal text-ink sm:text-xl">{title}</h1>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <button
        class="grid h-11 w-11 place-items-center rounded-2xl border border-ink/10 bg-surface text-ink/70 shadow-sm transition hover:border-goldfinch-gold/40 hover:bg-sand hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/30"
        type="button"
        on:click={toggleTheme}
        aria-label={$theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        title={$theme === 'dark' ? 'Light mode' : 'Dark mode'}
      >
        {#if $theme === 'dark'}<Sun size={18} />{:else}<Moon size={18} />{/if}
      </button>

      <button class="hidden h-11 w-11 place-items-center rounded-2xl border border-ink/10 bg-surface text-ink/70 shadow-sm transition hover:border-goldfinch-gold/40 hover:bg-sand hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/30 sm:grid" type="button" aria-label="Notifications">
        <Bell size={18} />
      </button>

      <div class="relative">
        <button
          class="inline-flex h-11 items-center gap-2 rounded-full border border-ink/10 bg-surface py-1 pl-1 pr-2 text-sm font-semibold text-ink shadow-sm transition hover:border-goldfinch-gold/45 hover:bg-sand/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/25"
          type="button"
          aria-label="Open profile menu"
          aria-expanded={profileOpen}
          on:click|stopPropagation={() => (profileOpen = !profileOpen)}
        >
          <span class="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-forest to-deep-green text-xs font-bold uppercase text-white ring-2 ring-goldfinch-gold/35">
            {#if user?.avatar_url}
              <img class="h-full w-full object-cover" src={user.avatar_url} alt={displayName} />
            {:else}
              {initials}
            {/if}
          </span>
          <span class="hidden max-w-[140px] truncate text-left sm:block">{displayName}</span>
          <ChevronDown class={`hidden text-ink/45 transition sm:block ${profileOpen ? 'rotate-180' : ''}`} size={15} />
        </button>

        {#if profileOpen}
          <div
            class="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-[8px] border border-ink/10 bg-surface shadow-[0_24px_70px_rgba(15,47,36,0.18)]"
            transition:scale={{ duration: 140, start: 0.97 }}
          >
            <div class="bg-gradient-to-br from-deep-green via-forest to-deep-green p-4 text-white">
              <div class="flex items-center gap-3">
                <div class="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-surface/12 text-sm font-bold uppercase ring-1 ring-goldfinch-gold/50">
                  {#if user?.avatar_url}
                    <img class="h-full w-full object-cover" src={user.avatar_url} alt={displayName} />
                  {:else}
                    {initials}
                  {/if}
                </div>
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold">{displayName}</p>
                  <p class="mt-0.5 truncate text-xs text-white/65">Goldfinch CMS</p>
                </div>
              </div>
            </div>

            <div class="grid gap-2 p-3">
              <div class="flex items-center gap-3 rounded-2xl bg-sand/45 px-3 py-2.5">
                <Mail size={16} class="shrink-0 text-forest" />
                <div class="min-w-0">
                  <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/45">Email</p>
                  <p class="truncate text-sm font-semibold text-ink">{displayEmail}</p>
                </div>
              </div>

              <div class="flex items-center gap-3 rounded-2xl bg-sand/45 px-3 py-2.5">
                <ShieldCheck size={16} class="shrink-0 text-forest" />
                <div class="min-w-0">
                  <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/45">Role</p>
                  <p class="truncate text-sm font-semibold capitalize text-ink">{roleLabel}</p>
                </div>
              </div>

              <button
                class="mt-1 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-surface text-sm font-semibold text-red-700 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
                type="button"
                on:click={onLogout}
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
</header>
