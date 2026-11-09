import { defineActor } from './actor.js';

/**
 * `apify/instagram-profile-scraper`: one item a profile, its figures and its twelve latest posts
 * (~$0.0026 a profile). Instagram sometimes refuses a profile's timeline: the item then has its
 * figures and no posts. A post on its grid owned by someone else (a collab) carries its own
 * `ownerUsername`, never the profile's.
 */
export interface InstagramProfileInput {
	usernames: string[];
}

export interface InstagramProfilePost {
	id: string;
	type?: string;
	shortCode?: string;
	caption?: string;
	url: string;
	timestamp: string;
	commentsCount?: number;
	likesCount?: number;
	videoViewCount?: number;
	videoPlayCount?: number;
	ownerUsername?: string;
	ownerId?: string;
	ownerFullName?: string;
	isPinned?: boolean;
	locationName?: string;
	productType?: string;
	paidPartnership?: boolean;
	isSponsored?: boolean;
	taggedUsers?: { username: string }[];
	coauthorProducers?: { username: string }[];
}

export interface InstagramProfileItem {
	/** The platform's id of the user: an account is its user id (`SocialAccountService.ensure`) */
	id: string;
	username: string;
	inputUrl?: string;
	url?: string;
	fullName?: string;
	biography?: string;
	externalUrl?: string;
	externalUrls?: { url: string }[];
	followersCount?: number;
	followsCount?: number;
	postsCount?: number;
	isBusinessAccount?: boolean;
	businessCategoryName?: string;
	private?: boolean;
	verified?: boolean;
	latestPosts?: InstagramProfilePost[];
	/** A profile that doesn't exist or can't be read */
	error?: string;
	errorDescription?: string;
}

export const INSTAGRAM_PROFILE_ACTOR = defineActor<InstagramProfileInput, InstagramProfileItem>(
	'apify/instagram-profile-scraper',
);

/** What one profile is planned at (~$0.0026 charged; a missing profile costs less) */
export const INSTAGRAM_PROFILE_USD = 0.003;

/** The smallest cap a run gets: a run of one or two profiles is refused under it */
export const INSTAGRAM_PROFILE_MIN_CAP_USD = 0.05;
