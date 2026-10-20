import { tags } from 'typia';

import type { FoodTopicKindEnum } from 'src/modules/food-topics/entities/food-topic.entity.js';

import type { AdminSearchRelatedQueriesOutputDto } from './admin-search-interest.dto.js';

export interface AdminGetTopicInsightsInputDto {
	month: string & tags.Pattern<'^[0-9]{4}-[0-9]{2}$'>;
	cityId: string & tags.Format<'uuid'>;
}

export interface AdminTopicInsightRowOutputDto {
	key: string;
	label: string;
	kind: FoodTopicKindEnum;
	parentKey?: string;
	/** Topics directly under it */
	children: number;
	/** Open food venues tagged with it or a child of it */
	venues: number;
	/** Of those, the ones it (or a child) is the main food of */
	primaryVenues: number;
	/** The month's posts by others naming it or a child */
	posts: number;
	/** Their share of the month's posts with a kind of food, percent */
	share: number | null;
	/** Against the month before, in percentage points */
	shareChange: number | null;
	/** Google's 0–100 per month, oldest first; null: too little data or not pulled */
	searches: (number | null)[];
	/** This month's searches against last month's: 0.4 = up 40 % */
	searchChange: number | null;
}

export interface AdminTopicInsightsOutputDto {
	month: string;
	months: string[];
	topics: AdminTopicInsightRowOutputDto[];
}

export interface AdminTopicVenueOutputDto {
	id: string;
	name: string;
	district?: string;
	category?: string;
	rating?: number;
	reviewsCount?: number;
	/** The tag that puts it under the topic: the topic's key or a child's */
	viaKey: string;
	viaLabel: string;
	/** The topic (or the child) is its main food */
	primary: boolean;
	/** What gives the tag: its Google categories, its posts, or an admin */
	source: 'category' | 'mentions' | 'manual';
	/** The month's posts about it by others */
	posts: number;
}

export interface AdminTopicInsightOutputDto {
	id: string;
	row: AdminTopicInsightRowOutputDto;
	aliases: string[];
	trendsTopicId?: string;
	trendsQuery?: string;
	parent?: { key: string; label: string };
	children: AdminTopicInsightRowOutputDto[];
	months: string[];
	postsByMonth: number[];
	shareByMonth: (number | null)[];
	/** Google's related searches over the twelve months; absent when the pull had none */
	related?: AdminSearchRelatedQueriesOutputDto;
	venues: AdminTopicVenueOutputDto[];
}
