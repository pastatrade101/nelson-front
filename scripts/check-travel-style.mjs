import assert from 'node:assert/strict';
import { createServer } from 'vite';

// Regression checks for CMS-to-layout mapping and the public-page SEO contract.
// Run: node scripts/check-travel-style.mjs. No database writes or network calls.
const server = await createServer({ server: { middlewareMode: true, watch: null }, appType: 'custom' });
try {
  const { readProse, readPanels, readTiers, buildStylePage } = await server.ssrLoadModule('/src/lib/components/public/style/styleContent.ts');
  const { styleStructuredData } = await server.ssrLoadModule('/src/lib/components/public/style/styleSeo.ts');
  const { load } = await server.ssrLoadModule('/src/routes/travel-styles/[slug]/+page.ts');
  const labelled = '<p><strong>Day 1:</strong> Arusha — arrive and settle in.</p><p><strong>Day 2:</strong> Tarangire — a game drive.</p>';
  assert.equal(readProse(labelled, []).kind, 'text');
  assert.equal(readProse(labelled, [], 'route').rows.length, 2);
  assert.equal(readProse(labelled, [], 'route').kind, 'route');
  assert.equal(readProse('<p>No structured labels here.</p>', [], 'schedule').kind, 'text');
  assert.equal(readProse(labelled, [], 'text').kind, 'text');

  const guides = readPanels([
    { title: 'Minja, Head Guide', items: ['A genuine biography.'], image_url: '/minja.jpg' },
    { title: 'Stanley', role: 'Operations Lead', items: ['First paragraph.', 'Second paragraph.'], image_fit: 'cover', image_position: 'top' }
  ], '', 'Your own team');
  assert.equal(guides.kind, 'people');
  assert.equal(guides.items[0].image, '/minja.jpg');
  assert.equal(guides.items[0].role, 'Head Guide');
  assert.equal(guides.items[0].imageFit, 'contain');
  assert.equal(guides.items[1].imageFit, 'cover');
  assert.equal(guides.items[1].paragraphs.length, 2);
  assert.equal(readPanels([{ title: 'A place', image_url: '/park.jpg' }], 'places').kind, 'places');

  const body = 'From US$350 per person sharing per day\n10-Day Safari: For a family of 4: 2 adults, 2 Children: would start from $11,000';
  const legacy = readTiers([{ title: 'Essential', body }])[0];
  assert.equal(legacy.price, 350);
  assert.deepEqual(legacy.example, { days: 10, adults: 2, children: 2, total: 11000 });
  assert.equal(legacy.notes.length, 0);
  const updated = readTiers([{ title: 'Luxury', body, price_from_usd: 625, example_children: 0, example_total_usd: 14000, image_alt: 'A real lodge' }])[0];
  assert.equal(updated.price, 625);
  assert.equal(updated.example.children, 0);
  assert.equal(updated.example.total, 14000);
  assert.equal(updated.imageAlt, 'A real lodge');
  assert.equal(readTiers([{ title: 'No price', price_from_usd: -1 }])[0].price, null);

  const model = buildStylePage([
    { type: 'numbered', columns: '4', items: [{ title: 'Real reason' }] },
    { type: 'imagegrid', images: [{ image_url: '/photo.jpg', image_alt: 'Actual scene' }] },
    { type: 'faq', title: 'Your questions', items: [{ question: 'What is included?', answer: 'A private vehicle.', topic: 'Costs' }, { question: 'Incomplete' }] },
    { type: 'tours', title: 'Family itineraries', tour_ids: ['tour-1', 'unpublished'] }
  ], [{ id: 'tour-1', title: 'Family safari', slug: 'family-safari' }]);
  assert.equal(model.sections[0].columns, 4);
  assert.equal(model.sections[1].images[0].alt, 'Actual scene');
  assert.equal(model.sections[2].items.length, 1);
  assert.equal(model.sections[2].items[0].topic, 'Costs');
  const schema = styleStructuredData({ name: 'Tanzania Family Safaris', description: 'Private family trips.', url: 'https://www.emneladventures.com/travel-styles/family', origin: 'https://www.emneladventures.com', image: '/hero.jpg', sections: model.sections });
  const graph = schema['@graph'];
  assert.equal(graph[0].isPartOf['@id'], 'https://www.emneladventures.com/#website');
  assert.equal(graph[0].primaryImageOfPage.url, 'https://www.emneladventures.com/hero.jpg');
  assert.deepEqual(graph.find((node) => node['@type'] === 'FAQPage').mainEntity.map((question) => question.acceptedAnswer.text), ['A private vehicle.']);
  assert.equal(graph.find((node) => node['@type'] === 'ItemList').numberOfItems, 1);
  assert.equal(graph.find((node) => node['@type'] === 'ItemList').itemListElement[0].url, 'https://www.emneladventures.com/tours/family-safari');
  assert.doesNotThrow(() => styleStructuredData({ name: '', description: '', url: 'https://example.com/style', origin: 'https://example.com', image: 'http://[invalid', sections: [] }));

  const params = { slug: 'test' };
  for (const status of [404, 500, 429]) {
    await assert.rejects(() => load({ params, fetch: async () => new Response('', { status }) }), (error) => error.status === (status === 404 ? 404 : 503));
  }
  await assert.rejects(() => load({ params, fetch: async () => { throw new Error('offline'); } }), (error) => error.status === 503);
  await assert.rejects(() => load({ params, fetch: async () => new Response('not json') }), (error) => error.status === 503);
  await assert.rejects(() => load({ params, fetch: async () => Response.json({ data: { slug: 'test', status: 'draft' } }) }), (error) => error.status === 404);
  const result = await load({ params, fetch: async (url) => Response.json(url === '/api/travel-styles/test' ? { data: { slug: 'test', name: 'Family', status: 'published' } } : { data: { items: [] } }) });
  assert.equal(result.style.slug, 'test');
  console.log('PASS: prose layouts, CMS portraits, tier prices, gallery descriptions, FAQ topics, structured data, and 404/503 handling.');
} finally {
  await server.close();
}
