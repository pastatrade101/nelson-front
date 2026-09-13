<script lang="ts">
  /**
   * The office side of the guest information form.
   *
   * Issues the private link, shows what the guest has filled in, and opens
   * passport copies through short-lived signed URLs.
   *
   * PASSPORT FILES ARE NEVER HELD IN THIS COMPONENT. The list only knows whether
   * a copy exists; clicking "Open" asks the server to mint a URL that expires in
   * two minutes and opens it in a new tab. Nothing durable is ever put on the
   * page, so a screenshot of this panel leaks nothing.
   */
  import { createEventDispatcher } from 'svelte';
  import { Copy, ExternalLink, Link2, Lock, LockOpen, RefreshCw, Trash2 } from '@lucide/svelte';
  import { api } from '$lib/api/client';

  export let bookingId: string;

  const dispatch = createEventDispatcher<{ toast: { message: string; type?: 'error' | 'success' } }>();
  const toast = (message: string, type: 'error' | 'success' = 'success') => dispatch('toast', { message, type });

  type Row = Record<string, any>;

  let loading = true;
  let submission: Row | null = null;
  let travellers: Row[] = [];
  let link = '';
  let linkExpires = '';
  let busy = false;

  const load = async () => {
    loading = true;
    try {
      const res = await api.guestDetails.forBooking(bookingId);
      submission = (res.data as Row)?.submission ?? null;
      travellers = ((res.data as Row)?.travellers as Row[]) ?? [];
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Unable to load guest details.', 'error');
    } finally {
      loading = false;
    }
  };

  $: if (bookingId) void load();

  const createLink = async () => {
    busy = true;
    try {
      const res = await api.guestDetails.createLink(bookingId);
      link = String((res.data as Row).url ?? '');
      linkExpires = String((res.data as Row).expiresAt ?? '');
      toast('Private link created. Any previous guest link has been revoked.');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Unable to create the link.', 'error');
    } finally {
      busy = false;
    }
  };

  const revokeLink = async () => {
    busy = true;
    try {
      await api.guestDetails.revokeLink(bookingId);
      link = '';
      toast('Link revoked. The guest can no longer open the form.');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Unable to revoke the link.', 'error');
    } finally {
      busy = false;
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast('Link copied. Send it to the guest directly — it opens their passport form.');
    } catch {
      toast('Could not copy automatically. Select the link and copy it manually.', 'error');
    }
  };

  const setLock = async (locked: boolean) => {
    busy = true;
    try {
      await api.guestDetails.setLock(bookingId, locked);
      await load();
      toast(locked ? 'Details locked — the guest can no longer edit.' : 'Details unlocked for editing.');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Unable to change the lock.', 'error');
    } finally {
      busy = false;
    }
  };

  /** Mint a 2-minute URL and open it. Never stored, never rendered as an href. */
  const openPassport = async (travellerId: string) => {
    try {
      const res = await api.guestDetails.documentUrl(travellerId);
      const url = String((res.data as Row).url ?? '');
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Unable to open that document.', 'error');
    }
  };

  const fmt = (v: unknown) => (typeof v === 'string' && v.trim() ? v : '—');
  const fmtDate = (v: unknown) => (typeof v === 'string' && v ? new Date(v).toLocaleDateString() : '—');
</script>

<section class="grid gap-4 border border-ink/10 bg-sand/20 p-5">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h3 class="text-base font-semibold text-ink">Guest information</h3>
      <p class="mt-1 text-sm text-ink/55">
        Passport and traveller details, collected from the guest through a private link.
      </p>
    </div>
    <div class="flex flex-wrap gap-2">
      <button
        class="inline-flex h-9 items-center gap-2 bg-forest px-3 text-sm font-semibold text-white transition hover:bg-deep-green disabled:opacity-50"
        type="button" disabled={busy} on:click={createLink}
      >
        {#if link}<RefreshCw size={14} />Reissue link{:else}<Link2 size={14} />Create private link{/if}
      </button>
      {#if submission}
        {#if submission.locked_at}
          <button class="inline-flex h-9 items-center gap-2 border border-ink/20 px-3 text-sm font-semibold text-ink transition hover:bg-ink/5 disabled:opacity-50" type="button" disabled={busy} on:click={() => setLock(false)}>
            <LockOpen size={14} /> Unlock
          </button>
        {:else}
          <button class="inline-flex h-9 items-center gap-2 border border-ink/20 px-3 text-sm font-semibold text-ink transition hover:bg-ink/5 disabled:opacity-50" type="button" disabled={busy} on:click={() => setLock(true)}>
            <Lock size={14} /> Lock
          </button>
        {/if}
      {/if}
    </div>
  </div>

  {#if link}
    <div class="grid gap-2 border border-forest/30 bg-forest/5 p-4">
      <p class="text-xs font-semibold uppercase tracking-wide text-forest">Send this to the guest</p>
      <div class="flex flex-wrap items-center gap-2">
        <input class="min-w-0 flex-1 border border-ink/15 bg-white px-3 py-2 font-mono text-xs text-ink" readonly value={link} />
        <button class="inline-flex h-9 items-center gap-2 border border-ink px-3 text-sm font-semibold text-ink transition hover:bg-ink hover:text-white" type="button" on:click={copyLink}>
          <Copy size={14} /> Copy
        </button>
        <button class="inline-flex h-9 items-center gap-2 p-2 text-sm text-red-600 transition hover:text-red-800" type="button" disabled={busy} on:click={revokeLink} aria-label="Revoke link">
          <Trash2 size={14} /> Revoke
        </button>
      </div>
      <p class="text-xs text-ink/55">
        Anyone holding this link can fill in the form, so send it to the guest directly rather than posting it
        anywhere shared.{#if linkExpires} It stops working on {new Date(linkExpires).toLocaleDateString()}.{/if}
      </p>
    </div>
  {/if}

  {#if loading}
    <p class="border border-dashed border-ink/20 px-4 py-6 text-center text-sm text-ink/55">Loading&hellip;</p>
  {:else if !submission}
    <p class="border border-dashed border-ink/20 px-4 py-6 text-center text-sm text-ink/55">
      Nothing submitted yet. Create a private link and send it to the guest.
    </p>
  {:else}
    <div class="grid gap-px border border-ink/10 bg-ink/10 sm:grid-cols-2">
      {#each [['Reference', fmt(submission.booking_reference)], ['Email', fmt(submission.lead_email)], ['Arrives', fmtDate(submission.arrival_date)], ['Departs', fmtDate(submission.departure_date)]] as [label, value]}
        <div class="bg-surface p-4">
          <p class="text-[10px] font-bold uppercase tracking-wider text-ink/45">{label}</p>
          <p class="mt-1 break-words text-sm text-heading">{value}</p>
        </div>
      {/each}
    </div>

    {#if submission.arrival_flight || submission.departure_flight}
      <div class="grid gap-px border border-ink/10 bg-ink/10 sm:grid-cols-2">
        <div class="bg-surface p-4">
          <p class="text-[10px] font-bold uppercase tracking-wider text-ink/45">Arrival flight</p>
          <p class="mt-1 text-sm text-heading">{fmt(submission.arrival_flight)}</p>
        </div>
        <div class="bg-surface p-4">
          <p class="text-[10px] font-bold uppercase tracking-wider text-ink/45">Departure flight</p>
          <p class="mt-1 text-sm text-heading">{fmt(submission.departure_flight)}</p>
        </div>
      </div>
    {/if}

    <div class="grid gap-3">
      <p class="text-xs font-bold uppercase tracking-wide text-ink/45">
        Travellers ({travellers.length})
        {#if submission.locked_at}<span class="ml-2 font-semibold text-clay">Locked</span>{/if}
      </p>

      {#each travellers as t (t.id)}
        <div class="grid gap-3 border border-ink/10 bg-surface p-4">
          <div class="flex flex-wrap items-baseline justify-between gap-2">
            <span class="font-serif text-lg font-light text-heading">{fmt(t.full_name)}</span>
            <span class="text-xs text-ink/50">{fmt(t.nationality)} &middot; born {fmtDate(t.date_of_birth)} &middot; {fmt(t.gender)}</span>
          </div>

          <div class="grid gap-px border border-ink/10 bg-ink/10 sm:grid-cols-2">
            <div class="bg-surface p-3">
              <p class="text-[10px] font-bold uppercase tracking-wider text-ink/45">Passport no.</p>
              <p class="mt-1 break-all font-mono text-sm text-heading">{fmt(t.passport_number)}</p>
            </div>
            <div class="bg-surface p-3">
              <p class="text-[10px] font-bold uppercase tracking-wider text-ink/45">Issued by</p>
              <p class="mt-1 text-sm text-heading">{fmt(t.passport_country)}</p>
            </div>
            <div class="bg-surface p-3">
              <p class="text-[10px] font-bold uppercase tracking-wider text-ink/45">Expires</p>
              <p class="mt-1 text-sm text-heading">{fmtDate(t.passport_expiry)}</p>
            </div>
          </div>

          {#if t.dietary || t.medical || t.notes}
            <div class="grid gap-2 text-sm leading-6 text-ink/70">
              {#if t.dietary}<p><span class="font-semibold text-ink">Dietary:</span> {t.dietary}</p>{/if}
              {#if t.medical}<p><span class="font-semibold text-ink">Medical:</span> {t.medical}</p>{/if}
              {#if t.notes}<p><span class="font-semibold text-ink">Notes:</span> {t.notes}</p>{/if}
            </div>
          {/if}

          {#if t.has_passport_copy}
            <button class="inline-flex w-fit items-center gap-2 border border-ink px-3 py-2 text-xs font-semibold text-ink transition hover:bg-ink hover:text-white" type="button" on:click={() => openPassport(String(t.id))}>
              <ExternalLink size={13} /> Open passport copy
            </button>
          {:else}
            <p class="text-xs text-ink/45">No passport copy uploaded.</p>
          {/if}
        </div>
      {/each}
    </div>

    {#if submission.emergency_name}
      <div class="border border-ink/10 bg-surface p-4">
        <p class="text-[10px] font-bold uppercase tracking-wider text-ink/45">Emergency contact</p>
        <p class="mt-1 text-sm text-heading">
          {fmt(submission.emergency_name)}{#if submission.emergency_relationship} ({submission.emergency_relationship}){/if}
          &middot; {fmt(submission.emergency_phone)}{#if submission.emergency_email} &middot; {submission.emergency_email}{/if}
        </p>
      </div>
    {/if}
  {/if}
</section>
