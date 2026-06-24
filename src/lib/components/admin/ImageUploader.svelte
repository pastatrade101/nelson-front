<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { api } from '$lib/api/client';

  export let folder = 'cms';

  let files: FileList;
  let uploading = false;
  let message = '';

  const dispatch = createEventDispatcher<{ uploaded: { url: string; path: string } }>();

  const upload = async () => {
    const file = files?.[0];
    if (!file) return;

    uploading = true;
    message = '';
    try {
      const response = await api.upload.image(file, folder);
      dispatch('uploaded', response.data);
      message = 'Image uploaded.';
    } catch (error) {
      message = error instanceof Error ? error.message : 'Unable to upload image.';
    } finally {
      uploading = false;
    }
  };
</script>

<div class="rounded-lg border border-dashed border-ink/20 bg-surface p-5">
  <label class="grid gap-2 text-sm font-medium text-ink">
    <span>Image upload</span>
    <input accept="image/jpeg,image/png,image/webp" bind:files class="rounded-md border border-ink/15 bg-surface px-3 py-2.5 text-sm" type="file" />
  </label>
  <button class="mt-3 rounded-md bg-forest px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" type="button" disabled={uploading} on:click={upload}>
    {uploading ? 'Uploading...' : 'Upload Image'}
  </button>
  {#if message}
    <p class="mt-3 text-sm text-ink/60">{message}</p>
  {/if}
</div>
