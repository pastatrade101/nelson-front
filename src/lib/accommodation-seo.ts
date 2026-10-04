import { toMetaText } from './richtext';
import type { Lodge } from './types';

export function accommodationSeo(lodge: Lodge) {
  return {
    title: toMetaText(lodge.seo_title || lodge.meta_title || `${lodge.name} — ${lodge.destinations?.name || lodge.country || 'Tanzania'} | Emnel Adventures`, 180),
    description: toMetaText(lodge.meta_description || lodge.short_description || lodge.why_we_recommend || lodge.description || `Explore ${lodge.name}, a hand-picked stay for your private Tanzania safari with Emnel Adventures.`, 160),
    image: lodge.social_image_url || lodge.hero_image_url || lodge.lodge_images?.find(i => i.is_cover)?.image_url || lodge.lodge_images?.[0]?.image_url || lodge.image_url || ''
  };
}

export function accommodationStructuredData(lodge: Lodge, origin: string) {
  const seo = accommodationSeo(lodge);
  const url = `${origin.replace(/\/$/, '')}/accommodation/${lodge.slug}`;
  const lat = lodge.latitude == null ? NaN : Number(lodge.latitude);
  const lng = lodge.longitude == null ? NaN : Number(lodge.longitude);
  return {
    '@type': 'LodgingBusiness', '@id': `${url}#property`, name: lodge.name, url, description: seo.description,
    ...(seo.image ? { image: seo.image } : {}),
    ...(lodge.country || lodge.region || lodge.destinations?.name ? { address: {
      '@type': 'PostalAddress', ...(lodge.country ? { addressCountry: lodge.country } : {}),
      ...(lodge.region || lodge.destinations?.name ? { addressRegion: lodge.region || lodge.destinations?.name } : {})
    } } : {}),
    ...(Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { geo: { '@type': 'GeoCoordinates', latitude: lat, longitude: lng } } : {}),
    ...(lodge.show_rates_publicly === true && lodge.price_per_night_from != null ? { priceRange: `${lodge.currency || 'USD'} ${lodge.price_per_night_from}+ per night` } : {})
  };
}
