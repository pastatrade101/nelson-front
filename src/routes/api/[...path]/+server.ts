import type { RequestHandler } from './$types';
import { env as privateEnv } from '$env/dynamic/private';

// Internal backend origin (server-side only — never exposed to the browser).
// The browser calls the frontend same-origin at /api/*, and this handler forwards
// to the backend. So no external reverse-proxy rule for /api is required.
//   • Docker Compose: the backend is reachable by its service name -> http://backend:5000
//   • Single host (bare node / pm2): http://127.0.0.1:5000
// Override with BACKEND_ORIGIN when neither applies.
const backendOrigin = (privateEnv.BACKEND_ORIGIN || 'http://127.0.0.1:5000').replace(/\/+$/, '');

// Headers that must not be copied verbatim between hops.
//
// `origin` and `referer` belong to the browser -> frontend hop and are dropped
// deliberately. Forwarding them makes the backend apply *browser* CORS rules to
// what is really a server-to-server call: any host not in the API's allowlist —
// a staging hostname, www vs apex, the bare server IP — is rejected by the CORS
// callback, which surfaces as a bare 500 rather than the endpoint's real answer.
// A reverse proxy speaks for itself, so it sends no origin, exactly like curl.
// Nothing is weakened by this: the browser is same-origin with the frontend, so
// CORS never guarded this path, and admin routes are still bearer-token only.
const hopByHop = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'content-encoding',
  'content-length',
  'host',
  'origin',
  'referer'
]);

const proxy: RequestHandler = async ({ request, params, url }) => {
  const path = params.path ?? '';
  const target = `${backendOrigin}/api/${path}${url.search}`;

  const headers = new Headers();
  for (const [key, value] of request.headers) {
    if (!hopByHop.has(key.toLowerCase())) headers.set(key, value);
  }

  const init: RequestInit = { method: request.method, headers, redirect: 'manual' };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.arrayBuffer();
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, init);
  } catch {
    return new Response(JSON.stringify({ success: false, message: 'Backend is unreachable.' }), {
      status: 502,
      headers: { 'content-type': 'application/json' }
    });
  }

  const body = await upstream.arrayBuffer();
  const resHeaders = new Headers();
  for (const [key, value] of upstream.headers) {
    if (!hopByHop.has(key.toLowerCase())) resHeaders.set(key, value);
  }

  return new Response(body, { status: upstream.status, statusText: upstream.statusText, headers: resHeaders });
};

export const fallback = proxy;
