<script lang="ts">
  import { CheckCircle2, Mail, Send } from '@lucide/svelte';
  import { api } from '$lib/api/client';

  export let tourTitle = '';

  let email = '';
  let submitting = false;
  let done = false;
  let error = '';

  // The bookings endpoint requires a name; derive a friendly one from the email
  // so this stays a true one-field, low-commitment capture (no backend change).
  const deriveName = (value: string) => {
    const local = value.split('@')[0] ?? '';
    const name = local
      .replace(/[._-]+/g, ' ')
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());
    return name.length >= 2 ? name : 'Website visitor';
  };

  const submit = async () => {
    error = '';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      error = 'Please enter a valid email.';
      return;
    }
    submitting = true;
    try {
      await api.bookings.create({
        full_name: deriveName(email.trim()),
        email: email.trim(),
        source: 'email_itinerary',
        message: tourTitle ? `Please email me the "${tourTitle}" itinerary.` : 'Please email me this itinerary.',
        lead_context: { intent: 'email_itinerary', ...(tourTitle ? { tour_interest: tourTitle } : {}) }
      });
      done = true;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Could not send. Please try again.';
    } finally {
      submitting = false;
    }
  };
</script>

<div class="rounded-2xl border border-ink/10 bg-sand/30 p-5">
  {#if done}
    <div class="flex items-center gap-3 text-heading">
      <CheckCircle2 size={22} class="shrink-0 text-emerald-600" />
      <p class="text-sm font-semibold">On its way — check your inbox shortly. A specialist will follow up to help you plan.</p>
    </div>
  {:else}
    <p class="text-sm font-bold text-heading">Want it in your inbox?</p>
    <p class="mt-0.5 text-xs text-ink/70">We'll email you this itinerary — no obligation.</p>
    <form class="mt-3 flex flex-col gap-2 sm:flex-row" on:submit|preventDefault={submit}>
      <div class="relative flex-1">
        <Mail class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" size={16} />
        <input
          class="h-11 w-full rounded-xl border border-ink/15 bg-surface pl-9 pr-3 text-sm outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/15"
          type="email"
          placeholder="you@example.com"
          autocomplete="email"
          bind:value={email}
          required
        />
      </div>
      <button
        class="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-forest px-5 text-sm font-bold text-white transition hover:bg-deep-green disabled:opacity-60"
        type="submit"
        disabled={submitting}
      >
        <Send size={15} />{submitting ? 'Sending…' : 'Email me this'}
      </button>
    </form>
    {#if error}<p class="mt-2 text-xs font-medium text-red-600">{error}</p>{/if}
  {/if}
</div>
