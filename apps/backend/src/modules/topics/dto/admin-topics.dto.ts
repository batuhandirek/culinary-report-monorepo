import { tags } from 'typia';

import type { TopicKindEnum } from '../entities/topic.entity.js';

export interface AdminGetTopicsInputDto {
	cityId: string & tags.Format<'uuid'>;
}

export interface AdminCreateTopicInputDto {
	label: string & tags.MinLength<1> & tags.MaxLength<80>;
	kind: TopicKindEnum;
	/** Defaults to the label's `normalizeCuisine` key; must be one */
	key?: string & tags.MaxLength<80>;
	parentKey?: string;
	trendsTopicId?: string & tags.Pattern<'^/(m|g)/[0-9A-Za-z_]+$'>;
	trendsQuery?: string & tags.MaxLength<100>;
	/** An aspect's: what it covers, told to the agents */
	hint?: string & tags.MaxLength<300>;
}

/** Only the fields given change; null clears a parent, a Trends id or a query. The key never changes. */
export interface AdminUpdateTopicInputDto {
	label?: string & tags.MinLength<1> & tags.MaxLength<80>;
	kind?: TopicKindEnum;
	parentKey?: string | null;
	trendsTopicId?: (string & tags.Pattern<'^/(m|g)/[0-9A-Za-z_]+$'>) | null;
	trendsQuery?: (string & tags.MaxLength<100>) | null;
	hint?: (string & tags.MaxLength<300>) | null;
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

export interface AdminTopicBaseOutputDto {
	id: string;
	key: string;
	label: string;
	kind: TopicKindEnum;
	/** The parent topic's key: a child counts for it too */
	parentKey?: string;
	/** Google Trends topic id, e.g. "/m/01xw9"; searched before `trendsQuery` */
	trendsTopicId?: string;
	trendsQuery?: string;
	/** An aspect's: what it covers, told to the agents */
	hint?: string;
}

export interface AdminTopicOutputDto extends AdminTopicBaseOutputDto {
	/** The city's matched mentions resolving to it, all time */
	mentions: number;
	/** The city's venues whose Google category resolves to it */
	venues: number;
	/** The wordings linked to it, in any city */
	terms: number;
}

export interface AdminTopicsOutputDto {
	topics: AdminTopicOutputDto[];
}

export interface AdminRelinkTopicsOutputDto {
	queued: boolean;
}
