import test from 'node:test';
import assert from 'node:assert/strict';
import { comfortPricing, levelPrices, tierForTitle } from '../src/lib/tiers.ts';

const opt = (id, title, price_type, price, extra = {}) => ({ id, title, price_type, price, sort_order: Number(id), ...extra });

// The live F4 draft (10-Day Family Safari & Zanzibar): child rates as separate
// "Per child" options titled "<level>: child under 11".
const f4 = [
  opt('0', 'Classic', 'per_person', 3500, { description: 'Per adult sharing. Mount Meru Hotel (Arusha), Tarangire Safari Lodge' }),
  opt('1', 'Classic: child under 11', 'per_child', 2100),
  opt('2', 'Mid-Luxury', 'per_person', 4500),
  opt('3', 'Mid-Luxury: child under 11', 'per_child', 2700),
  opt('4', 'Luxury', 'per_person', 6000),
  opt('5', 'Luxury: child under 11', 'per_child', 3600)
];

test('a child option titled "<level>: child under 11" is that level’s child price', () => {
  const { rows, extras } = comfortPricing(f4);
  assert.deepEqual(rows.map((r) => [r.title, r.tier, r.adult, r.child, r.childNote]), [
    ['Classic', 'essential', 3500, 2100, 'under 11'],
    ['Mid-Luxury', 'classic', 4500, 2700, 'under 11'],
    ['Luxury', 'luxury', 6000, 3600, 'under 11']
  ]);
  assert.equal(extras.length, 0);
  assert.match(rows[0].lodges, /Mount Meru Hotel/);
});

test('"Luxury" never takes the Mid-Luxury child rate, whatever the order', () => {
  const { rows } = comfortPricing([f4[4], f4[3], f4[2], f4[5]].map((o, i) => ({ ...o, sort_order: i })));
  assert.deepEqual(rows.map((r) => [r.title, r.child]), [['Luxury', 3600], ['Mid-Luxury', 2700]]);
});

test('the level’s own "Price per child" wins; a same-titled child option also pairs', () => {
  const { rows, extras } = comfortPricing([
    opt('1', 'Classic', 'per_person', 3100, { child_price: 1550 }),
    opt('2', 'Luxury', 'per_person', 7400),
    opt('3', 'Luxury', 'per_child', 3700),
    opt('4', 'Single room', 'single_supplement', 400)
  ]);
  assert.deepEqual(rows.map((r) => [r.title, r.child, r.childNote]), [['Classic', 1550, ''], ['Luxury', 3700, '']]);
  assert.deepEqual(extras.map((o) => o.title), ['Single room']);
});

test('no child price reads as on request (null); an unmatched child rate is an extra', () => {
  const { rows, extras } = comfortPricing([opt('1', 'Classic', 'per_person', 4900), opt('2', 'Children under 12', 'per_child', 2000)]);
  assert.equal(rows[0].child, null);
  assert.deepEqual(extras.map((o) => o.title), ['Children under 12']);
});

test('titles name levels by the site’s labels first, then the old importer names', () => {
  assert.equal(tierForTitle('Classic'), 'essential');
  assert.equal(tierForTitle('Mid-Luxury'), 'classic');
  assert.equal(tierForTitle('Signature'), 'classic');
  assert.equal(tierForTitle('Prestige'), 'luxury');
  assert.equal(tierForTitle('Adult rate'), '');
  assert.deepEqual(levelPrices(f4), [{ tier: 'essential', price: 3500 }, { tier: 'classic', price: 4500 }, { tier: 'luxury', price: 6000 }]);
});
