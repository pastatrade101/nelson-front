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

// ---------------------------------------------------------------------------
// Public rich-text RENDER helpers (used by RichText.svelte). A self-contained,
// dependency-free sanitizer that re-serialises from an allowlist rather than
// stripping bad parts out — anything the tokeniser doesn't recognise becomes
// inert escaped text. This is a second, independent gate over what reaches the
// DOM (long-form CMS body copy: tour overview, day notes, FAQ answers).
// ---------------------------------------------------------------------------

const ALLOWED_TAGS = new Set(['p', 'br', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li', 'h2', 'h3', 'h4', 'blockquote']);
const VOID_TAGS = new Set(['br']);
const BLOCK_TAGS = new Set(['p', 'h2', 'h3', 'h4', 'ul', 'ol', 'blockquote']);
const DROP_WITH_CONTENT = new Set(['script', 'style', 'iframe', 'object', 'embed', 'noscript', 'template', 'svg', 'math', 'textarea', 'title']);
const ALLOWED_ATTRS: Record<string, Set<string>> = { a: new Set(['href', 'title', 'target']) };
const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', colon: ':', tab: '\t', newline: '\n', sol: '/' };

const decodeEntities = (value: string): string =>
  value.replace(/&(#x?[0-9a-f]+|[a-z]+);?/gi, (match, body: string) => {
    if (body.charAt(0) === '#') {
      const code = body.charAt(1).toLowerCase() === 'x' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    const named = ENTITIES[body.toLowerCase()];
    return named === undefined ? match : named;
  });

const escapeText = (value: string): string =>
  value.replace(/&(?!#?[a-z0-9]+;)/gi, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escapeAttr = (value: string): string => escapeText(value).replace(/"/g, '&quot;');
const escapeHref = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const fullyDecode = (raw: string): string | null => {
  let current = raw;
  for (let pass = 0; pass < 6; pass += 1) {
    const next = decodeEntities(current);
    if (next === current) return current;
    current = next;
  }
  return null;
};

const safeHref = (raw: string): string | null => {
  const unwrapped = fullyDecode(raw);
  if (unwrapped === null) return null;
  const decoded = unwrapped.replace(/[\u0000-\u0020\u007f-\u00a0\u2028\u2029\ufeff]/g, '').trim();
  if (!decoded) return null;
  if (/^(?:https?|mailto|tel):/i.test(decoded)) return decoded;
  if (/^[/#?]/.test(decoded)) return decoded;
  if (/^[a-z][a-z0-9+.-]*:/i.test(decoded)) return null;
  return decoded;
};

type Attr = { name: string; value: string };
const parseAttrs = (source: string): Attr[] => {
  const attrs: Attr[] = [];
  const pattern = /([a-z_:][-a-z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`=<>]+)))?/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    attrs.push({ name: match[1].toLowerCase(), value: match[2] ?? match[3] ?? match[4] ?? '' });
  }
  return attrs;
};

const renderOpenTag = (name: string, attrSource: string): string => {
  const allowed = ALLOWED_ATTRS[name];
  if (!allowed) return `<${name}>`;
  const parts: string[] = [];
  let external = false;
  for (const attr of parseAttrs(attrSource)) {
    if (!allowed.has(attr.name)) continue;
    if (attr.name === 'href') {
      const href = safeHref(attr.value);
      if (!href) return '';
      external = /^(?:https?:)?\/\//i.test(href);
      parts.push(`href="${escapeHref(href)}"`);
      continue;
    }
    if (attr.name === 'target') {
      if (attr.value.trim().toLowerCase() === '_blank') parts.push('target="_blank"');
      continue;
    }
    parts.push(`${attr.name}="${escapeAttr(attr.value)}"`);
  }
  if (!parts.some((part) => part.startsWith('href='))) return '';
  if (external || parts.includes('target="_blank"')) parts.push('rel="noopener noreferrer"');
  return `<${name} ${parts.join(' ')}>`;
};

/** Sanitise rich-text HTML down to the allowlist. Plain text passes through escaped. */
export const sanitizeRichText = (input: unknown): string => {
  const html = String(input ?? '');
  if (!html) return '';
  const out: string[] = [];
  const stack: string[] = [];
  let index = 0;

  const closeTo = (name: string) => {
    const at = stack.lastIndexOf(name);
    if (at === -1) return;
    for (let depth = stack.length - 1; depth >= at; depth -= 1) out.push(`</${stack[depth]}>`);
    stack.length = at;
  };

  const closeImplied = (name: string) => {
    if (name === 'li') {
      const at = stack.lastIndexOf('li');
      if (at !== -1 && !stack.slice(at + 1).some((tag) => tag === 'ul' || tag === 'ol')) closeTo('li');
      return;
    }
    if (!BLOCK_TAGS.has(name)) return;
    for (let depth = stack.length - 1; depth >= 0; depth -= 1) {
      const open = stack[depth];
      if (open === 'li' || open === 'ul' || open === 'ol' || open === 'blockquote') return;
      if (open === 'p' || open === 'h2' || open === 'h3' || open === 'h4') {
        closeTo(open);
        return;
      }
    }
  };

  while (index < html.length) {
    const lt = html.indexOf('<', index);
    if (lt === -1) {
      out.push(escapeText(html.slice(index)));
      break;
    }
    if (lt > index) out.push(escapeText(html.slice(index, lt)));
    if (html.startsWith('<!--', lt)) {
      const end = html.indexOf('-->', lt + 4);
      index = end === -1 ? html.length : end + 3;
      continue;
    }
    if (html.charAt(lt + 1) === '!' || html.charAt(lt + 1) === '?') {
      const end = html.indexOf('>', lt);
      index = end === -1 ? html.length : end + 1;
      continue;
    }
    const nameMatch = /^<\/?([a-z][a-z0-9]*)/i.exec(html.slice(lt, lt + 24));
    if (!nameMatch) {
      out.push('&lt;');
      index = lt + 1;
      continue;
    }
    let cursor = lt + 1;
    let quote = '';
    while (cursor < html.length) {
      const char = html.charAt(cursor);
      if (quote) {
        if (char === quote) quote = '';
      } else if (char === '"' || char === "'") {
        quote = char;
      } else if (char === '>') {
        break;
      }
      cursor += 1;
    }
    if (cursor >= html.length) break;
    const rawTag = html.slice(lt, cursor + 1);
    const name = nameMatch[1].toLowerCase();
    const isClosing = html.charAt(lt + 1) === '/';
    index = cursor + 1;
    if (DROP_WITH_CONTENT.has(name)) {
      if (isClosing) continue;
      const closer = new RegExp(`</\\s*${name}[^>]*>`, 'i');
      const rest = html.slice(index);
      const found = closer.exec(rest);
      index = found ? index + found.index + found[0].length : html.length;
      continue;
    }
    if (!ALLOWED_TAGS.has(name)) continue;
    if (isClosing) {
      if (!VOID_TAGS.has(name)) closeTo(name);
      continue;
    }
    if (VOID_TAGS.has(name)) {
      out.push(`<${name}>`);
      continue;
    }
    closeImplied(name);
    if (name === 'a' && stack.includes('a')) continue;
    const attrSource = rawTag.slice(nameMatch[0].length, -1).replace(/\/$/, '');
    const open = renderOpenTag(name, attrSource);
    if (!open) continue;
    out.push(open);
    stack.push(name);
  }
  while (stack.length) out.push(`</${stack.pop()}>`);
  return out
    .join('')
    .replace(/<p>(?:\s|&nbsp;|<br>)*<\/p>/g, '')
    .trim();
};

/** Does this value carry markup we would render, rather than being plain text? */
export const looksLikeHtml = (value: unknown): boolean =>
  /<(?:p|br|strong|em|u|s|a|ul|ol|li|h[234]|blockquote)\b[^>]*>/i.test(String(value ?? ''));

/** Flatten rich text to plain text, preserving block boundaries as newlines. */
export const toPlainText = (value: unknown): string => {
  const raw = String(value ?? '');
  if (!raw) return '';
  if (!looksLikeHtml(raw)) return raw;
  return decodeEntities(
    raw
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(?:p|h[1-6]|li|blockquote|ul|ol)>/gi, '\n\n')
      .replace(/<[^>]*>/g, '')
  )
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

/** Single-line plain text for meta tags / teasers. Truncates on a word boundary. */
export const toMetaText = (value: unknown, max = 300): string => {
  const text = toPlainText(value).replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.–—-]+$/, '')}…`;
};

/** Is there anything a reader would actually see (vs an empty `<p></p>`)? */
export const hasRichContent = (value: unknown): boolean => toPlainText(value).trim().length > 0;
