import test from 'node:test';
import assert from 'node:assert/strict';
import { destinationChanges, validateDestination } from '../src/lib/admin/destination-form.ts';

const existing = () => ({
  name: 'Serengeti', country: 'Tanzania', slug: 'serengeti',
  description: '<p>Existing overview with <a href="/tours">links</a>.</p>',
  guide: [{ type: 'richtext', body: '<p>Existing guide</p>', future_field: { keep: true } }, { type: 'tours', tour_ids: ['tour-1'] }],
  safety_overview: 'Existing safety advice', image_url: 'https://example.com/legacy.jpg',
  main_image_url: 'https://example.com/legacy.jpg', score_wildlife: 0,
  latitude: -2.333333, longitude: 34.833333
});

test('an unchanged record sends no fields', () => {
  const baseline = existing();
  assert.deepEqual(destinationChanges(baseline, structuredClone(baseline)), {});
});
test('editing a name preserves guide, safety, numeric and legacy image fields', () => {
  const baseline = existing();
  assert.deepEqual(destinationChanges(baseline, { ...structuredClone(baseline), name: 'Serengeti National Park' }), { name: 'Serengeti National Park' });
});
test('nested guide edits are saved and unknown block properties are preserved', () => {
  const initial = structuredClone(existing());
  const edited = structuredClone(initial);
  edited.guide[0].body = '<p>Updated guide</p>';
  const patch = destinationChanges(initial, edited);
  assert.equal(patch.guide[0].body, '<p>Updated guide</p>');
  assert.deepEqual(patch.guide[0].future_field, { keep: true });
  assert.deepEqual(patch.guide[1].tour_ids, ['tour-1']);
  assert.equal(initial.guide[0].body, '<p>Existing guide</p>');
});
test('explicitly cleared fields and an intentionally emptied guide are included', () => {
  assert.deepEqual(destinationChanges(existing(), { ...existing(), safety_overview: null, guide: [] }), { safety_overview: null, guide: [] });
});
test('decimal coordinates and zero scores remain valid', () => {
  assert.deepEqual(validateDestination(existing()), []);
});
test('empty optional numeric fields remain valid', () => {
  assert.deepEqual(validateDestination({ ...existing(), latitude: '', longitude: '', score_wildlife: '', score_budget_from: '' }), []);
});
test('invalid ratings, coordinates and budgets point to the planning section', () => {
  const issues = validateDestination({ ...existing(), score_wildlife: 11, latitude: -91, longitude: 'bad', score_budget_from: -1 });
  assert.equal(issues.length, 4);
  assert.ok(issues.every((issue) => issue.section === 'planning'));
});
test('required details and image URLs report actionable sections', () => {
  const issues = validateDestination({ name: ' ', country: 'T', slug: '', main_image_url: 'not a URL' });
  assert.equal(issues.length, 4);
  assert.ok(issues.some((issue) => issue.field === 'main_image_url' && issue.section === 'images'));
});
