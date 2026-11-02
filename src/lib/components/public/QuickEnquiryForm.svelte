<script lang="ts">
  // The homepage's short enquiry: dates or a month, the party, a budget and how
  // to reply. It is saved as a booking request like every other lead (Admin ›
  // Bookings, the team email, HubSpot), so nothing about it is homepage-only.
  import { tick } from 'svelte';
  import { ArrowRight, CheckCircle2 } from '@lucide/svelte';
  import { page } from '$app/stores';
  import { api, ApiRequestError } from '$lib/api/client';
  import { trackEvent } from '$lib/analytics';
  import { currency } from '$lib/currency';
  import { newIdempotencyKey } from '$lib/idempotency';

  export let plannerHref = '/plan-my-trip';

  const BUDGETS = [
    'Under US$3,000',
    'US$3,000 – 5,000',
    'US$5,000 – 8,000',
    'Over US$8,000',
    'Not sure yet'
  ];

  let dateMode: 'month' | 'exact' = 'month';
  let month = '';
  let startDate = '';
  let endDate = '';
  let adults = 2;
  let children = 0;
  let budget = '';
  let fullName = '';
  let email = '';
  let message = '';
  let hp = '';
  let key = newIdempotencyKey();
  let busy = false;
  let errors: string[] = [];
  let submitError = '';
  let bookingCode = '';
  let errorsEl: HTMLDivElement;
  let doneEl: HTMLDivElement;

  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const monthLabel = (value: string) => {
    const [y, m] = value.split('-').map(Number);
    return y && m ? new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }) : '';
  };

  const validate = () => {
    const e: string[] = [];
    if (dateMode === 'exact') {
      if (!startDate) e.push('Choose your arrival date, or switch to a travel month.');
      else if (endDate && endDate < startDate) e.push('Your departure date is before your arrival date.');
    }
    if (!Number.isInteger(Number(adults)) || Number(adults) < 1) e.push('Enter at least one adult.');
    if (!Number.isInteger(Number(children)) || Number(children) < 0) e.push('Enter the number of children (0 if none).');
    if (fullName.trim().length < 2) e.push('Enter your name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.push('Enter a valid email address.');
    return e;
  };

  async function submit() {
    if (busy || bookingCode) return;
    errors = validate();
    if (errors.length) { await tick(); errorsEl?.focus(); return; }

    const exact = dateMode === 'exact';
    const when = exact
      ? `${startDate}${endDate ? ` to ${endDate}` : ''}`
      : month.trim() ? monthLabel(month) || month.trim() : 'Not sure yet';
    const payload = {
      tour_id: null,
      full_name: fullName.trim(),
      email: email.trim(),
      travel_date: exact ? startDate : null,
      number_of_adults: Number(adults),
      number_of_children: Number(children),
      message: message.trim(),
      source: 'begin_your_journey',
      currency: 'USD',
      selected_currency: $currency.selectedCurrency,
      idempotency_key: key,
      hp_company: hp,
      lead_context: {
        v: 1,
        form_type: 'homepage_quick_enquiry',
        lead_source: 'Website Homepage Enquiry',
        source_page_url: $page.url.href,
        travel_month: when,
        exact_start_date: exact ? startDate : null,
        exact_end_date: exact && endDate ? endDate : null,
        budget_per_person: budget || 'Not given',
        budget_basis: 'Per person for the whole trip, excluding international flights',
        consent_scope: 'Contact about this trip request only; not marketing',
        submitted_at: new Date().toISOString()
      }
    };

    busy = true;
    submitError = '';
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 30000);
    try {
      const response = await api.bookings.create(payload, controller.signal);
      const code = (response.data as { booking_code?: string } | null)?.booking_code;
      if (!code) throw new Error('We could not confirm your enquiry was saved. Please try again.');
      bookingCode = code;
      trackEvent('begin_journey_submitted', { transaction_id: code, lead_type: 'homepage_enquiry' });
      await tick();
      doneEl?.focus();
    } catch (error) {
      // A rejected request was not saved, so a retry may use a fresh key. An
      // uncertain failure keeps the key, so a retry cannot save it twice.
      if (error instanceof ApiRequestError && [400, 422].includes(error.status)) key = newIdempotencyKey();
      submitError = controller.signal.aborted
        ? 'The connection took too long. Please try again.'
        : error instanceof Error ? error.message : 'We could not send your enquiry. Please try again.';
      trackEvent('form_submit_error', { form_name: 'homepage_enquiry', error_type: 'submission' });
    } finally {
      window.clearTimeout(timeout);
      busy = false;
    }
  }
</script>

<div class="bg-surface p-5 text-ink shadow-[0_24px_60px_rgba(0,0,0,0.28)] sm:p-7">
  {#if bookingCode}
    <div class="py-6 text-center" bind:this={doneEl} tabindex="-1">
      <CheckCircle2 size={40} strokeWidth={1.4} class="mx-auto text-forest" />
      <h3 class="type-card mt-4 text-heading">Thank you, {fullName.trim().split(' ')[0]}.</h3>
      <p class="mx-auto mt-3 max-w-sm text-sm leading-[1.6] text-ink/70">
        Your enquiry is with our team in Arusha. We will reply to {email.trim()} about routes, availability and a personal quote.
      </p>
      <p class="mt-5 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink/60">Your reference <span class="ml-1 text-heading">{bookingCode}</span></p>
      <p class="mt-3 text-[13px] leading-[1.6] text-ink/60">This is an enquiry, not a booking. No payment has been taken.</p>
    </div>
  {:else}
    <form class="quick-form" on:submit|preventDefault={submit} novalidate>
      <h3 class="type-card text-heading">Start your enquiry</h3>
      <p class="mt-1.5 text-sm leading-[1.6] text-ink/65">A few details and a local specialist will reply with ideas and prices.</p>

      {#if errors.length}
        <div class="mt-4 border border-[#dfb9ac] bg-[#fff4f1] p-3 text-sm leading-[1.6] text-[#903d26]" bind:this={errorsEl} tabindex="-1" role="alert">
          <ul class="list-disc pl-4">{#each errors as error}<li>{error}</li>{/each}</ul>
        </div>
      {/if}

      <fieldset class="mt-5">
        <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <legend class="text-[13px] font-semibold">When would you like to travel?</legend>
          <div class="flex whitespace-nowrap border border-ink/15 text-[12px] font-semibold" role="group" aria-label="Date type">
            <button type="button" class={`px-2.5 py-1 ${dateMode === 'month' ? 'bg-deep-green text-white' : 'text-ink/60 hover:text-ink'}`} aria-pressed={dateMode === 'month'} on:click={() => (dateMode = 'month')}>Month</button>
            <button type="button" class={`px-2.5 py-1 ${dateMode === 'exact' ? 'bg-deep-green text-white' : 'text-ink/60 hover:text-ink'}`} aria-pressed={dateMode === 'exact'} on:click={() => (dateMode = 'exact')}>Exact dates</button>
          </div>
        </div>
        {#if dateMode === 'month'}
          <label class="mt-2 block"><span class="sr-only">Travel month (optional)</span>
            <!-- Browsers without a month picker show a text box: the placeholder gives the format. -->
            <input type="month" min={today().slice(0, 7)} placeholder="YYYY-MM" bind:value={month} aria-describedby="month-help" />
          </label>
          <p id="month-help" class="mt-1 text-[12px] text-ink/55">Leave blank if you're not sure yet.</p>
        {:else}
          <div class="mt-2 grid gap-3 sm:grid-cols-2">
            <label>Arrival<input type="date" min={today()} bind:value={startDate} required /></label>
            <label>Departure <span class="font-normal text-ink/55">(optional)</span><input type="date" min={startDate || today()} bind:value={endDate} /></label>
          </div>
        {/if}
      </fieldset>

      <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_1.6fr]">
        <label>Adults<input type="number" min="1" max="100" step="1" inputmode="numeric" bind:value={adults} required /></label>
        <label>Children<input type="number" min="0" max="50" step="1" inputmode="numeric" bind:value={children} /></label>
        <label class="col-span-2 sm:col-span-1">Budget per person
          <select bind:value={budget}>
            <option value="">Choose a range</option>
            {#each BUDGETS as option}<option value={option}>{option}</option>{/each}
          </select>
        </label>
      </div>
      <p class="mt-1 text-[12px] text-ink/55">Budget for the whole trip, excluding international flights.</p>

      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <label>Name<input type="text" autocomplete="name" bind:value={fullName} required /></label>
        <label>Email<input type="email" autocomplete="email" bind:value={email} required /></label>
      </div>
      <label class="mt-4 block">Message <span class="font-normal text-ink/55">(optional)</span>
        <textarea rows="2" bind:value={message} placeholder="Parks you'd love to see, a special occasion, anything we should know"></textarea>
      </label>

      <!-- Left empty by people; bots fill it. -->
      <div class="honeypot" aria-hidden="true"><label>Company<input type="text" tabindex="-1" autocomplete="off" bind:value={hp} /></label></div>

      {#if submitError}<p class="mt-4 text-sm leading-[1.6] text-[#903d26]" role="alert">{submitError}</p>{/if}

      <button type="submit" class="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 bg-deep-green px-6 text-sm font-semibold text-white transition hover:bg-forest disabled:cursor-wait disabled:opacity-70" disabled={busy}>
        {busy ? 'Sending…' : 'Send My Enquiry'} {#if !busy}<ArrowRight size={16} />{/if}
      </button>
      <p class="mt-3 text-center text-sm leading-[1.6] text-ink/60">
        No payment needed. We use your details only to reply to this enquiry.
        <a class="underline hover:text-heading" href={plannerHref}>Prefer the full trip planner?</a>
      </p>
    </form>
  {/if}
</div>

<style>
  .quick-form label { display: block; min-width: 0; font-size: 13px; font-weight: 600; }
  .quick-form input,
  .quick-form select,
  .quick-form textarea {
    display: block; width: 100%; min-width: 0; margin-top: 6px; border: 1px solid rgb(var(--c-ink) / 0.18);
    background: rgb(var(--c-surface)); padding: 10px 12px; font-size: 16px; font-weight: 400; line-height: 1.5;
    color: rgb(var(--c-ink)); border-radius: 0;
  }
  .quick-form textarea { resize: vertical; }
  .quick-form input:focus,
  .quick-form select:focus,
  .quick-form textarea:focus { outline: 2px solid rgb(var(--c-goldfinch-gold)); outline-offset: 1px; }
  .quick-form button:focus-visible,
  .quick-form a:focus-visible { outline: 3px solid rgb(var(--c-goldfinch-gold)); outline-offset: 3px; }
  .honeypot { position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden; }
</style>
