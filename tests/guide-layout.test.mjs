import { test } from 'node:test';
import assert from 'node:assert/strict';
import { faqChapterId, findQuickFacts, monthsOf, normalizeTable, questionsNotInGuide, sameQuestion, tableView, toChapters } from '../src/lib/guideLayout.ts';

test('monthsOf reads month names, ranges and year-wrapping ranges', () => {
  assert.deepEqual(monthsOf('June – October'), [5, 6, 7, 8, 9]);
  assert.deepEqual(monthsOf('January–March'), [0, 1, 2]);
  assert.deepEqual(monthsOf('November'), [10]);
  assert.deepEqual(monthsOf('December – February'), [11, 0, 1]);
  assert.deepEqual(monthsOf('Sept - Oct'), [8, 9]);
  assert.equal(monthsOf('Central Serengeti'), null);
  assert.equal(monthsOf('Late June'), null);
  assert.equal(monthsOf(''), null);
});

test('normalizeTable lifts a pasted header row and strips tabs', () => {
  const t = normalizeTable({ title: ' Tarangire ', columns: ['', '', ''], rows: [['Months', 'Season', 'Why go'], ['June – October', 'Dry\tseason', 'Elephants']] });
  assert.deepEqual(t.columns, ['Months', 'Season', 'Why go']);
  assert.deepEqual(t.rows, [['June – October', 'Dry season', 'Elephants']]);
  assert.equal(t.title, 'Tarangire');
});

test('tableView picks season, columns or table', () => {
  const season = tableView({ columns: ['Months', 'Season', 'Conditions'], rows: [['June – October', 'Dry', 'Clear'], ['November', 'Short rains', 'Green']] });
  assert.equal(season.kind, 'season');
  assert.equal(season.seasonCol, 1);
  assert.deepEqual(season.months[1], [10]);

  const columns = tableView({ columns: ['Option', 'Best for'], rows: [['Road', 'Families'], ['Fly-in', 'Short stays']] });
  assert.equal(columns.kind, 'columns');

  // A comparison laid across the columns stays a table.
  const crosswise = tableView({ columns: ['', 'North', 'South'], rows: [['Best for', 'Parties', 'Quiet'], ['Tides', 'Small', 'Large']] });
  assert.equal(crosswise.kind, 'table');

  const long = tableView({ columns: ['A', 'B'], rows: Array.from({ length: 8 }, (_, i) => [`r${i}`, 'x']) });
  assert.equal(long.kind, 'table');
});

test('toChapters groups text with its notes and keeps wide blocks apart', () => {
  const blocks = [
    { type: 'richtext', body: 'Opening' },
    { type: 'part', part: 1, title: 'Discover' },
    { type: 'richtext', body: 'A' },
    { type: 'callout', variant: 'guide_tip', body: 'Tip' },
    { type: 'richtext', body: 'B' },
    { type: 'table', columns: ['a', 'b'], rows: [] },
    { type: 'did_you_know', body: 'Fact' },
    { type: 'faq', title: 'Serengeti FAQs', items: [{ q: 'Q?', a: 'A.' }] },
    { type: 'richtext', body: 'After the questions' },
    { type: 'part', title: 'Discover' },
    { type: 'part', title: 'Discover' },
    { type: 'richtext', body: 'C' }
  ];
  const chapters = toChapters(blocks);
  assert.equal(chapters.length, 4);
  assert.equal(chapters[0].id, 'guide-opening');
  assert.equal(chapters[1].id, 'part-1');
  const [run, wide, after] = chapters[1].segments;
  assert.equal(run.kind, 'run');
  assert.deepEqual(run.main.map((b) => b.body), ['A', 'B']);
  assert.deepEqual(run.notes.map((b) => b.body), ['Tip']);
  assert.equal(wide.kind, 'wide');
  assert.deepEqual(after.notes.map((b) => b.body), ['Fact']);
  // A titled FAQ becomes its own chapter, its title the heading.
  assert.equal(chapters[2].id, 'faq-serengeti-faqs');
  assert.equal(chapters[2].part.title, 'Serengeti FAQs');
  assert.equal(chapters[2].segments[0].main[0].title, '');
  assert.equal(chapters[2].segments[0].main[1].body, 'After the questions');
  // An empty Part is dropped; a repeated heading gets its own anchor.
  assert.equal(chapters[3].id, 'part-discover-2');
});

test('findQuickFacts finds the at-a-glance block', () => {
  const facts = { type: 'facts', title: 'Serengeti at a glance', items: [] };
  assert.equal(findQuickFacts([{ type: 'facts', title: 'Lodges', items: [] }, facts]), facts);
});

// Questions as they are on the live Serengeti page: the guide's own FAQ and
// the six attached in the FAQ library.
const serengetiGuide = [
  { type: 'part', part: 1, title: 'Discover the Serengeti' },
  { type: 'richtext', body: 'Text' },
  {
    type: 'faq',
    title: 'The Serengeti National Park ',
    items: [
      'When is the best time to visit Serengeti National Park?',
      'Where is Serengeti National Park?',
      'How many days do I need for a Serengeti safari?',
      'How much does a Serengeti safari cost?',
      'Where is the Great Wildebeest Migration in the Serengeti?',
      'When is the wildebeest calving season in Serengeti?',
      'Can I see the Mara River crossing in Serengeti?',
      'Should I fly or drive to Serengeti?',
      'Can I combine a Serengeti safari with Zanzibar?',
      'Can I visit Serengeti from Zanzibar?',
      'Is Serengeti safe for tourists?'
    ].map((q) => ({ q, a: 'Answer.' }))
  }
];

test('sameQuestion matches the same question worded differently', () => {
  const place = 'Serengeti National Park';
  assert.ok(sameQuestion('When is the best time to visit the Serengeti?', 'When is the best time to visit Serengeti National Park?', place));
  assert.ok(sameQuestion('Where is the Great Migration each month?', 'Where is the Great Wildebeest Migration in the Serengeti?', place));
  assert.ok(sameQuestion('How many days do we need in the Serengeti?', 'How many days do I need for a Serengeti safari?', place));
  assert.ok(sameQuestion('Is it better to drive or fly to the Serengeti?', 'Should I fly or drive to Serengeti?', place));
  assert.ok(sameQuestion('Can we combine the Serengeti with Zanzibar?', 'Can I combine a Serengeti safari with Zanzibar?', place));
  assert.ok(!sameQuestion('Is the Serengeti crowded?', 'Is Serengeti safe for tourists?', place));
  assert.ok(!sameQuestion('Can we combine the Serengeti with Zanzibar?', 'Can I visit Serengeti from Zanzibar?', place));
  // A question that is only the place's name says nothing to match on.
  assert.ok(!sameQuestion('Where is Serengeti National Park?', 'Where is the Serengeti?', place));
});

test('questionsNotInGuide keeps only the library questions the guide does not ask', () => {
  const library = [
    'When is the best time to visit the Serengeti?',
    'Where is the Great Migration each month?',
    'How many days do we need in the Serengeti?',
    'Is it better to drive or fly to the Serengeti?',
    'Is the Serengeti crowded?',
    'Can we combine the Serengeti with Zanzibar?'
  ].map((question, i) => ({ id: String(i), question }));
  const left = questionsNotInGuide(library, serengetiGuide, 'Serengeti National Park');
  assert.deepEqual(left.map((f) => f.question), ['Is the Serengeti crowded?']);

  const tanzania = [{ type: 'faq', items: [{ q: 'Do I need malaria tablets?', a: '' }, { q: 'How many days do I need?', a: '' }] }];
  const insurance = [{ id: 'x', question: 'Do I need travel insurance to visit Tanzania?' }];
  assert.deepEqual(questionsNotInGuide(insurance, tanzania, 'Tanzania'), insurance);
  assert.deepEqual(questionsNotInGuide(insurance, [], 'Tanzania'), insurance);
});

test('faqChapterId finds the chapter that holds the guide FAQ', () => {
  assert.equal(faqChapterId(serengetiGuide), 'faq-the-serengeti-national-park');
  assert.equal(faqChapterId([{ type: 'part', part: 2, title: 'Planning' }, { type: 'faq', items: [{ q: 'Q?', a: 'A' }] }]), 'part-2');
  assert.equal(faqChapterId([{ type: 'richtext', body: 'No questions' }]), '');
});
