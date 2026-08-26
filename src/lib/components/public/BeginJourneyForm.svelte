<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { ArrowLeft, ArrowRight, CheckCircle2, Check, Copy, ShieldCheck, X } from '@lucide/svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { trackEvent } from '$lib/analytics';
  import { api } from '$lib/api/client';
  import { currency } from '$lib/currency';
  import { newIdempotencyKey } from '$lib/idempotency';

  import Button from './Button.svelte';
  import WhatsAppCta from './WhatsAppCta.svelte';

  // One key per attempt: retries and double-taps resolve to the same booking.
  let idempotencyKey = newIdempotencyKey();

  // ── options ────────────────────────────────────────────────────────────────
  const flexibilityOptions = ['Fixed', '± 3 days', 'About a week', 'Very flexible'];
  const budgetOptions = [
    'Under $3,000',
    '$3,500 – $6,500',
    '$7,000 – $8,500',
    '$9,000+',
    'Prefer to discuss',
    'I have a specific budget in mind'
  ];
  const interestOptions = [
    'Big Five & predators',
    'Birdwatching',
    'Walking safaris',
    'Photography',
    'Cultural experiences',
    'Child-friendly pace',
    'Zanzibar beach extension',
    'Off-the-beaten-path'
  ];
  const contactOptions = ['Email', 'WhatsApp', 'Either'];

  // ── state ────────────────────────────────────────────────────────────────
  let first_name = '';
  let country = '';
  let email = '';
  let whatsapp = '';
  let travel_dates = '';
  let flexibility = '';
  let adults = '2';
  let children = ''; // 'Yes' | 'No'
  let children_ages = '';
  let interests: string[] = [];
  let special_occasion = '';
  let budget = '';
  let contact_method = '';
  let hp_company = ''; // honeypot — must stay empty

  let destination = ''; // optional prefill from ?destination=

  // Close behaviour: inside the modal this closes it; on the /enquiry page it
  // navigates home. Overridden by <EnquiryModal>.
  export let onClose: () => void = () => goto('/');

  const STEPS = 5;
  let step = 0;
  let errors: Record<string, string> = {};
  let submitting = false;
  let submitted = false;
  let bookingCode = '';

  // WhatsApp handoff — carry the submitted enquiry into a prefilled chat.
  $: waText = [
    "Hi Emnel Adventures, I've just submitted a safari enquiry and would like to continue here.",
    bookingCode ? `Reference: ${bookingCode}` : '',
    destination ? `Destination: ${destination}` : '',
    first_name ? `Name: ${first_name}` : '',
    country ? `From: ${country}` : '',
    adults ? `Adults: ${adults}` : ''
  ]
    .filter(Boolean)
    .join('\n');
  let errorMessage = '';
  let copied = false;
  let cardEl: HTMLDivElement;

  const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const letter = (i: number) => String.fromCharCode(65 + i);

  onMount(() => {
    trackEvent('begin_journey_opened');
    const d = $page.url.searchParams.get('destination');
    if (d) destination = d;
  });

  const clearErr = (k: string) => {
    if (errors[k]) {
      const { [k]: _removed, ...rest } = errors;
      errors = rest;
    }
  };
  const toggleInterest = (v: string) => {
    interests = interests.includes(v) ? interests.filter((x) => x !== v) : [...interests, v];
    clearErr('interests');
  };

  const validateStep = (s: number): boolean => {
    const e: Record<string, string> = {};
    if (s === 0) {
      if (first_name.trim().length < 2) e.first_name = 'Please enter your first name.';
      if (!country.trim()) e.country = 'Where are you travelling from?';
      if (!email.trim()) e.email = 'Email is required.';
      else if (!isEmail(email.trim())) e.email = 'Please enter a valid email address.';
    } else if (s === 1) {
      if (!travel_dates.trim()) e.travel_dates = 'Roughly when would you like to travel?';
      if (!flexibility) e.flexibility = 'Pick your date flexibility.';
      if (Number(adults) < 1) e.adults = 'At least one adult is required.';
      if (!children) e.children = 'Are children travelling?';
      else if (children === 'Yes' && !children_ages.trim()) e.children_ages = 'Please list the children’s ages.';
    } else if (s === 2) {
      if (interests.length === 0) e.interests = 'Pick at least one.';
    } else if (s === 3) {
      if (!budget) e.budget = 'Choose a budget range.';
    } else if (s === 4) {
      if (!contact_method) e.contact_method = 'How should we reach you?';
    }
    errors = e;
    return Object.keys(e).length === 0;
  };

  const scrollTop = () => cardEl?.scrollIntoView({ block: 'start', behavior: 'smooth' });

  const next = async () => {
    if (!validateStep(step)) {
      await tick();
      scrollTop();
      return;
    }
    if (step < STEPS - 1) {
      step += 1;
      scrollTop();
    } else {
      void submit();
    }
  };
  const back = () => {
    if (step > 0) {
      step -= 1;
      errors = {};
    } else {
      onClose();
    }
  };

  const submit = async () => {
    if (submitting) return;
    if (hp_company.trim()) {
      submitted = true;
      return; // honeypot tripped
    }
    for (let i = 0; i < STEPS; i++) {
      if (!validateStep(i)) {
        step = i;
        await tick();
        scrollTop();
        return;
      }
    }
    errorMessage = '';
    const numChildren =
      children === 'Yes' ? Math.max(1, children_ages.split(',').filter((x) => x.trim()).length) : 0;

    const lead_context: Record<string, unknown> = {
      destination_interest: destination || 'Tanzania',
      travel_dates,
      date_flexibility: flexibility,
      travel_interests: interests.join(', '),
      budget_per_person: budget,
      preferred_contact: contact_method,
      source_page_url: $page.url.href,
      submitted_at: new Date().toISOString(),
      lead_source: 'Website Begin Your Journey'
    };
    if (special_occasion.trim()) lead_context.special_occasion = special_occasion.trim();
    if (children === 'Yes' && children_ages.trim()) lead_context.children_ages = children_ages.trim();
    if (children) lead_context.traveller_type = children === 'Yes' ? 'Family' : 'Adults only';

    const summary = [
      'Tailor-made Tanzania safari enquiry',
      `Travel: ${travel_dates} (${flexibility})`,
      `Party: ${adults} adult(s)${numChildren ? `, ${numChildren} child(ren) aged ${children_ages}` : ''}`,
      `Budget: ${budget}`,
      `Interests: ${interests.join(', ')}`,
      special_occasion.trim() ? `Occasion: ${special_occasion.trim()}` : '',
      `Preferred contact: ${contact_method}`
    ]
      .filter(Boolean)
      .join('\n');

    submitting = true;
    try {
      const res = await api.bookings.create({
        idempotency_key: idempotencyKey,
        selected_currency: $currency.selectedCurrency,
        full_name: first_name.trim(),
        email: email.trim(),
        phone: whatsapp.trim() || null,
        country: country.trim() || null,
        number_of_adults: Number(adults) || 1,
        number_of_children: numChildren,
        message: summary,
        source: 'begin_your_journey',
        lead_context,
        hp_company
      });
      bookingCode = String((res.data as Record<string, unknown>)?.booking_code ?? '');
      submitted = true;
      trackEvent('begin_journey_submitted', {
        budget_range: budget,
        lead_type: 'begin_your_journey',
        transaction_id: bookingCode || undefined,
        metadata: { contact_method }
      });
    } catch (err) {
      trackEvent('form_submit_error', { form_name: 'begin_your_journey', error_type: 'submit_failed' });
      errorMessage =
        err instanceof Error && err.message
          ? err.message
          : 'Something went wrong. Please try again, or reach us on WhatsApp.';
    } finally {
      submitting = false;
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(bookingCode);
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch {
      /* ignore */
    }
  };

  const inputCls = (field: string) =>
    `w-full border bg-surface px-4 py-3 text-[15px] text-ink outline-none transition focus:ring-2 ${errors[field] ? 'border-red-300 focus:border-red-400 focus:ring-red-200' : 'border-ink/15 focus:border-forest focus:ring-forest/15'}`;
  const optCls = (active: boolean) =>
    `inline-flex items-center gap-2.5 border px-4 py-3 text-left text-[15px] font-semibold transition ${active ? 'border-goldfinch-gold bg-goldfinch-gold/10 text-heading' : 'border-ink/15 text-ink/80 hover:border-forest/40'}`;
</script>

<div bind:this={cardEl} class="mx-auto w-full max-w-2xl border border-ink/10 bg-surface shadow-2xl">
  {#if submitted}
    <!-- success -->
    <div class="grid gap-5 p-6 md:p-10">
      <div class="flex items-center gap-3">
        <span class="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-600"><CheckCircle2 size={26} /></span>
        <div>
          <h2 class="text-xl font-bold text-heading">Thank you — your enquiry is in.</h2>
          <p class="mt-1 text-sm text-ink/70">A local Emnel specialist will be in touch shortly to start designing your safari.</p>
        </div>
      </div>
      {#if bookingCode}
        <div class="border border-emerald-200 bg-emerald-50/50 p-4">
          <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-ink/60">Your reference</p>
          <div class="mt-1 flex items-center gap-3">
            <p class="text-2xl font-extrabold tracking-wide text-heading">{bookingCode}</p>
            <button class="inline-flex items-center gap-1.5 border border-ink/15 bg-surface px-2.5 py-1 text-xs font-semibold text-ink/70 transition hover:bg-sand" type="button" on:click={copyCode}>
              <Copy size={13} />{copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      {/if}
      <div class="grid gap-3">
        <WhatsAppCta
          variant="ghost"
          message={waText}
          label="Continue on WhatsApp"
          context="begin_journey_success"
          className="inline-flex h-11 items-center justify-center gap-2 bg-[#25D366] px-5 font-bold text-white transition hover:bg-[#20bd5a]"
        />
        <div class="flex flex-col gap-3 sm:flex-row">
          <button type="button" class="inline-flex h-11 flex-1 items-center justify-center gap-2 bg-deep-green px-5 font-bold text-white transition hover:bg-forest" on:click={onClose}>Done</button>
          <a class="inline-flex h-11 flex-1 items-center justify-center gap-2 border border-ink/15 px-5 font-semibold text-ink transition hover:bg-sand" href="/blog" on:click={onClose}>Read the journal</a>
        </div>
      </div>
    </div>
  {:else}
    <!-- header: back · progress · close -->
    <div class="flex items-center gap-4 p-5 md:px-8 md:pt-7">
      <button type="button" class="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink/60 transition hover:bg-sand hover:text-ink" on:click={back} aria-label="Back">
        <ArrowLeft size={18} />
      </button>
      <div class="flex flex-1 items-center gap-2" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={STEPS}>
        {#each Array(STEPS) as _, i}
          <span class={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-forest' : 'bg-ink/15'}`}></span>
        {/each}
      </div>
      <button type="button" class="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink/60 transition hover:bg-sand hover:text-ink" aria-label="Close" on:click={onClose}><X size={18} /></button>
    </div>

    <form class="grid gap-6 p-6 pt-2 md:p-8 md:pt-2" on:submit|preventDefault={next} novalidate>
      <!-- STEP 1 — contact -->
      {#if step === 0}
        <div>
          <p class="text-[12px] font-bold uppercase tracking-[0.18em] text-goldfinch-gold">Tailor-made safari enquiry</p>
          <h2 class="mt-2 font-serif text-[28px] font-light text-heading md:text-[34px]">Let's start with you</h2>
        </div>
        <label class="grid gap-1.5 text-sm font-semibold text-ink">
          First name
          <input class={inputCls('first_name')} bind:value={first_name} on:input={() => clearErr('first_name')} placeholder="Your first name" autocomplete="given-name" />
          {#if errors.first_name}<span class="text-xs text-red-600">{errors.first_name}</span>{/if}
        </label>
        <label class="grid gap-1.5 text-sm font-semibold text-ink">
          Country of origin
          <input class={inputCls('country')} bind:value={country} on:input={() => clearErr('country')} placeholder="e.g. United States" autocomplete="country-name" />
          {#if errors.country}<span class="text-xs text-red-600">{errors.country}</span>{/if}
        </label>
        <label class="grid gap-1.5 text-sm font-semibold text-ink">
          Email address
          <input class={inputCls('email')} type="email" bind:value={email} on:input={() => clearErr('email')} placeholder="name@example.com" autocomplete="email" />
          {#if errors.email}<span class="text-xs text-red-600">{errors.email}</span>{/if}
        </label>
        <label class="grid gap-1.5 text-sm font-semibold text-ink">
          WhatsApp number <span class="font-normal text-ink/50">— for quicker replies (optional)</span>
          <input class={inputCls('whatsapp')} type="tel" bind:value={whatsapp} placeholder="e.g. +44 123 456 7890" autocomplete="tel" />
        </label>
      {/if}

      <!-- STEP 2 — dates & party -->
      {#if step === 1}
        <div>
          <p class="text-[12px] font-bold uppercase tracking-[0.18em] text-goldfinch-gold">When & who</p>
          <h2 class="mt-2 font-serif text-[28px] font-light text-heading md:text-[34px]">Your dates and party</h2>
        </div>
        <label class="grid gap-1.5 text-sm font-semibold text-ink">
          Approximate travel dates
          <input class={inputCls('travel_dates')} bind:value={travel_dates} on:input={() => clearErr('travel_dates')} placeholder="e.g. July 2027" />
          {#if errors.travel_dates}<span class="text-xs text-red-600">{errors.travel_dates}</span>{/if}
        </label>
        <div class="grid gap-2 text-sm font-semibold text-ink">
          Date flexibility
          <div class="flex flex-col items-start gap-2.5">
            {#each flexibilityOptions as opt, i}
              <button type="button" class={optCls(flexibility === opt)} on:click={() => { flexibility = opt; clearErr('flexibility'); }}>
                <span class="grid h-6 w-6 place-items-center bg-deep-green text-[11px] font-bold text-white">{letter(i)}</span>{opt}
              </button>
            {/each}
          </div>
          {#if errors.flexibility}<span class="text-xs text-red-600">{errors.flexibility}</span>{/if}
        </div>
        <label class="grid gap-1.5 text-sm font-semibold text-ink">
          Number of adults
          <input class={inputCls('adults')} type="number" min="1" bind:value={adults} on:input={() => clearErr('adults')} />
          {#if errors.adults}<span class="text-xs text-red-600">{errors.adults}</span>{/if}
        </label>
        <div class="grid gap-2 text-sm font-semibold text-ink">
          Children travelling?
          <div class="flex flex-wrap gap-2.5">
            {#each ['Yes', 'No'] as opt, i}
              <button type="button" class={optCls(children === opt)} on:click={() => { children = opt; clearErr('children'); }}>
                <span class="grid h-6 w-6 place-items-center bg-deep-green text-[11px] font-bold text-white">{letter(i)}</span>{opt}
              </button>
            {/each}
          </div>
          {#if errors.children}<span class="text-xs text-red-600">{errors.children}</span>{/if}
        </div>
        {#if children === 'Yes'}
          <label class="grid gap-1.5 text-sm font-semibold text-ink">
            Children's ages <span class="font-normal text-ink/50">— please list them, e.g. 8, 12</span>
            <input class={inputCls('children_ages')} bind:value={children_ages} on:input={() => clearErr('children_ages')} placeholder="e.g. 8, 12" />
            {#if errors.children_ages}<span class="text-xs text-red-600">{errors.children_ages}</span>{/if}
          </label>
        {/if}
      {/if}

      <!-- STEP 3 — interests -->
      {#if step === 2}
        <div>
          <p class="text-[12px] font-bold uppercase tracking-[0.18em] text-goldfinch-gold">Your safari</p>
          <h2 class="mt-2 font-serif text-[28px] font-light text-heading md:text-[34px]">What matters most to you?</h2>
          <p class="mt-2 text-sm text-ink/60">Select any that apply.</p>
        </div>
        <div class="grid gap-2.5 sm:grid-cols-2">
          {#each interestOptions as opt}
            {@const active = interests.includes(opt)}
            <button type="button" class={`flex items-center gap-3 border px-4 py-3 text-left text-[15px] font-medium transition ${active ? 'border-goldfinch-gold bg-goldfinch-gold/10 text-heading' : 'border-ink/15 text-ink/80 hover:border-forest/40'}`} on:click={() => toggleInterest(opt)}>
              <span class={`grid h-5 w-5 shrink-0 place-items-center border ${active ? 'border-goldfinch-gold bg-goldfinch-gold text-deep-green' : 'border-ink/25 text-transparent'}`}><Check size={13} strokeWidth={3} /></span>
              {opt}
            </button>
          {/each}
        </div>
        {#if errors.interests}<span class="text-xs text-red-600">{errors.interests}</span>{/if}
        <label class="grid gap-1.5 text-sm font-semibold text-ink">
          Any special occasion? <span class="font-normal text-ink/50">— e.g. anniversary, milestone birthday (optional)</span>
          <input class={inputCls('special_occasion')} bind:value={special_occasion} placeholder="e.g. anniversary, milestone birthday" />
        </label>
      {/if}

      <!-- STEP 4 — budget -->
      {#if step === 3}
        <div>
          <p class="text-[12px] font-bold uppercase tracking-[0.18em] text-goldfinch-gold">Budget</p>
          <h2 class="mt-2 font-serif text-[28px] font-light text-heading md:text-[34px]">Approximate budget per person (USD)</h2>
          <p class="mt-2 text-sm text-ink/60">This helps us match the right lodges and experience to your trip.</p>
        </div>
        <div class="flex flex-col items-start gap-2.5">
          {#each budgetOptions as opt, i}
            <button type="button" class={optCls(budget === opt)} on:click={() => { budget = opt; clearErr('budget'); }}>
              <span class="grid h-6 w-6 place-items-center bg-deep-green text-[11px] font-bold text-white">{letter(i)}</span>{opt}
            </button>
          {/each}
        </div>
        {#if errors.budget}<span class="text-xs text-red-600">{errors.budget}</span>{/if}
      {/if}

      <!-- STEP 5 — contact method -->
      {#if step === 4}
        <div>
          <p class="text-[12px] font-bold uppercase tracking-[0.18em] text-goldfinch-gold">Almost there</p>
          <h2 class="mt-2 font-serif text-[28px] font-light text-heading md:text-[34px]">Preferred contact method</h2>
        </div>
        <div class="flex flex-col items-start gap-2.5">
          {#each contactOptions as opt, i}
            <button type="button" class={optCls(contact_method === opt)} on:click={() => { contact_method = opt; clearErr('contact_method'); }}>
              <span class="grid h-6 w-6 place-items-center bg-deep-green text-[11px] font-bold text-white">{letter(i)}</span>{opt}
            </button>
          {/each}
        </div>
        {#if errors.contact_method}<span class="text-xs text-red-600">{errors.contact_method}</span>{/if}
      {/if}

      <!-- honeypot -->
      <div class="absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden" aria-hidden="true">
        <label>Company<input type="text" tabindex="-1" autocomplete="off" bind:value={hp_company} /></label>
      </div>

      {#if errorMessage}
        <p class="border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{errorMessage}</p>
      {/if}

      <div class="flex items-center justify-between gap-3 pt-1">
        <Button type="submit">
          {#if step < STEPS - 1}
            Next <ArrowRight size={16} />
          {:else}
            {submitting ? 'Sending…' : 'Submit'} <ArrowRight size={16} />
          {/if}
        </Button>
        <p class="hidden items-center gap-1.5 text-xs text-ink/50 sm:flex">
          <ShieldCheck size={13} class="text-forest" /> Private — used only to plan your trip.
        </p>
      </div>
    </form>
  {/if}
</div>
