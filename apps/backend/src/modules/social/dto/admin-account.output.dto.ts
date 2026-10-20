import { PaginatedResult } from 'src/shared/interfaces/paginated-result.interface.js';

import type { AccountBrandSourceEnum } from '../entities/social-account.entity.js';
import type { SocialPlatformEnum } from '../entities/social-post.entity.js';
import type { AccountMatchResult } from '../services/account-matching.service.js';

/** One month's profile scrape of an account. */
export interface AdminAccountSnapshotOutputDto {
	month: string;
	followers?: number;
	posts?: number;
	avgViews?: number;
	avgLikes?: number;
	postsLast30Days?: number;
	scrapedAt: Date;
}

/** What our own scrapes saw an account post. */
export interface AdminAccountStatsOutputDto {
	/** Its posts we stored in the month asked for, and their views */
	monthPosts: number;
	monthViews: number;
	/** Every post of it we stored */
	posts: number;
	lastPostedAt?: Date;
}

export interface AdminAccountBrandRefOutputDto {
	id: string;
	name: string;
}

/** A TikTok or Instagram account: whose it is, its profile and what we saw it post. */
export interface AdminAccountOutputDto {
	id: string;
	platform: SocialPlatformEnum;
	handle: string;
	url: string;
	displayName?: string;
	/** The latest follower count an item or a profile scrape gave */
	followers?: number;
	followersAt?: Date;
	creator: { id: string; name: string };
	/** The brand whose own account it is */
	brand?: AdminAccountBrandRefOutputDto;
	/** A branch's own account */
	branch?: { id: string; name: string; street?: string };
	brandSource?: AccountBrandSourceEnum;
	/** The matcher's likely brand, waiting for an admin */
	suggestedBrand?: AdminAccountBrandRefOutputDto;
	/** How close the handle is to it, 0–1 */
	suggestedScore?: number;
	/** Brands an admin said it is not */
	rejectedBrandIds: string[];
	/** The latest profile scrape; absent when it was never scraped */
	latest?: AdminAccountSnapshotOutputDto;
	/** Followers since the scrape before the latest; absent without two */
	followersChange?: number;
	stats: AdminAccountStatsOutputDto;
}

export interface AdminListAccountsOutputDto extends PaginatedResult<AdminAccountOutputDto> {
	/** The city's accounts per status, under the same search and platform */
	counts: { linked: number; suggested: number };
}

export interface AdminMatchAccountsOutputDto extends AccountMatchResult {}
