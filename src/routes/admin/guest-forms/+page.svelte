<script lang="ts">
  /**
   * Guest information forms.
   *
   * Every form the office has issued, in one place, plus a Create button. A form
   * does NOT need a booking behind it: passport details are usually wanted before
   * anyone creates the booking row, because lodges and flights cannot be held
   * without them. A form created here stands alone under a label the office
   * types; one created from a booking's drawer stays tied to that booking.
   */
  import { onMount } from 'svelte';
  import { Copy, ExternalLink, Link2, Lock, LockOpen, Plus, RefreshCw, Users, X } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminFormInput from '$lib/components/admin/AdminFormInput.svelte';

  type Row = Record<string, any>;

  let rows: Row[] = [];
  let loading = true;
  let error = '';
  let busy = false;

  let toasts: { id: string; message: string; type: 'error' | 'success' }[] = [];
  const toast = (message: string, type: 'error' | 'success' = 'success') => {
    const id = crypto.randomUUID();
    toasts = [...toasts, { id, message, type }];
    setTimeout(() => (toasts = toasts.filter((t) => t.id !== id)), 5000);
  };

  const load = async () => {
    loading = true;
    error = '';
    try {
      const res = await api.guestDetails.listForms();
      rows = ((res.data as Row).items as Row[]) ?? [];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to load guest forms.';
    } finally {
      loading = false;
    }
  };
  onMount(load);

  // ── Create ───────────────────────────────────────────────────────────────
  let createOpen = false;
  let draft = { label: '', lead_email: '', booking_reference: '' };
  /** The link for the form just created, shown once so it can be copied. */
  let freshLink = '';

  const openCreate = () => {
    draft = { label: '', lead_email: '', booking_reference: '' };
    freshLink = '';
    createOpen = true;
  };

  const create = async () => {
    if (!draft.label.trim()) {
      toast('Give the form a name so you can find it later.', 'error');
      return;
    }
    busy = true;
    try {
      const res = await api.guestDetails.createForm(draft);
      freshLink = String((res.data as Row).url ?? '');
      await load();
      toast('Form created. Copy the link and send it to the guest.');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Unable to create the form.', 'error');
    } finally {
      busy = false;
    }
  };

  // ── Per-row actions ──────────────────────────────────────────────────────
  /** submission id -> its freshly issued link, shown inline until the page reloads. */
  let links: Record<string, string> = {};

  const issueLink = async (row: Row) => {
    busy = true;
    try {
      const res = row.booking_id
        ? await api.guestDetails.createLink(String(row.booking_id))
        : await api.guestDetails.createFormLink(String(row.id));
      links = { ...links, [String(row.id)]: String((res.data as Row).url ?? '') };
      toast('Link issued. Any previous link for this form has been revoked.');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Unable to issue a link.', 'error');
    } finally {
      busy = false;
    }
  };

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast('Link copied — send it straight to the guest.');
    } catch {
      toast('Could not copy automatically. Select the link and copy it.', 'error');
    }
  };

  const toggleLock = async (row: Row) => {
    busy = true;
    const lock = !row.locked_at;
    try {
      if (row.booking_id) await api.guestDetails.setLock(String(row.booking_id), lock);
      else await api.guestDetails.setFormLock(String(row.id), lock);
      await load();
      toast(lock ? 'Locked — the guest can no longer edit.' : 'Unlocked for editing.');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Unable to change the lock.', 'error');
    } finally {
      busy = false;
    }
  };

  const nameOf = (row: Row): string =>
    row.label || row.booking_requests?.full_name || row.booking_reference || 'Untitled form';
  const fmtDate = (v: unknown) => (typeof v === 'string' && v ? new Date(v).toLocaleDateString() : '—');
</script>

<svelte:head><title>Guest forms — Emnel CMS</title></svelte:head>

<div class="grid gap-5">
  <div class="flex flex-wrap items-end justify-between gap-4">
    <div>
      <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">Booking management</p>
      <h1 class="mt-1 text-2xl font-bold text-ink">Guest forms</h1>
      <p class="mt-1 max-w-2xl text-sm text-ink/55">
        Passport and traveller details, collected through a private link. A form does not need a booking —
        create one here whenever you need details before the booking exists.
      </p>
    </div>
    <AdminButton type="button" on:click={openCreate}><Plus size={16} /> New guest form</AdminButton>
  </div>

  {#if loading}
    <p class="border border-dashed border-ink/20 px-4 py-10 text-center text-sm text-ink/55">Loading&hellip;</p>
  {:else if error}
    <p class="border border-red-300 bg-red-50 px-4 py-4 text-sm text-red-800">{error}</p>
  {:else if !rows.length}
    <div class="border border-dashed border-ink/20 px-6 py-12 text-center">
      <p class="text-sm text-ink/55">No guest forms yet.</p>
      <p class="mt-1 text-sm text-ink/45">Create one and send the link to your guest.</p>
    </div>
  {:else}
    <div class="grid gap-3">
      {#each rows as row (row.id)}
        <div class="grid gap-3 border border-ink/10 bg-surface p-4">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="font-serif text-lg font-light text-heading">{nameOf(row)}</p>
              <p class="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink/55">
                {#if row.booking_requests?.booking_code}
                  <span class="font-semibold text-forest">{row.booking_requests.booking_code}</span>
                {:else}
                  <span class="border border-ink/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-ink/50">No booking</span>
                {/if}
                {#if row.lead_email}<span>{row.lead_email}</span>{/if}
                <span class="inline-flex items-center gap-1"><Users size={12} /> {row.traveller_count} traveller{row.traveller_count === 1 ? '' : 's'}</span>
                <span>Created {fmtDate(row.created_at)}</span>
                {#if row.submitted_at}<span class="font-semibold text-forest">Submitted {fmtDate(row.submitted_at)}</span>{/if}
                {#if row.locked_at}<span class="font-semibold text-clay">Locked</span>{/if}
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              <button class="inline-flex h-9 items-center gap-2 bg-forest px-3 text-sm font-semibold text-white transition hover:bg-deep-green disabled:opacity-50" type="button" disabled={busy} on:click={() => issueLink(row)}>
                {#if links[row.id]}<RefreshCw size={14} /> Reissue{:else}<Link2 size={14} /> Get link{/if}
              </button>
              <button class="inline-flex h-9 items-center gap-2 border border-ink/20 px-3 text-sm font-semibold text-ink transition hover:bg-ink/5 disabled:opacity-50" type="button" disabled={busy} on:click={() => toggleLock(row)}>
                {#if row.locked_at}<LockOpen size={14} /> Unlock{:else}<Lock size={14} /> Lock{/if}
              </button>
            </div>
          </div>

          {#if links[row.id]}
            <div class="flex flex-wrap items-center gap-2 border border-forest/30 bg-forest/5 p-3">
              <input class="min-w-0 flex-1 border border-ink/15 bg-white px-3 py-2 font-mono text-xs text-ink" readonly value={links[row.id]} />
              <button class="inline-flex h-9 items-center gap-2 border border-ink px-3 text-sm font-semibold text-ink transition hover:bg-ink hover:text-white" type="button" on:click={() => copy(links[row.id])}>
                <Copy size={14} /> Copy
              </button>
              <a class="inline-flex h-9 items-center gap-2 px-2 text-sm text-ink/60 transition hover:text-ink" href={links[row.id]} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={14} /> Preview
              </a>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- ── Create ─────────────────────────────────────────────────────────────── -->
{#if createOpen}
  <div class="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4 backdrop-blur-sm">
    <div class="w-full max-w-lg border border-ink/10 bg-surface p-6">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">New guest form</p>
          <h2 class="mt-1 text-xl font-bold text-ink">Collect guest details</h2>
        </div>
        <button class="grid h-9 w-9 place-items-center border border-ink/10 text-ink/60 transition hover:text-ink" type="button" on:click={() => (createOpen = false)} aria-label="Close">
          <X size={17} />
        </button>
      </div>

      {#if freshLink}
        <div class="mt-5 grid gap-2 border border-forest/30 bg-forest/5 p-4">
          <p class="text-xs font-semibold uppercase tracking-wide text-forest">Send this to the guest</p>
          <input class="w-full border border-ink/15 bg-white px-3 py-2 font-mono text-xs text-ink" readonly value={freshLink} />
          <div class="flex flex-wrap gap-2">
            <button class="inline-flex h-9 items-center gap-2 border border-ink px-3 text-sm font-semibold text-ink transition hover:bg-ink hover:text-white" type="button" on:click={() => copy(freshLink)}>
              <Copy size={14} /> Copy link
            </button>
            <a class="inline-flex h-9 items-center gap-2 px-3 text-sm text-ink/60 transition hover:text-ink" href={freshLink} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={14} /> Preview
            </a>
          </div>
          <p class="text-xs text-ink/55">
            Anyone with this link can fill in the form, so send it to the guest directly rather than posting it
            anywhere shared.
          </p>
        </div>
        <div class="mt-5 flex justify-end">
          <AdminButton type="button" on:click={() => (createOpen = false)}>Done</AdminButton>
        </div>
      {:else}
        <div class="mt-5 grid gap-4">
          <AdminFormInput
            label="Name this form"
            name="label"
            bind:value={draft.label}
            required
            placeholder="Miller family, November 2026"
          />
          <p class="-mt-2 text-xs text-ink/50">Only you see this. It is how you will find the form later.</p>

          <AdminFormInput label="Guest email (optional)" name="lead_email" bind:value={draft.lead_email} placeholder="guest@example.com" />
          <AdminFormInput label="Your reference (optional)" name="booking_reference" bind:value={draft.booking_reference} placeholder="#2026-0000" />
        </div>
        <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <AdminButton variant="secondary" type="button" on:click={() => (createOpen = false)}>Cancel</AdminButton>
          <AdminButton type="button" disabled={busy} on:click={create}>
            {busy ? 'Creating…' : 'Create and get link'}
          </AdminButton>
        </div>
      {/if}
    </div>
  </div>
{/if}

{#if toasts.length}
  <div class="fixed bottom-5 right-5 z-[60] grid gap-2">
    {#each toasts as t (t.id)}
      <div class="border px-4 py-3 text-sm shadow-soft {t.type === 'error' ? 'border-red-300 bg-red-50 text-red-800' : 'border-forest/30 bg-forest/5 text-forest'}">
        {t.message}
      </div>
    {/each}
  </div>
{/if}
