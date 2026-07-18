<script lang="ts">
  import { afterUpdate, onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { ArrowUpRight, MapPin, MessageCircle, Send, Sparkles, Star, X } from '@lucide/svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { env as publicEnv } from '$env/dynamic/public';
  import { trackEvent } from '$lib/analytics';
  import { streamAdvisorChat } from '$lib/api/client';
  import { aiAdvisorOpen, aiAdvisorSeed } from '$lib/aiAdvisor';
  import { brand } from '$lib/brand';
  import LottieChatIcon from './LottieChatIcon.svelte';
  import type { AdvisorAction, AdvisorPageContext, AdvisorRecommendation } from '$lib/types';

  type ChatMessage = {
    role: 'user' | 'assistant';
    text: string;
    recommendations?: AdvisorRecommendation[];
    actions?: AdvisorAction[];
  };

  const WELCOME =
    "Hi, I'm the Emnel AI Safari Advisor — an AI here to help you plan a private Tanzania safari with confidence. Where would you like to go, and roughly when?";

  // Page-aware opening line so the greeting fits where the visitor launched it.
  const computeWelcome = (path: string): string => {
    if (/^\/tours\/[^/]+/.test(path)) return "Hi. Want help deciding if this trip fits — or planning something similar? Tell me your dates, group size and budget.";
    if (path.startsWith('/tours')) return "Looking for the right safari? Tell me your destination, dates, group and budget and I'll suggest options.";
    if (path.startsWith('/destinations') || path.startsWith('/countries')) return "Hi. Planning a trip to this region? Tell me when you'd travel, your group and budget and I'll help shape it.";
    if (path.startsWith('/experiences') || path.startsWith('/travel-styles')) return "Hi. Tell me the experience you're after, plus your dates, group and budget, and I'll match real Emnel trips.";
    if (path.startsWith('/plan-my-trip')) return "Hi. I can help you plan before you submit — tell me what you have in mind (destination, dates, group, budget).";
    return WELCOME;
  };

  const QUICK_REPLIES = [
    'Help me choose a safari',
    'I want Kilimanjaro',
    'Plan safari + Zanzibar',
    'Travelling with family',
    'Show available departures',
    'Talk to a human'
  ];

  // Open-state lives in a shared store so the navbar "Need help?" link (and any
  // other entry point) can launch the advisor.
  let started = false;
  let trackedOpen = false;
  // Track each advisor open once (it can be opened from many entry points).
  $: if ($aiAdvisorOpen && !trackedOpen) { trackedOpen = true; trackEvent('ai_advisor_opened'); }
  $: if (!$aiAdvisorOpen) trackedOpen = false;
  let input = '';
  let loading = false;
  let conversationId = '';
  let handoff = false;
  let messages: ChatMessage[] = [{ role: 'assistant', text: WELCOME }];
  let scroller: HTMLDivElement;

  // Auto-hide the launcher while scrolling DOWN so it never covers content;
  // bring it back on scroll-up or near the top of the page.
  let launcherHidden = false;
  let lastScrollY = 0;
  const onScroll = () => {
    const y = window.scrollY;
    if (y < 80) launcherHidden = false;
    else if (y > lastScrollY + 6) launcherHidden = true;
    else if (y < lastScrollY - 6) launcherHidden = false;
    lastScrollY = y;
  };

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

  // While the panel is open and the visitor hasn't sent anything yet, keep the
  // greeting matched to the current page (so "Need help?" on a tour page opens
  // with a trip-specific welcome). Stops once the conversation starts.
  $: if ($aiAdvisorOpen && !started) {
    messages = [{ role: 'assistant', text: computeWelcome($page.url.pathname) }];
  }

  // A seeded question (e.g. from an Expert Advice chip) is auto-sent on open.
  $: if ($aiAdvisorOpen && $aiAdvisorSeed && !loading) {
    const seeded = $aiAdvisorSeed;
    aiAdvisorSeed.set(null);
    void send(seeded);
  }

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
    if ($aiAdvisorOpen) scrollToBottom();
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
    trackEvent('ai_advisor_message_sent');
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
              { type: 'plan_my_trip', label: 'Plan My Safari', url: '/plan-my-trip' }
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

  // Render a small, safe subset of Markdown the model may still emit (bold,
  // bullets, headings) so visitors never see raw ** or # characters. Content is
  // HTML-escaped first, so this is XSS-safe.
  const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const formatReply = (text: string): string =>
    escapeHtml(text)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
      .replace(/(^|\n)\s*[-*]\s+/g, '$1• ')
      .replace(/(^|\n)#{1,6}\s+/g, '$1');

  const money = (rec: AdvisorRecommendation) =>
    rec.price_from != null ? `${rec.currency} ${rec.price_from.toLocaleString()}` : '';

  const labelTone = (label: string) =>
    label.startsWith('Excellent')
      ? 'bg-forest text-white'
      : label.startsWith('Strong')
        ? 'bg-goldfinch-gold text-heading'
        : 'bg-sand text-clay';
</script>

<svelte:window on:scroll={onScroll} />

<!-- Floating launcher: compact circle on mobile, labelled pill on desktop.
     Auto-hides on scroll-down so it never covers content. -->
{#if !$aiAdvisorOpen}
  <button
    class={`fixed bottom-24 right-4 z-[60] grid h-14 w-14 place-items-center rounded-full bg-deep-green text-white shadow-[0_14px_40px_rgba(28,26,22,0.35)] transition-all duration-300 ease-out hover:bg-forest sm:inline-flex sm:h-auto sm:w-auto sm:items-center sm:gap-2.5 sm:px-5 sm:py-3.5 sm:font-bold md:bottom-6 md:right-6 ${
      launcherHidden ? 'pointer-events-none translate-y-28 opacity-0' : 'translate-y-0 opacity-100'
    }`}
    type="button"
    on:click={() => ($aiAdvisorOpen = true)}
    aria-label="Open the Emnel AI Safari Advisor"
  >
    <LottieChatIcon size={40} />
    <span class="hidden sm:inline">Ask our AI advisor</span>
  </button>
{/if}

<!-- Panel -->
{#if $aiAdvisorOpen}
  <div
    class="fixed inset-0 z-[60] flex flex-col bg-surface md:inset-auto md:bottom-6 md:right-6 md:h-[640px] md:max-h-[85vh] md:w-[400px] md:rounded-none md:border md:border-ink/10 md:shadow-[0_30px_80px_rgba(28,26,22,0.28)]"
    role="dialog"
    aria-label="Emnel AI Safari Advisor"
    transition:fly={motion(20, 220)}
  >
    <!-- Header -->
    <header class="flex items-center justify-between gap-3 border-b border-ink/10 bg-deep-green px-4 py-3 text-white md:rounded-t-none">
      <div class="flex items-center gap-2.5">
        <span class="grid h-9 w-9 place-items-center rounded-full bg-surface/15"><LottieChatIcon size={24} /></span>
        <div class="leading-tight">
          <p class="text-sm font-bold">{brand.aiAdvisorName}</p>
          <p class="text-[11px] text-white/70">AI assistant · replies are guidance, not a final booking</p>
        </div>
      </div>
      <button class="rounded-full p-1.5 text-white/80 transition hover:bg-surface/10 hover:text-white" type="button" on:click={() => ($aiAdvisorOpen = false)} aria-label="Close advisor">
        <X size={18} />
      </button>
    </header>

    <!-- Messages -->
    <div class="flex-1 space-y-3 overflow-y-auto bg-sand/30 px-4 py-4" bind:this={scroller}>
      {#each messages as m, i (i)}
        {#if m.role === 'user'}
          <div class="flex justify-end" in:fade={{ duration: reduce ? 0 : 120 }}>
            <p class="max-w-[85%] rounded-none rounded-br-sm bg-forest px-3.5 py-2.5 text-sm leading-6 text-white">{m.text}</p>
          </div>
        {:else}
          <div class="flex flex-col gap-2" in:fade={{ duration: reduce ? 0 : 120 }}>
            {#if m.text}
              <p class="max-w-[90%] whitespace-pre-wrap rounded-none rounded-bl-sm bg-surface px-3.5 py-2.5 text-sm leading-6 text-ink shadow-sm">{@html formatReply(m.text)}</p>
            {:else if loading && i === messages.length - 1}
              <p class="inline-flex w-fit items-center gap-1 rounded-none rounded-bl-sm bg-surface px-3.5 py-3 shadow-sm" aria-label="Advisor is typing">
                <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-black/40" style="animation-delay:0ms"></span>
                <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-black/40" style="animation-delay:120ms"></span>
                <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-black/40" style="animation-delay:240ms"></span>
              </p>
            {/if}

            <!-- Recommendation cards -->
            {#if m.recommendations?.length}
              <div class="grid gap-2">
                {#each m.recommendations as rec (rec.tour_id)}
                  <article class="rounded-none border border-ink/10 bg-surface p-3 shadow-sm">
                    <div class="flex items-start justify-between gap-2">
                      <h4 class="text-sm font-extrabold leading-snug text-heading">{rec.title}</h4>
                      <span class={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${labelTone(rec.confidence_label)}`}>{rec.confidence_label}</span>
                    </div>
                    <div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-semibold text-ink/70">
                      {#if rec.destination}<span class="inline-flex items-center gap-1"><MapPin size={11} /> {rec.destination}</span>{/if}
                      {#if rec.duration_days}<span>· {rec.duration_days} days</span>{/if}
                      {#if money(rec)}<span class="text-heading">· from {money(rec)}</span>{/if}
                    </div>
                    {#if rec.reasons?.length}
                      <ul class="mt-2 space-y-0.5">
                        {#each rec.reasons.slice(0, 3) as reason}
                          <li class="flex items-start gap-1.5 text-[12px] leading-5 text-ink/70"><Star size={11} class="mt-0.5 shrink-0 text-goldfinch-gold" fill="currentColor" /> {reason}</li>
                        {/each}
                      </ul>
                    {/if}
                    <a class="mt-2 inline-flex items-center gap-1 text-[12px] font-bold text-forest transition hover:text-heading" href={rec.cta}>
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
                      class="inline-flex items-center gap-1.5 rounded-full border border-forest/25 bg-surface px-3 py-1.5 text-[12px] font-bold text-forest transition hover:bg-forest hover:text-white"
                      href={action.url}
                      target={action.type === 'whatsapp' ? '_blank' : undefined}
                      rel={action.type === 'whatsapp' ? 'noopener noreferrer' : undefined}
                    >
                      {#if action.type === 'whatsapp'}<MessageCircle size={13} />{:else}<Sparkles size={13} />{/if}
                      {action.label}
                    </a>
                  {:else}
                    <button
                      class="inline-flex items-center gap-1.5 rounded-full bg-goldfinch-gold px-3 py-1.5 text-[12px] font-bold text-heading transition hover:brightness-105"
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
            <button class="rounded-full border border-ink/15 bg-surface px-3 py-1.5 text-[12px] font-semibold text-ink/70 transition hover:border-forest/40 hover:text-forest" type="button" on:click={() => onQuickReply(q)}>{q}</button>
          {/each}
        </div>
      {/if}

      {#if handoff}
        <p class="rounded-none border border-goldfinch-gold/30 bg-goldfinch-gold/10 px-3 py-2 text-[12px] font-medium text-clay">An Emnel specialist will follow up with you personally.</p>
      {/if}
    </div>

    <!-- Composer + consent -->
    <form class="border-t border-ink/10 bg-surface px-3 py-3 md:rounded-b-none" on:submit={onSubmit}>
      <div class="flex items-end gap-2">
        <input
          class="min-w-0 flex-1 rounded-full border border-ink/15 bg-surface px-4 py-2.5 text-sm outline-none transition focus:border-forest"
          bind:value={input}
          placeholder="Ask about destinations, dates, budget…"
          aria-label="Message the AI advisor"
          autocomplete="off"
        />
        <button class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-forest text-white transition hover:bg-deep-green disabled:opacity-50" type="submit" disabled={loading || !input.trim()} aria-label="Send">
          <Send size={17} />
        </button>
      </div>
      <p class="mt-2 px-1 text-[10.5px] leading-4 text-ink/70">
        By chatting you agree we may store your messages and any details you share to help plan your trip. No payment is taken here.
      </p>
      {#if turnstileSiteKey}<div bind:this={turnstileMount} class="hidden"></div>{/if}
    </form>
  </div>
{/if}
