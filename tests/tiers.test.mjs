import test from 'node:test';
import assert from 'node:assert/strict';
import { tierLabel, tierRank, TIER_OPTIONS } from '../src/lib/tiers.ts';

test('stored tiers read Classic / Mid-Luxury / Luxury / Ultra Luxury', () => {
  assert.deepEqual(TIER_OPTIONS.map((o) => o.label), ['Classic', 'Mid-Luxury', 'Luxury', 'Ultra Luxury']);
  assert.equal(tierLabel('essential'), 'Classic');
  assert.equal(tierLabel('classic'), 'Mid-Luxury');
  assert.equal(tierLabel('luxury'), 'Luxury');
  assert.equal(tierLabel('ultra_luxury'), 'Ultra Luxury');
});

test("the tour importer's Signature and Prestige steps use the same four names", () => {
  assert.equal(tierLabel('signature'), 'Mid-Luxury');
  assert.equal(tierLabel('Prestige'), 'Luxury');
  assert.ok(tierRank('essential') < tierRank('signature') && tierRank('signature') < tierRank('prestige'));
  assert.equal(tierLabel(''), '');
});
