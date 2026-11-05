import type { PipelineRunParams } from '../entities/pipeline-run.entity.js';

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
	// The month-end TikTok pass: the city's searches and hashtag words searched over the last
	// month, kept from the month's start; the weekly SCRAPE_TIKTOK_RECENT collects most of the month
	SCRAPE_TIKTOK = 'SCRAPE_TIKTOK',
	// The city's TikTok searches and hashtag words, searched over the last week (the weekly cron).
	// A hashtag's own feed has no date filter (half of it was over three months old), so its word
	// is searched instead
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
	// The reading steps, for an admin's run: the crons and MONTHLY leave reading to
	// `IngestionService` (the hourly pass and the one each scrape run queues)
	EXTRACT_MENTIONS = 'EXTRACT_MENTIONS',
	MATCH_MENTIONS = 'MATCH_MENTIONS',
	LOOKUP_VENUES = 'LOOKUP_VENUES',
	SCRAPE_VENUE_SOCIAL = 'SCRAPE_VENUE_SOCIAL',
	// TikTok searches by brand name over the last week (the weekly cron): the last finished month's
	// report brands (customers included), their competitors and the open prospects
	SCRAPE_VENUE_SOCIAL_RECENT = 'SCRAPE_VENUE_SOCIAL_RECENT',
	// Report brands with no competitors get their best suggestions (free; before the review
	// scrape, so the competitors' reviews come in the same run); brands with any are left alone
	FILL_COMPETITORS = 'FILL_COMPETITORS',
	SCRAPE_REVIEWS = 'SCRAPE_REVIEWS',
	// A one-off: the Google reviews since `params.since` of every open venue posts named in the
	// last `params.talkedDays` that has none stored from then (started by hand, or an `ONE_OFF_RUNS`
	// entry)
	BACKFILL_REVIEWS = 'BACKFILL_REVIEWS',
	ANALYSE_REVIEWS = 'ANALYSE_REVIEWS',
	// Google Maps detail pages (hours, amenities, popular times) of report venues and competitors
	REFRESH_VENUE_DETAILS = 'REFRESH_VENUE_DETAILS',
	// Every watched TikTok and Instagram account (`AccountWatchService`: the creators the city
	// follows, the report brands' and their rivals' own accounts): their posts since the month
	// began and a profile snapshot (followers, reach per post over the latest ten)
	SCRAPE_ACCOUNTS = 'SCRAPE_ACCOUNTS',
	// Every brand's own accounts (a brand with an open branch in the city, the report brands and
	// their rivals first): their posts of the last week (the weekly cron) and a snapshot
	// (followers; TikTok's without averages, as only the week's videos come)
	SCRAPE_ACCOUNTS_RECENT = 'SCRAPE_ACCOUNTS_RECENT',
	// The watched creators (the city's creator sources and the self-kept creator list,
	// `AccountWatchService`): TikTok's videos since the last run, every day; an Instagram profile's
	// latest posts every `CREATOR_INSTAGRAM_EVERY_DAYS` (the daily creator cron)
	SCRAPE_CREATORS = 'SCRAPE_CREATORS',
	// Brands' own accounts with no follower count yet: their profiles only, no posts (the daily
	// cron), so every brand account has followers within days of being linked
	FILL_ACCOUNT_FOLLOWERS = 'FILL_ACCOUNT_FOLLOWERS',
	// Every brand account with an open branch in the city and every creator account over
	// `TRACK_CREATOR_MIN_FOLLOWERS` / `TRACK_CREATOR_MIN_VIEWS`: their profiles only (followers,
	// following, post count), each again `TRACK_PROFILE_EVERY_DAYS` after its last (the weekly cron)
	TRACK_PROFILES = 'TRACK_PROFILES',
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
	// A dated snapshot of every dish topic × every district on Google Maps ("pasta Mitte Berlin"),
	// the top ten each (`DishSearchCron`, every `City.dishSearchEveryDays`; not part of MONTHLY)
	TRACK_DISH_SEARCHES = 'TRACK_DISH_SEARCHES',
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
	// Every open venue of the city: its Google reviews since the last fetch, its rating and review
	// count, those posts named first (`RatingSnapshotService`, the weekly rating cron)
	SNAPSHOT_RATINGS = 'SNAPSHOT_RATINGS',
	// Wolt / Lieferando ratings, fees and menus of the report venues and competitors
	SCRAPE_DELIVERY = 'SCRAPE_DELIVERY',
	// Views, likes, shares and comments of every post that turned seven days old without a read
	// at that age, read again and kept (`PostCountsService`, the daily cron)
	REFRESH_POST_COUNTS = 'REFRESH_POST_COUNTS',
	// Every step above but the venue list, in order, for one month
	MONTHLY = 'MONTHLY',
}

// The monthly run, in order: the month-end passes over the city's posts and blogs, the names
// they named looked up, the most talked-about brands' posts (searched by name, and the watched
// accounts' own profiles), competitors for those without, their reviews, their Google Maps
// details, delivery, comments, press and search ranks, Google Trends, then their reports and
// last the outreach lead scores. No reading step: the steps that need the posts read
// (`READ_GATED_STEPS`) or everything read (`ALL_READ_STEPS`) read first and wait when no model
// answers. A stored run's result is keyed by position ("<n>. <STEP>"), so reordering needs a
// migration re-keying stored results (`Migration20261104150000_monthly_without_reading`)
export const MONTHLY_STEPS: PipelineStepEnum[] = [
	PipelineStepEnum.SCRAPE_TIKTOK,
	PipelineStepEnum.SCRAPE_INSTAGRAM,
	PipelineStepEnum.SCRAPE_BLOGS,
	PipelineStepEnum.LOOKUP_VENUES,
	PipelineStepEnum.SCRAPE_VENUE_SOCIAL,
	PipelineStepEnum.SCRAPE_ACCOUNTS,
	// The report brands are final once the profiles' posts are read: competitors, then the
	// review scrape takes theirs too
	PipelineStepEnum.FILL_COMPETITORS,
	PipelineStepEnum.SCRAPE_REVIEWS,
	PipelineStepEnum.REFRESH_VENUE_DETAILS,
	// After the details: Google's "Order online" links say where each venue delivers
	PipelineStepEnum.SCRAPE_DELIVERY,
	PipelineStepEnum.SCRAPE_COMMENTS,
	PipelineStepEnum.SCRAPE_PRESS,
	PipelineStepEnum.TRACK_SEARCH_RANKS,
	// Before the reports: their city section quotes the search changes
	PipelineStepEnum.SEARCH_INTEREST,
	PipelineStepEnum.BUILD_REPORTS,
	PipelineStepEnum.SCORE_LEADS,
];

/**
 * Steps that read what the reading found (the names posts gave, the month's top brands, the
 * accounts matching linked): a pass runs first, and with no model the run waits, at most
 * `READ_WAIT_HOURS`, then goes on with what is read.
 */
export const READ_GATED_STEPS: readonly PipelineStepEnum[] = [
	PipelineStepEnum.LOOKUP_VENUES,
	PipelineStepEnum.SCRAPE_VENUE_SOCIAL,
	PipelineStepEnum.SCRAPE_ACCOUNTS,
	PipelineStepEnum.FILL_COMPETITORS,
	PipelineStepEnum.SCRAPE_REVIEWS,
	PipelineStepEnum.REFRESH_VENUE_DETAILS,
	PipelineStepEnum.SCRAPE_DELIVERY,
	PipelineStepEnum.SCRAPE_COMMENTS,
	PipelineStepEnum.SCRAPE_PRESS,
	PipelineStepEnum.TRACK_SEARCH_RANKS,
	PipelineStepEnum.FIND_OWN_ACCOUNTS,
];

/** Steps that read everything, the month's reviews included: they wait until it is read */
export const ALL_READ_STEPS: readonly PipelineStepEnum[] = [
	PipelineStepEnum.BUILD_REPORTS,
	PipelineStepEnum.SCORE_LEADS,
];

/** Steps that store something to read (posts, reviews, comments, press, venues to match against): a run of them queues a reading pass when it ends */
export const SOURCE_STEPS: readonly PipelineStepEnum[] = [
	PipelineStepEnum.SCRAPE_VENUES,
	PipelineStepEnum.SEARCH_BRANCHES,
	PipelineStepEnum.LOOKUP_OSM_PLACES,
	PipelineStepEnum.SCRAPE_TIKTOK,
	PipelineStepEnum.SCRAPE_TIKTOK_RECENT,
	PipelineStepEnum.SCRAPE_INSTAGRAM,
	PipelineStepEnum.SCRAPE_INSTAGRAM_RECENT,
	PipelineStepEnum.SCRAPE_INSTAGRAM_REELS,
	PipelineStepEnum.SCRAPE_BLOGS,
	PipelineStepEnum.LOOKUP_VENUES,
	PipelineStepEnum.SCRAPE_VENUE_SOCIAL,
	PipelineStepEnum.SCRAPE_VENUE_SOCIAL_RECENT,
	PipelineStepEnum.SCRAPE_ACCOUNTS,
	PipelineStepEnum.SCRAPE_ACCOUNTS_RECENT,
	PipelineStepEnum.SCRAPE_CREATORS,
	PipelineStepEnum.SCRAPE_REVIEWS,
	PipelineStepEnum.BACKFILL_REVIEWS,
	PipelineStepEnum.SCRAPE_COMMENTS,
	PipelineStepEnum.SCRAPE_PRESS,
	PipelineStepEnum.WATCH_REVIEWS,
];

// How a reading pass takes the city's unread posts: batches of this many, at most this many
// batches a pass (a batch that reads nothing ends it)
export const INGEST_EXTRACT_BATCH = 1000;
export const INGEST_EXTRACT_MAX_BATCHES = 20;

// The unread reviews a reading pass takes, newest first: a backfill's thousands are read over
// several passes, so the posts of the hours between are never stuck behind them
export const INGEST_REVIEWS_PER_PASS = 1000;

/** What a step spends on Apify at most, when the admin gives no budget. */
export const DEFAULT_STEP_BUDGET_USD: Partial<Record<PipelineStepEnum, number>> = {
	[PipelineStepEnum.SCRAPE_VENUES]: 20,
	// Forty places a brand at ~$0.004 a place: about $0.16 a brand
	[PipelineStepEnum.SEARCH_BRANCHES]: 2,
	// One result a place at ~$0.004, planned on 80 % of it: about 2,000 places
	[PipelineStepEnum.LOOKUP_OSM_PLACES]: 10,
	// TikTok's search at ~$0.0004 a result (24 queries, 497 results: $0.24 on 2026-10-25), so ~44
	// queries and hashtag words spend well under $1 a run; the cap is the search actor's $4 floor
	[PipelineStepEnum.SCRAPE_TIKTOK]: 4,
	[PipelineStepEnum.SCRAPE_TIKTOK_RECENT]: 4,
	[PipelineStepEnum.SCRAPE_INSTAGRAM]: 8,
	// One page (up to ~27 posts) of twenty hashtags at $0.0027 a post is about $1.50
	[PipelineStepEnum.SCRAPE_INSTAGRAM_RECENT]: 2,
	// A few top reels a tag at $0.0027 (twenty tags: ~40 reels, ~$0.11)
	[PipelineStepEnum.SCRAPE_INSTAGRAM_REELS]: 1,
	[PipelineStepEnum.LOOKUP_VENUES]: 6,
	// Half to the TikTok search, whose actor refuses a cap under $4
	[PipelineStepEnum.SCRAPE_VENUE_SOCIAL]: 8,
	// Up to 30 results a brand at ~$0.0004: ~$0.012 a brand, ~$2 for 150 brands; the search actor
	// refuses a cap under $4
	[PipelineStepEnum.SCRAPE_VENUE_SOCIAL_RECENT]: 4,
	// $0.0006 a Google review (Berlin 2026-09: ~6,300 for 127 venues, ~$3.80). A tenth to
	// TripAdvisor, then of the $10.80 left the month takes 60 % ($6.48) and the backfill of
	// venues new to the set 40 % ($4.32: ~7,200 reviews, ~22 venues at seven months of ~47)
	[PipelineStepEnum.SCRAPE_REVIEWS]: 12,
	// What a run started by hand gets, unless its `params.budgetUsd` says otherwise
	[PipelineStepEnum.BACKFILL_REVIEWS]: 90,
	[PipelineStepEnum.REFRESH_VENUE_DETAILS]: 2,
	// Instagram profiles at ~$0.0026 each (twelve latest posts included), TikTok's latest ten
	// videos at ~$0.003 each: ~100 accounts, mostly TikTok's videos, about $2
	[PipelineStepEnum.SCRAPE_ACCOUNTS]: 4,
	// Every brand account with an open branch in the city: Berlin 2026-11, ~2,850 Instagram profiles
	// at ~$0.0026 (~$7.40) and ~890 TikTok profiles paying only for the week's videos at ~$0.003
	// (a quiet account costs nothing): ~$11 a week, ~$50 a month
	[PipelineStepEnum.SCRAPE_ACCOUNTS_RECENT]: 16,
	// ~300 creators: TikTok's new videos at ~$0.003 (~$0.50 a day), a third of the Instagram
	// profiles a day at ~$0.003: ~$20 a month
	[PipelineStepEnum.SCRAPE_CREATORS]: 3,
	// An Instagram profile at ~$0.003, a TikTok one (its latest video) at ~$0.004: ~300 profiles a
	// day. Berlin's backlog in 2026-10 was ~1,200 accounts (~$3.40, four days); then only the
	// accounts linked since, cents a day
	[PipelineStepEnum.FILL_ACCOUNT_FOLLOWERS]: 1,
	// An Instagram profile at ~$0.003, a TikTok one (its latest video) at ~$0.004: ~300 lookups.
	// Each account is looked up once, so the weekly run spends only on brands new to an account
	[PipelineStepEnum.FIND_OWN_ACCOUNTS]: 1,
	// A hundred comments under each of ~100 posts at $0.00125 a comment
	[PipelineStepEnum.SCRAPE_COMMENTS]: 13,
	[PipelineStepEnum.SCRAPE_PRESS]: 3,
	// Up to three searches of twenty places per report branch, one run each at ~$0.084 (twenty
	// places at $0.0042); Berlin's October 2026 had ~102 queries, ~$8.60; every branch of a chain
	// counts, about a third more
	[PipelineStepEnum.TRACK_SEARCH_RANKS]: 10,
	// A snapshot: up to ten places a search at ~$0.004, 47 dishes × 12 districts in Berlin is
	// 564 searches, ~$24 at most; ~$15 in practice, since many searches find fewer than ten
	[PipelineStepEnum.TRACK_DISH_SEARCHES]: 25,
	// Two runs of signalbench/google-trends-scraper (~110 food topics, then the won venues) at
	// ~$0.004 a term; the actor refuses a cap under $1, so each run gets at least that
	[PipelineStepEnum.SEARCH_INTEREST]: 2,
	[PipelineStepEnum.WATCH_REVIEWS]: 1,
	[PipelineStepEnum.SAMPLE_BUSYNESS]: 1,
	[PipelineStepEnum.SAMPLE_RESERVATIONS]: 1,
	// $0.0006 a Google review: Berlin 2026-11, ~50,000-70,000 new reviews a month over 9,503 open
	// venues, ~$9 a week, plus one review each for the venues with nothing new (at most ~$5.70,
	// 40 % of the budget kept for it): ~$40 a month
	[PipelineStepEnum.SNAPSHOT_RATINGS]: 15,
	// A profile at ~$0.003 (Instagram) / ~$0.004 (TikTok), each every two weeks: Berlin 2026-11,
	// ~3,700 brand accounts and ~900 creators over the thresholds, ~$14 a fortnight, so a weekly
	// run takes about half
	[PipelineStepEnum.TRACK_PROFILES]: 10,
	// Wolt menus on 30 %, then Lieferando's city listing, whose actor refuses a cap under $5
	[PipelineStepEnum.SCRAPE_DELIVERY]: 7,
	// Every post once, at seven days, at ~$0.0039 (TikTok) / $0.0027 (Instagram): Berlin's
	// October 2026 was ~100 posts a day, ~$0.35 a day and ~$10 a month. Room for a busy day; a
	// post the cap leaves waits a day
	[PipelineStepEnum.REFRESH_POST_COUNTS]: 2,
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

export interface OneOffRun {
	step: PipelineStepEnum;
	key: string;
	params: PipelineRunParams;
	/** The run's month, `YYYY-MM`; the boot's month when absent */
	month?: string;
}

/**
 * Runs queued once, at the first boot of a deploy that carries them (`PipelineBootService`), one
 * per city the monthly cron covers: never again once a run of the step with the same `key`
 * exists for the city, whatever became of it (a failed one is rerun from the Data page). An entry
 * goes once production has queued it: the key stops it running again anyway.
 */
export const ONE_OFF_RUNS: OneOffRun[] = [
	{
		// The user's call, 2026-11-05: October's ranks came from one shared Places run, which
		// left out of each search the places an earlier one found
		// (`Migration20261105100000_drop_shared_run_search_ranks` deleted them); searched again a
		// run per query (~102 queries at twenty places, ~$8.60, the step's default). The dish
		// searches need no one-off: with their rows gone the daily `DishSearchCron` finds the city due
		step: PipelineStepEnum.TRACK_SEARCH_RANKS,
		key: 'search-ranks-one-run-each',
		month: '2026-10',
		params: {},
	},
];
