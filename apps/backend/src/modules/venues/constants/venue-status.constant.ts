export enum VenueStatusChangeKindEnum {
	// First seen by a city-wide scrape after the city's first one, open, with few reviews
	OPENED = 'opened',
	TEMPORARILY_CLOSED = 'temporarily_closed',
	PERMANENTLY_CLOSED = 'permanently_closed',
	// Open again after either closure
	REOPENED = 'reopened',
}

/** Which Google Maps scrape saw a venue's change. */
export enum VenueScrapeSourceEnum {
	// The city-wide Places list (`SCRAPE_VENUES`)
	CITY = 'city',
	// Names that mentions named (`LOOKUP_VENUES`): an old place found late, never an opening
	LOOKUP = 'lookup',
	// Detail pages of known venues (`REFRESH_VENUE_DETAILS`, the busyness sample)
	DETAILS = 'details',
}

/**
 * A place first seen by a city scrape counts as opened only below this many Google reviews: a
 * capped city scrape returns a different slice of the city each time, so an old place the last
 * one missed would otherwise read as new.
 */
export const OPENING_MAX_REVIEWS = 150;

/** A city's Places list is due again this many months after its last city-wide scrape. */
export const CITY_VENUE_SCRAPE_EVERY_MONTHS = 3;
