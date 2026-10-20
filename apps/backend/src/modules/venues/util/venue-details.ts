import type {
	OpeningHoursDay,
	OrderPlatform,
	PeopleAlsoSearchPlace,
	PopularTimesHour,
	ReviewsDistribution,
	VenueDetails,
} from '../interfaces/venue-details.interface.js';

/** The `compass/crawler-google-places` fields `VenueDetails` is read from, as the actor sends them. */
export interface GooglePlaceDetailFields {
	openingHours?: OpeningHoursDay[] | null;
	// `{ 'Service options': [{ 'Outdoor seating': true }, { Delivery: false }] }`
	additionalInfo?: Record<string, Record<string, boolean>[]> | null;
	reviewsDistribution?: ReviewsDistribution | null;
	// `{ Mo: [{ hour: 6, occupancyPercent: 0 }, …], … }`; `{}` when Google shows none
	popularTimesHistogram?: Record<string, PopularTimesHour[]> | null;
	popularTimesLivePercent?: number | null;
	popularTimesLiveText?: string | null;
	imagesCount?: number | null;
	menu?: string | null;
	reserveTableUrl?: string | null;
	orderBy?: { name?: string; url?: string; orderUrl?: string }[] | null;
	temporarilyClosed?: boolean | null;
	placesTags?: { title: string; count: number }[] | null;
	reviewsTags?: { title?: string; count?: number }[] | null;
	peopleAlsoSearch?:
		| {
				title?: string;
				category?: string;
				totalScore?: number | null;
				reviewsCount?: number | null;
		  }[]
		| null;
}

const POPULAR_TIMES_DAYS = new Set(['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']);

const filled = <T>(value: T[] | null | undefined): T[] | undefined =>
	value?.length ? value : undefined;

/**
 * The details an item carries, in our shape. A list scrape sends empty placeholders
 * (`popularTimesHistogram: {}`, `peopleAlsoSearch: []`, `menu: null`) for what only a detail
 * page fills: those count as absent, so they never erase what a detail page stored.
 */
export function venueDetailsFromItem(item: GooglePlaceDetailFields): VenueDetails {
	const details: VenueDetails = {};

	if (filled(item.openingHours)) details.openingHours = item.openingHours!;

	const amenities: NonNullable<VenueDetails['amenities']> = {};
	for (const [section, options] of Object.entries(item.additionalInfo ?? {})) {
		const flat = Object.assign({}, ...(options ?? [])) as Record<string, boolean>;
		if (Object.keys(flat).length) amenities[section] = flat;
	}
	if (Object.keys(amenities).length) details.amenities = amenities;

	if (item.reviewsDistribution) details.reviewsDistribution = item.reviewsDistribution;

	const histogram: NonNullable<VenueDetails['popularTimesHistogram']> = {};
	for (const [day, hours] of Object.entries(item.popularTimesHistogram ?? {})) {
		if (POPULAR_TIMES_DAYS.has(day) && hours?.length) {
			histogram[day as keyof typeof histogram] = hours;
		}
	}
	if (Object.keys(histogram).length) details.popularTimesHistogram = histogram;
	if (item.popularTimesLivePercent != null) {
		details.popularTimesLivePercent = item.popularTimesLivePercent;
	}
	if (item.popularTimesLiveText) details.popularTimesLiveText = item.popularTimesLiveText;

	if (item.imagesCount != null) details.imagesCount = item.imagesCount;
	if (item.menu) details.menu = item.menu;
	if (item.reserveTableUrl) details.reserveTableUrl = item.reserveTableUrl;

	const orderBy: OrderPlatform[] = (item.orderBy ?? [])
		.filter(o => o?.name)
		.map(o => ({
			name: o.name!,
			...((o.url ?? o.orderUrl) ? { url: o.url ?? o.orderUrl } : {}),
		}));
	if (orderBy.length) details.orderBy = orderBy;

	if (item.temporarilyClosed != null) details.temporarilyClosed = item.temporarilyClosed;
	if (filled(item.placesTags)) details.placesTags = item.placesTags!;
	const reviewsTags = (item.reviewsTags ?? [])
		.filter(t => t?.title && typeof t.count === 'number')
		.map(t => ({ title: t.title!, count: t.count! }))
		.sort((a, b) => b.count - a.count);
	if (reviewsTags.length) details.reviewsTags = reviewsTags;

	const peopleAlsoSearch: PeopleAlsoSearchPlace[] = (item.peopleAlsoSearch ?? [])
		.filter(p => p?.title)
		.map(p => ({
			title: p.title!,
			...(p.category ? { category: p.category } : {}),
			...(p.totalScore != null ? { totalScore: p.totalScore } : {}),
			...(p.reviewsCount != null ? { reviewsCount: p.reviewsCount } : {}),
		}));
	if (peopleAlsoSearch.length) details.peopleAlsoSearch = peopleAlsoSearch;

	return details;
}

/**
 * Lays the incoming details over the stored ones: a field the item carries replaces the stored
 * one, a field it lacks is kept. Amenities merge section by section, since a list scrape
 * returns only some sections. Returns `null` when the item carries nothing.
 */
export function mergeVenueDetails(
	current: VenueDetails | null | undefined,
	incoming: VenueDetails,
): VenueDetails | null {
	if (Object.keys(incoming).length === 0) return null;
	const merged: VenueDetails = { ...(current ?? {}), ...incoming };
	if (current?.amenities && incoming.amenities) {
		merged.amenities = { ...current.amenities, ...incoming.amenities };
	}
	return merged;
}

// Sections a guest picks a place by come first; jsonb keeps no key order, so the order is ours
const AMENITY_SECTION_ORDER = [
	'Service options',
	'Highlights',
	'Offerings',
	'Dining options',
	'Atmosphere',
	'Crowd',
	'Planning',
	'Payments',
	'Amenities',
	'Children',
	'Pets',
	'Parking',
	'Accessibility',
];

/**
 * The amenities offered, flat and deduplicated: sections in `AMENITY_SECTION_ORDER` (others
 * after, alphabetically), options alphabetically within a section.
 */
export function offeredAmenities(details: VenueDetails | null | undefined): string[] {
	const rank = (section: string) => {
		const i = AMENITY_SECTION_ORDER.indexOf(section);
		return i === -1 ? AMENITY_SECTION_ORDER.length : i;
	};
	const sections = Object.keys(details?.amenities ?? {}).sort(
		(a, b) => rank(a) - rank(b) || a.localeCompare(b),
	);
	const offered = new Set<string>();
	for (const section of sections) {
		const options = details!.amenities![section];
		for (const option of Object.keys(options).sort((a, b) => a.localeCompare(b))) {
			if (options[option]) offered.add(option);
		}
	}
	return [...offered];
}
