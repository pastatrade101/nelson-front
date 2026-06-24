<script lang="ts">
  import { CheckCircle2, AlertCircle } from '@lucide/svelte';
  import { api } from '$lib/api/client';
  import Button from './Button.svelte';
  import FormInput from './FormInput.svelte';
  import TextArea from './TextArea.svelte';

  let full_name = '';
  let email = '';
  let phone = '';
  let subject = '';
  let message = '';
  let submitting = false;
  let sent = false;
  let errorMessage = '';

  const submit = async () => {
    errorMessage = '';
    sent = false;

    if (!full_name.trim() || !email.trim() || message.trim().length < 10) {
      errorMessage = 'Please add your name, a valid email, and a message of at least 10 characters.';
      return;
    }

    submitting = true;
    try {
      await api.contact.create({
        full_name: full_name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        subject: subject.trim() || null,
        message: message.trim()
      });
      full_name = '';
      email = '';
      phone = '';
      subject = '';
      message = '';
      sent = true;
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unable to send message. Please try again.';
    } finally {
      submitting = false;
    }
  };
</script>

<form class="grid gap-4 rounded-lg border border-ink/10 bg-surface p-5 shadow-soft" on:submit|preventDefault={submit}>
  <div class="grid gap-4 md:grid-cols-2">
    <FormInput label="Full name" name="full_name" bind:value={full_name} required />
    <FormInput label="Email" name="email" type="email" bind:value={email} required />
  </div>
  <FormInput label="Phone" name="phone" bind:value={phone} />
  <FormInput label="Subject" name="subject" bind:value={subject} />
  <TextArea label="Message" name="message" bind:value={message} required />

  {#if sent}
    <div class="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
      <CheckCircle2 size={18} class="mt-0.5 shrink-0" />
      <span>Thanks for reaching out — your message has been sent. Our team will get back to you shortly.</span>
    </div>
  {:else if errorMessage}
    <div class="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      <AlertCircle size={18} class="mt-0.5 shrink-0" />
      <span>{errorMessage}</span>
    </div>
  {/if}

  <Button type="submit">{submitting ? 'Sending...' : 'Send Message'}</Button>
</form>
