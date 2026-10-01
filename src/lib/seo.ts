// schema.org JSON-LD builders (SRS v2.0 §7.4). Pair with <JsonLd data={...} />.

export const breadcrumbLd = (origin: string, items: { name: string; path: string }[]) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: it.name,
    item: `${origin}${it.path}`
  }))
});

export const faqLd = (faqs: { q: string; a: string }[]) => ({
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a }
  }))
});

/** Plain text for structured data — CMS FAQ answers are rich text. */
export const plainText = (value: string | null | undefined): string =>
  String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();

/** CMS FAQ rows → the { q, a } pairs faqLd takes, dropping any without both. */
export const faqPairs = (faqs: { question?: string | null; answer?: string | null }[] = []) =>
  faqs.map((f) => ({ q: plainText(f.question), a: plainText(f.answer) })).filter((f) => f.q && f.a);
