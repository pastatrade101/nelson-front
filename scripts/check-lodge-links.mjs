import assert from 'node:assert/strict';
import { createServer } from 'vite';

// Lodge page links (task list 2.7): similar lodges by area and tier, travel styles.
// Run: node scripts/check-lodge-links.mjs. No database writes or network calls.
const server = await createServer({ server: { middlewareMode: true, watch: null }, appType: 'custom', logLevel: 'error' });
const check = async (name, fn) => { await fn(); console.log('ok', name); };
try {
  const { areaKey, similarLodges, stylesForLodge } = await server.ssrLoadModule('/src/lib/lodgeLinks.ts');
  const lodge = (slug, park_area, accommodation_level, extra = {}) => ({ id: slug, slug, name: slug, park_area, accommodation_level, status: 'published', ...extra });

  await check('the area is the first part of the park area', () => {
    assert.equal(areaKey('Northern Serengeti (Kogatende, Mara River)'), 'northern serengeti');
    assert.equal(areaKey('Seasonal: Ndutu (calving season)'), 'ndutu');
    assert.equal(areaKey('Jambiani, south-east coast'), 'jambiani');
    assert.equal(areaKey(null), '');
  });

  await check('similar lodges: same area and tier first, never the lodge itself', () => {
    const here = lodge('sayari', 'Northern Serengeti (Kogatende)', 'ultra_luxury');
    const pool = [
      here,
      lodge('a-central-classic', null, 'classic'),
      lodge('b-north-luxury', 'Northern Serengeti (Mara)', 'luxury'),
      lodge('c-north-ultra', 'Northern Serengeti', 'ultra_luxury'),
      lodge('d-central-ultra', null, 'ultra_luxury'),
      lodge('e-draft', 'Northern Serengeti', 'ultra_luxury', { status: 'draft' })
    ];
    assert.deepEqual(similarLodges(here, pool).map((l) => l.slug), ['c-north-ultra', 'b-north-luxury', 'd-central-ultra']);
  });

  await check('styles: tier picks, itineraries that stay here, and migration areas', () => {
    const styles = [
      { slug: 'great-migration-safari', name: 'Great Migration', sort_order: 1 },
      { slug: 'honeymoon', name: 'Honeymoon', sort_order: 6, sections: [{ type: 'tiers', tiers: [{ lodge_ids: ['kubu'] }] }] },
      { slug: 'family', name: 'Family', sort_order: 2, category_id: 'cat-family' },
      { slug: 'day', name: 'Day', sort_order: 8 }
    ];
    assert.deepEqual(stylesForLodge(lodge('olakira', 'Seasonal: Ndutu', 'ultra_luxury'), styles, []).map((s) => s.slug), ['great-migration-safari']);
    assert.deepEqual(stylesForLodge(lodge('kubu', null, 'luxury'), styles, [{ id: 't1', category_id: 'cat-family' }]).map((s) => s.slug), ['family', 'honeymoon']);
    assert.deepEqual(stylesForLodge(lodge('plain', null, 'classic'), styles, []), []);
  });
} finally {
  await server.close();
}
