import _ from 'lodash';

import type { TiktokSearchInput } from 'src/modules/apify/actors/tiktok-search.actor.js';
import { PostSourceKindEnum } from 'src/modules/social/entities/post-source.entity.js';
import type { PostFind } from 'src/modules/social/util/post-sources.js';

import { TIKTOK_SEARCH_MIN_PER_QUERY } from '../constants/tiktok-search.constant.js';

/** How far back a search looks (`TiktokSearchInput.publishTime`): the windows our runs use */
export type TikTokSearchWindow = Extract<
	TiktokSearchInput['publishTime'],
	'WEEK' | 'MONTH' | 'THREE_MONTH'
>;

/**
 * How a run's finds are recorded (`PostSource`), so the Sources tab's yield stays the source's:
 * a city search's query is a `tiktok_search` find, or a `tiktok_hashtag` one when it is a hashtag's
 * word (and no search of the same words); a venue search's query is a `venue_search` find of the
 * venue whose brand's name it is.
 */
export type TiktokSearchFinds =
	{ kind: 'city'; hashtagWords: string[] } | { kind: 'venue'; venueIds: Record<string, string> };

/** One search run as a plan hands it to the atom */
export interface TiktokSearchCall {
	/** Each searched once (the actor's `limit` is per keyword, so one run covers them all) */
	queries: string[];
	window: TikTokSearchWindow;
	/** Results per query, floored by the atom at the actor's lowest (30) */
	perQuery: number;
	/** Videos older than this (ISO) are left out: the search's window is coarser than a month's start */
	since: string;
	finds: TiktokSearchFinds;
	/** The run's cap, floored by the atom at the actor's lowest ($4) */
	maxCostUsd: number;
	/** The `ApifyRun`'s purpose: "tiktok search Berlin: 12 queries, 8 hashtags" */
	purpose: string;
}

/** The queries a call asks, each once */
export const queriesOf = (call: Pick<TiktokSearchCall, 'queries'>): string[] =>
	_.uniqBy(call.queries, q => q.toLowerCase());

/** The actor's input for a call in a city's region: by relevance, the query echoed on each item */
export const tiktokSearchInput = (call: TiktokSearchCall, region: string): TiktokSearchInput => ({
	keywords: queriesOf(call),
	limit: Math.max(call.perQuery, TIKTOK_SEARCH_MIN_PER_QUERY),
	region,
	publishTime: call.window,
	// Relevance
	sortType: 0,
	includeSearchTerms: true,
});

/** A row's search finds (`search:<query>` from the items) recorded by the call's rule */
export const findsBy = (finds: TiktokSearchFinds, found: PostFind[]): PostFind[] => {
	if (finds.kind === 'venue')
		return found.map(f => ({
			kind: PostSourceKindEnum.VENUE_SEARCH,
			value: f.value,
			venueId: finds.venueIds[f.value],
		}));
	const words = new Set(finds.hashtagWords.map(w => w.toLowerCase()));
	return found.map(f =>
		words.has(f.value.toLowerCase()) ? { ...f, kind: PostSourceKindEnum.TIKTOK_HASHTAG } : f,
	);
};
