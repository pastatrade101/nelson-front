<script lang="ts">
  import { AppWindow, MapPin, Monitor, MousePointerClick } from '@lucide/svelte';
  import BreakdownBars from '../ux/BreakdownBars.svelte';
  import { CHANNEL_ACCENT, prettyRows, type MainLeadsWhatsApp } from './types';

  // WhatsApp clicks — every wa.me / api.whatsapp.com link on the site is caught
  // by one delegated listener, so these splits cover all buttons, including
  // links typed into page content. "Unknown" location = clicks recorded before
  // button locations were tracked.
  export let whatsapp: MainLeadsWhatsApp;

  const accent = CHANNEL_ACCENT.whatsapp;
</script>

<div class="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-4">
  <BreakdownBars title="By button location" source="website" rows={prettyRows(whatsapp?.byLocation)} icon={MousePointerClick} {accent}
    emptyText="No WhatsApp clicks in this period yet." />
  <BreakdownBars title="By page" source="website" rows={whatsapp?.byPage ?? []} icon={AppWindow} {accent}
    emptyText="Pages appear once someone taps a WhatsApp link." />
  <BreakdownBars title="By tour" source="website" rows={whatsapp?.byTour ?? []} icon={MapPin} {accent}
    emptyText="Clicks from tour pages are grouped by tour here." />
  <BreakdownBars title="By device" source="website" rows={prettyRows(whatsapp?.byDevice)} icon={Monitor} {accent}
    emptyText="Device split appears with the first click." />
</div>
