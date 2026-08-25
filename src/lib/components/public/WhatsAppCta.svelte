<script lang="ts">
  import { MessageCircle } from '@lucide/svelte';
  import { trackEvent, type EventMeta } from '$lib/analytics';
  import { publicSettings, settingText } from '$lib/settings';

  // ---------------------------------------------------------------------------
  // One WhatsApp deep-link for the whole site.
  //
  // Every call site used to derive the number, encode its own message and (only
  // sometimes) fire `whatsapp_click`. This component owns all three, so the link,
  // the rel/target hardening and the analytics event are identical everywhere.
  // Content is plain data (a message string + a label), never a Tour record, so a
  // campaign landing page can drop it in with its own copy.
  // ---------------------------------------------------------------------------

  /** Pre-filled chat text — the component URL-encodes it. */
  export let message = '';
  /** Visible button text. Ignored when the call site supplies slot content. */
  export let label = 'WhatsApp';
  /**
   * primary — solid #25D366 brand-green button (form success CTAs)
   * outline — #25D366 outline button for light surfaces
   * icon    — round green icon button (navbar)
   * ghost   — unstyled: the call site owns every class through `className`
   */
  export let variant: 'primary' | 'outline' | 'ghost' | 'icon' = 'primary';
  /** Analytics context, e.g. 'tour_detail' | 'navbar'. */
  export let context = '';
  /** Extra classes for the call site (layout: `w-full`, `mt-4`, …). */
  export let className = '';
  /**
   * Optional number override (e.g. a specialist's own line). Falls back to the
   * site number from public settings.
   */
  export let number: string | null | undefined = '';
  /** Accessible name — set it when the visible content is an icon only. */
  export let ariaLabel = '';
  /** Extra non-PII analytics fields merged into the `whatsapp_click` event. */
  export let meta: EventMeta = {};

  const VARIANTS: Record<'primary' | 'outline' | 'ghost' | 'icon', string> = {
    primary:
      'inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#20bd5a]',
    outline:
      'inline-flex items-center justify-center gap-2 rounded-xl border border-[#25D366] bg-transparent px-4 py-3 text-sm font-bold text-[#0f7a41] transition hover:bg-[#25D366]/10',
    icon: 'grid h-11 w-11 place-items-center rounded-full bg-[#25D366] text-white shadow-sm',
    ghost: ''
  };

  // Same fallback number the call sites used, so the link never breaks before
  // settings hydrate.
  $: waDigits = (number || settingText($publicSettings, 'whatsapp_number') || '+255 700 000 000').replace(/\D/g, '');
  $: href = `https://wa.me/${waDigits}?text=${encodeURIComponent(message)}`;
  $: classes = [VARIANTS[variant], className].filter(Boolean).join(' ');

  // Always tracked — some old copies of this link omitted the event.
  const onClick = (): void =>
    trackEvent('whatsapp_click', { ...meta, ...(context ? { metadata: { context } } : {}) });
</script>

<a
  {href}
  target="_blank"
  rel="noopener noreferrer"
  class={classes}
  aria-label={ariaLabel || undefined}
  on:click={onClick}
  on:click
>
  <slot>
    {#if variant === 'icon'}
      <MessageCircle size={20} strokeWidth={2.6} />
    {:else}
      <MessageCircle size={18} /> {label}
    {/if}
  </slot>
</a>
