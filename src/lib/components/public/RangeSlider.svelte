<script lang="ts">
  export let min = 0;
  export let max = 100;
  export let step = 1;
  export let lo = min;
  export let hi = max;
  export let format: (n: number) => string = (n) => String(n);

  $: span = max - min || 1;
  $: pctLo = ((Math.max(lo, min) - min) / span) * 100;
  $: pctHi = ((Math.min(hi, max) - min) / span) * 100;

  const onLo = (e: Event) => {
    const v = Number((e.currentTarget as HTMLInputElement).value);
    lo = Math.min(v, hi);
  };
  const onHi = (e: Event) => {
    const v = Number((e.currentTarget as HTMLInputElement).value);
    hi = Math.max(v, lo);
  };
</script>

<div class="rs">
  <div class="rs-track"></div>
  <div class="rs-fill" style={`left:${pctLo}%;right:${100 - pctHi}%`}></div>
  <input class="rs-input" type="range" {min} {max} {step} value={lo} on:input={onLo} aria-label="Minimum" />
  <input class="rs-input" type="range" {min} {max} {step} value={hi} on:input={onHi} aria-label="Maximum" />
</div>
<div class="mt-1 flex justify-between text-xs font-semibold text-ink/70">
  <span>{format(lo)}</span>
  <span>{format(hi)}</span>
</div>

<style>
  .rs {
    position: relative;
    height: 26px;
  }
  .rs-track {
    position: absolute;
    top: 11px;
    left: 0;
    right: 0;
    height: 4px;
    border-radius: 999px;
    background: #d9ded9;
  }
  .rs-fill {
    position: absolute;
    top: 11px;
    height: 4px;
    border-radius: 999px;
    background: #1f4d3a;
  }
  .rs-input {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 26px;
    margin: 0;
    background: transparent;
    -webkit-appearance: none;
    appearance: none;
    pointer-events: none;
  }
  /* second (max) handle sits above so it stays grabbable */
  .rs-input:last-of-type {
    z-index: 2;
  }
  .rs-input::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    pointer-events: auto;
    height: 18px;
    width: 18px;
    border-radius: 50%;
    background: #fff;
    border: 2px solid #1f4d3a;
    box-shadow: 0 1px 4px rgba(15, 47, 36, 0.25);
    cursor: pointer;
  }
  .rs-input::-moz-range-thumb {
    pointer-events: auto;
    height: 18px;
    width: 18px;
    border: 2px solid #1f4d3a;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 4px rgba(15, 47, 36, 0.25);
    cursor: pointer;
  }
  .rs-input::-webkit-slider-runnable-track {
    background: transparent;
  }
  .rs-input::-moz-range-track {
    background: transparent;
  }
</style>
