import type { PageLoad } from './$types';
import type { BlogPost } from '$lib/types';
import { cachedJson } from '$lib/cache';

// SSR-load the journal posts so the index grid is in the initial HTML.
export const load: PageLoad = async ({ fetch }) => {
  try {
    const body = await cachedJson<{ data?: { items?: BlogPost[] } }>('/api/blog', fetch);
    return { posts: body?.data?.items ?? [], loadFailed: false };
  } catch {
    // fall through to the error state
  }
  return { posts: [] as BlogPost[], loadFailed: true };
};
