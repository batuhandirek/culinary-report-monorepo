import { defineActor } from './actor.js';

/**
 * `clockworks/tiktok-scraper`, given post URLs (`postURLs`): one item a post with its counts,
 * ~$0.0039 a post with its run start. It refuses a cap under $0.50. A deleted or private post
 * comes back as `{ error, errorCode: 'POST_NOT_FOUND_OR_PRIVATE', url }`, charged like the others;
 * an item names the URL it was asked for in `submittedVideoUrl`. (Its hashtag feed has no date
 * filter, half older than three months: hashtags are searched through `novi/advanced-search-tiktok-api`
 * instead.)
 */
export interface TiktokScraperInput {
	postURLs: string[];
	shouldDownloadVideos: boolean;
	shouldDownloadCovers: boolean;
	shouldDownloadSubtitles: boolean;
	shouldDownloadSlideshowImages: boolean;
}

export interface TiktokScraperItem {
	id?: string;
	webVideoUrl?: string;
	/** The URL it was asked for */
	submittedVideoUrl?: string;
	createTimeISO?: string;
	authorMeta?: { id?: string; name?: string; nickName?: string; fans?: number };
	playCount?: number;
	diggCount?: number;
	shareCount?: number;
	commentCount?: number;
	collectCount?: number;
	repostCount?: number;
	isAd?: boolean;
	isSponsored?: boolean;
	/** A deleted or private post */
	error?: string;
	errorCode?: string;
	url?: string;
}

export const TIKTOK_SCRAPER_ACTOR = defineActor<TiktokScraperInput, TiktokScraperItem>(
	'clockworks/tiktok-scraper',
);
