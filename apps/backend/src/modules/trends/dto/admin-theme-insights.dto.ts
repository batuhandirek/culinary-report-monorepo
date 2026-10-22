import { tags } from 'typia';

import type { FeedbackTheme } from 'src/modules/venues/constants/feedback-themes.constant.js';
import type { FeedbackTopic } from 'src/modules/venues/interfaces/feedback.interface.js';

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
