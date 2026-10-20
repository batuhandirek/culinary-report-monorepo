import type { BrandMemberRoleEnum } from 'src/modules/auth/constants/brand-member-role.enum.constant.js';
import type { ProspectLanguage } from 'src/modules/outreach/constants/outreach.constant.js';
import type { SharedReportOutputDto } from 'src/modules/reports/dto/report-share.output.dto.js';
import type { SocialPlatformEnum } from 'src/modules/social/entities/social-post.entity.js';
import type { ReviewPlatformEnum } from 'src/modules/venues/entities/review.entity.js';
import type { BrandReportScopeEnum } from 'src/modules/venues/entities/brand.entity.js';
import type { CompetitorPickedByEnum } from 'src/modules/venues/entities/brand-competitor.entity.js';
import type {
	FeedbackDish,
	FeedbackPoint,
	FeedbackSentiment,
	FeedbackTopic,
} from 'src/modules/venues/interfaces/feedback.interface.js';
import type { PaginatedResult } from 'src/shared/interfaces/paginated-result.interface.js';

/** One of a brand's places, as its portal shows it. */
export interface PortalVenueOutputDto {
	id: string;
	name: string;
	/** Google's city or locality, e.g. "Berlin" */
	locality?: string;
	district?: string;
	street?: string;
	category?: string;
	googleUrl?: string;
	rating?: number;
	reviewsCount?: number;
}

/** A city a brand has branches in. */
export interface PortalCityOutputDto {
	id: string;
	name: string;
}

/** A brand as its portal shows it: its open branches, the most reviewed first, and their cities. */
export interface PortalBrandOutputDto {
	id: string;
	name: string;
	/** `all`: one report across its cities, so Trends and Patterns read no single city */
	reportScope: BrandReportScopeEnum;
	branches: PortalVenueOutputDto[];
	/** The most branches first: the first is the portal's city by default */
	cities: PortalCityOutputDto[];
}

/** A brand the signed-in person is a member of. */
export interface PortalMembershipOutputDto {
	id: string;
	role: BrandMemberRoleEnum;
	brand: PortalBrandOutputDto;
}

export interface PortalBrandsOutputDto {
	/** By brand name */
	items: PortalMembershipOutputDto[];
}

/** A month in the archive. */
export interface PortalReportListItemOutputDto {
	id: string;
	month: string;
	updatedAt: Date;
	postCount: number;
	reviewCount: number;
	title: string;
	headline: string;
	/** The city whose branches it covers; absent for a report across all its cities */
	city?: PortalCityOutputDto;
}

export interface PortalReportsOutputDto {
	/** Newest month first */
	items: PortalReportListItemOutputDto[];
}

/** A report as the brand reads it: the shared link's document, without the delivery record. */
export interface PortalReportOutputDto extends SharedReportOutputDto {}

/** Where the monthly report goes and in which language. */
export interface PortalSettingsOutputDto {
	/** The address the report mail goes to */
	contactEmail?: string;
	/** The language of our mails to them */
	language: ProspectLanguage;
	/** False when we keep no record to write to (the brand is not on our list) */
	editable: boolean;
}

/** A Google or TripAdvisor review as the portal lists it. The entity stores no reviewer names. */
export interface PortalReviewOutputDto {
	id: string;
	platform: ReviewPlatformEnum;
	publishedAt: Date;
	stars?: number;
	text?: string;
	/** Google's English translation */
	textTranslated?: string;
	language?: string;
	ownerResponse?: string;
	ownerResponseAt?: Date;
	/** When the owner marked it answered here */
	markedRepliedAt?: Date;
	sentiment?: FeedbackSentiment;
	praise?: FeedbackPoint[];
	complaints?: FeedbackPoint[];
	/** Answered on Google, or marked answered here */
	answered: boolean;
	/** A reply ready to post, in the review's language: unanswered written reviews only, when drafted */
	replyDraft?: string;
	/** The branch it is about, for a chain's portal (which shows every branch's reviews) */
	branch?: string;
}

export interface PortalReviewsOutputDto extends PaginatedResult<PortalReviewOutputDto> {}

/** The values the brand's reviews can be filtered by, with how many reviews carry each. */
export interface PortalReviewFiltersOutputDto {
	/** Newest first */
	months: { month: string; count: number }[];
	languages: { language: string; count: number }[];
	topics: { topic: FeedbackTopic; count: number }[];
	/** The platforms the brand has reviews on */
	platforms: { platform: ReviewPlatformEnum; count: number }[];
	/** Written, three stars or fewer, unanswered */
	needsReply: number;
}

/** A post about the brand and what it said about it. */
export interface PortalPostOutputDto {
	id: string;
	platform: SocialPlatformEnum;
	url: string;
	postedAt: Date;
	author?: string;
	authorFans?: number;
	views: number;
	likes: number;
	comments: number;
	shares: number;
	saves: number;
	/** An ad, or paid / gifted as the caption reads */
	paid: boolean;
	/** Posted by the brand's own account */
	own: boolean;
	sentiment: FeedbackSentiment;
	/** What the post said about the brand, one or two sentences */
	summary: string;
	/** False when the creator says they have not been there */
	visited: boolean;
	dishes: FeedbackDish[];
}

export interface PortalPostsOutputDto extends PaginatedResult<PortalPostOutputDto> {}

/** One author's posts about the brand. */
export interface PortalCreatorOutputDto {
	author: string;
	platform: SocialPlatformEnum;
	authorFans?: number;
	posts: number;
	views: number;
	/** Of which paid or gifted */
	paid: number;
	own: boolean;
	lastPostedAt: Date;
	/** Their most viewed post */
	url: string;
}

export interface PortalCreatorsOutputDto {
	/** Most viewed first */
	items: PortalCreatorOutputDto[];
}

export interface PortalPostFiltersOutputDto {
	/** Months with a post about the brand, newest first */
	months: { month: string; count: number }[];
}

/** A place the owner can compare with, and its brand. */
export interface PortalCompetitorVenueOutputDto {
	id: string;
	name: string;
	category?: string;
	district?: string;
	street?: string;
	rating?: number;
	reviewsCount?: number;
	/** Its brand: one with more than one open branch can be added whole */
	brand: { id: string; name: string; branches: number };
}

/** A whole brand on the list. */
export interface PortalCompetitorBrandOutputDto {
	id: string;
	name: string;
	/** Its open branches */
	branches: number;
}

/** One entry on the list: a place or a whole brand. */
export interface PortalCompetitorOutputDto {
	/** Its id on the list, to take it off */
	id: number;
	/** The brand's branch it competes with; absent for the whole brand */
	branch?: { id: string; name: string; street?: string };
	venue?: PortalCompetitorVenueOutputDto;
	brand?: PortalCompetitorBrandOutputDto;
	/** Who put it on the list: the brand's people, us, or our first suggestions */
	pickedBy: CompetitorPickedByEnum;
}

export interface PortalCompetitorSuggestionOutputDto {
	venue: PortalCompetitorVenueOutputDto;
	/** "same category", "neighbouring district", … */
	reasons: string[];
}

/** The brand's competitors (one list, whoever picked them) and places to add. */
export interface PortalCompetitorsOutputDto {
	/** By name */
	items: PortalCompetitorOutputDto[];
	/** Best first; none when the list is full */
	suggestions: PortalCompetitorSuggestionOutputDto[];
	/** How many a brand can have */
	max: number;
}

export interface PortalCompetitorSearchOutputDto {
	items: PortalCompetitorVenueOutputDto[];
}
