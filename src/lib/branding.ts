import { writable } from 'svelte/store';
import { brand } from '$lib/brand';

export type BrandColors = {
  clay: string;
  deep_green: string;
  forest: string;
  goldfinch_gold: string;
  ink: string;
  sand: string;
  savanna: string;
};

export type Branding = {
  colors: BrandColors;
  company_name: string;
  favicon_url: string;
  logo_url: string;
  positioning: string;
  site_name: string;
  tagline: string;
};

export const defaultColors: BrandColors = {
  clay: '#4A3728',
  deep_green: '#1C1A16',
  forest: '#4A3728',
  goldfinch_gold: '#C5A265',
  ink: '#1C1A16',
  sand: '#FAFAF7',
  savanna: '#E8E0D2'
};

export const defaultBranding: Branding = {
  colors: { ...defaultColors },
  company_name: brand.companyName,
  favicon_url: '',
  logo_url: '',
  positioning: brand.positioning,
  site_name: brand.name,
  tagline: brand.tagline
};

export const branding = writable<Branding>(defaultBranding);

// Maps each color key to its CSS custom property (defined in app.css :root).
const cssVarMap: Record<keyof BrandColors, string> = {
  clay: '--c-clay',
  deep_green: '--c-deep-green',
  forest: '--c-forest',
  goldfinch_gold: '--c-goldfinch-gold',
  ink: '--c-ink',
  sand: '--c-sand',
  savanna: '--c-savanna'
};

/** Convert "#4A3728" → "74 55 40" (the space-separated RGB Tailwind needs). */
export const hexToRgbTriple = (hex: string): string | null => {
  const match = /^#?([0-9a-fA-F]{6})$/.exec((hex ?? '').trim());
  if (!match) return null;
  const int = parseInt(match[1], 16);
  return `${(int >> 16) & 255} ${(int >> 8) & 255} ${int & 255}`;
};

/** Merge partial branding (e.g. from the API) with the Emnel defaults — pure, SSR-safe. */
export const mergeBranding = (data: Partial<Branding> | null | undefined): Branding => {
  const incoming = data ?? {};
  return {
    ...defaultBranding,
    ...incoming,
    colors: { ...defaultColors, ...(incoming.colors ?? {}) }
  };
};

/**
 * Build a `:root{ … }` CSS string of the brand color vars — used to inline the
 * palette during SSR so first paint is already branded (no post-hydration flash).
 * Returns '' when nothing valid is present.
 */
export const brandColorsToCss = (colors: Partial<BrandColors> | null | undefined): string => {
  const source = colors ?? {};
  const declarations: string[] = [];
  for (const key of Object.keys(cssVarMap) as (keyof BrandColors)[]) {
    const triple = hexToRgbTriple(source[key] ?? '');
    if (triple) declarations.push(`${cssVarMap[key]}: ${triple};`);
  }
  return declarations.length ? `:root{${declarations.join('')}}` : '';
};

/**
 * Full `<style>…</style>` string for the brand palette. Built here (a .ts module,
 * not a .svelte file) so the literal style tag never appears in component markup —
 * where Svelte's CSS preprocessor would try to compile it. Inject via {@html} in
 * <svelte:head>. Returns '' when there is nothing to inline.
 */
export const brandColorStyleTag = (colors: Partial<BrandColors> | null | undefined): string => {
  const css = brandColorsToCss(colors);
  return css ? `<style>${css}</style>` : '';
};

const BRAND_STYLE_ID = 'brand-color-vars';

/**
 * Applies brand colors as a `:root { … }` rule in a <style> tag (not inline on
 * <html>). This matters for dark mode: an inline style would beat the
 * `html.dark` overrides, but a `:root` rule has lower specificity than
 * `html.dark`, so the dark palette still wins when active — while these brand
 * values still override the light defaults in app.css.
 */
export const applyBrandColors = (colors: Partial<BrandColors>) => {
  if (typeof document === 'undefined') return;
  const declarations: string[] = [];
  for (const key of Object.keys(cssVarMap) as (keyof BrandColors)[]) {
    const value = colors[key];
    if (!value) continue;
    const triple = hexToRgbTriple(value);
    if (triple) declarations.push(`${cssVarMap[key]}: ${triple};`);
  }
  if (declarations.length === 0) return;

  let style = document.getElementById(BRAND_STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = BRAND_STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = `:root{${declarations.join('')}}`;
};

const setFavicon = (url: string) => {
  if (typeof document === 'undefined' || !url) return;
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = url;
};

/** Merge incoming branding with defaults, update the store, and apply colors + favicon live. */
export const applyBranding = (data: Partial<Branding> | null | undefined) => {
  const merged = mergeBranding(data);
  branding.set(merged);
  applyBrandColors(merged.colors);
  if (merged.favicon_url) setFavicon(merged.favicon_url);
  return merged;
};
