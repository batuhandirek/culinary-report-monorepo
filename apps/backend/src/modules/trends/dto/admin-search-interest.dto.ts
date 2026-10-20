import { tags } from 'typia';

import type { FoodTopicKindEnum } from 'src/modules/food-topics/entities/food-topic.entity.js';

import type { SearchTermKindEnum } from '../entities/trend-search-interest.entity.js';

export interface AdminGetSearchInterestInputDto {
	month: string & tags.Pattern<'^[0-9]{4}-[0-9]{2}$'>;
	cityId: string & tags.Format<'uuid'>;
}

export interface AdminSearchInterestRowOutputDto {
	kind: SearchTermKindEnum;
	/** The topic's key or the venue name searched */
	term: string;
	label: string;
	/** Topics: the kind of food it is */
	topicKind?: FoodTopicKindEnum;
	brandId?: string;
	/** Google's 0–100 per month, oldest first; null where it has too little data */
	interest: (number | null)[];
	/** Topics: share of the city's matched mentions with a topic that name it or a child of it, per month, percent */
	mentionShare?: (number | null)[];
	/** The month against the one before: 0.4 = up 40 % */
	searchChange: number | null;
	mentionChange?: number | null;
	/** Google's related queries over the twelve months ending with the month; absent without them */
	related?: AdminSearchRelatedQueriesOutputDto;
}

export interface AdminSearchRelatedQueriesOutputDto {
	/** Most searched alongside the term, in Google's order */
	top: AdminSearchRelatedQueryOutputDto[];
	/** Grown most against the twelve months before */
	rising: AdminSearchRelatedQueryOutputDto[];
}

export interface AdminSearchRelatedQueryOutputDto {
	query: string;
	/** Top: 0–100 against the most searched one. Rising: percent growth (250 = +250 %) */
	value: number;
	/** Rising past +5,000 % */
	breakout?: boolean;
}

export interface AdminSearchInterestOutputDto {
	month: string;
	months: string[];
	geo: string;
	topics: AdminSearchInterestRowOutputDto[];
	brands: AdminSearchInterestRowOutputDto[];
}
