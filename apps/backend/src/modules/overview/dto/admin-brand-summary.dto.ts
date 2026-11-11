import { tags } from 'typia';

import type { ProspectStageEnum } from 'src/modules/outreach/constants/outreach.constant.js';
import type { SocialPlatformEnum } from 'src/modules/social/entities/social-post.entity.js';

import type { AdminBrandMonthFiguresOutputDto } from './admin-brand-list.dto.js';

type Month = string & tags.Pattern<'^[0-9]{4}-[0-9]{2}$'>;

/** The rolling window the figures cover: the last 30 or 90 days, or the last twelve months */
export type AdminBrandSummaryPeriod = '30d' | '90d' | '12mo';

export interface AdminGetBrandSummaryInputDto {
	/** Figures in this city only; every city without */
	cityId?: string & tags.Format<'uuid'>;
	/** Where the twelve months of `series` end and whose report the to-dos ask about; the last finished month without */
	month?: Month;
	/** The window of `figures`, `topPosts` and `brandOnlyPosts`; `30d` without */
	period?: AdminBrandSummaryPeriod;
}

/** The window the figures cover, up to the moment asked, against the same length before it */
export interface AdminBrandSummaryWindowOutputDto {
	period: AdminBrandSummaryPeriod;
	/** Its first moment */
	from: Date;
	/** The moment asked (exclusive) */
	to: Date;
	/** "30 days", "12 months": how a page says it */
	label: string;
}

/** One month of a brand's figures: the trend drawn under each of the Overview's figures. */
export interface AdminBrandSeriesPointOutputDto extends AdminBrandMonthFiguresOutputDto {
	month: string;
}

/** The brand's all-time Google rating on one day */
export interface AdminBrandRatingPointOutputDto {
	/** `YYYY-MM-DD` */
	date: string;
	stars?: number;
	/** All-time Google reviews over its places */
	reviews?: number;
}

/** A post by someone else that named the brand. */
export interface AdminBrandTopPostOutputDto {
	id: string;
	/** Its mention of the brand: the one an admin moves to a branch */
	mentionId: number;
	platform: SocialPlatformEnum;
	url: string;
	author?: string;
	postedAt: Date;
	views: number;
	/** What the post said about the brand, its own words where kept (its first claims); absent when it has none */
	summary?: string;
	/** Worked out from its claims about the brand */
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
	tab: 'overview' | 'posts' | 'reviews' | 'places' | 'competitors' | 'signals' | 'history' | 'settings';
}

export interface AdminBrandSummaryOutputDto {
	month: string;
	window: AdminBrandSummaryWindowOutputDto;
	/** The window's figures */
	figures: AdminBrandMonthFiguresOutputDto;
	/** The same length just before the window */
	previous: AdminBrandMonthFiguresOutputDto;
	/** The twelve months up to `month`, oldest first */
	series: AdminBrandSeriesPointOutputDto[];
	/**
	 * Its Google rating as each read saw it, oldest first, over its open places (in the city): a
	 * place's last read carried forward to every later date, stars weighted by review count
	 */
	ratings: AdminBrandRatingPointOutputDto[];
	/** The window's most viewed posts by others, up to five */
	topPosts: AdminBrandTopPostOutputDto[];
	/** Posts of the window naming the brand but no branch (a chain) */
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
	 * The food topic it names, where the wording points (a term's decided
	 * topic, else a whole-name match); absent for what is no food ("waiting time", "cash only")
	 */
	topic?: { key: string; label: string };
}
