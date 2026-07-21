<script lang="ts">
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
    '/admin/bookings': 'Bookings',
    '/admin/payments': 'Payments',
    '/admin/blog': 'Blog',
    '/admin/blog/categories': 'Blog Categories',
    '/admin/gallery': 'Gallery',
    '/admin/media': 'Media Library',
    '/admin/testimonials': 'Testimonials',
    '/admin/specialists': 'Specialists',
    '/admin/faqs': 'FAQs',
    '/admin/homepage': 'Homepage',
    '/admin/messages': 'Messages',
    '/admin/branding': 'Branding',
    '/admin/settings': 'Settings',
    '/admin/settings/integrations': 'Integrations',
    '/admin/users': 'Admin Users',
    '/admin/roles': 'Roles and Permissions',
    '/admin/audit-logs': 'Audit Logs',
    '/admin/ai-conversations': 'AI Conversations'
  };

  $: path = $page.url.pathname;
  $: isLogin = path === '/admin/login';
  $: title = titles[path] ?? 'Admin';
  $: if (browser && !isLogin && !localStorage.getItem('admin_token')) goto('/admin/login');
</script>

{#if isLogin}
  <slot />
{:else}
  <AdminLayout {title} currentPath={path}>
    <slot />
  </AdminLayout>
{/if}
