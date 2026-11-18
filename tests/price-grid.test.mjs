import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bandFor,
  comfortPricing,
  gridAdultPrice,
  gridEstimate,
  gridLevelPrices,
  priceGrid,
  travelMonths
} from '../src/lib/tiers.ts';

// Made-up prices: these test the arithmetic, not any tour's real rates.
const cell = (id, tier, from, to, price, extra = {}) => ({
  id,
  title: `${tier} ${from}-${to}`,
  price_type: 'per_person',
  price,
  comfort_tier: tier,
  travellers_from: from,
  travellers_to: to,
  sort_order: Number(id),
  ...extra
});

const grid = [
  cell('1', 'essential', 1, 1, 900, { child_price: 50, lodges: 'Lodge A, Lodge B' }),
  cell('2', 'essential', 2, 2, 600, { child_price: 50, lodges: 'Lodge A, Lodge B' }),
  cell('3', 'essential', 3, 4, 500, { child_price: 50, lodges: 'Lodge A, Lodge B' }),
  cell('4', 'essential', 5, 6, 0, { child_price: 50, lodges: 'Lodge A, Lodge B' }),
  cell('5', 'luxury', 1, 1, 2000),
  cell('6', 'luxury', 2, 2, 1500),
  cell('7', 'luxury', 3, 4, 1200),
  cell('8', 'luxury', 5, 6, 1000),
  // An older option without a comfort level: a supplement.
  { id: '9', title: 'Single room', price_type: 'single_supplement', price: 300, sort_order: 9 }
];

test('bands: 1, 2, 3–4, 5–6; seven or more has none', () => {
  assert.equal(bandFor(1).key, '1');
  assert.equal(bandFor(2).key, '2');
  assert.equal(bandFor(4).key, '3-4');
  assert.equal(bandFor(5).key, '5-6');
  assert.equal(bandFor(7), null);
});

test('the grid has one column per priced level, lowest first, with lodges and child price', () => {
  const columns = priceGrid({ comfort_tiers: ['luxury', 'essential'] }, grid);
  assert.deepEqual(columns.map((c) => c.label), ['Classic', 'Luxury']);
  assert.equal(columns[0].lodges, 'Lodge A, Lodge B');
  assert.equal(columns[0].child, 50);
  assert.equal(columns[1].child, null);
  assert.deepEqual(columns[0].cells.map((c) => c.price), [900, 600, 500, null]);
});

test('a priced level that is not ticked is left out', () => {
  const columns = priceGrid({ comfort_tiers: ['essential'] }, grid);
  assert.deepEqual(columns.map((c) => c.tier), ['essential']);
});

test('with nothing ticked, every priced level shows', () => {
  assert.equal(priceGrid({ comfort_tiers: [] }, grid).length, 2);
});

test('a tour without grid options has no grid', () => {
  assert.deepEqual(priceGrid({}, [grid[8]]), []);
});

test('estimate: adults x the band price + children x the child price', () => {
  const [classic, luxury] = priceGrid({}, grid);
  assert.equal(gridAdultPrice(classic, 3), 500);
  assert.equal(gridEstimate(classic, 2, 0), 1200);
  assert.equal(gridEstimate(classic, 2, 2), 1300);
  assert.equal(gridEstimate(classic, 3, 1), 1550);
});

test('estimate is on request when a needed price is missing', () => {
  const [classic, luxury] = priceGrid({}, grid);
  assert.equal(gridEstimate(classic, 5, 0), null); // 5–6 cell empty
  assert.equal(gridEstimate(luxury, 2, 1), null); // no child price
  assert.equal(gridEstimate(luxury, 2, 0), 3000);
  assert.equal(gridEstimate(luxury, 7, 0), null); // seven adults
});

test('the older per-level reading skips grid options; supplements stay extras', () => {
  const { rows, extras } = comfortPricing(grid);
  assert.equal(rows.length, 0);
  assert.deepEqual(extras.map((o) => o.id), ['9']);
});

test('lowest adult price per level, for the /tours slider', () => {
  assert.deepEqual(gridLevelPrices(grid), [
    { tier: 'essential', price: 500 },
    { tier: 'luxury', price: 1000 }
  ]);
});

test('travel months: the next 18 from this month, then "Not sure yet"', () => {
  const months = travelMonths(new Date(Date.UTC(2026, 10, 18)), 18);
  assert.equal(months.length, 19);
  assert.deepEqual(months[0], { value: '2026-11', label: 'November 2026' });
  assert.deepEqual(months[17], { value: '2028-04', label: 'April 2028' });
  assert.deepEqual(months[18], { value: 'not_sure', label: 'Not sure yet' });
});
