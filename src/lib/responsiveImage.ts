import { browser } from '$app/environment';
import { writable, get } from 'svelte/store';
import { cdnUrl, isManagedMediaUrl } from './img';

// Responsive image support that consumes the backend AVIF/WebP pipeline.
//
// Derivatives live at deterministic paths derived from the original URL:
//   <…>/public/<bucket>/<folder>/<uuid>.<ext>
//   <…>/public/<bucket>/<folder>/responsive/<uuid>/<width>.{avif,webp}
// so we can build a srcset straight from the original URL. We still need to know
// which widths exist (only widths <= the source are generated) — that comes from
// a tiny batched, cached metadata resolver so a srcset never points at a 404.

export const RESPONSIVE_WIDTHS = [320, 480, 640, 768, 960, 1280, 1600, 1920];

export type ImageVariantMeta = {
  width?: number | null;
  height?: number | null;
  aspectRatio?: number | null;
  blurhash?: string | null;
  dominantColor?: string | null;
  widths: number[];
  hasAvif: boolean;
};

// Turn an original upload URL into the base path of its responsive variants.
// The URL is CDN-rewritten first, so variant srcsets are served from R2 when
// enabled (and from Supabase otherwise). Returns null for anything that isn't a
// managed upload (e.g. Unsplash) — those fall back to the existing imgUrl()
// handling. The variant objects share the original's key, so /responsive/<stem>/
// resolves on whichever host serves the original.
export const variantBase = (url: string | null | undefined): string | null => {
  const rewritten = cdnUrl(url);
  if (!rewritten || !isManagedMediaUrl(rewritten)) return null;
  const m = rewritten.match(/^(.*\/)([^/?#]+)\.(jpe?g|png|webp)(?:[?#].*)?$/i);
  if (!m) return null;
  return `${m[1]}responsive/${m[2]}/`;
};

export const srcsetFor = (base: string, widths: number[], ext: 'avif' | 'webp'): string =>
  widths.map((w) => `${base}${w}.${ext} ${w}w`).join(', ');

// ── batched, cached metadata resolver ───────────────────────────────────────
// null = "asked, nothing on file" (don't ask again); undefined = not yet asked.
export const imageMeta = writable<Record<string, ImageVariantMeta | null>>({});

let pending = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

const flush = async () => {
  flushTimer = null;
  const urls = [...pending];
  pending = new Set();
  if (!urls.length) return;
  try {
    const res = await fetch(`/api/public/image-variants?urls=${encodeURIComponent(urls.join(','))}`);
    const body = res.ok ? await res.json() : null;
    const data = (body?.data ?? {}) as Record<string, ImageVariantMeta>;
    imageMeta.update((m) => {
      const next = { ...m };
      for (const url of urls) next[url] = data[url] ?? null; // remember misses too
      return next;
    });
  } catch {
    imageMeta.update((m) => {
      const next = { ...m };
      for (const url of urls) if (next[url] === undefined) next[url] = null;
      return next;
    });
  }
};

// Ask for a URL's variant metadata (deduped + batched). No-op on the server, for
// non-upload URLs, or once already known/requested.
export const requestImageMeta = (url: string | null | undefined) => {
  if (!browser || !url || !variantBase(url)) return;
  const known = get(imageMeta)[url];
  if (known !== undefined || pending.has(url)) return;
  pending.add(url);
  if (!flushTimer) flushTimer = setTimeout(flush, 16);
};
