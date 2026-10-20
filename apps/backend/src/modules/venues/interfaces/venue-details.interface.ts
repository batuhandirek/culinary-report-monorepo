// What Google Maps says about a venue beyond its name, address and rating: hours, amenities,
// popular times, "people also search for". Stored as jsonb on the venue (`Venue.details`, dated
// `detailsAt`), merged from every `compass/crawler-google-places` item by `mergeVenueDetails`,
// and sent to the admin as is. Every field is optional: absent means unknown, never "none".

/** Google's two-letter day keys, as the actor returns them in `popularTimesHistogram`. */
export type PopularTimesDay = 'Mo' | 'Tu' | 'We' | 'Th' | 'Fr' | 'Sa' | 'Su';

/** How busy the place usually is in one hour of the day, 0–100 (relative to its own peak). */
export interface PopularTimesHour {
	hour: number;
	occupancyPercent: number;
}

/** Google's popular times: per day, how busy each hour usually is. */
export type PopularTimesHistogram = Partial<Record<PopularTimesDay, PopularTimesHour[]>>;

/** All-time count of Google reviews per star. */
export interface ReviewsDistribution {
	oneStar: number;
	twoStar: number;
	threeStar: number;
	fourStar: number;
	fiveStar: number;
}

/** One day's opening hours as Google words them: `{ day: 'Monday', hours: '5 to 11 PM' }`. */
export interface OpeningHoursDay {
	day: string;
	hours: string;
}

/** A place Google lists under "People also search for". It carries no place id. */
export interface PeopleAlsoSearchPlace {
	title: string;
	category?: string;
	totalScore?: number;
	reviewsCount?: number;
}

/** A delivery or ordering platform Google links from the place ("Order online"). */
export interface OrderPlatform {
	name: string;
	url?: string;
}

export interface VenueDetails {
	openingHours?: OpeningHoursDay[];
	/**
	 * The actor's `additionalInfo`, flattened: section ("Service options", "Accessibility",
	 * "Payments", …) → option ("Outdoor seating", "Delivery", …) → offered or not. A list
	 * scrape returns only some sections (mostly Accessibility); a detail page returns them
	 * all, so sections are merged one by one.
	 */
	amenities?: Record<string, Record<string, boolean>>;
	reviewsDistribution?: ReviewsDistribution;
	/** Detail page only, and often missing (Google shows it mainly to logged-in users). */
	popularTimesHistogram?: PopularTimesHistogram;
	/** How busy it was at scrape time, 0–100; detail page only. */
	popularTimesLivePercent?: number;
	popularTimesLiveText?: string;
	imagesCount?: number;
	/** Link to the menu; detail page only. */
	menu?: string;
	reserveTableUrl?: string;
	/** Delivery platforms; detail page only. */
	orderBy?: OrderPlatform[];
	temporarilyClosed?: boolean;
	/** Google's place-directory tags with counts, e.g. `{ title: 'Food & Drink', count: 37 }`. */
	placesTags?: { title: string; count: number }[];
	/**
	 * What reviews often mention, as Google counts it ("people often mention"): dishes, drinks,
	 * staff, the place, e.g. `{ title: 'vegan meat', count: 12 }`. Detail page only; all-time,
	 * not a month's.
	 */
	reviewsTags?: { title: string; count: number }[];
	/** Google's own similar places; detail page only. */
	peopleAlsoSearch?: PeopleAlsoSearchPlace[];
}
