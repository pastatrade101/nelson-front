import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findQuickFacts, monthsOf, normalizeTable, tableView, toChapters } from '../src/lib/guideLayout.ts';

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
