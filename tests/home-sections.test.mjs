import test from 'node:test';
import assert from 'node:assert/strict';
import { HOME_SECTIONS, homeSectionDef, orderedHomeSections } from '../src/lib/homeSections.ts';

const row = (section_key, sort_order, is_active = true) => ({ section_key, sort_order, is_active });

test('the page follows the CMS order, hero first and the closing band last', () => {
  const keys = orderedHomeSections([
    row('final_cta', 0), row('how_it_works', 2), row('hero', 9), row('featured_tours', 1), row('about_hero', 0)
  ]).map(({ def }) => def.key);
  // Saved rows in sort order; never-saved essentials after them, in the standard order.
  assert.deepEqual(keys, ['hero', 'featured_tours', 'how_it_works', 'travel_styles', 'why_emnel', 'founder_story', 'featured_destinations', 'gallery', 'faq', 'final_cta']);
});

test('an inactive section is left out, even an essential', () => {
  const keys = orderedHomeSections([row('hero', 0), row('faq', 1, false), row('founder_story', 2, false)]).map(({ def }) => def.key);
  assert.ok(!keys.includes('faq') && !keys.includes('founder_story'));
});

test('a row saved under an old key renders as its section, and the current key wins', () => {
  const [entry] = orderedHomeSections([row('safari_showcase', 3)]).filter(({ def }) => def.key === 'featured_tours');
  assert.equal(entry.row.section_key, 'safari_showcase');
  const both = orderedHomeSections([row('safari_showcase', 3), row('featured_tours', 4)]).filter(({ def }) => def.key === 'featured_tours');
  assert.equal(both.length, 1);
  assert.equal(both[0].row.section_key, 'featured_tours');
});

test('About-page and unknown rows never reach the homepage', () => {
  assert.equal(homeSectionDef('about_hero'), undefined);
  assert.equal(homeSectionDef('stats'), undefined);
  const keys = orderedHomeSections([row('about_hero', 0), row('login_slider', 1)]).map(({ def }) => def.key);
  assert.ok(!keys.includes('about_hero') && !keys.includes('login_slider'));
});

test('every section offers a field set the homepage can show', () => {
  for (const def of HOME_SECTIONS) {
    assert.ok(def.fields.length > 0, def.key);
    assert.ok(def.help.length > 10, def.key);
  }
});

test('never-saved sections follow the standard order (the founder brief, Oct 2026)', () => {
  const keys = orderedHomeSections([]).map(({ def }) => def.key);
  assert.deepEqual(keys, ['hero', 'travel_styles', 'featured_tours', 'why_emnel', 'founder_story', 'how_it_works', 'featured_destinations', 'gallery', 'faq']);
});

test('sections outside the standard order appear only when saved and switched on', () => {
  assert.ok(!orderedHomeSections([]).some(({ def }) => ['safari_parks_intro', 'partners'].includes(def.key)));
  const keys = orderedHomeSections([row('hero', 0), row('safari_parks_intro', 1), row('partners', 2, false)]).map(({ def }) => def.key);
  assert.ok(keys.includes('safari_parks_intro') && !keys.includes('partners'));
});
