import type { LayoutLoad } from './$types';
import { API_URL } from '$lib/config/env';
import { defaultBranding, mergeBranding } from '$lib/branding';

// Fetch branding on the server so the very first paint — and crawlers — get the
// correct site name, favicon and colors. Without this, branding only applied
// after hydration (a visible flash + wrong favicon/title for bots). Falls back
// to Emnel defaults if the API is unreachable, so a page never fails to render.
export const load: LayoutLoad = async ({ fetch }) => {
  try {
    const res = await fetch(`${API_URL}/branding`);
    if (!res.ok) return { branding: defaultBranding };
    const json = (await res.json()) as { data?: unknown };
    return { branding: mergeBranding(json?.data as Parameters<typeof mergeBranding>[0]) };
  } catch {
    return { branding: defaultBranding };
  }
};
