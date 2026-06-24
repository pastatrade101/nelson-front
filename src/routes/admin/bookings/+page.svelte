<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import {
    CalendarDays,
    ClipboardList,
    Edit,
    Eye,
    Mail,
    Phone,
    Plus,
    Save,
    Search,
    Trash2,
    User,
    Users,
    X
  } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminEmptyState from '$lib/components/admin/AdminEmptyState.svelte';
  import AdminFormInput from '$lib/components/admin/AdminFormInput.svelte';
  import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
  import AdminSelect from '$lib/components/admin/AdminSelect.svelte';
  import AdminTextArea from '$lib/components/admin/AdminTextArea.svelte';
  import AdminToolbar from '$lib/components/admin/AdminToolbar.svelte';
  import ConfirmModal from '$lib/components/admin/ConfirmModal.svelte';
  import ToastStack from '$lib/components/admin/ToastStack.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';

  type Option = { label: string; value: string };
  type Toast = { id: string; message: string; type: 'error' | 'success' };
  type Booking = Record<string, unknown> & {
    booking_code: string;
    email: string;
    full_name: string;
    id: string;
    payment_status: string;
    source: string;
    status: string;
  };

  const statusMeta: Record<string, { chip: string; label: string }> = {
    pending: { label: 'Pending', chip: 'bg-goldfinch-gold/20 text-heading ring-goldfinch-gold/30' },
    contacted: { label: 'Contacted', chip: 'bg-sky-50 text-sky-700 ring-sky-200/70' },
    itinerary_sent: { label: 'Itinerary Sent', chip: 'bg-indigo-50 text-indigo-700 ring-indigo-200/70' },
    negotiating: { label: 'Negotiating', chip: 'bg-amber-50 text-amber-700 ring-amber-200/70' },
    confirmed: { label: 'Confirmed', chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200/70' },
    completed: { label: 'Completed', chip: 'bg-forest/10 text-forest ring-forest/20' },
    cancelled: { label: 'Cancelled', chip: 'bg-slate-100 text-slate-600 ring-slate-200' },
    rejected: { label: 'Rejected', chip: 'bg-red-50 text-red-600 ring-red-200/70' }
  };

  const paymentMeta: Record<string, { chip: string; label: string }> = {
    unpaid: { label: 'Unpaid', chip: 'bg-slate-100 text-slate-600 ring-slate-200' },
    partially_paid: { label: 'Partially paid', chip: 'bg-amber-50 text-amber-700 ring-amber-200/70' },
    paid: { label: 'Paid', chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200/70' },
    refunded: { label: 'Refunded', chip: 'bg-sky-50 text-sky-700 ring-sky-200/70' },
    failed: { label: 'Failed', chip: 'bg-red-50 text-red-600 ring-red-200/70' }
  };

  const statusOptions: Option[] = Object.entries(statusMeta).map(([value, m]) => ({ value, label: m.label }));
  const paymentOptions: Option[] = Object.entries(paymentMeta).map(([value, m]) => ({ value, label: m.label }));
  const sourceLabels: Record<string, string> = {
    website_booking_form: 'Website',
    plan_my_trip: 'Plan My Trip',
    ai_handoff: 'AI Advisor',
    whatsapp: 'WhatsApp',
    admin_created: 'Admin',
    hubspot_import: 'HubSpot'
  };
  const sourceOptions: Option[] = Object.entries(sourceLabels).map(([value, label]) => ({ value, label }));
  const currencyOptions: Option[] = ['USD', 'EUR', 'GBP', 'TZS', 'KES'].map((v) => ({ label: v, value: v }));

  let rows: Booking[] = [];
  let tourOptions: Option[] = [{ label: 'No tour (general request)', value: '' }];
  let tourFilterOptions: Option[] = [{ label: 'All tours', value: 'all' }];
  let userMap: Record<string, string> = {};
  let assignOptions: Option[] = [{ label: 'Unassigned', value: '' }];
  let assignFilterOptions: Option[] = [{ label: 'All assignees', value: 'all' }];
  let kpis = { total: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0, unpaid: 0 };

  let loading = true;
  let saving = false;
  let deleting = false;
  let savingNotes = false;
  let error = '';

  let search = '';
  let statusFilter = 'all';
  let paymentFilter = 'all';
  let tourFilter = 'all';
  let assignFilter = 'all';
  let sourceFilter = 'all';
  let dateFrom = '';
  let dateTo = '';

  let viewing: Booking | null = null;
  let confirmOpen = false;
  let toDelete: Booking | null = null;
  let notesDraft = '';
  let toasts: Toast[] = [];

  let formOpen = false;
  let editingId: null | string = null;
  const emptyForm = () => ({
    tour_id: '',
    full_name: '',
    email: '',
    phone: '',
    country: '',
    travel_date: '',
    number_of_adults: '2',
    number_of_children: '0',
    estimated_amount: '',
    currency: 'USD',
    status: 'pending',
    payment_status: 'unpaid',
    source: 'admin_created',
    special_requests: '',
    message: '',
    admin_notes: '',
    assigned_to: ''
  });
  let form = emptyForm();

  const showToast = (message: string, type: Toast['type'] = 'success') => {
    const id = crypto.randomUUID();
    toasts = [{ id, message, type }, ...toasts].slice(0, 4);
    setTimeout(() => { toasts = toasts.filter((t) => t.id !== id); }, 3500);
  };
  const dismissToast = (e: CustomEvent<string>) => { toasts = toasts.filter((t) => t.id !== e.detail); };

  const fmtDate = (v?: unknown) => (v ? new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(String(v))) : '—');
  const fmtDateTime = (v?: unknown) => (v ? new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(String(v))) : '—');
  const money = (amount: unknown, currency = 'USD') => `${currency} ${Number(amount ?? 0).toLocaleString()}`;
  const tourTitle = (b: Booking) => {
    const t = b.tours as Record<string, unknown> | null;
    return t && typeof t === 'object' ? String(t.title ?? '') : '';
  };
  const assigneeName = (id?: unknown) => (id && userMap[String(id)]) || '';
  const leadContext = (b: Booking | null) => (b?.lead_context && typeof b.lead_context === 'object' ? (b.lead_context as Record<string, unknown>) : {});

  const queryParams = () => ({
    search,
    status: statusFilter,
    payment_status: paymentFilter,
    tour_id: tourFilter,
    assigned_to: assignFilter,
    source: sourceFilter,
    created_from: dateFrom || undefined,
    created_to: dateTo || undefined,
    limit: 200
  });

  const loadBookings = async () => {
    loading = true;
    error = '';
    try {
      const res = await api.bookings.list(queryParams());
      rows = res.data.items as Booking[];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to load bookings.';
    } finally {
      loading = false;
    }
  };

  const loadKpis = async () => {
    try {
      const [stats, unpaid] = await Promise.all([
        api.dashboard.stats(),
        api.bookings.list({ payment_status: 'unpaid', limit: 1 })
      ]);
      const s = stats.data as Record<string, any>;
      kpis = {
        total: s?.counts?.totalBookings ?? 0,
        pending: s?.bookingPipeline?.pending ?? 0,
        confirmed: s?.bookingPipeline?.confirmed ?? 0,
        completed: s?.bookingPipeline?.completed ?? 0,
        cancelled: (s?.bookingPipeline?.cancelled ?? 0) + (s?.bookingPipeline?.rejected ?? 0),
        unpaid: unpaid.data.pagination?.total ?? 0
      };
    } catch {
      // keep zeros — never break the page
    }
  };

  const loadOptions = async () => {
    try {
      const [tours, users] = await Promise.all([
        api.tours.list({ status: 'all', limit: 200 }),
        api.users.list({ limit: 200 })
      ]);
      const tourOpts = tours.data.items.map((t) => ({ label: String(t.title ?? t.slug ?? 'Untitled'), value: String(t.id) }));
      tourOptions = [{ label: 'No tour (general request)', value: '' }, ...tourOpts];
      tourFilterOptions = [{ label: 'All tours', value: 'all' }, ...tourOpts];

      const userItems = users.data.items as Record<string, unknown>[];
      userMap = {};
      for (const u of userItems) userMap[String(u.id)] = String(u.full_name ?? u.email ?? 'Admin');
      const userOpts = userItems.map((u) => ({ label: String(u.full_name ?? u.email ?? 'Admin'), value: String(u.id) }));
      assignOptions = [{ label: 'Unassigned', value: '' }, ...userOpts];
      assignFilterOptions = [{ label: 'All assignees', value: 'all' }, ...userOpts];
    } catch {
      // optional — assignment/tour filters degrade gracefully
    }
  };

  const refresh = async () => {
    await Promise.all([loadBookings(), loadKpis()]);
  };

  const clearFilters = () => {
    search = '';
    statusFilter = 'all';
    paymentFilter = 'all';
    tourFilter = 'all';
    assignFilter = 'all';
    sourceFilter = 'all';
    dateFrom = '';
    dateTo = '';
    loadBookings();
  };

  const openView = async (b: Booking) => {
    viewing = b;
    notesDraft = String(b.admin_notes ?? '');
    // Enrich with full detail (payment summary, destination, AI context) from GET /:id.
    try {
      const res = await api.bookings.get(b.id);
      viewing = res.data as Booking;
      notesDraft = String((res.data as Booking).admin_notes ?? '');
    } catch {
      // keep the lighter list row if detail fetch fails
    }
  };
  const closeView = () => { viewing = null; };

  const openCreate = () => { editingId = null; form = emptyForm(); formOpen = true; };

  const openEdit = (b: Booking) => {
    editingId = b.id;
    form = {
      tour_id: String(b.tour_id ?? ''),
      full_name: String(b.full_name ?? ''),
      email: String(b.email ?? ''),
      phone: String(b.phone ?? ''),
      country: String(b.country ?? ''),
      travel_date: b.travel_date ? String(b.travel_date).slice(0, 10) : '',
      number_of_adults: String(b.number_of_adults ?? 1),
      number_of_children: String(b.number_of_children ?? 0),
      estimated_amount: b.estimated_amount == null ? '' : String(b.estimated_amount),
      currency: String(b.currency ?? 'USD'),
      status: String(b.status ?? 'pending'),
      payment_status: String(b.payment_status ?? 'unpaid'),
      source: String(b.source ?? 'admin_created'),
      special_requests: String(b.special_requests ?? ''),
      message: String(b.message ?? ''),
      admin_notes: String(b.admin_notes ?? ''),
      assigned_to: String(b.assigned_to ?? '')
    };
    viewing = null;
    formOpen = true;
  };

  const closeForm = () => { formOpen = false; editingId = null; form = emptyForm(); };

  const payload = () => ({
    tour_id: form.tour_id || null,
    full_name: form.full_name.trim(),
    email: form.email.trim(),
    phone: form.phone.trim() || null,
    country: form.country.trim() || null,
    travel_date: form.travel_date || null,
    number_of_adults: Number(form.number_of_adults) || 1,
    number_of_children: Number(form.number_of_children) || 0,
    estimated_amount: form.estimated_amount === '' ? null : Number(form.estimated_amount),
    currency: form.currency || 'USD',
    status: form.status,
    payment_status: form.payment_status,
    source: form.source,
    special_requests: form.special_requests.trim() || null,
    message: form.message.trim() || null,
    admin_notes: form.admin_notes.trim() || null,
    assigned_to: form.assigned_to || null
  });

  const save = async () => {
    if (!form.full_name.trim() || !form.email.trim()) {
      showToast('Full name and email are required.', 'error');
      return;
    }
    saving = true;
    try {
      if (editingId) {
        await api.bookings.update(editingId, payload());
        showToast('Booking updated successfully.');
      } else {
        await api.bookings.create(payload());
        showToast('Booking created successfully.');
      }
      closeForm();
      await refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to save booking.', 'error');
    } finally {
      saving = false;
    }
  };

  const changeStatus = async (event: Event) => {
    if (!viewing) return;
    const status = (event.target as HTMLSelectElement).value;
    try {
      const res = await api.bookings.updateStatus(viewing.id, { status });
      const updated = res.data as Booking;
      rows = rows.map((r) => (r.id === updated.id ? updated : r));
      viewing = updated;
      showToast(`Status set to ${statusMeta[status]?.label ?? status}.`);
      loadKpis();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to update status.', 'error');
    }
  };

  const assign = async (event: Event) => {
    if (!viewing) return;
    const value = (event.target as HTMLSelectElement).value;
    try {
      const res = await api.bookings.assign(viewing.id, { assigned_to: value || null });
      const updated = res.data as Booking;
      rows = rows.map((r) => (r.id === updated.id ? updated : r));
      viewing = updated;
      showToast(value ? `Assigned to ${userMap[value] ?? 'admin'}.` : 'Unassigned.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to assign booking.', 'error');
    }
  };

  const saveNotes = async () => {
    if (!viewing) return;
    savingNotes = true;
    try {
      const res = await api.bookings.updateNotes(viewing.id, { admin_notes: notesDraft.trim() || null });
      const updated = res.data as Booking;
      rows = rows.map((r) => (r.id === updated.id ? updated : r));
      viewing = updated;
      showToast('Notes saved.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to save notes.', 'error');
    } finally {
      savingNotes = false;
    }
  };

  const openDelete = (b: Booking) => { toDelete = b; confirmOpen = true; };
  const confirmDelete = async () => {
    if (!toDelete) return;
    deleting = true;
    try {
      await api.bookings.remove(toDelete.id);
      showToast('Booking archived.');
      if (viewing?.id === toDelete.id) viewing = null;
      confirmOpen = false;
      toDelete = null;
      await refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to delete booking.', 'error');
    } finally {
      deleting = false;
    }
  };

  onMount(async () => {
    await Promise.all([loadBookings(), loadKpis(), loadOptions()]);
  });
</script>

<ToastStack {toasts} on:dismiss={dismissToast} />

<div class="mx-auto grid w-full max-w-[1500px] gap-6">
  <AdminPageHeader
    eyebrow="Booking Management"
    title="Booking Requests"
    description="Manage traveler enquiries, trip requests, status, assignments, and booking progress."
    actionLabel="Create Booking Request"
    actionIcon={Plus}
    on:action={openCreate}
  />

  <div class="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
    {#each [['Total', kpis.total, 'text-ink'], ['Pending', kpis.pending, 'text-goldfinch-gold'], ['Confirmed', kpis.confirmed, 'text-emerald-600'], ['Completed', kpis.completed, 'text-forest'], ['Cancelled / Rejected', kpis.cancelled, 'text-slate-500'], ['Unpaid', kpis.unpaid, 'text-red-500']] as [label, value, tone]}
      <div class="rounded-2xl border border-ink/10 bg-surface p-4 shadow-sm">
        <p class="text-xs font-semibold text-ink/50">{label}</p>
        <p class={`mt-1 text-2xl font-extrabold ${tone}`}>{value}</p>
      </div>
    {/each}
  </div>

  <AdminToolbar className="grid gap-3 lg:grid-cols-[1fr_150px_150px_auto] lg:items-end">
    <label class="grid gap-2 text-sm font-medium text-ink">
      <span>Search</span>
      <span class="flex h-11 items-center gap-2 rounded-2xl border border-ink/10 bg-surface px-3 shadow-sm transition focus-within:border-forest/45 focus-within:ring-2 focus-within:ring-forest/10">
        <Search size={16} class="text-ink/45" />
        <input class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink/35" bind:value={search} placeholder="Code, name, email, phone, country, message..." on:keydown={(e) => e.key === 'Enter' && loadBookings()} />
      </span>
    </label>
    <AdminSelect label="Status" name="status_filter" bind:value={statusFilter} options={[{ label: 'All statuses', value: 'all' }, ...statusOptions]} />
    <AdminSelect label="Payment" name="payment_filter" bind:value={paymentFilter} options={[{ label: 'All payments', value: 'all' }, ...paymentOptions]} />
    <AdminButton variant="secondary" on:click={loadBookings}>Apply</AdminButton>
  </AdminToolbar>

  <AdminToolbar className="grid gap-3 lg:grid-cols-[repeat(3,1fr)_140px_140px_auto] lg:items-end">
    <AdminSelect label="Tour" name="tour_filter" bind:value={tourFilter} options={tourFilterOptions} />
    <AdminSelect label="Assigned to" name="assign_filter" bind:value={assignFilter} options={assignFilterOptions} />
    <AdminSelect label="Source" name="source_filter" bind:value={sourceFilter} options={[{ label: 'All sources', value: 'all' }, ...sourceOptions]} />
    <AdminFormInput label="From" name="date_from" type="date" bind:value={dateFrom} />
    <AdminFormInput label="To" name="date_to" type="date" bind:value={dateTo} />
    <div class="flex gap-2">
      <AdminButton variant="secondary" on:click={loadBookings}>Filter</AdminButton>
      <button class="inline-flex h-11 items-center rounded-2xl border border-ink/10 bg-surface px-3 text-sm font-semibold text-ink/60 transition hover:bg-sand/60" type="button" on:click={clearFilters}>Clear</button>
    </div>
  </AdminToolbar>

  {#if loading}
    <LoadingState message="Loading bookings..." />
  {:else if error}
    <ErrorState message={error} />
  {:else if rows.length === 0}
    <AdminEmptyState
      title="No booking requests yet"
      message="When travelers submit trip requests, they will appear here for your team to review and convert."
      actionLabel="Create Booking Request"
      icon={ClipboardList}
      on:action={openCreate}
    />
  {:else}
    <div class="overflow-hidden rounded-[8px] border border-ink/10 bg-surface shadow-[0_18px_50px_rgba(15,47,36,0.06)]">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[1080px] text-sm">
          <thead class="bg-sand/70 text-xs uppercase tracking-[0.08em] text-ink/60">
            <tr>
              <th class="px-4 py-3 text-left font-semibold">Code</th>
              <th class="px-4 py-3 text-left font-semibold">Traveler</th>
              <th class="px-4 py-3 text-left font-semibold">Tour</th>
              <th class="px-4 py-3 text-left font-semibold">Travel date</th>
              <th class="px-4 py-3 text-left font-semibold">People</th>
              <th class="px-4 py-3 text-left font-semibold">Status</th>
              <th class="px-4 py-3 text-left font-semibold">Payment</th>
              <th class="px-4 py-3 text-left font-semibold">Source</th>
              <th class="px-4 py-3 text-left font-semibold">Assigned</th>
              <th class="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-ink/10">
            {#each rows as b (b.id)}
              <tr class="cursor-pointer transition hover:bg-sand/25" on:click={() => openView(b)}>
                <td class="px-4 py-3 font-mono text-xs font-bold text-heading">{b.booking_code}</td>
                <td class="px-4 py-3">
                  <div class="font-semibold text-ink">{b.full_name}</div>
                  <div class="text-xs text-ink/55">{b.email}</div>
                </td>
                <td class="px-4 py-3 text-ink/70">{tourTitle(b) || '—'}</td>
                <td class="px-4 py-3 text-ink/65">{fmtDate(b.travel_date)}</td>
                <td class="px-4 py-3 text-ink/65">{b.total_people ?? Number(b.number_of_adults ?? 0) + Number(b.number_of_children ?? 0)}</td>
                <td class="px-4 py-3">
                  <span class={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${statusMeta[String(b.status)]?.chip ?? 'bg-sand text-ink ring-ink/10'}`}>{statusMeta[String(b.status)]?.label ?? b.status}</span>
                </td>
                <td class="px-4 py-3">
                  <span class={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${paymentMeta[String(b.payment_status)]?.chip ?? 'bg-sand text-ink ring-ink/10'}`}>{paymentMeta[String(b.payment_status)]?.label ?? b.payment_status}</span>
                </td>
                <td class="px-4 py-3 text-xs text-ink/60">{sourceLabels[String(b.source)] ?? b.source}</td>
                <td class="px-4 py-3 text-ink/65">{assigneeName(b.assigned_to) || '—'}</td>
                <td class="px-4 py-3">
                  <div class="flex justify-end gap-1.5" role="presentation" on:click|stopPropagation>
                    <button class="grid h-9 w-9 place-items-center rounded-xl border border-ink/10 bg-surface text-ink/70 shadow-sm transition hover:border-goldfinch-gold/35 hover:bg-sand/70" type="button" aria-label="View" on:click={() => openView(b)}><Eye size={15} /></button>
                    <button class="grid h-9 w-9 place-items-center rounded-xl border border-ink/10 bg-surface text-ink/70 shadow-sm transition hover:border-goldfinch-gold/35 hover:bg-sand/70" type="button" aria-label="Edit" on:click={() => openEdit(b)}><Edit size={15} /></button>
                    <button class="grid h-9 w-9 place-items-center rounded-xl border border-red-200 bg-surface text-red-600 shadow-sm transition hover:bg-red-50" type="button" aria-label="Delete" on:click={() => openDelete(b)}><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>

{#if viewing}
  {@const lc = leadContext(viewing)}
  {@const summary = viewing.payment_summary as Record<string, unknown> | undefined}
  <div class="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4 backdrop-blur-sm" transition:fade={{ duration: 140 }}>
    <div class="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[10px] border border-ink/10 bg-surface shadow-[0_24px_80px_rgba(15,47,36,0.18)]" transition:scale={{ duration: 160, start: 0.98 }}>
      <div class="flex items-start justify-between gap-4 border-b border-ink/10 bg-sand/30 p-5">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span class="font-mono text-sm font-bold text-heading">{viewing.booking_code}</span>
            <span class={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${statusMeta[String(viewing.status)]?.chip ?? ''}`}>{statusMeta[String(viewing.status)]?.label ?? viewing.status}</span>
            <span class={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${paymentMeta[String(viewing.payment_status)]?.chip ?? ''}`}>{paymentMeta[String(viewing.payment_status)]?.label ?? viewing.payment_status}</span>
          </div>
          <h2 class="mt-1 truncate text-xl font-bold text-ink">{viewing.full_name}</h2>
          <p class="text-xs text-ink/50">Received {fmtDateTime(viewing.created_at)} · {sourceLabels[String(viewing.source)] ?? viewing.source}</p>
        </div>
        <button class="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-ink/10 bg-surface text-ink shadow-sm transition hover:bg-sand" type="button" aria-label="Close" on:click={closeView}><X size={18} /></button>
      </div>

      <div class="grid gap-5 overflow-y-auto p-5">
        <div class="grid gap-3 rounded-2xl border border-ink/10 bg-sand/20 p-4 sm:grid-cols-2">
          <a class="flex items-center gap-2 text-sm text-forest hover:underline" href={`mailto:${viewing.email}`}><Mail size={14} class="text-ink/45" /><span class="truncate">{viewing.email}</span></a>
          {#if viewing.phone}<a class="flex items-center gap-2 text-sm text-forest hover:underline" href={`tel:${viewing.phone}`}><Phone size={14} class="text-ink/45" />{viewing.phone}</a>{/if}
          {#if viewing.country}<div class="flex items-center gap-2 text-sm text-ink/70"><User size={14} class="text-ink/45" />{viewing.country}</div>{/if}
          <div class="flex items-center gap-2 text-sm text-ink/70"><CalendarDays size={14} class="text-ink/45" />Travel: {fmtDate(viewing.travel_date)}</div>
          <div class="flex items-center gap-2 text-sm text-ink/70"><Users size={14} class="text-ink/45" />{viewing.number_of_adults} adults · {viewing.number_of_children} children</div>
          {#if tourTitle(viewing)}<div class="flex items-center gap-2 text-sm text-ink/70"><ClipboardList size={14} class="text-ink/45" />{tourTitle(viewing)}</div>{/if}
        </div>

        {#if viewing.estimated_amount != null || summary}
          <div class="flex flex-wrap gap-6 rounded-2xl border border-ink/10 bg-surface p-4 text-sm">
            {#if viewing.estimated_amount != null}<div><span class="text-ink/50">Estimated</span><p class="font-bold text-ink">{money(viewing.estimated_amount, String(viewing.currency ?? 'USD'))}</p></div>{/if}
            {#if summary}<div><span class="text-ink/50">Paid to date</span><p class="font-bold text-emerald-600">{money(summary.total_paid, String(summary.currency ?? 'USD'))}</p></div>{/if}
          </div>
        {/if}

        {#if viewing.message}
          <div><p class="text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">Message</p><p class="mt-1 whitespace-pre-line rounded-2xl border border-ink/10 bg-surface p-3 text-sm leading-6 text-ink/75">{viewing.message}</p></div>
        {/if}
        {#if viewing.special_requests}
          <div><p class="text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">Special requests</p><p class="mt-1 whitespace-pre-line rounded-2xl border border-ink/10 bg-surface p-3 text-sm leading-6 text-ink/75">{viewing.special_requests}</p></div>
        {/if}

        {#if Object.keys(lc).length > 0}
          <div>
            <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">Lead context</p>
            <div class="mt-1 flex flex-wrap gap-2">
              {#each Object.entries(lc) as [key, value]}
                {#if value}<span class="rounded-full bg-forest/10 px-2.5 py-1 text-xs font-medium text-forest">{key.replace(/_/g, ' ')}: {String(value)}</span>{/if}
              {/each}
            </div>
          </div>
        {/if}

        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <p class="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">Status</p>
            <select class="h-10 w-full rounded-xl border border-ink/10 bg-surface px-3 text-sm shadow-sm outline-none focus:border-forest focus:ring-2 focus:ring-forest/15" value={String(viewing.status)} on:change={changeStatus}>
              {#each statusOptions as opt}<option value={opt.value}>{opt.label}</option>{/each}
            </select>
          </div>
          <div>
            <p class="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">Assigned to</p>
            <select class="h-10 w-full rounded-xl border border-ink/10 bg-surface px-3 text-sm shadow-sm outline-none focus:border-forest focus:ring-2 focus:ring-forest/15" value={String(viewing.assigned_to ?? '')} on:change={assign}>
              {#each assignOptions as opt}<option value={opt.value}>{opt.label}</option>{/each}
            </select>
          </div>
        </div>

        <div>
          <p class="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">Internal notes</p>
          <AdminTextArea label="" name="admin_notes" bind:value={notesDraft} rows={3} placeholder="Private notes for the team." />
          <div class="mt-2 flex justify-end">
            <AdminButton variant="secondary" type="button" disabled={savingNotes} on:click={saveNotes}><Save size={14} />{savingNotes ? 'Saving...' : 'Save Notes'}</AdminButton>
          </div>
        </div>
      </div>

      <div class="flex flex-col-reverse gap-3 border-t border-ink/10 bg-sand/20 p-4 sm:flex-row sm:items-center sm:justify-between">
        <button class="inline-flex h-10 items-center gap-2 rounded-xl border border-red-200 bg-surface px-3 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-50" type="button" on:click={() => viewing && openDelete(viewing)}><Trash2 size={14} />Archive</button>
        <AdminButton type="button" on:click={() => viewing && openEdit(viewing)}><Edit size={15} />Edit Booking</AdminButton>
      </div>
    </div>
  </div>
{/if}

{#if formOpen}
  <div class="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4 backdrop-blur-sm" transition:fade={{ duration: 140 }}>
    <form class="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[10px] border border-ink/10 bg-surface p-5 shadow-[0_24px_80px_rgba(15,47,36,0.18)] sm:p-6" transition:scale={{ duration: 160, start: 0.98 }} on:submit|preventDefault={save}>
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-forest/70">{editingId ? 'Edit booking' : 'New booking'}</p>
          <h2 class="mt-1 text-2xl font-bold text-ink">{editingId ? 'Update booking request' : 'Create booking request'}</h2>
        </div>
        <button class="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-ink/10 bg-surface text-ink shadow-sm transition hover:bg-sand" type="button" aria-label="Close" on:click={closeForm}><X size={18} /></button>
      </div>

      <div class="mt-6 grid gap-4">
        <AdminSelect label="Tour (optional)" name="tour_id" bind:value={form.tour_id} options={tourOptions} />

        <div class="grid gap-x-5 gap-y-4 lg:grid-cols-2">
          <!-- Traveler & trip -->
          <section class="grid content-start gap-4">
            <div class="grid gap-4 sm:grid-cols-2">
              <AdminFormInput label="Full name" name="full_name" bind:value={form.full_name} required />
              <AdminFormInput label="Email" name="email" type="email" bind:value={form.email} required />
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <AdminFormInput label="Phone" name="phone" bind:value={form.phone} />
              <AdminFormInput label="Country" name="country" bind:value={form.country} />
            </div>
            <div class="grid gap-4 sm:grid-cols-3">
              <AdminFormInput label="Travel date" name="travel_date" type="date" bind:value={form.travel_date} />
              <AdminFormInput label="Adults" name="number_of_adults" type="number" bind:value={form.number_of_adults} />
              <AdminFormInput label="Children" name="number_of_children" type="number" bind:value={form.number_of_children} />
            </div>
          </section>

          <!-- Booking details -->
          <section class="grid content-start gap-4">
            <div class="grid gap-4 sm:grid-cols-2">
              <AdminFormInput label="Estimated amount" name="estimated_amount" type="number" bind:value={form.estimated_amount} />
              <AdminSelect label="Currency" name="currency" bind:value={form.currency} options={currencyOptions} />
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <AdminSelect label="Source" name="source" bind:value={form.source} options={sourceOptions} />
              <AdminSelect label="Status" name="status" bind:value={form.status} options={statusOptions} />
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <AdminSelect label="Payment status" name="payment_status" bind:value={form.payment_status} options={paymentOptions} />
              <AdminSelect label="Assigned to" name="assigned_to" bind:value={form.assigned_to} options={assignOptions} />
            </div>
          </section>
        </div>

        <div class="grid gap-4 lg:grid-cols-3">
          <AdminTextArea label="Special requests" name="special_requests" bind:value={form.special_requests} rows={3} />
          <AdminTextArea label="Message" name="message" bind:value={form.message} rows={3} />
          <AdminTextArea label="Internal admin notes" name="admin_notes" bind:value={form.admin_notes} rows={3} />
        </div>
      </div>

      <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <AdminButton variant="secondary" type="button" on:click={closeForm}>Cancel</AdminButton>
        <AdminButton type="submit" disabled={saving}><Save size={16} />{saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Booking'}</AdminButton>
      </div>
    </form>
  </div>
{/if}

<ConfirmModal
  open={confirmOpen}
  title="Archive booking"
  message={`Archive booking "${toDelete?.booking_code ?? ''}" from ${toDelete?.full_name ?? 'this traveler'}? This soft-deletes the record.`}
  on:cancel={() => { confirmOpen = false; toDelete = null; }}
  on:confirm={confirmDelete}
/>

{#if deleting}
  <div class="fixed bottom-4 right-4 z-[70] rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(15,47,36,0.18)]">Archiving booking...</div>
{/if}
