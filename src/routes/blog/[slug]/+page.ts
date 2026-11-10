import { error, isHttpError } from '@sveltejs/kit';
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
    if (response.status === 404) error(404, 'This article could not be found.');
    if (!response.ok) return { post: null as BlogPost | null, notFound: false };

    const body = (await response.json()) as { data?: BlogPost };
    const post = body.data?.status === 'published' ? body.data : null;
    if (!post) error(404, 'This article could not be found.');
    return { post, notFound: false };
  } catch (e) {
    if (isHttpError(e)) throw e;
    // The client retains its retry behaviour for a temporary upstream failure.
    return { post: null as BlogPost | null, notFound: false };
  }
};
