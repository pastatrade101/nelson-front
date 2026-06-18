<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { Check, Lock, Pencil, Save, ShieldCheck, X } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import RoleBadge from '$lib/components/admin/RoleBadge.svelte';
  import ToastStack from '$lib/components/admin/ToastStack.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';

  type Role = { permissions: string[]; role: string };
  type Toast = { id: string; message: string; type: 'error' | 'success' };

  let roles: Role[] = [];
  let allPermissions: string[] = [];
  let loading = true;
  let saving = false;
  let error = '';
  let currentRole = '';
  let toasts: Toast[] = [];

  let editingRole: null | string = null;
  let selected = new Set<string>();

  $: isSuperAdmin = currentRole === 'super_admin';
  $: permissionCount = allPermissions.length;

  // Group all permissions by their module prefix (e.g. "tours.create" → "tours").
  $: modules = (() => {
    const map = new Map<string, string[]>();
    for (const key of allPermissions) {
      const mod = key.split('.')[0];
      if (!map.has(mod)) map.set(mod, []);
      map.get(mod)?.push(key);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  })();

  const modLabel = (m: string) => m.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const permLabel = (k: string) => k.split('.')[1]?.replace(/_/g, ' ') ?? k;

  const showToast = (message: string, type: Toast['type'] = 'success') => {
    const id = crypto.randomUUID();
    toasts = [{ id, message, type }, ...toasts].slice(0, 4);
    setTimeout(() => { toasts = toasts.filter((t) => t.id !== id); }, 3500);
  };
  const dismissToast = (e: CustomEvent<string>) => { toasts = toasts.filter((t) => t.id !== e.detail); };

  const load = async () => {
    loading = true;
    error = '';
    try {
      const [rolesRes, permsRes] = await Promise.all([api.roles.list(), api.roles.permissions()]);
      roles = rolesRes.data;
      allPermissions = permsRes.data;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to load roles.';
    } finally {
      loading = false;
    }
  };

  const canEdit = (role: string) => isSuperAdmin && role !== 'super_admin';

  const openEdit = (role: Role) => {
    if (!canEdit(role.role)) return;
    editingRole = role.role;
    selected = new Set(role.permissions);
  };
  const closeEdit = () => { editingRole = null; selected = new Set(); };

  const toggle = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key); else next.add(key);
    selected = next;
  };

  const moduleState = (keys: string[]) => {
    const on = keys.filter((k) => selected.has(k)).length;
    return { all: on === keys.length, some: on > 0 && on < keys.length };
  };

  const toggleModule = (keys: string[]) => {
    const next = new Set(selected);
    const allOn = keys.every((k) => next.has(k));
    for (const k of keys) {
      if (allOn) next.delete(k); else next.add(k);
    }
    selected = next;
  };

  const save = async () => {
    if (!editingRole) return;
    saving = true;
    try {
      await api.roles.updatePermissions(editingRole, [...selected]);
      showToast('Role permissions updated. Changes take effect immediately.');
      closeEdit();
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to update permissions.', 'error');
    } finally {
      saving = false;
    }
  };

  onMount(() => {
    try {
      const u = JSON.parse(localStorage.getItem('admin_user') ?? 'null');
      currentRole = String(u?.role ?? '');
    } catch {
      currentRole = '';
    }
    load();
  });
</script>

<ToastStack {toasts} on:dismiss={dismissToast} />

<div class="mx-auto grid w-full max-w-[1500px] gap-6">
  <div class="rounded-[10px] border border-ink/10 bg-white/70 p-6 shadow-[0_18px_50px_rgba(15,47,36,0.06)]">
    <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Administration</p>
    <h1 class="mt-1 text-3xl font-bold text-ink">Roles &amp; Permissions</h1>
    <p class="mt-2 max-w-3xl text-sm leading-6 text-ink/62">
      Each role grants a set of permissions grouped by module. {#if isSuperAdmin}As a super admin, you can edit any role's permissions — changes apply immediately.{:else}Only a super admin can change role permissions.{/if}
    </p>
  </div>

  {#if loading}
    <LoadingState message="Loading roles..." />
  {:else if error}
    <ErrorState message={error} />
  {:else}
    <div class="grid gap-4 lg:grid-cols-2">
      {#each roles as role (role.role)}
        <article class="grid gap-4 rounded-[8px] border border-ink/10 bg-white p-5 shadow-[0_14px_44px_rgba(15,47,36,0.06)]">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <RoleBadge role={role.role} />
              {#if role.role === 'super_admin'}<span class="inline-flex items-center gap-1 text-xs font-semibold text-ink/45"><ShieldCheck size={13} />Full access</span>{/if}
            </div>
            <div class="flex items-center gap-3">
              <span class="text-sm font-semibold text-ink/60">{role.permissions.length} / {permissionCount}</span>
              {#if canEdit(role.role)}
                <button class="inline-flex h-9 items-center gap-1.5 rounded-xl border border-ink/10 bg-white px-3 text-xs font-semibold text-ink shadow-sm transition hover:border-goldfinch-gold/35 hover:bg-sand/70" type="button" on:click={() => openEdit(role)}><Pencil size={13} />Edit</button>
              {:else}
                <span class="inline-flex h-9 items-center gap-1.5 rounded-xl border border-ink/10 bg-sand/40 px-3 text-xs font-semibold text-ink/40"><Lock size={13} />Locked</span>
              {/if}
            </div>
          </div>

          <!-- permission preview grouped by module -->
          <div class="flex flex-wrap gap-1.5">
            {#each modules as [mod, keys]}
              {@const granted = keys.filter((k) => role.permissions.includes(k)).length}
              {#if granted > 0}
                <span class="inline-flex items-center gap-1 rounded-full bg-forest/[0.08] px-2.5 py-1 text-[11px] font-medium text-forest/90">{modLabel(mod)} <span class="text-forest/50">{granted}/{keys.length}</span></span>
              {/if}
            {/each}
            {#if role.permissions.length === 0}
              <span class="text-xs text-ink/40">No permissions assigned.</span>
            {/if}
          </div>
        </article>
      {/each}
    </div>
  {/if}
</div>

<!-- edit permissions modal -->
{#if editingRole}
  <div class="fixed inset-0 z-50 grid place-items-center bg-ink/45 p-4 backdrop-blur-sm" transition:fade={{ duration: 140 }}>
    <div class="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[10px] border border-ink/10 bg-white shadow-[0_24px_80px_rgba(15,47,36,0.18)]" transition:scale={{ duration: 160, start: 0.98 }}>
      <div class="flex items-start justify-between gap-4 border-b border-ink/10 bg-sand/30 p-5">
        <div class="flex items-center gap-3">
          <RoleBadge role={editingRole} />
          <div>
            <h2 class="text-lg font-bold text-ink">Edit permissions</h2>
            <p class="text-xs text-ink/55">{selected.size} of {permissionCount} permissions selected</p>
          </div>
        </div>
        <button class="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-ink/10 bg-white text-ink shadow-sm transition hover:bg-sand" type="button" aria-label="Close" on:click={closeEdit}><X size={18} /></button>
      </div>

      <div class="grid gap-4 overflow-y-auto p-5">
        {#each modules as [mod, keys]}
          {@const state = moduleState(keys)}
          <section class="rounded-2xl border border-ink/10 bg-white p-4">
            <button class="mb-3 flex w-full items-center justify-between gap-2 text-left" type="button" on:click={() => toggleModule(keys)}>
              <span class="text-sm font-bold text-ink">{modLabel(mod)}</span>
              <span class={`inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-[11px] font-bold ${state.all ? 'bg-forest text-white' : state.some ? 'bg-goldfinch-gold/20 text-deep-green' : 'bg-sand/70 text-ink/50'}`}>
                {#if state.all}<Check size={11} />All{:else if state.some}Partial{:else}None{/if}
              </span>
            </button>
            <div class="grid gap-2 sm:grid-cols-2">
              {#each keys as key}
                <label class="flex cursor-pointer items-center gap-2 rounded-xl border border-ink/10 px-3 py-2 text-sm capitalize transition hover:bg-sand/40">
                  <input class="h-4 w-4 accent-forest" type="checkbox" checked={selected.has(key)} on:change={() => toggle(key)} />
                  <span class="text-ink/80">{permLabel(key)}</span>
                </label>
              {/each}
            </div>
          </section>
        {/each}
      </div>

      <div class="flex flex-col-reverse gap-3 border-t border-ink/10 bg-sand/20 p-4 sm:flex-row sm:justify-end">
        <AdminButton variant="secondary" type="button" on:click={closeEdit}>Cancel</AdminButton>
        <AdminButton type="button" disabled={saving} on:click={save}><Save size={15} />{saving ? 'Saving...' : 'Save Permissions'}</AdminButton>
      </div>
    </div>
  </div>
{/if}
