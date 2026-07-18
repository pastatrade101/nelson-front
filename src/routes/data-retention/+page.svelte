<script lang="ts">
  import LegalLayout from '$lib/components/public/LegalLayout.svelte';
  import { publicSettings, settingText } from '$lib/settings';

  $: notice = settingText($publicSettings, 'data_retention_notice');
</script>

<svelte:head>
  <title>Data Retention | Emnel Adventures</title>
  <meta name="description" content="How long Emnel Adventures keeps your information, including AI Safari Advisor conversations, and how to ask us to delete your data." />
</svelte:head>

<LegalLayout
  title="Data Retention"
  updated="June 2026"
  intro="We keep your information only for as long as it is useful to help you and to meet our obligations — then we remove it. Here is exactly how that works."
>
  {#if notice}
    <h2>Our retention notice</h2>
    <p>{notice}</p>
    <hr />
  {/if}

  <h2>What we keep, and for how long</h2>
  <ul>
    <li><strong>AI Safari Advisor conversations (anonymous)</strong> — chats that are not linked to an enquiry and contain no contact details are deleted automatically after a short retention window (by default, around 90 days).</li>
    <li><strong>Conversations and enquiries linked to a booking request</strong> — kept while we plan and support your trip, and afterwards for a reasonable period to meet our records, accounting and legal obligations.</li>
    <li><strong>Contact messages</strong> — kept for as long as needed to respond to you and maintain a record of our correspondence.</li>
    <li><strong>Operational and security logs</strong> — kept briefly to keep the service reliable and to prevent abuse, then rotated out.</li>
  </ul>

  <h2>IP addresses</h2>
  <p>We do not store your raw IP address. Where we need a signal to limit spam and abuse, we store only a <strong>hashed</strong> (one-way, irreversible) value.</p>

  <h2>Automatic deletion</h2>
  <p>A routine, automated process removes anonymous AI conversations once they pass the retention window, so old data does not linger. This runs on a regular schedule.</p>

  <h2>Consent before we collect contact details</h2>
  <p>The AI Safari Advisor shows a short consent notice before it asks for any contact details, so you always know when information is being collected and why.</p>

  <h2>Your right to erasure</h2>
  <p>You can ask us to delete your personal information at any time. We will remove it unless we are required to keep certain records for legal or accounting reasons — and if so, we will tell you. To make a request, just <a href="/contact">contact us</a>.</p>

  <h2>Security</h2>
  <p>We hold your information with reputable hosting and database providers and apply reasonable technical and organisational measures to protect it. For more on how we use your data, see our <a href="/privacy">Privacy Policy</a>.</p>

  <h2>Contact us</h2>
  <p>Questions about how long we keep your data, or want it deleted? Please reach our team through the <a href="/contact">Contact</a> page.</p>
</LegalLayout>
