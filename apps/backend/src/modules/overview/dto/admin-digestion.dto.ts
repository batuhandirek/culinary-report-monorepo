import { tags } from 'typia';

import type { AdminCityRefOutputDto } from 'src/modules/cities/dto/admin-city.output.dto.js';
import type {
	AdminMentionOutputDto,
	AdminPostAccountOutputDto,
	AdminPostHashtagOutputDto,
} from 'src/modules/social/dto/admin-social.output.dto.js';
import type {
	PostSkipReasonEnum,
	SocialPlatformEnum,
} from 'src/modules/social/entities/social-post.entity.js';
import type { StatementOutputDto } from 'src/modules/statements/dto/statement.output.dto.js';
import type { ReviewPlatformEnum } from 'src/modules/venues/entities/review.entity.js';
import { PaginatedResult } from 'src/shared/interfaces/paginated-result.interface.js';
import { PaginationRequest } from 'src/shared/interfaces/pagination-request.interface.js';

/** Where a digested source was said: a review's platform or a post's */
export type DigestionPlatform = `${ReviewPlatformEnum}` | `${SocialPlatformEnum}`;

/**
 * How far the pipeline got with a source: `digested` (read by agent A: its places and claims are
 * stored), `skipped` (a post the gate turned away, with its reason) or `unread` (not read yet)
 */
export type DigestionStatus = 'digested' | 'skipped' | 'unread';

export interface AdminDigestionInputDto extends PaginationRequest {
	/** Reviews or posts; both when absent */
	kind?: 'review' | 'post';
	platform?: DigestionPlatform;
	/** A post's city, a review's venue's */
	cityId?: string & tags.Format<'uuid'>;
	status?: DigestionStatus;
	/** Posts the gate skipped for this reason (implies `skipped`) */
	skipReason?: PostSkipReasonEnum;
	/** Words in the source: a caption, transcript or article; a review's text or translation */
	q?: string & tags.MaxLength<200>;
}

/** A source's claims by sentiment; `unread` is those agent B has not read yet */
export interface AdminDigestionTallyOutputDto {
	positive: number;
	negative: number;
	neutral: number;
	mixed: number;
	unread: number;
}

/** A review as a Digestion row shows it */
export interface AdminDigestionReviewRowOutputDto {
	id: string;
	platform: ReviewPlatformEnum;
	publishedAt: Date;
	stars?: number;
	analysedAt?: Date;
	venue: AdminDigestionVenueOutputDto;
}

/** A post as a Digestion row shows it */
export interface AdminDigestionPostRowOutputDto {
	id: string;
	platform: SocialPlatformEnum;
	url: string;
	postedAt: Date;
	author?: string;
	account?: { id: string; handle: string; creator: { id: string; name: string } };
	city: AdminCityRefOutputDto;
	gatedAt?: Date;
	skipReason?: PostSkipReasonEnum;
	analysedAt?: Date;
	isPromotional?: boolean;
}

/** One digested source, collapsed: exactly one of `review` / `post` */
export interface AdminDigestionRowOutputDto {
	kind: 'review' | 'post';
	status: DigestionStatus;
	/** The start of its text (a post's caption, else its transcript), whitespace folded */
	excerpt?: string;
	/** The places agent A took from it (a post's mentions); 0 for a review, whose place is its venue */
	places: number;
	/** Its statements, dish-only ones included */
	claims: number;
	sentiments: AdminDigestionTallyOutputDto;
	review?: AdminDigestionReviewRowOutputDto;
	post?: AdminDigestionPostRowOutputDto;
}

export interface AdminDigestionOutputDto extends PaginatedResult<AdminDigestionRowOutputDto> {}

/** A claim as the Digestion page shows it: with when agent B read it and the place it is about */
export interface AdminDigestionStatementOutputDto extends StatementOutputDto {
	/** When agent B read it; absent = not read by agent B yet */
	partsAt?: Date;
	/** The post's place it is about (`subject` place on a post); absent on a review's claim */
	mention?: { id: number };
}

/** A place agent A took from a post, and what matching made of it */
export interface AdminDigestionMentionOutputDto extends Omit<AdminMentionOutputDto, 'statements'> {
	isNewOpening: boolean;
	matchedAt?: Date;
}

/** A post and every step of the pipeline over it: the gate, agent A's places and claims, agent B's parts */
export interface AdminDigestedPostOutputDto {
	id: string;
	externalId: string;
	platform: SocialPlatformEnum;
	url: string;
	postedAt: Date;
	author?: string;
	authorFans?: number;
	account?: AdminPostAccountOutputDto;
	city: AdminCityRefOutputDto;
	views: number;
	likes: number;
	comments: number;
	shares: number;
	saves: number;
	isAd: boolean;
	/** Paid, gifted or invited, as agent A read it */
	isPromotional?: boolean;
	locationName?: string;
	taggedHandles?: string[];
	/** The caption; a blog article's title and text */
	text?: string;
	subtitles?: string;
	subtitlesLanguage?: string;
	hashtagLinks: AdminPostHashtagOutputDto[];
	gatedAt?: Date;
	skipReason?: PostSkipReasonEnum;
	analysedAt?: Date;
	analysisTokens?: number;
	mentions: AdminDigestionMentionOutputDto[];
	/** Every claim it makes, in order: about one of its places (`mention`), the city or nothing */
	statements: AdminDigestionStatementOutputDto[];
}

export interface AdminDigestionVenueOutputDto {
	id: string;
	name: string;
	district?: string;
	street?: string;
	city: AdminCityRefOutputDto;
	brand: { id: string; name: string };
}

/** A review and what agent A and B made of it; its place is its venue */
export interface AdminDigestedReviewOutputDto {
	id: string;
	reviewId: string;
	platform: ReviewPlatformEnum;
	publishedAt: Date;
	stars?: number;
	text?: string;
	textTranslated?: string;
	language?: string;
	likes: number;
	ownerResponse?: string;
	analysedAt?: Date;
	venue: AdminDigestionVenueOutputDto;
	statements: AdminDigestionStatementOutputDto[];
}
