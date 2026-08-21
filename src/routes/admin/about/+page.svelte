<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Save, Trash2 } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminFormInput from '$lib/components/admin/AdminFormInput.svelte';
  import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
  import MediaPicker from '$lib/components/admin/MediaPicker.svelte';
  import ToastStack from '$lib/components/admin/ToastStack.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';

  // The About page is stored as `about_*` rows in the shared homepage_sections
  // table. Saving uses the bulk endpoint, which upserts on section_key — so the
  // rows are created automatically the first time this page is saved.
  type Section = {
    section_key: string;
    title: string;
    subtitle: string;
    content: string;
    image_url: string;
    button_text: string;
    button_url: string;
    is_active: boolean;
    sort_order: number;
  };
  type MediaItem = { id: string; file_name: string; file_url: string; thumbnail_url?: string | null };
  type Stat = { value: string; label: string };
  type Guide = { name: string; title: string; speciality: string; years: string; quote: string; author: string; image_url: string };
  type Block = { title: string; body: string; items?: string[] };

  const KEYS = [
    'about_seo',
    'about_hero',
    'about_stats',
    'about_founder',
    'about_beginning',
    'about_what_we_do',
    'about_guides',
    'about_licences',
    'about_giving',
    'about_closing',
    'about_cta'
  ] as const;
  type Key = (typeof KEYS)[number];
  const LABELS: Record<Key, string> = {
    about_seo: 'SEO (title & description)',
    about_hero: 'Hero',
    about_stats: 'At a glance (stats)',
    about_founder: 'The story behind the name',
    about_beginning: 'How the company began (+ film)',
    about_what_we_do: 'What Emnel does today',
    about_guides: 'The team',
    about_licences: 'Licences & certifications',
    about_giving: 'Giving back (Reepads)',
    about_closing: 'Closing narrative',
    about_cta: 'Final CTA'
  };
  // Which optional widgets each section shows.
  const HAS_IMAGE: string[] = ['about_hero', 'about_founder'];
  const HAS_BUTTON: string[] = ['about_hero', 'about_founder', 'about_guides', 'about_giving', 'about_cta'];
  const HAS_BODY: string[] = ['about_founder', 'about_beginning', 'about_what_we_do', 'about_guides', 'about_licences', 'about_giving', 'about_closing'];
  const HAS_SUBTITLE: string[] = ['about_hero', 'about_giving', 'about_cta'];

  const blank = (key: string, sort: number): Section => ({
    section_key: key, title: '', subtitle: '', content: '', image_url: '',
    button_text: '', button_url: '', is_active: true, sort_order: sort
  });

  // Column fields per section…
  let sections: Record<string, Section> = Object.fromEntries(KEYS.map((k, i) => [k, blank(k, i)]));
  // …and the free-form extra_data strings, flattened so they can be bound directly.
  // Anything already in extra_data that we don't surface here is preserved on save.
  let ex: Record<string, Record<string, string>> = Object.fromEntries(KEYS.map((k) => [k, {}]));
  let rawExtra: Record<string, Record<string, unknown>> = Object.fromEntries(KEYS.map((k) => [k, {}]));

  let stats: Stat[] = [];
  let guides: Guide[] = [];
  let licences: string[] = [];
  let blocks: Block[] = [];
  let mediaItems: MediaItem[] = [];

  let loading = true;
  let saving = false;
  let error = '';

  type Toast = { id: string; message: string; type: 'success' | 'error' };
  let toasts: Toast[] = [];
  const toast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).slice(2);
    toasts = [{ id, message, type }, ...toasts].slice(0, 4);
    setTimeout(() => { toasts = toasts.filter((t) => t.id !== id); }, 3500);
  };
  const dismissToast = (e: CustomEvent<string>) => { toasts = toasts.filter((t) => t.id !== e.detail); };

  const str = (value: unknown) => (typeof value === 'string' ? value : '');

  const load = async () => {
    loading = true;
    error = '';
    try {
      const res = await api.homepage.get({ all: true });
      const list = (res.data ?? []) as Array<Record<string, unknown>>;
      const nextSections = { ...sections };
      const nextEx = { ...ex };
      const nextRaw = { ...rawExtra };

      for (const row of list) {
        const key = str(row.section_key);
        if (!(KEYS as readonly string[]).includes(key)) continue;
        nextSections[key] = {
          section_key: key,
          title: str(row.title),
          subtitle: str(row.subtitle),
          content: str(row.content),
          image_url: str(row.image_url),
          button_text: str(row.button_text),
          button_url: str(row.button_url),
          is_active: row.is_active !== false,
          sort_order: typeof row.sort_order === 'number' ? row.sort_order : (KEYS as readonly string[]).indexOf(key)
        };
        const extra = (row.extra_data ?? {}) as Record<string, unknown>;
        nextRaw[key] = extra;
        const flat: Record<string, string> = {};
        for (const [k, v] of Object.entries(extra)) if (typeof v === 'string') flat[k] = v;
        nextEx[key] = flat;
      }

      sections = nextSections;
      ex = nextEx;
      rawExtra = nextRaw;
      stats = (Array.isArray(nextRaw.about_stats?.stats) ? nextRaw.about_stats.stats : []) as Stat[];
      guides = (Array.isArray(nextRaw.about_guides?.guides) ? nextRaw.about_guides.guides : []) as Guide[];
      licences = (Array.isArray(nextRaw.about_licences?.items) ? nextRaw.about_licences.items : []) as string[];
      blocks = (Array.isArray(nextRaw.about_giving?.blocks) ? nextRaw.about_giving.blocks : []) as Block[];
    } catch (e) {
      error = e instanceof Error ? e.message : 'Unable to load the About page content.';
    } finally {
      loading = false;
    }

    try {
      const res = await api.media.list({ limit: 100 });
      const items = ((res.data as { items?: Array<Record<string, unknown>> })?.items ?? []) as unknown;
      mediaItems = items as MediaItem[];
    } catch {
      mediaItems = [];
    }
  };

  const save = async () => {
    if (saving) return;
    saving = true;
    try {
      const payload = KEYS.map((k) => {
        const extra: Record<string, unknown> = { ...rawExtra[k], ...ex[k] };
        if (k === 'about_stats') extra.stats = stats;
        if (k === 'about_guides') extra.guides = guides;
        if (k === 'about_licences') extra.items = licences;
        if (k === 'about_giving') extra.blocks = blocks;
        return { ...sections[k], extra_data: extra };
      });
      await api.homepage.update(payload);
      toast('About page saved.');
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Save failed.', 'error');
    } finally {
      saving = false;
    }
  };

  const move = <T,>(list: T[], i: number, delta: number): T[] => {
    const j = i + delta;
    if (j < 0 || j >= list.length) return list;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  };

  const textarea = 'w-full rounded-none border border-ink/15 bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-forest';

  onMount(load);
</script>

<ToastStack {toasts} on:dismiss={dismissToast} />

<AdminPageHeader
  title="About page"
  description="Every section of the public /about page. Leave a field empty to keep the built-in default copy."
/>

{#if loading}
  <LoadingState message="Loading About content..." />
{:else if error}
  <ErrorState message={error} />
{:else}
  <div class="grid gap-6 pb-8">
    {#each KEYS as key}
      <section class="rounded-none border border-ink/10 bg-surface p-5">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 pb-4">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">{LABELS[key]}</p>
            <p class="mt-0.5 text-xs text-ink/50">{key}</p>
          </div>
          {#if key !== 'about_seo'}
            <AdminButton
              variant={sections[key].is_active ? 'secondary' : 'ghost'}
              size="sm"
              on:click={() => { sections[key].is_active = !sections[key].is_active; sections = sections; }}
            >
              {#if sections[key].is_active}<Eye size={15} /> Visible{:else}<EyeOff size={15} /> Hidden{/if}
            </AdminButton>
          {/if}
        </div>

        <div class="grid gap-4 pt-4">
          {#if key === 'about_seo'}
            <AdminFormInput label="Meta title" name="meta_title" bind:value={ex[key].meta_title} placeholder="About Emnel Adventures — Local Tanzania Safari Operator | Arusha" />
            <label class="grid gap-1.5 text-sm font-medium text-ink">
              <span>Meta description</span>
              <textarea class={textarea} rows={3} bind:value={ex[key].meta_description}></textarea>
            </label>
          {:else}
            <!-- Eyebrow: SectionHeader-style sections keep it in `subtitle`. -->
            {#if key === 'about_guides'}
              <AdminFormInput label="Eyebrow (small label above the title)" name={`${key}_eyebrow`} bind:value={sections[key].subtitle} />
            {:else if key === 'about_hero' || key === 'about_founder' || key === 'about_beginning' || key === 'about_what_we_do'}
              <AdminFormInput label="Eyebrow (optional)" name={`${key}_eyebrow`} bind:value={ex[key].eyebrow} />
            {/if}

            <AdminFormInput label={key === 'about_giving' ? 'Section label (e.g. Giving Back)' : 'Title'} name={`${key}_title`} bind:value={sections[key].title} />

            {#if HAS_SUBTITLE.includes(key)}
              <label class="grid gap-1.5 text-sm font-medium text-ink">
                <span>{key === 'about_hero' ? 'Intro paragraph' : key === 'about_giving' ? 'Headline' : 'Subtitle'}</span>
                <textarea class={textarea} rows={key === 'about_giving' ? 2 : 3} bind:value={sections[key].subtitle}></textarea>
              </label>
            {/if}

            {#if HAS_BODY.includes(key)}
              <label class="grid gap-1.5 text-sm font-medium text-ink">
                <span>Body — leave a blank line between paragraphs</span>
                <textarea class={textarea} rows={key === 'about_founder' || key === 'about_giving' ? 10 : 6} bind:value={sections[key].content}></textarea>
              </label>
            {/if}

            {#if key === 'about_founder'}
              <label class="grid gap-1.5 text-sm font-medium text-ink">
                <span>Pull quote (optional)</span>
                <textarea class={textarea} rows={2} bind:value={ex[key].quote}></textarea>
              </label>
            {/if}

            {#if HAS_IMAGE.includes(key)}
              <MediaPicker label="Section image" media={mediaItems} uploadFolder="about" bind:value={sections[key].image_url} />
              {#if key === 'about_hero'}
                <AdminFormInput label="Image alt text" name="hero_alt" bind:value={ex[key].image_alt} />
              {:else}
                <AdminFormInput label="Image caption" name="founder_caption" bind:value={ex[key].image_caption} />
              {/if}
            {/if}

            {#if key === 'about_beginning'}
              <div class="grid gap-4 border border-ink/10 bg-sand/25 p-4">
                <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">Guest film (optional)</p>
                <AdminFormInput label="Video URL (YouTube or Vimeo)" name="video_url" bind:value={ex[key].video_url} placeholder="https://www.youtube.com/watch?v=..." />
                <AdminFormInput label="Video caption" name="video_caption" bind:value={ex[key].video_caption} />
                <label class="grid gap-1.5 text-sm font-medium text-ink">
                  <span>Text after the film</span>
                  <textarea class={textarea} rows={4} bind:value={ex[key].closing}></textarea>
                </label>
              </div>
            {/if}

            {#if key === 'about_giving'}
              <label class="grid gap-1.5 text-sm font-medium text-ink">
                <span>Highlight line (gold box)</span>
                <textarea class={textarea} rows={2} bind:value={ex[key].highlight}></textarea>
              </label>
            {/if}

            {#if key === 'about_cta'}
              <AdminFormInput label="Footnote line" name="cta_footnote" bind:value={ex[key].footnote} />
            {/if}

            {#if HAS_BUTTON.includes(key)}
              <div class="grid gap-4 sm:grid-cols-2">
                <AdminFormInput label="Button label" name={`${key}_btn`} bind:value={sections[key].button_text} />
                <AdminFormInput label="Button link (leave empty to hide the button)" name={`${key}_btnurl`} bind:value={sections[key].button_url} placeholder="/plan-my-trip" />
              </div>
            {/if}

            <!-- ── Stats repeater ────────────────────────────────────────── -->
            {#if key === 'about_stats'}
              <div class="grid gap-3 border-t border-ink/10 pt-4">
                <div class="flex items-center justify-between">
                  <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">Stats</p>
                  <AdminButton size="sm" variant="secondary" on:click={() => (stats = [...stats, { value: '', label: '' }])}>
                    <Plus size={15} /> Add stat
                  </AdminButton>
                </div>
                {#each stats as s, i}
                  <div class="grid gap-3 border border-ink/10 bg-sand/25 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                    <AdminFormInput label="Value" name={`st_v_${i}`} bind:value={s.value} placeholder="9+ Years" />
                    <AdminFormInput label="Label" name={`st_l_${i}`} bind:value={s.label} placeholder="in Tanzania" />
                    <div class="flex gap-1 pb-1">
                      <AdminButton size="sm" variant="ghost" ariaLabel="Move up" on:click={() => (stats = move(stats, i, -1))}><ArrowUp size={14} /></AdminButton>
                      <AdminButton size="sm" variant="ghost" ariaLabel="Move down" on:click={() => (stats = move(stats, i, 1))}><ArrowDown size={14} /></AdminButton>
                      <AdminButton size="sm" variant="danger" ariaLabel="Remove" on:click={() => (stats = stats.filter((_, j) => j !== i))}><Trash2 size={14} /></AdminButton>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}

            <!-- ── Team repeater ─────────────────────────────────────────── -->
            {#if key === 'about_guides'}
              <div class="grid gap-3 border-t border-ink/10 pt-4">
                <div class="flex items-center justify-between">
                  <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">Team members</p>
                  <AdminButton size="sm" variant="secondary" on:click={() => (guides = [...guides, { name: '', title: '', speciality: '', years: '', quote: '', author: '', image_url: '' }])}>
                    <Plus size={15} /> Add member
                  </AdminButton>
                </div>
                {#each guides as g, i}
                  <div class="grid gap-3 border border-ink/10 bg-sand/25 p-4">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-bold uppercase tracking-[0.14em] text-ink/50">{g.name || `Member ${i + 1}`}</span>
                      <div class="flex gap-1">
                        <AdminButton size="sm" variant="ghost" ariaLabel="Move up" on:click={() => (guides = move(guides, i, -1))}><ArrowUp size={14} /></AdminButton>
                        <AdminButton size="sm" variant="ghost" ariaLabel="Move down" on:click={() => (guides = move(guides, i, 1))}><ArrowDown size={14} /></AdminButton>
                        <AdminButton size="sm" variant="danger" ariaLabel="Remove" on:click={() => (guides = guides.filter((_, j) => j !== i))}><Trash2 size={14} /></AdminButton>
                      </div>
                    </div>
                    <div class="grid gap-3 sm:grid-cols-2">
                      <AdminFormInput label="Name" name={`g_name_${i}`} bind:value={g.name} />
                      <AdminFormInput label="Role" name={`g_title_${i}`} bind:value={g.title} placeholder="Senior Guide · English Speaking" />
                    </div>
                    <MediaPicker label="Photo (optional)" media={mediaItems} uploadFolder="about" bind:value={g.image_url} />
                    <div class="grid gap-3 sm:grid-cols-2">
                      <AdminFormInput label="Speciality (optional)" name={`g_spec_${i}`} bind:value={g.speciality} />
                      <AdminFormInput label="Experience (optional)" name={`g_years_${i}`} bind:value={g.years} />
                    </div>
                    <label class="grid gap-1.5 text-sm font-medium text-ink">
                      <span>Guest quote (optional)</span>
                      <textarea class={textarea} rows={2} bind:value={g.quote}></textarea>
                    </label>
                    <AdminFormInput label="Quote attribution (optional)" name={`g_author_${i}`} bind:value={g.author} />
                  </div>
                {/each}
              </div>
            {/if}

            <!-- ── Licences repeater ─────────────────────────────────────── -->
            {#if key === 'about_licences'}
              <div class="grid gap-3 border-t border-ink/10 pt-4">
                <div class="flex items-center justify-between">
                  <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">Credentials</p>
                  <AdminButton size="sm" variant="secondary" on:click={() => (licences = [...licences, ''])}>
                    <Plus size={15} /> Add credential
                  </AdminButton>
                </div>
                {#each licences as _item, i}
                  <div class="grid gap-3 border border-ink/10 bg-sand/25 p-4 sm:grid-cols-[1fr_auto] sm:items-end">
                    <AdminFormInput label={`Credential ${i + 1}`} name={`lic_${i}`} bind:value={licences[i]} />
                    <div class="flex gap-1 pb-1">
                      <AdminButton size="sm" variant="ghost" ariaLabel="Move up" on:click={() => (licences = move(licences, i, -1))}><ArrowUp size={14} /></AdminButton>
                      <AdminButton size="sm" variant="ghost" ariaLabel="Move down" on:click={() => (licences = move(licences, i, 1))}><ArrowDown size={14} /></AdminButton>
                      <AdminButton size="sm" variant="danger" ariaLabel="Remove" on:click={() => (licences = licences.filter((_, j) => j !== i))}><Trash2 size={14} /></AdminButton>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}

            <!-- ── Giving-back blocks repeater ───────────────────────────── -->
            {#if key === 'about_giving'}
              <div class="grid gap-3 border-t border-ink/10 pt-4">
                <div class="flex items-center justify-between">
                  <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-forest/70">Sub-sections</p>
                  <AdminButton size="sm" variant="secondary" on:click={() => (blocks = [...blocks, { title: '', body: '', items: [] }])}>
                    <Plus size={15} /> Add sub-section
                  </AdminButton>
                </div>
                {#each blocks as b, i}
                  <div class="grid gap-3 border border-ink/10 bg-sand/25 p-4">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-bold uppercase tracking-[0.14em] text-ink/50">{b.title || `Sub-section ${i + 1}`}</span>
                      <div class="flex gap-1">
                        <AdminButton size="sm" variant="ghost" ariaLabel="Move up" on:click={() => (blocks = move(blocks, i, -1))}><ArrowUp size={14} /></AdminButton>
                        <AdminButton size="sm" variant="ghost" ariaLabel="Move down" on:click={() => (blocks = move(blocks, i, 1))}><ArrowDown size={14} /></AdminButton>
                        <AdminButton size="sm" variant="danger" ariaLabel="Remove" on:click={() => (blocks = blocks.filter((_, j) => j !== i))}><Trash2 size={14} /></AdminButton>
                      </div>
                    </div>
                    <AdminFormInput label="Heading" name={`blk_t_${i}`} bind:value={b.title} />
                    <label class="grid gap-1.5 text-sm font-medium text-ink">
                      <span>Body — leave a blank line between paragraphs</span>
                      <textarea class={textarea} rows={7} bind:value={b.body}></textarea>
                    </label>
                    <label class="grid gap-1.5 text-sm font-medium text-ink">
                      <span>Bullet list (optional · one per line)</span>
                      <textarea
                        class={textarea}
                        rows={4}
                        value={(b.items ?? []).join('\n')}
                        on:change={(e) => {
                          const el = e.target as HTMLTextAreaElement | null;
                          b.items = (el?.value ?? '').split('\n').map((l) => l.trim()).filter(Boolean);
                          blocks = blocks;
                        }}
                      ></textarea>
                    </label>
                  </div>
                {/each}
              </div>
            {/if}
          {/if}
        </div>
      </section>
    {/each}
  </div>

  <!-- sticky save bar -->
  <div class="sticky bottom-0 z-20 -mx-4 border-t border-ink/10 bg-surface/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <p class="text-xs text-ink/55">Changes go live on /about as soon as you save.</p>
      <AdminButton type="button" disabled={saving} on:click={save}>
        <Save size={16} /> {saving ? 'Saving…' : 'Save About page'}
      </AdminButton>
    </div>
  </div>
{/if}
