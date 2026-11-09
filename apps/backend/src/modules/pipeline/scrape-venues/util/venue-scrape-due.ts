/** How often a city's Places list is scraped again: a quarter */
export const CITY_VENUE_SCRAPE_EVERY_MONTHS = 3;

/**
 * Whether the city's Places list is due: never scraped, or last scraped
 * `CITY_VENUE_SCRAPE_EVERY_MONTHS` ago, give or take the week a run takes to land
 */
export const cityVenueScrapeDue = (
	venuesScrapedAt: Date | null | undefined,
	now: Date,
	everyMonths = CITY_VENUE_SCRAPE_EVERY_MONTHS,
): boolean => {
	if (!venuesScrapedAt) return true;
	const due = new Date(venuesScrapedAt);
	due.setUTCMonth(due.getUTCMonth() + everyMonths);
	due.setUTCDate(due.getUTCDate() - 7);
	return due <= now;
};
