import { env as publicEnv } from '$env/dynamic/public';

// ----------------------------------------------------------------------------
// imgUrl — return a right-sized image URL for the requested render width.
//   • Unsplash (images.unsplash.com): append CDN sizing (free, always safe).
//     Most seed/CMS images are raw Unsplash URLs with NO params, so they serve
//     the full multi-MB original — this is the single biggest perf win.
//   • Supabase storage public URLs: use the render/image transform, but ONLY
//     when PUBLIC_SUPABASE_IMG_TRANSFORM=true (image transforms are a paid
//     Supabase feature — default off so we never break uploaded images).
//   • Anything else: returned unchanged.
// ----------------------------------------------------------------------------

const UNSPLASH = 'images.unsplash.com';
const SUPABASE_PUBLIC = '/storage/v1/object/public/';

// Optional Cloudflare R2 CDN base (no trailing slash). When set, any Supabase
// public object URL is rewritten to serve from R2 instead — R2 has zero egress
// fees, so this removes the Supabase bandwidth ceiling. Empty = feature off
// (everything keeps serving from Supabase), which is also the instant rollback.
const MEDIA_CDN = (publicEnv.PUBLIC_MEDIA_CDN_URL || '').replace(/\/+$/, '');

// Rewrite a Supabase public object URL to the R2 CDN, stripping
// ".../storage/v1/object/public/<bucket>/" down to the object key. No-op for
// non-Supabase URLs (Unsplash, data URIs), already-CDN URLs, or when unset.
// IMPORTANT: only apply this to URLs that go straight into <img>/<source> — never
// to values used as a media_library lookup key (ResponsiveImage `src`, the value
// sent to /api/public/image-variants), which must stay byte-identical to file_url.
export const cdnUrl = (url: string | null | undefined): string => {
  if (!url || !MEDIA_CDN) return url ?? '';
  return url.replace(/^https?:\/\/[^/]+\/storage\/v1\/object\/public\/[^/]+\//, `${MEDIA_CDN}/`);
};

// True when the URL is one of our managed media objects — a Supabase public
// object URL or (after rewrite) one under the R2 CDN base. Used to decide whether
// a responsive variant ladder can be derived from it.
export const isManagedMediaUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  if (url.includes(SUPABASE_PUBLIC)) return true;
  return Boolean(MEDIA_CDN && url.startsWith(MEDIA_CDN));
};

export const imgUrl = (raw: string | null | undefined, width = 800, quality = 70): string => {
  const url = cdnUrl(raw);
  if (!url) return '';
  try {
    if (url.includes(UNSPLASH)) {
      const base = url.split('?')[0];
      return `${base}?auto=format&fit=crop&w=${width}&q=${quality}`;
    }
    if (url.includes(SUPABASE_PUBLIC) && publicEnv.PUBLIC_SUPABASE_IMG_TRANSFORM === 'true') {
      const transformed = url.replace(SUPABASE_PUBLIC, '/storage/v1/render/image/public/');
      const sep = transformed.includes('?') ? '&' : '?';
      return `${transformed}${sep}width=${width}&quality=${quality}`;
    }
    return url;
  } catch {
    return url;
  }
};

// The ORIGINAL (full-size) image URL for a record — the first non-empty field in
// the chain, ignoring thumbnails. Pass this to <ResponsiveImage src> so the
// responsive AVIF/WebP variants (derived from the original) can be used.
export const origUrl = (record: Record<string, any> | null | undefined, ...fields: string[]): string => {
  if (!record) return '';
  for (const field of fields) {
    const value = record[field];
    if (typeof value === 'string' && value) return value;
  }
  return '';
};

// Pick the best source URL for a record's image: prefer the server-attached
// `<field>_thumbnail` (a small webp from media_library) over the full-size
// original, walking a fallback chain of fields. The result is CDN-rewritten
// because it renders straight into an <img> (it is never used as a lookup key).
export const thumbUrl = (record: Record<string, any> | null | undefined, ...fields: string[]): string => {
  if (!record) return '';
  for (const field of fields) {
    const value = record[field];
    if (typeof value === 'string' && value) {
      const thumbnail = record[`${field}_thumbnail`];
      return cdnUrl(typeof thumbnail === 'string' && thumbnail ? thumbnail : value);
    }
  }
  return '';
};
