<script lang="ts">
  import { ArrowRight, Check, Compass } from '@lucide/svelte';
  import { page } from '$app/stores';
  import { planTripHref } from '$lib/planHref';
  export let tourSlug = '';
  export let title = 'Make this journey yours.';
  export let topic = '';
  export let source = '';
  $: href = planTripHref({ tour: tourSlug, topic, from: source || $page.url.pathname });
</script>
<section class="border border-ink/10 bg-white p-6 sm:p-8">
  <Compass size={28} class="text-clay" strokeWidth={1.3} />
  <p class="mt-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-clay">Plan with Emnel</p>
  <h3 class="mt-3 font-serif text-3xl font-normal leading-tight text-heading">{title}</h3>
  <p class="mt-4 text-sm leading-7 text-ink/65">Share your dates, group and travel ideas. Our step-by-step planner keeps everything together for your local specialist.</p>
  <div class="my-6 space-y-2 text-xs text-ink/65"><p class="flex items-center gap-2"><Check size={14} /> Personal route, pace and stays</p><p class="flex items-center gap-2"><Check size={14} /> No payment or obligation</p></div>
  <a {href} class="flex min-h-12 items-center justify-center gap-3 bg-deep-green px-4 py-3 text-sm font-semibold text-white hover:bg-forest">Plan my trip <ArrowRight size={16} /></a>
</section>
