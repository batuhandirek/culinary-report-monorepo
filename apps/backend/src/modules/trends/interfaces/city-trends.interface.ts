/** A brand named as an example in a trend row. */
export interface TrendVenueRef {
	id: string;
	name: string;
}

/**
 * One row of a trend table: its share of the month and of the month before, in percent, and the
 * change in percentage points. Shares, not counts: the scrape budget moves the counts.
 */
export interface TrendShareRow {
	key: string;
	label: string;
	/** Mentions, sources, posts: what the table counts */
	count: number;
	prevCount: number;
	share: number;
	prevShare: number;
	/** `share - prevShare`, in percentage points */
	delta: number;
	/** Share of the views of the posts counted, where the table has one */
	viewsShare?: number;
	prevViewsShare?: number;
	viewsDelta?: number;
	/** The most named brands of the row (cuisines, dishes) */
	sampleVenues?: TrendVenueRef[];
	/** Creators: the views of their posts and the brands they covered */
	views?: number;
	venues?: number;
	/** The rest of the table folded into one row, so the shares add up to 100 */
	other?: boolean;
}

/** A brand that entered the month's top 50 by posts from others, or climbed in it. */
export interface TrendRisingBrandRow {
	brandId: string;
	name: string;
	district?: string;
	category?: string;
	posts: number;
	prevPosts: number;
	rank: number;
	/** Absent when it was not in the previous month's top 50 */
	prevRank?: number;
	share: number;
	prevShare: number;
	delta: number;
}

export interface CityTrendsTotals {
	/** Matched mentions in posts by others */
	mentions: number;
	/** Their posts */
	posts: number;
	views: number;
	/** Posts and reviews naming at least one dish */
	dishSources: number;
}

/** What the city talked about in a month, against the month before. */
export interface CityTrends {
	month: string;
	previousMonth: string;
	totals: CityTrendsTotals;
	prevTotals: CityTrendsTotals;
	/** By share of mentions; `viewsShare` by share of views */
	cuisines: TrendShareRow[];
	/** By share of the posts and reviews naming a dish */
	dishes: TrendShareRow[];
	/** By share of mentions; `viewsShare` by share of views */
	districts: TrendShareRow[];
	/** By share of views (reach); `count` is posts */
	creators: TrendShareRow[];
	risingBrands: TrendRisingBrandRow[];
}
