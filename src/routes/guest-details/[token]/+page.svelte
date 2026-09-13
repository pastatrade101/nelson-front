<script lang="ts">
  /**
   * Guest information form, reached only through a private link the office sends.
   *
   * Loaded CLIENT-SIDE on purpose. Everything on this page is passport data, and
   * a server-rendered page would put it in the HTML the server returns, where an
   * intermediary or a shared browser cache could hold it. Fetching after mount
   * keeps the document itself empty, and the page is noindex,nofollow so it can
   * never surface in search.
   *
   * The token in the URL is the credential and is checked on every request; there
   * is no session cookie, so closing the tab ends access.
   */
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { cdnUrl } from '$lib/img';

  type Traveller = {
    id?: string;
    full_name: string;
    nationality: string;
    date_of_birth: string;
    gender: string;
    passport_number: string;
    passport_country: string;
    passport_expiry: string;
    dietary: string;
    medical: string;
    notes: string;
    has_passport_copy?: boolean;
  };

  const blankTraveller = (): Traveller => ({
    full_name: '', nationality: '', date_of_birth: '', gender: '',
    passport_number: '', passport_country: '', passport_expiry: '',
    dietary: '', medical: '', notes: ''
  });

  // Route param: always present for this route, but typed optional.
  $: token = $page.params.token ?? '';

  let loading = true;
  let loadError = '';
  let saving = false;
  let sent = false;
  let locked = false;
  let serverError = '';
  /** Set once in admin under Settings -> Booking. Null keeps the plain dark header. */
  let heroImage = '';

  let form = {
    booking_reference: '', lead_email: '',
    arrival_date: '', departure_date: '', arrival_flight: '', departure_flight: '',
    emergency_name: '', emergency_relationship: '', emergency_phone: '', emergency_email: '',
    consent_given: false
  };
  let travellers: Traveller[] = [blankTraveller()];

  /** Field names that failed validation, so each input can show its own error. */
  let invalid = new Set<string>();
  const bad = (key: string) => invalid.has(key);

  const api = (path: string) => `/api/guest-details/token/${encodeURIComponent(token)}${path}`;

  onMount(async () => {
    try {
      const res = await fetch(api(''));
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        loadError = body?.message || 'This link is no longer valid. Please ask us for a new one.';
        return;
      }
      const d = body.data;
      form = {
        booking_reference: d.booking_reference ?? '',
        lead_email: d.lead_email ?? '',
        arrival_date: d.arrival_date ?? '',
        departure_date: d.departure_date ?? '',
        arrival_flight: d.arrival_flight ?? '',
        departure_flight: d.departure_flight ?? '',
        emergency_name: d.emergency_name ?? '',
        emergency_relationship: d.emergency_relationship ?? '',
        emergency_phone: d.emergency_phone ?? '',
        emergency_email: d.emergency_email ?? '',
        consent_given: Boolean(d.consent_given)
      };
      locked = Boolean(d.locked);
      heroImage = d.hero_image_url ?? '';
      travellers = (d.travellers ?? []).length
        ? d.travellers.map((t: Record<string, unknown>) => ({
            id: t.id as string,
            full_name: (t.full_name as string) ?? '',
            nationality: (t.nationality as string) ?? '',
            date_of_birth: (t.date_of_birth as string) ?? '',
            gender: (t.gender as string) ?? '',
            passport_number: (t.passport_number as string) ?? '',
            passport_country: (t.passport_country as string) ?? '',
            passport_expiry: (t.passport_expiry as string) ?? '',
            dietary: (t.dietary as string) ?? '',
            medical: (t.medical as string) ?? '',
            notes: (t.notes as string) ?? '',
            has_passport_copy: Boolean(t.has_passport_copy)
          }))
        : [blankTraveller()];
    } catch {
      loadError = 'We could not open this form. Please check your connection and try again.';
    } finally {
      loading = false;
    }
  });

  const addTraveller = () => { travellers = [...travellers, blankTraveller()]; };
  const removeTraveller = (i: number) => {
    if (travellers.length === 1) return;
    travellers = travellers.filter((_, n) => n !== i);
  };

  /**
   * Tanzania requires six months' passport validity beyond departure. Warned,
   * never blocked — a guest may be renewing, and refusing the form would only
   * stop us receiving the rest of the details.
   */
  const expiresTooSoon = (expiry: string, departure: string): boolean => {
    if (!expiry || !departure) return false;
    const limit = new Date(departure);
    limit.setMonth(limit.getMonth() + 6);
    return new Date(expiry) < limit;
  };

  const emailLooksValid = (v: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);

  const validate = (): boolean => {
    const next = new Set<string>();
    if (!emailLooksValid(form.lead_email)) next.add('lead_email');
    if (!form.arrival_date) next.add('arrival_date');
    if (!form.departure_date) next.add('departure_date');
    if (!form.emergency_name.trim()) next.add('emergency_name');
    if (!form.emergency_phone.trim()) next.add('emergency_phone');
    if (!form.consent_given) next.add('consent');
    travellers.forEach((t, i) => {
      if (!t.full_name.trim()) next.add(`t${i}.full_name`);
      if (!t.nationality.trim()) next.add(`t${i}.nationality`);
      if (!t.date_of_birth) next.add(`t${i}.date_of_birth`);
      if (!t.gender) next.add(`t${i}.gender`);
      if (!t.passport_number.trim()) next.add(`t${i}.passport_number`);
      if (!t.passport_country.trim()) next.add(`t${i}.passport_country`);
      if (!t.passport_expiry) next.add(`t${i}.passport_expiry`);
    });
    invalid = next;
    if (next.size) {
      document.querySelector('[data-invalid="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return next.size === 0;
  };

  const save = async () => {
    serverError = '';
    if (!validate()) return;
    saving = true;
    try {
      const res = await fetch(api(''), {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...form, travellers })
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        serverError = body?.message || 'We could not save your details. Please try again.';
        return;
      }
      // Re-read ids so a passport copy can be attached to a newly created row.
      travellers = (body.data?.travellers ?? travellers).map((t: Record<string, unknown>) => ({
        ...(t as unknown as Traveller),
        has_passport_copy: Boolean(t.has_passport_copy)
      }));
      sent = true;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      serverError = 'We could not reach our server. Please try again in a moment.';
    } finally {
      saving = false;
    }
  };

  let uploadingFor: string | null = null;
  const uploadPassport = async (traveller: Traveller, files: FileList | null) => {
    if (!files?.length || !traveller.id) return;
    uploadingFor = traveller.id;
    serverError = '';
    try {
      const data = new FormData();
      data.append('file', files[0]);
      data.append('traveller_id', traveller.id);
      const res = await fetch(api('/document'), { method: 'POST', body: data });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        serverError = body?.message || 'That file could not be uploaded.';
        return;
      }
      travellers = travellers.map((t) => (t.id === traveller.id ? { ...t, has_passport_copy: true } : t));
    } finally {
      uploadingFor = null;
    }
  };

  // Shared field classes — a plain document look, distinct from the marketing
  // site because this is a form someone fills in, not a page they browse.
  const FIELD =
    'w-full border border-ink/15 bg-black/[0.03] px-3 py-2.5 text-sm text-ink outline-none transition ' +
    'placeholder:text-ink/35 focus:border-ink focus:bg-white';
  const LABEL = 'mb-1.5 block text-[12.5px] font-semibold text-ink';
  const HINT = 'mt-1.5 text-xs text-ink/50';
  const ERR = 'mt-1.5 text-xs text-red-700';
  const CARD = 'border border-ink/12 bg-white p-6 md:p-7';
</script>

<svelte:head>
  <title>Guest Information Form — Emnel Adventures</title>
  <!-- A private form for one booking. It must never be indexed or followed. -->
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<!-- ── Hero ──────────────────────────────────────────────────────────────── -->
<header class="relative flex min-h-[300px] items-end overflow-hidden bg-deep-green text-white md:min-h-[380px]">
  {#if heroImage}
    <img class="absolute inset-0 h-full w-full object-cover" src={cdnUrl(heroImage)} alt="" fetchpriority="high" />
  {/if}
  <span class="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/40 to-ink/10" aria-hidden="true"></span>
  <div class="container-shell relative z-10 max-w-3xl pb-10 pt-24">
    <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75">Emnel Adventures Africa</p>
    <h1 class="mt-2 font-serif text-4xl font-light leading-tight md:text-5xl">Guest Information Form</h1>
    <p class="mt-3 max-w-lg text-[15px] leading-7 text-white/85">
      A few details from each traveller, and we take care of the lodges, flights and permits from here.
    </p>
  </div>
</header>

<div class="container-shell max-w-3xl py-10 md:py-12">
  {#if loading}
    <p class="border border-ink/12 bg-white px-6 py-12 text-center text-sm text-ink/55">Opening your form&hellip;</p>

  {:else if loadError}
    <div class="border border-red-300 bg-red-50 px-6 py-8">
      <h2 class="font-serif text-2xl font-light text-red-800">We could not open this form</h2>
      <p class="mt-2 text-sm leading-7 text-ink/70">{loadError}</p>
      <p class="mt-4 text-sm text-ink/70">
        Please reply to the message that brought you here, or WhatsApp us on
        <a class="font-semibold underline" href="https://wa.me/255712527929">+255 712 527 929</a>.
      </p>
    </div>

  {:else if sent}
    <div class="border border-forest bg-forest/5 px-6 py-8 md:px-7">
      <h2 class="font-serif text-2xl font-light text-forest">Received &mdash; thank you.</h2>
      <p class="mt-2 text-sm leading-7 text-ink/70">
        We have your guest details and will confirm your lodges, flights and permits from here. If anything
        changes before you travel, simply reopen this link and update it.
      </p>
      {#if !locked}
        <button class="mt-5 border border-ink px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-ink hover:text-white" type="button" on:click={() => (sent = false)}>
          Make a change
        </button>
      {/if}
    </div>

  {:else}
    {#if locked}
      <div class="mb-6 border border-clay/40 bg-clay/5 px-5 py-4 text-sm leading-6 text-ink/75">
        These details have been confirmed with the lodges and airlines, so the form is now read-only.
        If something needs correcting, please contact us and we will change it for you.
      </div>
    {/if}

    <!-- ── Intro ──────────────────────────────────────────────────────────── -->
    <div class="{CARD} mb-5">
      <p class="font-serif text-lg font-light text-ink">Thank you for choosing Emnel Adventures Africa for your upcoming journey.</p>
      <p class="mt-3 text-sm leading-7 text-ink/70">
        To finalise your reservations we ask that you complete the guest information below. These details are required for:
      </p>
      <ul class="mt-2 grid gap-1 pl-5 text-sm leading-7 text-ink/70">
        <li class="list-disc">Lodge and camp reservations</li>
        <li class="list-disc">Domestic flight bookings</li>
        <li class="list-disc">National park permits</li>
        <li class="list-disc">Ferry or transfer tickets where applicable</li>
      </ul>
      <p class="mt-3 text-sm leading-7 text-ink/70">
        Having them in advance lets our team prepare everything before you arrive, so the journey itself is unhurried.
      </p>
      <p class="mt-3 text-sm leading-7 text-ink/70">
        <strong class="font-semibold text-ink">Important:</strong> please enter names, dates of birth and passport
        numbers exactly as they appear on each passport. Airlines and park authorities will reject permits and
        tickets that do not match.
      </p>
      <p class="mt-3 text-sm leading-7 text-ink/70">
        Everything you share here is kept strictly confidential and used only to manage your travel arrangements.
      </p>
    </div>

    <fieldset disabled={locked} class="contents">

    <!-- ── Booking ────────────────────────────────────────────────────────── -->
    <section class="{CARD} mb-5">
      <h2 class="font-serif text-xl font-light text-ink">Booking</h2>
      <p class="mt-1 text-sm text-ink/50">So we can match this form to your reservation.</p>
      <div class="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label class={LABEL} for="ref">Booking reference <span class="font-normal text-ink/45">(from your confirmation)</span></label>
          <input id="ref" class={FIELD} bind:value={form.booking_reference} placeholder="#2026-0000" />
        </div>
        <div data-invalid={bad('lead_email')}>
          <label class={LABEL} for="email">Email address for this booking *</label>
          <input id="email" class="{FIELD} {bad('lead_email') ? 'border-red-600' : ''}" type="email" bind:value={form.lead_email} placeholder="you@example.com" />
          {#if bad('lead_email')}<p class={ERR}>Please enter a valid email address.</p>{/if}
        </div>
      </div>
    </section>

    <!-- ── Travel dates ───────────────────────────────────────────────────── -->
    <section class="{CARD} mb-5">
      <h2 class="font-serif text-xl font-light text-ink">Travel dates</h2>
      <p class="mt-1 text-sm text-ink/50">Your arrival into and departure from Tanzania.</p>
      <div class="mt-5 grid gap-4 sm:grid-cols-2">
        <div data-invalid={bad('arrival_date')}>
          <label class={LABEL} for="arr">Arrival date *</label>
          <input id="arr" class="{FIELD} {bad('arrival_date') ? 'border-red-600' : ''}" type="date" bind:value={form.arrival_date} />
          {#if bad('arrival_date')}<p class={ERR}>Please enter your arrival date.</p>{/if}
        </div>
        <div data-invalid={bad('departure_date')}>
          <label class={LABEL} for="dep">Departure date *</label>
          <input id="dep" class="{FIELD} {bad('departure_date') ? 'border-red-600' : ''}" type="date" bind:value={form.departure_date} />
          {#if bad('departure_date')}<p class={ERR}>Please enter your departure date.</p>{/if}
        </div>
        <div>
          <label class={LABEL} for="arrf">Arrival flight details</label>
          <input id="arrf" class={FIELD} bind:value={form.arrival_flight} placeholder="Flight number, airline, arrival time" />
          <p class={HINT}>Optional &mdash; if known. The arrival airport (JRO, DAR, ZNZ) helps too.</p>
        </div>
        <div>
          <label class={LABEL} for="depf">Departure flight details</label>
          <input id="depf" class={FIELD} bind:value={form.departure_flight} placeholder="Flight number, airline, departure time" />
          <p class={HINT}>Optional &mdash; if known.</p>
        </div>
      </div>
    </section>

    <!-- ── Travellers ─────────────────────────────────────────────────────── -->
    <section class="{CARD} mb-5">
      <h2 class="font-serif text-xl font-light text-ink">Guests</h2>
      <p class="mt-1 text-sm text-ink/50">
        One entry per traveller, including children. Passport details, then preferences and health for that person.
      </p>

      {#each travellers as t, i (i)}
        <div class="mt-6 border-t border-ink/10 pt-6 first:mt-5 first:border-t-0 first:pt-0">
          <div class="flex items-baseline justify-between gap-3">
            <span class="font-serif text-lg font-light text-ink">Traveller {i + 1}</span>
            {#if travellers.length > 1}
              <button class="text-xs text-ink/45 underline transition hover:text-red-700" type="button" on:click={() => removeTraveller(i)}>Remove</button>
            {/if}
          </div>

          <div class="mt-4 grid gap-4 sm:grid-cols-2">
            <div class="sm:col-span-2" data-invalid={bad(`t${i}.full_name`)}>
              <label class={LABEL} for={`n${i}`}>Full name (as per passport) *</label>
              <input id={`n${i}`} class="{FIELD} {bad(`t${i}.full_name`) ? 'border-red-600' : ''}" bind:value={t.full_name} autocomplete="off" />
              {#if bad(`t${i}.full_name`)}<p class={ERR}>Please enter the name exactly as on the passport.</p>{/if}
            </div>

            <div data-invalid={bad(`t${i}.nationality`)}>
              <label class={LABEL} for={`nat${i}`}>Nationality *</label>
              <input id={`nat${i}`} class="{FIELD} {bad(`t${i}.nationality`) ? 'border-red-600' : ''}" bind:value={t.nationality} placeholder="As shown on passport" />
              {#if bad(`t${i}.nationality`)}<p class={ERR}>Please enter nationality.</p>{/if}
            </div>

            <div data-invalid={bad(`t${i}.date_of_birth`)}>
              <label class={LABEL} for={`dob${i}`}>Date of birth *</label>
              <input id={`dob${i}`} class="{FIELD} {bad(`t${i}.date_of_birth`) ? 'border-red-600' : ''}" type="date" bind:value={t.date_of_birth} />
              {#if bad(`t${i}.date_of_birth`)}<p class={ERR}>Please enter date of birth.</p>{/if}
            </div>

            <div data-invalid={bad(`t${i}.gender`)}>
              <span class={LABEL}>Gender *</span>
              <div class="flex flex-wrap gap-5 pt-1">
                {#each ['Male', 'Female', 'Other'] as option}
                  <label class="flex cursor-pointer items-center gap-2 text-sm text-ink">
                    <input class="h-4 w-4 accent-forest" type="radio" bind:group={t.gender} value={option} />
                    {option}
                  </label>
                {/each}
              </div>
              {#if bad(`t${i}.gender`)}<p class={ERR}>Please select one.</p>{/if}
            </div>

            <div data-invalid={bad(`t${i}.passport_number`)}>
              <label class={LABEL} for={`pn${i}`}>Passport number *</label>
              <input id={`pn${i}`} class="{FIELD} uppercase {bad(`t${i}.passport_number`) ? 'border-red-600' : ''}" bind:value={t.passport_number} autocomplete="off" />
              {#if bad(`t${i}.passport_number`)}<p class={ERR}>Please enter the passport number.</p>{/if}
            </div>

            <div data-invalid={bad(`t${i}.passport_country`)}>
              <label class={LABEL} for={`pc${i}`}>Passport issue country *</label>
              <input id={`pc${i}`} class="{FIELD} {bad(`t${i}.passport_country`) ? 'border-red-600' : ''}" bind:value={t.passport_country} placeholder="e.g. United Kingdom" />
              {#if bad(`t${i}.passport_country`)}<p class={ERR}>Please enter the issuing country.</p>{/if}
            </div>

            <div data-invalid={bad(`t${i}.passport_expiry`)}>
              <label class={LABEL} for={`pe${i}`}>Passport expiry date *</label>
              <input id={`pe${i}`} class="{FIELD} {bad(`t${i}.passport_expiry`) ? 'border-red-600' : ''}" type="date" bind:value={t.passport_expiry} />
              {#if bad(`t${i}.passport_expiry`)}<p class={ERR}>Please enter the expiry date.</p>{/if}
              {#if expiresTooSoon(t.passport_expiry, form.departure_date)}
                <p class="mt-1.5 border border-clay/40 bg-clay/5 px-3 py-2 text-xs leading-5 text-clay">
                  This passport expires less than six months after your departure date. Tanzania requires at least
                  six months' validity &mdash; please check with us before travelling.
                </p>
              {/if}
            </div>

            <div class="sm:col-span-2">
              <span class={LABEL}>Passport copy</span>
              {#if t.id}
                <div class="flex flex-wrap items-center gap-3">
                  <label class="inline-flex cursor-pointer items-center gap-2 border border-ink px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-ink hover:text-white">
                    {t.has_passport_copy ? 'Replace passport copy' : '+ Upload passport copy'}
                    <input class="sr-only" type="file" accept="image/*,application/pdf" on:change={(e) => uploadPassport(t, (e.currentTarget as HTMLInputElement).files)} />
                  </label>
                  {#if uploadingFor === t.id}
                    <span class="text-xs text-ink/50">Uploading&hellip;</span>
                  {:else if t.has_passport_copy}
                    <span class="text-xs font-semibold text-forest">Received &mdash; stored securely</span>
                  {/if}
                </div>
              {:else}
                <p class="border border-dashed border-ink/20 px-4 py-3 text-xs leading-5 text-ink/55">
                  Save the form once and this traveller will get an upload button here.
                </p>
              {/if}
              <p class={HINT}>
                A clear photo or scan of the passport photo page (JPG, PNG or PDF, up to 8MB). If you cannot upload,
                WhatsApp it to +255 758 500 037 or email safari@emneladventures.com instead.
              </p>
            </div>

            <div class="sm:col-span-2 border-t border-ink/10 pt-4">
              <span class="font-serif text-base font-light text-ink">Preferences &amp; health</span>
              <p class="text-xs text-ink/50">Shared with this traveller's lodges and guide so we can look after them properly.</p>
            </div>

            <div class="sm:col-span-2">
              <label class={LABEL} for={`d${i}`}>Dietary requirements</label>
              <textarea id={`d${i}`} class="{FIELD} min-h-[76px]" bind:value={t.dietary} placeholder="Vegetarian, halal, gluten-free, strong dislikes."></textarea>
            </div>
            <div class="sm:col-span-2">
              <label class={LABEL} for={`m${i}`}>Medical conditions or allergies</label>
              <textarea id={`m${i}`} class="{FIELD} min-h-[76px]" bind:value={t.medical} placeholder="Anything the guide should know about, including medication that needs refrigeration."></textarea>
            </div>
            <div class="sm:col-span-2">
              <label class={LABEL} for={`no${i}`}>Special requests or notes</label>
              <textarea id={`no${i}`} class="{FIELD} min-h-[76px]" bind:value={t.notes} placeholder="Celebrations, room preferences, photography interests, anything else."></textarea>
            </div>
          </div>
        </div>
      {/each}

      {#if !locked}
        <button class="mt-6 w-full border border-dashed border-ink/30 py-3 text-sm text-ink/60 transition hover:border-ink hover:text-ink" type="button" on:click={addTraveller}>
          + Add another traveller
        </button>
      {/if}
    </section>

    <!-- ── Emergency contact ──────────────────────────────────────────────── -->
    <section class="{CARD} mb-5">
      <h2 class="font-serif text-xl font-light text-ink">Emergency contact</h2>
      <p class="mt-1 text-sm text-ink/50">Someone at home we can reach if we ever need to.</p>
      <div class="mt-5 grid gap-4 sm:grid-cols-2">
        <div data-invalid={bad('emergency_name')}>
          <label class={LABEL} for="ecn">Name *</label>
          <input id="ecn" class="{FIELD} {bad('emergency_name') ? 'border-red-600' : ''}" bind:value={form.emergency_name} />
          {#if bad('emergency_name')}<p class={ERR}>Please enter a contact name.</p>{/if}
        </div>
        <div>
          <label class={LABEL} for="ecr">Relationship</label>
          <input id="ecr" class={FIELD} bind:value={form.emergency_relationship} placeholder="Partner, parent, friend" />
        </div>
        <div data-invalid={bad('emergency_phone')}>
          <label class={LABEL} for="ecp">Phone (with country code) *</label>
          <input id="ecp" class="{FIELD} {bad('emergency_phone') ? 'border-red-600' : ''}" type="tel" bind:value={form.emergency_phone} placeholder="+44 …" />
          {#if bad('emergency_phone')}<p class={ERR}>Please enter a phone number.</p>{/if}
        </div>
        <div>
          <label class={LABEL} for="ece">Email</label>
          <input id="ece" class={FIELD} type="email" bind:value={form.emergency_email} />
        </div>
      </div>
    </section>

    <!-- ── Consent and submit ─────────────────────────────────────────────── -->
    <div data-invalid={bad('consent')}>
      <label class="flex cursor-pointer items-start gap-3 text-sm leading-6 text-ink/75">
        <input class="mt-1 h-4 w-4 shrink-0 accent-forest" type="checkbox" bind:checked={form.consent_given} />
        <span>
          I confirm the details above match the passports of everyone travelling, and I agree to Emnel Adventures
          Africa using this information to arrange our travel.
        </span>
      </label>
      {#if bad('consent')}<p class={ERR}>Please confirm before sending.</p>{/if}
    </div>

    {#if serverError}
      <p class="mt-4 border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">{serverError}</p>
    {/if}

    {#if !locked}
      <div class="mt-6 flex flex-wrap items-center gap-5">
        <button
          class="bg-ink px-7 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-60"
          type="button"
          disabled={saving}
          on:click={save}
        >
          {saving ? 'Sending…' : 'Send guest details'}
        </button>
        <p class="text-xs text-ink/55">
          Questions? WhatsApp Nelson on +255 712 527 929 or email safari@emneladventures.com
        </p>
      </div>
    {/if}

    </fieldset>
  {/if}

  <footer class="mt-10 border-t border-ink/10 pt-5 text-xs text-ink/50">
    Emnel Adventures Africa &middot; Arusha, Tanzania &middot;
    <a class="underline" href="https://www.emneladventures.com">emneladventures.com</a>
  </footer>
</div>
