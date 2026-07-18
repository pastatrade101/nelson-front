<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowRight, Bot, Search } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
  import StatusBadge from '$lib/components/admin/StatusBadge.svelte';

  type Conversation = {
    id: string;
    visitor_name?: string | null;
    visitor_email?: string | null;
    status?: string | null;
    lead_status?: string | null;
    lead_score?: number | null;
    handoff_required?: boolean | null;
    source_page?: string | null;
    language?: string | null;
    booking_request_id?: string | null;
    ai_message_count?: number | null;
    total_estimated_cost_usd?: number | null;
    updated_at?: string | null;
    created_at?: string | null;
  };

  let rows: Conversation[] = [];
  let loading = true;
  let error = '';
  let search = '';
  let statusFilter = 'all';
  let leadFilter = 'all';

  const load = async () => {
    loading = true;
    error = '';
    try {
      const params: Record<string, string> = { limit: '100' };
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await api.aiTravelAdvisor.conversations(params);
      rows = (res.data.items ?? []) as Conversation[];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to load AI conversations.';
    } finally {
      loading = false;
    }
  };

  onMount(load);

  $: filtered = rows.filter((r) => (leadFilter === 'all' ? true : leadFilter === 'handoff' ? r.handoff_required : r.lead_status === leadFilter));

  const fmt = (v?: string | null) => (v ? new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(v)) : '—');
  const money = (v?: number | null) => `$${Number(v ?? 0).toFixed(4)}`;
</script>

<svelte:head><title>AI Conversations | Emnel CMS</title></svelte:head>

<section class="grid gap-6">
  <AdminPageHeader
    eyebrow="AI System"
    title="AI Conversations"
    description="Emnel AI Safari Advisor leads — transcripts, lead score, recommendations, handoff and booking status."
  />

  <div class="rounded-none border border-ink/10 bg-surface p-4 shadow-card">
    <div class="grid gap-3 md:grid-cols-[1fr_180px_180px]">
      <label class="grid gap-1.5 text-xs font-semibold text-ink/60">
        Search
        <span class="flex h-10 items-center gap-2 rounded-lg border border-ink/15 bg-surface px-3 focus-within:border-forest">
          <Search size={15} class="text-ink/40" />
          <input class="min-w-0 flex-1 bg-transparent text-sm outline-none" bind:value={search} placeholder="Name, email, status…" on:keydown={(e) => e.key === 'Enter' && load()} />
        </span>
      </label>
      <label class="grid gap-1.5 text-xs font-semibold text-ink/60">
        Status
        <select class="h-10 rounded-lg border border-ink/15 bg-surface px-2 text-sm outline-none focus:border-forest" bind:value={statusFilter} on:change={load}>
          <option value="all">All statuses</option>
          <option value="in_progress">In progress</option>
          <option value="handoff_ready">Handoff ready</option>
          <option value="booking_request_created">Booking created</option>
        </select>
      </label>
      <label class="grid gap-1.5 text-xs font-semibold text-ink/60">
        Lead
        <select class="h-10 rounded-lg border border-ink/15 bg-surface px-2 text-sm outline-none focus:border-forest" bind:value={leadFilter}>
          <option value="all">All leads</option>
          <option value="qualified">Qualified</option>
          <option value="hot">Hot</option>
          <option value="warm">Warm</option>
          <option value="cold">Cold</option>
          <option value="handoff">Handoff required</option>
        </select>
      </label>
    </div>
  </div>

  {#if loading}
    <div class="grid gap-2">
      {#each Array(5) as _}<div class="h-14 animate-pulse rounded-lg bg-black/5"></div>{/each}
    </div>
  {:else if error}
    <p class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>
  {:else if !filtered.length}
    <div class="grid place-items-center gap-2 rounded-none border border-dashed border-ink/15 bg-surface py-16 text-center">
      <span class="grid h-12 w-12 place-items-center rounded-full bg-forest/10 text-forest"><Bot size={22} /></span>
      <p class="text-sm font-semibold text-ink">No AI conversations yet</p>
      <p class="max-w-sm text-sm text-ink/55">Leads from the public AI advisor widget will appear here.</p>
    </div>
  {:else}
    <div class="overflow-hidden rounded-none border border-ink/10 bg-surface shadow-card">
      <table class="w-full text-left text-sm">
        <thead class="border-b border-ink/10 bg-black/[0.02] text-[11px] uppercase tracking-wide text-ink/50">
          <tr>
            <th class="px-4 py-3 font-bold">Visitor</th>
            <th class="px-4 py-3 font-bold">Lead</th>
            <th class="px-4 py-3 font-bold">Status</th>
            <th class="px-4 py-3 font-bold">Msgs</th>
            <th class="px-4 py-3 font-bold">Cost</th>
            <th class="px-4 py-3 font-bold">Updated</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-ink/[0.06]">
          {#each filtered as c (c.id)}
            <tr class="transition hover:bg-sand/30">
              <td class="px-4 py-3">
                <a class="font-semibold text-ink hover:text-forest" href={`/admin/ai-conversations/${c.id}`}>{c.visitor_name || 'Anonymous visitor'}</a>
                <p class="text-xs text-ink/45">{c.visitor_email || c.source_page || '—'}{c.language && c.language !== 'en' ? ` · ${c.language.toUpperCase()}` : ''}</p>
              </td>
              <td class="px-4 py-3">
                <span class="inline-flex items-center gap-1.5">
                  <StatusBadge status={c.lead_status || 'cold'} />
                  <span class="text-xs font-semibold text-ink/50">{c.lead_score ?? 0}</span>
                </span>
                {#if c.handoff_required}<span class="ml-1 rounded bg-goldfinch-gold/20 px-1.5 py-0.5 text-[10px] font-bold text-clay">Handoff</span>{/if}
              </td>
              <td class="px-4 py-3"><StatusBadge status={c.status || 'in_progress'} />{#if c.booking_request_id}<span class="ml-1 text-[10px] font-bold text-forest">• booked</span>{/if}</td>
              <td class="px-4 py-3 text-ink/70">{c.ai_message_count ?? 0}</td>
              <td class="px-4 py-3 text-ink/70">{money(c.total_estimated_cost_usd)}</td>
              <td class="px-4 py-3 text-xs text-ink/55">{fmt(c.updated_at || c.created_at)}</td>
              <td class="px-4 py-3 text-right">
                <a class="inline-flex items-center gap-1 text-xs font-bold text-forest hover:text-heading" href={`/admin/ai-conversations/${c.id}`}>Open <ArrowRight size={13} /></a>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</section>
