<script lang="ts">
  import { afterUpdate, onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { ArrowUpRight, Bot, MapPin, MessageCircle, Send, Sparkles, Star, X } from '@lucide/svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { env as publicEnv } from '$env/dynamic/public';
  import { streamAdvisorChat } from '$lib/api/client';
  import { brand } from '$lib/brand';
  import type { AdvisorAction, AdvisorPageContext, AdvisorRecommendation } from '$lib/types';

  type ChatMessage = {
    role: 'user' | 'assistant';
    text: string;
    recommendations?: AdvisorRecommendation[];
    actions?: AdvisorAction[];
  };

  const WELCOME =
    "Hi, I'm the Goldfinch AI Travel Advisor — an AI here to help you plan East Africa with confidence. Where would you like to go, and roughly when?";

  const QUICK_REPLIES = [
    'Help me choose a safari',
    'I want Kilimanjaro',
    'Plan safari + Zanzibar',
    'Travelling with family',
    'Show available departures',
    'Talk to a human'
  ];

  let open = false;
  let started = false;
  let input = '';
  let loading = false;
  let conversationId = '';
  let handoff = false;
  let messages: ChatMessage[] = [{ role: 'assistant', text: WELCOME }];
  let scroller: HTMLDivElement;

  const reduce = browser && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const motion = (y: number, duration: number) => (reduce ? { duration: 0 } : { y, duration });

  // ── page context + optional Turnstile token ──────────────────────────────
  $: pageContext = ((): AdvisorPageContext => {
    const path = $page.url.pathname;
    const ctx: AdvisorPageContext = { path };
    const tour = path.match(/^\/tours\/([^/]+)/);
    if (tour) ctx.tour_slug = tour[1];
    return ctx;
  })();

  const turnstileSiteKey = publicEnv.PUBLIC_TURNSTILE_SITE_KEY;
  let turnstileToken = '';
  let turnstileMount: HTMLDivElement;

  const loadTurnstile = () => {
    if (!turnstileSiteKey || !browser) return;
    const render = () => {
      const ts = (window as unknown as { turnstile?: { render: (el: HTMLElement, opts: Record<string, unknown>) => void } }).turnstile;
      if (ts && turnstileMount) {
        ts.render(turnstileMount, { sitekey: turnstileSiteKey, size: 'invisible', callback: (t: string) => (turnstileToken = t) });
      }
    };
    if ((window as unknown as { turnstile?: unknown }).turnstile) {
      render();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = render;
    document.head.appendChild(script);
  };

  onMount(loadTurnstile);

  const scrollToBottom = () => {
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
  };
  afterUpdate(() => {
    if (open) scrollToBottom();
  });

  const lastAssistant = (): ChatMessage | undefined => {
    for (let i = messages.length - 1; i >= 0; i -= 1) if (messages[i].role === 'assistant') return messages[i];
    return undefined;
  };

  const send = async (text: string, idempotencyKey?: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    started = true;
    loading = true;
    messages = [...messages, { role: 'user', text: trimmed }, { role: 'assistant', text: '' }];
    input = '';

    await streamAdvisorChat(
      {
        conversationId: conversationId || undefined,
        message: trimmed,
        page_context: pageContext,
        turnstile_token: turnstileToken || undefined,
        idempotency_key: idempotencyKey
      },
      {
        onMeta: (meta) => {
          conversationId = meta.conversation_id || conversationId;
        },
        onRecommendations: (recs) => {
          const a = lastAssistant();
          if (a) a.recommendations = recs;
          messages = [...messages];
        },
        onDelta: (chunk) => {
          const a = lastAssistant();
          if (a) a.text += chunk;
          messages = [...messages];
        },
        onDone: (payload) => {
          const a = lastAssistant();
          if (a) {
            if (!a.text.trim()) a.text = payload.reply;
            a.actions = payload.suggested_actions ?? [];
            if (payload.recommendations?.length) a.recommendations = payload.recommendations;
          }
          handoff = payload.handoff_required;
          conversationId = payload.conversation_id || conversationId;
          messages = [...messages];
          loading = false;
        },
        onError: (msg) => {
          const a = lastAssistant();
          if (a) {
            a.text = msg;
            a.actions = [
              { type: 'whatsapp', label: 'Continue on WhatsApp', url: 'https://wa.me/' },
              { type: 'plan_my_trip', label: 'Plan My Trip', url: '/plan-my-trip' }
            ];
          }
          messages = [...messages];
          loading = false;
        }
      }
    );
  };

  const onSubmit = (event: Event) => {
    event.preventDefault();
    void send(input);
  };

  const onQuickReply = (text: string) => void send(text);

  const onAction = (action: AdvisorAction) => {
    if (action.type === 'booking_request') {
      void send('Please create a booking request for me.', crypto.randomUUID());
    } else if (action.type === 'talk_to_human') {
      void send('I would like to talk to a human specialist.');
    }
    // plan_my_trip / whatsapp render as links below.
  };

  const money = (rec: AdvisorRecommendation) =>
    rec.price_from != null ? `${rec.currency} ${rec.price_from.toLocaleString()}` : '';

  const labelTone = (label: string) =>
    label.startsWith('Excellent')
      ? 'bg-forest text-white'
      : label.startsWith('Strong')
        ? 'bg-goldfinch-gold text-deep-green'
        : 'bg-sand text-clay';
</script>

<!-- Floating launcher -->
{#if !open}
  <button
    class="fixed bottom-24 right-4 z-[60] inline-flex items-center gap-2 rounded-full bg-deep-green px-4 py-3 font-bold text-white shadow-[0_14px_40px_rgba(15,47,36,0.35)] transition hover:bg-forest md:bottom-6 md:right-6"
    type="button"
    on:click={() => (open = true)}
    aria-label="Open the Goldfinch AI Travel Advisor"
  >
    <Bot size={20} strokeWidth={2.2} />
    <span class="sm:hidden">AI advisor</span>
    <span class="hidden sm:inline">Ask our AI advisor</span>
  </button>
{/if}

<!-- Panel -->
{#if open}
  <div
    class="fixed inset-0 z-[60] flex flex-col bg-white md:inset-auto md:bottom-6 md:right-6 md:h-[640px] md:max-h-[85vh] md:w-[400px] md:rounded-[16px] md:border md:border-ink/10 md:shadow-[0_30px_80px_rgba(15,47,36,0.28)]"
    role="dialog"
    aria-label="Goldfinch AI Travel Advisor"
    transition:fly={motion(20, 220)}
  >
    <!-- Header -->
    <header class="flex items-center justify-between gap-3 border-b border-ink/10 bg-deep-green px-4 py-3 text-white md:rounded-t-[16px]">
      <div class="flex items-center gap-2.5">
        <span class="grid h-9 w-9 place-items-center rounded-full bg-white/15"><Bot size={18} /></span>
        <div class="leading-tight">
          <p class="text-sm font-bold">{brand.aiAdvisorName}</p>
          <p class="text-[11px] text-white/70">AI assistant · replies are guidance, not a final booking</p>
        </div>
      </div>
      <button class="rounded-full p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white" type="button" on:click={() => (open = false)} aria-label="Close advisor">
        <X size={18} />
      </button>
    </header>

    <!-- Messages -->
    <div class="flex-1 space-y-3 overflow-y-auto bg-sand/30 px-4 py-4" bind:this={scroller}>
      {#each messages as m, i (i)}
        {#if m.role === 'user'}
          <div class="flex justify-end" in:fade={{ duration: reduce ? 0 : 120 }}>
            <p class="max-w-[85%] rounded-[14px] rounded-br-sm bg-forest px-3.5 py-2.5 text-sm leading-6 text-white">{m.text}</p>
          </div>
        {:else}
          <div class="flex flex-col gap-2" in:fade={{ duration: reduce ? 0 : 120 }}>
            {#if m.text}
              <p class="max-w-[90%] whitespace-pre-wrap rounded-[14px] rounded-bl-sm bg-white px-3.5 py-2.5 text-sm leading-6 text-ink shadow-sm">{m.text}</p>
            {:else if loading && i === messages.length - 1}
              <p class="inline-flex w-fit items-center gap-1 rounded-[14px] rounded-bl-sm bg-white px-3.5 py-3 shadow-sm" aria-label="Advisor is typing">
                <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-ink/40" style="animation-delay:0ms"></span>
                <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-ink/40" style="animation-delay:120ms"></span>
                <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-ink/40" style="animation-delay:240ms"></span>
              </p>
            {/if}

            <!-- Recommendation cards -->
            {#if m.recommendations?.length}
              <div class="grid gap-2">
                {#each m.recommendations as rec (rec.tour_id)}
                  <article class="rounded-[12px] border border-ink/10 bg-white p-3 shadow-sm">
                    <div class="flex items-start justify-between gap-2">
                      <h4 class="text-sm font-extrabold leading-snug text-deep-green">{rec.title}</h4>
                      <span class={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${labelTone(rec.confidence_label)}`}>{rec.confidence_label}</span>
                    </div>
                    <div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-semibold text-ink/55">
                      {#if rec.destination}<span class="inline-flex items-center gap-1"><MapPin size={11} /> {rec.destination}</span>{/if}
                      {#if rec.duration_days}<span>· {rec.duration_days} days</span>{/if}
                      {#if money(rec)}<span class="text-deep-green">· from {money(rec)}</span>{/if}
                    </div>
                    {#if rec.reasons?.length}
                      <ul class="mt-2 space-y-0.5">
                        {#each rec.reasons.slice(0, 3) as reason}
                          <li class="flex items-start gap-1.5 text-[12px] leading-5 text-ink/70"><Star size={11} class="mt-0.5 shrink-0 text-goldfinch-gold" fill="currentColor" /> {reason}</li>
                        {/each}
                      </ul>
                    {/if}
                    <a class="mt-2 inline-flex items-center gap-1 text-[12px] font-bold text-forest transition hover:text-deep-green" href={rec.cta}>
                      View this trip <ArrowUpRight size={13} strokeWidth={2.6} />
                    </a>
                  </article>
                {/each}
              </div>
            {/if}

            <!-- Suggested actions -->
            {#if m.actions?.length}
              <div class="flex flex-wrap gap-2 pt-1">
                {#each m.actions as action}
                  {#if action.url}
                    <a
                      class="inline-flex items-center gap-1.5 rounded-full border border-forest/25 bg-white px-3 py-1.5 text-[12px] font-bold text-forest transition hover:bg-forest hover:text-white"
                      href={action.url}
                      target={action.type === 'whatsapp' ? '_blank' : undefined}
                      rel={action.type === 'whatsapp' ? 'noopener noreferrer' : undefined}
                    >
                      {#if action.type === 'whatsapp'}<MessageCircle size={13} />{:else}<Sparkles size={13} />{/if}
                      {action.label}
                    </a>
                  {:else}
                    <button
                      class="inline-flex items-center gap-1.5 rounded-full bg-goldfinch-gold px-3 py-1.5 text-[12px] font-bold text-deep-green transition hover:brightness-105"
                      type="button"
                      on:click={() => onAction(action)}
                    >
                      {action.label}
                    </button>
                  {/if}
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      {/each}

      <!-- Quick replies (before the first user turn) -->
      {#if !started}
        <div class="flex flex-wrap gap-2 pt-1">
          {#each QUICK_REPLIES as q}
            <button class="rounded-full border border-ink/15 bg-white px-3 py-1.5 text-[12px] font-semibold text-ink/70 transition hover:border-forest/40 hover:text-forest" type="button" on:click={() => onQuickReply(q)}>{q}</button>
          {/each}
        </div>
      {/if}

      {#if handoff}
        <p class="rounded-[10px] border border-goldfinch-gold/30 bg-goldfinch-gold/10 px-3 py-2 text-[12px] font-medium text-clay">A Goldfinch specialist will follow up with you personally.</p>
      {/if}
    </div>

    <!-- Composer + consent -->
    <form class="border-t border-ink/10 bg-white px-3 py-3 md:rounded-b-[16px]" on:submit={onSubmit}>
      <div class="flex items-end gap-2">
        <input
          class="min-w-0 flex-1 rounded-full border border-ink/15 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-forest"
          bind:value={input}
          placeholder="Ask about destinations, dates, budget…"
          aria-label="Message the AI advisor"
          autocomplete="off"
        />
        <button class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-forest text-white transition hover:bg-deep-green disabled:opacity-50" type="submit" disabled={loading || !input.trim()} aria-label="Send">
          <Send size={17} />
        </button>
      </div>
      <p class="mt-2 px-1 text-[10.5px] leading-4 text-ink/45">
        By chatting you agree we may store your messages and any details you share to help plan your trip. No payment is taken here.
      </p>
      {#if turnstileSiteKey}<div bind:this={turnstileMount} class="hidden"></div>{/if}
    </form>
  </div>
{/if}
