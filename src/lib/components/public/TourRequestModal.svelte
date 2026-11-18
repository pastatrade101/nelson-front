<script lang="ts" context="module">
  import type { TierKey as Tier } from '$lib/tiers';
  export type OpenOptions = {
    step?: 1 | 2;
    tier?: Tier;
    adults?: number;
    /** 'price_cell' or 'plan_button'. */
    entry?: string;
    /** e.g. "Classic · 2 travellers". */
    entryCell?: string;
    /** Which button: hero, tabbar, grid, mobile-bar… */
    placement?: string;
  };
</script>

<script lang="ts">
  /**
   * "Request this safari": the two-step form opened from the price grid and
   * from every "Plan this trip" button on a tour that has one (Nelson's brief,
   * 16 Nov 2026).
   *
   *   Step 1  Your trip: comfort level, adults, children under 11, travel
   *           month, and a live estimate. Skipped when a price was clicked.
   *   Step 2  Your details: name, email, WhatsApp (optional), notes (optional).
   *   Done    The reference number, the 24-hour promise and WhatsApp.
   *
   * Saved as a Pending booking request (source 'tour_enquiry') with the trip,
   * the estimate, where it was opened from and the campaign that brought the
   * visitor. A request for a quote, never a booking: no payment wording.
   *
   * Choices survive closing and reopening on the page (and a reload, in this
   * tab); the contact details stay in memory only.
   */
  import { onDestroy, tick } from 'svelte';
  import { ArrowLeft, CheckCircle2, MessageCircle, Minus, Plus, X } from '@lucide/svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { api, ApiRequestError } from '$lib/api/client';
  import { trackEvent } from '$lib/analytics';
  import { getAttribution } from '$lib/attribution';
  import { currency, formatUsdWhole } from '$lib/currency';
  import { newIdempotencyKey } from '$lib/idempotency';
  import { gridAdultPrice, gridEstimate, normalizeTier, travelMonths, type GridColumn, type TierKey } from '$lib/tiers';
  import type { Tour } from '$lib/types';

  export let tour: Tour;
  export let columns: GridColumn[] = [];
  /** WhatsApp number, digits only. */
  export let waDigits = '';

  type Step = 1 | 2 | 'done';

  const MIN_ADULTS = 1;
  const MAX_ADULTS = 12;
  const MAX_CHILDREN = 8;
  const months = travelMonths(new Date(), 18);

  let isOpen = false;
  let step: Step = 1;
  let tier: TierKey | '' = '';
  let adults = 2;
  let children = 0;
  let month = 'not_sure';
  let entry = 'plan_button';
  let entryCell = '';
  let placement = '';

  let fullName = '';
  let email = '';
  let phone = '';
  let notes = '';
  let hp = '';
  let key = newIdempotencyKey();
  let busy = false;
  let errors: string[] = [];
  let submitError = '';
  let bookingCode = '';

  let panel: HTMLDivElement;
  let errorsEl: HTMLDivElement;
  let opener: HTMLElement | null = null;

  const storageKey = () => `emnel_tour_request:${tour?.id ?? ''}`;

  // The tour's "From" level first, else the lowest priced level.
  $: defaultTier = (() => {
    const budget = normalizeTier(tour?.budget_tier);
    return columns.find((c) => c.tier === budget)?.tier ?? columns[0]?.tier ?? '';
  })();
  $: if (!tier || !columns.some((c) => c.tier === tier)) tier = defaultTier;

  $: column = columns.find((c) => c.tier === tier) ?? null;
  $: estimate = gridEstimate(column, adults, children);
  $: adultPrice = gridAdultPrice(column, adults);
  $: monthLabel = months.find((m) => m.value === month)?.label ?? 'Not sure yet';
  $: travellersText = `${adults} adult${adults === 1 ? '' : 's'}${children ? `, ${children} ${children === 1 ? 'child' : 'children'}` : ''}`;
  $: money = (amount: number | null | undefined) => (amount ? formatUsdWhole(amount, $currency) : '');
  $: estimateText = estimate ? `About ${money(estimate)}` : 'Price on request';
  $: estimateWhy =
    estimate
      ? 'Indicative. Your exact quote follows within 24 hours.'
      : adults > 6
        ? 'For 7 or more adults Nelson prices your group directly, within 24 hours.'
        : 'Nelson prices this for you within 24 hours.';

  const restore = () => {
    try {
      const raw = sessionStorage.getItem(storageKey());
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<{ tier: string; adults: number; children: number; month: string }>;
      const t = normalizeTier(saved.tier);
      if (t && columns.some((c) => c.tier === t)) tier = t;
      if (Number.isInteger(saved.adults)) adults = Math.min(MAX_ADULTS, Math.max(MIN_ADULTS, Number(saved.adults)));
      if (Number.isInteger(saved.children)) children = Math.min(MAX_CHILDREN, Math.max(0, Number(saved.children)));
      if (saved.month && months.some((m) => m.value === saved.month)) month = saved.month;
    } catch {
      // storage blocked: start from the defaults
    }
  };
  let restored = false;
  $: if (browser && tour?.id && columns.length && !restored) {
    restored = true;
    restore();
  }
  $: if (browser && restored) {
    try {
      sessionStorage.setItem(storageKey(), JSON.stringify({ tier, adults, children, month }));
    } catch {
      // storage blocked: choices still last while the page is open
    }
  }

  const tierLabelOf = (t: TierKey | '') => columns.find((c) => c.tier === t)?.label ?? '';

  const eventBase = () => ({ tour_id: tour.id, tour_title: tour.title, comfort_tier: tier || undefined, travellers: adults });

  const show = async (next: Step) => {
    step = next;
    if (next === 1) trackEvent('enquiry_step1_view', { ...eventBase(), entry_point: entry });
    if (next === 2) trackEvent('enquiry_step2_view', { ...eventBase(), entry_point: entry, estimated_total: estimate ?? undefined });
    await tick();
    panel?.scrollTo?.({ top: 0 });
    panel?.focus();
  };

  /** Open the form. From a price: step 2 with that level and group size. */
  export async function open(options: OpenOptions = {}) {
    if (!browser || !columns.length) return;
    opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (bookingCode) {
      // A request already went; this is a new one, with the same choices.
      bookingCode = '';
      key = newIdempotencyKey();
    }
    if (options.tier && columns.some((c) => c.tier === options.tier)) tier = options.tier;
    if (options.adults) adults = Math.min(MAX_ADULTS, Math.max(MIN_ADULTS, options.adults));
    entry = options.entry ?? 'plan_button';
    entryCell = options.entryCell ?? '';
    placement = options.placement ?? '';
    errors = [];
    submitError = '';
    isOpen = true;
    document.body.style.overflow = 'hidden';
    await show(options.step ?? 1);
  }

  export function close() {
    if (!isOpen) return;
    isOpen = false;
    if (browser) document.body.style.overflow = '';
    opener?.focus();
  }

  onDestroy(() => {
    if (browser && isOpen) document.body.style.overflow = '';
  });

  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen) close();
  };

  const step2 = () => void show(2);

  const validate = () => {
    const e: string[] = [];
    if (fullName.trim().length < 2) e.push('Enter your full name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) e.push('Enter a valid email address.');
    const p = phone.trim();
    if (p && (!/^[+\d][\d\s().-]*$/.test(p) || p.replace(/\D/g, '').length < 6)) {
      e.push('Enter your WhatsApp number with its country code, e.g. +44 7700 900123, or leave it empty.');
    }
    return e;
  };

  async function submit() {
    if (busy) return;
    errors = validate();
    if (errors.length) {
      await tick();
      errorsEl?.focus();
      return;
    }

    const travelMonth = month === 'not_sure' ? null : month;
    const payload = {
      tour_id: tour.id,
      full_name: fullName.trim(),
      email: email.trim(),
      phone: phone.trim() || null,
      number_of_adults: adults,
      number_of_children: children,
      message: notes.trim() || null,
      estimated_amount: estimate ?? null,
      currency: 'USD',
      selected_currency: $currency.selectedCurrency,
      source: 'tour_enquiry',
      idempotency_key: key,
      hp_company: hp,
      lead_context: {
        v: 1,
        form_type: 'tour_enquiry',
        lead_source: 'Tour price grid',
        selected_trip: tour.title,
        comfort_tier: tier,
        comfort_label: tierLabelOf(tier),
        adult_price_per_person: adultPrice,
        child_price_per_person: column?.child ?? null,
        travel_month: travelMonth,
        travel_month_label: monthLabel,
        estimated_total: estimate ?? null,
        estimate_currency: 'USD',
        entry_point: entry,
        entry_cell: entryCell || null,
        placement: placement || null,
        source_page_url: `${$page.url.origin}${$page.url.pathname}`,
        attribution: getAttribution(),
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
      trackEvent('enquiry_submit', {
        ...eventBase(),
        estimated_total: estimate ?? undefined,
        value: estimate ?? undefined,
        currency: 'USD',
        transaction_id: code,
        lead_type: 'tour_enquiry',
        entry_point: entry
      });
      step = 'done';
      await tick();
      panel?.focus();
    } catch (error) {
      // A refused request was not saved, so a retry may use a fresh key; an
      // uncertain failure keeps it, so a retry cannot save the request twice.
      if (error instanceof ApiRequestError && [400, 422].includes(error.status)) key = newIdempotencyKey();
      submitError = controller.signal.aborted
        ? 'The connection took too long. Please try again.'
        : error instanceof Error ? error.message : 'We could not send your request. Please try again.';
      trackEvent('form_submit_error', { form_name: 'tour_enquiry', error_type: 'submission' });
    } finally {
      window.clearTimeout(timeout);
      busy = false;
    }
  }

  $: waHref = waDigits
    ? `https://wa.me/${waDigits}?text=${encodeURIComponent(
        bookingCode
          ? `Hello Nelson, my safari request reference is ${bookingCode} (${tour.title}).`
          : `Hello Nelson, I'm interested in the ${tour.title}.`
      )}`
    : '';

  const inputClass =
    'mt-1.5 w-full border border-ink/20 bg-surface px-3.5 py-3 text-[15px] text-heading outline-none transition placeholder:text-ink/35 hover:border-ink/35 focus:border-deep-green focus:ring-2 focus:ring-deep-green/15';
  const stepperClass =
    'grid h-11 w-11 place-items-center border border-ink/20 text-heading transition hover:border-deep-green disabled:cursor-not-allowed disabled:opacity-35';
</script>

<svelte:window on:keydown={onKeydown} />

{#if isOpen}
  <div class="fixed inset-0 z-[100] overflow-y-auto overscroll-contain" role="dialog" aria-modal="true" aria-labelledby="tour-request-title" data-lenis-prevent>
    <button class="fixed inset-0 cursor-default bg-ink/70 backdrop-blur-sm" type="button" tabindex="-1" aria-label="Close" on:click={close}></button>
    <div class="pointer-events-none relative flex min-h-full items-start justify-center sm:items-center sm:p-6">
      <div class="pointer-events-auto relative min-h-[100svh] w-full bg-surface shadow-[0_28px_90px_rgba(0,0,0,0.35)] outline-none sm:min-h-0 sm:max-w-[480px]" bind:this={panel} tabindex="-1">
        <div class="flex items-center justify-between border-b border-ink/[0.07] px-5 py-3.5 sm:px-7">
          {#if step === 'done'}
            <span class="text-[13px] font-semibold text-heading">Request sent</span>
          {:else}
            <p class="text-[13px] text-ink/55">
              <span class={step === 1 ? 'font-semibold text-heading' : ''}>1 Your trip</span>
              <span aria-hidden="true"> · </span>
              <span class={step === 2 ? 'font-semibold text-heading' : ''}>2 Your details</span>
            </p>
          {/if}
          <button class="-mr-2 grid h-11 w-11 place-items-center text-ink/60 transition hover:text-heading" type="button" aria-label="Close" on:click={close}>
            <X size={20} />
          </button>
        </div>

        <div class="px-5 pb-7 pt-6 sm:px-7">
          {#if step === 1}
            <h2 id="tour-request-title" class="font-serif text-[30px] font-normal leading-tight text-heading">Request this safari</h2>
            <p class="mt-1.5 text-[14px] text-ink/65">{tour.title}</p>

            <fieldset class="mt-6">
              <legend class="text-[14px] font-semibold text-heading">Comfort level</legend>
              <div class="mt-2.5 grid gap-2" style="grid-template-columns: repeat(auto-fit, minmax(118px, 1fr));">
                {#each columns as c (c.tier)}
                  {@const two = c.cells[1]?.price ?? null}
                  <button
                    class={`flex min-h-[60px] flex-col justify-center border px-3 py-2 text-left transition ${tier === c.tier ? 'border-clay bg-savanna/45' : 'border-ink/15 hover:border-ink/35'}`}
                    type="button"
                    aria-pressed={tier === c.tier}
                    on:click={() => (tier = c.tier)}
                  >
                    <span class="text-[14px] font-semibold text-heading">{c.label}</span>
                    <span class="text-[12px] text-ink/60 [font-variant-numeric:tabular-nums]">{two ? `${money(two)} pp` : 'On request'}</span>
                  </button>
                {/each}
              </div>
              <p class="mt-2 text-[12px] text-ink/50">Prices per person for 2 travellers.</p>
            </fieldset>

            <fieldset class="mt-6">
              <legend class="text-[14px] font-semibold text-heading">Who is travelling</legend>
              <div class="mt-1 divide-y divide-ink/[0.07]">
                <div class="flex items-center justify-between gap-4 py-3">
                  <span id="adults-label" class="text-[15px] text-heading">Adults</span>
                  <div class="flex items-center gap-3" role="group" aria-labelledby="adults-label">
                    <button class={stepperClass} type="button" aria-label="One adult fewer" disabled={adults <= MIN_ADULTS} on:click={() => (adults = Math.max(MIN_ADULTS, adults - 1))}><Minus size={16} /></button>
                    <span class="w-6 text-center text-[16px] font-semibold text-heading [font-variant-numeric:tabular-nums]" aria-live="polite">{adults}</span>
                    <button class={stepperClass} type="button" aria-label="One adult more" disabled={adults >= MAX_ADULTS} on:click={() => (adults = Math.min(MAX_ADULTS, adults + 1))}><Plus size={16} /></button>
                  </div>
                </div>
                <div class="flex items-center justify-between gap-4 py-3">
                  <span id="children-label" class="text-[15px] text-heading">Children under 11</span>
                  <div class="flex items-center gap-3" role="group" aria-labelledby="children-label">
                    <button class={stepperClass} type="button" aria-label="One child fewer" disabled={children <= 0} on:click={() => (children = Math.max(0, children - 1))}><Minus size={16} /></button>
                    <span class="w-6 text-center text-[16px] font-semibold text-heading [font-variant-numeric:tabular-nums]" aria-live="polite">{children}</span>
                    <button class={stepperClass} type="button" aria-label="One child more" disabled={children >= MAX_CHILDREN} on:click={() => (children = Math.min(MAX_CHILDREN, children + 1))}><Plus size={16} /></button>
                  </div>
                </div>
              </div>
            </fieldset>

            <label class="mt-5 block">
              <span class="text-[14px] font-semibold text-heading">When would you like to travel?</span>
              <select class={`${inputClass} appearance-auto`} bind:value={month}>
                {#each months as m (m.value)}
                  <option value={m.value}>{m.label}</option>
                {/each}
              </select>
            </label>

            <div class="mt-6 bg-savanna/40 px-4 py-4" aria-live="polite">
              <p class="text-[12.5px] text-ink/60">Estimated total · {tierLabelOf(tier)} · {travellersText}</p>
              <p class="mt-1 font-serif text-[30px] font-normal leading-tight text-heading [font-variant-numeric:tabular-nums]">{estimateText}</p>
              <p class="mt-1 text-[12.5px] text-ink/60">{estimateWhy}</p>
            </div>

            <button class="mt-6 inline-flex min-h-[52px] w-full items-center justify-center bg-deep-green px-6 text-[15px] font-semibold text-white transition hover:bg-forest" type="button" on:click={step2}>
              Continue
            </button>
          {:else if step === 2}
            <div class="flex items-start justify-between gap-4 bg-savanna/40 px-4 py-3.5">
              <div class="min-w-0 text-[13.5px] leading-[1.55]">
                <p class="font-semibold text-heading">{tour.title}</p>
                <p class="text-ink/70">{tierLabelOf(tier)} · {travellersText} · {monthLabel}</p>
                <p class="text-ink/70">Estimated total: {estimate ? `about ${money(estimate)}` : 'price on request'}</p>
              </div>
              <button class="shrink-0 text-[13px] font-semibold text-clay underline underline-offset-4 transition hover:text-heading" type="button" on:click={() => void show(1)}>Change</button>
            </div>

            <h2 id="tour-request-title" class="mt-6 font-serif text-[27px] font-normal leading-tight text-heading">Where should Nelson send your quote?</h2>

            <form class="mt-5" on:submit|preventDefault={submit} novalidate>
              {#if errors.length}
                <div class="mb-4 border border-clay/40 bg-clay/5 px-4 py-3 text-[13.5px] text-heading outline-none" role="alert" tabindex="-1" bind:this={errorsEl}>
                  <ul class="list-disc space-y-0.5 pl-4">
                    {#each errors as e}<li>{e}</li>{/each}
                  </ul>
                </div>
              {/if}
              <label class="block">
                <span class="text-[14px] font-semibold text-heading">Full name</span>
                <input class={inputClass} type="text" autocomplete="name" bind:value={fullName} required maxlength="120" />
              </label>
              <label class="mt-4 block">
                <span class="text-[14px] font-semibold text-heading">Email</span>
                <input class={inputClass} type="email" autocomplete="email" inputmode="email" bind:value={email} required maxlength="160" />
              </label>
              <label class="mt-4 block">
                <span class="text-[14px] font-semibold text-heading">WhatsApp number <span class="font-normal text-ink/55">(optional)</span></span>
                <input class={inputClass} type="tel" autocomplete="tel" inputmode="tel" placeholder="With country code, e.g. +44 7700 900123" bind:value={phone} maxlength="30" />
              </label>
              <label class="mt-4 block">
                <span class="text-[14px] font-semibold text-heading">Dates, children’s ages or anything else <span class="font-normal text-ink/55">(optional)</span></span>
                <textarea class={`${inputClass} min-h-[96px]`} rows="3" bind:value={notes} maxlength="2000"></textarea>
              </label>
              <!-- Honeypot: hidden from people, filled by bots. -->
              <div class="absolute left-[-9999px] h-px w-px overflow-hidden" aria-hidden="true">
                <label>Company <input type="text" tabindex="-1" autocomplete="off" bind:value={hp} /></label>
              </div>

              {#if submitError}
                <p class="mt-4 text-[13.5px] text-clay" role="alert">{submitError}</p>
              {/if}

              <button class="mt-6 inline-flex min-h-[52px] w-full items-center justify-center bg-deep-green px-6 text-[15px] font-semibold text-white transition hover:bg-forest disabled:opacity-60" type="submit" disabled={busy}>
                {busy ? 'Sending…' : 'Send my request'}
              </button>
              <p class="mt-3 text-center text-[13px] leading-[1.55] text-ink/60">
                Nelson replies within 24 hours with your route and exact price. No payment needed.
              </p>
            </form>
          {:else}
            <div class="py-4 text-center">
              <CheckCircle2 size={42} strokeWidth={1.4} class="mx-auto text-forest" />
              <h2 id="tour-request-title" class="mt-4 font-serif text-[27px] font-normal leading-tight text-heading">Thank you. Nelson will be in touch within 24 hours.</h2>
              <p class="mt-3 text-[14px] leading-[1.6] text-ink/70">
                We have sent a copy to {email.trim()}.
              </p>
              <p class="mt-5 text-[14px] text-ink/65">Your reference <span class="ml-1 font-semibold text-heading [font-variant-numeric:tabular-nums]">{bookingCode}</span></p>
              <div class="mt-6 grid gap-2.5">
                {#if waHref}
                  <a class="inline-flex min-h-12 items-center justify-center gap-2 bg-deep-green px-6 text-[14px] font-semibold text-white transition hover:bg-forest" href={waHref} target="_blank" rel="noopener noreferrer">
                    <MessageCircle size={16} /> Message Nelson on WhatsApp
                  </a>
                {/if}
                <button class="inline-flex min-h-12 items-center justify-center gap-2 border border-ink/20 px-6 text-[14px] font-semibold text-heading transition hover:border-deep-green" type="button" on:click={close}>
                  <ArrowLeft size={15} /> Back to the safari
                </button>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}
