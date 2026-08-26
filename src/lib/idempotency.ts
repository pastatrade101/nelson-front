import { browser } from '$app/environment';

/**
 * A stable key for one enquiry attempt.
 *
 * The key is generated once when a form mounts and sent with every submit, so a
 * double-tap, a retry after a flaky connection, or two requests racing in
 * parallel all resolve to the SAME booking rather than creating duplicates —
 * enforced by the unique index on `booking_requests.idempotency_key`, which a
 * read-then-write check cannot guarantee on its own.
 *
 * Generate a fresh key after a successful submit, so a visitor who deliberately
 * sends a second enquiry gets a genuinely new record.
 */
export const newIdempotencyKey = (): string => {
  if (browser && typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `emnel-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
};
