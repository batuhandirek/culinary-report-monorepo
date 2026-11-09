/**
 * The pipeline's steps: each one the work of an operation's workflow (`STEP_RUNS_IN` says which),
 * the key of a city's budget for it (`City.stepBudgetsUsd`, `stepBudgetUsd`) and the name of the
 * `@DurableStep` doing it, so the Data page finds its attempts on DBOS.
 */
export enum PipelineStepEnum {
	SCRAPE_VENUES = 'SCRAPE_VENUES',
	// Every confirmed brand's name on Google Maps in the city, for branches that opened since
	// (a quarter's `scrape-venues`, after SCRAPE_VENUES); new ones are offered, never added
	SEARCH_BRANCHES = 'SEARCH_BRANCHES',
	// OpenStreetMap's food places in the city, each linked to the venue it is (free, monthly): the
	// checklist the venue list is measured against
	SYNC_OSM_PLACES = 'SYNC_OSM_PLACES',
	// The OSM places no venue is, searched on Google Maps by name and address, once each
	LOOKUP_OSM_PLACES = 'LOOKUP_OSM_PLACES',
	// The month-end TikTok pass: the city's searches and hashtag words searched over the last
	// month, kept from the month's start; the weekly SCRAPE_TIKTOK_RECENT collects most of the month
	SCRAPE_TIKTOK = 'SCRAPE_TIKTOK',
	// The city's TikTok searches and hashtag words, searched over the last week (weekly).
	// A hashtag's own feed has no date filter (half of it was over three months old), so its word
	// is searched instead
	SCRAPE_TIKTOK_RECENT = 'SCRAPE_TIKTOK_RECENT',
	SCRAPE_INSTAGRAM = 'SCRAPE_INSTAGRAM',
	// The newest page of each Instagram hashtag (daily): on Apify's Free plan a hashtag
	// gives one page a run, about a day of posts on a busy tag
	SCRAPE_INSTAGRAM_RECENT = 'SCRAPE_INSTAGRAM_RECENT',
	// Each Instagram hashtag's top reels of the last week (weekly):
	// the posts feed returns no reels, and reels carry the views
	SCRAPE_INSTAGRAM_REELS = 'SCRAPE_INSTAGRAM_REELS',
	// The city's food blogs through their feeds: each new article a post (free; weekly and monthly)
	SCRAPE_BLOGS = 'SCRAPE_BLOGS',
	LOOKUP_VENUES = 'LOOKUP_VENUES',
	SCRAPE_VENUE_SOCIAL = 'SCRAPE_VENUE_SOCIAL',
	// TikTok searches by brand name over the last week (weekly): the last finished month's
	// report brands (customers included), their competitors and the open prospects
	SCRAPE_VENUE_SOCIAL_RECENT = 'SCRAPE_VENUE_SOCIAL_RECENT',
	// Report brands with no competitors get their best suggestions (free; before the review
	// scrape, so the competitors' reviews come in the same run); brands with any are left alone
	FILL_COMPETITORS = 'FILL_COMPETITORS',
	SCRAPE_REVIEWS = 'SCRAPE_REVIEWS',
	// A one-off: the Google reviews since `since` of every open venue posts named in the last
	// `talkedDays` that has none stored from then (started by hand: `POST /admin/backfill-reviews`)
	BACKFILL_REVIEWS = 'BACKFILL_REVIEWS',
	// Google Maps detail pages (hours, amenities, popular times) of report venues and competitors
	REFRESH_VENUE_DETAILS = 'REFRESH_VENUE_DETAILS',
	// Every watched TikTok and Instagram account (`AccountWatchService`: the creators the city
	// follows, the report brands' and their rivals' own accounts): their posts since the month
	// began and a profile snapshot (followers, reach per post over the latest ten)
	SCRAPE_ACCOUNTS = 'SCRAPE_ACCOUNTS',
	// Every brand's own accounts (a brand with an open branch in the city, the report brands and
	// their rivals first): their posts of the last week (weekly) and a snapshot
	// (followers; TikTok's without averages, as only the week's videos come)
	SCRAPE_ACCOUNTS_RECENT = 'SCRAPE_ACCOUNTS_RECENT',
	// Brands' own accounts with no follower count yet: their profiles only, no posts (the daily
	// cron), so every brand account has followers within days of being linked
	FILL_ACCOUNT_FOLLOWERS = 'FILL_ACCOUNT_FOLLOWERS',
	// Every brand account with an open branch in the city and every creator account over
	// `TRACK_CREATOR_MIN_FOLLOWERS` / `TRACK_CREATOR_MIN_VIEWS`: their profiles only (followers,
	// following, post count), each again `TRACK_PROFILE_EVERY_DAYS` after its last (weekly)
	TRACK_PROFILES = 'TRACK_PROFILES',
	// Brands' own accounts on the platform they have none on: their other account's handle looked
	// up there, linked when the profile proves it (weekly, after the week's lookups)
	FIND_OWN_ACCOUNTS = 'FIND_OWN_ACCOUNTS',
	// Every Instagram handle posts tag or bios name becomes an account, and the profiles never read
	// are read (bio, links, business category); the accounts are matched by what their profile
	// says (`profilePlaces`), a business profile's bio address that names none of our places is
	// searched on Google Maps, `ProfilePlaceAgent` suggests which place at an address a profile
	// is, and the mentions their tags place are matched (weekly, before the week's lookups)
	READ_MENTIONED_PROFILES = 'READ_MENTIONED_PROFILES',
	// Comments under each report venue's top TikTok posts of the month (their intents: `read-comments`)
	SCRAPE_COMMENTS = 'SCRAPE_COMMENTS',
	// Google News and web search for the report venues' press and listicle mentions
	SCRAPE_PRESS = 'SCRAPE_PRESS',
	// A dated snapshot of every food topic a guest searches (dishes, cuisines, kinds of place,
	// meals, diets, drinks) × every district on Google Maps ("pasta Mitte Berlin", "vietnamese
	// food Mitte Berlin"), the top ten each (`dish-searches`, every `City.dishSearchEveryDays`). A
	// report branch's place on those searches is read from the snapshot
	TRACK_DISH_SEARCHES = 'TRACK_DISH_SEARCHES',
	// Google Trends: search interest per cuisine and won venue over twelve months, in the city's region
	SEARCH_INTEREST = 'SEARCH_INTEREST',
	// Venue lead scores for outreach: SQL only, free
	SCORE_LEADS = 'SCORE_LEADS',
	// The weekly review watch: subscribers' reviews of the last ten days, alerts on critical ones
	WATCH_REVIEWS = 'WATCH_REVIEWS',
	// Google popular times of the report venues and competitors (twice a week, `demand-sample`)
	SAMPLE_BUSYNESS = 'SAMPLE_BUSYNESS',
	// Open evening tables of every venue with a booking page (Google's own, TheFork, OpenTable),
	// won prospects and report venues first (Thursdays, `demand-sample`)
	SAMPLE_RESERVATIONS = 'SAMPLE_RESERVATIONS',
	// Every open venue of the city: its Google reviews since the last fetch, its rating and review
	// count, those posts named first (`RatingSnapshotService`, weekly)
	SNAPSHOT_RATINGS = 'SNAPSHOT_RATINGS',
	// Wolt / Lieferando ratings, fees and menus of the report venues and competitors
	SCRAPE_DELIVERY = 'SCRAPE_DELIVERY',
	// Views, likes, shares and comments of every post that turned seven days old without a read
	// at that age, read again and kept (`PostCountsService`, daily)
	REFRESH_POST_COUNTS = 'REFRESH_POST_COUNTS',
}

/** What a step spends on Apify at most, when the city sets no budget for it (`City.stepBudgetsUsd`) */

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
	// An Instagram profile at ~$0.003, a TikTok one (its latest video) at ~$0.004: ~300 profiles a
	// day. Berlin's backlog in 2026-10 was ~1,200 accounts (~$3.40, four days); then only the
	// accounts linked since, cents a day
	[PipelineStepEnum.FILL_ACCOUNT_FOLLOWERS]: 1,
	// An Instagram profile at ~$0.003, a TikTok one (its latest video) at ~$0.004: ~300 lookups.
	// Each account is looked up once, so the weekly run spends only on brands new to an account
	[PipelineStepEnum.FIND_OWN_ACCOUNTS]: 1,
	// Profiles first, at ~$0.003 an Instagram profile, on `MENTIONED_PROFILES_SHARE` of it; the
	// rest searches bio addresses on Google Maps at ~$0.013 each (three places), from $0.50 a run.
	// Berlin's backlog on 2026-11-05 was ~1,300 mentioned accounts (~$4) and a few hundred
	// addresses (~$4–7) once; then cents a week
	[PipelineStepEnum.READ_MENTIONED_PROFILES]: 2,
	// A hundred comments under each of ~100 posts at $0.00125 a comment
	[PipelineStepEnum.SCRAPE_COMMENTS]: 13,
	[PipelineStepEnum.SCRAPE_PRESS]: 3,
	// A snapshot: up to ten places a search at ~$0.004, ~$0.50 a topic across Berlin's 12
	// districts, so ~49 topics, the most served first (2026-11-05: a search for 89 of the 93
	// branches of October's 50 most mentioned brands); less in practice, since many searches
	// find fewer than ten
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
