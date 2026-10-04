import { toMetaText } from './richtext';
import type { Destination } from './types';

export function destinationSeo(destination: Destination) {
  return {
    title: destination.meta_title?.trim() || `${destination.name} Safaris — ${destination.country || 'Tanzania'} | Emnel Adventures`,
    description: toMetaText(destination.meta_description || destination.short_description || destination.description, 160),
    image: destination.og_image_url || destination.banner_image_url || destination.main_image_url || destination.image_url || ''
  };
}

export function destinationStructuredData(destination: Destination, origin: string) {
  const seo = destinationSeo(destination);
  const url = `${origin.replace(/\/$/, '')}/destinations/${destination.slug}`;
  const latitude = destination.latitude == null ? NaN : Number(destination.latitude);
  const longitude = destination.longitude == null ? NaN : Number(destination.longitude);
  return {
    '@type': 'TouristDestination',
    '@id': `${url}#destination`,
    name: destination.name,
    description: seo.description,
    url,
    ...(seo.image ? { image: seo.image } : {}),
    ...(destination.country ? { address: { '@type': 'PostalAddress', addressCountry: destination.country, ...(destination.region ? { addressRegion: destination.region } : {}) } } : {}),
    ...(Number.isFinite(latitude) && Number.isFinite(longitude) ? { geo: { '@type': 'GeoCoordinates', latitude, longitude } } : {})
  };
}
