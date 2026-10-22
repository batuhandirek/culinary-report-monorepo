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
	/** What gives the tag: its Google categories, its posts, its menu, Google's review tags, or an admin */
	source: 'category' | 'mentions' | 'menu' | 'reviews' | 'manual';
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
	/**
	 * The month's delivery menus (scraped for report venues and their competitors only, so they
	 * lean to those): `menus` venues have one; the rest is absent when none has the topic
	 */
	menu: AdminTopicMenuOutputDto;
	venues: AdminTopicVenueOutputDto[];
}

export interface AdminTopicMenuOutputDto {
	/** Open venues of the city with a menu stored for the month */
	menus: number;
	/** Of those, the ones with the topic (or a child) on it */
	venues?: number;
	items?: number;
	/** Median and quartiles of those venues' own median price for it */
	median?: number;
	p25?: number;
	p75?: number;
	/** Districts with 5+ such venues */
	districts?: { district: string; venues: number; median: number }[];
}
