import { tags } from 'typia';

import type { AdminCityRefOutputDto } from 'src/modules/cities/dto/admin-city.output.dto.js';
import type {
	FeedbackDish,
	FeedbackPoint,
	FeedbackSentiment,
} from 'src/modules/venues/interfaces/feedback.interface.js';
import { PaginatedResult } from 'src/shared/interfaces/paginated-result.interface.js';
import { PaginationRequest } from 'src/shared/interfaces/pagination-request.interface.js';

import { MentionMatchMethodEnum } from '../entities/mention.entity.js';
import { SocialPlatformEnum } from '../entities/social-post.entity.js';

type Month = string & tags.Pattern<'^[0-9]{4}-[0-9]{2}$'>;

export interface AdminVenueRefOutputDto {
	id: string;
	name: string;
	district?: string;
}

export interface AdminMentionOutputDto {
	id: number;
	venueName: string;
	locationHint?: string;
	cuisine?: string;
	city?: string;
	visited: boolean;
	sentiment: FeedbackSentiment;
	summary: string;
	dishes: FeedbackDish[];
	praise: FeedbackPoint[];
	complaints: FeedbackPoint[];
	/** The brand it was matched to */
	brand?: { id: string; name: string };
	/** The branch, when the post says which; a chain's mention may have the brand only */
	venue?: AdminVenueRefOutputDto;
	matchMethod?: MentionMatchMethodEnum;
	matchScore?: number;
	matchNote?: string;
}

/** Who posted it: the account, its creator, and the brand when it is a brand's own. */
export interface AdminPostAccountOutputDto {
	id: string;
	handle: string;
	creator: { id: string; name: string };
	brand?: { id: string; name: string };
}

export interface AdminSocialPostListItemOutputDto {
	id: string;
	externalId: string;
	platform: SocialPlatformEnum;
	url: string;
	postedAt: Date;
	author?: string;
	account?: AdminPostAccountOutputDto;
	authorFans?: number;
	views: number;
	likes: number;
	comments: number;
	shares: number;
	saves: number;
	isAd: boolean;
	isPromotional?: boolean;
	locationName?: string;
	source?: string;
	text?: string;
	analysedAt?: Date;
	mentions: AdminMentionOutputDto[];
}

export interface AdminSocialPostOutputDto extends AdminSocialPostListItemOutputDto {
	createdAt: Date;
	/** The city whose scrape found it */
	city: AdminCityRefOutputDto;
	hashtags?: string[];
	taggedHandles?: string[];
	subtitles?: string;
	subtitlesLanguage?: string;
	analysisTokens?: number;
}

type AdminListPostsSortField = 'postedAt' | 'views';

export interface AdminListPostsInputDto extends PaginationRequest {
	sort?: `${AdminListPostsSortField}:${'asc' | 'desc'}`;
	q?: string;
	cityId?: string & tags.Format<'uuid'>;
	platform?: SocialPlatformEnum;
	month?: Month;
	/** Only posts that mention this venue. */
	venueId?: string & tags.Format<'uuid'>;
	/** Only posts that mention this brand, a branch of it or the brand alone. */
	brandId?: string & tags.Format<'uuid'>;
	/** Only posts by this creator's accounts */
	creatorId?: string & tags.Format<'uuid'>;
	/** Only posts by this account */
	accountId?: string & tags.Format<'uuid'>;
	/** Only posts with at least one mention matched to a brand. */
	matchedOnly?: boolean;
	/** Only posts with a mention nothing matched (`none`): to link by hand. */
	unmatchedOnly?: boolean;
}

export interface AdminListPostsOutputDto extends PaginatedResult<AdminSocialPostListItemOutputDto> {}

export interface AdminMentionWithPostOutputDto extends AdminMentionOutputDto {
	post: Omit<AdminSocialPostListItemOutputDto, 'mentions' | 'account'>;
}

export interface AdminListMentionsInputDto extends PaginationRequest {
	venueId?: string & tags.Format<'uuid'>;
	/** The brand's mentions: of every branch and of the brand alone */
	brandId?: string & tags.Format<'uuid'>;
	month?: Month;
	matchMethod?: MentionMatchMethodEnum;
}

export interface AdminListMentionsOutputDto extends PaginatedResult<AdminMentionWithPostOutputDto> {}
