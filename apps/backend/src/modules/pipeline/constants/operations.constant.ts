import { PipelineStepEnum } from './pipeline.constant.js';

/**
 * Where each pipeline step runs: its operation's workflow (`workflowName(operation, cadence)`,
 * `scrape-reviews.month`) and the step inside it (`@DurableStep({ name })`, the step's enum
 * value), or the whole workflow when `step` is absent. Every operation's run carries
 * `attributes: { cityId, purpose: operation, period }` and has one id per city and period
 * (`operationRunId`), so the admin's pages read a step's attempts from DBOS; nothing else records
 * a run.
 */
export const STEP_RUNS_IN: Partial<Record<PipelineStepEnum, { workflow: string; step?: string }>> =
	{
		[PipelineStepEnum.SCRAPE_VENUES]: {
			workflow: 'scrape-venues.month',
			step: PipelineStepEnum.SCRAPE_VENUES,
		},
		[PipelineStepEnum.SEARCH_BRANCHES]: { workflow: 'brand-branch-search.month' },
		[PipelineStepEnum.SYNC_OSM_PLACES]: {
			workflow: 'osm-places.month',
			step: PipelineStepEnum.SYNC_OSM_PLACES,
		},
		[PipelineStepEnum.LOOKUP_OSM_PLACES]: {
			workflow: 'osm-places.month',
			step: PipelineStepEnum.LOOKUP_OSM_PLACES,
		},
		[PipelineStepEnum.SCRAPE_TIKTOK]: { workflow: 'scrape-tiktok.month' },
		[PipelineStepEnum.SCRAPE_TIKTOK_RECENT]: { workflow: 'scrape-tiktok.week' },
		[PipelineStepEnum.SCRAPE_INSTAGRAM]: { workflow: 'scrape-instagram.month' },
		[PipelineStepEnum.SCRAPE_INSTAGRAM_RECENT]: { workflow: 'scrape-instagram.day' },
		[PipelineStepEnum.SCRAPE_INSTAGRAM_REELS]: { workflow: 'scrape-instagram.week' },
		[PipelineStepEnum.SCRAPE_BLOGS]: { workflow: 'scrape-blogs.week' },
		[PipelineStepEnum.LOOKUP_VENUES]: {
			workflow: 'lookup-venues.month',
			step: PipelineStepEnum.LOOKUP_VENUES,
		},
		[PipelineStepEnum.SCRAPE_VENUE_SOCIAL]: {
			workflow: 'scrape-venue-social.month',
			step: PipelineStepEnum.SCRAPE_VENUE_SOCIAL,
		},
		[PipelineStepEnum.SCRAPE_VENUE_SOCIAL_RECENT]: { workflow: 'scrape-venue-social.week' },
		[PipelineStepEnum.SCRAPE_ACCOUNTS]: { workflow: 'scrape-accounts.month' },
		[PipelineStepEnum.SCRAPE_ACCOUNTS_RECENT]: { workflow: 'scrape-accounts.week' },
		[PipelineStepEnum.FILL_COMPETITORS]: {
			workflow: 'fill-competitors.month',
			step: PipelineStepEnum.FILL_COMPETITORS,
		},
		[PipelineStepEnum.SCRAPE_REVIEWS]: {
			workflow: 'scrape-reviews.month',
			step: PipelineStepEnum.SCRAPE_REVIEWS,
		},
		[PipelineStepEnum.REFRESH_VENUE_DETAILS]: {
			workflow: 'refresh-venue-details.month',
			step: PipelineStepEnum.REFRESH_VENUE_DETAILS,
		},
		[PipelineStepEnum.SCRAPE_DELIVERY]: {
			workflow: 'scrape-delivery.month',
			step: PipelineStepEnum.SCRAPE_DELIVERY,
		},
		[PipelineStepEnum.SCRAPE_COMMENTS]: {
			workflow: 'scrape-comments.month',
			step: PipelineStepEnum.SCRAPE_COMMENTS,
		},
		[PipelineStepEnum.SCRAPE_PRESS]: {
			workflow: 'scrape-press.month',
			step: PipelineStepEnum.SCRAPE_PRESS,
		},
		[PipelineStepEnum.SEARCH_INTEREST]: { workflow: 'search-interest.month' },
		[PipelineStepEnum.SCORE_LEADS]: {
			workflow: 'score-leads.month',
			step: PipelineStepEnum.SCORE_LEADS,
		},
		[PipelineStepEnum.FIND_OWN_ACCOUNTS]: { workflow: 'find-own-accounts.week' },
		[PipelineStepEnum.REFRESH_POST_COUNTS]: { workflow: 'post-counts.day' },
		[PipelineStepEnum.FILL_ACCOUNT_FOLLOWERS]: { workflow: 'account-followers.day' },
		[PipelineStepEnum.SNAPSHOT_RATINGS]: { workflow: 'rating-snapshot.week' },
		[PipelineStepEnum.TRACK_PROFILES]: { workflow: 'profile-track.week' },
		[PipelineStepEnum.TRACK_DISH_SEARCHES]: {
			workflow: 'dish-searches.day',
			step: PipelineStepEnum.TRACK_DISH_SEARCHES,
		},
		[PipelineStepEnum.SAMPLE_BUSYNESS]: { workflow: 'sample-busyness.day' },
		[PipelineStepEnum.SAMPLE_RESERVATIONS]: { workflow: 'sample-reservations.day' },
		[PipelineStepEnum.WATCH_REVIEWS]: { workflow: 'review-watch.week' },
		[PipelineStepEnum.READ_MENTIONED_PROFILES]: { workflow: 'read-mentioned-profiles.week' },
		[PipelineStepEnum.BACKFILL_REVIEWS]: { workflow: 'backfill-reviews.run' },
	};

/** The steps a city's month is made of, in the order the Data page shows them */
export const MONTH_STEPS: PipelineStepEnum[] = [
	PipelineStepEnum.SCRAPE_TIKTOK,
	PipelineStepEnum.SCRAPE_INSTAGRAM,
	PipelineStepEnum.LOOKUP_VENUES,
	PipelineStepEnum.SCRAPE_VENUE_SOCIAL,
	PipelineStepEnum.SCRAPE_ACCOUNTS,
	PipelineStepEnum.FILL_COMPETITORS,
	PipelineStepEnum.SCRAPE_REVIEWS,
	PipelineStepEnum.REFRESH_VENUE_DETAILS,
	PipelineStepEnum.SCRAPE_DELIVERY,
	PipelineStepEnum.SCRAPE_COMMENTS,
	PipelineStepEnum.SCRAPE_PRESS,
	PipelineStepEnum.SEARCH_INTEREST,
	PipelineStepEnum.SCORE_LEADS,
];
