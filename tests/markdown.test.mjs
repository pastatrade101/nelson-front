import test from 'node:test';
import assert from 'node:assert/strict';
import { hasMarkdown, markdownToHtml, repairMarkdown, sanitizeRichText, toPlainText } from '../src/lib/richtext.ts';

const render = (text) => sanitizeRichText(markdownToHtml(text));

test('plain prose is not mistaken for Markdown', () => {
  assert.equal(hasMarkdown('A gentle six-day safari. Price: US$2,400 per person.'), false);
  assert.equal(hasMarkdown('Day 1 - arrival in Arusha'), false, 'a dash inside a line is not a list');
  assert.equal(hasMarkdown('## Overview\nSix days.'), true);
  assert.equal(hasMarkdown('Stay at **Ngorongoro** crater rim.'), true);
});

test('headings, bold and lists render instead of showing their marks', () => {
  const html = render('## Overview\nSix days in the north.\n\n**Best for** first-time visitors.\n\n- Serengeti\n- Ngorongoro\n\n1. Arrive\n2. Drive');
  assert.ok(html.includes('<h2>Overview</h2>'));
  assert.ok(html.includes('<p>Six days in the north.</p>'));
  assert.ok(html.includes('<strong>Best for</strong>'));
  assert.ok(html.includes('<ul><li>Serengeti</li><li>Ngorongoro</li></ul>'));
  assert.ok(html.includes('<ol><li>Arrive</li><li>Drive</li></ol>'));
  assert.ok(!/[#*]/.test(html.replace(/<[^>]+>/g, '')), 'no marks left in the text');
});

test('Markdown cannot smuggle markup in', () => {
  const html = render('## <img src=x onerror=alert(1)>\n[click](javascript:alert(1))');
  assert.ok(!html.includes('<img'));
  assert.ok(!/href="javascript/i.test(html), 'only web and site links become links');
});

test('Markdown pasted into the rich-text editor is repaired', () => {
  const html = sanitizeRichText(repairMarkdown('<p>## Day 1</p><p>A **long** drive.</p>'));
  assert.ok(html.includes('<h2>Day 1</h2>'));
  assert.ok(html.includes('<strong>long</strong>'));
});

test('teasers and meta text drop the marks too', () => {
  assert.equal(toPlainText('## Overview\n**Six** days'), 'Overview\nSix days');
  assert.equal(toPlainText('<p>## Overview</p>'), 'Overview');
});
