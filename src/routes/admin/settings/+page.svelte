<script lang="ts">
  import { onMount } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import type { Component } from 'svelte';
  import {
    BarChart3,
    Bot,
    ClipboardList,
    Image as ImageIcon,
    Info,
    MapPin,
    Palette,
    Save,
    Scale,
    Search,
    Share2,
    RotateCcw,
    Plug,
    MessageCircle,
    X
  } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import AdminButton from '$lib/components/admin/AdminButton.svelte';
  import AdminFormInput from '$lib/components/admin/AdminFormInput.svelte';
  import AdminPageHeader from '$lib/components/admin/AdminPageHeader.svelte';
  import AdminSelect from '$lib/components/admin/AdminSelect.svelte';
  import AdminTextArea from '$lib/components/admin/AdminTextArea.svelte';
  import ToastStack from '$lib/components/admin/ToastStack.svelte';
  import ErrorState from '$lib/components/public/ErrorState.svelte';
  import LoadingState from '$lib/components/public/LoadingState.svelte';

  type FieldType = 'boolean' | 'color' | 'email' | 'image' | 'json' | 'number' | 'phone' | 'select' | 'text' | 'textarea' | 'url';
  type Field = { default?: unknown; helper?: string; key: string; label: string; options?: string[]; public: boolean; type: FieldType };
  type Group = { fields: Field[]; icon: Component; key: string; label: string; note?: string };
  type Toast = { id: string; message: string; type: 'error' | 'success' };

  const GROUPS: Group[] = [
    { key: 'brand', label: 'Brand', icon: Palette, fields: [
      { key: 'site_name', label: 'Site name', type: 'text', public: true, default: 'Emnel Adventures' },
      { key: 'company_name', label: 'Company name', type: 'text', public: true, default: 'Emnel Adventures Limited' },
      { key: 'tagline', label: 'Tagline', type: 'text', public: true, default: 'Private Tanzania safaris, designed in Arusha' },
      { key: 'brand_statement', label: 'Brand statement', type: 'textarea', public: true, default: 'Where the wild speaks, we know how to listen.' },
      { key: 'logo_url', label: 'Logo', type: 'image', public: true, helper: 'Public logo image.' },
      { key: 'favicon_url', label: 'Favicon', type: 'image', public: true }
    ] },
    { key: 'contact', label: 'Contact', icon: MapPin, fields: [
      { key: 'contact_email', label: 'Contact email', type: 'email', public: true },
      { key: 'contact_phone', label: 'Contact phone', type: 'phone', public: true },
      { key: 'whatsapp_number', label: 'WhatsApp number', type: 'phone', public: true },
      { key: 'office_address', label: 'Office address', type: 'text', public: true },
      { key: 'city', label: 'City', type: 'text', public: true },
      { key: 'country', label: 'Country', type: 'text', public: true },
      { key: 'google_maps_url', label: 'Google Maps URL', type: 'url', public: true },
      { key: 'business_hours', label: 'Business hours', type: 'text', public: true }
    ] },
    { key: 'social', label: 'Social', icon: Share2, fields: [
      { key: 'facebook_url', label: 'Facebook', type: 'url', public: true },
      { key: 'instagram_url', label: 'Instagram', type: 'url', public: true },
      { key: 'youtube_url', label: 'YouTube', type: 'url', public: true },
      { key: 'tiktok_url', label: 'TikTok', type: 'url', public: true },
      { key: 'linkedin_url', label: 'LinkedIn', type: 'url', public: true },
      { key: 'tripadvisor_url', label: 'TripAdvisor', type: 'url', public: true }
    ] },
    { key: 'seo', label: 'SEO', icon: Search, fields: [
      { key: 'default_meta_title', label: 'Default meta title', type: 'text', public: true },
      { key: 'default_meta_description', label: 'Default meta description', type: 'textarea', public: true },
      { key: 'default_og_image_url', label: 'Default OG image', type: 'image', public: true },
      { key: 'canonical_base_url', label: 'Canonical base URL', type: 'url', public: true },
      { key: 'robots_indexing_enabled', label: 'Allow search engine indexing', type: 'boolean', public: true, default: true }
    ] },
    { key: 'booking', label: 'Booking', icon: ClipboardList, fields: [
      { key: 'booking_enabled', label: 'Booking enabled', type: 'boolean', public: true, default: true },
      { key: 'booking_success_message', label: 'Booking success message', type: 'textarea', public: true },
      { key: 'default_currency', label: 'Default currency', type: 'select', public: true, options: ['USD', 'EUR', 'GBP', 'TZS', 'KES'], default: 'USD' },
      { key: 'default_response_time_message', label: 'Response time message', type: 'text', public: true },
      { key: 'require_phone_number', label: 'Require phone number', type: 'boolean', public: true },
      { key: 'allow_general_plan_my_trip', label: 'Allow general Plan My Safari', type: 'boolean', public: true, default: true }
    ] },
    { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, fields: [
      { key: 'whatsapp_enabled', label: 'WhatsApp CTA enabled', type: 'boolean', public: true, default: true },
      { key: 'whatsapp_button_text', label: 'Button text', type: 'text', public: true, default: 'Chat on WhatsApp' },
      { key: 'whatsapp_default_message', label: 'Default message', type: 'textarea', public: true },
      { key: 'whatsapp_display_pages', label: 'Display pages', type: 'json', public: true, helper: 'JSON array of page keys, e.g. ["home","tours","contact"].' }
    ] },
    { key: 'ai', label: 'AI Advisor', icon: Bot, note: 'The Anthropic API key is managed securely in backend environment variables — never here.', fields: [
      { key: 'ai_enabled', label: 'AI advisor enabled', type: 'boolean', public: true, default: true },
      { key: 'ai_widget_enabled', label: 'Show AI chat widget', type: 'boolean', public: true, default: true },
      { key: 'ai_display_name', label: 'AI display name', type: 'text', public: true, default: 'Emnel AI Safari Advisor' },
      { key: 'ai_intro_message', label: 'AI intro message', type: 'textarea', public: true },
      { key: 'ai_handoff_message', label: 'AI handoff message', type: 'textarea', public: true },
      { key: 'ai_status_label', label: 'AI status label', type: 'text', public: true, default: 'Online' }
    ] },
    { key: 'hubspot', label: 'HubSpot', icon: Plug, note: 'The HubSpot access token is managed securely in backend environment variables — never here.', fields: [
      { key: 'hubspot_enabled', label: 'HubSpot enabled', type: 'boolean', public: false },
      { key: 'hubspot_sync_enabled', label: 'Sync leads & bookings', type: 'boolean', public: false },
      { key: 'hubspot_pipeline_name', label: 'Pipeline name', type: 'text', public: false, default: 'Sales Pipeline' }
    ] },
    { key: 'analytics', label: 'Analytics', icon: BarChart3, fields: [
      { key: 'ga4_measurement_id', label: 'GA4 measurement ID', type: 'text', public: true, helper: 'e.g. G-XXXXXXXXXX' },
      { key: 'gsc_verification_code', label: 'Search Console verification', type: 'text', public: true },
      { key: 'enable_cookie_notice', label: 'Show cookie notice', type: 'boolean', public: true, default: true }
    ] },
    { key: 'legal', label: 'Legal', icon: Scale, fields: [
      { key: 'privacy_policy_url', label: 'Privacy policy URL', type: 'url', public: true },
      { key: 'terms_url', label: 'Terms URL', type: 'url', public: true },
      { key: 'cancellation_policy_url', label: 'Cancellation policy URL', type: 'url', public: true },
      { key: 'data_retention_notice', label: 'Data retention notice', type: 'textarea', public: true }
    ] }
  ];

  const ALL_FIELDS = GROUPS.flatMap((g) => g.fields);
  const groupOfField = new Map(GROUPS.flatMap((g) => g.fields.map((f) => [f.key, g.key] as const)));
  const fieldByKey = new Map(ALL_FIELDS.map((f) => [f.key, f]));

  let loading = true;
  let saving = false;
  let error = '';
  let activeGroup = 'brand';
  // Holds mixed value types per setting (string, boolean, JSON string) — keyed by setting key.
  let values: Record<string, any> = {};
  let originalSerialized: Record<string, string> = {};
  let toasts: Toast[] = [];

  // media picker
  let mediaPickerFor: null | string = null;
  let mediaItems: { file_name: string; file_url: string; id: string }[] = [];
  let loadingMedia = false;

  $: group = GROUPS.find((g) => g.key === activeGroup) ?? GROUPS[0];
  $: dirtyKeys = ALL_FIELDS.filter((f) => JSON.stringify(values[f.key]) !== originalSerialized[f.key]).map((f) => f.key);
  $: hasChanges = dirtyKeys.length > 0;

  const showToast = (message: string, type: Toast['type'] = 'success') => {
    const id = crypto.randomUUID();
    toasts = [{ id, message, type }, ...toasts].slice(0, 4);
    setTimeout(() => { toasts = toasts.filter((t) => t.id !== id); }, 3500);
  };
  const dismissToast = (e: CustomEvent<string>) => { toasts = toasts.filter((t) => t.id !== e.detail); };

  const initialValue = (field: Field) => field.default ?? (field.type === 'boolean' ? false : '');

  const load = async () => {
    loading = true;
    error = '';
    try {
      const res = await api.settings.list();
      const map = new Map((res.data as Array<Record<string, unknown>>).map((s) => [String(s.setting_key), s.setting_value]));
      const next: Record<string, unknown> = {};
      for (const field of ALL_FIELDS) {
        let raw = map.has(field.key) ? map.get(field.key) : initialValue(field);
        if (field.type === 'json') raw = JSON.stringify(raw ?? [], null, 2);
        next[field.key] = raw;
      }
      values = next;
      originalSerialized = Object.fromEntries(ALL_FIELDS.map((f) => [f.key, JSON.stringify(next[f.key])]));
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to load settings.';
    } finally {
      loading = false;
    }
  };

  const discard = () => {
    const next: Record<string, unknown> = {};
    for (const f of ALL_FIELDS) next[f.key] = JSON.parse(originalSerialized[f.key]);
    values = next;
    showToast('Changes discarded.');
  };

  const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
  const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  const validate = (field: Field, value: unknown): string | null => {
    if (value === '' || value === null || value === undefined) return null;
    if (field.type === 'url' && (typeof value !== 'string' || !/^https?:\/\/.+/.test(value))) return `${field.label} must be a valid URL (https://...).`;
    if (field.type === 'email' && (typeof value !== 'string' || !EMAIL.test(value))) return `${field.label} must be a valid email.`;
    if (field.type === 'color' && (typeof value !== 'string' || !HEX.test(value))) return `${field.label} must be a valid hex color.`;
    return null;
  };

  const save = async () => {
    const changed = dirtyKeys;
    if (changed.length === 0) return;

    const payloads: { body: Record<string, unknown>; key: string }[] = [];
    for (const key of changed) {
      const field = fieldByKey.get(key);
      if (!field) continue;
      let value: unknown = values[key];
      if (field.type === 'json') {
        try {
          value = JSON.parse(String(values[key] || 'null'));
        } catch {
          showToast(`${field.label} must be valid JSON.`, 'error');
          return;
        }
      }
      const err = validate(field, value);
      if (err) { showToast(err, 'error'); return; }
      payloads.push({
        key,
        body: { setting_value: value, setting_group: groupOfField.get(key) ?? 'general', setting_type: field.type, is_public: field.public }
      });
    }

    saving = true;
    try {
      for (const { key, body } of payloads) {
        await api.settings.update(key, body);
      }
      for (const { key } of payloads) originalSerialized[key] = JSON.stringify(values[key]);
      originalSerialized = { ...originalSerialized };
      showToast(`Saved ${payloads.length} setting${payloads.length === 1 ? '' : 's'}.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to save settings.', 'error');
    } finally {
      saving = false;
    }
  };

  const openMediaPicker = async (key: string) => {
    mediaPickerFor = key;
    if (mediaItems.length || loadingMedia) return;
    loadingMedia = true;
    try {
      const res = await api.media.list({ file_type: 'image', limit: 200 });
      mediaItems = (res.data.items as Array<Record<string, unknown>>)
        .map((m) => ({ id: String(m.id ?? ''), file_name: String(m.file_name ?? 'Image'), file_url: String(m.file_url ?? '') }))
        .filter((m) => m.file_url);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to load media.', 'error');
    } finally {
      loadingMedia = false;
    }
  };
  const pickMedia = (url: string) => {
    if (mediaPickerFor) values[mediaPickerFor] = url;
    mediaPickerFor = null;
  };

  onMount(load);
</script>

<ToastStack {toasts} on:dismiss={dismissToast} />

<div class="mx-auto grid w-full max-w-[1500px] gap-6 pb-24">
  <AdminPageHeader
    eyebrow="Administration"
    title="Website Settings"
    description="Manage safe public configuration, brand details, contact information, SEO defaults, integrations status, and platform preferences."
  />

  {#if loading}
    <LoadingState message="Loading settings..." />
  {:else if error}
    <ErrorState message={error} />
  {:else}
    <div class="grid gap-5 lg:grid-cols-[240px_1fr] lg:items-start">
      <!-- group nav -->
      <nav class="flex gap-2 overflow-x-auto rounded-2xl border border-ink/10 bg-surface p-2 shadow-sm lg:sticky lg:top-24 lg:flex-col lg:overflow-visible">
        {#each GROUPS as g}
          {@const Icon = g.icon}
          {@const groupDirty = g.fields.some((f) => dirtyKeys.includes(f.key))}
          <button
            class={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition lg:w-full ${activeGroup === g.key ? 'bg-forest text-white shadow-sm' : 'text-ink/65 hover:bg-sand/60'}`}
            type="button"
            on:click={() => (activeGroup = g.key)}
          >
            <span class={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${activeGroup === g.key ? 'bg-surface/15' : 'bg-sand/70'}`}><Icon size={15} /></span>
            <span class="whitespace-nowrap">{g.label}</span>
            {#if groupDirty}<span class="ml-auto hidden h-2 w-2 shrink-0 rounded-full bg-goldfinch-gold lg:block"></span>{/if}
          </button>
        {/each}
      </nav>

      <!-- form area -->
      <section class="grid gap-4 rounded-none border border-ink/10 bg-surface p-5 shadow-[0_14px_44px_rgba(28,26,22,0.06)] sm:p-6">
        <div class="flex items-center gap-3 border-b border-ink/10 pb-4">
          <svelte:component this={group.icon} size={20} class="text-forest" />
          <h2 class="text-lg font-bold text-ink">{group.label} settings</h2>
        </div>

        {#if group.note}
          <p class="flex items-start gap-2 rounded-xl border border-sky-200/70 bg-sky-50 p-3 text-xs leading-5 text-sky-800">
            <Info size={15} class="mt-0.5 shrink-0" />{group.note}
          </p>
        {/if}

        <div class="grid gap-4 sm:grid-cols-2">
          {#each group.fields as field (field.key)}
            <div class={field.type === 'textarea' || field.type === 'json' || field.type === 'image' ? 'sm:col-span-2' : ''}>
              {#if field.type === 'boolean'}
                <label class="flex h-full cursor-pointer items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-surface p-4 transition hover:bg-sand/30">
                  <span>
                    <span class="text-sm font-semibold text-ink">{field.label}</span>
                    {#if field.helper}<span class="mt-0.5 block text-xs text-ink/50">{field.helper}</span>{/if}
                  </span>
                  <input class="h-5 w-5 accent-forest" type="checkbox" bind:checked={values[field.key]} />
                </label>
              {:else if field.type === 'textarea'}
                <AdminTextArea label={field.label} name={field.key} bind:value={values[field.key]} rows={3} />
                {#if field.helper}<p class="mt-1 text-xs text-ink/50">{field.helper}</p>{/if}
              {:else if field.type === 'json'}
                <label class="grid gap-2 text-sm font-medium text-ink">
                  <span>{field.label}</span>
                  <textarea class="min-h-[100px] rounded-2xl border border-ink/10 bg-surface px-3 py-2 font-mono text-xs shadow-sm outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/15" bind:value={values[field.key]} spellcheck="false"></textarea>
                  {#if field.helper}<span class="text-xs font-normal text-ink/50">{field.helper}</span>{/if}
                </label>
              {:else if field.type === 'select'}
                <AdminSelect label={field.label} name={field.key} bind:value={values[field.key]} options={(field.options ?? []).map((o) => ({ label: o, value: o }))} />
              {:else if field.type === 'color'}
                <label class="grid gap-2 text-sm font-medium text-ink">
                  <span>{field.label}</span>
                  <span class="flex h-11 items-center gap-2 rounded-2xl border border-ink/10 bg-surface px-2 shadow-sm">
                    <input class="h-8 w-10 shrink-0 cursor-pointer rounded-lg border border-ink/10 bg-surface p-0.5" type="color" bind:value={values[field.key]} aria-label={field.label} />
                    <input class="min-w-0 flex-1 bg-transparent font-mono text-sm uppercase outline-none" bind:value={values[field.key]} spellcheck="false" />
                  </span>
                </label>
              {:else if field.type === 'image'}
                <label class="grid gap-2 text-sm font-medium text-ink">
                  <span>{field.label}</span>
                  <div class="flex items-center gap-3">
                    <div class="grid h-14 w-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-ink/10 bg-sand/40">
                      {#if values[field.key]}<img class="h-full w-full object-cover" src={String(values[field.key])} alt={field.label} />{:else}<ImageIcon size={18} class="text-ink/30" />{/if}
                    </div>
                    <input class="h-11 min-w-0 flex-1 rounded-2xl border border-ink/10 bg-surface px-3 text-sm shadow-sm outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/15" bind:value={values[field.key]} placeholder="https://..." />
                    <button class="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-2xl border border-ink/10 bg-surface px-3 text-xs font-semibold text-ink shadow-sm transition hover:bg-sand/60" type="button" on:click={() => openMediaPicker(field.key)}><ImageIcon size={14} />Media</button>
                  </div>
                  {#if field.helper}<span class="text-xs font-normal text-ink/50">{field.helper}</span>{/if}
                </label>
              {:else}
                <AdminFormInput label={field.label} name={field.key} type={field.type === 'phone' ? 'tel' : field.type} bind:value={values[field.key]} placeholder={field.helper ?? ''} />
              {/if}
            </div>
          {/each}
        </div>
      </section>
    </div>
  {/if}
</div>

<!-- sticky save bar -->
{#if !loading && !error}
  <div class="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center p-4">
    <div class="pointer-events-auto flex w-full max-w-[1500px] items-center justify-between gap-4 rounded-2xl border border-ink/10 bg-surface/95 px-5 py-3 shadow-[0_-6px_30px_rgba(28,26,22,0.12)] backdrop-blur">
      <p class="text-sm font-medium text-ink/60">
        {#if hasChanges}<span class="font-bold text-goldfinch-gold">{dirtyKeys.length}</span> unsaved change{dirtyKeys.length === 1 ? '' : 's'}{:else}All changes saved{/if}
      </p>
      <div class="flex gap-2">
        <AdminButton variant="secondary" type="button" disabled={!hasChanges || saving} on:click={discard}><RotateCcw size={15} />Discard</AdminButton>
        <AdminButton type="button" disabled={!hasChanges || saving} on:click={save}><Save size={16} />{saving ? 'Saving...' : 'Save Changes'}</AdminButton>
      </div>
    </div>
  </div>
{/if}

<!-- media picker modal -->
{#if mediaPickerFor}
  <div class="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4 backdrop-blur-sm" transition:fade={{ duration: 140 }}>
    <div class="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-none border border-ink/10 bg-surface shadow-[0_24px_80px_rgba(28,26,22,0.18)]" transition:scale={{ duration: 160, start: 0.98 }}>
      <div class="flex items-center justify-between border-b border-ink/10 bg-sand/30 p-4">
        <h3 class="text-base font-bold text-ink">Choose an image</h3>
        <button class="grid h-9 w-9 place-items-center rounded-xl border border-ink/10 bg-surface text-ink shadow-sm transition hover:bg-sand" type="button" aria-label="Close" on:click={() => (mediaPickerFor = null)}><X size={16} /></button>
      </div>
      <div class="overflow-y-auto p-4">
        {#if loadingMedia}
          <p class="py-8 text-center text-sm text-ink/50">Loading media...</p>
        {:else if mediaItems.length === 0}
          <p class="py-8 text-center text-sm text-ink/50">No images in the Media Library yet.</p>
        {:else}
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {#each mediaItems as m (m.id)}
              <button class="group overflow-hidden rounded-xl border border-ink/10 bg-sand/30 transition hover:border-goldfinch-gold/50" type="button" on:click={() => pickMedia(m.file_url)}>
                <div class="aspect-square"><img class="h-full w-full object-cover transition group-hover:scale-105" src={m.file_url} alt={m.file_name} loading="lazy" /></div>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
