import { tags } from 'typia';

import type { FeedbackPointOutputDto } from 'src/modules/feedback/dto/feedback-point.output.dto.js';
import type { AdminCityRefOutputDto } from 'src/modules/cities/dto/admin-city.output.dto.js';
import type {
	FeedbackSentiment,
} from 'src/modules/venues/interfaces/feedback.interface.js';
import { PaginatedResult } from 'src/shared/interfaces/paginated-result.interface.js';
import { PaginationRequest } from 'src/shared/interfaces/pagination-request.interface.js';

import { MentionMatchMethodEnum } from '../entities/mention.entity.js';
import { PostSourceKindEnum } from '../entities/post-source.entity.js';
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
	/** What it says, as feedback rows */
	feedback: FeedbackPointOutputDto[];
	/** The kinds of food it is about (on a post's page): its cuisine's, else its venue's category's */
	foodTopics?: { source: 'cuisine' | 'category'; topic: { key: string; label: string } }[];
	/** The brand it was matched to */
	brand?: { id: string; name: string };
	/** The branch, when the post says which; a chain's mention may have the brand only */
	venue?: AdminVenueRefOutputDto;
	matchMethod?: MentionMatchMethodEnum;
	matchScore?: number;
	matchNote?: string;
}

/** One find of a post (`PostSource`). */
export interface AdminPostFindOutputDto {
	kind: PostSourceKindEnum;
	/** The tag, query, blog URL or venue name the scrape looked for */
	value: string;
	foundAt: Date;
	/** The city source it is, when it is one */
	source?: { id: string; enabled: boolean };
	/** The venue a venue search or place page was for */
	venue?: AdminVenueRefOutputDto;
}

export interface AdminHashtagOutputDto {
	id: number;
	tag: string;
	ignored: boolean;
	foodTopic?: { key: string; label: string };
	brand?: { id: string; name: string };
}

export interface AdminPostHashtagOutputDto {
	hashtag: AdminHashtagOutputDto;
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
	/** Every source that found it, the first find first */
	foundBy: AdminPostFindOutputDto[];
	text?: string;
	analysedAt?: Date;
	mentions: AdminMentionOutputDto[];
}

/** One read of a post's counts: a scrape that found it, or the refresh at seven days. */
export interface AdminPostSnapshotOutputDto {
	id: string;
	at: Date;
	views: number;
	likes: number;
	shares: number;
	comments: number;
	saves: number;
}

export interface AdminSocialPostOutputDto extends AdminSocialPostListItemOutputDto {
	createdAt: Date;
	/** When the counts shown were read; absent for a blog article */
	countsAt?: Date;
	/** When they became final: read at seven days or later (or the post was found gone) */
	countsFinalAt?: Date;
	/** Every read of its counts, oldest first, also those after they became final */
	snapshots: AdminPostSnapshotOutputDto[];
	/** The city whose scrape found it */
	city: AdminCityRefOutputDto;
	/** The caption's hashtags, in its order, with the food topic or brand each names */
	hashtagLinks: AdminPostHashtagOutputDto[];
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
	/** Only posts whose caption carries this hashtag (with or without #, any case) */
	hashtag?: string & tags.MaxLength<200>;
}

export interface AdminListPostsOutputDto extends PaginatedResult<AdminSocialPostListItemOutputDto> {}

export interface AdminMentionWithPostOutputDto extends AdminMentionOutputDto {
	post: Omit<AdminSocialPostListItemOutputDto, 'mentions' | 'account' | 'foundBy'>;
}

export interface AdminListMentionsInputDto extends PaginationRequest {
	venueId?: string & tags.Format<'uuid'>;
	/** The brand's mentions: of every branch and of the brand alone */
	brandId?: string & tags.Format<'uuid'>;
	month?: Month;
	matchMethod?: MentionMatchMethodEnum;
}

export interface AdminListMentionsOutputDto extends PaginatedResult<AdminMentionWithPostOutputDto> {}
