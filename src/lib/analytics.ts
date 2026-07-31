import { browser } from '$app/environment';
import { API_URL } from '$lib/config/env';
import { getConsent } from '$lib/consent';

// ----------------------------------------------------------------------------
// trackEvent — one helper for both analytics layers.
//   1) GA4 (Phase 2): fires window.gtag if present (safe, non-personal only).
//   2) First-party backend: POST /api/analytics/events (fire-and-forget).
// NEVER sends name/email/phone/WhatsApp/trip notes anywhere. Fails silently so
// blocked analytics (ad-blockers, no backend) can't break the site.
// ----------------------------------------------------------------------------

export type AnalyticsEventName =
  | 'page_view'
  | 'tour_page_view'
  | 'destination_page_view'
  | 'tour_card_click'
  | 'tour_filter_used'
  | 'plan_my_trip_opened'
  | 'plan_my_trip_submitted'
  | 'begin_journey_opened'
  | 'begin_journey_submitted'
  | 'request_trip_opened'
  | 'request_trip_submitted'
  | 'ai_advisor_opened'
  | 'ai_advisor_message_sent'
  | 'ai_advisor_lead_created'
  | 'whatsapp_click'
  | 'phone_click'
  | 'email_click';

// Only these safe, non-personal fields are ever forwarded.
const SAFE_KEYS = ['tour_id', 'tour_title', 'destination', 'experience_type', 'budget_range', 'traveller_type'] as const;

export type EventMeta = Partial<Record<(typeof SAFE_KEYS)[number], string | null | undefined>> & {
  metadata?: Record<string, unknown>;
};

const SESSION_KEY = 'gf_sid';

const getSessionId = (): string => {
  if (!browser) return '';
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return '';
  }
};

const deviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  if (!browser) return 'desktop';
  const ua = navigator.userAgent;
  const w = window.innerWidth;
  if (/Mobi|Android|iPhone/i.test(ua) || w < 640) return 'mobile';
  if (/iPad|Tablet/i.test(ua) || (w >= 640 && w < 1024)) return 'tablet';
  return 'desktop';
};

export const trackEvent = (eventName: AnalyticsEventName, meta: EventMeta = {}): void => {
  if (!browser) return;
  // Respect an explicit decline. (Undecided still allows PII-free first-party
  // tracking; GA4 only fires once gtag is loaded, which waits for 'granted'.)
  if (getConsent() === 'denied') return;
  try {
    const payload: Record<string, unknown> = {
      event_name: eventName,
      session_id: getSessionId(),
      page_path: window.location.pathname,
      source_page_url: window.location.href,
      device_type: deviceType()
    };
    for (const key of SAFE_KEYS) if (meta[key]) payload[key] = meta[key];
    if (meta.metadata) payload.metadata = meta.metadata;

    // 1) GA4 — only if loaded + consented (gtag present). Safe fields only.
    const w = window as unknown as { gtag?: (...args: unknown[]) => void };
    if (typeof w.gtag === 'function') {
      const { metadata: _m, session_id: _s, ...safe } = payload;
      w.gtag('event', eventName, safe);
    }

    // 2) First-party backend — fire-and-forget, keepalive for unload safety.
    void fetch(`${API_URL}/analytics/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(() => {});
  } catch {
    // analytics must never throw
  }
};
