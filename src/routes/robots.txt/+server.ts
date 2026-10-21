import { SITE_URL } from '$lib/config/env';
import { safeSiteOrigin } from '$lib/seo-policy';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, fetch }) => {
  let canonicalBase = '';
  let indexingEnabled = true;
  try {
    const response = await fetch('/api/public/settings');
    if (response.ok) {
      const body = (await response.json()) as { data?: Record<string, unknown> };
      canonicalBase = typeof body.data?.canonical_base_url === 'string' ? body.data.canonical_base_url : '';
      indexingEnabled = typeof body.data?.robots_indexing_enabled === 'boolean' ? body.data.robots_indexing_enabled : true;
    }
  } catch {
    // Fall through to the configured public origin and the safe default of indexing.
  }
  const origin = safeSiteOrigin(canonicalBase || SITE_URL, url.origin);
  const body = indexingEnabled
    ? `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
Disallow: /trip/
Disallow: /shortlist
Disallow: /enquiry
Disallow: /booking/
Disallow: /quote/
Disallow: /guest-details/

Sitemap: ${origin}/sitemap.xml

# AI assistants are welcome to read the public site: an answer about a Tanzania
# safari that cites our pages is worth more than hiding them. Same rules as above.
User-agent: GPTBot
User-agent: OAI-SearchBot
User-agent: ChatGPT-User
User-agent: ClaudeBot
User-agent: Claude-SearchBot
User-agent: anthropic-ai
User-agent: PerplexityBot
User-agent: Google-Extended
User-agent: Applebot-Extended
User-agent: Amazonbot
User-agent: Bytespider
User-agent: CCBot
Allow: /
Disallow: /admin
Disallow: /api/
Disallow: /trip/
Disallow: /shortlist
Disallow: /enquiry
Disallow: /booking/
Disallow: /quote/
Disallow: /guest-details/
`
    : `User-agent: *
Disallow: /
`;
  return new Response(
    body,
    {
      headers: {
        'Content-Type': 'text/plain'
      }
    }
  );
};
