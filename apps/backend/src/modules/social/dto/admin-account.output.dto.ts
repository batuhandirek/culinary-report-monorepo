import { PaginatedResult } from 'src/shared/interfaces/paginated-result.interface.js';

import type { AccountBrandSourceEnum } from '../entities/social-account.entity.js';
import type { AccountSnapshotSourceEnum } from '../entities/social-account-snapshot.entity.js';
import type { SocialPlatformEnum } from '../entities/social-post.entity.js';
import type { AccountMatchResult } from '../services/account-matching.service.js';

/** An account's newest figures: each from the newest snapshot that has it. */
export interface AdminAccountSnapshotOutputDto {
	/** The newest snapshot, and the scrape that took it */
	scrapedAt: Date;
	source: AccountSnapshotSourceEnum;
	followers?: number;
	following?: number;
	posts?: number;
	/** Over its latest posts, ten at most: from the newest profile scrape that gave them */
	avgViews?: number;
	avgLikes?: number;
	postsLast30Days?: number;
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
	rejections: { brand: { id: string; name: string } }[];
	/** Its newest figures; absent when no scrape gave a follower count */
	latest?: AdminAccountSnapshotOutputDto;
	/** Followers against the newest count 30 or more days older; absent without one */
	followersChange?: number;
	stats: AdminAccountStatsOutputDto;
}

export interface AdminListAccountsOutputDto extends PaginatedResult<AdminAccountOutputDto> {
	/** The city's accounts per status, under the same search and platform */
	counts: { linked: number; suggested: number };
}

export interface AdminMatchAccountsOutputDto extends AccountMatchResult {}
