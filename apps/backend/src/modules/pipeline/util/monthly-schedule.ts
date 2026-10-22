// When the monthly run starts: the 2nd of every month, 06:00 UTC (pg-boss crons run in UTC),
// for the month that just ended, so its reviews are all in
export const MONTHLY_PIPELINE_CRON = '0 6 2 * *';

/** The next time `MONTHLY_PIPELINE_CRON` fires after `now`. */
export const nextMonthlyRunAt = (now = new Date()): Date => {
	const thisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 2, 6));
	return thisMonth > now ? thisMonth : (
			new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 2, 6))
		);
};

/**
 * Whether the city's Places list is due (`SCRAPE_VENUES`, quarterly): never scraped, or last
 * scraped `CITY_VENUE_SCRAPE_EVERY_MONTHS` ago, give or take the week a run takes to land.
 */
export const cityVenueScrapeDue = (
	venuesScrapedAt: Date | null | undefined,
	now = new Date(),
	everyMonths = 3,
): boolean => {
	if (!venuesScrapedAt) return true;
	const due = new Date(venuesScrapedAt);
	due.setUTCMonth(due.getUTCMonth() + everyMonths);
	due.setUTCDate(due.getUTCDate() - 7);
	return due <= now;
};

// The weekly review watch: Mondays, 05:00 UTC, an hour before a monthly run on the same day
export const REVIEW_WATCH_CRON = '0 5 * * 1';

// The daily Instagram scrape: 04:00 UTC, before any other cron of the day
export const INSTAGRAM_RECENT_CRON = '0 4 * * *';

/**
 * How far back the daily Instagram scrape keeps posts: the run before was a day ago, so two days
 * leave no gap at a month's turn (the run's month is only a label).
 */
export const INSTAGRAM_RECENT_DAYS = 2;

// The weekly listening (TikTok searches and hashtags, Instagram reels): Sundays, 03:00 UTC,
// before the daily Instagram scrape
export const WEEKLY_LISTENING_CRON = '0 3 * * 0';

/**
 * How far back the weekly runs keep posts: the week since the last one plus a day of slack, so a
 * late run leaves no gap (the run's month is only a label). TikTok's search asks for `WEEK`.
 */
export const WEEKLY_LISTENING_DAYS = 8;
