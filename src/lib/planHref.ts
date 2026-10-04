/** Every planning entry uses the canonical stepper, with its context intact. */
export function planTripHref(context: Record<string, string | number | null | undefined> = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(context)) if (value != null && String(value)) params.set(key, String(value));
  return `/plan-my-trip${params.size ? `?${params.toString()}` : ''}`;
}
