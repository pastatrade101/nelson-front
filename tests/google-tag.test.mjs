import test from 'node:test';
import assert from 'node:assert/strict';
import { tagId, verificationCode, googleTagHead, googleTagBody } from '../src/lib/googleTag.ts';

test('tag ids are checked against their format; the first valid one wins', () => {
  assert.equal(tagId('ga4', ' g-7y0g632949 '), 'G-7Y0G632949');
  assert.equal(tagId('ga4', '', 'G-7Y0G632949'), 'G-7Y0G632949', 'falls back to the next candidate');
  assert.equal(tagId('ga4', 'UA-12345-1'), '');
  assert.equal(tagId('ads', 'AW-1234567890'), 'AW-1234567890');
  assert.equal(tagId('ads', 'AW-12345/abcDEF'), '', 'a conversion label is not a tag id');
  assert.equal(tagId('gtm', 'GTM-ABC1234'), 'GTM-ABC1234');
  assert.equal(tagId('gtm', "GTM-X');alert(1)//"), '', 'nothing but the id reaches the script');
});

test('the Search Console code is read from any form it is pasted in', () => {
  const code = 'abcDEF_123-xyz7890abcDEF_123-xyz7890abcDEF1';
  assert.equal(verificationCode(code), code);
  assert.equal(verificationCode(`<meta name="google-site-verification" content="${code}" />`), code);
  assert.equal(verificationCode(`google-site-verification=${code}`), code);
  assert.equal(verificationCode('"><script>'), '');
  assert.equal(verificationCode(''), '');
});

test('no ids, no tags', () => {
  assert.equal(googleTagHead({ ga4: '', ads: '', gtm: '' }), '');
  assert.equal(googleTagBody({ ga4: 'G-7Y0G632949', ads: '', gtm: '' }), '');
});

test('consent defaults to denied before any tag loads, and gtag.js loads once for GA4 and Ads', () => {
  const head = googleTagHead({ ga4: 'G-7Y0G632949', ads: 'AW-1234567890', gtm: '' });
  assert.ok(head.indexOf("gtag('consent','default'") < head.indexOf('googletagmanager.com'));
  assert.equal(head.match(/gtag\/js\?id=/g).length, 1);
  assert.ok(head.includes("gtag('config','G-7Y0G632949'"));
  assert.ok(head.includes("gtag('config','AW-1234567890')"));
  assert.ok(head.includes('if(!window.emnelGoogleTag)'), 'guarded against a second run');
  assert.ok(!head.includes('gtm.js'));
});

test('a GTM container adds its loader and the no-JavaScript fallback', () => {
  const ids = { ga4: '', ads: '', gtm: 'GTM-ABC1234' };
  assert.ok(googleTagHead(ids).includes('gtm.js?id=GTM-ABC1234'));
  assert.ok(googleTagHead(ids).includes('window.emnelGtm=true'));
  assert.ok(!googleTagHead(ids).includes('gtag/js'));
  assert.ok(googleTagBody(ids).includes('ns.html?id=GTM-ABC1234'));
});
