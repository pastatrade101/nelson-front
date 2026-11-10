import test from 'node:test';
import assert from 'node:assert/strict';
import { STEPS, CUSTOM_BUDGET, emptyDraft, applyEntry, validateStep, submission, readDraft, briefRows, localToday } from '../src/lib/tripPlanner.ts';

const filled = (over = {}) => ({ ...emptyDraft(), safariType: 'Tanzania Safari with Zanzibar', days: '8', adults: 2, children: 1, budgetTier: 'mid_luxury', fullName: 'Jane Traveller', email: 'jane@example.com', ...over });
const catalog = { tours: [{ id: 't1', slug: 'kenya-tanzania', title: '10-Day Kenya & Tanzania Safari', duration_days: 10 }], destinations: [], available: true };

test('the request is four steps: trip, travellers, budget, contact', () => {
  assert.deepEqual(STEPS, ['Trip details', 'Travellers', 'Budget', 'Contact details']);
});

test('each step asks only for what it shows', () => {
  assert.equal(validateStep(emptyDraft(), 0).length, 1);
  assert.deepEqual(validateStep(filled(), 0), []);
  assert.equal(validateStep(filled({ days: '' }), 1).length, 1);
  assert.deepEqual(validateStep(filled({ startDate: '' }), 1), [], 'the start date is optional');
  assert.equal(validateStep(filled({ startDate: '2000-01-01' }), 1).length, 1);
  assert.equal(validateStep(filled({ budgetTier: '' }), 2).length, 1);
  assert.equal(validateStep(filled({ budgetTier: CUSTOM_BUDGET, budget: '' }), 2).length, 1, 'an own budget needs an amount');
  assert.deepEqual(validateStep(filled({ budgetTier: CUSTOM_BUDGET, budget: '6000' }), 2), []);
  assert.deepEqual(validateStep(filled(), 3), [], 'WhatsApp is optional');
  assert.equal(validateStep(filled({ phone: '12' }), 3).length, 1, 'a WhatsApp number, when given, must be a number');
});

test('the lead carries every answer in words the team and email read', () => {
  const draft = filled({ startDate: '2099-03-14', phone: '+255 700 000 000', notes: 'Honeymoon' });
  const body = submission(draft, [{ url: '/plan-my-trip', params: {} }], [], 'key-12345678', 'USD', 'https://emneladventures.com/plan-my-trip', '');
  assert.equal(body.source, 'plan_my_trip');
  assert.equal(body.travel_date, '2099-03-14');
  assert.equal(body.phone, '+255 700 000 000');
  assert.equal(body.message, 'Honeymoon');
  assert.equal(body.number_of_children, 1);
  assert.equal(body.lead_context.form_type, 'emnel_safari_quote');
  assert.equal(body.lead_context.travel_interests, 'Tanzania Safari with Zanzibar');
  assert.equal(body.lead_context.trip_duration, '8 days');
  assert.equal(body.lead_context.budget_per_person, 'US$500 – 600 per person sharing, per night');
  const own = submission(filled({ budgetTier: CUSTOM_BUDGET, budget: '6000' }), [], [], 'key-12345678', 'USD', '', '');
  assert.equal(own.lead_context.budget_per_person, 'US$6,000 per person for the whole trip');
  assert.equal(own.travel_date, null);
  assert.equal(own.phone, null);
});

test('arriving from a tour or the trip finder fills in what it can', () => {
  const fromTour = applyEntry(emptyDraft(), { url: '/plan-my-trip?tour=kenya-tanzania', params: {}, tour: { id: 't1', slug: 'kenya-tanzania', title: '10-Day Kenya & Tanzania Safari' } }, catalog);
  assert.equal(fromTour.safariType, 'Tanzania & Kenya');
  assert.equal(fromTour.days, '10');
  const fromFinder = applyEntry(emptyDraft(), { url: '/plan-my-trip', params: { experience: ['beach'], budget: ['4500'], persona: ['solo'] } }, catalog);
  assert.equal(fromFinder.safariType, 'Tanzania Safari with Zanzibar');
  assert.equal(fromFinder.budgetTier, CUSTOM_BUDGET);
  assert.equal(fromFinder.budget, '4500');
  assert.equal(fromFinder.adults, 1);
});

test('a saved draft comes back; the old 7-step draft is dropped', () => {
  const saved = JSON.stringify({ v: 3, at: Date.now(), draft: filled(), entries: [], savedTrips: [], step: 2, key: 'key-12345678', pending: null });
  assert.equal(readDraft(saved)?.step, 2);
  assert.equal(readDraft(JSON.stringify({ v: 2, at: Date.now(), draft: {}, entries: [], savedTrips: [], step: 4, key: 'k' })), null);
});

test('the summary says when there is no date yet', () => {
  assert.equal(briefRows(filled()).find(([label]) => label === 'Preferred start')[1], 'Not sure yet');
  assert.ok(localToday() < '2099-01-01');
});
