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

export const imgUrl = (url: string | null | undefined, width = 800, quality = 70): string => {
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
// original, walking a fallback chain of fields. Pass the result to imgUrl().
export const thumbUrl = (record: Record<string, any> | null | undefined, ...fields: string[]): string => {
  if (!record) return '';
  for (const field of fields) {
    const value = record[field];
    if (typeof value === 'string' && value) {
      const thumbnail = record[`${field}_thumbnail`];
      return typeof thumbnail === 'string' && thumbnail ? thumbnail : value;
    }
  }
  return '';
};
