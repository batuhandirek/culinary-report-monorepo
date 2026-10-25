import { tags } from 'typia';

import type { FeedbackUnit } from 'src/modules/feedback/entities/feedback-point.entity.js';
import type { SocialPlatformEnum } from 'src/modules/social/entities/social-post.entity.js';
import type { FeedbackTheme } from 'src/modules/venues/constants/feedback-themes.constant.js';
import type { ReviewPlatformEnum } from 'src/modules/venues/entities/review.entity.js';
import type {
	FeedbackSentiment,
	FeedbackTopic,
} from 'src/modules/venues/interfaces/feedback.interface.js';

export interface AdminGetThemeInsightsInputDto {
	month: string & tags.Pattern<'^[0-9]{4}-[0-9]{2}$'>;
	cityId: string & tags.Format<'uuid'>;
	/** A food topic's key: only the brands whose food it is (most of their places' main food) */
	food?: string & tags.MaxLength<64>;
}

export interface AdminThemeFoodOutputDto {
	key: string;
	/** "Döner & kebab" */
	label: string;
	/** Reviews and posts of its brands raising the theme */
	sources: number;
	/** Of its brands' reviews and posts with any point this month, percent */
	share: number;
}

/** One kind of food in the month. */
export interface AdminThemeFoodCoverageOutputDto {
	key: string;
	label: string;
	/** Its brands' written reviews with any point */
	reviews: number;
	/** Posts by others about its brands with any point */
	posts: number;
	brands: number;
}

export interface AdminThemeBrandOutputDto {
	id: string;
	name: string;
	/** Its reviews and posts raising the theme */
	sources: number;
}

/** One theme, praised or criticised, in the city and month. */
export interface AdminThemeDishOutputDto {
	/** `topic:<key>` or `dish:<key>` */
	key: string;
	label: string;
	/** The food topic's key, for its page */
	foodTopic?: string;
	/** Reviews and posts raising the theme about it */
	sources: number;
	/** Of the reviews and posts with a point of this side about it, percent */
	share: number;
}

export interface AdminThemeInsightRowOutputDto {
	key: FeedbackTheme;
	topic: FeedbackTopic;
	/** "Price increase" */
	label: string;
	/** Written reviews raising it */
	reviews: number;
	/** Posts by others raising it */
	posts: number;
	/** Of the month's written reviews with any point, percent */
	reviewShare: number | null;
	/** Of the month's posts by others with any point, percent */
	postShare: number | null;
	/** Against the month before, in percentage points */
	reviewShareChange: number | null;
	postShareChange: number | null;
	/** Brands it came up at */
	venues: number;
	/** The three it came up at most */
	topBrands: AdminThemeBrandOutputDto[];
	/** The three kinds of food it came up at most */
	foods: AdminThemeFoodOutputDto[];
	/** The five dishes its points were about most: a food topic's dishes as one */
	dishes: AdminThemeDishOutputDto[];
	/** Up to five distinct details, newest first */
	samples: string[];
}

export interface AdminThemeCoverageOutputDto {
	/** Written reviews of the month with any praise or complaint point */
	reviews: number;
	/** The brands those reviews are of (reviews are scraped for report venues and their competitors) */
	reviewBrands: number;
	/** Posts by others with any point about a matched venue */
	posts: number;
	postBrands: number;
	/** Of those, the ones with a point not filed under a theme yet: counted under no theme */
	unfiledReviews: number;
	unfiledPosts: number;
}

export interface AdminThemeInsightsOutputDto {
	month: string;
	/** The month the changes are against */
	previous: string;
	/** The kind of food the counts are narrowed to, null for every brand */
	food: { key: string; label: string } | null;
	/** The month's kinds of food, the most reviews and posts first, whatever `food` is */
	foods: AdminThemeFoodCoverageOutputDto[];
	praise: AdminThemeInsightRowOutputDto[];
	complaints: AdminThemeInsightRowOutputDto[];
	coverage: AdminThemeCoverageOutputDto;
}

/** Which of a theme's lists: what guests criticised, praised, or noticed had changed since before */
export type AdminThemeSide = 'complaints' | 'praise' | 'changes';

export interface AdminGetThemeInsightInputDto {
	month: string & tags.Pattern<'^[0-9]{4}-[0-9]{2}$'>;
	cityId: string & tags.Format<'uuid'>;
	/** Complaints when absent */
	side?: AdminThemeSide;
	/** Only reviews, or only posts */
	kind?: 'review' | 'post';
	/** Only this brand's sentences */
	brandId?: string & tags.Format<'uuid'>;
	/** Only the sentences about one dish: a `dishes` row's key (`topic:<key>` or `dish:<key>`) */
	dish?: string & tags.MaxLength<200>;
	/** Only the brands of one kind of food: a food topic's key */
	food?: string & tags.MaxLength<64>;
	offset?: number & tags.Type<'uint32'>;
	/** 50 when absent */
	limit?: number & tags.Type<'uint32'> & tags.Minimum<1> & tags.Maximum<200>;
}

export interface AdminThemeSideCountOutputDto {
	side: AdminThemeSide;
	/** Written reviews of the month with a point of this side filed under the theme */
	reviews: number;
	/** Posts by others likewise */
	posts: number;
}

export interface AdminThemeMonthOutputDto {
	/** YYYY-MM */
	month: string;
	reviews: number;
	posts: number;
	/** Of the month's written reviews with any point (any row, changes included, for `changes`), percent */
	reviewShare: number | null;
	/** Of the month's posts by others with any point, percent */
	postShare: number | null;
}

export interface AdminThemeCurrentOutputDto extends AdminThemeMonthOutputDto {
	/** Against the month before, in percentage points */
	reviewShareChange: number | null;
	postShareChange: number | null;
	/** Brands it came up at */
	brands: number;
}

export interface AdminThemePageDishOutputDto {
	/** `topic:<key>` or `dish:<key>`: what `dish=` takes */
	key: string;
	label: string;
	/** The food topic's key, for its page */
	foodTopic?: string;
	/** Reviews and posts of the side about it */
	sources: number;
}

export interface AdminThemeAmountOutputDto {
	/** Minutes for a wait, euro for a price */
	unit: FeedbackUnit;
	/** Reviews and posts stating one; a source stating two keeps its largest */
	sources: number;
	median: number;
	min: number;
	max: number;
}

/** One sentence filed under the theme, with the review or post it came from. */
export interface AdminThemePointOutputDto {
	/** The feedback row's id */
	id: string;
	/** The phrase, in English */
	detail: string;
	sentiment: FeedbackSentiment;
	/** The dish or drink it is about, as the source names it */
	dish?: string;
	foodTopic?: { key: string; label: string };
	/** The number it states */
	amount?: number;
	unit?: FeedbackUnit;
	kind: 'review' | 'post';
	/** The review's or the post's id (a post's page is `/admin/posts/<id>`) */
	sourceId: string;
	/** When the review was published or the post posted */
	at: string & tags.Format<'date-time'>;
	brand: { id: string; name: string };
	/** The branch: a review's place, a post's when it named one */
	venue?: { id: string; name: string };
	/** A review's stars */
	stars?: number;
	reviewPlatform?: ReviewPlatformEnum;
	/** A review's text (translated when it was), cut at 400 characters */
	text?: string;
	postPlatform?: SocialPlatformEnum;
	/** A post's author handle */
	author?: string;
	/** What the post says about the brand */
	summary?: string;
}

export interface AdminThemeInsightOutputDto {
	key: FeedbackTheme;
	topic: FeedbackTopic;
	/** "Price increase" */
	label: string;
	/** What the theme covers, as the agents are told */
	hint: string;
	month: string;
	/** The month the changes are against */
	previous: string;
	side: AdminThemeSide;
	/** Each side's reviews and posts this month */
	sides: AdminThemeSideCountOutputDto[];
	/** The side over the six months up to the month, oldest first */
	months: AdminThemeMonthOutputDto[];
	/** The side this month: the whole month's, whatever the filters */
	current: AdminThemeCurrentOutputDto;
	/** The ten brands it came up at most */
	brands: AdminThemeBrandOutputDto[];
	/** The ten dishes its points were about most: a food topic's dishes as one */
	dishes: AdminThemePageDishOutputDto[];
	/** The five kinds of food it came up at most, each a share of its brands' sources with any point */
	foods: AdminThemeFoodOutputDto[];
	/** The numbers its points state, per unit */
	amounts: AdminThemeAmountOutputDto[];
	/** The month's sentences of the side, filtered, newest first, one page */
	points: AdminThemePointOutputDto[];
	/** Sentences matching the filters */
	total: number;
	/** The reviews and posts they come from */
	totalSources: number;
}
