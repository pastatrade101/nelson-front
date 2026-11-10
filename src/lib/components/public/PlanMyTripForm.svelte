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
  import { STEPS, SAFARI_TYPES, BUDGETS, CUSTOM_BUDGET, MAX_DAYS, emptyDraft, applyEntry, validateStep, localToday, briefRows, recommendations, submission, readDraft, type PlannerCatalog, type Entry, type PlannerDraft } from '$lib/tripPlanner';
  import PlannerChoices from './PlannerChoices.svelte';
  import WhatsAppCta from './WhatsAppCta.svelte';
  import { publicSettings, settingText } from '$lib/settings';
  import { downloadTripBriefPdf, loadBriefLogo, type TripBrief } from '$lib/tripBriefPdf';
  export let catalog: PlannerCatalog;
  export let entry: Entry;
  const STORAGE = 'emnel_trip_planner_v3';
  const LAST = STEPS.length - 1;
  const headings = ['What kind of safari would you like?', 'Who’s travelling, and for how long?', 'Your budget and accommodation.', 'Where should we send your quote?'];
  const intros = ['Choose the trip closest to what you have in mind. We’ll shape the route around you.', 'A rough idea is fine. Your specialist can adjust everything with you later.', 'Indicative prices per person sharing, per night. A guide to plan with, not a quote.', 'A local specialist will reply with a tailored itinerary and price.'];
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
  let budgetInput: HTMLInputElement;
  let lastEntry = entry.url;
  onMount(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)'); reducedMotion = media.matches;
    const motion = () => reducedMotion = media.matches; media.addEventListener('change', motion);
    try {
      const stored = readDraft(sessionStorage.getItem(STORAGE));
      if (stored) {
        d = stored.draft; entries = stored.entries; savedTrips = stored.savedTrips; step = stored.step; furthest = step; key = stored.key; pending = stored.pending || null; restored = true;
        if (pending) step = LAST;
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
    try { sessionStorage.setItem(STORAGE, JSON.stringify({ v: 3, at: Date.now(), draft, entries: entryPoints, savedTrips: saved, step: active, key: attempt, pending: request })); }
    catch { storageWarning = 'Draft saving is unavailable. Keep this tab open, or download your brief before leaving.'; }
  }
  $: rows = briefRows(d);
  $: picks = recommendations(d, catalog.tours, [...entries].reverse().find((e) => e.tour)?.tour?.id);
  $: contextLabels = [...new Set(entries.flatMap((e) => [e.tour?.title || (e.params.tour?.length ? `Tour: ${e.params.tour.join(', ')}` : ''), e.lodge?.name || (e.params.lodge?.length ? `Stay: ${e.params.lodge.join(', ')}` : ''), ...(e.params.topic || []), ...(e.params.place || [])]).filter(Boolean))];
  $: monthHint = d.month && !d.startDate ? rows.find(([label]) => label === 'Preferred start')?.[1] : '';
  async function chooseBudget(tier: string) {
    d = { ...d, budgetTier: tier };
    if (tier === CUSTOM_BUDGET) { await tick(); budgetInput?.focus(); }
  }
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
    details: [['Name', d.fullName], ['Email', d.email], ['WhatsApp', d.phone || 'Not provided']],
    specialRequests: '',
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
      if (!code) throw new Error('We could not verify a saved request. Your answers are still here; please retry.');
      bookingCode = code; sentBrief = briefData(); pending = null;
      try { sessionStorage.removeItem(STORAGE); } catch { /* Confirmation remains visible if storage is disabled. */ }
      trackEvent('plan_my_trip_submitted', { transaction_id: code, lead_type: 'trip_planner' }); await tick(); document.getElementById('planner-confirmation')?.focus();
    } catch (error) {
      // A validation rejection is definitely not saved. An uncertain network/5xx
      // result stays frozen, so retry always resends the identical payload/key.
      if (error instanceof ApiRequestError && [400, 422].includes(error.status)) { pending = null; key = newIdempotencyKey(); }
      submitError = controller.signal.aborted ? 'The connection took too long. Your answers are safe here; retry to confirm delivery.' : error instanceof Error ? error.message : 'We could not confirm your request. Please retry.';
      trackEvent('form_submit_error', { form_name: 'trip_planner', error_type: 'submission' });
    }
    finally { window.clearTimeout(timeout); busy = false; }
  }
  async function copyCode() { try { await navigator.clipboard.writeText(bookingCode); copied = true; } catch { copied = false; } }
</script>

{#if bookingCode}
  <div class="confirmation" id="planner-confirmation" tabindex="-1">
    <CheckCircle2 size={42} strokeWidth={1.3} /><p class="eyebrow">Your quote request is saved</p><h2 class="type-h2">Now, let’s make it yours.</h2>
    <p>Thank you, {d.fullName.trim().split(' ')[0]}. Your request is with Emnel’s team. We’ll reply to {d.email.trim()}{d.phone.trim() ? ' or on WhatsApp' : ''} with a tailored itinerary and price.</p>
    <div class="reference"><span>Your reference</span><strong>{bookingCode}</strong><button type="button" on:click={copyCode}>{copied ? 'Copied' : 'Copy reference'}</button></div>
    <p class="fine">This is a free quote request, not a booking. No payment has been taken and there is no obligation to book.</p>
    <div class="success-actions"><button type="button" class="primary" on:click={downloadBrief} disabled={downloading} aria-busy={downloading}><Download size={16} /> {downloading ? 'Preparing your PDF…' : 'Download your brief (PDF)'}</button><WhatsAppCta message={`Hello Emnel Adventures, I requested a quote, reference ${bookingCode}. My name is ${d.fullName.trim()}.`} label="Continue on WhatsApp" /></div>
    {#if submitError}<p class="fine" role="alert">{submitError}</p>{/if}
    <a class="text-link" href="/tours">Explore more journeys <ArrowRight size={15} /></a>
  </div>
{:else}
  <div class="planner-layout">
    <div class="planner-main">
      <!-- Phones show the first word of each step ("Contact"), so all four fit on one line. -->
      <nav aria-label="Quote request steps" class="progress-nav">{#each STEPS as label, index}<button type="button" class:complete={index < step} class:active={index === step} aria-current={index === step ? 'step' : undefined} aria-label={`Step ${index + 1}: ${label}`} disabled={index > furthest || !!pending || busy} on:click={() => move(index)}><span class="progress-line"></span><span class="step-label">{label.split(' ')[0]}<span class="label-rest"> {label.split(' ').slice(1).join(' ')}</span></span></button>{/each}</nav>
      <div class="form-body">
        {#if restored}<p class="draft-note"><Check size={14} /> Your answers are back. Continue where you left off.</p>{/if}
        {#if storageWarning}<p class="warning" role="status">{storageWarning}</p>{/if}
        <div class="step-meta eyebrow"><span>Step {step + 1} of {STEPS.length}</span><span>{STEPS[step]}</span></div>
        {#key step}
          <div in:fly={{ x: reducedMotion ? 0 : direction * 16, duration: reducedMotion ? 0 : 260, easing: cubicOut }}>
            <h2 class="type-h2" bind:this={heading} tabindex="-1">{headings[step]}</h2><p class="intro">{intros[step]}</p>
            {#if errors.length}<div class="error-box" role="alert" tabindex="-1" bind:this={errorsEl}><strong>A little more detail, please</strong><ul>{#each errors as error}<li>{error}</li>{/each}</ul></div>{/if}
            <fieldset disabled={busy || !!pending} class="step-fields"><legend class="sr-only">{STEPS[step]}</legend>
              {#if step === 0}
                <PlannerChoices options={SAFARI_TYPES} selected={[d.safariType]} on:choose={(e) => d.safariType = e.detail} />
              {:else if step === 1}
                <div class="fields two">
                  <label>How many days would you like to spend?<input type="number" min="1" max={MAX_DAYS} step="1" inputmode="numeric" placeholder="For example, 7" value={d.days} on:input={(e) => d.days = e.currentTarget.value} /></label>
                  <label>Preferred start date <span class="inline-note">Optional</span><input type="date" min={localToday()} bind:value={d.startDate} />{#if monthHint}<span>You mentioned {monthHint.replace(/^Around /, '')}. Pick a day, or leave it blank.</span>{/if}</label>
                  <label>Number of adults<input type="number" min="1" max="100" step="1" inputmode="numeric" value={d.adults} on:input={(e) => d.adults = Number(e.currentTarget.value)} /></label>
                  <label>Number of children<input type="number" min="0" max="50" step="1" inputmode="numeric" value={d.children} on:input={(e) => d.children = Number(e.currentTarget.value)} /></label>
                </div>
              {:else if step === 2}
                <div class="budgets" role="group" aria-label="Indicative budget and accommodation">
                  {#each BUDGETS as tier}
                    <button type="button" class="budget" class:chosen={d.budgetTier === tier.key} aria-pressed={d.budgetTier === tier.key} on:click={() => chooseBudget(tier.key)}>
                      <span class="check" aria-hidden="true">{#if d.budgetTier === tier.key}<Check size={14} />{/if}</span>
                      <span class="budget-text"><strong>{tier.label}</strong><small>Safari with {tier.stays}</small></span>
                      <span class="budget-price"><strong>{tier.price}</strong><small>per person sharing, per night</small></span>
                    </button>
                  {/each}
                  <button type="button" class="budget" class:chosen={d.budgetTier === CUSTOM_BUDGET} aria-pressed={d.budgetTier === CUSTOM_BUDGET} on:click={() => chooseBudget(CUSTOM_BUDGET)}>
                    <span class="check" aria-hidden="true">{#if d.budgetTier === CUSTOM_BUDGET}<Check size={14} />{/if}</span>
                    <span class="budget-text"><strong>My own budget</strong><small>Give us your budget for the whole trip and we’ll work around it to deliver an exceptional experience.</small></span>
                  </button>
                </div>
                {#if d.budgetTier === CUSTOM_BUDGET}
                  <div class="field-section"><label for="planner-budget">Your budget for the whole trip</label>
                    <div class="affix"><span aria-hidden="true">US$</span><input id="planner-budget" bind:this={budgetInput} type="number" min="1" max="1000000" step="1" inputmode="numeric" placeholder="For example, 5000" aria-describedby="planner-budget-unit" value={d.budget} on:input={(e) => d.budget = e.currentTarget.value} /><span id="planner-budget-unit">per person</span></div>
                  </div>
                {/if}
              {:else}
                <div class="fields two">
                  <label>Full name<input autocomplete="name" bind:value={d.fullName} /></label>
                  <label>Email address<input type="email" autocomplete="email" bind:value={d.email} /></label>
                  <label class="span-2">WhatsApp phone number <span class="inline-note">Optional</span><input type="tel" autocomplete="tel" placeholder="Include the country code, e.g. +44 7700 900123" bind:value={d.phone} /></label>
                  <label class="span-2">Additional requests or questions <span class="inline-note">Optional</span><textarea rows="4" bind:value={d.notes} placeholder="Parks you’d love to see, a special occasion, anything we should know"></textarea></label>
                </div>
                <div class="honeypot" aria-hidden="true"><label>Company<input tabindex="-1" autocomplete="off" bind:value={hp} /></label></div>
              {/if}
            </fieldset>
          </div>
        {/key}
        {#if pending && !busy}<div class="warning" role="status">Your answers are kept unchanged while we confirm delivery. Retrying uses the same request reference, so a lost connection won’t create another request.</div>{/if}
        {#if submitError}<div class="error-box" role="alert">{submitError}<p>Your answers have not been cleared. Retry below, or download your brief to keep a copy.</p><button type="button" class="text-link" on:click={downloadBrief}><Download size={14} /> Download brief</button></div>{/if}
        <div class="step-footer"><button class="back" type="button" disabled={step === 0 || busy || !!pending} on:click={() => move(step - 1)}><ArrowLeft size={16} /> Back</button>{#if step < LAST}<button type="button" class="primary" on:click={() => move(step + 1)}>Continue <ArrowRight size={17} /></button>{:else}<button type="button" class="primary" disabled={busy} on:click={submit}>{#if busy}Sending your request…{:else if pending}<RotateCcw size={16} /> Retry safely{:else}Request my free quote <ArrowRight size={16} />{/if}</button>{/if}</div>
        {#if step === LAST}
          <p class="disclaimer">Requesting a quote is free and there is no obligation to book.</p>
          <p class="privacy-note"><ShieldCheck size={14} /><span>We use your details only to reply to this request, never for marketing. <a href="/privacy" target="_blank" rel="noopener">Privacy policy</a></span></p>
        {:else}
          <p class="privacy-note"><ShieldCheck size={14} /><span>Free quote, no obligation. Your answers stay in this browser tab for up to 24 hours.</span></p>
        {/if}
      </div>
    </div>
    <aside class="sidebar" aria-label="Your safari so far">
      <div class="trip-summary"><div class="summary-top eyebrow"><Compass size={25} strokeWidth={1.2} /><span>Made around you</span></div><h2 class="type-h2">Your safari so far.</h2><p>A starting point, not a fixed itinerary.</p><dl>{#each rows as [label, value]}<div><dt>{label}</dt><dd>{value}</dd></div>{/each}</dl>{#if contextLabels.length}<div class="context-tags">{#each contextLabels as label}<span>{label}</span>{/each}</div>{/if}<div class="summary-bottom"><ShieldCheck size={18} /><span>A local specialist will review your route, stays and practical details.</span></div></div>
      {#if step > 0 && picks.length}<div class="suggestions"><p class="eyebrow">Ideas from our collection</p><p class="fine">Starting points, not availability or price guarantees.</p>{#each picks as pick}<a href={`/tours/${pick.tour.slug}`} target="_blank" rel="noopener">{#if pick.tour.main_image_url}<img src={pick.tour.main_image_url} alt="" loading="lazy" />{/if}<span><small>{pick.tour.duration_days} days{pick.reason ? ` · ${pick.reason}` : ''}</small><strong>{pick.tour.title}</strong><span>Explore itinerary ↗</span></span></a>{/each}</div>{/if}
    </aside>
  </div>
{/if}

<style>
  .planner-layout{display:grid;align-items:start;gap:24px;min-width:0}.planner-main{min-width:0;background:rgb(var(--c-surface));border:1px solid rgb(var(--c-ink) / .12)}.progress-nav{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;padding:24px 24px 0}.progress-nav button{min-width:0;text-align:left;min-height:44px;padding:0;color:rgb(var(--c-ink) / .5)}.progress-line{display:block;height:3px;background:rgb(var(--c-ink) / .1);margin-bottom:10px}.complete .progress-line,.active .progress-line{background:rgb(var(--c-goldfinch-gold))}.step-label{font-size:11px;line-height:1.4;display:block}.active .step-label{color:rgb(var(--c-heading));font-weight:700}.form-body{padding:24px}.step-meta{display:flex;justify-content:space-between;gap:12px;color:rgb(var(--c-ink) / .65);margin-bottom:14px}h2{color:rgb(var(--c-heading));margin:0;scroll-margin-top:110px}h2:focus{outline:none}.intro{font-size:16px;line-height:1.75;color:rgb(var(--c-ink) / .65);margin:14px 0 28px}.step-fields{border:0;margin:0;padding:0;min-width:0}.step-fields:disabled{opacity:.7;pointer-events:none}.field-section{margin-top:24px}label>span{display:block;font-size:12px;color:rgb(var(--c-ink) / .6);font-weight:400;line-height:1.6;margin-top:6px}label>.inline-note{display:inline;margin:0 0 0 4px}.fields{display:grid;gap:18px}label{display:block;min-width:0;font-size:13px;font-weight:600;color:rgb(var(--c-ink))}input,textarea{display:block;width:100%;min-width:0;box-sizing:border-box;margin-top:8px;border:1px solid rgb(var(--c-ink) / .18);background:rgb(var(--c-surface));padding:13px;font-size:16px;font-weight:400;line-height:1.5;color:rgb(var(--c-ink));border-radius:0}input:focus,textarea:focus{outline:2px solid rgb(var(--c-goldfinch-gold));outline-offset:1px}textarea{resize:vertical}
  .budgets{display:grid;gap:10px}.budget{display:flex;align-items:center;gap:14px;min-width:0;min-height:72px;padding:16px 18px;text-align:left;border:1px solid rgb(var(--c-ink) / .16);background:rgb(var(--c-surface));color:rgb(var(--c-heading));cursor:pointer}.budget:hover{border-color:rgb(var(--c-clay));background:rgb(var(--c-goldfinch-gold) / .05)}.budget.chosen{border-color:rgb(var(--c-deep-green));background:rgb(var(--c-goldfinch-gold) / .12);box-shadow:inset 0 0 0 1px rgb(var(--c-deep-green))}.budget strong{display:block;font-size:15px;font-weight:600;line-height:1.4}.budget small{display:block;font-size:12px;line-height:1.6;color:rgb(var(--c-ink) / .62);margin-top:2px}.budget-text{flex:1;min-width:0}.budget-price{flex-shrink:0;text-align:right}.budget-price strong{font-size:16px;white-space:nowrap}.check{flex-shrink:0;width:20px;height:20px;border:1px solid rgb(var(--c-ink) / .25);display:grid;place-items:center}.chosen .check{background:rgb(var(--c-deep-green));color:white;border-color:rgb(var(--c-deep-green))}
  .affix{display:flex;align-items:stretch;margin-top:8px;border:1px solid rgb(var(--c-ink) / .18);background:rgb(var(--c-surface))}.affix:focus-within{outline:2px solid rgb(var(--c-goldfinch-gold));outline-offset:1px}.affix>span{display:flex;align-items:center;padding:0 14px;font-size:14px;font-weight:600;color:rgb(var(--c-ink) / .65);background:rgb(var(--c-savanna) / .3);white-space:nowrap}.affix input{margin:0;border:0;flex:1}.affix input:focus{outline:none}
  .warning{background:rgb(var(--c-goldfinch-gold) / .1);border-left:2px solid rgb(var(--c-goldfinch-gold));padding:16px;font-size:14px;line-height:1.6;color:rgb(var(--c-forest));margin:18px 0}.draft-note{display:flex;align-items:center;gap:8px;font-size:12px;color:rgb(var(--c-clay));margin:0 0 20px}.error-box{background:#fff4f1;border:1px solid #dfb9ac;color:#903d26;padding:16px;font-size:14px;line-height:1.6;margin:20px 0}.error-box ul{padding-left:18px;list-style:disc}.step-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;border-top:1px solid rgb(var(--c-ink) / .12);padding-top:24px;margin-top:32px}.primary{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:50px;padding:14px 22px;background:rgb(var(--c-deep-green));color:white;font-size:13px;font-weight:600;border:1px solid rgb(var(--c-deep-green))}.primary:hover{background:rgb(var(--c-forest))}.primary:disabled{opacity:.65;cursor:wait}.back{display:flex;align-items:center;gap:8px;min-height:46px;font-size:13px;color:rgb(var(--c-ink) / .7)}.back:disabled{opacity:.3}.disclaimer{margin-top:18px;font-size:14px;font-weight:600;line-height:1.6;color:rgb(var(--c-forest));text-align:right}.privacy-note{display:flex;gap:8px;margin-top:12px;font-size:14px;line-height:1.6;color:rgb(var(--c-ink) / .65)}.privacy-note a{text-decoration:underline}.privacy-note :global(svg){flex-shrink:0;margin-top:3px}.sidebar{min-width:0}.trip-summary{padding:28px;background:rgb(var(--c-deep-green));color:#fff}.summary-top{display:flex;align-items:center;gap:12px;color:rgb(var(--c-goldfinch-gold))}.trip-summary h2{color:#fff;margin-top:22px}.trip-summary>p{font-size:14px;line-height:1.6;color:rgb(var(--c-savanna) / .82);margin:10px 0 26px}dl{margin:0}dl>div{border-bottom:1px solid #ffffff1a;padding:12px 0}dt{font-size:10px;letter-spacing:.09em;text-transform:uppercase;color:rgb(var(--c-savanna) / .8)}dd{font-size:14px;line-height:1.6;margin:4px 0 0;overflow-wrap:anywhere}.summary-bottom{display:flex;align-items:flex-start;gap:10px;font-size:14px;line-height:1.6;color:rgb(var(--c-savanna) / .8);margin-top:26px}.summary-bottom :global(svg){flex-shrink:0}.context-tags{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}.context-tags span{padding:8px 10px;border:1px solid #ffffff26;font-size:11px;line-height:1.5}.suggestions{margin-top:24px;padding:22px;background:rgb(var(--c-savanna) / .4)}.confirmation>.eyebrow,.suggestions>.eyebrow{color:rgb(var(--c-clay))}.fine{font-size:14px;line-height:1.6;color:rgb(var(--c-ink) / .65)}.suggestions>a{display:flex;gap:12px;border-top:1px solid rgb(var(--c-ink) / .12);margin-top:16px;padding-top:16px;min-width:0}.suggestions img{width:70px;height:84px;object-fit:cover;flex-shrink:0}.suggestions strong{display:block;font-family:'Cormorant Garamond',Georgia,serif;font-weight:400;font-size:17px;line-height:1.3;margin:5px 0}.suggestions small{font-size:11px;color:rgb(var(--c-ink) / .65)}.suggestions a>span>span{font-size:12px;color:rgb(var(--c-clay))}.honeypot{position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden}.confirmation{max-width:780px;background:rgb(var(--c-surface));border:1px solid rgb(var(--c-ink) / .12);padding:32px;margin:0 auto;color:rgb(var(--c-ink))}.confirmation>.eyebrow{margin:22px 0 14px}.confirmation>p:not(.eyebrow){font-size:16px;line-height:1.75;margin-top:20px}.reference{border-block:1px solid rgb(var(--c-ink) / .12);padding:22px 0;margin-top:24px;display:flex;flex-wrap:wrap;align-items:center;gap:12px}.reference>span{font-size:12px}.reference strong{font-size:18px;letter-spacing:.1em}.reference button{font-size:12px;text-decoration:underline;margin-left:auto;min-height:44px}.success-actions{display:flex;flex-wrap:wrap;gap:12px;margin:24px 0}.text-link{display:inline-flex;align-items:center;gap:8px;min-height:44px;text-decoration:underline;font-size:13px}button:focus-visible,a:focus-visible{outline:3px solid rgb(var(--c-goldfinch-gold));outline-offset:3px}
  @media(min-width:600px){.fields.two{grid-template-columns:repeat(2,minmax(0,1fr))}.fields.two .span-2{grid-column:span 2}.form-body{padding:32px}.progress-nav{padding:28px 32px 0;gap:10px}.step-label{font-size:12px}}@media(min-width:1000px){.planner-layout{grid-template-columns:minmax(0,1.7fr) minmax(0,1fr);gap:32px}.sidebar{position:sticky;top:110px}.trip-summary{padding:32px}}@media(max-width:599px){.label-rest{display:none}.progress-nav{padding:20px 20px 0;gap:6px}.form-body{padding:20px}.primary{padding:13px 16px;font-size:12px}.step-footer{gap:8px}.budget{flex-wrap:wrap;padding:14px;gap:10px 12px}.budget-text{flex-basis:calc(100% - 32px)}.budget-price{flex-basis:100%;text-align:left;padding-left:32px}.budget-price small{margin:0}.disclaimer{text-align:left}.confirmation{padding:24px}}
</style>
