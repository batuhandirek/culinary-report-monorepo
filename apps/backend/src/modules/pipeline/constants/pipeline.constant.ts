export enum PipelineStepEnum {
	SCRAPE_VENUES = 'SCRAPE_VENUES',
	// Every confirmed brand's name on Google Maps in the city, for branches that opened since
	// (the quarterly cron, after SCRAPE_VENUES); new ones are offered, never added
	SEARCH_BRANCHES = 'SEARCH_BRANCHES',
	SCRAPE_TIKTOK = 'SCRAPE_TIKTOK',
	SCRAPE_INSTAGRAM = 'SCRAPE_INSTAGRAM',
	// The newest page of each Instagram hashtag (the daily cron): on Apify's Free plan a hashtag
	// gives one page a run, about a day of posts on a busy tag
	SCRAPE_INSTAGRAM_RECENT = 'SCRAPE_INSTAGRAM_RECENT',
	EXTRACT_MENTIONS = 'EXTRACT_MENTIONS',
	MATCH_MENTIONS = 'MATCH_MENTIONS',
	LOOKUP_VENUES = 'LOOKUP_VENUES',
	SCRAPE_VENUE_SOCIAL = 'SCRAPE_VENUE_SOCIAL',
	SCRAPE_REVIEWS = 'SCRAPE_REVIEWS',
	ANALYSE_REVIEWS = 'ANALYSE_REVIEWS',
	// Google Maps detail pages (hours, amenities, popular times) of report venues and competitors
	REFRESH_VENUE_DETAILS = 'REFRESH_VENUE_DETAILS',
	// The report venues' own TikTok and Instagram accounts: followers, posts, reach per post
	SCRAPE_OWN_ACCOUNTS = 'SCRAPE_OWN_ACCOUNTS',
	// Comments under each report venue's top TikTok posts of the month, then their intents
	SCRAPE_COMMENTS = 'SCRAPE_COMMENTS',
	ANALYSE_COMMENTS = 'ANALYSE_COMMENTS',
	// Google News and web search for the report venues' press and listicle mentions
	SCRAPE_PRESS = 'SCRAPE_PRESS',
	// The report venues' places on the Google Maps searches a guest would type ("ramen Mitte")
	TRACK_SEARCH_RANKS = 'TRACK_SEARCH_RANKS',
	// Google Trends: search interest per cuisine and won venue over twelve months, in the city's region
	SEARCH_INTEREST = 'SEARCH_INTEREST',
	BUILD_REPORTS = 'BUILD_REPORTS',
	// Venue lead scores for outreach: SQL only, free
	SCORE_LEADS = 'SCORE_LEADS',
	// The weekly review watch: subscribers' reviews of the last ten days, alerts on critical ones
	WATCH_REVIEWS = 'WATCH_REVIEWS',
	// Google popular times of the report venues and competitors (the twice-weekly demand cron)
	SAMPLE_BUSYNESS = 'SAMPLE_BUSYNESS',
	// Open evening tables of every venue with a booking page (Google's own, TheFork, OpenTable),
	// won prospects and report venues first (the Thursday demand cron)
	SAMPLE_RESERVATIONS = 'SAMPLE_RESERVATIONS',
	// Wolt / Lieferando ratings, fees and menus of the report venues and competitors
	SCRAPE_DELIVERY = 'SCRAPE_DELIVERY',
	// Every step above but the venue list, in order, for one month
	MONTHLY = 'MONTHLY',
}

// The monthly run, in order: city-wide posts, their mentions, filling in missing venues,
// then the most talked-about brands' own posts, their reviews, their Google Maps details
// (hours, amenities, popular times) and their reports, and last the
// outreach lead scores over everything gathered
export const MONTHLY_STEPS: PipelineStepEnum[] = [
	PipelineStepEnum.SCRAPE_TIKTOK,
	PipelineStepEnum.SCRAPE_INSTAGRAM,
	PipelineStepEnum.EXTRACT_MENTIONS,
	PipelineStepEnum.MATCH_MENTIONS,
	PipelineStepEnum.LOOKUP_VENUES,
	PipelineStepEnum.MATCH_MENTIONS,
	PipelineStepEnum.SCRAPE_VENUE_SOCIAL,
	PipelineStepEnum.EXTRACT_MENTIONS,
	PipelineStepEnum.MATCH_MENTIONS,
	PipelineStepEnum.SCRAPE_REVIEWS,
	PipelineStepEnum.ANALYSE_REVIEWS,
	PipelineStepEnum.REFRESH_VENUE_DETAILS,
	// After the details: Google's "Order online" links say where each venue delivers
	PipelineStepEnum.SCRAPE_DELIVERY,
	PipelineStepEnum.SCRAPE_OWN_ACCOUNTS,
	PipelineStepEnum.SCRAPE_COMMENTS,
	PipelineStepEnum.ANALYSE_COMMENTS,
	PipelineStepEnum.SCRAPE_PRESS,
	PipelineStepEnum.TRACK_SEARCH_RANKS,
	// Before the reports: their city section quotes the search changes
	PipelineStepEnum.SEARCH_INTEREST,
	PipelineStepEnum.BUILD_REPORTS,
	PipelineStepEnum.SCORE_LEADS,
];

/** What a step spends on Apify at most, when the admin gives no budget. */
export const DEFAULT_STEP_BUDGET_USD: Partial<Record<PipelineStepEnum, number>> = {
	[PipelineStepEnum.SCRAPE_VENUES]: 20,
	// Forty places a brand at ~$0.004 a place: about $0.16 a brand
	[PipelineStepEnum.SEARCH_BRANCHES]: 2,
	[PipelineStepEnum.SCRAPE_TIKTOK]: 15,
	[PipelineStepEnum.SCRAPE_INSTAGRAM]: 8,
	// One page (up to ~27 posts) of twenty hashtags at $0.0027 a post is about $1.50
	[PipelineStepEnum.SCRAPE_INSTAGRAM_RECENT]: 2,
	[PipelineStepEnum.LOOKUP_VENUES]: 6,
	// Half to the TikTok search, whose actor refuses a cap under $4
	[PipelineStepEnum.SCRAPE_VENUE_SOCIAL]: 8,
	[PipelineStepEnum.SCRAPE_REVIEWS]: 5,
	[PipelineStepEnum.REFRESH_VENUE_DETAILS]: 2,
	[PipelineStepEnum.SCRAPE_OWN_ACCOUNTS]: 2,
	// A hundred comments under each of ~100 posts at $0.00125 a comment
	[PipelineStepEnum.SCRAPE_COMMENTS]: 13,
	[PipelineStepEnum.SCRAPE_PRESS]: 3,
	// Three searches of twenty places per report venue: about $0.03 each
	[PipelineStepEnum.TRACK_SEARCH_RANKS]: 3,
	// Two runs of signalbench/google-trends-scraper (~110 food topics, then the won venues) at
	// ~$0.004 a term; the actor refuses a cap under $1, so each run gets at least that
	[PipelineStepEnum.SEARCH_INTEREST]: 2,
	[PipelineStepEnum.WATCH_REVIEWS]: 1,
	[PipelineStepEnum.SAMPLE_BUSYNESS]: 1,
	[PipelineStepEnum.SAMPLE_RESERVATIONS]: 1,
	// Wolt menus on 30 %, then Lieferando's city listing, whose actor refuses a cap under $5
	[PipelineStepEnum.SCRAPE_DELIVERY]: 7,
};

/** How many of the month's most talked-about venues get reviews, venue scrapes and reports. */
export const DEFAULT_TOP_VENUES = 20;

/**
 * How many venues one `SAMPLE_RESERVATIONS` run samples at most: Google's booking page is free
 * but paced (two dates × two loads a venue, ~1.5 s apart), so 600 venues take about an hour.
 */
export const RESERVATION_SAMPLE_MAX_VENUES = 600;

/** How far back the weekly review watch scrapes: a week plus slack for a late run. */
export const REVIEW_WATCH_DAYS = 10;
