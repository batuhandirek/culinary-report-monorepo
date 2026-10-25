import { tags } from 'typia';

import type { FoodTopicKindEnum } from '../entities/food-topic.entity.js';

export interface AdminGetFoodTopicsInputDto {
	cityId: string & tags.Format<'uuid'>;
}

export interface AdminCreateFoodTopicInputDto {
	label: string & tags.MinLength<1> & tags.MaxLength<80>;
	kind: FoodTopicKindEnum;
	/** Defaults to the label's `normalizeCuisine` key; must be one */
	key?: string & tags.MaxLength<80>;
	parentKey?: string;
	aliases?: (string & tags.MaxLength<80>)[] & tags.MaxItems<100>;
	trendsTopicId?: string & tags.Pattern<'^/(m|g)/[0-9A-Za-z_]+$'>;
	trendsQuery?: string & tags.MaxLength<100>;
}

/** Only the fields given change; null clears a parent, a Trends id or a query. The key never changes. */
export interface AdminUpdateFoodTopicInputDto {
	label?: string & tags.MinLength<1> & tags.MaxLength<80>;
	kind?: FoodTopicKindEnum;
	parentKey?: string | null;
	aliases?: (string & tags.MaxLength<80>)[] & tags.MaxItems<100>;
	trendsTopicId?: (string & tags.Pattern<'^/(m|g)/[0-9A-Za-z_]+$'>) | null;
	trendsQuery?: (string & tags.MaxLength<100>) | null;
}

export interface AdminTrendsLookupInputDto {
	q: string & tags.MinLength<2> & tags.MaxLength<80>;
}

/** One of Google Trends' suggestions for a search: an id to search instead of the words. */
export interface AdminTrendsTopicOutputDto {
	/** "/m/07_19" */
	id: string;
	/** "Vietnamese cuisine" */
	title: string;
	/** What Google calls it: "Cuisine", "Dish", "Topic", "Restaurant chain"… */
	type: string;
}

export interface AdminTrendsLookupOutputDto {
	topics: AdminTrendsTopicOutputDto[];
}

export interface AdminFoodTopicBaseOutputDto {
	id: string;
	key: string;
	label: string;
	kind: FoodTopicKindEnum;
	/** The parent topic's key: a child counts for it too */
	parentKey?: string;
	aliases: string[];
	/** Google Trends topic id, e.g. "/m/01xw9"; searched before `trendsQuery` */
	trendsTopicId?: string;
	trendsQuery?: string;
}

export interface AdminFoodTopicOutputDto extends AdminFoodTopicBaseOutputDto {
	/** The city's matched mentions resolving to it, all time */
	mentions: number;
	/** The city's venues whose Google category resolves to it */
	venues: number;
}

export interface AdminUnmappedCuisineOutputDto {
	key: string;
	mentions: number;
	venues: number;
	/** Venues the word was said of (posts) or is the Google category of, most first */
	examples: string[];
}

export interface AdminIgnoreWordInputDto {
	/** The word as listed; true dismisses it, false brings it back */
	word: string & tags.MinLength<1> & tags.MaxLength<80>;
	ignored: boolean;
}

export interface AdminFoodTopicsOutputDto {
	topics: AdminFoodTopicOutputDto[];
	/** Words an admin dismissed (every city), left out of `unmapped` */
	ignored: string[];
	/** Cuisine keys of the city that resolve to no topic, most used first */
	unmapped: AdminUnmappedCuisineOutputDto[];
}

export interface AdminRelinkFoodTopicsOutputDto {
	queued: boolean;
}
