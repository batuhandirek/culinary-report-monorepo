import { defineActor } from './actor.js';

/**
 * `novi/advanced-search-tiktok-api`: TikTok's keyword search in a region, TikTok's own video
 * objects, ~$0.0004 a result. `limit` is per keyword (30 at least), so one run covers every query.
 * It refuses a run capped under $4. `includeSearchTerms` puts the query in
 * `__search_terms.keyword`, the key a find maps back by. Subtitle links are in
 * `video.cla_info.caption_infos` (they expire within days: download them while mapping); the tagged
 * place is an `anchor_poi` anchor (or `poi_info`). `create_time` is Unix seconds.
 * (`stanvanrooy6/tiktok-search-scraper` also works on Free, up to 100 rows a run, but has no
 * subtitle links.)
 */
export interface TiktokSearchInput {
	keywords: string[];
	/** Per keyword, 30 at least */
	limit: number;
	/** TikTok's region code (`City.tiktokRegion`) */
	region: string;
	publishTime: 'YESTERDAY' | 'WEEK' | 'MONTH' | 'THREE_MONTH' | 'SIX_MONTH' | 'ALL_TIME';
	/** 0 relevance */
	sortType: number;
	includeSearchTerms: boolean;
}

export interface TiktokSearchItem {
	aweme_id?: string;
	desc?: string;
	/** Unix seconds */
	create_time?: number;
	author?: {
		unique_id?: string;
		nickname?: string;
		follower_count?: number;
		/** The user's id: the clockworks actors' `authorMeta.id` */
		uid?: string;
	};
	statistics?: {
		play_count?: number;
		digg_count?: number;
		share_count?: number;
		comment_count?: number;
		collect_count?: number;
	};
	is_ads?: boolean;
	commerce_info?: { branded_content_type?: number };
	/** Hashtags (`hashtag_name`) and mentions, in the caption's order */
	text_extra?: { type?: number; hashtag_name?: string; user_id?: string }[];
	anchors?: { component_key?: string; type?: string; keyword?: string; id?: string }[];
	poi_info?: { poi_name?: string };
	video?: {
		cla_info?: {
			caption_infos?: {
				lang?: string;
				url?: string;
				is_original_caption?: boolean;
				caption_format?: string;
			}[];
		};
	};
	/** The query the item answers (`includeSearchTerms`) */
	__search_terms?: {
		keyword?: string;
		sort_type?: string;
		publish_time?: string;
		region?: string;
	};
}

export const TIKTOK_SEARCH_ACTOR = defineActor<TiktokSearchInput, TiktokSearchItem>(
	'novi/advanced-search-tiktok-api',
);

/** What one result costs on the Free plan (24 queries, 497 results: $0.24 on 2026-10-25) */
export const TIKTOK_SEARCH_RESULT_USD = 0.0004;

/** The actor's smallest `limit` per keyword */
export const TIKTOK_SEARCH_MIN_LIMIT = 30;

/** The smallest cap the actor accepts: a run capped under it is refused */
export const TIKTOK_SEARCH_MIN_CAP_USD = 4;
