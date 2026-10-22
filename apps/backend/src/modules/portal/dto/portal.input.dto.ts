import { tags } from 'typia';

import type { ProspectLanguage } from 'src/modules/outreach/constants/outreach.constant.js';
import type { SocialPlatformEnum } from 'src/modules/social/entities/social-post.entity.js';
import type { ReviewPlatformEnum } from 'src/modules/venues/entities/review.entity.js';
import type { FeedbackTopic } from 'src/modules/venues/interfaces/feedback.interface.js';

export interface PortalUpdateSettingsInputDto {
	/** `null` clears it */
	contactEmail?: (string & tags.Format<'email'> & tags.MaxLength<300>) | null;
	language?: ProspectLanguage;
}

export interface PortalSeriesInputDto {
	/** How many months, ending with the last finished one; 12 when absent */
	months?: number & tags.Type<'uint32'> & tags.Minimum<1> & tags.Maximum<24>;
	/** The city whose reports to read; the brand's first city when absent */
	cityId?: string & tags.Format<'uuid'>;
	/** The branch whose rating, busyness and open tables to show; the most reviewed when absent */
	branchId?: string & tags.Format<'uuid'>;
}

export interface PortalPatternsInputDto {
	/** How many months, ending with the last finished one; 6 when absent */
	months?: number & tags.Type<'uint32'> & tags.Minimum<1> & tags.Maximum<24>;
	/** The city whose reports to read; the brand's first city when absent */
	cityId?: string & tags.Format<'uuid'>;
	/** The branch whose busyness and open tables to show; the most reviewed when absent */
	branchId?: string & tags.Format<'uuid'>;
}

type Month = string & tags.Pattern<'^[0-9]{4}-[0-9]{2}$'>;

export interface PortalListReviewsInputDto {
	page: number & tags.Type<'uint32'> & tags.Minimum<1>;
	size: number & tags.Type<'uint32'> & tags.Minimum<1> & tags.Maximum<50>;
	month?: Month;
	stars?: number & tags.Type<'uint32'> & tags.Minimum<1> & tags.Maximum<5>;
	/** A topic the review praised or criticised */
	topic?: FeedbackTopic;
	/** Answered on Google or marked answered here */
	answered?: boolean;
	/** The review's original language, e.g. `de` */
	language?: string & tags.MaxLength<12>;
	/** Written, three stars or fewer, unanswered: the lowest stars first */
	needsReply?: boolean;
	/** Google or TripAdvisor */
	platform?: ReviewPlatformEnum;
}

export interface PortalMarkReviewRepliedInputDto {
	/** True: the owner answered it on Google; false takes the mark back */
	replied: boolean;
}

export interface PortalListPostsInputDto {
	page: number & tags.Type<'uint32'> & tags.Minimum<1>;
	size: number & tags.Type<'uint32'> & tags.Minimum<1> & tags.Maximum<50>;
	month?: Month;
	platform?: SocialPlatformEnum;
}

export interface PortalListCreatorsInputDto {
	month?: Month;
	platform?: SocialPlatformEnum;
}

/** A place (`venueId`) or a whole brand (`brandId`), exactly one; for one of the brand's branches with `branchId`. */
export interface PortalAddCompetitorInputDto {
	venueId?: string & tags.Format<'uuid'>;
	brandId?: string & tags.Format<'uuid'>;
	branchId?: string & tags.Format<'uuid'>;
}

export interface PortalSearchCompetitorsInputDto {
	q: string & tags.MinLength<2> & tags.MaxLength<80>;
}
