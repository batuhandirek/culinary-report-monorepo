import _ from 'lodash';

import {
	INSTAGRAM_RESULT_USD,
	type InstagramScraperInput,
} from 'src/modules/apify/actors/instagram-scraper.actor.js';
import { instagramTagUrl } from 'src/modules/social/util/instagram-tags.js';

/** What a tag page run returns (`InstagramScraperInput.resultsType`): the feed's posts, or its top reels */
export type InstagramHashtagKind = InstagramScraperInput['resultsType'];

/** One hashtag run as a plan hands it to the atom */
export interface InstagramHashtagsCall {
	/** Tags without `#`, each once; items name theirs in `inputUrl`, so one run covers them all */
	hashtags: string[];
	kind: InstagramHashtagKind;
	/** Posts older than this (ISO) are left out (the actor's filter takes a day, and pinned posts pass it) */
	since: string;
	/** Results per hashtag, sized to the run's share of the budget so the cap never stops it before the last tag */
	perHashtag: number;
	maxCostUsd: number;
	/** The `ApifyRun`'s purpose: "instagram posts Berlin: 12 hashtags" */
	purpose: string;
}

/** The hashtags a call asks, each once */
export const hashtagsOf = (call: Pick<InstagramHashtagsCall, 'hashtags'>): string[] =>
	_.uniqBy(call.hashtags, h => h.toLowerCase());

/** The actor's input for a call: the tag pages, the kind, the limit per tag, the day */
export const instagramHashtagsInput = (call: InstagramHashtagsCall): InstagramScraperInput => ({
	directUrls: hashtagsOf(call).map(instagramTagUrl),
	resultsType: call.kind,
	resultsLimit: call.perHashtag,
	onlyPostsNewerThan: call.since.slice(0, 10),
});

/**
 * The results per hashtag a run's cap covers at the Free plan's price, at most the caller's: a run
 * sized so is never stopped by Apify's cap before its last tag; under one, nothing to run.
 */
export const perHashtagWithin = (budgetUsd: number, hashtags: number, atMost: number): number =>
	Math.min(atMost, Math.floor(budgetUsd / (hashtags * INSTAGRAM_RESULT_USD)));
