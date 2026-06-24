<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { get } from 'svelte/store';
  import { AlertCircle, CheckCircle2, Copy, MapPin, ShieldCheck } from '@lucide/svelte';
  import { page } from '$app/stores';
  import { api } from '$lib/api/client';
  import { defaultSpecialist } from '$lib/data/specialists';
  import { publicSettings, settingText } from '$lib/settings';
  import { shortlist } from '$lib/shortlist';
  import Button from './Button.svelte';
  import CountrySelect from './CountrySelect.svelte';
  import SpecialistCard from './SpecialistCard.svelte';

  $: bookCallUrl = settingText($publicSettings, 'booking_call_url');

  // ── Options ────────────────────────────────────────────────────────────────
  const destinationOptions = ['Tanzania', 'Kenya', 'Rwanda', 'Uganda', 'Zanzibar', 'Multiple countries', 'Not sure yet'];
  const experienceOptions = [
    'Safari',
    'Kilimanjaro climb',
    'Gorilla trekking',
    'Beach holiday',
    'Honeymoon',
    'Family trip',
    'Culture',
    'Adventure',
    'Luxury',
    'Photography',
    'Wildlife',
    'Not sure yet'
  ];
  const monthOptions = ['Flexible', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'I know exact dates'];
  const flexibilityOptions = ['Yes', 'No', 'Not sure'];
  const budgetOptions = ['Under $1,000', '$1,000 – $2,500', '$2,500 – $5,000', '$5,000+', 'Not sure yet'];
  const travellerOptions = ['Solo traveller', 'Couple', 'Family', 'Friends / group', 'Corporate / team', 'Honeymoon', 'Not sure yet'];
  const durationOptions = ['1–3 days', '4–6 days', '7–10 days', '11–14 days', '15+ days', 'Not sure yet'];
  const accommodationOptions = ['Budget lodge', 'Mid-range lodge/hotel', 'Luxury lodge/resort', 'Tented camp', 'Beach resort', 'Not sure yet'];

  // ── Form state ───────────────────────────────────────────────────────────────
  let full_name = '';
  let email = '';
  let phone = '';
  let country = '';
  let destination_interest = '';
  let experience_interests: string[] = [];
  let travel_month = '';
  let exact_start_date = '';
  let exact_end_date = '';
  let date_flexibility = '';
  let budget_per_person = '';
  let traveller_type = '';
  let number_of_adults = '2';
  let number_of_children = '0';
  let trip_duration = '';
  let accommodation_preference = '';
  let message = '';
  let hp_company = ''; // honeypot — must stay empty

  let submitting = false;
  let errorMessage = '';
  let bookingCode = '';
  let submitted = false;
  let copied = false;
  let tripContext = ''; // tour name carried in from a tour/departure/persona link
  let errors: Record<string, string> = {};
  let bodyEl: HTMLDivElement;

  const todayStr = new Date().toISOString().slice(0, 10);
  const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  $: wantsExactDates = travel_month === 'I know exact dates';
  $: sent = submitted;

  const inputBase = 'w-full rounded-md border bg-surface px-3 py-3 text-sm text-ink outline-none transition focus:ring-2';
  $: cls = (field: string) =>
    `${inputBase} ${errors[field] ? 'border-red-300 focus:border-red-400 focus:ring-red-200' : 'border-ink/15 focus:border-forest focus:ring-forest/15'}`;

  const clearErr = (key: string) => {
    if (errors[key]) {
      const { [key]: _removed, ...rest } = errors;
      errors = rest;
    }
  };

  const toggleExperience = (value: string) => {
    experience_interests = experience_interests.includes(value)
      ? experience_interests.filter((v) => v !== value)
      : [...experience_interests, value];
    clearErr('experience_interests');
  };

  // ── Context carry: a visitor arriving from a tour/persona/experience link
  //    brings that intent into the form (defaults otherwise stay empty). ───────
  const matchOption = (options: string[], value: unknown) =>
    options.find((o) => o.toLowerCase() === String(value).toLowerCase());

  onMount(async () => {
    const p = $page.url.searchParams;
    const persona = p.get('persona');
    const experience = p.get('experience');
    const destination = p.get('destination');
    const monthParam = p.get('month') || p.get('date');
    const tourSlug = p.get('tour');

    const personaMap: Record<string, string> = {
      family: 'Family',
      couple: 'Couple',
      solo: 'Solo traveller',
      group: 'Friends / group',
      honeymoon: 'Honeymoon'
    };
    const expMap: Record<string, string> = {
      safari: 'Safari',
      kilimanjaro: 'Kilimanjaro climb',
      gorilla: 'Gorilla trekking',
      'gorilla-trekking': 'Gorilla trekking',
      beach: 'Beach holiday',
      'beach-holiday': 'Beach holiday',
      cultural: 'Culture',
      culture: 'Culture',
      honeymoon: 'Honeymoon',
      photography: 'Photography',
      wildlife: 'Wildlife'
    };

    if (persona && personaMap[persona.toLowerCase()]) traveller_type = personaMap[persona.toLowerCase()];
    if (experience) {
      const e = expMap[experience.toLowerCase()] || matchOption(experienceOptions, experience);
      if (e && !experience_interests.includes(e)) experience_interests = [...experience_interests, e];
    }
    if (destination) {
      const d = matchOption(destinationOptions, destination);
      if (d) destination_interest = d;
    }
    if (monthParam) {
      let m = monthParam;
      if (/^\d{4}-\d{2}/.test(monthParam)) {
        const iso = monthParam.length === 7 ? `${monthParam}-01` : monthParam;
        m = new Date(iso).toLocaleString('en', { month: 'long' });
      }
      const mm = matchOption(monthOptions, m);
      if (mm) travel_month = mm;
    }
    if (tourSlug) {
      try {
        const res = await api.tours.get(tourSlug);
        const t = res.data as Record<string, unknown>;
        tripContext = String(t.title ?? '');
        const dName = (t.destinations as Record<string, unknown> | undefined)?.name;
        const cName = (t.tour_categories as Record<string, unknown> | undefined)?.name;
        if (dName) {
          const d = matchOption(destinationOptions, dName);
          if (d) destination_interest = d;
        }
        if (cName) {
          const e = matchOption(experienceOptions, cName);
          if (e && !experience_interests.includes(e)) experience_interests = [...experience_interests, e];
        }
      } catch {
        tripContext = tourSlug.replace(/-/g, ' ');
      }
      if (tripContext && !message.trim()) message = `I'm interested in: ${tripContext}.`;
    } else {
      const saved = get(shortlist);
      if (saved.length) {
        tripContext = saved.length === 1 ? saved[0].title : `${saved.length} saved trips`;
        if (!message.trim()) message = `I'm interested in: ${saved.map((sv) => sv.title).join(', ')}.`;
      }
    }
  });

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (full_name.trim().length < 2) e.full_name = 'Please enter your full name.';
    if (!email.trim()) e.email = 'Email is required.';
    else if (!isEmail(email.trim())) e.email = 'Please enter a valid email address.';
    if (phone.trim().length < 6) e.phone = 'A phone or WhatsApp number is required.';
    if (!country.trim()) e.country = 'Please select your country.';
    if (!destination_interest) e.destination_interest = 'Where would you like to go?';
    if (experience_interests.length === 0) e.experience_interests = 'Pick at least one experience.';
    if (!travel_month) e.travel_month = 'When are you thinking of travelling?';
    if (wantsExactDates) {
      if (!exact_start_date) e.exact_start_date = 'Add a start date.';
      else if (exact_start_date < todayStr) e.exact_start_date = "Start date can't be in the past.";
      if (!exact_end_date) e.exact_end_date = 'Add an end date.';
      else if (exact_start_date && exact_end_date <= exact_start_date) e.exact_end_date = 'End date must be after the start date.';
    }
    if (!budget_per_person) e.budget_per_person = 'Choose a budget range.';
    if (!traveller_type) e.traveller_type = 'Who is travelling?';
    if (Number(number_of_adults) < 1) e.number_of_adults = 'At least one adult is required.';
    if (number_of_children === '' || Number(number_of_children) < 0) e.number_of_children = "Can't be negative.";
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
      (bodyEl?.querySelector('[data-error]') as HTMLElement | null)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }

    // Structured lead brief → lead_context (HubSpot/CRM-ready, shown to specialist).
    const lead_context: Record<string, unknown> = {
      destination_interest,
      travel_interests: experience_interests.join(', '),
      travel_month,
      budget_per_person,
      traveller_type,
      source_page_url: $page.url.href,
      submitted_at: new Date().toISOString(),
      lead_source: 'Website Plan My Trip'
    };
    if (wantsExactDates) {
      lead_context.exact_start_date = exact_start_date;
      lead_context.exact_end_date = exact_end_date;
    }
    if (date_flexibility) lead_context.date_flexibility = date_flexibility;
    if (trip_duration) lead_context.trip_duration = trip_duration;
    if (accommodation_preference) lead_context.accommodation_preference = accommodation_preference;
    if (tripContext) lead_context.tour_interest = tripContext;

    submitting = true;
    try {
      const res = await api.bookings.create({
        full_name: full_name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        country: country.trim() || null,
        travel_date: wantsExactDates ? exact_start_date || null : null,
        number_of_adults: Number(number_of_adults) || 1,
        number_of_children: Number(number_of_children) || 0,
        message: message.trim() || null,
        source: 'plan_my_trip',
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
      // ignore
    }
  };
</script>

{#if sent}
  <div class="grid gap-5 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-surface p-6 shadow-soft md:p-8">
    <div class="flex items-center gap-3">
      <span class="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-600"><CheckCircle2 size={26} /></span>
      <div>
        <h3 class="text-xl font-bold text-heading">Thank you! Your trip request has been received.</h3>
        <p class="mt-1 text-sm text-ink/70">A Goldfinch travel specialist will contact you shortly.</p>
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
      </div>
    {/if}

    <!-- what happens next -->
    <div class="rounded-xl border border-emerald-200 bg-surface p-4">
      <p class="text-xs font-semibold uppercase tracking-[0.14em] text-ink/50">What happens next</p>
      <ol class="mt-3 grid gap-3">
        {#each [{ t: 'We review your request', s: 'A specialist reads your details — usually within one business day.' }, { t: 'We craft a tailored itinerary', s: 'Shaped around your dates, budget and travel style.' }, { t: 'You refine it with us', s: 'Adjust pace, lodges and activities until it feels right.' }, { t: 'Confirm when you are ready', s: 'No pressure — you decide if and when to book.' }] as step, i}
          <li class="flex gap-3">
            <span class="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-forest text-[11px] font-bold text-white">{i + 1}</span>
            <span>
              <span class="block text-sm font-semibold text-ink">{step.t}</span>
              <span class="block text-xs leading-5 text-ink/55">{step.s}</span>
            </span>
          </li>
        {/each}
      </ol>
    </div>

    <SpecialistCard specialist={defaultSpecialist} heading="Who will be in touch" />

    <div class="flex flex-col gap-3 sm:flex-row">
      {#if bookCallUrl}
        <a class="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-deep-green px-5 font-bold text-white transition hover:bg-forest" href={bookCallUrl} target="_blank" rel="noopener noreferrer">
          Book a call now
        </a>
      {/if}
      <Button type="button" variant="secondary" on:click={resetForm}>Start another request</Button>
    </div>
    <p class="text-center text-xs text-ink/45">A confirmation email is on its way to the address you provided.</p>
  </div>
{:else}
  <form class="relative rounded-2xl border border-ink/10 bg-surface p-5 shadow-soft md:p-6" on:submit|preventDefault={submit} novalidate>
    <div>
      <p class="text-sm font-semibold uppercase tracking-[0.14em] text-goldfinch-gold">Plan My Trip</p>
      <h3 class="mt-1 text-2xl font-bold tracking-normal text-heading">Tell us about your dream trip</h3>
      {#if tripContext}
        <p class="mt-1 text-sm leading-6 text-ink/65">We've carried your trip across — adjust anything below and a local specialist will tailor it to you.</p>
      {:else}
        <p class="mt-1 text-sm leading-6 text-ink/65">Don't know the exact tour yet? Perfect. Share the basics and a local specialist will shape a confident East Africa plan.</p>
      {/if}
    </div>

    {#if tripContext}
      <div class="mt-4 flex items-center gap-2 rounded-xl border border-forest/20 bg-forest/[0.06] px-3.5 py-2.5 text-sm font-semibold text-forest">
        <MapPin size={16} class="shrink-0" />
        Planning: {tripContext}
      </div>
    {/if}

    <div class="mt-5 grid gap-5" bind:this={bodyEl}>
      <!-- ── Contact details ───────────────────────────────────────────────── -->
      <fieldset class="grid gap-4">
        <legend class="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-goldfinch-gold">Contact details</legend>
        <div class="grid gap-4 md:grid-cols-2">
          <label class="grid gap-1.5 text-sm font-medium text-ink">
            <span>Full name</span>
            <input class={cls('full_name')} bind:value={full_name} on:input={() => clearErr('full_name')} placeholder="Your name" autocomplete="name" aria-invalid={Boolean(errors.full_name)} aria-describedby={errors.full_name ? 'pmt-full_name-err' : undefined} />
            {#if errors.full_name}<span id="pmt-full_name-err" data-error class="text-xs text-red-600">{errors.full_name}</span>{/if}
          </label>
          <label class="grid gap-1.5 text-sm font-medium text-ink">
            <span>Email</span>
            <input class={cls('email')} type="email" bind:value={email} on:input={() => clearErr('email')} placeholder="you@example.com" autocomplete="email" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'pmt-email-err' : undefined} />
            {#if errors.email}<span id="pmt-email-err" data-error class="text-xs text-red-600">{errors.email}</span>{/if}
          </label>
        </div>
        <div class="grid gap-4 md:grid-cols-2">
          <label class="grid gap-1.5 text-sm font-medium text-ink">
            <span>Phone / WhatsApp</span>
            <input class={cls('phone')} type="tel" bind:value={phone} on:input={() => clearErr('phone')} placeholder="+255 ..." autocomplete="tel" aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? 'pmt-phone-err' : undefined} />
            {#if errors.phone}<span id="pmt-phone-err" data-error class="text-xs text-red-600">{errors.phone}</span>{/if}
          </label>
          <div class="grid gap-1.5 text-sm font-medium text-ink">
            <span>Country</span>
            <CountrySelect bind:value={country} invalid={Boolean(errors.country)} on:change={() => clearErr('country')} placeholder="Where are you travelling from?" />
            {#if errors.country}<span data-error class="text-xs text-red-600">{errors.country}</span>{/if}
          </div>
        </div>
      </fieldset>

      <!-- ── Trip idea ─────────────────────────────────────────────────────── -->
      <fieldset class="grid gap-4 border-t border-ink/10 pt-4">
        <legend class="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-goldfinch-gold">Trip idea</legend>
        <label class="grid gap-1.5 text-sm font-medium text-ink">
          <span>Destination interest</span>
          <select class={cls('destination_interest')} bind:value={destination_interest} on:change={() => clearErr('destination_interest')} aria-invalid={Boolean(errors.destination_interest)}>
            <option value="" disabled>Select destination…</option>
            {#each destinationOptions as opt}<option value={opt}>{opt}</option>{/each}
          </select>
          {#if errors.destination_interest}<span data-error class="text-xs text-red-600">{errors.destination_interest}</span>{/if}
        </label>

        <div class="grid gap-2 text-sm font-medium text-ink">
          <span>What would you love to do? <span class="font-normal text-ink/45">(select any)</span></span>
          <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {#each experienceOptions as exp}
              <label
                class={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                  experience_interests.includes(exp)
                    ? 'border-forest bg-forest/[0.07] font-semibold text-heading'
                    : 'border-ink/12 bg-surface text-ink/70 hover:border-forest/40'
                }`}
              >
                <input type="checkbox" class="h-4 w-4 accent-forest" checked={experience_interests.includes(exp)} on:change={() => toggleExperience(exp)} />
                {exp}
              </label>
            {/each}
          </div>
          {#if errors.experience_interests}<span data-error class="text-xs text-red-600">{errors.experience_interests}</span>{/if}
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <label class="grid gap-1.5 text-sm font-medium text-ink">
            <span>When do you want to travel?</span>
            <select class={cls('travel_month')} bind:value={travel_month} on:change={() => clearErr('travel_month')} aria-invalid={Boolean(errors.travel_month)}>
              <option value="" disabled>Select…</option>
              {#each monthOptions as opt}<option value={opt}>{opt}</option>{/each}
            </select>
            {#if errors.travel_month}<span data-error class="text-xs text-red-600">{errors.travel_month}</span>{/if}
          </label>
          <label class="grid gap-1.5 text-sm font-medium text-ink">
            <span>Trip duration</span>
            <select class={cls('trip_duration')} bind:value={trip_duration}>
              <option value="">Not sure yet</option>
              {#each durationOptions.filter((d) => d !== 'Not sure yet') as opt}<option value={opt}>{opt}</option>{/each}
            </select>
          </label>
        </div>

        {#if wantsExactDates}
          <div class="grid gap-4 rounded-xl border border-forest/15 bg-forest/[0.03] p-3 md:grid-cols-2">
            <label class="grid gap-1.5 text-sm font-medium text-ink">
              <span>Start date</span>
              <input class={cls('exact_start_date')} type="date" min={todayStr} bind:value={exact_start_date} on:input={() => clearErr('exact_start_date')} aria-invalid={Boolean(errors.exact_start_date)} />
              {#if errors.exact_start_date}<span data-error class="text-xs text-red-600">{errors.exact_start_date}</span>{/if}
            </label>
            <label class="grid gap-1.5 text-sm font-medium text-ink">
              <span>End date</span>
              <input class={cls('exact_end_date')} type="date" min={exact_start_date || todayStr} bind:value={exact_end_date} on:input={() => clearErr('exact_end_date')} aria-invalid={Boolean(errors.exact_end_date)} />
              {#if errors.exact_end_date}<span data-error class="text-xs text-red-600">{errors.exact_end_date}</span>{/if}
            </label>
          </div>
        {/if}
      </fieldset>

      <!-- ── Travel preferences ────────────────────────────────────────────── -->
      <fieldset class="grid gap-4 border-t border-ink/10 pt-4">
        <legend class="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-goldfinch-gold">Travel preferences</legend>
        <div class="grid gap-4 md:grid-cols-2">
          <label class="grid gap-1.5 text-sm font-medium text-ink">
            <span>Are your dates flexible?</span>
            <select class={cls('date_flexibility')} bind:value={date_flexibility}>
              <option value="">Select…</option>
              {#each flexibilityOptions as opt}<option value={opt}>{opt}</option>{/each}
            </select>
          </label>
          <label class="grid gap-1.5 text-sm font-medium text-ink">
            <span>Budget per person</span>
            <select class={cls('budget_per_person')} bind:value={budget_per_person} on:change={() => clearErr('budget_per_person')} aria-invalid={Boolean(errors.budget_per_person)}>
              <option value="" disabled>Select budget…</option>
              {#each budgetOptions as opt}<option value={opt}>{opt}</option>{/each}
            </select>
            {#if errors.budget_per_person}<span data-error class="text-xs text-red-600">{errors.budget_per_person}</span>{/if}
          </label>
        </div>
        <div class="grid gap-4 md:grid-cols-2">
          <label class="grid gap-1.5 text-sm font-medium text-ink">
            <span>Who is travelling?</span>
            <select class={cls('traveller_type')} bind:value={traveller_type} on:change={() => clearErr('traveller_type')} aria-invalid={Boolean(errors.traveller_type)}>
              <option value="" disabled>Select traveller type…</option>
              {#each travellerOptions as opt}<option value={opt}>{opt}</option>{/each}
            </select>
            {#if errors.traveller_type}<span data-error class="text-xs text-red-600">{errors.traveller_type}</span>{/if}
          </label>
          <label class="grid gap-1.5 text-sm font-medium text-ink">
            <span>Accommodation preference</span>
            <select class={cls('accommodation_preference')} bind:value={accommodation_preference}>
              <option value="">No preference</option>
              {#each accommodationOptions.filter((a) => a !== 'Not sure yet') as opt}<option value={opt}>{opt}</option>{/each}
            </select>
          </label>
        </div>
        <div class="grid gap-4 md:grid-cols-2">
          <label class="grid gap-1.5 text-sm font-medium text-ink">
            <span>Adults</span>
            <input class={cls('number_of_adults')} type="number" min="1" bind:value={number_of_adults} on:input={() => clearErr('number_of_adults')} aria-invalid={Boolean(errors.number_of_adults)} />
            {#if errors.number_of_adults}<span data-error class="text-xs text-red-600">{errors.number_of_adults}</span>{/if}
          </label>
          <label class="grid gap-1.5 text-sm font-medium text-ink">
            <span>Children</span>
            <input class={cls('number_of_children')} type="number" min="0" bind:value={number_of_children} on:input={() => clearErr('number_of_children')} aria-invalid={Boolean(errors.number_of_children)} />
            {#if errors.number_of_children}<span data-error class="text-xs text-red-600">{errors.number_of_children}</span>{/if}
          </label>
        </div>
      </fieldset>

      <!-- ── Notes ─────────────────────────────────────────────────────────── -->
      <fieldset class="grid gap-4 border-t border-ink/10 pt-4">
        <legend class="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-goldfinch-gold">Notes</legend>
        <label class="grid gap-1.5 text-sm font-medium text-ink">
          <span>Trip notes</span>
          <textarea
            class={inputBase + ' border-ink/15 focus:border-forest focus:ring-forest/15'}
            rows={3}
            bind:value={message}
            placeholder="Tell us anything important: must-see places, special occasions, dietary needs, accessibility needs, preferred pace, room preferences…"
          ></textarea>
        </label>
      </fieldset>
    </div>

    <!-- Honeypot: hidden from humans, tempting to bots. -->
    <div class="absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden" aria-hidden="true">
      <label>Company<input type="text" name="hp_company" tabindex="-1" autocomplete="off" bind:value={hp_company} /></label>
    </div>

    {#if errorMessage}
      <div class="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
        <AlertCircle size={18} class="mt-0.5 shrink-0" />
        <span>{errorMessage}</span>
      </div>
    {/if}

    <div class="mt-5">
      <Button type="submit" className="w-full">{submitting ? 'Sending your request...' : 'Send My Trip Request'}</Button>
      <p class="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-ink/50">
        <ShieldCheck size={13} class="text-forest" />
        Your details are kept private and used only to plan your trip.
      </p>
    </div>
  </form>
{/if}
