import type { PageLoad } from './$types';
import type { BlogPost } from '$lib/types';

// SSR-load the journal posts so the index grid is in the initial HTML.
export const load: PageLoad = async ({ fetch }) => {
  try {
    const res = await fetch('/api/blog');
    if (res.ok) {
      const body = await res.json();
      return { posts: (body?.data?.items ?? []) as BlogPost[], loadFailed: false };
    }
  } catch {
    // fall through to the error state
  }
  return { posts: [] as BlogPost[], loadFailed: true };
};
