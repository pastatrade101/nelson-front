import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { env as publicEnv } from '$env/dynamic/public';

/**
 * The traveller's quotation, fetched by its link token.
 *
 * Server-side so the offer is in the HTML the moment the page opens — this is
 * a link someone taps in WhatsApp, often on a slow connection, and it should
 * not depend on a second round trip to show a price.
 *
 * The token is the only credential. It is never echoed back into the page, and
 * the endpoint returns just the offer — no internal ids, no admin notes.
 *
 * Accepting and declining are form actions rather than browser fetches, so the
 * token stays server-side, there is no CORS to negotiate, and the page still
 * works if the JavaScript never arrives.
 */
const apiBase = (origin: string) => {
  const raw = publicEnv.PUBLIC_API_URL?.trim().replace(/\/+$/, '');
  if (!raw) return 'http://localhost:5000/api';
  return raw.startsWith('/') ? `${origin}${raw}` : raw;
};

export const load: PageServerLoad = async ({ fetch, params, url }) => {
  const base = apiBase(url.origin);

  let quotation: Record<string, unknown> | null = null;
  try {
    const res = await fetch(`${base}/quotations/public/${encodeURIComponent(params.token)}`);
    if (res.ok) quotation = ((await res.json()) as { data?: Record<string, unknown> }).data ?? null;
  } catch {
    quotation = null;
  }

  // A wrong or expired token is a 404, never an explanation of what went
  // wrong — nothing here should help someone probe for valid links.
  if (!quotation) throw error(404, 'This quotation link is not valid.');

  return { quotation };
};

/** POST the traveller's answer to the API, and surface its own words back. */
const respond = async (
  fetchFn: typeof fetch,
  origin: string,
  token: string,
  action: 'accept' | 'decline',
  body: Record<string, string | null>
) => {
  try {
    const res = await fetchFn(`${apiBase(origin)}/quotations/public/${encodeURIComponent(token)}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const payload = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string };
    if (!res.ok || payload.success === false) {
      return fail(res.status === 429 ? 429 : 400, {
        message: payload.message || 'We could not record that. Please try again or message us.'
      });
    }
    return { done: true as const };
  } catch {
    return fail(503, { message: 'We could not reach our system just now. Please try again in a moment.' });
  }
};

const field = (form: FormData, name: string) => {
  const value = form.get(name);
  return typeof value === 'string' && value.trim() ? value.trim() : null;
};

export const actions: Actions = {
  accept: async ({ fetch, params, request, url }) => {
    const form = await request.formData();
    return respond(fetch, url.origin, params.token, 'accept', {
      lead_traveller: field(form, 'lead_traveller'),
      email: field(form, 'email'),
      phone: field(form, 'phone'),
      notes: field(form, 'notes')
    });
  },

  decline: async ({ fetch, params, request, url }) => {
    const form = await request.formData();
    return respond(fetch, url.origin, params.token, 'decline', { reason: field(form, 'reason') });
  }
};
