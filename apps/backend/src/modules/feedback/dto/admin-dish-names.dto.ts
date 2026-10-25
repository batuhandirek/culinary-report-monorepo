import { tags } from 'typia';

import type { DishNameDecider } from '../entities/dish-name.entity.js';
import type { DishNameStatus } from '../services/dish-name.service.js';

export interface AdminGetDishNamesInputDto {
	cityId: string & tags.Format<'uuid'>;
	/** `unlinked` (decided, no topic; the default), `linked`, `pending` (not decided yet) or `all` */
	status?: DishNameStatus;
	/** Part of the name */
	q?: string & tags.MaxLength<100>;
	/** Only the names of this topic */
	topicKey?: string & tags.MaxLength<64>;
	/** Only the names the agent suggested this topic for */
	suggestion?: string & tags.MaxLength<100>;
	offset?: number & tags.Type<'uint32'>;
	limit?: number & tags.Type<'uint32'> & tags.Minimum<1> & tags.Maximum<200>;
}

export interface AdminDishNameOutputDto {
	id: number;
	key: string;
	name: string;
	foodTopic?: { key: string; label: string };
	/** Who decided: `match` (the name is the topic or one of its other names), `ai`, `admin`; absent while undecided */
	decidedBy?: DishNameDecider;
	/** The agent's label for a topic that would fit, when none does */
	suggestion?: string;
	/** The city's feedback rows naming it */
	notes: number;
}

export interface AdminDishNameSuggestionOutputDto {
	label: string;
	names: number;
	notes: number;
	examples: string[];
}

export interface AdminDishNamesOutputDto {
	summary: {
		names: number;
		notes: number;
		linkedNames: number;
		linkedNotes: number;
		pendingNames: number;
	};
	suggestions: AdminDishNameSuggestionOutputDto[];
	names: AdminDishNameOutputDto[];
	total: number;
}

/** A topic key, null for "no topic", or `auto: true` to hand the name back to the name match and the agent */
export interface AdminUpdateDishNameInputDto {
	topicKey?: (string & tags.MaxLength<64>) | null;
	auto?: boolean;
}

export interface AdminUpdatedDishNameOutputDto {
	id: number;
	key: string;
	name: string;
	foodTopic?: { key: string; label: string };
	decidedBy?: DishNameDecider;
	suggestion?: string;
}
