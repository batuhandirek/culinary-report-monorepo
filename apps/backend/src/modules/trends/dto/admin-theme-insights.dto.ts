import { tags } from 'typia';

import type { SocialPlatformEnum } from 'src/modules/social/entities/social-post.entity.js';
import type { Sentiment } from 'src/modules/statements/constants/sentiment.constant.js';
import type { StatementUnit } from 'src/modules/statements/entities/statement.entity.js';
import type { ReviewPlatformEnum } from 'src/modules/venues/entities/review.entity.js';

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
	/** Of its brands' reviews and posts with any claim this month, percent */
	share: number;
}

/** One kind of food in the month. */
export interface AdminThemeFoodCoverageOutputDto {
	key: string;
	label: string;
	/** Its brands' written reviews with any claim */
	reviews: number;
	/** Posts by others about its brands with any claim */
	posts: number;
	brands: number;
}

export interface AdminThemeBrandOutputDto {
	id: string;
	name: string;
	/** Its reviews and posts raising the theme */
	sources: number;
}

/** One dish a theme's claims named: a dish or drink topic's wordings as one, else the wording itself. */
export interface AdminThemeDishOutputDto {
	/** `topic:<key>` or `dish:<key>` */
	key: string;
	label: string;
	/** The dish or drink topic's key, for its page */
	foodTopic?: string;
	/** Reviews and posts raising the theme about it */
	sources: number;
	/** Of the reviews and posts with a claim of this side about it, percent */
	share: number;
}

/** One theme, praised or criticised, in the city and month. */
export interface AdminThemeInsightRowOutputDto {
	/** The aspect's key (`Topic.key`) */
	key: string;
	/** Its root's key */
	topic: string;
	/** "Price increase" */
	label: string;
	/** Written reviews raising it */
	reviews: number;
	/** Posts by others raising it */
	posts: number;
	/** Of the month's written reviews with any claim, percent */
	reviewShare: number | null;
	/** Of the month's posts by others with any claim, percent */
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
	/** The five dishes its claims named most: a dish or drink topic's wordings as one */
	dishes: AdminThemeDishOutputDto[];
	/** Up to five distinct claims, newest first */
	samples: string[];
}

export interface AdminThemeCoverageOutputDto {
	/** Written reviews of the month with any praise or complaint claim */
	reviews: number;
	/** The brands those reviews are of (reviews are scraped for report venues and their competitors) */
	reviewBrands: number;
	/** Posts by others with any praise or complaint claim about a matched venue */
	posts: number;
	postBrands: number;
	/** Of those, the ones with a claim under no aspect yet: counted under no theme */
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
