import { tags } from 'typia';

import type { FeedbackTheme } from 'src/modules/venues/constants/feedback-themes.constant.js';

export interface AdminFileFeedbackThemesInputDto {
	/** Only this city's points */
	cityId?: string & tags.Format<'uuid'>;
	/** Points filed this call (newest month first), default 600 */
	limit?: number & tags.Type<'uint32'> & tags.Minimum<1> & tags.Maximum<5000>;
}

export interface AdminFileFeedbackThemesOutputDto {
	/** What `realign` changed first: topics moved to their theme's, points sent back to filing */
	realigned: { topicsMoved: number; unfiled: number };
	/** Points filed this call */
	points: number;
	/** Points still without a theme (of the city, when given) */
	remaining: number;
}

export interface AdminWaitComplaintsInputDto {
	cityId: string & tags.Format<'uuid'>;
	month: string & tags.Pattern<'^[0-9]{4}-[0-9]{2}$'>;
}

export interface AdminWaitComplaintsOutputDto {
	month: string;
	venues: number;
	brands: number;
	sources: number;
	reviews: number;
	posts: number;
	byTheme: { theme: FeedbackTheme; venues: number; brands: number; sources: number }[];
	stated: {
		complaints: number;
		of: number;
		median?: number;
		upperQuartile?: number;
		max?: number;
	};
}

export interface AdminRecheckDishLinksOutputDto {
	/** Points sent back to the `feedback-dish-links` backlog */
	points: number;
	/** Dish-only rows the links had dropped, back */
	dishOnlyRows: number;
	/** Points the backlog now has to look at */
	remaining: number;
}
