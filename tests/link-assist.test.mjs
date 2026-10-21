import test from 'node:test';
import assert from 'node:assert/strict';
import { anchorAdvice, linkBudget, phrasesFor, suggestLinks, wordCount } from '../src/lib/linkAssist.ts';

const T = (type, label, slug, group) => ({ type, label, path: `/${{ destinations: 'destinations', lodges: 'accommodation', tours: 'tours', tour_categories: 'experiences', travel_styles: 'travel-styles' }[type]}/${slug}`, group, id: `${type}-${slug}` });
const targets = [
  T('destinations', 'Tarangire National Park', 'tarangire-national-park', 'Destinations'),
  T('destinations', 'Arusha National Park', 'arusha', 'Destinations'),
  T('destinations', 'Arusha', 'arusha-tanzania', 'Destinations'),
  T('destinations', 'Ngorongoro Crater', 'ngorongoro', 'Destinations'),
  T('destinations', 'Serengeti National Park', 'serengeti-national-park-tanzania', 'Destinations'),
  T('destinations', 'Tanzania', 'tanzania-safari', 'Destinations'),
  T('lodges', 'Nyikani Camp, Central Serengeti', 'nyikani-camp-central-serengeti', 'Accommodation'),
  T('lodges', 'Tukaone Serengeti - Hembe Camp', 'tukaone-serengeti-hembe-camp', 'Accommodation'),
  T('lodges', 'Dunia Camp', 'dunia-camp', 'Accommodation'),
  T('tour_categories', 'Fly-In Safaris', 'fly-in-safaris', 'Experiences'),
  T('tour_categories', 'Great Migration Safaris', 'great-migration-safaris', 'Experiences'),
  T('tours', '4 Days Fly-in Serengeti Safari', '4-day-fly-in-serengeti-safari', 'Itineraries'),
  { label: 'Contact', path: '/contact', group: 'Key pages' }
];

const day = "Your guide collects you in Arusha at 8am for the drive to Tarangire, Tanzania's most underrated park. Later, Tarangire's elephants gather at the river. Tomorrow: the Ngorongoro Highlands, then two nights at Nyikani Camp in the Serengeti — or take a fly-in safari.";

test('aliases: national-park and crater suffixes, lodge name parts, distinctive words only', () => {
  assert.deepEqual(phrasesFor(targets[0]), ['Tarangire National Park', 'Tarangire']);
  assert.ok(phrasesFor(targets[6]).includes('Nyikani Camp'));
  assert.ok(phrasesFor(targets[7]).includes('Hembe Camp'));
  assert.deepEqual(phrasesFor(targets[8]), ['Dunia Camp']); // "Dunia" alone is ordinary Swahili
  assert.deepEqual(phrasesFor(targets[5]), []); // "Tanzania" is too broad to link on its own
});

test('suggests real pages the text mentions, with the words as written and a reason', () => {
  const out = suggestLinks({ blocks: [{ text: day }], targets });
  const byPath = Object.fromEntries(out.map((s) => [s.target.path, s]));
  assert.equal(byPath['/destinations/tarangire-national-park'].anchor, 'Tarangire');
  assert.equal(byPath['/destinations/tarangire-national-park'].mentions, 2);
  assert.match(byPath['/destinations/tarangire-national-park'].reason, /destination 2×/);
  assert.equal(byPath['/accommodation/nyikani-camp-central-serengeti'].anchor, 'Nyikani Camp');
  assert.equal(byPath['/experiences/fly-in-safaris'].anchor, 'fly-in safari');
  // "Arusha" means the city page, not the alias of Arusha National Park.
  assert.ok(byPath['/destinations/arusha-tanzania']);
  assert.ok(!byPath['/destinations/arusha']);
  // Fixed pages and the country page are never suggested.
  assert.ok(!byPath['/contact'] && !byPath['/destinations/tanzania-safari']);
  // Every suggestion is a page from the index.
  for (const s of out) assert.ok(targets.includes(s.target));
});

test('skips the page being edited, pages already linked, and text inside links', () => {
  const start = day.indexOf('Tarangire');
  const out = suggestLinks({
    blocks: [{ text: day, linked: [[start, start + 'Tarangire'.length]] }],
    targets,
    linkedPaths: new Set(['/accommodation/nyikani-camp-central-serengeti']),
    selfPath: '/experiences/fly-in-safaris'
  });
  const paths = out.map((s) => s.target.path);
  assert.ok(!paths.includes('/accommodation/nyikani-camp-central-serengeti'));
  assert.ok(!paths.includes('/experiences/fly-in-safaris'));
  const tarangire = out.find((s) => s.target.path === '/destinations/tarangire-national-park');
  // The linked first mention is left alone; the next mention is offered.
  assert.equal(tarangire.mentions, 1);
  assert.ok(tarangire.start > start);
});

test('hints rank first and explain themselves', () => {
  const out = suggestLinks({
    blocks: [{ text: day }],
    targets,
    hints: [{ type: 'lodges', id: 'lodges-nyikani-camp-central-serengeti', reason: "This day's lodge" }]
  });
  assert.equal(out[0].target.path, '/accommodation/nyikani-camp-central-serengeti');
  assert.match(out[0].reason, /^This day's lodge/);
});

test('longest phrase wins where phrases overlap', () => {
  const out = suggestLinks({ blocks: [{ text: 'A day in Tarangire National Park.' }], targets });
  assert.equal(out.length, 1);
  assert.equal(out[0].anchor, 'Tarangire National Park');
});

test('anchor advice flags generic and bare-URL anchors only', () => {
  assert.match(anchorAdvice('Click here'), /doesn’t say where/);
  assert.match(anchorAdvice('read more.'), /doesn’t say where/);
  assert.match(anchorAdvice('https://emneladventures.com/tours'), /bare address/);
  assert.equal(anchorAdvice('Explore our Serengeti safari packages'), '');
});

test('link budget scales with length', () => {
  assert.equal(linkBudget(wordCount([{ text: day }])), 1);
  assert.equal(linkBudget(400), 5);
  assert.equal(linkBudget(5000), 8);
});

import { carryLinks } from '../src/lib/richtext.ts';

test('an AI rewrite keeps links whose words survive, with their references', () => {
  const before = '<p>Drive to <a href="/destinations/tarangire-national-park" data-link-type="destinations" data-link-id="d1">Tarangire National Park</a> and sleep at <a href="/accommodation/kati-kati">Kati Kati</a>.</p>';
  const after = '<p>Head for Tarangire National Park, famed for elephants.</p><p>Overnight in a tented camp.</p>';
  const { html, kept, lost } = carryLinks(before, after);
  assert.equal(kept, 1);
  assert.deepEqual(lost, ['Kati Kati']);
  assert.match(html, /<a href="\/destinations\/tarangire-national-park" data-link-type="destinations" data-link-id="d1">Tarangire National Park<\/a>, famed/);
});

test('carried links land on whole words only, never inside another link or tag', () => {
  const { html, kept } = carryLinks('<p><a href="/destinations/arusha-tanzania">Arusha</a></p>', '<p>Arushas aside, Arusha is the gateway.</p>');
  assert.equal(kept, 1);
  assert.equal(html, '<p>Arushas aside, <a href="/destinations/arusha-tanzania">Arusha</a> is the gateway.</p>');
});
