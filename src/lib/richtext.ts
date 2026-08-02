// Shared helpers for admin-authored rich text (the TipTap HTML produced by
// RichTextEditor). Content managers write it in the admin; the same HTML is
// rendered on the public site — so links added for SEO carry straight through.

// Detect block-level markup: new content is rich HTML, legacy content is plain
// text. Lets each be rendered the correct way (and stay backward-compatible).
export const isHtml = (content?: string | null): boolean =>
  !!content && /<(p|h[1-6]|ul|ol|li|blockquote|pre|table|img|figure|hr|strong|em|a|br|div)\b/i.test(content);

// Normalise editor output for storage: empty rich text (e.g. TipTap's bare
// "<p></p>") collapses to null so an emptied body falls back to its design
// default instead of rendering an empty block.
export const richTextToStore = (html?: string | null): string | null => {
  const raw = (html ?? '').trim();
  if (!raw) return null;
  const text = raw.replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, ' ').trim();
  const hasMedia = /<(img|hr|table|iframe)\b/i.test(raw);
  return text || hasMedia ? raw : null;
};

// Upgrade a legacy plain-text value to simple paragraph HTML so its paragraph
// breaks survive the first time it is opened in the rich-text editor (TipTap
// would otherwise collapse the newlines into a single paragraph).
export const plainTextToHtml = (content?: string | null): string => {
  const text = (content ?? '').replace(/\\n/g, '\n').trim();
  if (!text || isHtml(text)) return content ?? '';
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
};
