export enum PipelineStepEnum {
	SCRAPE_VENUES = 'SCRAPE_VENUES',
	// Every confirmed brand's name on Google Maps in the city, for branches that opened since
	// (the quarterly cron, after SCRAPE_VENUES); new ones are offered, never added
	SEARCH_BRANCHES = 'SEARCH_BRANCHES',
	// OpenStreetMap's food places in the city, each linked to the venue it is (free; the
	// monthly cron, before MONTHLY): the checklist the venue list is measured against
	SYNC_OSM_PLACES = 'SYNC_OSM_PLACES',
	// The OSM places no venue is, searched on Google Maps by name and address, once each
	LOOKUP_OSM_PLACES = 'LOOKUP_OSM_PLACES',
	// The month-end TikTok pass: the searches over three months and a short page of each hashtag,
	// kept from the month's start; the weekly SCRAPE_TIKTOK_RECENT collects most of the month
	SCRAPE_TIKTOK = 'SCRAPE_TIKTOK',
	// The city's TikTok searches over the last week and a short page of each hashtag (the weekly
	// cron): hashtag feeds ignore dates, so only scraping through the month finds its videos
	SCRAPE_TIKTOK_RECENT = 'SCRAPE_TIKTOK_RECENT',
	SCRAPE_INSTAGRAM = 'SCRAPE_INSTAGRAM',
	// The newest page of each Instagram hashtag (the daily cron): on Apify's Free plan a hashtag
	// gives one page a run, about a day of posts on a busy tag
	SCRAPE_INSTAGRAM_RECENT = 'SCRAPE_INSTAGRAM_RECENT',
	// Each Instagram hashtag's top reels of the last week (the weekly cron, with the TikTok one):
	// the posts feed returns no reels, and reels carry the views
	SCRAPE_INSTAGRAM_REELS = 'SCRAPE_INSTAGRAM_REELS',
	// The city's food blogs through their feeds: each new article a post (free; the weekly cron
	// and the month end)
	SCRAPE_BLOGS = 'SCRAPE_BLOGS',
	EXTRACT_MENTIONS = 'EXTRACT_MENTIONS',
	MATCH_MENTIONS = 'MATCH_MENTIONS',
	LOOKUP_VENUES = 'LOOKUP_VENUES',
	SCRAPE_VENUE_SOCIAL = 'SCRAPE_VENUE_SOCIAL',
	// Report brands with no competitors get their best suggestions (free; before the review
	// scrape, so the competitors' reviews come in the same run); brands with any are left alone
	FILL_COMPETITORS = 'FILL_COMPETITORS',
	SCRAPE_REVIEWS = 'SCRAPE_REVIEWS',
	ANALYSE_REVIEWS = 'ANALYSE_REVIEWS',
	// Google Maps detail pages (hours, amenities, popular times) of report venues and competitors
	REFRESH_VENUE_DETAILS = 'REFRESH_VENUE_DETAILS',
	// Every watched TikTok and Instagram account (`AccountWatchService`: the creators the city
	// follows, the report brands' and their rivals' own accounts): their posts since the month
	// began and the month's profile snapshot (followers, reach per post)
	SCRAPE_ACCOUNTS = 'SCRAPE_ACCOUNTS',
	// The same accounts' posts of the last week (the weekly cron), no snapshot
	SCRAPE_ACCOUNTS_RECENT = 'SCRAPE_ACCOUNTS_RECENT',
	// Brands' own accounts on the platform they have none on: their other account's handle looked
	// up there, linked when the profile proves it (the weekly cron, after matching)
	FIND_OWN_ACCOUNTS = 'FIND_OWN_ACCOUNTS',
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
	// Google rating and review count of every venue posts named in the last 30 days and every
	// one with 500+ reviews (`RatingSnapshotService`, the twice-weekly rating cron)
	SNAPSHOT_RATINGS = 'SNAPSHOT_RATINGS',
	// Wolt / Lieferando ratings, fees and menus of the report venues and competitors
	SCRAPE_DELIVERY = 'SCRAPE_DELIVERY',
	// Every step above but the venue list, in order, for one month
	MONTHLY = 'MONTHLY',
}

// The monthly run, in order: city-wide posts and blog articles, their mentions, filling in missing venues,
// then the most talked-about brands' posts (searched by name, and the watched accounts' own
// profiles), competitors for those without, their reviews, their Google Maps details (hours,
// amenities, popular times) and their reports, and last the outreach lead scores over everything
// gathered. A stored run's result is keyed by position ("<n>. <STEP>"), so reordering needs a
// migration re-keying stored results (`Migration20261025050000_watched_accounts`)
export const MONTHLY_STEPS: PipelineStepEnum[] = [
	PipelineStepEnum.SCRAPE_TIKTOK,
	PipelineStepEnum.SCRAPE_INSTAGRAM,
	PipelineStepEnum.SCRAPE_BLOGS,
	PipelineStepEnum.EXTRACT_MENTIONS,
	PipelineStepEnum.MATCH_MENTIONS,
	PipelineStepEnum.LOOKUP_VENUES,
	PipelineStepEnum.MATCH_MENTIONS,
	PipelineStepEnum.SCRAPE_VENUE_SOCIAL,
	// Before extraction: the profiles' posts are read and matched with the rest
	PipelineStepEnum.SCRAPE_ACCOUNTS,
	PipelineStepEnum.EXTRACT_MENTIONS,
	PipelineStepEnum.MATCH_MENTIONS,
	// After the last match: the report brands are final here, and the review scrape takes
	// their competitors
	PipelineStepEnum.FILL_COMPETITORS,
	PipelineStepEnum.SCRAPE_REVIEWS,
	PipelineStepEnum.ANALYSE_REVIEWS,
	PipelineStepEnum.REFRESH_VENUE_DETAILS,
	// After the details: Google's "Order online" links say where each venue delivers
	PipelineStepEnum.SCRAPE_DELIVERY,
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
	// One result a place at ~$0.004, planned on 80 % of it: about 2,000 places
	[PipelineStepEnum.LOOKUP_OSM_PLACES]: 10,
	// TikTok, ~$15 a month in all. Each run's search share is the larger of 40 % and the search
	// actor's $4 floor, and spends far less (~$0.60 for 24 queries); hashtags take the rest at
	// ~$0.0037 an item, their page size cut to fit. Month end: $3 of hashtags (~40 a tag)
	[PipelineStepEnum.SCRAPE_TIKTOK]: 7,
	// Weekly: $2 of hashtags (~25 a tag) and the week's searches, ~$2.60 a week spent
	[PipelineStepEnum.SCRAPE_TIKTOK_RECENT]: 6,
	[PipelineStepEnum.SCRAPE_INSTAGRAM]: 8,
	// One page (up to ~27 posts) of twenty hashtags at $0.0027 a post is about $1.50
	[PipelineStepEnum.SCRAPE_INSTAGRAM_RECENT]: 2,
	// A few top reels a tag at $0.0027 (twenty tags: ~40 reels, ~$0.11)
	[PipelineStepEnum.SCRAPE_INSTAGRAM_REELS]: 1,
	[PipelineStepEnum.LOOKUP_VENUES]: 6,
	// Half to the TikTok search, whose actor refuses a cap under $4
	[PipelineStepEnum.SCRAPE_VENUE_SOCIAL]: 8,
	// $0.0006 a Google review (Berlin 2026-09: ~6,300 for 127 venues, ~$3.80). A tenth to
	// TripAdvisor, then of the $10.80 left the month takes 60 % ($6.48) and the backfill of
	// venues new to the set 40 % ($4.32: ~7,200 reviews, ~22 venues at seven months of ~47)
	[PipelineStepEnum.SCRAPE_REVIEWS]: 12,
	[PipelineStepEnum.REFRESH_VENUE_DETAILS]: 2,
	// Instagram profiles at ~$0.0026 each (twelve latest posts included), TikTok's latest ten
	// videos at ~$0.003 each: ~100 accounts, mostly TikTok's videos, about $2
	[PipelineStepEnum.SCRAPE_ACCOUNTS]: 4,
	// The week's videos only (TikTok's date filter), so a quiet account costs a profile at most
	[PipelineStepEnum.SCRAPE_ACCOUNTS_RECENT]: 2,
	// An Instagram profile at ~$0.003, a TikTok one (its latest video) at ~$0.004: ~300 lookups.
	// Each account is looked up once, so the weekly run spends only on brands new to an account
	[PipelineStepEnum.FIND_OWN_ACCOUNTS]: 1,
	// A hundred comments under each of ~100 posts at $0.00125 a comment
	[PipelineStepEnum.SCRAPE_COMMENTS]: 13,
	[PipelineStepEnum.SCRAPE_PRESS]: 3,
	// Up to three searches of twenty places per report branch, ~$0.06 a search (Berlin 2026-09:
	// 42 searches for 20 branches, $2.42); every branch of a chain counts, about a third more
	[PipelineStepEnum.TRACK_SEARCH_RANKS]: 4,
	// Two runs of signalbench/google-trends-scraper (~110 food topics, then the won venues) at
	// ~$0.004 a term; the actor refuses a cap under $1, so each run gets at least that
	[PipelineStepEnum.SEARCH_INTEREST]: 2,
	[PipelineStepEnum.WATCH_REVIEWS]: 1,
	[PipelineStepEnum.SAMPLE_BUSYNESS]: 1,
	[PipelineStepEnum.SAMPLE_RESERVATIONS]: 1,
	// One review a venue at $0.0006, planned on 80 %: up to 4,000 venues (Berlin 2026-10: ~3,300,
	// about $2 a run, $16 a month)
	[PipelineStepEnum.SNAPSHOT_RATINGS]: 3,
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

/**
 * How many months before the report month a venue's first `SCRAPE_REVIEWS` starts (a venue with
 * no Google review stored from before the month): the report's previous month and the
 * correlations' six-month window need them. Paid once per venue.
 */
export const REVIEW_BACKFILL_MONTHS = 6;

/**
 * The backfill's share of `SCRAPE_REVIEWS`' Google budget at most, so the month's own reviews
 * of the venues already tracked always fit. All of it when no venue is tracked yet.
 */
export const REVIEW_BACKFILL_BUDGET_SHARE = 0.4;
