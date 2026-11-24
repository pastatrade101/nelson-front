import { test } from 'node:test';
import assert from 'node:assert/strict';
import { costTable, gettingThere, keyFacts, linkedDestinations, monthByMonth, nightsAdvice, parkAreas } from '../src/lib/guideLayout.ts';

// A small guide shaped like the real ones (Serengeti, Nov 2026).
const guide = [
  { type: 'facts', title: 'At a glance', items: [{ label: 'Recommended stay', value: '3–4 nights' }, { label: 'Best time to visit', value: 'June – October' }] },
  { type: 'part', title: 'Which part should you visit?' },
  { type: 'table', title: '', columns: ['Region', 'Best for', 'Notes'], rows: [['Central', 'Year-round big cats', ''], ['Northern', 'Mara River crossings', '']] },
  { type: 'part', title: 'Best time to visit' },
  { type: 'table', title: '', columns: ['Months', 'Season', 'Best for'], rows: [['January – March', 'Calving', 'Predators'], ['June – October', 'Dry season', 'Crossings']] },
  { type: 'callout', body: '<p>The herds follow the rain, not the calendar.</p>' },
  { type: 'part', title: 'How many days do you need?' },
  { type: 'richtext', body: '<p><strong>2 nights</strong> – a short taste.</p><p><strong>3 nights:</strong> time to settle in.</p><p><strong>Our advice:</strong> stay in one area longer.</p>' },
  { type: 'part', title: 'How much does a safari cost?' },
  { type: 'table', title: '', columns: ['Safari style', 'Starting from', 'Suitable for'], rows: [['Classic', 'US$350 pp/day', 'Value'], ['Luxury', 'US$1,250 pp/day', 'Space and quiet']] },
  { type: 'part', title: 'How to get there' },
  { type: 'table', title: '', columns: ['Option', 'Best for', 'Typical approach'], rows: [['By road', 'Longer trips', 'Arusha → Serengeti']] },
  { type: 'part', title: 'Plan your visit' },
  { type: 'richtext', body: '<p>Pair it with <a href="/destinations/ngorongoro">Ngorongoro</a> and <a href="/destinations/zanzibar">Zanzibar</a>, or <a href="/destinations/serengeti">more time here</a>.</p>' }
];

test('parkAreas reads the areas table, with the Part it sits under', () => {
  const found = parkAreas(guide);
  assert.equal(found.title, 'Which part should you visit?');
  assert.deepEqual(found.items, [{ name: 'Central', text: 'Year-round big cats' }, { name: 'Northern', text: 'Mara River crossings' }]);
  assert.equal(found.source.length, 1);
});

test('monthByMonth gives each month its row, and brings the tip that follows', () => {
  const found = monthByMonth(guide);
  assert.equal(found.months[1].title, 'Calving');
  assert.equal(found.months[7].period, 'June – October');
  assert.equal(found.months[4], null);
  assert.equal(found.tip, 'The herds follow the rain, not the calendar.');
  assert.equal(found.source.length, 2);
});

test('nightsAdvice reads the bold "N nights" paragraphs and marks the recommended one', () => {
  const found = nightsAdvice(guide, '3–4 nights');
  assert.deepEqual(found.options.map((o) => [o.label, o.recommended]), [['2 nights', false], ['3 nights', true]]);
  assert.equal(found.options[0].text, 'A short taste.');
  assert.equal(found.note, 'Stay in one area longer.');
});

test('costTable reads per-day starting prices', () => {
  const found = costTable(guide);
  assert.deepEqual(found.rows.map((r) => [r.style, r.perDay, r.suits]), [['Classic', 350, 'Value'], ['Luxury', 1250, 'Space and quiet']]);
});

test('gettingThere reads the options table under a "get there" Part', () => {
  assert.deepEqual(gettingThere(guide).items, [{ title: 'By road', bestFor: 'Longer trips', route: 'Arusha → Serengeti' }]);
});

test('linkedDestinations lists the places the guide links to, without itself', () => {
  assert.deepEqual(linkedDestinations(guide, 'serengeti'), ['ngorongoro', 'zanzibar']);
});

test('keyFacts finds best time and length of stay in the quick facts', () => {
  assert.deepEqual(keyFacts(guide[0].items), { bestTime: 'June – October', howLong: '3–4 nights' });
});

test('helpers return null when the guide has no such section', () => {
  assert.equal(parkAreas([]), null);
  assert.equal(monthByMonth([]), null);
  assert.equal(nightsAdvice([]), null);
  assert.equal(costTable([]), null);
  assert.equal(gettingThere([]), null);
});

import { cleanPage, editablePage, emptyWay } from '../src/lib/admin/destination-form.ts';

test('the page editor round-trips filled fields and saves nothing for an empty page', () => {
  assert.equal(cleanPage(editablePage(null)), null);
  const page = editablePage({ short_name: 'the Serengeti', highlights: [{ title: 'Migration', text: 'All year' }], pairs_with: ['zanzibar'] });
  assert.equal(page.highlights.length, 3);
  page.ways.push({ ...emptyWay(), title: ' Families ', link_href: 'javascript:alert(1)', link_label: 'Go' });
  assert.deepEqual(cleanPage(page), {
    short_name: 'the Serengeti',
    highlights: [{ title: 'Migration', text: 'All year' }],
    ways: [{ title: 'Families', link_label: 'Go' }],
    pairs_with: ['zanzibar']
  });
});
