<script lang="ts">
  import { ArrowRight, Compass } from '@lucide/svelte';
</script>

<section class="container-shell grid place-items-center py-14 md:py-20">
  <a
    class="band group relative mx-auto flex w-full max-w-5xl flex-col items-start gap-6 overflow-hidden rounded-[10px] border border-goldfinch-gold/25 bg-gradient-to-br from-sand via-sand to-savanna/45 p-7 shadow-[0_14px_44px_rgba(15,47,36,0.07)] transition-shadow duration-500 hover:shadow-[0_24px_64px_rgba(15,47,36,0.12)] sm:flex-row sm:items-center sm:justify-between md:p-9"
    href="/trip-finder"
  >
    <!-- soft decorative layers -->
    <span class="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-goldfinch-gold/20 blur-3xl"></span>
    <span
      class="pointer-events-none absolute inset-0 opacity-[0.035]"
      style="background-image: radial-gradient(circle, #0F2F24 1px, transparent 1.4px); background-size: 22px 22px;"
    ></span>

    <div class="relative flex items-center gap-4">
      <span class="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-goldfinch-gold text-deep-green shadow-[0_6px_18px_rgba(217,164,65,0.4)] ring-1 ring-white/40">
        <Compass size={26} strokeWidth={2.1} />
      </span>
      <div>
        <p class="text-[11px] font-bold uppercase tracking-[0.2em] text-clay">Not sure where to start?</p>
        <p class="mt-1.5 text-xl font-extrabold leading-snug tracking-tight text-deep-green md:text-[26px]">
          Find your trip in a minute<span class="font-semibold text-ink/40"> — </span>answer a few quick questions.
        </p>
      </div>
    </div>

    <span class="breathe relative inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-deep-green px-6 font-bold text-white">
      Start Trip Finder
      <ArrowRight size={18} class="transition-transform duration-300 group-hover:translate-x-0.5" />
    </span>
  </a>
</section>

<style>
  /* gentle, settled "breathing" — slow scale + soft shadow pulse */
  @keyframes tf-breathe {
    0%,
    100% {
      transform: scale(1);
      box-shadow: 0 8px 22px rgba(15, 47, 36, 0.16);
    }
    50% {
      transform: scale(1.035);
      box-shadow: 0 14px 34px rgba(15, 47, 36, 0.24);
    }
  }

  .breathe {
    animation: tf-breathe 3.8s ease-in-out infinite;
    will-change: transform;
  }

  /* settle the moment the user hovers/focuses the card */
  .band:hover .breathe,
  .band:focus-visible .breathe {
    animation: none;
    transform: scale(1.03);
    box-shadow: 0 16px 38px rgba(15, 47, 36, 0.26);
  }

  @media (prefers-reduced-motion: reduce) {
    .breathe {
      animation: none;
    }
  }
</style>
