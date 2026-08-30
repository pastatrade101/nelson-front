<script lang="ts">
  /**
   * Rooms, seasonal rates, highlights and inclusions for one property.
   *
   * Ported from the goldfinch accommodation form. These four live in child
   * tables and are saved as one document through `/lodges/:id/details`, because
   * that is how they are edited — someone adds a room while reordering rates —
   * and a per-row diff could half-apply and leave a property describing rooms it
   * no longer has.
   *
   * The editor needs a property id to write against, so on a brand-new lodge it
   * asks for the property to be saved first rather than holding unsaveable state.
   */
  import { createEventDispatcher } from 'svelte';
  import { ChevronDown, ChevronUp, Plus, Trash2 } from '@lucide/svelte';
  import AdminFormInput from './AdminFormInput.svelte';
  import AdminSelect from './AdminSelect.svelte';
  import AdminTextArea from './AdminTextArea.svelte';
  import MediaPicker from './MediaPicker.svelte';
  import { mediaLibrary } from '$lib/mediaLibrary';
  /**
   * Rows are held loosely on purpose. The form inputs bind strings, the database
   * columns are numbers, dates and nulls, and the round trip through zod on the
   * server is what actually enforces the shape (see lodges.schema.ts). Typing the
   * working copy strictly here would mean casting at every single binding.
   */
  type Row = Record<string, any>;
  type WorkingDetails = { highlights: Row[]; rooms: Row[]; rates: Row[]; inclusions: Row[] };

  export let details: WorkingDetails = { highlights: [], rooms: [], rates: [], inclusions: [] };
  export let currency = 'USD';

  const dispatch = createEventDispatcher<{ change: WorkingDetails }>();

  /** Every mutation goes through here so the parent always holds current state. */
  const touch = () => {
    details = details;
    dispatch('change', details);
  };

  const ROOM_TYPES = [
    'standard_room', 'deluxe_room', 'superior_room', 'suite', 'family_room', 'family_suite',
    'safari_tent', 'luxury_tent', 'cottage', 'chalet', 'villa', 'bungalow', 'honeymoon_suite'
  ];
  const SEASONS = ['low_season', 'green_season', 'shoulder_season', 'high_season', 'peak_season', 'festive_season'];
  const PRICING_BASIS = ['per_person', 'per_person_sharing', 'per_room', 'per_unit', 'per_night'];
  const MEAL_PLANS = ['room_only', 'bed_and_breakfast', 'half_board', 'full_board', 'all_inclusive', 'full_board_plus_activities'];

  /** snake_case -> "Sentence case", so one list feeds both the value and the label. */
  const label = (value: string) => value.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
  const options = (values: string[]) => values.map((value) => ({ value, label: label(value) }));

  const csv = (list: string[] | undefined) => (list ?? []).join(', ');
  const toList = (value: string) => value.split(',').map((s) => s.trim()).filter(Boolean);

  // ── Highlights ───────────────────────────────────────────────────────────
  const addHighlight = () => { details.highlights = [...details.highlights, { title: '' }]; touch(); };
  const removeHighlight = (i: number) => {
    details.highlights = details.highlights.filter((_, n) => n !== i);
    touch();
  };

  // ── Inclusions ───────────────────────────────────────────────────────────
  const addInclusion = (isIncluded: boolean) => {
    details.inclusions = [...details.inclusions, { title: '', is_included: isIncluded }];
    touch();
  };
  const removeInclusion = (i: number) => {
    details.inclusions = details.inclusions.filter((_, n) => n !== i);
    touch();
  };

  // ── Rooms ────────────────────────────────────────────────────────────────
  const emptyRoom = (): Row => ({
    name: '', room_type: 'standard_room', short_description: '',
    max_adults: 2, max_children: 0, max_guests: 2,
    bed_types: [], unit_count: null, views: [], amenities: [], lodge_room_images: []
  });

  const addRoom = () => {
    details.rooms = [...details.rooms, emptyRoom()];
    openRoom = details.rooms.length - 1;
    touch();
  };
  const removeRoom = (i: number) => {
    details.rooms = details.rooms.filter((_, n) => n !== i);
    if (openRoom === i) openRoom = -1;
    touch();
  };
  const moveRoom = (i: number, delta: number) => {
    const to = i + delta;
    if (to < 0 || to >= details.rooms.length) return;
    const next = [...details.rooms];
    [next[i], next[to]] = [next[to], next[i]];
    details.rooms = next;
    openRoom = to;
    touch();
  };

  const addRoomImage = (i: number) => {
    const room = details.rooms[i];
    room.lodge_room_images = [...(room.lodge_room_images ?? []), { image_url: '', alt_text: '' }];
    touch();
  };
  const setRoomImage = (i: number, n: number, url: string) => {
    const images = details.rooms[i].lodge_room_images ?? [];
    images[n] = { ...images[n], image_url: url };
    details.rooms[i].lodge_room_images = images;
    touch();
  };
  const removeRoomImage = (i: number, n: number) => {
    const images: Row[] = details.rooms[i].lodge_room_images ?? [];
    details.rooms[i].lodge_room_images = images.filter((_, x) => x !== n);
    touch();
  };

  // ── Rates ────────────────────────────────────────────────────────────────
  const emptyRate = (): Row => ({
    season_type: 'high_season', season_name: '', valid_from: '', valid_until: '',
    currency, pricing_basis: 'per_person_sharing', meal_plan: 'full_board'
  });
  const addRate = () => { details.rates = [...details.rates, emptyRate()]; touch(); };
  const removeRate = (i: number) => {
    details.rates = details.rates.filter((_, n) => n !== i);
    touch();
  };

  /** One room open at a time — a property with twelve room types is unreadable otherwise. */
  let openRoom = -1;

  $: included = details.inclusions.filter((c) => c.is_included !== false);
  $: excluded = details.inclusions.filter((c) => c.is_included === false);
</script>

<div class="grid gap-6">
  <!-- ── Highlights ──────────────────────────────────────────────────────── -->
  <section class="grid gap-3 border border-ink/10 bg-sand/20 p-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 class="text-base font-semibold text-ink">Highlights</h3>
        <p class="mt-1 text-sm text-ink/55">The handful of things that make this property worth the night.</p>
      </div>
      <button class="inline-flex h-9 items-center gap-2 bg-forest px-3 text-sm font-semibold text-white transition hover:bg-deep-green" type="button" on:click={addHighlight}>
        <Plus size={15} /> Add
      </button>
    </div>

    {#if !details.highlights.length}
      <p class="border border-dashed border-ink/20 px-4 py-5 text-center text-sm text-ink/55">No highlights yet.</p>
    {/if}

    {#each details.highlights as highlight, i (i)}
      <div class="flex items-end gap-2">
        <div class="flex-1">
          <AdminFormInput label="" name={`highlight_${i}`} bind:value={highlight.title} on:input={touch} placeholder="Uninterrupted views over the Seronera valley" />
        </div>
        <button class="mb-1 p-2 text-red-500 transition hover:text-red-700" type="button" on:click={() => removeHighlight(i)} aria-label="Remove highlight">
          <Trash2 size={16} />
        </button>
      </div>
    {/each}
  </section>

  <!-- ── Rooms ───────────────────────────────────────────────────────────── -->
  <section class="grid gap-3 border border-ink/10 bg-sand/20 p-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 class="text-base font-semibold text-ink">Rooms &amp; tents</h3>
        <p class="mt-1 text-sm text-ink/55">Each room type, who it sleeps, and its own photographs.</p>
      </div>
      <button class="inline-flex h-9 items-center gap-2 bg-forest px-3 text-sm font-semibold text-white transition hover:bg-deep-green" type="button" on:click={addRoom}>
        <Plus size={15} /> Add room
      </button>
    </div>

    {#if !details.rooms.length}
      <p class="border border-dashed border-ink/20 px-4 py-5 text-center text-sm text-ink/55">
        No rooms yet. Without these the property page shows no accommodation options.
      </p>
    {/if}

    {#each details.rooms as room, i (i)}
      <div class="border border-ink/10 bg-surface">
        <div class="flex items-center gap-2 px-3 py-2">
          <button class="flex flex-1 items-center gap-2 text-left" type="button" on:click={() => (openRoom = openRoom === i ? -1 : i)}>
            <span class="text-xs font-semibold uppercase tracking-wide text-ink/45">{i + 1}</span>
            <span class="text-sm font-semibold text-ink">{room.name || 'Untitled room'}</span>
            {#if room.max_guests}<span class="text-xs text-ink/50">sleeps {room.max_guests}</span>{/if}
          </button>
          <button class="p-1.5 text-ink/40 transition hover:text-ink disabled:opacity-30" type="button" disabled={i === 0} on:click={() => moveRoom(i, -1)} aria-label="Move room up">
            <ChevronUp size={15} />
          </button>
          <button class="p-1.5 text-ink/40 transition hover:text-ink disabled:opacity-30" type="button" disabled={i === details.rooms.length - 1} on:click={() => moveRoom(i, 1)} aria-label="Move room down">
            <ChevronDown size={15} />
          </button>
          <button class="p-1.5 text-red-500 transition hover:text-red-700" type="button" on:click={() => removeRoom(i)} aria-label="Remove room">
            <Trash2 size={15} />
          </button>
        </div>

        {#if openRoom === i}
          <div class="grid gap-4 border-t border-ink/10 p-4">
            <div class="grid gap-4 sm:grid-cols-2">
              <AdminFormInput label="Room name" name={`room_name_${i}`} bind:value={room.name} on:input={touch} required placeholder="Luxury meru tent" />
              <AdminSelect label="Room type" name={`room_type_${i}`} bind:value={room.room_type} options={options(ROOM_TYPES)} on:change={touch} />
            </div>

            <AdminTextArea label="Description" name={`room_desc_${i}`} bind:value={room.short_description} rows={2} on:input={touch} placeholder="What it is like to stay in this room." />

            <div class="grid gap-4 sm:grid-cols-4">
              <AdminFormInput label="Max adults" name={`room_adults_${i}`} type="number" bind:value={room.max_adults} on:input={touch} />
              <AdminFormInput label="Max children" name={`room_children_${i}`} type="number" bind:value={room.max_children} on:input={touch} />
              <AdminFormInput label="Sleeps" name={`room_guests_${i}`} type="number" bind:value={room.max_guests} on:input={touch} />
              <AdminFormInput label="How many" name={`room_units_${i}`} type="number" bind:value={room.unit_count} on:input={touch} placeholder="8" />
            </div>

            <div class="grid gap-4 sm:grid-cols-3">
              <AdminFormInput
                label="Beds (comma-separated)"
                name={`room_beds_${i}`}
                value={csv(room.bed_types)}
                on:input={(e) => { room.bed_types = toList((e.target as HTMLInputElement).value); touch(); }}
                placeholder="king, twin"
              />
              <AdminFormInput
                label="Views (comma-separated)"
                name={`room_views_${i}`}
                value={csv(room.views)}
                on:input={(e) => { room.views = toList((e.target as HTMLInputElement).value); touch(); }}
                placeholder="savannah, river"
              />
              <AdminFormInput
                label="Amenities (comma-separated)"
                name={`room_amenities_${i}`}
                value={csv(room.amenities)}
                on:input={(e) => { room.amenities = toList((e.target as HTMLInputElement).value); touch(); }}
                placeholder="private deck, outdoor shower"
              />
            </div>

            <div class="grid gap-3 border border-ink/10 bg-sand/20 p-3">
              <div class="flex items-center justify-between gap-3">
                <span class="text-sm font-semibold text-ink">Room photographs</span>
                <button class="inline-flex h-8 items-center gap-1.5 border border-forest px-3 text-xs font-semibold text-forest transition hover:bg-forest hover:text-white" type="button" on:click={() => addRoomImage(i)}>
                  <Plus size={13} /> Add photo
                </button>
              </div>

              <div class="grid gap-3 sm:grid-cols-3">
                {#each room.lodge_room_images ?? [] as image, n (n)}
                  <div class="grid gap-2 border border-ink/10 bg-surface p-2">
                    <div class="flex items-center justify-between">
                      <span class="text-[11px] font-semibold uppercase tracking-wide text-ink/45">{n === 0 ? 'Cover' : `Photo ${n + 1}`}</span>
                      <button class="p-1 text-red-500 transition hover:text-red-700" type="button" on:click={() => removeRoomImage(i, n)} aria-label="Remove photo">
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <MediaPicker
                      label=""
                      media={$mediaLibrary}
                      uploadFolder="lodges"
                      aspect="aspect-[4/3]"
                      value={image.image_url}
                      on:change={(e) => setRoomImage(i, n, (e as CustomEvent<string>).detail)}
                    />
                    <AdminFormInput label="" name={`room_${i}_alt_${n}`} bind:value={image.alt_text} on:input={touch} placeholder="Alt text" />
                  </div>
                {/each}
              </div>
            </div>
          </div>
        {/if}
      </div>
    {/each}
  </section>

  <!-- ── Seasonal rates ──────────────────────────────────────────────────── -->
  <section class="grid gap-3 border border-ink/10 bg-sand/20 p-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 class="text-base font-semibold text-ink">Seasonal rates</h3>
        <p class="mt-1 text-sm text-ink/55">
          Indicative property rates for quoting. Hidden from the public site unless
          &ldquo;show rates publicly&rdquo; is on.
        </p>
      </div>
      <button class="inline-flex h-9 items-center gap-2 bg-forest px-3 text-sm font-semibold text-white transition hover:bg-deep-green" type="button" on:click={addRate}>
        <Plus size={15} /> Add season
      </button>
    </div>

    {#if !details.rates.length}
      <p class="border border-dashed border-ink/20 px-4 py-5 text-center text-sm text-ink/55">No rates yet.</p>
    {/if}

    {#each details.rates as rate, i (i)}
      <div class="grid gap-4 border border-ink/10 bg-surface p-4">
        <div class="flex items-start justify-between gap-3">
          <span class="text-xs font-semibold uppercase tracking-wide text-ink/45">Season {i + 1}</span>
          <button class="p-1 text-red-500 transition hover:text-red-700" type="button" on:click={() => removeRate(i)} aria-label="Remove season">
            <Trash2 size={15} />
          </button>
        </div>

        <div class="grid gap-4 sm:grid-cols-4">
          <AdminSelect label="Season" name={`rate_type_${i}`} bind:value={rate.season_type} options={options(SEASONS)} on:change={touch} />
          <AdminFormInput label="Season name" name={`rate_name_${i}`} bind:value={rate.season_name} on:input={touch} placeholder="Migration high season" />
          <AdminFormInput label="Valid from" name={`rate_from_${i}`} type="date" bind:value={rate.valid_from} on:input={touch} />
          <AdminFormInput label="Valid until" name={`rate_until_${i}`} type="date" bind:value={rate.valid_until} on:input={touch} />
        </div>

        <div class="grid gap-4 sm:grid-cols-3">
          <AdminSelect label="Pricing basis" name={`rate_basis_${i}`} bind:value={rate.pricing_basis} options={options(PRICING_BASIS)} on:change={touch} />
          <AdminSelect label="Meal plan" name={`rate_meal_${i}`} bind:value={rate.meal_plan} options={options(MEAL_PLANS)} on:change={touch} />
          <AdminFormInput label="Currency" name={`rate_currency_${i}`} bind:value={rate.currency} on:input={touch} placeholder="USD" />
        </div>

        <div class="grid gap-4 sm:grid-cols-4">
          <AdminFormInput label="Rack rate" name={`rate_rack_${i}`} type="number" bind:value={rate.rack_rate} on:input={touch} />
          <AdminFormInput label="Net rate" name={`rate_net_${i}`} type="number" bind:value={rate.net_rate} on:input={touch} />
          <AdminFormInput label="Single" name={`rate_single_${i}`} type="number" bind:value={rate.single_rate} on:input={touch} />
          <AdminFormInput label="Double" name={`rate_double_${i}`} type="number" bind:value={rate.double_rate} on:input={touch} />
        </div>

        <div class="grid gap-4 sm:grid-cols-3">
          <AdminFormInput label="Triple" name={`rate_triple_${i}`} type="number" bind:value={rate.triple_rate} on:input={touch} />
          <AdminFormInput label="Child" name={`rate_child_${i}`} type="number" bind:value={rate.child_rate} on:input={touch} />
          <AdminFormInput label="Single supplement" name={`rate_supp_${i}`} type="number" bind:value={rate.single_supplement} on:input={touch} />
        </div>

        <AdminTextArea label="Notes" name={`rate_notes_${i}`} bind:value={rate.notes} rows={2} on:input={touch} placeholder="Minimum stay, blackout dates, anything a consultant needs to know." />
      </div>
    {/each}
  </section>

  <!-- ── Inclusions ──────────────────────────────────────────────────────── -->
  <section class="grid gap-3 border border-ink/10 bg-sand/20 p-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 class="text-base font-semibold text-ink">What the rate covers</h3>
        <p class="mt-1 text-sm text-ink/55">
          {included.length} included &middot; {excluded.length} excluded
        </p>
      </div>
      <div class="flex gap-2">
        <button class="inline-flex h-9 items-center gap-1.5 bg-forest px-3 text-sm font-semibold text-white transition hover:bg-deep-green" type="button" on:click={() => addInclusion(true)}>
          <Plus size={15} /> Included
        </button>
        <button class="inline-flex h-9 items-center gap-1.5 border border-ink/20 px-3 text-sm font-semibold text-ink transition hover:bg-ink/5" type="button" on:click={() => addInclusion(false)}>
          <Plus size={15} /> Excluded
        </button>
      </div>
    </div>

    {#if !details.inclusions.length}
      <p class="border border-dashed border-ink/20 px-4 py-5 text-center text-sm text-ink/55">Nothing listed yet.</p>
    {/if}

    {#each details.inclusions as item, i (i)}
      <div class="flex items-end gap-2">
        <div class="flex-1">
          <AdminFormInput label="" name={`inclusion_${i}`} bind:value={item.title} on:input={touch} placeholder="All meals and house drinks" />
        </div>
        <label class="mb-1 flex h-11 cursor-pointer items-center gap-2 border border-ink/10 bg-surface px-3">
          <input class="h-4 w-4 accent-forest" type="checkbox" bind:checked={item.is_included} on:change={touch} />
          <span class="text-xs font-semibold text-ink">Included</span>
        </label>
        <button class="mb-1 p-2 text-red-500 transition hover:text-red-700" type="button" on:click={() => removeInclusion(i)} aria-label="Remove line">
          <Trash2 size={16} />
        </button>
      </div>
    {/each}
  </section>
</div>
