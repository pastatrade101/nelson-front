<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { ArrowLeft, ArrowRight, Check, CheckCircle2, Compass, ShieldCheck, Download, RotateCcw } from '@lucide/svelte';
  import { page } from '$app/stores';
  import { api, ApiRequestError } from '$lib/api/client';
  import { currency } from '$lib/currency';
  import { shortlist } from '$lib/shortlist';
  import { newIdempotencyKey } from '$lib/idempotency';
  import { trackEvent } from '$lib/analytics';
  import { STEPS, PARTIES, LENGTHS, PACES, STAGES, PRIORITIES, STAYS, emptyDraft, applyEntry, tripTypes, comfortOptions, toggle, validateStep, localToday, briefRows, recommendations, submission, readDraft, type PlannerCatalog, type Entry, type PlannerDraft } from '$lib/tripPlanner';
  import PlannerChoices from './PlannerChoices.svelte';
  import CountrySelect from './CountrySelect.svelte';
  import WhatsAppCta from './WhatsAppCta.svelte';
  import { publicSettings, settingText } from '$lib/settings';
  import { downloadTripBriefPdf, loadBriefLogo, type TripBrief } from '$lib/tripBriefPdf';
  export let catalog: PlannerCatalog;
  export let entry: Entry;
  const STORAGE = 'emnel_trip_planner_v2';
  const headings = ['What would you love to do?', 'Who’s coming along?', 'When shall the adventure begin?', 'Make time for what matters.', 'Let’s find your kind of comfort.', 'Where are you in your planning?', 'Your safari, taking shape.'];
  const intros = ['Choose one or combine a few. We’ll help make the route work.', 'A little about your group helps us plan the right pace, rooms and activities.', 'Exact dates or a rough idea—either is a great start.', 'Think about the whole journey, including any time by the beach.', 'These are preferences, not commitments. Your specialist will explain the options.', 'Tell us what a great trip looks like. We’ll read every detail.', 'Check your brief, then tell us where to reach you. No payment is needed.'];
  let d: PlannerDraft = applyEntry(emptyDraft(), entry, catalog);
  let entries: Entry[] = [entry];
  let savedTrips: unknown[] = [];
  let step = 0, furthest = 0, direction = 1;
  let mounted = false, reducedMotion = false, busy = false, restored = false, copied = false;
  let key = newIdempotencyKey();
  let pending: ReturnType<typeof submission> | null = null;
  let bookingCode = '', submitError = '', storageWarning = '', hp = '';
  let sentBrief: TripBrief | null = null;
  let downloading = false;
  let errors: string[] = [];
  let heading: HTMLHeadingElement;
  let errorsEl: HTMLDivElement;
  let lastEntry = entry.url;
  onMount(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)'); reducedMotion = media.matches;
    const motion = () => reducedMotion = media.matches; media.addEventListener('change', motion);
    try {
      const stored = readDraft(sessionStorage.getItem(STORAGE));
      if (stored) {
        d = stored.draft; entries = stored.entries; savedTrips = stored.savedTrips; step = stored.step; furthest = step; key = stored.key; pending = stored.pending || null; restored = true;
        if (pending) step = 6;
        if (!pending && !entries.some((e) => e.url === entry.url)) { d = applyEntry(d, entry, catalog); entries = [...entries, entry]; }
      }
    } catch { storageWarning = 'This browser cannot save a draft. Keep this tab open until your request is confirmed.'; }
    if (!pending) savedTrips = [...savedTrips, ...$shortlist.filter((item) => !savedTrips.some((existing) => (existing as { slug?: string }).slug === item.slug))];
    mounted = true; trackEvent('plan_my_trip_opened');
    return () => media.removeEventListener('change', motion);
  });
  $: if (mounted && entry.url !== lastEntry) { lastEntry = entry.url; if (!pending) { d = applyEntry(d, entry, catalog); if (!entries.some((e) => e.url === entry.url)) entries = [...entries, entry]; } }
  $: if (mounted && !bookingCode) persist(d, entries, savedTrips, step, key, pending);
  function persist(draft: PlannerDraft, entryPoints: Entry[], saved: unknown[], active: number, attempt: string, request: typeof pending) {
    try { sessionStorage.setItem(STORAGE, JSON.stringify({ v: 2, at: Date.now(), draft, entries: entryPoints, savedTrips: saved, step: active, key: attempt, pending: request })); }
    catch { storageWarning = 'Draft saving is unavailable. Keep this tab open, or download your brief before leaving.'; }
  }
  $: types = [...tripTypes(catalog.tours), ...d.experiences.filter((v) => !tripTypes(catalog.tours).some((o) => o.label === v)).map((label) => ({ label, description: 'Carried from your earlier selection.', match: /(?:)/ }))];
  $: comforts = [...new Set([...comfortOptions(catalog.tours), ...(d.comfort ? [d.comfort] : [])])];
  $: rows = briefRows(d);
  $: picks = recommendations(d, catalog.tours, [...entries].reverse().find((e) => e.tour)?.tour?.id);
  $: finderBudget = entries.flatMap((e) => e.params.budget_band || []).at(-1) || '';
  $: contextLabels = [...new Set(entries.flatMap((e) => [e.tour?.title || (e.params.tour?.length ? `Tour: ${e.params.tour.join(', ')}` : ''), e.lodge?.name || (e.params.lodge?.length ? `Stay: ${e.params.lodge.join(', ')}` : ''), ...(e.params.topic || []), ...(e.params.place || [])]).filter(Boolean))];
  function chooseParty(value: string) { d = { ...d, party: value, adults: value === 'Solo traveller' ? 1 : d.adults }; }
  function setChildren(value: number) { d = { ...d, children: value, childAges: Array.from({ length: Math.max(0, Math.min(50, Math.floor(value || 0))) }, (_, i) => d.childAges[i] ?? '') }; }
  async function focusHeading() { await tick(); heading?.focus({ preventScroll: true }); heading?.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'start' }); }
  async function move(next: number) {
    if (busy || pending) return;
    if (next > step) { errors = validateStep(d, step); if (errors.length) { await tick(); errorsEl?.focus(); return; } }
    errors = []; direction = next > step ? 1 : -1; step = next; furthest = Math.max(furthest, next); await focusHeading();
  }
  // The brief the traveller keeps: a branded one-page PDF (see $lib/tripBriefPdf).
  // Snapshotted at submission so it always matches what the team received.
  const briefData = (): TripBrief => ({
    reference: bookingCode,
    preparedFor: d.fullName.trim(),
    rows,
    startingPoints: contextLabels,
    details: [['Name', d.fullName], ['Email', d.email], ['Phone', d.phone || 'Not provided'], ['Country', d.country], ['Preferred contact', d.preferredContact]],
    specialRequests: d.specialRequests,
    notes: d.notes,
    contact: {
      email: settingText($publicSettings, 'contact_email'),
      phone: settingText($publicSettings, 'contact_phone'),
      website: $page.url.host.replace(/^www\./, '')
    }
  });
  async function downloadBrief() {
    if (downloading) return;
    downloading = true;
    try {
      const brief = sentBrief ?? briefData();
      const logo = await loadBriefLogo();
      await downloadTripBriefPdf({ ...brief, logo: logo?.dataUrl ?? null, logoRatio: logo?.ratio }, `emnel-trip-brief-${brief.reference || 'draft'}.pdf`);
      trackEvent('cta_click', { cta_name: 'download_trip_brief', cta_location: 'plan_my_trip_confirmation' });
    } catch {
      submitError = 'We could not create the PDF just now. Your request is saved; please try again in a moment.';
    } finally {
      downloading = false;
    }
  }
  async function submit() {
    if (busy || bookingCode) return;
    if (!pending) {
      for (let index = 0; index < STEPS.length; index++) { const issues = validateStep(d, index); if (issues.length) { step = index; errors = issues; await tick(); errorsEl?.focus(); return; } }
      pending = submission(d, entries, savedTrips, key, $currency.selectedCurrency, $page.url.href, hp); persist(d, entries, savedTrips, step, key, pending);
    }
    busy = true; submitError = '';
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 30000);
    try {
      const response = await api.bookings.create(pending, controller.signal);
      const code = (response.data as { booking_code?: string } | null)?.booking_code;
      if (!code) throw new Error('We could not verify a saved request. Your brief is still here; please retry.');
      bookingCode = code; sentBrief = briefData(); pending = null;
      try { sessionStorage.removeItem(STORAGE); } catch { /* Confirmation remains visible if storage is disabled. */ }
      trackEvent('plan_my_trip_submitted', { transaction_id: code, lead_type: 'trip_planner' }); await tick(); document.getElementById('planner-confirmation')?.focus();
    } catch (error) {
      // A validation rejection is definitely not saved. An uncertain network/5xx
      // result stays frozen, so retry always resends the identical payload/key.
      if (error instanceof ApiRequestError && [400, 422].includes(error.status)) { pending = null; key = newIdempotencyKey(); }
      submitError = controller.signal.aborted ? 'The connection took too long. Your brief is safe here; retry to confirm delivery.' : error instanceof Error ? error.message : 'We could not confirm your request. Please retry.';
      trackEvent('form_submit_error', { form_name: 'trip_planner', error_type: 'submission' });
    }
    finally { window.clearTimeout(timeout); busy = false; }
  }
  async function copyCode() { try { await navigator.clipboard.writeText(bookingCode); copied = true; } catch { copied = false; } }
</script>

{#if bookingCode}
  <div class="confirmation" id="planner-confirmation" tabindex="-1">
    <CheckCircle2 size={42} strokeWidth={1.3} /><p class="eyebrow">Your request is saved</p><h2>Now, let’s make it yours.</h2>
    <p>Thank you, {d.fullName.split(' ')[0]}. Your full brief is with Emnel’s team. We’ll use your contact details to discuss the route, availability and a personal quote.</p>
    <div class="reference"><span>Your reference</span><strong>{bookingCode}</strong><button type="button" on:click={copyCode}>{copied ? 'Copied' : 'Copy reference'}</button></div>
    <p class="fine">This is a planning request, not a confirmed booking. No payment has been taken.</p>
    <div class="success-actions"><button type="button" class="primary" on:click={downloadBrief} disabled={downloading} aria-busy={downloading}><Download size={16} /> {downloading ? 'Preparing your PDF…' : 'Download your brief (PDF)'}</button><WhatsAppCta message={`Hello Emnel Adventures, I submitted trip request ${bookingCode}. My name is ${d.fullName}. I’d like to discuss my saved brief.`} label="Continue on WhatsApp" /></div>
    {#if submitError}<p class="fine" role="alert">{submitError}</p>{/if}
    <a class="text-link" href="/tours">Explore more journeys <ArrowRight size={15} /></a>
  </div>
{:else}
  <div class="planner-layout">
    <div class="planner-main">
      <nav aria-label="Trip planning steps" class="progress-nav">{#each STEPS as label, index}<button type="button" class:complete={index < step} class:active={index === step} aria-current={index === step ? 'step' : undefined} aria-label={`Step ${index + 1}: ${label}`} disabled={index > furthest || !!pending || busy} on:click={() => move(index)}><span class="progress-line"></span><span class="step-label">{label}</span></button>{/each}</nav>
      <div class="form-body">
        {#if restored}<p class="draft-note"><Check size={14} /> Your saved draft is back. Continue where you left off.</p>{/if}
        {#if storageWarning}<p class="warning" role="status">{storageWarning}</p>{/if}
        {#if !catalog.available}<p class="warning">Trip suggestions are temporarily unavailable. You can still send your full brief to the team.</p>{/if}
        <div class="step-meta"><span>Step {step + 1} of 7</span><span>{STEPS[step]}</span></div>
        {#key step}
          <div in:fly={{ x: reducedMotion ? 0 : direction * 16, duration: reducedMotion ? 0 : 260, easing: cubicOut }}>
            <h2 bind:this={heading} tabindex="-1">{headings[step]}</h2><p class="intro">{intros[step]}</p>
            {#if errors.length}<div class="error-box" role="alert" tabindex="-1" bind:this={errorsEl}><strong>A little more detail, please</strong><ul>{#each errors as error}<li>{error}</li>{/each}</ul></div>{/if}
            <fieldset disabled={busy || !!pending} class="step-fields"><legend class="sr-only">{STEPS[step]}</legend>
              {#if step === 0}
                <PlannerChoices options={types} selected={d.experiences} on:choose={(e) => d.experiences = e.detail === 'Not sure yet' ? ['Not sure yet'] : toggle(d.experiences, e.detail)} />
                <details class="destination-picker field-section" open={d.destinations.length > 0}><summary>Anywhere you have in mind? <span>Optional · choose destinations</span></summary><div class="mt-4"><PlannerChoices compact options={[...new Set([...catalog.destinations.map((v) => v.name), ...d.destinations])]} selected={d.destinations} on:choose={(e) => d.destinations = toggle(d.destinations, e.detail)} /></div></details>
              {:else if step === 1}
                <PlannerChoices options={[...new Set([...PARTIES, ...(d.party ? [d.party] : [])])]} selected={[d.party]} on:choose={(e) => chooseParty(e.detail)} />
                <div class="fields two field-section"><label>Adults <span>18 years and over</span><input type="number" min="1" max="100" step="1" value={d.adults} on:input={(e) => d.adults = Number(e.currentTarget.value)} inputmode="numeric" /></label><label>Children <span>Under 18 at the time of travel</span><input type="number" min="0" max="50" step="1" value={d.children} on:input={(e) => setChildren(Number(e.currentTarget.value))} inputmode="numeric" /></label></div>
                {#if d.children > 0 && d.children <= 50}<div class="field-section"><h3>Children’s ages at travel <span>Optional · leave blank if unsure</span></h3><div class="age-grid">{#each Array.from({ length: Math.floor(d.children) }) as _, i}<label>Child {i + 1}<input aria-label={`Age of child ${i + 1}`} type="number" min="0" max="17" step="1" value={d.childAges[i] ?? ''} on:input={(e) => { d.childAges[i] = e.currentTarget.value; }} placeholder="Age" /></label>{/each}</div></div>{/if}
              {:else if step === 2}
                <PlannerChoices options={['I have exact dates', 'I have a month in mind', 'I’m not sure yet']} selected={[d.dateMode === 'exact' ? 'I have exact dates' : d.dateMode === 'flexible' ? 'I have a month in mind' : 'I’m not sure yet']} on:choose={(e) => d.dateMode = e.detail === 'I have exact dates' ? 'exact' : e.detail === 'I have a month in mind' ? 'flexible' : 'unsure'} />
                {#if d.dateMode === 'exact'}<div class="fields two field-section"><label>Start date<input type="date" min={localToday()} bind:value={d.startDate} /></label><label>End date<input type="date" min={d.startDate || localToday()} bind:value={d.endDate} /></label></div>{:else if d.dateMode === 'flexible'}<div class="field-section"><label>Travel month and year<input type="month" min={localToday().slice(0, 7)} bind:value={d.month} /></label></div>{:else}<p class="help-note">That’s absolutely fine. We can help you choose a time that suits your route and priorities.</p>{/if}
                <div class="field-section"><h3>How flexible are your dates?</h3><PlannerChoices compact options={['Dates are fixed', 'Flexible by a few days', 'Flexible by a few weeks', 'Completely flexible']} selected={[d.flexibility]} on:choose={(e) => d.flexibility = e.detail} /></div>
              {:else if step === 3}
                <h3>How long would you like to travel?</h3><PlannerChoices options={[...new Set([...LENGTHS, ...(d.duration ? [d.duration] : [])])]} selected={[d.duration]} on:choose={(e) => d.duration = e.detail} />
                <div class="field-section"><h3>And your preferred pace?</h3><PlannerChoices options={PACES} selected={[d.pace]} on:choose={(e) => d.pace = e.detail} /></div>
              {:else if step === 4}
                <h3>Your comfort level <span>Based on Emnel’s current tour collection</span></h3><PlannerChoices compact options={comforts} selected={[d.comfort]} on:choose={(e) => d.comfort = e.detail} />
                <div class="field-section"><h3>Where would you like to stay? <span>Optional</span></h3><PlannerChoices compact options={STAYS} selected={[d.accommodation]} on:choose={(e) => d.accommodation = e.detail} /></div>
                {#if finderBudget}<p class="help-note">Your trip-finder budget: <strong>{finderBudget}</strong>. We’ve kept this in your brief. Refine it below, or ask us to help.</p>{/if}
                <div class="field-section"><label>Budget per person · USD<span>For the whole trip, excluding international flights. A guide, not a quote.</span><input type="number" min="1" max="1000000" step="0.01" inputmode="decimal" placeholder="For example, 3500" value={d.budget} disabled={d.budgetUnsure} on:input={(e) => d.budget = e.currentTarget.value} /></label><label class="check-label"><input type="checkbox" bind:checked={d.budgetUnsure} /> Help me set a budget</label></div>
                <div class="field-section"><h3>What matters most? <span>Optional · choose a few</span></h3><PlannerChoices compact options={PRIORITIES} selected={d.priorities} on:choose={(e) => d.priorities = toggle(d.priorities, e.detail)} /></div>
              {:else if step === 5}
                <PlannerChoices options={STAGES} selected={[d.stage]} on:choose={(e) => d.stage = e.detail} />
                <div class="fields field-section"><label>What would make this trip special? <span>Optional · ideas, places, celebrations or questions</span><textarea rows="4" bind:value={d.notes} placeholder="Tell us what you are dreaming of…"></textarea></label><label>Anything else we should plan around?<span>Optional · room setup, dietary, access or other practical requests. Share only what you are comfortable sharing.</span><textarea rows="3" bind:value={d.specialRequests} placeholder="The small details matter, too."></textarea></label></div>
              {:else}
                <div class="review"><div class="review-heading"><h3>Your travel brief</h3>{#if !pending}<button type="button" on:click={() => move(0)}>Edit choices</button>{/if}</div><dl>{#each rows as [label, value]}<div><dt>{label}</dt><dd>{value}</dd></div>{/each}</dl>
                  {#if contextLabels.length}<h4>Starting points you selected</h4><ul>{#each contextLabels as label}<li>{label}</li>{/each}</ul>{/if}
                  {#if savedTrips.length}<h4>Your saved trips</h4><ul>{#each savedTrips as item}<li>{String((item as { title?: string }).title || (item as { slug?: string }).slug || 'Saved item')}</li>{/each}</ul>{/if}
                  {#if d.notes}<h4>Your ideas & notes</h4><p class="preserve">{d.notes}</p>{/if}{#if d.specialRequests}<h4>Practical requests</h4><p class="preserve">{d.specialRequests}</p>{/if}
                </div>
                <div class="field-section"><h3>Where can we reach you?</h3><div class="fields two"><label>Full name<input autocomplete="name" bind:value={d.fullName} /></label><label>Email address<input type="email" autocomplete="email" bind:value={d.email} /></label><label>Phone / WhatsApp <span>Optional for email replies</span><input type="tel" autocomplete="tel" placeholder="Include country code, e.g. +255…" bind:value={d.phone} /></label><div class="country-field"><label for="planner-country">Country of residence</label><CountrySelect id="planner-country" bind:value={d.country} /></div></div></div>
                <div class="field-section"><h3>How would you prefer to hear from us?</h3><PlannerChoices compact options={['Email', 'WhatsApp', 'Phone']} selected={[d.preferredContact]} on:choose={(e) => d.preferredContact = e.detail} /></div>
                <label class="check-label consent"><input type="checkbox" bind:checked={d.contactConsent} /><span>Emnel may use these details to respond to this trip request. This does not sign me up for marketing. <a href="/privacy" target="_blank" rel="noopener">Privacy policy</a></span></label>
                <div class="honeypot" aria-hidden="true"><label>Company<input tabindex="-1" autocomplete="off" bind:value={hp} /></label></div>
              {/if}
            </fieldset>
          </div>
        {/key}
        {#if pending && !busy}<div class="warning" role="status">Your brief is kept unchanged while we confirm delivery. Retrying uses the same request reference, so a lost connection won’t create another request.</div>{/if}
        {#if submitError}<div class="error-box" role="alert">{submitError}<p>Your details have not been cleared. Retry below, or download your brief to keep a copy.</p><button type="button" class="text-link" on:click={downloadBrief}><Download size={14} /> Download brief</button></div>{/if}
        <div class="step-footer"><button class="back" type="button" disabled={step === 0 || busy || !!pending} on:click={() => move(step - 1)}><ArrowLeft size={16} /> Back</button>{#if step < 6}<button type="button" class="primary" on:click={() => move(step + 1)}>Continue <ArrowRight size={17} /></button>{:else}<button type="button" class="primary" disabled={busy} on:click={submit}>{#if busy}Sending your brief…{:else if pending}<RotateCcw size={16} /> Retry safely{:else}Send my trip request <ArrowRight size={16} />{/if}</button>{/if}</div>
        <p class="privacy-note"><ShieldCheck size={14} /><span>No payment. No obligation. Your draft stays in this browser tab for up to 24 hours; close the tab on a shared device. Unconfirmed requests remain until delivery is confirmed or the tab is closed.</span></p>
      </div>
    </div>
    <aside class="sidebar" aria-label="Your trip so far">
      <div class="trip-summary"><div class="summary-top"><Compass size={25} strokeWidth={1.2} /><span>Made around you</span></div><h2>Your trip so far.</h2><p>A starting point, not a fixed itinerary.</p><dl>{#each rows.filter(([label]) => ['Trip type', 'Travellers', 'When', 'Length', 'Comfort', 'Budget per person'].includes(label)) as [label, value]}<div><dt>{label}</dt><dd>{value}</dd></div>{/each}</dl>{#if contextLabels.length}<div class="context-tags">{#each contextLabels as label}<span>{label}</span>{/each}</div>{/if}<div class="summary-bottom"><ShieldCheck size={18} /><span>A local specialist will review your route, stays and practical details.</span></div></div>
      {#if step > 1 && picks.length}<div class="suggestions"><p class="eyebrow">Ideas from our collection</p><p class="fine">Starting points, not availability or price guarantees.</p>{#each picks as pick}<a href={`/tours/${pick.tour.slug}`} target="_blank" rel="noopener">{#if pick.tour.main_image_url}<img src={pick.tour.main_image_url} alt="" loading="lazy" />{/if}<span><small>{pick.tour.duration_days} days · {pick.reason}</small><strong>{pick.tour.title}</strong><span>Explore itinerary ↗</span></span></a>{/each}</div>{/if}
    </aside>
  </div>
{/if}

<style>
  .destination-picker{border-top:1px solid rgb(var(--c-ink) / .12);padding-top:20px}.destination-picker summary{cursor:pointer;font-size:13px;font-weight:600;color:rgb(var(--c-clay));min-height:44px;line-height:1.6}.destination-picker summary span{display:block;font-weight:400;font-size:11px;color:rgb(var(--c-ink) / .6)}
  .planner-layout{display:grid;align-items:start;gap:24px;min-width:0}.planner-main{min-width:0;background:rgb(var(--c-surface));border:1px solid rgb(var(--c-ink) / .12)}.progress-nav{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;padding:24px 24px 0}.progress-nav button{min-width:0;text-align:left;min-height:44px;padding:0;color:rgb(var(--c-ink) / .5)}.progress-line{display:block;height:3px;background:rgb(var(--c-ink) / .1);margin-bottom:10px}.complete .progress-line,.active .progress-line{background:rgb(var(--c-goldfinch-gold))}.step-label{font-size:10px;line-height:1.4;display:block}.active .step-label{color:rgb(var(--c-heading));font-weight:700}.form-body{padding:24px}.step-meta{display:flex;justify-content:space-between;gap:12px;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:rgb(var(--c-ink) / .65);margin-bottom:14px}h2{font-family:'Cormorant Garamond',Georgia,serif;font-size:clamp(28px,3vw,38px);font-weight:400;line-height:1.14;color:rgb(var(--c-heading));margin:0;scroll-margin-top:110px}h2:focus{outline:none}.intro{font-size:14px;line-height:1.8;color:rgb(var(--c-ink) / .65);margin:14px 0 28px}.step-fields{border:0;margin:0;padding:0;min-width:0}.step-fields:disabled{opacity:.7;pointer-events:none}.field-section{margin-top:28px}h3{font-size:14px;font-weight:600;line-height:1.6;margin:0 0 14px;color:rgb(var(--c-ink))}h3 span,label>span{display:block;font-size:12px;color:rgb(var(--c-ink) / .6);font-weight:400;line-height:1.6;margin-top:3px}.fields{display:grid;gap:18px}label{display:block;min-width:0;font-size:13px;font-weight:600;color:rgb(var(--c-ink))}input:not([type=checkbox]),textarea{display:block;width:100%;min-width:0;box-sizing:border-box;margin-top:8px;border:1px solid rgb(var(--c-ink) / .18);background:rgb(var(--c-surface));padding:13px;font-size:16px;font-weight:400;line-height:1.5;color:rgb(var(--c-ink));border-radius:0}input:focus,textarea:focus{outline:2px solid rgb(var(--c-goldfinch-gold));outline-offset:1px}textarea{resize:vertical}input:disabled{background:rgb(var(--c-savanna) / .3)}.age-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.check-label{display:flex;align-items:flex-start;gap:12px;line-height:1.6;font-size:13px;font-weight:400;margin-top:18px;min-height:44px}.check-label input{width:18px;height:18px;flex-shrink:0;margin-top:3px;accent-color:rgb(var(--c-deep-green))}.check-label span{font-size:12px;margin:0;color:rgb(var(--c-ink) / .65)}.consent a{text-decoration:underline}.help-note,.warning{background:rgb(var(--c-goldfinch-gold) / .1);border-left:2px solid rgb(var(--c-goldfinch-gold));padding:16px;font-size:13px;line-height:1.8;color:rgb(var(--c-forest));margin:18px 0}.draft-note{display:flex;align-items:center;gap:8px;font-size:12px;color:rgb(var(--c-clay));margin:0 0 20px}.error-box{background:#fff4f1;border:1px solid #dfb9ac;color:#903d26;padding:16px;font-size:13px;line-height:1.7;margin:20px 0}.error-box ul{padding-left:18px;list-style:disc}.step-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;border-top:1px solid rgb(var(--c-ink) / .12);padding-top:24px;margin-top:32px}.primary{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:50px;padding:14px 22px;background:rgb(var(--c-deep-green));color:white;font-size:13px;font-weight:600;border:1px solid rgb(var(--c-deep-green))}.primary:hover{background:rgb(var(--c-forest))}.primary:disabled{opacity:.65;cursor:wait}.back{display:flex;align-items:center;gap:8px;min-height:46px;font-size:13px;color:rgb(var(--c-ink) / .7)}.back:disabled{opacity:.3}.privacy-note{display:flex;gap:8px;margin-top:20px;font-size:10px;line-height:1.8;color:rgb(var(--c-ink) / .65)}.privacy-note :global(svg){flex-shrink:0;margin-top:2px}.sidebar{min-width:0}.trip-summary{padding:28px;background:rgb(var(--c-deep-green));color:#fff}.summary-top{display:flex;align-items:center;gap:12px;color:rgb(var(--c-goldfinch-gold));font-size:10px;text-transform:uppercase;letter-spacing:.17em}.trip-summary h2{color:#fff;margin-top:22px;font-size:32px}.trip-summary>p{font-size:12px;line-height:1.6;color:rgb(var(--c-savanna) / .82);margin:10px 0 26px}dl{margin:0}dl>div{border-bottom:1px solid #ffffff1a;padding:12px 0}dt{font-size:10px;letter-spacing:.09em;text-transform:uppercase;color:rgb(var(--c-savanna) / .8)}dd{font-size:14px;line-height:1.6;margin:4px 0 0;overflow-wrap:anywhere}.summary-bottom{display:flex;align-items:flex-start;gap:10px;font-size:11px;line-height:1.8;color:rgb(var(--c-savanna) / .8);margin-top:26px}.summary-bottom :global(svg){flex-shrink:0}.context-tags{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}.context-tags span{padding:8px 10px;border:1px solid #ffffff26;font-size:11px;line-height:1.5}.suggestions{margin-top:24px;padding:22px;background:rgb(var(--c-savanna) / .4)}.eyebrow{font-size:10px;letter-spacing:.17em;text-transform:uppercase;font-weight:600;color:rgb(var(--c-clay))}.fine{font-size:12px;line-height:1.7;color:rgb(var(--c-ink) / .65)}.suggestions>a{display:flex;gap:12px;border-top:1px solid rgb(var(--c-ink) / .12);margin-top:16px;padding-top:16px;min-width:0}.suggestions img{width:70px;height:84px;object-fit:cover;flex-shrink:0}.suggestions strong{display:block;font-family:'Cormorant Garamond',Georgia,serif;font-weight:400;font-size:17px;line-height:1.3;margin:5px 0}.suggestions small{font-size:9px;color:rgb(var(--c-ink) / .65)}.suggestions a>span>span{font-size:10px;color:rgb(var(--c-clay))}.review{padding:20px;background:rgb(var(--c-savanna) / .25)}.review-heading{display:flex;justify-content:space-between;gap:10px;align-items:center}.review-heading button{font-size:12px;color:rgb(var(--c-clay));text-decoration:underline;min-height:44px}.review dt{color:rgb(var(--c-ink) / .65)}.review dd{font-size:13px;color:rgb(var(--c-ink))}.review dl>div{border-color:rgb(var(--c-ink) / .12)}.review h4{font-size:11px;font-weight:600;margin-top:20px}.review p,.review li{font-size:13px;line-height:1.7;color:rgb(var(--c-ink) / .7)}.review ul{padding-left:16px;list-style:disc}.preserve{white-space:pre-wrap;overflow-wrap:anywhere}.country-field{min-width:0}.country-field>label{margin-bottom:8px}.honeypot{position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden}.confirmation{max-width:780px;background:rgb(var(--c-surface));border:1px solid rgb(var(--c-ink) / .12);padding:32px;margin:0 auto;color:rgb(var(--c-ink))}.confirmation>.eyebrow{margin:22px 0 14px}.confirmation>p:not(.eyebrow){font-size:15px;line-height:1.9;margin-top:20px}.reference{border-block:1px solid rgb(var(--c-ink) / .12);padding:22px 0;margin-top:24px;display:flex;flex-wrap:wrap;align-items:center;gap:12px}.reference>span{font-size:12px}.reference strong{font-size:18px;letter-spacing:.1em}.reference button{font-size:12px;text-decoration:underline;margin-left:auto;min-height:44px}.success-actions{display:flex;flex-wrap:wrap;gap:12px;margin:24px 0}.text-link{display:inline-flex;align-items:center;gap:8px;min-height:44px;text-decoration:underline;font-size:13px}button:focus-visible,a:focus-visible{outline:3px solid rgb(var(--c-goldfinch-gold));outline-offset:3px}@media(min-width:600px){.fields.two{grid-template-columns:repeat(2,minmax(0,1fr))}.form-body{padding:32px}.progress-nav{padding:28px 32px 0;gap:10px}.step-label{font-size:11px}}@media(min-width:1000px){.planner-layout{grid-template-columns:minmax(0,1.7fr) minmax(0,1fr);gap:32px}.sidebar{position:sticky;top:110px}.trip-summary{padding:32px}}@media(max-width:599px){.step-label{display:none}.progress-nav{padding:20px 20px 0}.progress-nav button{min-height:44px}.progress-line{margin:0}.form-body{padding:20px}.primary{padding:13px 16px;font-size:12px}.step-footer{gap:8px}.review{padding:14px}.age-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.confirmation{padding:24px}}
</style>
