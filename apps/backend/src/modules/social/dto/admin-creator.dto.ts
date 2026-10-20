import { tags } from 'typia';

import { PaginatedResult } from 'src/shared/interfaces/paginated-result.interface.js';
import { PaginationRequest } from 'src/shared/interfaces/pagination-request.interface.js';

import type { SocialPlatformEnum } from '../entities/social-post.entity.js';

import type { AdminAccountOutputDto } from './admin-account.output.dto.js';

type Month = string & tags.Pattern<'^[0-9]{4}-[0-9]{2}$'>;
type Uuid = string & tags.Format<'uuid'>;

export type AdminCreatorSort = `${'views' | 'posts' | 'followers' | 'brands' | 'name'}:${'asc' | 'desc'}`;

export interface AdminListCreatorsInputDto extends PaginationRequest {
	/** Posts found in this city; every city's without */
	cityId?: Uuid;
	/** The month counted; the last finished month without */
	month?: Month;
	platform?: SocialPlatformEnum;
	/** On the creator's name, handles and display names */
	q?: string;
	/** Also venues' own accounts (every account of the creator linked to a brand) */
	includeOwn?: boolean;
	sort?: AdminCreatorSort;
}

/** One of a creator's accounts in a list row. */
export interface AdminCreatorAccountRefOutputDto {
	id: string;
	platform: SocialPlatformEnum;
	handle: string;
	followers?: number;
	/** A brand's own account */
	brand?: { id: string; name: string };
}

/** A creator's posts in the month asked for, over all their accounts. */
export interface AdminCreatorMonthOutputDto {
	posts: number;
	views: number;
	/** Ads, or paid or gifted as the caption says */
	paid: number;
	/** Brands their posts named */
	brands: number;
	lastPostedAt?: Date;
}

export interface AdminCreatorRowOutputDto {
	id: string;
	name: string;
	accounts: AdminCreatorAccountRefOutputDto[];
	/** Every account is a brand's own */
	own: boolean;
	/** The most followers of any of their accounts */
	followers?: number;
	month: AdminCreatorMonthOutputDto;
}

export interface AdminListCreatorsOutputDto extends PaginatedResult<AdminCreatorRowOutputDto> {}

export interface AdminCreatorDetailInputDto {
	/** The month the accounts' figures are for, and the last of the six months; the last finished month without */
	month?: Month;
}

export interface AdminCreatorOutputDto {
	id: string;
	name: string;
	createdAt: Date;
	accounts: AdminAccountOutputDto[];
	/** Posts and views per month, six months up to the one asked for, oldest first */
	months: { month: string; posts: number; views: number }[];
	/** The brands their posts named most, all time; `own` when it is their own account's brand */
	brands: { id: string; name: string; posts: number; views: number; lastPostedAt: Date; own: boolean }[];
	/** Every post of theirs we stored, and their views */
	posts: number;
	views: number;
}

export interface AdminUpdateCreatorInputDto {
	name: string & tags.MinLength<1> & tags.MaxLength<200>;
}

/** Accounts that are this creator's too: they move under it, and creators left empty go. */
export interface AdminMergeCreatorAccountsInputDto {
	accountIds: Uuid[] & tags.MinItems<1> & tags.MaxItems<20>;
}

/** The creator an account was split into. */
export interface AdminSplitAccountOutputDto {
	creatorId: string;
}
