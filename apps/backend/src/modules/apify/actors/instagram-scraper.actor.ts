import { defineActor } from './actor.js';

/**
 * `apify/instagram-scraper`, given URLs (`directUrls`): Instagram tag pages (the city's hashtags:
 * the feed's images and carousels with `resultsType: 'posts'`, its few top reels with `'reels'`)
 * or post pages (the counts refresh: `'posts'`, `resultsLimit: 1`). $0.0027 a result on the Free
 * plan. On Free a tag stops after its first page (5–27 posts, the newest; the run's log says
 * "limited to one page for free users"), so a busy tag's month comes from daily runs. Items name
 * the URL they came from in `inputUrl` (a tag's), so one run covers every hashtag. `id` is the
 * media pk (`<pk>` or `<pk>_<owner>`), the same as the location actor's `postId`. No follower
 * counts. A hidden like count comes back as -1; views are on videos only (`videoPlayCount`, else
 * `videoViewCount`). An empty tag returns one charged `{ inputUrl, error: 'no_items' }` item; a
 * deleted or private post `{ url, error: 'not_found' }`. Pinned posts pass the date filter.
 */
export interface InstagramScraperInput {
	/** Tag URLs (`https://www.instagram.com/explore/tags/<tag>/`) or post URLs */
	directUrls: string[];
	resultsType: 'posts' | 'reels';
	/** Results per URL */
	resultsLimit: number;
	/** `YYYY-MM-DD`: older posts are left out (pinned ones pass) */
	onlyPostsNewerThan?: string;
}

/** A user an item names: a co-author or someone tagged in the photo */
export interface InstagramScraperUser {
	id?: string;
	username?: string;
	full_name?: string;
	is_verified?: boolean;
}

export interface InstagramScraperItem {
	/** The URL the item came from: a tag page's, or the post's own */
	inputUrl?: string;
	/** The media pk, sometimes `<pk>_<owner id>` */
	id?: string;
	/** `Image`, `Video`, `Sidecar` */
	type?: string;
	/** `feed`, `clips` (a reel), `carousel_container` */
	productType?: string;
	shortCode?: string;
	url?: string;
	/** ISO time it was posted */
	timestamp?: string;
	caption?: string;
	hashtags?: string[];
	mentions?: string[];
	/** -1 when the author hides it */
	likesCount?: number;
	commentsCount?: number;
	sharesCount?: number;
	videoPlayCount?: number | null;
	videoViewCount?: number | null;
	igPlayCount?: number;
	ownerUsername?: string;
	ownerFullName?: string;
	/** The user pk: an account is its user id */
	ownerId?: string;
	paidPartnership?: boolean;
	isSponsored?: boolean;
	isPinned?: boolean;
	locationName?: string;
	locationId?: string;
	coauthorProducers?: InstagramScraperUser[];
	taggedUsers?: InstagramScraperUser[];
	/** `no_items` (an empty tag), `not_found` (a deleted or private post) */
	error?: string;
	errorDescription?: string;
}

export const INSTAGRAM_SCRAPER_ACTOR = defineActor<InstagramScraperInput, InstagramScraperItem>(
	'apify/instagram-scraper',
);

/** What one result costs on the Free plan: a plan sizes a run's limit inside its cap by it */
export const INSTAGRAM_RESULT_USD = 0.0027;
