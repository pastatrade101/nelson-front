import type { TravelStyle } from '$lib/types';

/**
 * Safari-style cards are tour categories; the copy an editor writes for a style
 * (promise, what they want, concerns, blocks) lives on a travel style. These
 * helpers join the two so a card opens that copy instead of the tour filter.
 *
 * The explicit link (travel_styles.category_id, set in Admin → Travel Styles)
 * wins. Until one is set, a style whose name matches the category exactly is
 * used — "Tanzania Family Safaris" in both places — but never a style that is
 * already linked to a different category.
 */
type CategoryLike = { id?: unknown; name?: unknown; slug?: unknown };

const norm = (value: unknown) =>
	String(value ?? '')
		.toLowerCase()
		.replace(/&/g, ' and ')
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();

export const travelStyleFor = (category: CategoryLike, styles: TravelStyle[]): TravelStyle | null => {
	const live = styles.filter((style) => style?.slug && (!style.status || style.status === 'published'));
	const id = category.id ? String(category.id) : '';
	const linked = id ? live.find((style) => style.category_id === id) : undefined;
	if (linked) return linked;
	const name = norm(category.name);
	if (!name) return null;
	return live.find((style) => !style.category_id && norm(style.name) === name) ?? null;
};

/** Where a safari-style card goes: its travel style page, else the category's own info page. */
export const safariStyleHref = (category: CategoryLike, styles: TravelStyle[]): string => {
	const style = travelStyleFor(category, styles);
	if (style) return `/travel-styles/${style.slug}`;
	return `/experiences/${String(category.slug ?? '')}`;
};

/** The category a travel style belongs to — the reverse of travelStyleFor. */
export const categoryForStyle = <C extends CategoryLike>(style: TravelStyle, categories: C[]): C | null => {
	if (style.category_id) return categories.find((category) => String(category.id ?? '') === style.category_id) ?? null;
	const name = norm(style.name);
	return name ? categories.find((category) => norm(category.name) === name) ?? null : null;
};

type PricedTour = { id?: unknown; category_id?: string | null; price_from?: number | null; currency?: string | null };

/**
 * A travel style's itineraries: the tours its page curates (its "tours" blocks)
 * plus the tours filed under its category. Pass published tours only.
 */
export const styleTours = <T extends PricedTour>(style: TravelStyle, tours: T[]): T[] => {
	const curated = new Set(
		(Array.isArray(style.sections) ? style.sections : []).flatMap((block) =>
			block?.type === 'tours' && Array.isArray(block.tour_ids) ? block.tour_ids.map(String) : []
		)
	);
	return tours.filter((tour) => curated.has(String(tour.id ?? '')) || Boolean(style.category_id && tour.category_id === style.category_id));
};

/** The lowest "from" price per person (USD) among a style's itineraries; null when none has a price. */
export const styleFromPrice = (style: TravelStyle, tours: PricedTour[]): number | null => {
	const prices = styleTours(style, tours)
		.filter((tour) => !tour.currency || tour.currency === 'USD')
		.map((tour) => Number(tour.price_from))
		.filter((price) => Number.isFinite(price) && price > 0);
	return prices.length ? Math.min(...prices) : null;
};
