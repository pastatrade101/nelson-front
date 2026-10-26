// The company as structured data: the TravelAgency + WebSite graph every public
// page carries. Search engines and AI assistants use it to tie the site, its
// tours and its reviews to one real business — name, address, phone and
// profiles that match the Google Business Profile.
//
// Contact details come from CMS settings (Admin › Settings), so a new phone
// number or address reaches the markup without a deploy. The facts below are
// the company's history, already published on the About page; they change
// rarely enough to live in code.

export const COMPANY_FACTS = {
  legalName: 'Emnel Adventures Limited',
  foundingDate: '2016',
  founder: 'Nelson Laizer',
  // Profiles the settings page has no field for.
  profiles: ['https://www.safaribookings.com/p6339'],
  // Where trips run: the two countries sold, and Zanzibar, named on its own
  // because travellers (and assistants) search for it on its own.
  areaServed: [
    { '@type': 'Country', name: 'Tanzania' },
    { '@type': 'AdministrativeArea', name: 'Zanzibar' },
    { '@type': 'Country', name: 'Kenya' }
  ],
  // The office as pinned on the Google Business Profile (Njiro, Arusha).
  geo: { latitude: -3.3924186, longitude: 36.7048594 },
  // Square brand mark: Google wants a logo of at least 112×112 that reads on
  // white. The navbar wordmark is white lettering, 106 px tall — it fails both.
  logoPath: '/emnel-icon.png'
} as const;

type Settings = Record<string, unknown>;

const text = (settings: Settings, key: string) => {
  const value = settings[key];
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
};

const COUNTRY_CODES: Record<string, string> = { tanzania: 'TZ', kenya: 'KE', uganda: 'UG', rwanda: 'RW' };

/** An http(s) address without tracking parameters, or '' — profile links are often pasted from tagged URLs. */
export const cleanProfileUrl = (raw: string): string => {
  try {
    const url = new URL(raw.trim());
    if (!/^https?:$/.test(url.protocol)) return '';
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid$|gclid$|igshid$|srsltid$|_ga$)/i.test(key)) url.searchParams.delete(key);
    }
    return url.toString();
  } catch {
    return '';
  }
};

const DAYS: Record<string, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday'
};
const DAY_ORDER = Object.keys(DAYS);

const clock = (hour: string, minute: string | undefined, meridiem: string) => {
  let h = Number(hour) % 12;
  if (meridiem.toLowerCase() === 'pm') h += 12;
  return `${String(h).padStart(2, '0')}:${minute ?? '00'}`;
};

/**
 * "Mon–Sat, 8am–6pm EAT" → an OpeningHoursSpecification. Anything it cannot
 * read with certainty is left out rather than guessed: wrong hours on a
 * knowledge panel are worse than none.
 */
export const parseBusinessHours = (value: string) => {
  const match = /^(mon|tue|wed|thu|fri|sat|sun)[a-z]*\s*[–—-]\s*(mon|tue|wed|thu|fri|sat|sun)[a-z]*\W+(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*[–—-]\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i.exec(value.trim());
  if (!match) return null;
  const [, fromDay, toDay, oh, om, omer, ch, cm, cmer] = match;
  const start = DAY_ORDER.indexOf(fromDay.toLowerCase());
  const end = DAY_ORDER.indexOf(toDay.toLowerCase());
  if (start === -1 || end === -1 || end < start) return null;
  return {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: DAY_ORDER.slice(start, end + 1).map((d) => DAYS[d]),
    opens: clock(oh, om, omer),
    closes: clock(ch, cm, cmer)
  };
};

/** The TravelAgency + WebSite graph for every public page. */
export const organizationGraph = ({
  origin,
  settings,
  branding
}: {
  origin: string;
  settings: Settings;
  branding: { company_name?: string | null; site_name?: string | null; tagline?: string | null; logo_url?: string | null };
}) => {
  const home = `${origin}/`;
  const orgId = `${home}#organization`;
  const name = text(settings, 'company_name') || (branding.company_name ?? '').trim() || 'Emnel Adventures';
  const siteName = (branding.site_name ?? '').trim();
  const phone = text(settings, 'contact_phone');
  const email = text(settings, 'contact_email');
  const street = text(settings, 'office_address');
  const city = text(settings, 'city');
  const country = text(settings, 'country');
  const map = cleanProfileUrl(text(settings, 'google_maps_url'));
  const hours = parseBusinessHours(text(settings, 'business_hours'));
  const logoUrl = text(settings, 'logo_url') || COMPANY_FACTS.logoPath;
  const absolute = (url: string) => (/^https?:\/\//i.test(url) ? url : `${origin}${url.startsWith('/') ? '' : '/'}${url}`);

  const sameAs = [
    ...['facebook_url', 'instagram_url', 'youtube_url', 'tiktok_url', 'linkedin_url', 'tripadvisor_url'].map((key) =>
      cleanProfileUrl(text(settings, key))
    ),
    ...COMPANY_FACTS.profiles
  ].filter((url, i, all) => url && all.indexOf(url) === i);

  const organization: Record<string, unknown> = {
    '@id': orgId,
    '@type': 'TravelAgency',
    name,
    legalName: COMPANY_FACTS.legalName,
    url: home,
    logo: { '@type': 'ImageObject', url: absolute(logoUrl) },
    image: absolute(logoUrl),
    ...(branding.tagline?.trim() ? { slogan: branding.tagline.trim() } : {}),
    ...(phone ? { telephone: phone } : {}),
    ...(email ? { email } : {}),
    ...(street || city || country
      ? {
          address: {
            '@type': 'PostalAddress',
            ...(street ? { streetAddress: street } : {}),
            ...(city ? { addressLocality: city, addressRegion: city } : {}),
            ...(country ? { addressCountry: COUNTRY_CODES[country.toLowerCase()] ?? country } : {})
          }
        }
      : {}),
    geo: { '@type': 'GeoCoordinates', ...COMPANY_FACTS.geo },
    ...(map ? { hasMap: map } : {}),
    ...(hours ? { openingHoursSpecification: [hours] } : {}),
    ...(phone || email
      ? {
          contactPoint: [
            {
              '@type': 'ContactPoint',
              contactType: 'reservations',
              ...(phone ? { telephone: phone } : {}),
              ...(email ? { email } : {}),
              availableLanguage: ['English', 'Swahili']
            }
          ]
        }
      : {}),
    foundingDate: COMPANY_FACTS.foundingDate,
    founder: { '@type': 'Person', name: COMPANY_FACTS.founder },
    areaServed: COMPANY_FACTS.areaServed,
    ...(sameAs.length ? { sameAs } : {})
  };

  const website = {
    '@id': `${home}#website`,
    '@type': 'WebSite',
    // One name for the business everywhere; the longer brand name the
    // branding settings use is kept as an alternate, not a second identity.
    name,
    ...(siteName && siteName !== name ? { alternateName: siteName } : {}),
    url: home,
    publisher: { '@id': orgId },
    inLanguage: 'en'
  };

  return { '@graph': [organization, website] };
};
