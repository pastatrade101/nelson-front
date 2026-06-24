<script lang="ts">
  import { tick } from 'svelte';
  import { AlertCircle, CheckCircle2, Copy, MapPin, ShieldCheck } from '@lucide/svelte';
  import { page } from '$app/stores';
  import { api } from '$lib/api/client';
  import Button from './Button.svelte';
  import CountrySelect from './CountrySelect.svelte';
  import type { Tour } from '$lib/types';

  export let tour: Tour | null = null;

  // ── Options ────────────────────────────────────────────────────────────────
  const BUDGET_OPTIONS = ['Budget', 'Mid-range', 'Luxury', 'Not sure yet'];
  const FLEX_OPTIONS = ['Yes', 'No', 'Not sure'];
  const ACCOMMODATION_OPTIONS = [
    'Budget lodge',
    'Mid-range hotel/lodge',
    'Luxury lodge/resort',
    'Tented camp',
    'Beach resort',
    'Not sure yet'
  ];
  const INTERESTS = [
    'Safari',
    'Beach',
    'Honeymoon',
    'Family trip',
    'Culture',
    'Adventure',
    'Luxury',
    'Budget travel',
    'Photography',
    'Wildlife'
  ];

  // ── Form state ───────────────────────────────────────────────────────────────
  // Contact
  let full_name = '';
  let email = '';
  let phone = '';
  let country = '';
  // Trip details
  let travel_date = '';
  let date_flexibility = '';
  let trip_duration = '';
  let number_of_adults = '2';
  let number_of_children = '0';
  let budget_range = '';
  // Preferences
  let travel_interests: string[] = [];
  let accommodation_preference = '';
  // Special requests
  let special_requests = '';
  let message = '';
  // Honeypot — must stay empty
  let hp_company = '';

  let submitting = false;
  let errorMessage = '';
  let bookingCode = '';
  let submitted = false;
  let copied = false;
  let errors: Record<string, string> = {};
  let bodyEl: HTMLDivElement;

  const todayStr = new Date().toISOString().slice(0, 10);
  const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const clearErr = (key: string) => {
    if (errors[key]) {
      const { [key]: _removed, ...rest } = errors;
      errors = rest;
    }
  };

  const toggleInterest = (interest: string) => {
    travel_interests = travel_interests.includes(interest)
      ? travel_interests.filter((i) => i !== interest)
      : [...travel_interests, interest];
  };

  // Field classes: neutral by default, red when that field has an error.
  const inputBase =
    'w-full rounded-md border bg-surface px-3 py-3 text-sm text-ink outline-none transition focus:ring-2';
  $: cls = (field: string) =>
    `${inputBase} ${errors[field] ? 'border-red-300 focus:border-red-400 focus:ring-red-200' : 'border-ink/15 focus:border-forest focus:ring-forest/15'}`;

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (full_name.trim().length < 2) e.full_name = 'Please enter your full name.';
    if (!email.trim()) e.email = 'Email is required.';
    else if (!isEmail(email.trim())) e.email = 'Please enter a valid email address.';
    if (phone.trim().length < 6) e.phone = 'A phone or WhatsApp number is required.';
    if (!country.trim()) e.country = 'Please tell us your country.';
    if (travel_date && travel_date < todayStr) e.travel_date = "Travel date can't be in the past.";
    if (Number(number_of_adults) < 1) e.number_of_adults = 'At least one adult is required.';
    if (number_of_children === '' || Number(number_of_children) < 0) e.number_of_children = "Can't be negative.";
    if (!budget_range) e.budget_range = 'Please choose a budget range.';
    if (!date_flexibility) e.date_flexibility = 'Let us know if your dates are flexible.';
    errors = e;
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (submitting) return;
    errorMessage = '';

    // Honeypot tripped → behave like a normal success without sending anything.
    if (hp_company.trim()) {
      submitted = true;
      return;
    }

    if (!validate()) {
      errorMessage = 'Please check the highlighted fields and try again.';
      await tick();
      (bodyEl?.querySelector('span.text-red-600') as HTMLElement | null)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }

    // Structured trip brief — stored in lead_context (HubSpot/CRM-ready) and
    // shown to the specialist. Empty values are omitted to keep it clean.
    const lead_context: Record<string, unknown> = {
      budget_range,
      date_flexibility,
      source_page_url: $page.url.href,
      submitted_at: new Date().toISOString()
    };
    if (tour?.title) lead_context.selected_trip = tour.title;
    if (trip_duration.trim()) lead_context.trip_duration = trip_duration.trim();
    if (travel_interests.length) lead_context.travel_interests = travel_interests.join(', ');
    if (accommodation_preference) lead_context.accommodation_preference = accommodation_preference;

    submitting = true;
    try {
      const res = await api.bookings.create({
        tour_id: tour?.id ?? null,
        full_name: full_name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        country: country.trim() || null,
        travel_date: travel_date || null,
        number_of_adults: Number(number_of_adults) || 1,
        number_of_children: Number(number_of_children) || 0,
        special_requests: special_requests.trim() || null,
        message: message.trim() || null,
        source: 'website_booking_form',
        lead_context,
        hp_company // honeypot — backend inspects then drops it
      });
      bookingCode = String((res.data as Record<string, unknown>)?.booking_code ?? '');
      submitted = true;
    } catch (error) {
      errorMessage =
        error instanceof Error && error.message
          ? error.message
          : 'Something went wrong. Please try again or contact us directly on WhatsApp.';
    } finally {
      submitting = false;
    }
  };

  const resetForm = () => {
    submitted = false;
    bookingCode = '';
    errors = {};
    errorMessage = '';
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(bookingCode);
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch {
      // clipboard not available — ignore
    }
  };
</script>

{#if submitted}
  <div class="grid gap-5 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-surface p-6 shadow-soft md:p-8">
    <div class="flex items-center gap-3">
      <span class="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-600">
        <CheckCircle2 size={26} />
      </span>
      <div>
        <h3 class="text-xl font-bold text-heading">Thank you! Your request has been received.</h3>
        <p class="mt-1 text-sm text-ink/70">A local travel specialist will contact you shortly.</p>
      </div>
    </div>

    {#if bookingCode}
      <div class="rounded-xl border border-emerald-200 bg-surface p-4">
        <p class="text-xs font-semibold uppercase tracking-[0.14em] text-ink/50">Your request reference</p>
        <div class="mt-1 flex items-center gap-3">
          <p class="text-2xl font-extrabold tracking-wide text-heading">{bookingCode}</p>
          <button class="inline-flex items-center gap-1.5 rounded-lg border border-ink/15 bg-surface px-2.5 py-1 text-xs font-semibold text-ink/70 transition hover:bg-sand" type="button" on:click={copyCode}>
            <Copy size={13} />{copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <p class="mt-2 text-xs leading-5 text-ink/55">Keep this reference for your records. This is a trip planning request — no payment is required yet.</p>
      </div>
    {/if}

    <Button type="button" variant="secondary" on:click={resetForm}>Submit another request</Button>
  </div>
{:else}
  <form class="relative flex max-h-[88vh] flex-col overflow-hidden rounded-2xl border border-ink/10 bg-surface shadow-soft" on:submit|preventDefault={submit} novalidate>
    <!-- Header — stays visible while the body scrolls -->
    <div class="shrink-0 border-b border-ink/10 px-5 py-4 md:px-6">
      <p class="text-xs font-semibold uppercase tracking-[0.14em] text-goldfinch-gold">Booking request</p>
      <h3 class="mt-0.5 text-xl font-bold tracking-normal text-heading">Request this trip with confidence</h3>
      {#if tour}
        <div class="mt-3 flex items-center gap-2.5 rounded-xl border border-forest/20 bg-forest/[0.05] px-3 py-2">
          <MapPin size={15} class="shrink-0 text-forest" />
          <span class="text-[10px] font-bold uppercase tracking-[0.14em] text-forest/70">Trip</span>
          <span class="truncate text-sm font-bold text-heading">{tour.title}</span>
        </div>
      {:else}
        <p class="mt-1 text-sm leading-6 text-ink/65">Share a few details and a local specialist will tailor your plan — no payment now.</p>
      {/if}
    </div>

    <!-- Body — the only part that scrolls -->
    <div class="grid flex-1 gap-4 overflow-y-auto px-5 py-4 md:px-6" bind:this={bodyEl}>
    <!-- ── Contact details ─────────────────────────────────────────────────── -->
    <fieldset class="grid gap-4">
      <legend class="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-goldfinch-gold">Contact details</legend>
      <div class="grid gap-4 md:grid-cols-2">
        <label class="grid gap-1.5 text-sm font-medium text-ink">
          <span>Full name</span>
          <input class={cls('full_name')} bind:value={full_name} on:input={() => clearErr('full_name')} placeholder="Your name" autocomplete="name" />
          {#if errors.full_name}<span class="text-xs text-red-600">{errors.full_name}</span>{/if}
        </label>
        <label class="grid gap-1.5 text-sm font-medium text-ink">
          <span>Email</span>
          <input class={cls('email')} type="email" bind:value={email} on:input={() => clearErr('email')} placeholder="you@example.com" autocomplete="email" />
          {#if errors.email}<span class="text-xs text-red-600">{errors.email}</span>{/if}
        </label>
      </div>
      <div class="grid gap-4 md:grid-cols-2">
        <label class="grid gap-1.5 text-sm font-medium text-ink">
          <span>Phone / WhatsApp</span>
          <input class={cls('phone')} type="tel" bind:value={phone} on:input={() => clearErr('phone')} placeholder="+255 ..." autocomplete="tel" />
          {#if errors.phone}<span class="text-xs text-red-600">{errors.phone}</span>{/if}
        </label>
        <div class="grid gap-1.5 text-sm font-medium text-ink">
          <span>Country</span>
          <CountrySelect bind:value={country} invalid={Boolean(errors.country)} on:change={() => clearErr('country')} placeholder="Search your country..." />
          {#if errors.country}<span class="text-xs text-red-600">{errors.country}</span>{/if}
        </div>
      </div>
    </fieldset>

    <!-- ── Trip details ────────────────────────────────────────────────────── -->
    <fieldset class="grid gap-4 border-t border-ink/10 pt-4">
      <legend class="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-goldfinch-gold">Trip details</legend>
      <div class="grid gap-4 md:grid-cols-2">
        <label class="grid gap-1.5 text-sm font-medium text-ink">
          <span>Preferred travel date</span>
          <input class={cls('travel_date')} type="date" min={todayStr} bind:value={travel_date} on:input={() => clearErr('travel_date')} />
          {#if errors.travel_date}<span class="text-xs text-red-600">{errors.travel_date}</span>{/if}
        </label>
        <label class="grid gap-1.5 text-sm font-medium text-ink">
          <span>Are your dates flexible?</span>
          <select class={cls('date_flexibility')} bind:value={date_flexibility} on:change={() => clearErr('date_flexibility')}>
            <option value="" disabled>Select…</option>
            {#each FLEX_OPTIONS as opt}<option value={opt}>{opt}</option>{/each}
          </select>
          {#if errors.date_flexibility}<span class="text-xs text-red-600">{errors.date_flexibility}</span>{/if}
        </label>
      </div>
      <div class="grid gap-4 md:grid-cols-2">
        <label class="grid gap-1.5 text-sm font-medium text-ink">
          <span>Trip duration</span>
          <input class={cls('trip_duration')} bind:value={trip_duration} placeholder="e.g. 5 days / 4 nights" />
        </label>
        <label class="grid gap-1.5 text-sm font-medium text-ink">
          <span>Estimated budget per person</span>
          <select class={cls('budget_range')} bind:value={budget_range} on:change={() => clearErr('budget_range')}>
            <option value="" disabled>Select budget…</option>
            {#each BUDGET_OPTIONS as opt}<option value={opt}>{opt}</option>{/each}
          </select>
          {#if errors.budget_range}<span class="text-xs text-red-600">{errors.budget_range}</span>{/if}
        </label>
      </div>
      <div class="grid gap-4 md:grid-cols-2">
        <label class="grid gap-1.5 text-sm font-medium text-ink">
          <span>Adults</span>
          <input class={cls('number_of_adults')} type="number" min="1" bind:value={number_of_adults} on:input={() => clearErr('number_of_adults')} />
          {#if errors.number_of_adults}<span class="text-xs text-red-600">{errors.number_of_adults}</span>{/if}
        </label>
        <label class="grid gap-1.5 text-sm font-medium text-ink">
          <span>Children</span>
          <input class={cls('number_of_children')} type="number" min="0" bind:value={number_of_children} on:input={() => clearErr('number_of_children')} />
          {#if errors.number_of_children}<span class="text-xs text-red-600">{errors.number_of_children}</span>{/if}
        </label>
      </div>
    </fieldset>

    <!-- ── Preferences ─────────────────────────────────────────────────────── -->
    <fieldset class="grid gap-4 border-t border-ink/10 pt-4">
      <legend class="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-goldfinch-gold">Preferences</legend>
      <div class="grid gap-2 text-sm font-medium text-ink">
        <span>What are you interested in? <span class="font-normal text-ink/45">(select any)</span></span>
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {#each INTERESTS as interest}
            <label
              class={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                travel_interests.includes(interest)
                  ? 'border-forest bg-forest/[0.07] font-semibold text-heading'
                  : 'border-ink/12 bg-surface text-ink/70 hover:border-forest/40'
              }`}
            >
              <input type="checkbox" class="h-4 w-4 accent-forest" checked={travel_interests.includes(interest)} on:change={() => toggleInterest(interest)} />
              {interest}
            </label>
          {/each}
        </div>
      </div>
      <label class="grid gap-1.5 text-sm font-medium text-ink">
        <span>Accommodation preference</span>
        <select class={cls('accommodation_preference')} bind:value={accommodation_preference}>
          <option value="">No preference</option>
          {#each ACCOMMODATION_OPTIONS as opt}<option value={opt}>{opt}</option>{/each}
        </select>
      </label>
    </fieldset>

    <!-- ── Special requests ────────────────────────────────────────────────── -->
    <fieldset class="grid gap-4 border-t border-ink/10 pt-4">
      <legend class="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-goldfinch-gold">Special requests</legend>
      <label class="grid gap-1.5 text-sm font-medium text-ink">
        <span>Special requests</span>
        <textarea class={inputBase + ' border-ink/15 focus:border-forest focus:ring-forest/15'} rows={2} bind:value={special_requests} placeholder="Dietary needs, accessibility, celebrations, room preferences..."></textarea>
      </label>
      <label class="grid gap-1.5 text-sm font-medium text-ink">
        <span>Anything else we should know?</span>
        <textarea class={inputBase + ' border-ink/15 focus:border-forest focus:ring-forest/15'} rows={3} bind:value={message} placeholder="Must-see places, special occasions, group details..."></textarea>
      </label>
    </fieldset>
    </div>
    <!-- /Body -->

    <!-- Honeypot: hidden from humans, tempting to bots. -->
    <div class="absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden" aria-hidden="true">
      <label>Company<input type="text" name="hp_company" tabindex="-1" autocomplete="off" bind:value={hp_company} /></label>
    </div>

    <!-- Footer — submit button always visible above the fold -->
    <div class="shrink-0 space-y-2.5 border-t border-ink/10 bg-surface px-5 py-3.5 md:px-6">
      {#if errorMessage}
        <div class="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
          <AlertCircle size={15} class="mt-0.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      {/if}

      <Button type="submit" className="w-full">{submitting ? 'Sending your request...' : 'Submit Booking Request'}</Button>

      <p class="flex items-center justify-center gap-1.5 text-center text-xs text-ink/50">
        <ShieldCheck size={13} class="text-forest" />
        Your details are kept private and used only to plan your trip.
      </p>
    </div>
  </form>
{/if}
