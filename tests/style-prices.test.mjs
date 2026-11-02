import test from 'node:test';
import assert from 'node:assert/strict';
import { styleFromPrice, styleTours } from '../src/lib/styleLinks.ts';

const tour = (id, category_id, price_from, currency = 'USD') => ({ id, category_id, price_from, currency });
const tours = [tour('a', 'day', 205), tour('b', 'day', 337), tour('c', 'classic', 4375), tour('d', 'classic', 2018), tour('e', 'other', 2450), tour('f', 'day', 99, 'EUR')];

test("a style's tours are its category's plus the ones its page curates", () => {
  const style = { slug: 'migration', name: 'Migration', category_id: 'migration', sections: [{ type: 'tours', tour_ids: ['c', 'e'] }] };
  assert.deepEqual(styleTours(style, tours).map((t) => t.id), ['c', 'e']);
  assert.equal(styleFromPrice(style, tours), 2450);
});

test('the from price is the lowest USD price among them', () => {
  assert.equal(styleFromPrice({ slug: 'day', name: 'Day', category_id: 'day' }, tours), 205);
  assert.equal(styleFromPrice({ slug: 'classic', name: 'Classic', category_id: 'classic' }, tours), 2018);
});

test('a style with no priced itineraries has no price (never an invented one)', () => {
  assert.equal(styleFromPrice({ slug: 'family', name: 'Family', category_id: 'family' }, tours), null);
  assert.equal(styleFromPrice({ slug: 'x', name: 'X', category_id: null }, tours), null);
  assert.equal(styleFromPrice({ slug: 'z', name: 'Z', category_id: 'z' }, [tour('g', 'z', 0)]), null);
});
