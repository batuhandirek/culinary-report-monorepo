import {
	TIKTOK_SEARCH_MIN_CAP_USD,
	TIKTOK_SEARCH_MIN_LIMIT,
} from 'src/modules/apify/actors/tiktok-search.actor.js';

/** The atom's workflow name: every TikTok search run on `/admin/workflows` */
export const TIKTOK_SEARCH_WORKFLOW = 'tiktok-search.run';

/** Every run's cap is floored at the actor's lowest (it refuses a run capped under $4; a run spends well under $1) */
export const TIKTOK_SEARCH_MIN_CAP = TIKTOK_SEARCH_MIN_CAP_USD;

/** Every run's results per query are floored at the actor's lowest */
export const TIKTOK_SEARCH_MIN_PER_QUERY = TIKTOK_SEARCH_MIN_LIMIT;
