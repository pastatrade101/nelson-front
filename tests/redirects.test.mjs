import test from 'node:test';
import assert from 'node:assert/strict';
import { REDIRECTS, redirectFor, canonicalHref, wwwRedirectFor } from '../src/lib/redirects.ts';

test('retired addresses land on their replacement, whatever the slash or case', () => {
  assert.equal(redirectFor('/experiences/family-safaris'), '/travel-styles/tanzania-family-safari');
  assert.equal(redirectFor('/experiences/family-safaris/'), '/travel-styles/tanzania-family-safari');
  assert.equal(redirectFor('/Experiences/Family-Safaris'), '/travel-styles/tanzania-family-safari');
  assert.equal(redirectFor('/tanzania-safaris'), '/destinations/tanzania-safari');
  assert.equal(redirectFor('/travel-styles/great-migration-safari'), null, 'live pages are not redirected');
  assert.equal(redirectFor('/'), null);
});

test('no redirect leads to another redirect', () => {
  for (const [from, to] of Object.entries(REDIRECTS)) assert.equal(redirectFor(to), null, `${from} → ${to} chains`);
});

test('site links skip past redirects', () => {
  assert.equal(canonicalHref('/tanzania-safaris'), '/destinations/tanzania-safari');
  assert.equal(canonicalHref('/tours'), '/tours');
});

test('only page requests on the bare domain move to www', () => {
  const at = (href) => new URL(href);
  assert.equal(wwwRedirectFor(at('https://emneladventures.com/tours?x=1'), 'GET'), 'https://www.emneladventures.com/tours?x=1');
  assert.equal(wwwRedirectFor(at('https://emneladventures.com/'), 'HEAD'), 'https://www.emneladventures.com/');
  assert.equal(wwwRedirectFor(at('https://emneladventures.com/plan-my-trip'), 'POST'), null, 'a redirected POST would lose its body');
  assert.equal(wwwRedirectFor(at('https://emneladventures.com/api/public/settings'), 'GET'), null);
  assert.equal(wwwRedirectFor(at('https://www.emneladventures.com/tours'), 'GET'), null);
  assert.equal(wwwRedirectFor(at('http://localhost:5176/tours'), 'GET'), null);
});
