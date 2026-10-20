import type { BrandMemberRoleEnum } from 'src/modules/auth/constants/brand-member-role.enum.constant.js';
import type { LeadSignals } from 'src/modules/venues/interfaces/lead-score.interface.js';
import { PaginatedResult } from 'src/shared/interfaces/paginated-result.interface.js';

import type {
	OutreachTouchKindEnum,
	ProspectLanguage,
	ProspectStageEnum,
} from '../constants/outreach.constant.js';

/** A brand's branch as outreach shows it: the address, website and phone to reach it by. */
export interface AdminProspectVenueOutputDto {
	id: string;
	name: string;
	category?: string;
	district?: string;
	street?: string;
	website?: string;
	phone?: string;
	googleUrl?: string;
	rating?: number;
	reviewsCount?: number;
}

/** The business a prospect is. */
export interface AdminProspectBrandOutputDto {
	id: string;
	name: string;
	/** 0–100, how good a prospect it is; absent until scored */
	leadScore?: number;
	/** Its open branches */
	branches: number;
}

export interface AdminProspectListItemOutputDto {
	id: string;
	createdAt: Date;
	updatedAt: Date;
	brand: AdminProspectBrandOutputDto;
	/** Its most reviewed open branch; absent when every branch closed */
	venue?: AdminProspectVenueOutputDto;
	stage: ProspectStageEnum;
	language: ProspectLanguage;
	contactName?: string;
	contactEmail?: string;
	instagram?: string;
	hook?: string;
	notes?: string;
	nextFollowUpAt?: Date;
	lastTouchAt?: Date;
	outreachCount: number;
}

export interface AdminOutreachTouchOutputDto {
	id: string;
	createdAt: Date;
	kind: OutreachTouchKindEnum;
	at: Date;
	subject?: string;
	body?: string;
	template?: string;
	stage?: ProspectStageEnum;
}

/** The brand's newest report, cut down to what an outreach email quotes. */
export interface AdminProspectReportOutputDto {
	id: string;
	month: string;
	title: string;
	headline: string;
	/** Posts by others, the creators behind them and their views */
	posts: number;
	creators: number;
	views: number;
	/** Google reviews that month */
	reviews: number;
	avgStars?: number;
	replyRate?: number;
	/** The brand's own accounts, from its own posts */
	ownAccounts: { platform: 'tiktok' | 'instagram'; handle: string }[];
}

/** Someone who may open the brand's portal. */
export interface AdminPortalMemberOutputDto {
	id: string;
	createdAt: Date;
	role: BrandMemberRoleEnum;
	/** Their first sign-in after the invite; absent while it is open */
	acceptedAt?: Date;
	user: { id: string; email?: string; firstName: string; lastName: string };
}

export interface AdminProspectOutputDto extends AdminProspectListItemOutputDto {
	/** The city of `venue` (`City.name`): the templates' {city} */
	city?: string;
	/** Newest first */
	touches: AdminOutreachTouchOutputDto[];
	latestReport?: AdminProspectReportOutputDto;
	/** Who has the brand's portal, invited first first */
	portalMembers: AdminPortalMemberOutputDto[];
}

export interface AdminListProspectsOutputDto
	extends PaginatedResult<AdminProspectListItemOutputDto> {}

export interface AdminOutreachSummaryOutputDto {
	stages: { stage: ProspectStageEnum; count: number }[];
	/** Follow-ups due by the end of today */
	due: number;
	/** Emails, DMs, calls and visits in the last 7 days */
	outreachLast7Days: number;
}

/** A brand with a high lead score that is not a prospect yet; the place figures are its most reviewed open branch's. */
export interface AdminSuggestedProspectOutputDto {
	/** The brand's */
	id: string;
	name: string;
	/** Its open branches */
	branches: number;
	city?: string;
	category?: string;
	district?: string;
	website?: string;
	rating?: number;
	reviewsCount?: number;
	leadScore: number;
	/** Why it scores as it does */
	leadSignals?: LeadSignals;
}
