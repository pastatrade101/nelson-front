<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import AdminLayout from '$lib/components/admin/AdminLayout.svelte';

  const titles: Record<string, string> = {
    '/admin': 'Dashboard',
    '/admin/analytics': 'Analytics',
    '/admin/tours': 'Tours',
    '/admin/tours/new': 'New Tour',
    '/admin/itineraries': 'Itineraries',
    '/admin/available-dates': 'Available Dates',
    '/admin/pricing-options': 'Pricing Options',
    '/admin/categories': 'Tour Categories',
    '/admin/destinations': 'Destinations',
    '/admin/lodges': 'Lodges & Camps',
    '/admin/bookings': 'Bookings',
    '/admin/quotations': 'Quotations',
    '/admin/whatsapp': 'WhatsApp Inbox',
    '/admin/payments': 'Payments',
    '/admin/blog': 'Blog',
    '/admin/safari-essentials': 'Safari Essentials',
    '/admin/blog/categories': 'Blog Categories',
    '/admin/gallery': 'Gallery',
    '/admin/media': 'Media Library',
    '/admin/testimonials': 'Testimonials',
    '/admin/specialists': 'Specialists',
    '/admin/faqs': 'FAQs',
    '/admin/homepage': 'Homepage',
    '/admin/about': 'About Page',
    '/admin/landing-pages': 'Landing Pages',
    '/admin/messages': 'Messages',
    '/admin/branding': 'Branding',
    '/admin/settings': 'Settings',
    '/admin/settings/integrations': 'Integrations',
    '/admin/page-seo': 'Page SEO',
    '/admin/users': 'Admin Users',
    '/admin/roles': 'Roles and Permissions',
    '/admin/audit-logs': 'Audit Logs',
    '/admin/ai-conversations': 'AI Conversations'
  };

  $: path = $page.url.pathname;
  $: isLogin = path === '/admin/login';
  $: title = titles[path] ?? 'Admin';
  $: if (browser && !isLogin && !localStorage.getItem('admin_token')) goto('/admin/login');

  // The API said the saved login no longer works. Unsaved work stays on this
  // page: log in again in another tab (it writes the new token to the same
  // storage), come back, and repeat the save.
  let sessionExpired = false;
  onMount(() => {
    const expired = () => (sessionExpired = true);
    const renewed = (event: StorageEvent) => {
      if (event.key === 'admin_token' && event.newValue) sessionExpired = false;
    };
    window.addEventListener('admin:session-expired', expired);
    window.addEventListener('storage', renewed);
    return () => {
      window.removeEventListener('admin:session-expired', expired);
      window.removeEventListener('storage', renewed);
    };
  });
</script>

{#if sessionExpired && !isLogin}
  <div class="fixed inset-x-0 top-0 z-[90] flex flex-wrap items-center justify-center gap-3 bg-amber-100 px-4 py-2.5 text-sm text-amber-950 shadow" role="alert">
    <span><b>Your login has expired.</b> Nothing on this page is lost — log in again in a new tab, then come back and save.</span>
    <a class="border border-amber-500 bg-white px-3 py-1 text-xs font-bold text-amber-900 hover:bg-amber-50" href="/admin/login" target="_blank" rel="noopener">Log in in a new tab</a>
    <button type="button" class="text-xs font-semibold underline" on:click={() => (sessionExpired = false)}>Dismiss</button>
  </div>
{/if}

{#if isLogin}
  <slot />
{:else}
  <AdminLayout {title} currentPath={path}>
    <slot />
  </AdminLayout>
{/if}
