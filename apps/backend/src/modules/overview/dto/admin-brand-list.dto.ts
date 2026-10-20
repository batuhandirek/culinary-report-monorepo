import { tags } from 'typia';

import type { ImageOutputDto } from 'src/modules/image/dto/image.output.dto.js';
import type { ProspectStageEnum } from 'src/modules/outreach/constants/outreach.constant.js';
import { PaginationRequest } from 'src/shared/interfaces/pagination-request.interface.js';

type Month = string & tags.Pattern<'^[0-9]{4}-[0-9]{2}$'>;

/**
 * Which brands the list shows: talked about this month (posts by others), every brand with an
 * open branch, the sales list (a prospect not won), the customers (won), or the chains.
 */
export type AdminBrandSegment = 'talked' | 'all' | 'prospects' | 'customers' | 'chains';

export type AdminBrandSort =
	`${'posts' | 'change' | 'views' | 'leadScore' | 'rating' | 'reviews' | 'name' | 'branches' | 'followUp'}:${'asc' | 'desc'}`;

export interface AdminListBrandsInputDto extends PaginationRequest {
	/** The brands with an open branch in this city, and their figures there; every city without */
	cityId?: string & tags.Format<'uuid'>;
	/** The month the figures are for; the last finished month without */
	month?: Month;
	segment?: AdminBrandSegment;
	/** On the brand's name or any of its branches' */
	q?: string;
	/** Brands with an open branch in this district */
	district?: string;
	stage?: ProspectStageEnum;
	sort?: AdminBrandSort;
}

/** The place a brand is shown as: its most reviewed open branch (in the city). */
export interface AdminBrandRowVenueOutputDto {
	id: string;
	name: string;
	category?: string;
	district?: string;
	street?: string;
	rating?: number;
	reviewsCount?: number;
	favicon?: ImageOutputDto;
}

/** What social media and Google reviews said about a brand in one month. */
export interface AdminBrandMonthFiguresOutputDto {
	/** Posts by others naming it (its own accounts left out) */
	posts: number;
	views: number;
	/** Distinct authors of those posts */
	creators: number;
	/** Posts by its own accounts */
	ownPosts: number;
	/** Google and TripAdvisor reviews of its branches posted that month */
	reviews: number;
	/** Their mean stars; absent without reviews */
	stars?: number;
	/** Written reviews of 3 stars or fewer nobody answered */
	unanswered: number;
}

export interface AdminBrandRowOutputDto {
	id: string;
	name: string;
	leadScore?: number;
	/** Open branches (in the city) */
	branches: number;
	/** The districts they are in */
	districts: string[];
	venue?: AdminBrandRowVenueOutputDto;
	month: AdminBrandMonthFiguresOutputDto;
	/** Posts and views the month before */
	previous: { posts: number; views: number };
	/** Its place on the sales list */
	prospect?: { id: string; stage: ProspectStageEnum; nextFollowUpAt?: Date };
	/** The month's report (for the city, or across the brand's cities) */
	report?: { id: string; updatedAt: Date; sentAt?: Date };
}

export interface AdminListBrandsOutputDto {
	items: AdminBrandRowOutputDto[];
	totalItems: number;
	page: number;
	pageSize: number;
	month: string;
	/** How many brands each segment holds under the same search and district */
	segments: Record<AdminBrandSegment, number>;
}
