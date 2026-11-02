import { tags } from 'typia';

import type { TermDecider } from '../entities/term.entity.js';

/** Which terms the list shows: `unlinked` = decided with no topic, `linked`, `pending` = not decided yet */
export type AdminTermStatus = 'unlinked' | 'linked' | 'pending' | 'all';

export interface AdminGetTermsInputDto {
	cityId: string & tags.Format<'uuid'>;
	status?: AdminTermStatus;
	/** A search in the wording or its key */
	q?: string & tags.MaxLength<80>;
	/** Only terms linked to this topic */
	topicKey?: string & tags.MaxLength<80>;
	/** Only terms the agent suggested this label for */
	suggestion?: string & tags.MaxLength<80>;
	offset?: number & tags.Type<'uint32'>;
	limit?: number & tags.Type<'uint32'> & tags.Minimum<1> & tags.Maximum<200>;
}

export interface AdminTermTopicOutputDto {
	key: string;
	label: string;
	kind: string;
}

/** One wording, with its links and how many of the city's statements and venues' Google tags carry it */
export interface AdminTermOutputDto {
	id: number;
	key: string;
	name: string;
	topics: AdminTermTopicOutputDto[];
	decidedBy?: TermDecider;
	suggestion?: string;
	/** The city's statements naming it (food parts) */
	notes: number;
	/** The city's venues whose Google "people often mention" tags carry it */
	tagVenues: number;
}

export interface AdminTermSuggestionOutputDto {
	label: string;
	/** Wordings the agent suggested it for */
	terms: number;
	/** Their statements and tag venues together */
	uses: number;
	examples: string[];
}

export interface AdminTermsOutputDto {
	/** The city's wordings and their uses, and how many point at a topic */
	summary: {
		terms: number;
		uses: number;
		linkedTerms: number;
		linkedUses: number;
		pendingTerms: number;
	};
	/** The agent's suggested topics for the city's wordings without one, most used first */
	suggestions: AdminTermSuggestionOutputDto[];
	terms: AdminTermOutputDto[];
	total: number;
}

/** A term after an admin's decision: the list carries the counts, this answer doesn't */
export type AdminUpdatedTermOutputDto = Omit<AdminTermOutputDto, 'notes' | 'tagVenues'>;

/** An admin's decision: the topics the wording is (`topicKeys`, empty = none), or `auto` for the name match and the agent */
export interface AdminChangeTermInputDto {
	topicKeys?: (string & tags.MaxLength<80>)[] & tags.MaxItems<10>;
	auto?: boolean;
}
