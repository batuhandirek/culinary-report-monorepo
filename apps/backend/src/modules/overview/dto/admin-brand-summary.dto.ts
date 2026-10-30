import { tags } from 'typia';

import type { ProspectStageEnum } from 'src/modules/outreach/constants/outreach.constant.js';
import type { SocialPlatformEnum } from 'src/modules/social/entities/social-post.entity.js';

import type { AdminBrandMonthFiguresOutputDto } from './admin-brand-list.dto.js';

type Month = string & tags.Pattern<'^[0-9]{4}-[0-9]{2}$'>;

export interface AdminGetBrandSummaryInputDto {
	/** Figures in this city only; every city without */
	cityId?: string & tags.Format<'uuid'>;
	/** The last finished month without */
	month?: Month;
}

/** One month of a brand's figures, for the six-month strip. */
export interface AdminBrandSeriesPointOutputDto extends AdminBrandMonthFiguresOutputDto {
	month: string;
}

/** A post by someone else that named the brand. */
export interface AdminBrandTopPostOutputDto {
	id: string;
	platform: SocialPlatformEnum;
	url: string;
	author?: string;
	postedAt: Date;
	views: number;
	/** What the post said about the brand (the mention's summary) */
	summary: string;
	sentiment: string;
	/** The branch it named; absent when it named only the brand */
	branch?: { id: string; name: string };
}

/**
 * Something about the brand an admin can act on, and the brand page tab where it is done.
 * `tone`: `urgent` (a customer is losing out), `todo` (our work), `info`.
 */
export interface AdminBrandTodoOutputDto {
	key: string;
	tone: 'urgent' | 'todo' | 'info';
	text: string;
	tab: 'overview' | 'posts' | 'reviews' | 'branches' | 'competitors' | 'signals' | 'reports' | 'sales' | 'settings';
}

export interface AdminBrandSummaryOutputDto {
	month: string;
	figures: AdminBrandMonthFiguresOutputDto;
	previous: AdminBrandMonthFiguresOutputDto;
	/** The six months up to `month`, oldest first */
	series: AdminBrandSeriesPointOutputDto[];
	/** The month's most viewed posts by others, up to five */
	topPosts: AdminBrandTopPostOutputDto[];
	/** Posts of the month naming the brand but no branch (a chain) */
	brandOnlyPosts: number;
	/** The month's report, else the newest one */
	report?: {
		id: string;
		month: string;
		title?: string;
		headline?: string;
		updatedAt: Date;
		sentAt?: Date;
	};
	competitors: number;
	prospect?: {
		id: string;
		stage: ProspectStageEnum;
		nextFollowUpAt?: Date;
		lastTouchAt?: Date;
		outreachCount: number;
	};
	todos: AdminBrandTodoOutputDto[];
	/**
	 * What its Google reviews often mention ("people often mention"), summed over its branches
	 * (in the city), most first, twelve at most. All-time counts, not the month's; empty until a
	 * detail-page refresh.
	 */
	reviewTags: AdminBrandReviewTagOutputDto[];
}

/** One of Google's "people often mention" tags, summed over the brand's places. */
export interface AdminBrandReviewTagOutputDto {
	title: string;
	count: number;
	/**
	 * The food topic it names, where the feedback rows of that dish point (a dish name's decided
	 * topic, else a whole-name match); absent for what is no food ("waiting time", "cash only")
	 */
	topic?: { key: string; label: string };
}
