<script lang="ts">
  /**
   * "Plan your … safari": the short enquiry beside a destination page. When,
   * how many, how long, what comfort level, a name and an email. It is saved
   * as a booking request like every other lead (Admin › Bookings, the team
   * email), with the destination in its lead details.
   */
  import { tick } from 'svelte';
  import { CheckCircle2 } from '@lucide/svelte';
  import { page } from '$app/stores';
  import { api, ApiRequestError } from '$lib/api/client';
  import { trackEvent } from '$lib/analytics';
  import { currency } from '$lib/currency';
  import { newIdempotencyKey } from '$lib/idempotency';
  import { publicSettings, settingText } from '$lib/settings';
  import { TIER_KEYS, TIER_LABELS } from '$lib/tiers';
  import WhatsAppCta from '../WhatsAppCta.svelte';

  export let destinationName = '';
  export let adjName = '';

  const NIGHTS = ['2–4', '5–7', '8–10', '11 or more', 'Not sure yet'];
  const TRAVELLERS = [1, 2, 3, 4, 5, 6];

  // The next eighteen months, as the month picker's choices.
  const months = (() => {
    const now = new Date();
    return Array.from({ length: 18 }, (_, i) => {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1));
      return d.toLocaleString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    });
  })();

  let month = '';
  let travellers = 2;
  let nights = '5–7';
  let style = '';
  let fullName = '';
  let email = '';
  let hp = '';
  let key = newIdempotencyKey();
  let busy = false;
  let errors: string[] = [];
  let submitError = '';
  let bookingCode = '';
  let errorsEl: HTMLDivElement;
  let doneEl: HTMLDivElement;

  $: replyLine = settingText($publicSettings, 'default_response_time_message');
  $: trustPoints = settingText($publicSettings, 'trust_points')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const validate = () => {
    const e: string[] = [];
    if (fullName.trim().length < 2) e.push('Enter your name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.push('Enter a valid email address.');
    return e;
  };

  async function submit() {
    if (busy || bookingCode) return;
    errors = validate();
    if (errors.length) {
      await tick();
      errorsEl?.focus();
      return;
    }
    const styleLabel = style ? TIER_LABELS[style as keyof typeof TIER_LABELS] : 'Not sure yet';
    const payload = {
      tour_id: null,
      full_name: fullName.trim(),
      email: email.trim(),
      travel_date: null,
      number_of_adults: Number(travellers),
      number_of_children: 0,
      message: `${destinationName} safari · ${month || 'Month not chosen'} · ${travellers === 6 ? '6 or more' : travellers} traveller${travellers === 1 ? '' : 's'} · ${nights} nights · ${styleLabel}`,
      source: 'begin_your_journey',
      currency: 'USD',
      selected_currency: $currency.selectedCurrency,
      idempotency_key: key,
      hp_company: hp,
      lead_context: {
        v: 1,
        form_type: 'destination_enquiry',
        lead_source: 'Website Destination Page',
        source_page_url: $page.url.href,
        destination: destinationName,
        travel_month: month || 'Not sure yet',
        travellers: travellers === 6 ? '6 or more' : String(travellers),
        nights,
        comfort_level: styleLabel,
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
      if (!code) throw new Error('We could not confirm your request was saved. Please try again.');
      bookingCode = code;
      trackEvent('begin_journey_submitted', { transaction_id: code, lead_type: 'destination_enquiry' });
      await tick();
      doneEl?.focus();
    } catch (error) {
      // A rejected request was not saved, so a retry may use a fresh key. An
      // uncertain failure keeps the key, so a retry cannot save it twice.
      if (error instanceof ApiRequestError && [400, 422].includes(error.status)) key = newIdempotencyKey();
      submitError = controller.signal.aborted
        ? 'The connection took too long. Please try again.'
        : error instanceof Error ? error.message : 'We could not send your request. Please try again.';
      trackEvent('form_submit_error', { form_name: 'destination_enquiry', error_type: 'submission' });
    } finally {
      window.clearTimeout(timeout);
      busy = false;
    }
  }
</script>

<div id="plan" class="scroll-mt-[calc(var(--nav-h)+72px)] border border-ink/10 bg-white p-6">
  {#if bookingCode}
    <div class="py-4 text-center" bind:this={doneEl} tabindex="-1">
      <CheckCircle2 size={36} strokeWidth={1.4} class="mx-auto text-forest" />
      <h2 class="type-card mt-4 text-heading">Thank you, {fullName.trim().split(' ')[0]}.</h2>
      <p class="mt-3 text-sm leading-[1.6] text-ink/70">Your request is with our team. We will reply to {email.trim()} with ideas for your {adjName} safari.</p>
      <p class="mt-4 text-[13px] text-ink/60">Your reference <span class="font-semibold text-heading">{bookingCode}</span></p>
      <p class="mt-2 text-[13px] leading-[1.6] text-ink/60">This is a request, not a booking. No payment has been taken.</p>
    </div>
  {:else}
    <form class="dest-form" on:submit|preventDefault={submit} novalidate>
      <h2 class="font-serif text-[26px] font-normal leading-tight text-heading">Plan your {adjName} safari</h2>
      <p class="mt-1.5 text-[13px] leading-[1.6] text-ink/65">Tell us a little. We reply with ideas, not a sales script.</p>

      {#if errors.length}
        <div class="mt-4 border border-[#dfb9ac] bg-[#fff4f1] p-3 text-sm leading-[1.6] text-[#903d26]" bind:this={errorsEl} tabindex="-1" role="alert">
          <ul class="list-disc pl-4">{#each errors as error}<li>{error}</li>{/each}</ul>
        </div>
      {/if}

      <label class="mt-5 block">When are you travelling?
        <select bind:value={month}>
          <option value="">Month and year</option>
          {#each months as option}<option value={option}>{option}</option>{/each}
        </select>
      </label>
      <div class="mt-4 grid grid-cols-2 gap-3">
        <label>Travellers
          <select bind:value={travellers}>
            {#each TRAVELLERS as n}<option value={n}>{n === 6 ? '6 or more' : n === 1 ? '1 adult' : `${n} adults`}</option>{/each}
          </select>
        </label>
        <label>Nights
          <select bind:value={nights}>
            {#each NIGHTS as option}<option value={option}>{option}</option>{/each}
          </select>
        </label>
      </div>
      <label class="mt-4 block">Style
        <select bind:value={style}>
          <option value="">Not sure yet</option>
          {#each TIER_KEYS as tier}<option value={tier}>{TIER_LABELS[tier]}</option>{/each}
        </select>
      </label>
      <label class="mt-4 block">Name<input type="text" autocomplete="name" bind:value={fullName} required /></label>
      <label class="mt-4 block">Email<input type="email" autocomplete="email" placeholder="you@example.com" bind:value={email} required /></label>

      <!-- Left empty by people; bots fill it. -->
      <div class="honeypot" aria-hidden="true"><label>Company<input type="text" tabindex="-1" autocomplete="off" bind:value={hp} /></label></div>

      {#if submitError}<p class="mt-4 text-sm leading-[1.6] text-[#903d26]" role="alert">{submitError}</p>{/if}

      <button type="submit" class="mt-5 inline-flex h-12 w-full items-center justify-center bg-deep-green px-6 text-[15px] font-semibold text-white transition hover:bg-forest disabled:cursor-wait disabled:opacity-70" disabled={busy}>
        {busy ? 'Sending…' : 'Send my request'}
      </button>
      <WhatsAppCta
        variant="ghost"
        context="destination_enquiry"
        message={`Hello Emnel, I would like help planning a ${destinationName} safari.`}
        className="mt-3 inline-flex h-12 w-full items-center justify-center border border-ink/20 text-[15px] font-semibold text-heading transition hover:border-ink/40"
        label="Or chat on WhatsApp"
      >Or chat on WhatsApp</WhatsAppCta>
      <p class="mt-3 text-center text-[12px] leading-[1.6] text-ink/60">No payment to start{#if replyLine} · {replyLine}{/if}</p>

      {#if trustPoints.length}
        <ul class="mt-5 grid gap-1.5 border-t border-ink/10 pt-4 text-[12px] leading-[1.5] text-ink/65">
          {#each trustPoints as point (point)}<li>{point}</li>{/each}
        </ul>
      {/if}
    </form>
  {/if}
</div>

<style>
  .dest-form label { display: block; min-width: 0; font-size: 13px; font-weight: 600; color: rgb(var(--c-heading)); }
  .dest-form input,
  .dest-form select {
    display: block; width: 100%; min-width: 0; margin-top: 6px; border: 1px solid rgb(var(--c-ink) / 0.18);
    background: #fff; padding: 10px 12px; font-size: 16px; font-weight: 400; line-height: 1.4;
    color: rgb(var(--c-ink)); border-radius: 0;
  }
  .dest-form input:focus,
  .dest-form select:focus { outline: 2px solid rgb(var(--c-emnel-gold)); outline-offset: 1px; }
  .dest-form button:focus-visible { outline: 3px solid rgb(var(--c-emnel-gold)); outline-offset: 3px; }
  .honeypot { position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden; }
</style>
