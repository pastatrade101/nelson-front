<script lang="ts">
  import { createEventDispatcher, tick } from 'svelte';
  import { ChevronDown } from '@lucide/svelte';
  import { COUNTRIES, countryFlag, type Country } from '$lib/data/countries';

  export let value = '';
  export let invalid = false;
  export let placeholder = 'Search your country...';
  export let id = 'country';

  const dispatch = createEventDispatcher<{ change: string }>();

  let query = value;
  let open = false;
  let activeIndex = 0;
  let container: HTMLDivElement;
  let listEl: HTMLUListElement;

  // Mirror the committed value into the input whenever the menu is closed
  // (covers parent resets like "Submit another request").
  $: if (!open) query = value;

  const norm = (s: string) => s.toLowerCase().trim();

  $: filtered = ((): Country[] => {
    const q = norm(query);
    if (!q) return COUNTRIES;
    const starts: Country[] = [];
    const contains: Country[] = [];
    for (const c of COUNTRIES) {
      const n = norm(c.name);
      if (n.startsWith(q)) starts.push(c);
      else if (n.includes(q) || norm(c.code) === q) contains.push(c);
    }
    return [...starts, ...contains];
  })();

  const commit = (name: string) => {
    value = name;
    query = name;
    open = false;
    dispatch('change', name);
  };

  const onInput = () => {
    open = true;
    activeIndex = 0;
    // Typing invalidates a previous pick until an exact country is chosen again,
    // so `value` is always a real country name or empty (clean data).
    if (value && norm(value) !== norm(query)) {
      value = '';
      dispatch('change', '');
    }
  };

  const reconcileAndClose = () => {
    if (!open) return;
    open = false;
    const exact = COUNTRIES.find((c) => norm(c.name) === norm(query));
    if (exact) {
      value = exact.name;
      query = exact.name;
      dispatch('change', exact.name);
    } else {
      query = value; // revert display to the last valid value (or empty)
    }
  };

  const scrollActive = async () => {
    await tick();
    (listEl?.children[activeIndex] as HTMLElement | undefined)?.scrollIntoView({ block: 'nearest' });
  };

  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      open = true;
      activeIndex = Math.min(activeIndex + 1, filtered.length - 1);
      void scrollActive();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      void scrollActive();
    } else if (e.key === 'Enter') {
      if (open && filtered[activeIndex]) {
        e.preventDefault();
        commit(filtered[activeIndex].name);
      }
    } else if (e.key === 'Escape') {
      open = false;
      query = value;
    }
  };

  const onFocusOut = (e: FocusEvent) => {
    if (container && !container.contains(e.relatedTarget as Node)) reconcileAndClose();
  };

  const onWindowClick = (e: MouseEvent) => {
    if (open && container && !container.contains(e.target as Node)) reconcileAndClose();
  };
</script>

<svelte:window on:click={onWindowClick} />

<div class="relative" bind:this={container} on:focusout={onFocusOut}>
  <div class="relative">
    <input
      {id}
      class={`w-full rounded-md border bg-surface px-3 py-3 pr-9 text-sm text-ink outline-none transition focus:ring-2 ${
        invalid ? 'border-red-300 focus:border-red-400 focus:ring-red-200' : 'border-ink/15 focus:border-forest focus:ring-forest/15'
      }`}
      role="combobox"
      aria-expanded={open}
      aria-controls="country-listbox"
      aria-autocomplete="list"
      autocomplete="off"
      {placeholder}
      bind:value={query}
      on:input={onInput}
      on:focus={() => { open = true; activeIndex = 0; }}
      on:keydown={onKeydown}
    />
    <ChevronDown size={16} class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink/40" />
  </div>

  {#if open}
    <ul
      id="country-listbox"
      role="listbox"
      bind:this={listEl}
      class="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-ink/12 bg-surface py-1 shadow-lg"
    >
      {#if filtered.length === 0}
        <li class="px-3 py-2 text-sm text-ink/50">No match. Try another spelling.</li>
      {:else}
        {#each filtered as c, i (c.code)}
          <li role="option" aria-selected={value === c.name}>
            <button
              type="button"
              class={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition ${
                i === activeIndex ? 'bg-forest/[0.08] text-heading' : 'text-ink/80 hover:bg-sand/60'
              }`}
              on:mouseenter={() => (activeIndex = i)}
              on:click={() => commit(c.name)}
            >
              <span class="text-base leading-none">{countryFlag(c.code)}</span>
              <span class="truncate">{c.name}</span>
            </button>
          </li>
        {/each}
      {/if}
    </ul>
  {/if}
</div>
