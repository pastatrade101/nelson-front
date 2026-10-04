import type { Section } from './styleContent';

/** Describe only content the page actually renders; no invented offers or ratings. */
export function styleStructuredData(input: {
  name: string; description: string; url: string; origin: string; image?: string; sections: Section[];
}): Record<string, unknown> {
  const { name, description, url, origin, image, sections } = input;
  let imageUrl = '';
  try {
    const parsed = image ? new URL(image, origin) : null;
    if (parsed && ['https:', 'http:'].includes(parsed.protocol)) imageUrl = parsed.href;
  } catch { /* Invalid optional media must not prevent the page from rendering. */ }
  const parts: Record<string, unknown>[] = [];
  const pageId = `${url}#webpage`;
  for (const section of sections) {
    if (section.kind === 'faq') {
      parts.push({
        '@type': 'FAQPage', '@id': `${url}#${section.id}`, name: section.title || 'Frequently asked questions',
        isPartOf: { '@id': pageId },
        mainEntity: section.items.map((item) => ({
          '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a }
        }))
      });
    }
    if (section.kind === 'tours' || section.kind === 'destinations') {
      const items = section.kind === 'tours'
        ? section.tours.map((tour) => ({ name: tour.title, url: `${origin}/tours/${tour.slug}` }))
        : section.destinations.map((place) => ({ name: place.name, url: `${origin}/destinations/${place.slug}` }));
      parts.push({
        '@type': 'ItemList', '@id': `${url}#${section.id}`, name: section.title,
        numberOfItems: items.length,
        itemListElement: items.map((item, i) => ({ '@type': 'ListItem', position: i + 1, ...item }))
      });
    }
  }
  return {
    '@context': 'https://schema.org',
    '@graph': [{
      '@type': 'WebPage', '@id': pageId, url, name, description,
      isPartOf: { '@id': `${origin}/#website` },
      publisher: { '@id': `${origin}/#organization` },
      inLanguage: 'en',
      ...(imageUrl ? { primaryImageOfPage: { '@type': 'ImageObject', url: imageUrl } } : {}),
      ...(parts.length ? { hasPart: parts.map((part) => ({ '@id': part['@id'] })) } : {})
    }, ...parts]
  };
}
