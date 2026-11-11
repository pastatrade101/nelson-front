<script lang="ts">
  import { onDestroy, onMount } from 'svelte';

  // Generic Chart.js wrapper. Loaded in the browser only (lib touches canvas).
  export let type: 'line' | 'bar' | 'doughnut' = 'bar';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export let data: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export let options: Record<string, any> = {};
  export let height = 280;

  let canvas: HTMLCanvasElement;
  let container: HTMLDivElement;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let chart: any = null;
  let mounted = false;
  let resizeObserver: ResizeObserver | null = null;

  onMount(async () => {
    const [{ Chart, registerables }, datalabels] = await Promise.all([
      import('chart.js'),
      import('chartjs-plugin-datalabels')
    ]);
    Chart.register(...registerables, datalabels.default);
    Chart.defaults.font.family = 'Figtree, Inter, ui-sans-serif, sans-serif';
    // datalabels is opt-in per chart (charts enable it via options.plugins.datalabels).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Chart.defaults.plugins as any).datalabels = { ...(Chart.defaults.plugins as any).datalabels, display: false };
    chart = new Chart(canvas, { type, data, options });
    mounted = true;
    // Chart.js normally observes its container, but a browser resize, mobile
    // rotation, or the CMS sidebar changing width can leave the canvas at its
    // former desktop width. Observe the wrapper ourselves so charts never
    // create hidden horizontal overflow in an admin report.
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => chart?.resize?.());
      resizeObserver.observe(container);
    }
    requestAnimationFrame(() => chart?.resize?.());
  });

  onDestroy(() => {
    resizeObserver?.disconnect();
    try { chart?.destroy?.(); } catch { /* ignore */ }
  });

  // Update (re-animates) when the data/options objects change.
  $: if (mounted && chart) {
    chart.data = data;
    chart.options = options;
    chart.update();
  }
</script>

<div bind:this={container} class="relative min-w-0 max-w-full overflow-hidden" style={`height:${height}px`}>
  <canvas bind:this={canvas} class="block max-w-full"></canvas>
</div>
