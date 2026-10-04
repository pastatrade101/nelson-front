<script lang="ts">
  import { createEventDispatcher, tick } from 'svelte';
  import { X } from '@lucide/svelte';
  import AdminButton from './AdminButton.svelte';

  export let title = 'New accommodation';
  export let section = 'overview';
  export let dirty = false;
  export let saving = false;
  export let ready = false;
  export let loadFailed = false;
  export let creating = false;
  export let published = false;
  export let discard = false;
  export let error = '';
  export let liveHref = '';
  const dispatch = createEventDispatcher();
  const sections = [
    { id: 'overview', label: 'Overview', hint: 'Name, destination & story' },
    { id: 'images', label: 'Photography', hint: 'Cover images & gallery' },
    { id: 'details', label: 'Rooms & rates', hint: 'Room types, seasons & inclusions' },
    { id: 'location', label: 'Location & access', hint: 'Setting, map & transfers' },
    { id: 'guests', label: 'Guest experience', hint: 'Who it suits & practical advice' },
    { id: 'publishing', label: 'Publishing & SEO', hint: 'Visibility & search preview' }
  ];
  let scrollArea: HTMLDivElement;
  let formNode: HTMLFormElement;
  $: current = sections.find(s => s.id === section) ?? sections[0];
  const mount = (node: HTMLDialogElement) => {
    const previous = document.activeElement as HTMLElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    node.showModal();
    return { destroy() { node.close(); document.body.style.overflow = overflow; previous?.focus(); } };
  };
  const select = (id: string) => { section = id; scrollArea?.scrollTo({ top: 0 }); };
  export async function focusField(field: string, target: string) {
    select(target);
    await tick();
    formNode.querySelector<HTMLElement>(`[name="${field}"]`)?.focus();
  }
</script>

<dialog use:mount on:cancel|preventDefault={() => dispatch('close')} aria-labelledby="accommodation-title" class="workspace">
  <form bind:this={formNode} on:submit|preventDefault={() => dispatch('save')} novalidate>
    <header>
      <div class="min-w-0"><p class="eyebrow">Accommodation workspace</p><h2 id="accommodation-title">{title}</h2></div>
      <div class="flex shrink-0 items-center gap-3">
        {#if liveHref}<a href={liveHref} target="_blank" rel="noopener noreferrer" class="hidden text-sm font-semibold text-forest underline underline-offset-4 sm:inline">View live</a>{/if}
        <button type="button" aria-label="Close accommodation editor" disabled={saving} on:click={() => dispatch('close')} class="grid h-10 w-10 place-items-center rounded-md border border-ink/15"><X size={18} /></button>
      </div>
    </header>
    <div class="body">
      <nav aria-label="Accommodation editor sections">
        {#each sections as item, i}
          <button type="button" disabled={saving} aria-current={section === item.id ? 'step' : undefined} on:click={() => select(item.id)} class:active={section === item.id}>
            <span class="number">0{i + 1}</span><span><strong>{item.label}</strong><small>{item.hint}</small></span>
          </button>
        {/each}
        <p class="nav-note">All sections save together. Unchanged galleries, rooms and rates are left untouched.</p>
      </nav>
      <div class="content" bind:this={scrollArea}>
        <p class="eyebrow">Section {sections.indexOf(current) + 1} of {sections.length}</p>
        <h3>{current.label}</h3><p class="mb-6 text-sm text-ink/60">{current.hint}.</p>
        {#if error}<div role="alert" class="mb-5 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>{/if}
        <fieldset disabled={saving || !ready} class="min-w-0"><slot /></fieldset>
      </div>
    </div>
    <footer>
      {#if discard}
        <div role="alert" class="flex w-full flex-wrap items-center gap-3">
          <span class="mr-auto text-sm font-semibold text-clay">Discard your unsaved edits?</span>
          <AdminButton variant="secondary" on:click={() => dispatch('keep')}>Keep editing</AdminButton>
          <AdminButton variant="danger" on:click={() => dispatch('discard')}>Discard edits</AdminButton>
        </div>
      {:else}
        <span role="status" class="mr-auto text-xs font-semibold text-ink/55">{saving ? 'Saving your changes…' : dirty ? 'Unsaved changes' : ready ? 'No unsaved changes' : loadFailed ? 'Saved content unavailable' : 'Loading saved content…'}</span>
        <AdminButton variant="secondary" on:click={() => dispatch('close')} disabled={saving}>Cancel</AdminButton>
        <AdminButton type="submit" disabled={saving || !ready || (!creating && !dirty)}>{saving ? 'Saving…' : creating ? 'Create property' : published ? 'Save & publish' : 'Save changes'}</AdminButton>
      {/if}
    </footer>
  </form>
</dialog>

<style>
  .workspace { width: min(1240px, calc(100vw - 40px)); height: min(900px, calc(100dvh - 40px)); max-width: none; max-height: none; padding: 0; border: 1px solid #deded5; background: #fafaf6; color: #272d26; border-radius: 12px; box-shadow: 0 24px 90px #0004; }
  .workspace::backdrop { background: #10241dcc; }
  form { height: 100%; display: flex; flex-direction: column; }
  header { display: flex; justify-content: space-between; align-items: center; gap: 20px; padding: 20px 28px; border-bottom: 1px solid #deded5; }
  h2 { font-family: var(--font-serif, Georgia, serif); font-size: 28px; line-height: 1.2; overflow-wrap: anywhere; margin-top: 5px; }
  .eyebrow { font-size: 10px; font-weight: 700; letter-spacing: .17em; text-transform: uppercase; color: #63715b; }
  .body { flex: 1; min-height: 0; display: grid; grid-template-columns: 235px minmax(0, 1fr); }
  nav { overflow-y: auto; padding: 22px 12px; border-right: 1px solid #deded5; background: #f1f3ec; }
  nav button { display: flex; width: 100%; gap: 12px; padding: 14px 12px; text-align: left; border: 1px solid transparent; border-radius: 6px; }
  nav button.active { background: #fff; border-color: #c9d3c5; color: #254635; }
  nav button:hover { background: #fff9; }
  nav strong { display: block; font-size: 13px; }
  nav small { display: block; font-size: 11px; color: #697064; margin-top: 3px; }
  .number { font-size: 10px; color: #71806a; padding-top: 3px; }
  .nav-note { padding: 22px 14px; font-size: 12px; line-height: 1.7; color: #697064; }
  .content { min-width: 0; overflow-y: auto; overscroll-behavior: contain; padding: 28px 32px; }
  h3 { font-family: var(--font-serif, Georgia, serif); font-size: 30px; margin: 6px 0; }
  footer { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; padding: 16px 28px; border-top: 1px solid #deded5; background: #fff; }
  @media (max-width: 767px) {
    .workspace { width: 100vw; height: 100dvh; margin: 0; border: 0; border-radius: 0; }
    header { padding: 16px; } h2 { font-size: 22px; }
    .body { display: flex; flex-direction: column; }
    nav { display: flex; flex-shrink: 0; overflow-x: auto; padding: 8px; border-right: 0; border-bottom: 1px solid #deded5; }
    nav button { width: auto; white-space: nowrap; padding: 10px 12px; } nav small, .number, .nav-note { display: none; }
    .content { padding: 20px 16px; flex: 1; } footer { padding: 12px 16px; gap: 8px; } footer > span { width: 100%; }
  }
</style>
