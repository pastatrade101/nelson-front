<script lang="ts">
  // A real lead capture. This form previously rendered five inputs with no submit
  // handler — its buttons were plain links, so everything a visitor typed was
  // discarded and they had to start again on /plan-my-trip. It now posts to the
  // bookings endpoint like the other public forms.
  import { CheckCircle2 } from '@lucide/svelte';
  import { page } from '$app/stores';
  import { api } from '$lib/api/client';
  import { currency } from '$lib/currency';
  import { newIdempotencyKey } from '$lib/idempotency';

  import { trackEvent } from '$lib/analytics';
  import Button from './Button.svelte';
  import FormInput from './FormInput.svelte';
  import SelectInput from './SelectInput.svelte';
  import TextArea from './TextArea.svelte';

  // One key per attempt: retries and double-taps resolve to the same booking.
  let idempotencyKey = newIdempotencyKey();

  export let title = 'Plan your Tanzania safari';
  export let compact = false;
  /** Where this form is embedded — recorded on the lead so the CRM keeps context. */
  export let capturePoint = 'lead_capture_form';

  const travelInterests = ['Safari', 'Kilimanjaro', 'Safari + Zanzibar', 'Beach Holiday', 'Multi-country'].map((value) => ({
    label: value,
    value
  }));

  const budgetRanges = ['Comfort', 'Premium', 'Luxury', 'Not sure yet'].map((value) => ({
    label: value,
    value
  }));

  let full_name = '';
  let email = '';
  let interest = '';
  let budget_tier = '';
  let message = '';
  // Honeypot — must stay empty; bots fill it and get a fake success.
  let hp_company = '';

  let submitting = false;
  let done = false;
  let error = '';

  const isEmail = (value: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);

  const submit = async () => {
    if (submitting) return;
    error = '';

    if (full_name.trim().length < 2) {
      error = 'Please enter your full name.';
      return;
    }
    if (!isEmail(email.trim())) {
      error = 'Please enter a valid email address.';
      return;
    }

    if (hp_company.trim()) {
      done = true;
      return;
    }

    submitting = true;
    try {
      const lead_context: Record<string, unknown> = {
        capture_point: capturePoint,
        source_page_url: $page.url.href,
        submitted_at: new Date().toISOString()
      };
      if (interest) lead_context.travel_interests = interest;
      if (budget_tier) lead_context.budget_range = budget_tier;

      await api.bookings.create({
        idempotency_key: idempotencyKey,
        selected_currency: $currency.selectedCurrency,
        full_name: full_name.trim(),
        email: email.trim(),
        message: message.trim() || null,
        // 'website_booking_form' is the whitelisted public source; the finer
        // context lives in lead_context above.
        source: 'website_booking_form',
        lead_context,
        hp_company
      });

      done = true;
      trackEvent('request_trip_submitted', {
        lead_type: 'lead_capture',
        ...(budget_tier ? { budget_range: budget_tier } : {}),
        ...(interest ? { experience_type: interest } : {})
      });
    } catch (e) {
      trackEvent('form_submit_error', { form_name: 'lead_capture', error_type: 'submit_failed' });
      error = e instanceof Error && e.message ? e.message : 'Something went wrong. Please try again.';
    } finally {
      submitting = false;
    }
  };
</script>

{#if done}
  <div class={`grid gap-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-5 shadow-soft ${compact ? '' : 'md:p-6'}`}>
    <div class="flex items-center gap-3">
      <CheckCircle2 size={24} class="shrink-0 text-emerald-600" />
      <h3 class="text-xl font-bold tracking-normal text-heading">Thank you — we have your details.</h3>
    </div>
    <p class="text-sm leading-6 text-ink/70">
      A local safari advisor will be in touch shortly. No payment is needed to start planning.
    </p>
    <div class="flex flex-wrap gap-3">
      <Button href="/tours">Browse safaris</Button>
      <Button href="/contact" variant="secondary">Talk to a Safari Advisor</Button>
    </div>
  </div>
{:else}
  <form
    class={`relative grid gap-4 rounded-lg border border-ink/10 bg-surface p-5 shadow-soft ${compact ? '' : 'md:p-6'}`}
    on:submit|preventDefault={submit}
    novalidate
  >
    <div>
      <p class="text-sm font-semibold uppercase tracking-[0.14em] text-goldfinch-gold">Emnel Lead Engine</p>
      <h3 class="mt-2 text-2xl font-bold tracking-normal text-heading">{title}</h3>
      <p class="mt-2 text-sm leading-6 text-ink/70">Tell us the basics and a local advisor can shape a confident safari, Kilimanjaro, or Zanzibar beach plan.</p>
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <FormInput label="Full name" name="full_name" placeholder="Your name" required bind:value={full_name} />
      <FormInput label="Email" name="email" type="email" placeholder="you@example.com" required bind:value={email} />
      <SelectInput label="Travel interest" name="interest" options={travelInterests} bind:value={interest} />
      <SelectInput label="Budget range" name="budget_tier" options={budgetRanges} bind:value={budget_tier} />
    </div>

    <TextArea label="Trip notes" name="message" placeholder="Dates, travelers, countries, must-see places..." bind:value={message} />

    <!-- Honeypot: hidden from humans, tempting to bots. -->
    <div class="absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden" aria-hidden="true">
      <label>Company<input type="text" name="hp_company" tabindex="-1" autocomplete="off" bind:value={hp_company} /></label>
    </div>

    {#if error}
      <p class="text-sm font-medium text-red-600">{error}</p>
    {/if}

    <div class="flex flex-wrap gap-3">
      <Button type="submit" disabled={submitting}>{submitting ? 'Sending…' : 'Plan My Safari'}</Button>
      <Button href="/contact" variant="secondary">Talk to a Safari Advisor</Button>
    </div>
  </form>
{/if}
