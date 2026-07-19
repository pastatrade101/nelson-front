import { writable } from 'svelte/store';
import { api } from '$lib/api/client';

/**
 * Safe fallbacks so the public site always renders even if settings fail to load.
 * Only non-sensitive, public-facing defaults belong here.
 */
export const PUBLIC_SETTING_FALLBACKS: Record<string, unknown> = {
  site_name: 'Emnel Adventures',
  company_name: 'Emnel Adventures Limited',
  tagline: 'Private Tanzania safaris, designed in Arusha',
  brand_statement: 'Where the wild speaks, we know how to listen.',
  default_meta_title: 'Emnel Adventures | Private Tanzania Safaris',
  default_meta_description:
    'Plan private Tanzania safaris, Kilimanjaro climbs and Zanzibar extensions with trusted local experts in Arusha.',
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

/**
 * Whether the built-in public AI advisor (floating widget + "Ask our AI advisor"
 * entry points) should be shown. Hard-disabled: the site uses the external
 * Makutano AI widget instead, so the built-in advisor stays hidden site-wide
 * regardless of admin settings (and survives data resets). To restore it, return
 * the settings-based check:
 *   settingBool(settings, 'ai_enabled', true) && settingBool(settings, 'ai_widget_enabled', true)
 */
export const aiAdvisorEnabled = (_settings: Record<string, unknown>): boolean => false;
