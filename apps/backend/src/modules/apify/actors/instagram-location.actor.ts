import { defineActor } from './actor.js';

/**
 * `scraping_solutions/instagram-location-posts-local-creator-finder`: the posts of the Instagram
 * place a name resolves to. Its name search can resolve to a namesake (another country, the city
 * itself), so a caller checks `locationName` against what it asked for. Each item names the query
 * it answers (`input`). `postId` is the media pk, the same as `apify/instagram-scraper`'s `id`, and
 * `creatorId` the user pk (`ownerId` there). No follower counts. Its Free-plan note shows on every
 * run, so the run's PARTIAL mark means "limited on Free", not necessarily "cut short".
 */
export interface InstagramLocationInput {
	/** Place names to search ("<brand> <city>") */
	locations: string[];
	resultsPerLocation: number;
	/** `best`: the one place the name resolves to best */
	matchStrategy: 'best';
	maximumLocationsPerQuery: number;
	/** `YYYY-MM-DD`: older posts are left out */
	onlyPostsNewerThan?: string;
	includeLocationInfo: boolean;
}

export interface InstagramLocationItem {
	/** The query (`locations` entry) the item answers */
	input?: string;
	/** The media pk */
	postId?: string;
	postUrl?: string;
	/** ISO time it was posted */
	publishedAt?: string;
	caption?: string;
	username?: string;
	/** The user pk */
	creatorId?: string;
	fullName?: string;
	playCount?: number;
	likeCount?: number;
	shareCount?: number;
	commentCount?: number;
	/** The place the name resolved to */
	locationName?: string;
}

export const INSTAGRAM_LOCATION_ACTOR = defineActor<InstagramLocationInput, InstagramLocationItem>(
	'scraping_solutions/instagram-location-posts-local-creator-finder',
);
