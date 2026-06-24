import { writable } from 'svelte/store';
import { api } from '$lib/api/client';

/**
 * Safe fallbacks so the public site always renders even if settings fail to load.
 * Only non-sensitive, public-facing defaults belong here.
 */
export const PUBLIC_SETTING_FALLBACKS: Record<string, unknown> = {
  site_name: 'Goldfinch Adventures',
  company_name: 'Goldfinch Adventures Limited',
  tagline: "Africa's Most Trusted Travel Planning Brand",
  brand_statement: 'Travelers do not need more options. They need more confidence.',
  default_meta_title: 'Goldfinch Adventures | East Africa Travel Planning',
  default_meta_description:
    'Plan safaris, Kilimanjaro climbs, gorilla trekking and beach holidays across East Africa with trusted local experts.',
  whatsapp_button_text: 'Chat on WhatsApp',
  default_currency: 'USD'
};

/**
 * Fetches public website settings (only is_public values) merged over safe
 * fallbacks. Never throws — returns the fallbacks if the request fails so page
 * rendering is never blocked.
 */
export const getPublicSettings = async (): Promise<Record<string, unknown>> => {
  try {
    const response = await api.settings.public();
    return { ...PUBLIC_SETTING_FALLBACKS, ...(response.data ?? {}) };
  } catch {
    return { ...PUBLIC_SETTING_FALLBACKS };
  }
};

/**
 * Reactive store of public settings for the whole public site (footer social
 * links, contact info, branding text). Starts with fallbacks so components
 * render immediately; `loadPublicSettings()` hydrates it from the API.
 */
export const publicSettings = writable<Record<string, unknown>>({ ...PUBLIC_SETTING_FALLBACKS });

export const loadPublicSettings = async (): Promise<void> => {
  const data = await getPublicSettings();
  publicSettings.set(data);
};

/** Reads a public setting as a trimmed string (empty string if unset). */
export const settingText = (settings: Record<string, unknown>, key: string): string => {
  const value = settings[key];
  return typeof value === 'string' ? value.trim() : '';
};

/** Reads a public setting as a boolean (with a fallback when unset). */
export const settingBool = (settings: Record<string, unknown>, key: string, fallback = false): boolean => {
  const value = settings[key];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase());
  return fallback;
};

/** Whether the public AI advisor (widget + entry points) should be shown. */
export const aiAdvisorEnabled = (settings: Record<string, unknown>): boolean =>
  settingBool(settings, 'ai_enabled', true) && settingBool(settings, 'ai_widget_enabled', true);
