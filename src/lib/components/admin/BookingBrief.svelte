<script lang="ts">
  import { contextRows } from '$lib/leadContext';
  export let context: Record<string, unknown> = {};
  const groups = [
    { title: 'Journey & travellers', keys: ['selected_trip', 'destination_interest', 'travel_interests', 'traveller_type', 'children_ages', 'travel_month', 'exact_start_date', 'exact_end_date', 'date_flexibility', 'trip_duration', 'travel_pace'] },
    { title: 'Preferences & budget', keys: ['comfort_level', 'accommodation_preference', 'travel_priorities', 'budget_per_person', 'budget_range', 'budget_basis', 'selected_currency', 'planning_stage'] },
    { title: 'Contact permission', keys: ['preferred_contact', 'contact_consent', 'consent_scope'] },
    { title: 'Selected trips & entry context', keys: ['entry_points', 'saved_trips', 'source_page_url', 'lead_source', 'submitted_at'] }
  ];
  $: known = new Set([...groups.flatMap((g) => g.keys), 'answers', 'v', 'form_type', 'submission_fingerprint']);
  $: other = Object.fromEntries(Object.entries(context).filter(([key]) => !known.has(key)));
</script>
<section class="min-w-0 space-y-4" aria-label="Complete trip brief">
  <h3 class="text-sm font-bold text-forest">Complete trip brief</h3>
  {#each [...groups, { title: 'Additional details', keys: Object.keys(other) }] as group}
    {@const fields = Object.fromEntries(group.keys.filter((key) => key in context).map((key) => [key, context[key]]))}
    {#if Object.keys(fields).length}<details open class="min-w-0 rounded-xl border border-ink/10 bg-white"><summary class="cursor-pointer px-4 py-3 text-xs font-bold text-forest">{group.title}</summary><dl class="divide-y divide-ink/5 px-4 pb-3">{#each contextRows(fields) as row}<div class="grid min-w-0 gap-1 py-2 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] sm:gap-4"><dt class="break-words text-xs text-ink/55">{row.label}</dt><dd class="whitespace-pre-wrap break-words text-sm text-ink [overflow-wrap:anywhere]">{row.value}</dd></div>{/each}</dl></details>{/if}
  {/each}
  {#if context.answers}<details class="rounded-xl border border-ink/10 bg-white"><summary class="cursor-pointer px-4 py-3 text-xs font-bold text-forest">All original answers</summary><dl class="divide-y divide-ink/5 px-4 pb-3">{#each contextRows(context.answers) as row}<div class="grid min-w-0 gap-1 py-2 sm:grid-cols-2"><dt class="break-words text-xs text-ink/55">{row.label}</dt><dd class="whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">{row.value}</dd></div>{/each}</dl></details>{/if}
  <details class="rounded-xl border border-ink/10"><summary class="cursor-pointer px-4 py-3 text-xs text-ink/60">Full saved payload · technical view</summary><pre class="max-h-96 overflow-y-auto whitespace-pre-wrap break-words p-4 text-[11px] [overflow-wrap:anywhere]">{JSON.stringify(context, null, 2)}</pre></details>
</section>
