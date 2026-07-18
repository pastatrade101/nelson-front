<script lang="ts">
  import { onMount } from 'svelte';
  import { CalendarDays, CheckCircle2, LogOut, MapPin, MessageCircle, Send, Users, Wallet } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import { imgUrl } from '$lib/img';

  type Payment = { amount: number; currency: string; payment_method?: string | null; transaction_reference?: string | null; status: string; paid_at?: string | null };
  type Day = { day_number: number; title: string; description?: string | null; accommodation?: string | null; meals?: string | null; activities?: string | null };
  type Trip = {
    booking_code: string;
    full_name: string;
    travel_date?: string | null;
    number_of_adults: number;
    number_of_children: number;
    total_people: number;
    special_requests?: string | null;
    status: string;
    payment_status: string;
    currency: string;
    estimated_amount?: number | null;
    amount_paid: number;
    balance_due: number;
    tour?: { title?: string; main_image_url?: string | null; duration_days?: number | null } | null;
    payments: Payment[];
    itinerary: Day[];
  };

  let loading = true;
  let trip: Trip | null = null;

  let messageText = '';
  let sending = false;
  let messageSent = false;
  let messageError = '';

  // Self-service "email me a fresh link" (shown when there's no valid session).
  let requestEmail = '';
  let requesting = false;
  let requested = false;

  const load = async () => {
    loading = true;
    try {
      const res = await api.trip.me();
      trip = res.data as unknown as Trip;
    } catch {
      trip = null;
    } finally {
      loading = false;
    }
  };

  onMount(load);

  const money = (amount?: number | null, currency = 'USD') =>
    amount == null ? '—' : `${currency} ${Number(amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  const prettyDate = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'To be confirmed';

  const titleCase = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const statusTone = (s: string) =>
    ({
      confirmed: 'bg-forest/10 text-forest',
      completed: 'bg-forest/10 text-forest',
      paid: 'bg-forest/10 text-forest',
      partial: 'bg-goldfinch-gold/15 text-clay',
      pending: 'bg-goldfinch-gold/15 text-clay',
      unpaid: 'bg-clay/10 text-clay',
      cancelled: 'bg-red-100 text-red-700'
    })[s] ?? 'bg-ink/10 text-ink/70';

  const sendMessage = async () => {
    if (messageText.trim().length < 2 || sending) return;
    sending = true;
    messageError = '';
    try {
      await api.trip.message(messageText.trim());
      messageSent = true;
      messageText = '';
    } catch (e) {
      messageError = e instanceof Error ? e.message : 'Could not send your message.';
    } finally {
      sending = false;
    }
  };

  const logout = async () => {
    try {
      await api.trip.logout();
    } catch {
      /* ignore */
    }
    trip = null;
  };

  const requestLink = async () => {
    if (!requestEmail.trim() || requesting) return;
    requesting = true;
    try {
      await api.trip.requestAccess(requestEmail.trim());
    } catch {
      /* response is intentionally generic; ignore errors */
    }
    requested = true;
    requesting = false;
  };
</script>

<svelte:head>
  <title>Your trip · Emnel Adventures</title>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<section class="container-shell py-10 md:py-14">
  {#if loading}
    <div class="grid min-h-[40vh] place-items-center">
      <p class="text-sm font-medium text-ink/55">Loading your trip…</p>
    </div>
  {:else if !trip}
    <!-- No / invalid / expired session -->
    <div class="mx-auto max-w-lg rounded-2xl border border-ink/10 bg-surface p-8 text-center shadow-soft">
      <span class="mx-auto grid h-12 w-12 place-items-center rounded-full bg-goldfinch-gold/10 text-goldfinch-gold"><MapPin size={22} /></span>
      <h1 class="mt-4 text-xl font-bold text-heading">Access your trip</h1>
      <p class="mt-2 text-sm leading-6 text-ink/65">
        Enter the email on your booking and we’ll send a fresh, secure link to view your trip. (Your previous link may have expired or been replaced.)
      </p>

      {#if requested}
        <div class="mt-5 flex items-start gap-2 rounded-xl border border-forest/20 bg-forest/[0.06] p-3 text-left text-sm font-medium text-forest">
          <CheckCircle2 size={16} class="mt-0.5 shrink-0" /> If we found a trip for that email, a secure link is on its way. Please check your inbox.
        </div>
      {:else}
        <div class="mt-5 flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            bind:value={requestEmail}
            placeholder="you@example.com"
            class="h-11 flex-1 rounded-xl border border-ink/15 bg-surface px-3.5 text-sm text-ink outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/15"
          />
          <button
            type="button"
            class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-deep-green px-5 font-bold text-white transition hover:bg-forest disabled:opacity-60"
            on:click={requestLink}
            disabled={requesting || !requestEmail.trim()}
          >
            <Send size={16} /> {requesting ? 'Sending…' : 'Email me a link'}
          </button>
        </div>
      {/if}
      <a href="/contact" class="mt-4 inline-block text-sm font-semibold text-forest hover:text-heading">Or contact us →</a>
    </div>
  {:else}
    <!-- Header -->
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.16em] text-goldfinch-gold">Your trip</p>
        <h1 class="mt-1 text-2xl font-extrabold tracking-tight text-heading md:text-3xl">{trip.tour?.title ?? 'Your Tanzania safari'}</h1>
        <p class="mt-1 text-sm text-ink/60">Booking reference <span class="font-mono font-bold text-ink/80">{trip.booking_code}</span></p>
      </div>
      <div class="flex items-center gap-2">
        <span class={`inline-flex h-7 items-center rounded-full px-3 text-xs font-bold ${statusTone(trip.status)}`}>{titleCase(trip.status)}</span>
        <button type="button" class="inline-flex h-9 items-center gap-1.5 rounded-lg border border-ink/15 px-3 text-xs font-semibold text-ink/70 transition hover:bg-sand" on:click={logout}><LogOut size={14} /> Sign out</button>
      </div>
    </div>

    <div class="mt-8 grid gap-6 lg:grid-cols-3">
      <!-- Left: trip + itinerary -->
      <div class="grid content-start gap-6 lg:col-span-2">
        <!-- Trip summary -->
        <div class="overflow-hidden rounded-2xl border border-ink/10 bg-surface shadow-soft">
          {#if trip.tour?.main_image_url}
            <img class="h-44 w-full object-cover md:h-56" src={imgUrl(trip.tour.main_image_url, 1000)} alt={trip.tour?.title ?? 'Trip'} />
          {/if}
          <div class="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3">
            <div class="flex items-start gap-2.5">
              <CalendarDays size={18} class="mt-0.5 shrink-0 text-forest" />
              <div><p class="text-[11px] font-semibold uppercase tracking-wide text-ink/45">Travel date</p><p class="text-sm font-semibold text-ink">{prettyDate(trip.travel_date)}</p></div>
            </div>
            <div class="flex items-start gap-2.5">
              <Users size={18} class="mt-0.5 shrink-0 text-forest" />
              <div><p class="text-[11px] font-semibold uppercase tracking-wide text-ink/45">Travellers</p><p class="text-sm font-semibold text-ink">{trip.number_of_adults} adult{trip.number_of_adults === 1 ? '' : 's'}{trip.number_of_children ? `, ${trip.number_of_children} child${trip.number_of_children === 1 ? '' : 'ren'}` : ''}</p></div>
            </div>
            {#if trip.tour?.duration_days}
              <div class="flex items-start gap-2.5">
                <MapPin size={18} class="mt-0.5 shrink-0 text-forest" />
                <div><p class="text-[11px] font-semibold uppercase tracking-wide text-ink/45">Duration</p><p class="text-sm font-semibold text-ink">{trip.tour.duration_days} days</p></div>
              </div>
            {/if}
          </div>
          {#if trip.special_requests}
            <div class="border-t border-ink/10 px-5 py-4">
              <p class="text-[11px] font-semibold uppercase tracking-wide text-ink/45">Your notes</p>
              <p class="mt-1 text-sm leading-6 text-ink/75">{trip.special_requests}</p>
            </div>
          {/if}
        </div>

        <!-- Itinerary -->
        {#if trip.itinerary.length}
          <div class="rounded-2xl border border-ink/10 bg-surface p-5 shadow-soft md:p-6">
            <h2 class="text-lg font-bold text-heading">Day-by-day itinerary</h2>
            <ol class="mt-4 grid gap-4">
              {#each trip.itinerary as day (day.day_number)}
                <li class="flex gap-4">
                  <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-forest/10 text-sm font-bold text-forest">{day.day_number}</span>
                  <div class="min-w-0">
                    <p class="font-bold text-ink">{day.title}</p>
                    {#if day.description}<p class="mt-1 text-sm leading-6 text-ink/70">{day.description}</p>{/if}
                    <div class="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink/55">
                      {#if day.accommodation}<span>🏕 {day.accommodation}</span>{/if}
                      {#if day.meals}<span>🍽 {day.meals}</span>{/if}
                    </div>
                  </div>
                </li>
              {/each}
            </ol>
          </div>
        {/if}
      </div>

      <!-- Right: payments + message -->
      <div class="grid content-start gap-6">
        <!-- Payments -->
        <div class="rounded-2xl border border-ink/10 bg-surface p-5 shadow-soft md:p-6">
          <div class="flex items-center gap-2"><Wallet size={18} class="text-forest" /><h2 class="text-lg font-bold text-heading">Payments</h2></div>
          <dl class="mt-4 grid gap-2.5 text-sm">
            <div class="flex items-center justify-between"><dt class="text-ink/55">Trip total</dt><dd class="font-semibold text-ink">{money(trip.estimated_amount, trip.currency)}</dd></div>
            <div class="flex items-center justify-between"><dt class="text-ink/55">Paid</dt><dd class="font-semibold text-forest">{money(trip.amount_paid, trip.currency)}</dd></div>
            <div class="flex items-center justify-between border-t border-ink/10 pt-2.5"><dt class="font-semibold text-ink">Balance due</dt><dd class="text-base font-extrabold text-heading">{money(trip.balance_due, trip.currency)}</dd></div>
          </dl>
          <span class={`mt-3 inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-bold ${statusTone(trip.payment_status)}`}>{titleCase(trip.payment_status)}</span>

          {#if trip.payments.length}
            <ul class="mt-4 grid gap-2 border-t border-ink/10 pt-4">
              {#each trip.payments as p}
                <li class="flex items-center justify-between text-xs">
                  <span class="text-ink/60">{p.paid_at ? prettyDate(p.paid_at) : titleCase(p.status)}{p.payment_method ? ` · ${p.payment_method}` : ''}</span>
                  <span class="font-semibold text-ink">{money(p.amount, p.currency)}</span>
                </li>
              {/each}
            </ul>
          {/if}
          <p class="mt-4 text-xs leading-5 text-ink/50">To pay your deposit or balance, message your specialist below and we’ll send secure payment instructions.</p>
        </div>

        <!-- Message -->
        <div class="rounded-2xl border border-ink/10 bg-surface p-5 shadow-soft md:p-6">
          <div class="flex items-center gap-2"><MessageCircle size={18} class="text-forest" /><h2 class="text-lg font-bold text-heading">Message your specialist</h2></div>
          {#if messageSent}
            <div class="mt-4 flex items-start gap-2 rounded-xl border border-forest/20 bg-forest/[0.06] p-3 text-sm font-medium text-forest">
              <CheckCircle2 size={16} class="mt-0.5 shrink-0" /> Thanks — your message is with our team. We’ll reply by email shortly.
            </div>
            <button type="button" class="mt-3 text-sm font-semibold text-forest hover:text-heading" on:click={() => (messageSent = false)}>Send another</button>
          {:else}
            <textarea
              bind:value={messageText}
              rows="4"
              maxlength="4000"
              placeholder="Ask a question, request a change, or arrange a payment…"
              class="mt-3 w-full rounded-xl border border-ink/15 bg-surface px-3 py-2.5 text-sm text-ink outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/15"
            ></textarea>
            {#if messageError}<p class="mt-2 text-xs font-medium text-red-600">{messageError}</p>{/if}
            <button
              type="button"
              class="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-deep-green px-5 font-bold text-white transition hover:bg-forest disabled:opacity-60"
              on:click={sendMessage}
              disabled={sending || messageText.trim().length < 2}
            >
              <Send size={16} /> {sending ? 'Sending…' : 'Send message'}
            </button>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</section>
