import { tags } from 'typia';

import { PaginationRequest } from 'src/shared/interfaces/pagination-request.interface.js';

import type { SocialPlatformEnum } from '../entities/social-post.entity.js';

type Month = string & tags.Pattern<'^[0-9]{4}-[0-9]{2}$'>;
type Uuid = string & tags.Format<'uuid'>;

/**
 * Which accounts: venues' own (linked to a brand), the matcher's suggestions waiting for an
 * admin, or (absent) every account.
 */
export type AdminAccountStatus = 'linked' | 'suggested';

export type AdminAccountSort = `${'followers' | 'monthPosts' | 'monthViews' | 'score' | 'handle'}:${'asc' | 'desc'}`;

export interface AdminListAccountsInputDto extends PaginationRequest {
	/** The accounts first seen in this city; the first active city's without */
	cityId?: Uuid;
	/** The month the post figures are for; the last finished month without */
	month?: Month;
	platform?: SocialPlatformEnum;
	status?: AdminAccountStatus;
	/** On the handle, the display name or the brand's name */
	q?: string;
	sort?: AdminAccountSort;
}

/**
 * An admin's word on an account: link it to a brand (or one of its branches), confirm the
 * matcher's suggestion, say it is not that brand's (the linked one, else the suggested one;
 * final for the matcher), or say whose branch it is (`null`: the whole brand's).
 */
export type AdminDecideAccountInputDto =
	| { action: 'link'; brandId: Uuid; branchId?: Uuid | null }
	| { action: 'confirm' }
	| { action: 'reject' }
	| { action: 'branch'; branchId: Uuid | null };

export interface AdminMatchAccountsInputDto {
	cityId: Uuid;
}

export interface AdminAddBrandAccountInputDto {
	/** A brand's own accounts are profiles: never a blog */
	platform: SocialPlatformEnum.INSTAGRAM | SocialPlatformEnum.TIKTOK;
	/** A handle with or without the @, or the profile URL */
	handle: string & tags.MinLength<1> & tags.MaxLength<200>;
	/** One branch's own account; absent for the whole brand */
	branchId?: Uuid;
}

export interface AdminUpdateBrandAccountInputDto {
	/** The branch it belongs to; `null` for the whole brand */
	branchId: Uuid | null;
}

export interface AdminBrandAccountsInputDto {
	/** The month the post figures are for; the last finished month without */
	month?: Month;
}
