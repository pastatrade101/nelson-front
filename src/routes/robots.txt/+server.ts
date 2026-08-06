import { SITE_URL } from '$lib/config/env';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url }) => {
  const origin = SITE_URL || url.origin;
  return new Response(
    `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
Disallow: /trip/
Disallow: /shortlist
Disallow: /enquiry
Disallow: /booking/

Sitemap: ${origin}/sitemap.xml
`,
    {
      headers: {
        'Content-Type': 'text/plain'
      }
    }
  );
};
