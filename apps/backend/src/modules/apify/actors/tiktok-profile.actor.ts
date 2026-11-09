import { defineActor } from './actor.js';

/**
 * `clockworks/tiktok-profile-scraper`: one item a video, its author on each (`authorMeta`), ~$0.003
 * a video. `resultsPerPage` videos a profile, latest first; with `oldestPostDateUnified` only those
 * since that day are paid for, so a quiet profile costs nothing. Subtitle links expire within days:
 * download them while mapping.
 */
export interface TiktokProfileInput {
	profiles: string[];
	resultsPerPage?: number;
	profileSorting?: 'latest' | 'popular' | 'oldest';
	excludePinnedPosts?: boolean;
	/** `YYYY-MM-DD`: videos before it are left out (and not paid for) */
	oldestPostDateUnified?: string;
	downloadSubtitlesOptions?: 'DOWNLOAD_SUBTITLES' | 'NEVER_DOWNLOAD_SUBTITLES';
	shouldDownloadVideos?: boolean;
	shouldDownloadCovers?: boolean;
	shouldDownloadSlideshowImages?: boolean;
	shouldDownloadAvatars?: boolean;
}

export interface TiktokProfileAuthor {
	/** The platform's id of the user */
	id: string;
	name: string;
	nickName?: string;
	signature?: string;
	bioLink?: { link?: string } | null;
	fans?: number;
	following?: number;
	video?: number;
	heart?: number;
}

export interface TiktokProfileItem {
	id: string;
	text?: string;
	textLanguage?: string;
	createTime?: number;
	createTimeISO?: string;
	webVideoUrl?: string;
	playCount?: number;
	diggCount?: number;
	shareCount?: number;
	commentCount?: number;
	collectCount?: number;
	isAd?: boolean;
	isSponsored?: boolean;
	isPinned?: boolean;
	/** The handle the item was asked for */
	input?: string;
	authorMeta: TiktokProfileAuthor;
	videoMeta?: {
		duration?: number;
		subtitleLinks?: { language: string; downloadLink: string; source?: string }[] | null;
	};
	hashtags?: { name: string }[];
	mentions?: string[];
	/** A profile that doesn't exist or can't be read comes back as an error item */
	error?: string;
	errorCode?: string;
	url?: string;
}

export const TIKTOK_PROFILE_ACTOR = defineActor<TiktokProfileInput, TiktokProfileItem>(
	'clockworks/tiktok-profile-scraper',
);

/** What one video is planned at */
export const TIKTOK_VIDEO_USD = 0.003;

/** What a profile alone is planned at: its one latest video and the run's start */
export const TIKTOK_PROFILE_USD = 0.004;

/** The smallest cap a run gets: a run of one or two profiles is refused under it */
export const TIKTOK_PROFILE_MIN_CAP_USD = 0.05;
