import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanProfileUrl, organizationGraph, parseBusinessHours } from '../src/lib/organizationLd.ts';

// The live CMS values as of 2026-10-26.
const settings = {
  company_name: 'Emnel Adventures',
  contact_email: 'safari@emneladventures.com',
  contact_phone: '+255 758 500 037',
  office_address: 'Njiro Complex, Njiro Road',
  city: 'Arusha',
  country: 'Tanzania',
  google_maps_url: 'https://maps.google.com/?cid=13288381676320957514',
  business_hours: 'Mon–Sat, 8am–6pm EAT',
  instagram_url: 'https://www.instagram.com/emneladventures/',
  linkedin_url: 'https://www.linkedin.com/company/emnel-adventures/?originalSubdomain=tz',
  tripadvisor_url: 'https://www.tripadvisor.com/Attraction_Review-g297913-d17634875-Reviews-Emnel_Adventures-Arusha_Arusha_Region.html',
  facebook_url: '',
  logo_url: ''
};
const branding = { company_name: 'Emnel Adventures ', site_name: 'Emnel Adventures Africa', tagline: 'Private Tanzania Safaris, Crafted by Locals.' };

test('the company entity carries the real business details from the CMS', () => {
  const [org, site] = organizationGraph({ origin: 'https://www.emneladventures.com', settings, branding })['@graph'];
  assert.equal(org['@type'], 'TravelAgency');
  assert.equal(org['@id'], 'https://www.emneladventures.com/#organization');
  assert.equal(org.name, 'Emnel Adventures');
  assert.equal(org.legalName, 'Emnel Adventures Limited');
  assert.equal(org.telephone, '+255 758 500 037');
  assert.equal(org.email, 'safari@emneladventures.com');
  assert.deepEqual(org.address, { '@type': 'PostalAddress', streetAddress: 'Njiro Complex, Njiro Road', addressLocality: 'Arusha', addressRegion: 'Arusha', addressCountry: 'TZ' });
  assert.equal(org.logo.url, 'https://www.emneladventures.com/emnel-icon.png');
  assert.equal(org.hasMap, 'https://maps.google.com/?cid=13288381676320957514');
  assert.equal(org.founder.name, 'Nelson Laizer');
  assert.equal(org.foundingDate, '2016');
  assert.deepEqual(org.openingHoursSpecification[0].dayOfWeek, ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
  // Every profile, deduped, empty ones dropped, SafariBookings added.
  assert.equal(org.sameAs.length, 4);
  assert.ok(org.sameAs.includes('https://www.safaribookings.com/p6339'));
  // One name everywhere; the longer brand name is an alternate.
  assert.equal(site.name, 'Emnel Adventures');
  assert.equal(site.alternateName, 'Emnel Adventures Africa');
  assert.equal(site.publisher['@id'], org['@id']);
});

test('nothing invented when a detail is missing', () => {
  const [org] = organizationGraph({ origin: 'https://x.test', settings: { company_name: 'Emnel Adventures' }, branding: {} })['@graph'];
  for (const key of ['telephone', 'email', 'address', 'hasMap', 'openingHoursSpecification', 'contactPoint']) assert.ok(!(key in org), key);
});

test('business hours are parsed only when certain', () => {
  assert.deepEqual(parseBusinessHours('Mon–Sat, 8am–6pm EAT'), {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    opens: '08:00',
    closes: '18:00'
  });
  assert.equal(parseBusinessHours('Mon-Fri 8:30am - 5:15pm').closes, '17:15');
  assert.equal(parseBusinessHours('By appointment'), null);
  assert.equal(parseBusinessHours('Sat–Mon, 8am–6pm'), null);
});

test('profile links lose tracking tags', () => {
  assert.equal(
    cleanProfileUrl('https://www.google.com/maps/search/?api=1&query=Emnel+Adventures&utm_source=chatgpt.com'),
    'https://www.google.com/maps/search/?api=1&query=Emnel+Adventures'
  );
  assert.equal(cleanProfileUrl('javascript:alert(1)'), '');
});
