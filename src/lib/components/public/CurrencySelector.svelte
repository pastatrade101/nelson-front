<script lang="ts">
  import { Check, ChevronDown, RefreshCw } from '@lucide/svelte';
  import { currency, initCurrency, setCurrency } from '$lib/currency';

  export let compact = false;
  export let mobile = false;

  const flags: Record<string, string> = {
    USD: '🇺🇸',
    EUR: '🇪🇺',
    GBP: '🇬🇧',
    TZS: '🇹🇿',
    KES: '🇰🇪',
    ZAR: '🇿🇦',
    AUD: '🇦🇺',
    CAD: '🇨🇦'
  };

  const regionFlag = (locale: string) => {
    const region = locale.split('-').pop()?.toUpperCase() ?? '';
    if (!/^[A-Z]{2}$/.test(region)) return '';
    return String.fromCodePoint(...[...region].map((char) => 0x1f1e6 + char.charCodeAt(0) - 65));
  };

  const flagFor = (code: string, locale: string) => flags[code] ?? regionFlag(locale);

  const ensureReady = () => {
    if (!$currency.loading && $currency.status === 'missing') void initCurrency();
  };

  let open = false;
  let root: HTMLElement;
  let trigger: HTMLButtonElement;
  let activeIndex = 0;

  $: options = $currency.supportedCurrencies.filter((item) => item.enabled);
  $: selected = options.find((item) => item.code === $currency.selectedCurrency) ?? options[0];
  $: selectedIndex = options.findIndex((item) => item.code === $currency.selectedCurrency);

  // "1 USD = 2,610 TZS" — straight from the stored rate, so it only ever shows a
  // real number and disappears when the visitor is already viewing in USD.
  $: rateLine = (() => {
    const code = $currency.selectedCurrency;
    if (!code || code === $currency.baseCurrency) return '';
    const raw = Number($currency.rates?.[code]);
    if (!Number.isFinite(raw) || raw <= 0) return '';
    const digits = raw >= 100 ? 0 : 2;
    return `1 ${$currency.baseCurrency} ≈ ${raw.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })} ${code}`;
  })();

  const openList = () => {
    ensureReady();
    activeIndex = selectedIndex >= 0 ? selectedIndex : 0;
    open = true;
  };

  const close = (refocus = false) => {
    open = false;
    if (refocus) trigger?.focus();
  };

  const choose = (code: string) => {
    setCurrency(code);
    close(true);
  };

  const move = (delta: number) => {
    if (!options.length) return;
    let next = activeIndex;
    // step over anything without a rate rather than letting focus rest on it
    for (let i = 0; i < options.length; i++) {
      next = (next + delta + options.length) % options.length;
      if (options[next].available !== false) break;
    }
    activeIndex = next;
  };

  const onTriggerKeydown = (event: KeyboardEvent) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      open ? move(event.key === 'ArrowUp' ? -1 : 1) : openList();
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      close(true);
    } else if (open && event.key === 'Tab') {
      close();
    }
  };

  const onListKeydown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); move(1); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); move(-1); }
    else if (event.key === 'Home') { event.preventDefault(); activeIndex = 0; }
    else if (event.key === 'End') { event.preventDefault(); activeIndex = options.length - 1; }
    else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const option = options[activeIndex];
      if (option && option.available !== false) choose(option.code);
    } else if (event.key === 'Escape') { event.preventDefault(); close(true); }
  };

  let panel: HTMLElement | null = null;
  let pos = { top: 0, left: 0, width: 268 };

  // The selector lives in a header bar that is `overflow-hidden` (it animates its
  // max-height) inside a `sticky z-40` header, so an absolutely-positioned panel
  // is clipped by the bar and trapped under the nav row. Rendering it on <body>
  // with fixed coordinates escapes both the clip and the stacking context.
  const place = () => {
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = mobile ? rect.width : 268;
    const gap = 8;
    const height = panel?.offsetHeight || 200;
    const spaceBelow = window.innerHeight - rect.bottom;
    const flipUp = spaceBelow < height + gap && rect.top > spaceBelow;
    const left = Math.max(8, Math.min(mobile ? rect.left : rect.right - width, window.innerWidth - width - 8));
    pos = { top: flipUp ? Math.max(8, rect.top - height - gap) : rect.bottom + gap, left, width };
  };

  const portalPanel = (node: HTMLElement) => {
    document.body.appendChild(node);
    panel = node;
    node.focus();
    place();
    return {
      destroy: () => {
        panel = null;
        node.remove();
      }
    };
  };

  const onWindowPointerDown = (event: PointerEvent) => {
    if (!open) return;
    const target = event.target as Node;
    // the panel is portalled out of `root`, so it needs checking separately
    if (root?.contains(target) || panel?.contains(target)) return;
    close();
  };
</script>

<svelte:window on:pointerdown={onWindowPointerDown} on:resize={() => open && place()} on:scroll={() => open && place()} />

<!-- The navbar and the mobile drawer both close on outside clicks, so every
     interaction here is kept from bubbling up to them. -->
<div
  class={`relative min-w-0 ${mobile ? 'w-full' : ''}`}
  bind:this={root}
  on:click|stopPropagation
  on:pointerdown|stopPropagation
  role="presentation"
>
  {#if !compact}
    <span class="mb-1 block text-[11px] font-bold uppercase tracking-[0.12em] text-ink/45">Currency</span>
  {/if}

  <button
    type="button"
    bind:this={trigger}
    class={`inline-flex min-w-0 items-center gap-2 rounded-none border pl-2.5 pr-2 transition
      ${mobile ? 'bg-surface text-heading shadow-sm' : 'bg-transparent text-white'}
      ${open
        ? 'border-goldfinch-gold ring-2 ring-goldfinch-gold/25'
        : mobile
          ? 'border-ink/12 hover:border-goldfinch-gold/60'
          : 'border-white/30 hover:border-goldfinch-gold/70'}
      ${compact ? 'h-10' : 'h-11'} ${mobile ? 'w-full justify-between' : ''}`}
    aria-haspopup="listbox"
    aria-expanded={open}
    aria-label={`Display currency: ${selected?.code ?? 'USD'}`}
    aria-busy={$currency.loading}
    disabled={!options.length}
    on:click={() => (open ? close() : openList())}
    on:keydown={onTriggerKeydown}
    on:focus={ensureReady}
  >
    <span class="text-base leading-none" aria-hidden="true">{selected ? flagFor(selected.code, selected.locale) : '🌍'}</span>
    <span class="min-w-0 truncate text-sm font-extrabold">{selected?.code ?? 'USD'}</span>
    {#if !compact && !mobile && selected?.symbol}
      <span class="text-sm font-semibold text-ink/40">{selected.symbol}</span>
    {/if}
    {#if mobile && selected?.name}
      <span class="ml-1 min-w-0 flex-1 truncate text-left text-sm font-medium text-ink/50">{selected.name}</span>
    {/if}
    <span class={`ml-auto shrink-0 ${mobile ? 'text-ink/40' : 'text-white/70'}`}>
      {#if $currency.loading}
        <RefreshCw size={14} class="animate-spin" />
      {:else}
        <ChevronDown size={15} class={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      {/if}
    </span>
  </button>

  {#if open}
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <!-- z-[130] clears the mobile drawer (z-[120]), which the selector sits inside -->
    <ul
      class="fixed z-[130] max-h-[min(60vh,340px)] overflow-y-auto rounded-none border border-ink/10 bg-surface p-1.5 shadow-[0_20px_50px_rgba(57,61,50,0.18)]"
      style={`top:${pos.top}px; left:${pos.left}px; width:${pos.width}px;`}
      role="listbox"
      tabindex="-1"
      aria-label="Display currency"
      aria-activedescendant={options[activeIndex] ? `currency-${options[activeIndex].code}` : undefined}
      on:keydown={onListKeydown}
      on:click|stopPropagation
      on:pointerdown|stopPropagation
      use:portalPanel
    >
      {#each options as item, index (item.code)}
        {@const isSelected = item.code === $currency.selectedCurrency}
        {@const unavailable = item.available === false}
        <!-- svelte-ignore a11y_click_events_have_key_events a11y-click-events-have-key-events -->
        <li
          id={`currency-${item.code}`}
          role="option"
          aria-selected={isSelected}
          aria-disabled={unavailable}
          class={`flex cursor-pointer items-center gap-3 rounded-none px-2.5 py-2 transition
            ${index === activeIndex ? 'bg-sand' : ''}
            ${isSelected ? 'bg-goldfinch-gold/12' : ''}
            ${unavailable ? 'cursor-not-allowed opacity-40' : 'hover:bg-sand'}`}
          on:click={() => !unavailable && choose(item.code)}
          on:mouseenter={() => (activeIndex = index)}
        >
          <span class="text-lg leading-none" aria-hidden="true">{flagFor(item.code, item.locale)}</span>
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-extrabold text-heading">{item.code}</span>
            <span class="block truncate text-xs text-ink/50">{item.name}</span>
          </span>
          <span class="shrink-0 text-xs font-semibold text-ink/35">{item.symbol}</span>
          <span class="w-4 shrink-0 text-forest">
            {#if isSelected}<Check size={16} />{/if}
          </span>
        </li>
      {/each}

      {#if rateLine}
        <li class="mt-1 border-t border-ink/10 px-2.5 pb-1 pt-2 text-[11px] leading-4 text-ink/45" role="presentation">
          {rateLine}
          <span class="block">Converted from {$currency.baseCurrency}; trips are quoted in {$currency.baseCurrency}.</span>
        </li>
      {/if}
    </ul>
  {/if}
</div>
