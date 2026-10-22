import type { SocialPlatformEnum } from 'src/modules/social/entities/social-post.entity.js';

/**
 * A city's month in public: what `CityHighlight.data` stores and the public page draws. Our own
 * counts only (posts, views, creators, shares): no Google rating, no review text, nothing from
 * OSM. Positive lists only. Optional fields are absent, never null (`serialize({ skipNull })`
 * drops a null inside the jsonb too).
 */
export interface CityHighlightData {
	totals: CityHighlightTotals;
	/** The ten brands most posted about by others, by posts then views */
	brands: CityHighlightBrand[];
	/** The five fastest climbers in the top 50 by posts from others */
	risers: CityHighlightRiser[];
	/** The month's most viewed post by someone other than the brand */
	topPost?: CityHighlightPost;
	/** The creators whose posts about the city's places reached the most views */
	creators: CityHighlightCreator[];
	/** The district most mentions named a branch in */
	district?: CityHighlightDistrict;
	/** Dishes whose share of the posts and reviews naming a dish rose on the month before */
	dishes: CityHighlightDish[];
}

export interface CityHighlightTotals {
	/** Posts by others naming a place of the city */
	posts: number;
	views: number;
	/** People, not accounts: one creator's TikTok and Instagram count once */
	creators: number;
	brands: number;
}

export interface CityHighlightBrand {
	rank: number;
	brandId: string;
	name: string;
	/** Its most reviewed open branch's district and category, when known */
	district?: string;
	category?: string;
	posts: number;
	views: number;
	creators: number;
}

export interface CityHighlightRiser {
	brandId: string;
	name: string;
	district?: string;
	rank: number;
	/** Absent when it was not in the previous month's top 50 */
	prevRank?: number;
	posts: number;
	prevPosts: number;
}

export interface CityHighlightPost {
	postId: string;
	platform: SocialPlatformEnum;
	/** The original, as the platform shows it */
	url: string;
	/** The platform's official embed of it */
	embedUrl: string;
	/** The creator's handle, without @ */
	handle: string;
	/** The creator's profile */
	profileUrl: string;
	views: number;
	postedAt: string;
	/** The places it names, as the brand list names them */
	brands: { brandId: string; name: string }[];
}

export interface CityHighlightCreator {
	creatorId: string;
	/** The handle their most viewed account goes by, without @ */
	handle: string;
	platform: SocialPlatformEnum;
	profileUrl: string;
	posts: number;
	views: number;
	/** How many of the city's places their posts named */
	brands: number;
}

export interface CityHighlightDistrict {
	name: string;
	/** Its share of the month's mentions naming a branch, in percent */
	share: number;
	mentions: number;
}

export interface CityHighlightDish {
	label: string;
	/** Share of the posts and reviews naming a dish, in percent, and the change in points */
	share: number;
	delta: number;
	count: number;
}
