import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeRichText } from '../src/lib/richtext.ts';

test('backslash tricks are treated as the other site they lead to', () => {
  assert.equal(sanitizeRichText('<a href="/\\evil.com/x">a</a>'), '<a href="//evil.com/x" rel="noopener noreferrer">a</a>');
  assert.equal(sanitizeRichText('<a href="\\\\evil.com">b</a>'), '<a href="//evil.com" rel="noopener noreferrer">b</a>');
  assert.equal(sanitizeRichText('<a href="/&#92;evil.com">c</a>'), '<a href="//evil.com" rel="noopener noreferrer">c</a>');
});

test('site links stay clean and followed; references and rel never reach the page', () => {
  assert.equal(sanitizeRichText('<a href="/destinations/tarangire" data-link-type="destinations" data-link-id="x">T</a>'), '<a href="/destinations/tarangire">T</a>');
  assert.equal(sanitizeRichText('<a href="/tours/x" rel="nofollow">f</a>'), '<a href="/tours/x">f</a>');
  assert.equal(sanitizeRichText('<a href="https://www.emneladventures.com/tours/x?utm_source=chatgpt.com">i</a>'), '<a href="/tours/x">i</a>');
});

test('links to other sites keep the editor\'s nofollow and open safely', () => {
  assert.equal(
    sanitizeRichText('<a href="https://other.site" target="_blank" rel="noopener noreferrer nofollow">e</a>'),
    '<a href="https://other.site" target="_blank" rel="noopener noreferrer nofollow">e</a>'
  );
});

test('script URLs and handlers never survive', () => {
  assert.equal(sanitizeRichText('<p><a href="javascript:alert(1)">h</a></p>'), '<p>h</p>');
  assert.equal(sanitizeRichText('<a href="/x" onclick="alert(1)">x</a><script>alert(1)</script>'), '<a href="/x">x</a>');
});
