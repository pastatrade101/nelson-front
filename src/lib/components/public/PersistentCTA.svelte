<script lang="ts">
  import { Sparkles } from '@lucide/svelte';
  import { page } from '$app/stores';

  // Mobile bottom CTA: a single, primary action (Plan My Trip). WhatsApp is NOT
  // duplicated here — it's permanently in the navbar and inside the AI advisor —
  // and the AI advisor owns the bottom-right launcher, so the bottom area stays
  // uncluttered. Hidden on admin routes (layout) and on the plan page itself.
  $: onPlanPage = $page.url.pathname.startsWith('/plan-my-trip');
</script>

{#if !onPlanPage}
  <div
    class="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-surface/95 backdrop-blur lg:hidden"
    style="padding-bottom: env(safe-area-inset-bottom);"
  >
    <div class="px-3 py-2.5">
      <a
        href="/plan-my-trip"
        class="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-goldfinch-gold px-4 text-[15px] font-bold text-heading shadow-sm transition active:brightness-95"
      >
        <Sparkles size={18} strokeWidth={2.4} />
        Plan My Trip
      </a>
    </div>
  </div>
{/if}
