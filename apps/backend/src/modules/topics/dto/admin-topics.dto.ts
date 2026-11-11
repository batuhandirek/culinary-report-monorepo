import { tags } from 'typia';

import type { EdgeDecider, EdgeType } from '../constants/topic-edge.constant.js';
import type { TopicKindEnum } from '../entities/topic.entity.js';

export interface AdminGetTopicsInputDto {
	cityId: string & tags.Format<'uuid'>;
}

/** One thing a topic is (`is_a`) or has (`has`): the other topic's key; a type left out defaults from that topic's kind */
export interface AdminTopicEdgeInputDto {
	to: string & tags.MaxLength<80>;
	type?: EdgeType;
}

export interface AdminCreateTopicInputDto {
	label: string & tags.MinLength<1> & tags.MaxLength<80>;
	kind: TopicKindEnum;
	/** Defaults to the label's `normalizeCuisine` key; must be one */
	key?: string & tags.MaxLength<80>;
	/** What it is and has, in order: the first `is_a` is its display parent */
	edges?: AdminTopicEdgeInputDto[] & tags.MaxItems<20>;
	trendsTopicId?: string & tags.Pattern<'^/(m|g)/[0-9A-Za-z_]+$'>;
	trendsQuery?: string & tags.MaxLength<100>;
	/** An aspect's: what it covers, told to the agents */
	hint?: string & tags.MaxLength<300>;
}

/**
 * Only the fields given change; null clears a Trends id or a query. `edges` is the whole list (an
 * edge left out is removed, `[]` makes the topic a root). The key never changes.
 */
export interface AdminUpdateTopicInputDto {
	label?: string & tags.MinLength<1> & tags.MaxLength<80>;
	kind?: TopicKindEnum;
	edges?: AdminTopicEdgeInputDto[] & tags.MaxItems<20>;
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
	/** Its display parent's key: its first `is_a` edge. A topic counts for everything its edges reach */
	parentKey?: string;
	/** What it is (`is_a`) and has (`has`): `is_a` first, each type by rank */
	edges: AdminTopicEdgeOutputDto[];
	/** Google Trends topic id, e.g. "/m/01xw9"; searched before `trendsQuery` */
	trendsTopicId?: string;
	trendsQuery?: string;
	/** An aspect's: what it covers, told to the agents */
	hint?: string;
}

export interface AdminTopicEdgeOutputDto {
	/** The other topic's key */
	to: string;
	type: EdgeType;
	rank: number;
	decidedBy: EdgeDecider;
}

export interface AdminTopicOutputDto extends AdminTopicBaseOutputDto {
	/** The city's matched mentions whose claims name it, all time */
	mentions: number;
	/** The city's venues whose Google category resolves to it */
	venues: number;
	/** The wordings whose main topic it is, in any city */
	terms: number;
}

export interface AdminTopicsOutputDto {
	topics: AdminTopicOutputDto[];
}

export interface AdminRelinkTopicsOutputDto {
	queued: boolean;
}
