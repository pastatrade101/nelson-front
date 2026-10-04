import type { PageLoad } from './$types';
import type { BlogPost } from '$lib/types';

/**
 * Article content must be in the first HTML response: that gives search and
 * social crawlers the same title, description and article body as a visitor.
 * Drafts and archived posts deliberately resolve as unavailable here.
 */
export const load: PageLoad = async ({ params, fetch }) => {
  try {
    const response = await fetch(`/api/blog/${encodeURIComponent(params.slug)}`);
    if (!response.ok) return { post: null as BlogPost | null, notFound: response.status === 404 };

    const body = (await response.json()) as { data?: BlogPost };
    const post = body.data?.status === 'published' ? body.data : null;
    return { post, notFound: !post };
  } catch {
    // The client retains its retry behaviour for a temporary upstream failure.
    return { post: null as BlogPost | null, notFound: false };
  }
};
