<script lang="ts">
  import { onMount } from 'svelte';
  import { Eye, EyeOff, Lock, Mail } from '@lucide/svelte';
  import { goto } from '$app/navigation';
  import { api } from '$lib/api/client';
  import { branding } from '$lib/branding';
  import LoginSlider from '$lib/components/admin/LoginSlider.svelte';

  type Slide = { image_url: string; title?: string; subtitle?: string };

  let email = 'admin@goldfinch.local';
  let password = '';
  let showPassword = false;
  let error = '';
  let loading = false;
  let slides: Slide[] = [];

  const defaultSlides: Slide[] = [
    {
      image_url: 'https://images.unsplash.com/photo-1516426122078-c23e76319801',
      title: 'Plan East Africa with confidence',
      subtitle: 'Honest safari, Kilimanjaro and beach advice from local experts.'
    }
  ];

  $: displaySlides = slides.length ? slides : defaultSlides;
  $: brandName = $branding.site_name || 'Goldfinch Adventures';

  const login = async () => {
    loading = true;
    error = '';
    try {
      const response = await api.auth.login({ email, password });
      localStorage.setItem('admin_token', response.data.token);
      localStorage.setItem('admin_user', JSON.stringify(response.data.user));
      localStorage.setItem(
        'admin_permissions',
        JSON.stringify(response.data.user.role === 'super_admin' ? ['*'] : [])
      );
      await goto('/admin');
    } catch (requestError) {
      error = requestError instanceof Error ? requestError.message : 'Unable to login.';
    } finally {
      loading = false;
    }
  };

  onMount(async () => {
    // Slides are managed in Admin → Homepage → "login_slider" (extra_data.slides).
    try {
      const res = await api.homepage.get();
      const sections = (res.data ?? []) as unknown as Array<Record<string, unknown>>;
      const slider = sections.find((s) => s.section_key === 'login_slider');
      const extra = (slider?.extra_data ?? {}) as Record<string, unknown>;
      if (Array.isArray(extra.slides)) {
        slides = (extra.slides as Array<Record<string, unknown>>)
          .filter((s) => typeof s.image_url === 'string' && (s.image_url as string).trim())
          .map((s) => ({
            image_url: String(s.image_url),
            title: s.title ? String(s.title) : '',
            subtitle: s.subtitle ? String(s.subtitle) : ''
          }));
      }
    } catch {
      // fall back to defaultSlides
    }
  });
</script>

<main class="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
  <!-- left: brand image slider (desktop) -->
  <div class="relative hidden lg:block">
    <LoginSlider slides={displaySlides} {brandName} />
  </div>

  <!-- right: sign-in form -->
  <div class="relative flex items-center justify-center bg-sand/40 px-6 py-10 md:px-10">
    <div class="w-full max-w-md">
      <p class="text-sm font-semibold uppercase tracking-[0.18em] text-clay">{brandName} · Admin</p>

      <div class="mt-3 flex items-center gap-3">
        <h1 class="text-4xl font-extrabold tracking-tight text-deep-green md:text-5xl">Welcome</h1>
        <!-- decorative flight path (swap for a Lottie later) -->
        <svg class="mt-2 h-8 w-24 shrink-0 text-goldfinch-gold" viewBox="0 0 96 32" fill="none" aria-hidden="true">
          <path d="M2 27 C 28 27, 48 10, 80 7" stroke="currentColor" stroke-width="2" stroke-dasharray="3 5" stroke-linecap="round" />
          <path d="M76 1 l11 6 -11 6 3 -6 z" fill="currentColor" />
        </svg>
      </div>
      <p class="mt-1 text-ink/55">Sign in to your account</p>

      <form class="mt-8 grid gap-4" on:submit|preventDefault={login}>
        <label class="grid gap-2 text-sm font-medium text-ink">
          <span>Email</span>
          <div class="relative">
            <Mail class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" size={18} />
            <input
              class="w-full rounded-xl border border-ink/15 bg-white py-3 pl-10 pr-3 outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/15"
              type="email"
              name="email"
              autocomplete="email"
              placeholder="you@example.com"
              bind:value={email}
              required
            />
          </div>
        </label>

        <label class="grid gap-2 text-sm font-medium text-ink">
          <span>Password</span>
          <div class="relative">
            <Lock class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" size={18} />
            <input
              class="w-full rounded-xl border border-ink/15 bg-white py-3 pl-10 pr-11 outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/15"
              type={showPassword ? 'text' : 'password'}
              name="password"
              autocomplete="current-password"
              placeholder="••••••••"
              bind:value={password}
              required
            />
            <button
              type="button"
              class="absolute inset-y-0 right-0 grid w-11 place-items-center text-ink/45 transition hover:text-ink/70"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              on:click={() => (showPassword = !showPassword)}
            >
              {#if showPassword}<EyeOff size={18} />{:else}<Eye size={18} />{/if}
            </button>
          </div>
        </label>

        {#if error}
          <p class="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
        {/if}

        <button
          type="submit"
          class="mt-2 inline-flex h-12 items-center justify-center rounded-xl bg-deep-green px-6 font-bold text-white shadow-sm transition hover:bg-forest disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading}
        >
          {loading ? 'Logging in…' : 'Login'}
        </button>
      </form>

      <p class="mt-10 text-center text-xs text-ink/40">{brandName} · Content Management System</p>
    </div>
  </div>
</main>
