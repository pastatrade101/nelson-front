import test from 'node:test';
import assert from 'node:assert/strict';
import { tierLabel, tierRank, tourTierKeys, tourTierLabel, TIER_OPTIONS } from '../src/lib/tiers.ts';

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

test('a tour is listed under every ticked comfort tier, lowest first', () => {
  const tour = { budget_tier: 'essential', comfort_tiers: ['luxury', 'essential', 'classic'] };
  assert.deepEqual(tourTierKeys(tour), ['essential', 'classic', 'luxury']);
  assert.equal(tourTierLabel(tour), 'Classic to Luxury');
  assert.equal(tourTierLabel({ comfort_tiers: ['essential', 'luxury'] }), 'Classic · Luxury');
});

test('a tour with no ticked tiers falls back to its budget tier', () => {
  assert.deepEqual(tourTierKeys({ budget_tier: 'prestige', comfort_tiers: [] }), ['luxury']);
  assert.deepEqual(tourTierKeys({ budget_tier: 'signature' }), ['classic']);
  assert.equal(tourTierLabel({ budget_tier: 'signature', comfort_tiers: null }), 'Mid-Luxury');
  assert.deepEqual(tourTierKeys({}), []);
  assert.equal(tourTierLabel(null), '');
});
