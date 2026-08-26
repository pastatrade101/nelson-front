import { browser } from '$app/environment';
import { readable } from 'svelte/store';
import { api } from '$lib/api/client';

/**
 * The admin media library, fetched once and shared.
 *
 * Several admin screens need the same list purely to populate an image picker.
 * Loading it per screen meant every one of them grew its own fetch, its own
 * state and its own failure handling — so most simply did not bother and offered
 * a bare URL field instead. This loads lazily on first subscription and caches
 * for the rest of the session, so a screen only has to subscribe.
 *
 * Browser-only by design: the cache below is module scope, which on the server
 * would be shared between concurrent requests. The admin fetches in the browser
 * anyway, so guarding on `browser` keeps it correct rather than merely lucky.
 */
export type MediaItem = {
  id: string;
  file_name: string;
  file_url: string;
  thumbnail_url?: string | null;
};

let cache: MediaItem[] | null = null;
let inflight: Promise<MediaItem[]> | null = null;

const fetchLibrary = async (): Promise<MediaItem[]> => {
  try {
    const res = await api.media.list({ file_type: 'image', limit: 500 });
    const items = (res.data.items as MediaItem[]).filter((m) => m?.file_url);
    cache = items;
    return items;
  } catch {
    // A failure costs the picker its library, not the screen — the operator can
    // still paste a URL. Left uncached so the next screen retries.
    return [];
  } finally {
    inflight = null;
  }
};

export const mediaLibrary = readable<MediaItem[]>([], (set) => {
  if (!browser) return;
  if (cache) {
    set(cache);
    return;
  }
  inflight = inflight ?? fetchLibrary();
  void inflight.then(set);
});

/** Call after an upload elsewhere so the next picker sees the new file. */
export const refreshMediaLibrary = () => {
  cache = null;
  inflight = null;
};
