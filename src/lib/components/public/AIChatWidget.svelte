<script lang="ts">
  import { Bot, Send } from '@lucide/svelte';
  import { fly } from 'svelte/transition';
  import { api } from '$lib/api/client';
  import { brand } from '$lib/brand';

  let message = '';
  let loading = false;
  let conversationId = '';
  let reply = 'I am an AI safari advisor. Tell me when you want to travel, who is coming, how long you have, and your budget, and I can suggest the right Emnel safari.';
  let error = '';

  const submit = async () => {
    if (!message.trim()) return;
    loading = true;
    error = '';

    try {
      const response = await api.aiTravelAdvisor.chat({
        conversationId: conversationId || undefined,
        message
      });

      conversationId = response.data.conversationId;
      reply = response.data.reply;
      message = '';
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unable to reach the advisor.';
    } finally {
      loading = false;
    }
  };
</script>

<section class="rounded-lg border border-forest/10 bg-sand p-5 shadow-soft" transition:fly={{ y: 10, duration: 160 }}>
  <div class="flex items-center gap-3">
    <span class="grid h-10 w-10 place-items-center rounded-full bg-forest text-white">
      <Bot size={20} />
    </span>
    <div>
      <p class="text-sm font-semibold text-goldfinch-gold">{brand.aiAdvisorName}</p>
      <h3 class="text-xl font-bold tracking-normal text-heading">Get confidence before you book</h3>
    </div>
  </div>

  <div class="mt-4 rounded-md bg-surface p-4 text-sm leading-6 text-ink/75">
    {reply}
  </div>

  {#if error}
    <p class="mt-3 text-sm text-red-600">{error}</p>
  {/if}

  <form class="mt-4 flex gap-2" on:submit|preventDefault={submit}>
    <input class="min-w-0 flex-1 rounded-md border border-ink/10 bg-surface px-3 py-3 text-sm outline-none focus:border-forest" bind:value={message} placeholder="Ask about the Serengeti, Kilimanjaro, Zanzibar, budget, timing..." />
    <button class="grid h-11 w-11 place-items-center rounded-md bg-forest text-white disabled:opacity-60" type="submit" disabled={loading} aria-label="Send message">
      <Send size={18} />
    </button>
  </form>
</section>
