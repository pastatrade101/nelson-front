<script lang="ts">
  import { onMount } from 'svelte';
  import { ExternalLink, Link2, RefreshCw, Wrench } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminEmptyState from '$lib/components/admin/AdminEmptyState.svelte';
  import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
  import ToastStack from '$lib/components/admin/ToastStack.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';
  import type { LinkHealthIssue, LinkHealthReport } from '$lib/types';

  type Toast = { id: string; message: string; type: 'error' | 'success' };

  // Every link in tour overviews and itinerary days, checked against the live
  // site. The editor checks a text while it is open; this is the same check
  // across everything at once, for the links that broke after their page was
  // unpublished, deleted or renamed.
  let report: LinkHealthReport | null = null;
  let loading = true;
  let error = '';
  let repairing = false;
  let toasts: Toast[] = [];

  const KINDS: Record<LinkHealthIssue['kind'], { label: string; tone: string; help: string }> = {
    broken: { label: 'Broken', tone: 'bg-red-100 text-red-800', help: 'Leads to a page that does not exist. Open the tour and pick the right page.' },
    unpublished: { label: 'Unpublished', tone: 'bg-red-100 text-red-800', help: 'The page exists but is a draft or archived, so visitors get a 404.' },
    moved: { label: 'Moved', tone: 'bg-amber-100 text-amber-900', help: 'The page was renamed. "Update moved links" rewrites these addresses; the words stay.' },
    self: { label: 'Links to itself', tone: 'bg-amber-100 text-amber-900', help: 'A page linking to itself helps nobody.' },
    duplicate: { label: 'Repeated', tone: 'bg-sand text-ink/70', help: 'The same page is linked more than once in one text.' },
    generic: { label: 'Vague words', tone: 'bg-sand text-ink/70', help: '"Click here" tells readers and search engines nothing — link the words that name the page.' }
  };

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
      report = (await api.internalLinks.health()).data;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to check links.';
    } finally {
      loading = false;
    }
  };

  const repair = async () => {
    repairing = true;
    try {
      const { changed } = (await api.internalLinks.repair()).data;
      showToast(changed ? `${changed} ${changed === 1 ? 'link' : 'links'} updated to the new address.` : 'No moved links to update.');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to update links.', 'error');
    } finally {
      repairing = false;
    }
  };

  // Grouped by tour so an editor fixes one page at a time.
  $: groups = (() => {
    const map = new Map<string, { tour: LinkHealthIssue['tour']; issues: LinkHealthIssue[] }>();
    for (const issue of report?.issues ?? []) {
      if (!map.has(issue.tour.id)) map.set(issue.tour.id, { tour: issue.tour, issues: [] });
      map.get(issue.tour.id)?.issues.push(issue);
    }
    return [...map.values()].sort((a, b) => b.issues.length - a.issues.length || a.tour.title.localeCompare(b.tour.title));
  })();
  $: counts = (report?.issues ?? []).reduce(
    (acc, issue) => ({ ...acc, [issue.kind]: (acc[issue.kind] ?? 0) + 1 }),
    {} as Partial<Record<LinkHealthIssue['kind'], number>>
  );
  $: movedCount = counts.moved ?? 0;

  onMount(load);
</script>

<ToastStack {toasts} on:dismiss={dismissToast} />

<div class="mx-auto grid w-full max-w-[1500px] gap-6">
  <AdminPageHeader
    eyebrow="Tour Management"
    title="Link Health"
    description="Every link inside tour overviews and itinerary days, checked against the live site: broken, unpublished, renamed, repeated or vaguely worded."
    actionLabel={loading ? 'Checking…' : 'Check again'}
    actionIcon={RefreshCw}
    on:action={load}
  />

  {#if loading && !report}
    <LoadingState message="Checking every link…" />
  {:else if error}
    <ErrorState message={error} />
  {:else if report}
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div class="border border-ink/10 bg-surface p-4">
        <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">Checked</p>
        <p class="mt-1 text-2xl font-bold text-ink">{report.checked.links}</p>
        <p class="text-xs text-ink/55">site links in {report.checked.tours} tours and {report.checked.days} itinerary days</p>
      </div>
      <div class="border border-ink/10 bg-surface p-4">
        <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-red-700/80">Need fixing</p>
        <p class="mt-1 text-2xl font-bold text-ink">{(counts.broken ?? 0) + (counts.unpublished ?? 0)}</p>
        <p class="text-xs text-ink/55">broken or pointing at an unpublished page</p>
      </div>
      <div class="border border-ink/10 bg-surface p-4">
        <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-700/80">Moved</p>
        <p class="mt-1 text-2xl font-bold text-ink">{movedCount}</p>
        <p class="text-xs text-ink/55">pages renamed since the link was written</p>
      </div>
      <div class="border border-ink/10 bg-surface p-4">
        <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-ink/50">Could read better</p>
        <p class="mt-1 text-2xl font-bold text-ink">{(counts.self ?? 0) + (counts.duplicate ?? 0) + (counts.generic ?? 0)}</p>
        <p class="text-xs text-ink/55">self links, repeats and vague wording</p>
      </div>
    </div>

    {#if movedCount}
      <div class="flex flex-wrap items-center justify-between gap-3 border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <span>{movedCount} {movedCount === 1 ? 'link points' : 'links point'} at an old address. Updating keeps every word as written and changes only where the link goes.</span>
        <AdminButton on:click={repair} disabled={repairing}><Wrench size={14} /> {repairing ? 'Updating…' : 'Update moved links'}</AdminButton>
      </div>
    {/if}

    {#if !report.issues.length}
      <AdminEmptyState
        title="Every link checks out"
        message={report.checked.links ? `All ${report.checked.links} site links in tour copy lead to a published page.` : 'No site links in tour copy yet. Open a tour, highlight a place name and use the link button — or take a suggestion from the editor.'}
        icon={Link2}
      />
    {:else}
      <div class="grid gap-5">
        {#each groups as group (group.tour.id)}
          <section class="overflow-hidden rounded-none border border-ink/10 bg-surface shadow-[0_18px_50px_rgba(28,26,22,0.06)]">
            <header class="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 bg-sand/40 px-5 py-3">
              <div class="flex min-w-0 flex-wrap items-center gap-2">
                <h2 class="min-w-0 text-base font-bold text-ink [overflow-wrap:anywhere]">{group.tour.title}</h2>
                <a class="inline-flex items-center gap-1 text-[11px] font-bold text-forest underline-offset-2 hover:underline" href={`/tours/${group.tour.slug}`} target="_blank" rel="noopener noreferrer">View page<ExternalLink size={11} /></a>
              </div>
              <div class="flex items-center gap-2">
                <span class="rounded-full bg-forest/10 px-2.5 py-0.5 text-xs font-bold text-forest">{group.issues.length}</span>
                <a class="inline-flex h-8 items-center border border-ink/10 bg-surface px-3 text-xs font-semibold text-ink transition hover:bg-sand" href={`/admin/tours/${group.tour.id}/edit`}>Edit tour</a>
              </div>
            </header>
            <ul class="divide-y divide-ink/10">
              {#each group.issues as issue, i (`${issue.href}-${issue.day?.id ?? 'tour'}-${i}`)}
                <li class="grid gap-1 px-5 py-3 text-sm">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class={`rounded-full px-2 py-0.5 text-[11px] font-bold ${KINDS[issue.kind].tone}`}>{KINDS[issue.kind].label}</span>
                    <span class="text-xs text-ink/55">{issue.day ? `Day ${issue.day.number}${issue.day.title ? ` · ${issue.day.title}` : ''}` : 'Overview'}</span>
                  </div>
                  <p class="text-ink/85">
                    <span class="font-semibold">“{issue.text || '(no words)'}”</span>
                    <span class="text-ink/45"> → </span>
                    <span class="break-all font-mono text-[12px] text-ink/70">{issue.href}</span>
                    {#if issue.fixHref}<span class="text-ink/45"> → should be </span><span class="break-all font-mono text-[12px] text-forest">{issue.fixHref}</span>{/if}
                  </p>
                  <p class="text-xs text-ink/60">{issue.message}</p>
                </li>
              {/each}
            </ul>
          </section>
        {/each}
      </div>
    {/if}
  {/if}
</div>
