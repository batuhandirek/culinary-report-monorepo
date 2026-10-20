import { tags } from 'typia';

import type { AdminCityRefOutputDto } from 'src/modules/cities/dto/admin-city.output.dto.js';
import type { ImageOutputDto } from 'src/modules/image/dto/image.output.dto.js';
import { PaginatedResult } from 'src/shared/interfaces/paginated-result.interface.js';
import { PaginationRequest } from 'src/shared/interfaces/pagination-request.interface.js';

import type {
	FeedbackDish,
	FeedbackPoint,
	FeedbackSentiment,
} from '../interfaces/feedback.interface.js';
import type { LeadSignals } from '../interfaces/lead-score.interface.js';
import type { VenueDetails } from '../interfaces/venue-details.interface.js';

import type { AdminBrandRefOutputDto } from './admin-brand.output.dto.js';

export interface AdminVenueListItemOutputDto {
	id: string;
	placeId: string;
	name: string;
	category?: string;
	district?: string;
	street?: string;
	rating?: number;
	reviewsCount?: number;
	closed: boolean;
	mentionCount: number;
	/** The brand it is a branch of: its lead score is the brand's */
	brand: AdminBrandRefOutputDto;
	/** Its website's icon; absent until found */
	favicon?: ImageOutputDto;
}

export interface AdminVenueSnapshotOutputDto {
	snapshotDate: string;
	rating?: number;
	reviewsCount?: number;
}

/** The venue page's brand: what the lead score panel and the brand panel show. */
export interface AdminVenueBrandOutputDto extends AdminBrandRefOutputDto {
	/** How we scored it as an outreach prospect */
	leadSignals?: LeadSignals;
	/** All its branches, closed ones too: more than one makes it a chain */
	branches: number;
}

export interface AdminVenueOutputDto extends Omit<AdminVenueListItemOutputDto, 'brand'> {
	brand: AdminVenueBrandOutputDto;
	createdAt: Date;
	updatedAt: Date;
	/** The city whose pipeline covers it */
	city: AdminCityRefOutputDto;
	/** Google's own city or locality field */
	locality?: string;
	postalCode?: string;
	categories?: string[];
	lat?: number;
	lng?: number;
	priceLevel?: string;
	website?: string;
	/** When the website's icon was last looked for, found or not */
	faviconCheckedAt?: Date;
	/** Its booking page (TheFork, OpenTable or Google's), set by hand; open tables are sampled from it first */
	bookingUrl?: string;
	/** The platform behind its Google booking page ("OpenTable"), from the latest Google sample */
	reservationPartner?: string;
	phone?: string;
	googleUrl?: string;
	snapshots: AdminVenueSnapshotOutputDto[];
	/** Hours, amenities, popular times, "people also search"; absent fields are unknown */
	details?: VenueDetails;
	detailsAt?: Date;
}

type AdminListVenuesSortField =
	'name' | 'rating' | 'reviewsCount' | 'mentionCount' | 'leadScore' | 'createdAt';
type AdminListVenuesSortOrder = 'asc' | 'desc';

export interface AdminListVenuesInputDto extends PaginationRequest {
	sort?: `${AdminListVenuesSortField}:${AdminListVenuesSortOrder}`;
	q?: string;
	cityId?: string & tags.Format<'uuid'>;
	district?: string;
	/** Only venues at least one social media mention is linked to. */
	mentionedOnly?: boolean;
	/** Only venues whose brand scored at or above `LEAD_PROSPECT_SCORE`. */
	prospectsOnly?: boolean;
	/** Only venues that opened (a city-wide scrape first saw them) in the last `LEAD_NEW_PLACE_MONTHS` months. */
	newOnly?: boolean;
}

export interface AdminListVenuesOutputDto extends PaginatedResult<AdminVenueListItemOutputDto> {}

export interface AdminReviewOutputDto {
	id: string;
	reviewId: string;
	publishedAt: Date;
	stars?: number;
	text?: string;
	textTranslated?: string;
	language?: string;
	likes: number;
	ownerResponse?: string;
	ownerResponseAt?: Date;
	sentiment?: FeedbackSentiment;
	praise?: FeedbackPoint[];
	complaints?: FeedbackPoint[];
	dishes?: FeedbackDish[];
	changes?: string[];
	analysedAt?: Date;
}

export interface AdminListVenueReviewsInputDto extends PaginationRequest {
	/** YYYY-MM */
	month?: string & tags.Pattern<'^[0-9]{4}-[0-9]{2}$'>;
}

export interface AdminListVenueReviewsOutputDto extends PaginatedResult<AdminReviewOutputDto> {}

export interface AdminListReviewsInputDto extends PaginationRequest {
	/** Every branch's reviews */
	brandId?: string & tags.Format<'uuid'>;
	venueId?: string & tags.Format<'uuid'>;
	/** Branches in this city */
	cityId?: string & tags.Format<'uuid'>;
	/** YYYY-MM */
	month?: string & tags.Pattern<'^[0-9]{4}-[0-9]{2}$'>;
	/** Written, 3 stars or fewer, nobody answered (no owner reply, not marked answered): lowest first */
	needsReply?: boolean;
	stars?: number & tags.Type<'uint32'> & tags.Minimum<1> & tags.Maximum<5>;
	platform?: 'google' | 'tripadvisor';
}

/** A review with the branch it is about (a chain lists several). */
export interface AdminBranchReviewOutputDto extends AdminReviewOutputDto {
	platform: 'google' | 'tripadvisor';
	branch: { id: string; name: string; street?: string; district?: string };
	markedRepliedAt?: Date;
	replyDraft?: string;
}

export interface AdminListReviewsOutputDto extends PaginatedResult<AdminBranchReviewOutputDto> {}
