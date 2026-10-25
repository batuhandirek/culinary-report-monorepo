import { tags } from 'typia';

import type { SocialPlatformEnum } from 'src/modules/social/entities/social-post.entity.js';

import type { WatchReasonKindEnum } from '../services/account-watch.service.js';

type Month = string & tags.Pattern<'^[0-9]{4}-[0-9]{2}$'>;

export interface AdminCreatorWatchInputDto {
	/** The report month whose brands decide (customers, top brands, rivals); the last finished month without */
	month?: Month;
}

interface AdminWatchRefOutputDto {
	id: string;
	name: string;
}

/** One reason a profile is scraped, or would be. */
export interface AdminWatchReasonOutputDto {
	kind: WatchReasonKindEnum;
	city: AdminWatchRefOutputDto;
	/** Whether it gets the profile scraped now (a source switched off, or Instagram off in the city, does not) */
	active: boolean;
	/** A city source's id, and whether it is on */
	sourceId?: string;
	enabled?: boolean;
	instagramOff?: boolean;
	/** The brand whose own account it is */
	brand?: AdminWatchRefOutputDto;
	/** A top brand's place in the month's list, and its length */
	rank?: number;
	top?: number;
	/** The report brands a rival competes with */
	rivalOf?: AdminWatchRefOutputDto[];
	month?: string;
}

export interface AdminCreatorWatchOutputDto {
	month: string;
	/** Each of the creator's profiles (blogs are read through their feeds, never watched) */
	accounts: {
		accountId: string;
		platform: SocialPlatformEnum;
		handle: string;
		reasons: AdminWatchReasonOutputDto[];
	}[];
}
