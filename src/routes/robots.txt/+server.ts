import { SITE_URL } from '$lib/config/env';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url }) => {
  const origin = SITE_URL || url.origin;
  return new Response(
    `User-agent: *
Allow: /

Sitemap: ${origin}/sitemap.xml
`,
    {
      headers: {
        'Content-Type': 'text/plain'
      }
    }
  );
};
